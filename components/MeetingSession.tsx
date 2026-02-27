
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { VoiceParticipant } from '../types';

interface MeetingSessionProps {
  onClose: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  groupName: string;
  mode: 'voice' | 'video';
  members: any[];
}

type ConnectionStatus = 'connecting' | 'stable' | 'unstable' | 'reconnecting' | 'failed';

const AUDIO_WORKLET_CODE = `
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channel = input[0];
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.index++] = channel[i];
        if (this.index >= this.bufferSize) {
          this.port.postMessage(this.buffer.slice());
          this.index = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);
`;

const MeetingSession: React.FC<MeetingSessionProps> = ({ onClose, onMinimize, isMinimized = false, groupName, mode, members }) => {
  const [hasJoined, setHasJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(mode === 'voice');
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);

  useEffect(() => {
    // Initialize participants from group members
    const initialParticipants = members.map(m => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      isSpeaking: false
    }));
    setParticipants(initialParticipants);
  }, [members]);
  
  // Ref to access current mute state inside callbacks
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const [connStatus, setConnStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [streamQuality, setStreamQuality] = useState({ fps: 3, quality: 0.6 });
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  const videoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const setupPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: mode === 'video' ? { width: 640, height: 480 } : false 
        });
        localStreamRef.current = stream;
        if (mode === 'video' && lobbyVideoRef.current) {
          lobbyVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Preview failed:", err);
        setError("Permissions denied.");
      }
    };
    setupPreview();
    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [mode]);

  const joinSession = useCallback(async () => {
    if (!localStreamRef.current) return;
    setConnStatus(retryCountRef.current > 0 ? 'reconnecting' : 'connecting');
    setHasJoined(true);

    if (!isAiEnabled) {
      setConnStatus('stable');
      setParticipants(prev => prev.filter(p => p.id !== 'ai'));
      return;
    }

    try {
      // Fix: Direct API key usage and correct initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (audioContextRef.current) audioContextRef.current.close();
      if (outputAudioContextRef.current) outputAudioContextRef.current.close();

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Load AudioWorklet
      const blob = new window.Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioContextRef.current.audioWorklet.addModule(workletUrl);

      const stream = localStreamRef.current;
      setTimeout(() => {
        if (mode === 'video' && videoRef.current) videoRef.current.srcObject = stream;
      }, 150);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setConnStatus('stable');
            retryCountRef.current = 0;
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            
            const workletNode = new AudioWorkletNode(audioContextRef.current!, 'audio-processor');
            
            workletNode.port.onmessage = (event) => {
              if (isMutedRef.current) return;
              const inputData = event.data;
              sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(inputData) }))
                .catch(() => setConnStatus('unstable'));
            };
            
            source.connect(workletNode);
            workletNode.connect(audioContextRef.current!.destination);

            if (mode === 'video') {
              if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
              frameIntervalRef.current = window.setInterval(() => {
                if (isVideoOff || !videoRef.current || !canvasRef.current || connStatus === 'reconnecting') return;
                const canvas = canvasRef.current;
                const video = videoRef.current;
                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) return;
                const scale = streamQuality.quality;
                canvas.width = video.videoWidth * scale;
                canvas.height = video.videoHeight * scale;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
              }, 1000 / streamQuality.fps);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setParticipants(prev => prev.map(p => p.id === 'ai' ? { ...p, isSpeaking: true } : p));
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                setParticipants(prev => prev.map(p => p.id === 'ai' ? { ...p, isSpeaking: false } : p));
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => {
            if (retryCountRef.current < MAX_RETRIES) {
              retryCountRef.current++;
              setTimeout(joinSession, 1000 * retryCountRef.current);
            } else {
              setConnStatus('failed');
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `Interactive facilitator for ${groupName}.`
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      setConnStatus('failed');
    }
  }, [groupName, mode, isMuted, isVideoOff, connStatus, streamQuality]);

  // Fix: Manual implementation of audio encoding/decoding as required by SDK guidelines
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const getStatusBadge = () => {
    switch(connStatus) {
      case 'stable': return { color: 'bg-emerald-500', label: 'Strong' };
      case 'unstable': return { color: 'bg-amber-500', label: 'Weak' };
      case 'reconnecting': return { color: 'bg-indigo-500 animate-pulse', label: 'Syncing' };
      default: return { color: 'bg-red-500', label: 'Offline' };
    }
  };

  if (isMinimized && hasJoined) {
    return (
      <div className="glass-effect rounded-[1.5rem] p-3 shadow-xl border border-indigo-500/20 flex flex-col gap-2 animate-in duration-300">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
             <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px]">
               {mode === 'video' ? '📹' : '🔊'}
             </div>
             <div className="min-w-0">
                <div className="text-[9px] font-black text-white uppercase truncate">{groupName}</div>
                <div className="flex items-center gap-1">
                   <div className={`w-1 h-1 rounded-full ${getStatusBadge().color}`}></div>
                   <span className="text-[7px] text-slate-400 font-bold uppercase">{getStatusBadge().label}</span>
                </div>
             </div>
          </div>
          <button onClick={onMinimize} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5" /></svg>
          </button>
        </div>
        <div className="flex gap-2 items-center justify-center pt-1 border-t border-white/5">
           <button onClick={() => setIsMuted(!isMuted)} className={`p-2 rounded-lg text-xs ${isMuted ? 'bg-red-600' : 'bg-slate-800'}`}>{isMuted ? '🔇' : '🎤'}</button>
           <button onClick={onClose} className="p-2 bg-red-600 rounded-lg text-xs">🚪</button>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-300 mx-auto">
        <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl mb-5">
            {mode === 'video' ? '📹' : '🔊'}
          </div>
          <h2 className="text-2xl font-black text-white italic uppercase mb-1">Nexus Lobby</h2>
          <p className="text-indigo-400 text-[9px] font-bold tracking-widest uppercase mb-8">{groupName}</p>
          
          {mode === 'video' ? (
            <div className="w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative shadow-xl mb-8">
              {!isVideoOff ? (
                <video ref={lobbyVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-3xl opacity-30">👤</div>
              )}
            </div>
          ) : (
            <div className="w-full py-10 bg-slate-950/50 rounded-2xl border border-slate-800/50 shadow-inner mb-8 flex flex-col items-center gap-3">
               <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border-2 border-slate-800 relative">
                  <span className="text-2xl">🎙️</span>
               </div>
               <span className="text-slate-600 font-bold uppercase tracking-widest text-[9px]">Interface Ready</span>
            </div>
          )}

          <div className="w-full max-w-xs space-y-3">
             <div className="flex flex-col gap-3 mb-2">
                <button 
                  onClick={() => setIsAiEnabled(!isAiEnabled)}
                  className={`w-full py-3 rounded-xl border transition-all flex items-center justify-between px-4 ${isAiEnabled ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-950 border-slate-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{isAiEnabled ? '🤖' : '👤'}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isAiEnabled ? 'text-indigo-400' : 'text-slate-500'}`}>
                      Nexus AI Tutor
                    </span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${isAiEnabled ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                    <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${isAiEnabled ? 'left-5' : 'left-1'}`}></div>
                  </div>
                </button>
             </div>

             <div className="flex justify-center gap-3">
               <button onClick={() => setIsMuted(!isMuted)} className={`flex-1 py-3 rounded-xl border transition-all text-[9px] font-bold uppercase tracking-widest ${isMuted ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-900 border-slate-800 text-indigo-400'}`}>
                 {isMuted ? 'Muted' : 'Unmuted'}
               </button>
               {mode === 'video' && (
                 <button onClick={() => setIsVideoOff(!isVideoOff)} className={`flex-1 py-3 rounded-xl border transition-all text-[9px] font-bold uppercase tracking-widest ${isVideoOff ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-900 border-slate-800 text-indigo-400'}`}>
                   {isVideoOff ? 'Cam Off' : 'Cam On'}
                 </button>
               )}
             </div>
             <button onClick={joinSession} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Link Start</button>
             <button onClick={onClose} className="w-full text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  const badge = getStatusBadge();
  return (
    <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
      <header className="p-4 sm:p-5 bg-slate-950/60 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
           <div className="p-2.5 bg-indigo-600/20 rounded-xl text-indigo-400 shrink-0 text-sm">
             {mode === 'video' ? '📹' : '🔊'}
           </div>
           <div className="min-w-0">
             <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-base font-black text-white italic uppercase tracking-tight truncate">{groupName}</h2>
                <div className={`px-1.5 py-0.5 rounded-md ${badge.color} text-[7px] font-black text-white uppercase tracking-widest`}>
                   {badge.label}
                </div>
             </div>
             <p className="text-slate-600 text-[8px] font-bold tracking-widest uppercase">Live Interactive Uplink</p>
           </div>
        </div>
        <button onClick={onMinimize} className="p-2 hover:bg-slate-800 rounded-lg transition-all text-slate-400 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5" /></svg>
        </button>
      </header>

      <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-950 custom-scrollbar">
        {(connStatus === 'connecting' || connStatus === 'reconnecting') ? (
          <div className="h-full flex flex-col items-center justify-center min-h-[250px]">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-400 font-bold uppercase tracking-widest text-[8px]">Syncing Feed...</p>
          </div>
        ) : (
          <div className={`grid gap-4 h-full ${mode === 'video' ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
            
            {mode === 'video' && (
              <div className="lg:col-span-3 aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative">
                {!isVideoOff ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">👤</div>
                )}
                <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-[9px] font-black text-white border border-white/10 uppercase tracking-widest">You (Lecturer)</div>
              </div>
            )}

            <div className={`${mode === 'video' ? 'flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto' : 'contents'} custom-scrollbar`}>
               {participants.map(p => (
                 <div key={p.id} className={`p-3 rounded-2xl border transition-all shrink-0 ${mode === 'video' ? 'w-40 lg:w-full' : 'w-full'} ${p.isSpeaking ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-900 border-slate-800'} flex items-center gap-3`}>
                    <img src={p.avatar} className={`w-10 h-10 rounded-xl border ${p.isSpeaking ? 'border-indigo-400' : 'border-slate-800'} shrink-0`} alt="" />
                    <div className="min-w-0">
                       <div className="text-[10px] font-black text-white truncate uppercase tracking-tight">{p.name}</div>
                       <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{p.isSpeaking ? 'Talking' : 'Idle'}</div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>

      <footer className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-900 flex justify-center items-center gap-4">
        <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-xl transition-all ${isMuted ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>
          {isMuted ? '🔇' : '🎤'}
        </button>

        {mode === 'video' && (
          <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-4 rounded-xl transition-all ${isVideoOff ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>
            {isVideoOff ? '🚫' : '📹'}
          </button>
        )}
        
        <button onClick={onClose} className="px-8 sm:px-10 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all active:scale-95 shadow-lg">
          End Session
        </button>
      </footer>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default MeetingSession;
