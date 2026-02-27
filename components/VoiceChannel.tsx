
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { VoiceParticipant } from '../types';

interface VoiceChannelProps {
  onClose: () => void;
  groupName: string;
  members: any[];
}

const VoiceChannel: React.FC<VoiceChannelProps> = ({ onClose, groupName, members }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);

  useEffect(() => {
    const initialParticipants = members.map(m => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      isSpeaking: false
    }));
    setParticipants(initialParticipants);
  }, [members]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gemini Live refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<any>(null);

  useEffect(() => {
    const startSession = async () => {
      try {
        // Fix: Create instance right before making the API call as per guidelines
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              const source = audioContextRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                if (isMuted) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                // Fix: Solely rely on sessionPromise resolves
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextRef.current!.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioBase64) {
                setParticipants(prev => prev.map(p => p.id === 'ai' ? { ...p, isSpeaking: true } : p));
                const ctx = outputAudioContextRef.current!;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioBase64), ctx, 24000, 1);
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
              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (e) => {
              console.error("Gemini Live Error:", e);
              setError("Network instability detected.");
            },
            onclose: () => console.log("Gemini Live Closed")
          },
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: `You are the Educational Assistant for a live class session on "${groupName}". Your goal is to support the quality of education (SDG 4) by providing clear, concise summaries and answering student questions based on scholarly principles. Be professional yet encouraging.`
          }
        });
        sessionPromiseRef.current = sessionPromise;
      } catch (err) {
        console.error("Failed to start voice session:", err);
        setError("Microphone required for interactive sessions.");
        setIsConnecting(false);
      }
    };
    startSession();
    return () => {
      audioContextRef.current?.close();
      outputAudioContextRef.current?.close();
      sessionPromiseRef.current?.then((s: any) => s.close());
    };
  }, [groupName, isMuted]);

  // Fix: Manual implementation of audio encoding/decoding following guidelines
  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
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
  }

  function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  return (
    <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden max-h-[95vh]">
      <header className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
             <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">LIVE SESSION</h2>
          </div>
          <p className="text-slate-500 text-sm font-bold tracking-widest uppercase">{groupName} • Academic Hub</p>
        </div>
        <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl transition-all text-slate-400 border border-slate-800 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div className="flex-1 p-10 overflow-y-auto">
        {isConnecting ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs animate-pulse">Connecting to Educational Core...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-6">⚠️</div>
            <p className="text-slate-200 font-black text-xl mb-2">{error}</p>
            <p className="text-slate-500 text-sm max-w-xs mb-8">Unable to establish a secure audio uplink. Check your hardware permissions.</p>
            <button onClick={onClose} className="px-10 py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-all">Return to Dashboard</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-12">
            {participants.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-4 group">
                <div className={`relative p-1 rounded-[2rem] transition-all duration-500 ${
                  p.isSpeaking ? 'ring-8 ring-indigo-600/30 bg-indigo-600/20' : 'ring-0'
                }`}>
                  <img src={p.avatar} className="w-24 h-24 rounded-[1.8rem] border-4 border-slate-900 bg-slate-800 shadow-2xl transition-transform group-hover:scale-105" alt={p.name} />
                  {p.isSpeaking && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-[8px] font-black px-2 py-1 rounded-full text-white shadow-xl animate-bounce">SPEAKING</div>
                  )}
                  {p.id === 'ai' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-[8px] font-black px-3 py-1 rounded-full text-white shadow-2xl border border-indigo-400">AI TUTOR</div>
                  )}
                </div>
                <div className="text-center">
                  <span className={`font-black text-sm tracking-tight transition-colors ${p.isSpeaking ? 'text-indigo-400' : 'text-slate-300'}`}>{p.name}</span>
                  <div className="text-[10px] text-slate-600 font-bold uppercase mt-1">Presence Active</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="p-10 bg-slate-950/60 border-t border-slate-800/50 backdrop-blur-xl">
        <div className="flex items-center justify-center gap-8">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-6 rounded-3xl shadow-2xl transition-all transform active:scale-90 ${
              isMuted ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
          
          <button 
            onClick={onClose}
            className="px-14 py-5 bg-red-600 hover:bg-red-500 text-white rounded-3xl font-black shadow-[0_20px_50px_rgba(220,38,38,0.3)] transition-all transform active:scale-95 flex items-center gap-4 text-lg"
          >
            End Lecture
          </button>

          <button className="p-6 bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white rounded-3xl shadow-2xl transition-all transform active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default VoiceChannel;
