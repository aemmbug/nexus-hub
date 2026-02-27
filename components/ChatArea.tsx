
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, Attachment, GroupMember, Poll, PollOption, Group } from '../types';
import { GoogleGenAI } from "@google/genai";
import HubSettingsModal from './HubSettingsModal';

interface ChatAreaProps {
  group: Group;
  messages: Message[];
  members: GroupMember[];
  currentUser: string;
  isAiLoading?: boolean;
  onSendMessage: (text: string, attachment?: Attachment, poll?: Poll) => void;
  onAskAI: (text: string) => void;
  onVotePoll: (messageId: string, optionIndex: number) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onPinMessage: (messageId: string) => void;
  onAddMember: (name: string, role: GroupMember['role']) => void;
  onInviteMember?: () => void;
  onToggleMenu?: () => void;
  onOpenVoice?: (mode: 'voice' | 'video') => void;
  onEditHub?: () => void;
  onDeleteHub?: () => void;
  onLeaveHub?: () => void;
  hideHeader?: boolean;
  groupName?: string; // Optional override for topic names
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '💯', '✨', '🚀', '✅', '👀', '💡', '🤔', '🎉', '🙌'];

const ChatArea: React.FC<ChatAreaProps> = ({ 
  group, 
  messages,
  members,
  currentUser,
  isAiLoading = false,
  onSendMessage, 
  onAskAI,
  onVotePoll,
  onReactToMessage,
  onPinMessage,
  onInviteMember,
  onToggleMenu, 
  onOpenVoice,
  onEditHub,
  onDeleteHub,
  onLeaveHub,
  hideHeader = false,
  groupName: groupNameOverride
}) => {
  const groupName = groupNameOverride || group.name;
  const [input, setInput] = useState('');
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showHubSettings, setShowHubSettings] = useState(false);
  
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Nexus AI Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pinnedMessages = useMemo(() => messages.filter(m => m.isPinned), [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiLoading]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
    setShowEmojiPicker(false);
  };

  const handlePrivateAiQuery = async () => {
    if (!aiPrompt.trim() || isAiProcessing) return;
    setIsAiProcessing(true);
    setAiResult('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: aiPrompt,
        config: {
          systemInstruction: `You are Nexus AI, a helpful facilitator in the ${groupName} hub. Provide concise, expert-level analysis for this private consultation.`
        }
      });
      setAiResult(response.text || "Neural link timed out. Please retry.");
    } catch (err) {
      console.error(err);
      setAiResult("Interface Error: Protocol failure in Gemini Core.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleDeployAiToChat = () => {
    if (!aiPrompt.trim()) return;
    onAskAI(aiPrompt);
    setAiPrompt('');
    setAiResult('');
    setShowAiModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const attachment: Attachment = {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(1)} KB`
      };
      onSendMessage(`Shared an encrypted packet: ${file.name}`, attachment);
      setShowActionMenu(false);
    }
  };

  const handleCreatePoll = () => {
    const validOptions = pollOptions.filter(opt => opt.trim() !== '');
    if (pollQuestion.trim() && validOptions.length >= 2) {
      const poll: Poll = {
        question: pollQuestion.trim(),
        options: validOptions.map(opt => ({ text: opt.trim(), votes: [] }))
      };
      onSendMessage("A strategic query has been initiated.", undefined, poll);
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPollModal(false);
      setShowActionMenu(false);
    }
  };

  const startCamera = async (mode: 'user' | 'environment' = 'user') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowCamera(true);
      setFacingMode(mode);
    } catch (err) {
      console.error("Camera access denied:", err);
    } finally {
      setShowActionMenu(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const flipCamera = () => startCamera(facingMode === 'user' ? 'environment' : 'user');

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onSendMessage("Visual signature captured.", {
          name: `capture_${Date.now()}.jpg`,
          type: 'image/jpeg',
          size: 'Captured Matrix',
          url: dataUrl
        });
        stopCamera();
      }
    }
  };

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const injectEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] relative overflow-hidden w-full min-w-0">
      {!hideHeader && (
        <header className="h-16 px-4 md:px-6 border-b border-slate-900 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center min-w-0 flex-1">
            <button onClick={onToggleMenu} className="p-1.5 mr-2.5 bg-slate-900/50 rounded-lg md:hidden text-slate-500 border border-slate-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="text-sm font-black text-white truncate tracking-tighter uppercase italic flex items-center gap-2">
               <span className="text-indigo-600 opacity-60">#</span> {groupName}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEditHub && onDeleteHub && (
              <button onClick={() => setShowHubSettings(true)} className="p-2 text-slate-500 hover:text-white transition-colors">⚙️</button>
            )}
            {onInviteMember && (
              <button onClick={onInviteMember} className="p-2 text-[10px] font-black uppercase text-indigo-400 border border-indigo-500/30 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/20 transition-all mr-2">Invite</button>
            )}
            {onOpenVoice && (
              <div className="flex items-center gap-1.5 mr-1 md:mr-2">
                <button onClick={() => onOpenVoice('voice')} className="p-1.5 md:p-2 text-indigo-400 hover:text-white transition-colors text-base md:text-lg">🔊</button>
                <button onClick={() => onOpenVoice('video')} className="p-1.5 md:p-2 text-indigo-400 hover:text-white transition-colors text-base md:text-lg">🎥</button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && (
        <div className="bg-slate-900/40 border-b border-slate-900 px-4 py-2 flex items-center justify-between z-10 shrink-0 relative">
          <button onClick={() => scrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)} className="flex-1 flex items-center gap-3 overflow-hidden text-left">
            <span className="text-indigo-500 shrink-0 text-xs">📌</span>
            <span className="text-[10px] font-black uppercase text-indigo-400 truncate tracking-widest italic">{pinnedMessages[pinnedMessages.length - 1].text}</span>
          </button>
        </div>
      )}

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar w-full overflow-x-hidden">
        {messages.map((m) => {
          const isAI = m.sender.toLowerCase().includes('ai');
          return (
            <div key={m.id} id={`msg-${m.id}`} className={`flex gap-2 md:gap-4 group animate-in slide-in-from-bottom-2 duration-300 overflow-x-hidden ${m.sender === currentUser ? 'flex-row-reverse' : ''}`}>
              <img src={m.avatar} className="w-8 h-8 md:w-11 md:h-11 rounded-xl md:rounded-2xl object-cover border border-slate-800/50 shadow-xl self-end shrink-0" alt="" />
              
              <div className={`flex flex-col gap-1.5 max-w-[calc(100%-4rem)] md:max-w-[70%] min-w-0 ${m.sender === currentUser ? 'items-end' : 'items-start'}`}>
                 <div className="flex items-center gap-2 px-1">
                   <span className={`text-[9px] md:text-[10px] font-black uppercase italic tracking-tighter truncate ${isAI ? 'text-indigo-400' : 'text-white'}`}>
                     {m.sender === currentUser ? 'YOU' : m.sender}
                   </span>
                   <span className="text-[7px] md:text-[8px] text-slate-700 font-bold uppercase tracking-widest shrink-0">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                 </div>
                 
                 <div className="relative group/bubble w-full">
                   {/* Action Tray */}
                   <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-full px-2 py-1 shadow-2xl transition-all duration-200 opacity-0 group-hover/bubble:opacity-100 z-20 
                     ${m.sender === currentUser ? 'right-full mr-2 md:mr-3' : 'left-full ml-2 md:ml-3'}
                   `}>
                      <button onClick={(e) => { e.stopPropagation(); onPinMessage(m.id); }} className={`p-1.5 rounded-full transition-colors ${m.isPinned ? 'text-indigo-500 bg-indigo-500/10' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setActiveReactionPicker(activeReactionPicker === m.id ? null : m.id); }} className={`p-1.5 rounded-full hover:bg-slate-800 transition-colors ${activeReactionPicker === m.id ? 'text-indigo-500 bg-indigo-500/10' : 'text-slate-500 hover:text-white'}`}>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5s.67 1.5 1.5 1.5zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                      </button>
                   </div>

                   <div className={`relative w-fit max-w-full flex flex-col ${m.sender === currentUser ? 'items-end ml-auto' : 'items-start'}`}>
                     <div className={`relative px-4 py-3 md:px-5 md:py-3.5 rounded-[1.5rem] md:rounded-[1.8rem] shadow-2xl border transition-all w-fit max-w-full min-w-0 ${
                       m.sender === currentUser 
                         ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                         : isAI ? 'bg-slate-900 text-indigo-100 border-indigo-500/50 rounded-tl-none ring-1 ring-indigo-500/20' : 'bg-slate-900 text-slate-200 border-slate-800/80 rounded-tl-none'
                     } ${m.isPinned ? 'ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-[#020617]' : ''}`}>
                       {m.isPinned && <div className="absolute -top-3 -left-3 bg-indigo-600 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg border border-indigo-400 z-10 animate-bounce">📌</div>}
                       <p className="text-sm md:text-base font-medium leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                       {m.attachment && (
                         <div className="mt-3 md:mt-4 p-3 md:p-4 bg-black/30 rounded-xl border border-white/5 flex flex-col items-center gap-3 min-w-0">
                            {m.attachment.type.startsWith('image/') && m.attachment.url ? <img src={m.attachment.url} className="w-full rounded-lg" alt="attached" /> : (
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center text-xl shadow-inner shrink-0">📄</div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[9px] font-black uppercase truncate text-white italic">{m.attachment.name}</div>
                                  <div className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mt-1">{m.attachment.size}</div>
                                </div>
                              </div>
                            )}
                         </div>
                       )}
                     </div>

                     {/* Reactions Picker */}
                     {activeReactionPicker === m.id && (
                       <div onClick={(e) => e.stopPropagation()} className={`mt-2 flex items-center gap-1 p-1 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-top-2 w-fit max-w-[280px] overflow-x-auto custom-scrollbar ${m.sender === currentUser ? 'self-end' : 'self-start'}`}>
                          {COMMON_EMOJIS.slice(0, 10).map(emoji => (
                            <button key={emoji} onClick={(e) => { e.stopPropagation(); onReactToMessage(m.id, emoji); setActiveReactionPicker(null); }} className="hover:scale-125 active:scale-90 transition-all p-2 text-xl md:text-lg shrink-0 rounded-lg hover:bg-white/5">{emoji}</button>
                          ))}
                          <button onClick={() => setActiveReactionPicker(null)} className="ml-1 p-2 text-slate-500 hover:text-white shrink-0">✕</button>
                       </div>
                     )}

                     {/* Reactions List */}
                     {m.reactions && Object.keys(m.reactions).length > 0 && (
                       <div className={`flex flex-wrap gap-1 mt-1.5 w-full max-w-full ${m.sender === currentUser ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(m.reactions).map(([emoji, users]) => (
                            <button key={emoji} onClick={(e) => { e.stopPropagation(); onReactToMessage(m.id, emoji); }} className={`px-2 py-0.5 rounded-full border text-[9px] md:text-[10px] font-black transition-all flex items-center gap-1.5 shrink-0 break-all ${(users as string[]).includes(currentUser) ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'}`}>
                              <span>{emoji}</span><span className="opacity-60">{(users as string[]).length}</span>
                            </button>
                          ))}
                       </div>
                     )}
                   </div>
                 </div>
              </div>
            </div>
          );
        })}

        {/* Neural Processing Typing Indicator */}
        {isAiLoading && (
          <div className="flex gap-4 animate-in fade-in duration-500">
            <div className="w-11 h-11 bg-slate-900 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
               <span className="animate-pulse text-indigo-500 text-xl">✨</span>
            </div>
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase italic tracking-tighter">[NEURAL_PROCESSING_ACTIVE]</span>
               </div>
               <div className="px-5 py-3.5 bg-slate-900/50 border border-indigo-500/20 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input Area */}
      <footer className="p-3 md:p-6 lg:p-8 bg-slate-950/80 backdrop-blur-3xl border-t border-slate-900/50 shrink-0 relative">
        <div className="max-w-6xl mx-auto flex items-end gap-2 md:gap-4">
          <div className="relative">
            <button onClick={() => setShowActionMenu(!showActionMenu)} className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl transition-all shadow-xl active:scale-95 shrink-0 ${showActionMenu ? 'bg-indigo-600 text-white rotate-45' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}>➕</button>
            {showActionMenu && (
              <div className="absolute bottom-12 md:bottom-16 left-0 w-40 md:w-48 bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl shadow-2xl p-1.5 md:p-2 animate-in slide-in-from-bottom-2 duration-200 z-50">
                 <button onClick={() => startCamera()} className="w-full flex items-center gap-3 p-3 hover:bg-indigo-600/10 rounded-xl transition-colors text-left group">
                    <span className="text-lg">📸</span><span className="text-[9px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest">Visual</span>
                 </button>
                 <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 p-3 hover:bg-indigo-600/10 rounded-xl transition-colors text-left group">
                    <span className="text-lg">📄</span><span className="text-[9px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest">Packet</span>
                 </button>
                 <button onClick={() => setShowPollModal(true)} className="w-full flex items-center gap-3 p-3 hover:bg-indigo-600/10 rounded-xl transition-colors text-left group">
                    <span className="text-lg">📊</span><span className="text-[9px] font-black text-slate-400 group-hover:text-white uppercase tracking-widest">Poll</span>
                 </button>
              </div>
            )}
          </div>

          <div className="flex-1 relative group flex items-end bg-slate-900/40 border border-slate-800 rounded-xl md:rounded-2xl overflow-hidden focus-within:border-indigo-600 transition-all min-w-0">
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 md:p-4 transition-colors shrink-0 ${showEmojiPicker ? 'text-indigo-400' : 'text-slate-600 hover:text-indigo-400'}`}>
               <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5s.67 1.5 1.5 1.5zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
            </button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Transmit..." rows={1} className="w-full bg-transparent px-1 py-3 md:py-4 text-white text-sm md:text-base font-medium outline-none placeholder:text-slate-800 resize-none shadow-inner min-w-0" />
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-3 left-0 w-full max-w-[280px] bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow-2xl z-50 animate-in slide-in-from-bottom-2">
                 <div className="grid grid-cols-6 gap-1">
                    {COMMON_EMOJIS.map(emoji => (
                      <button key={emoji} onClick={() => injectEmoji(emoji)} className="text-lg hover:scale-125 transition-transform p-1.5">{emoji}</button>
                    ))}
                 </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setShowAiModal(true)} 
              className="w-10 h-10 md:w-14 md:h-14 bg-indigo-900/50 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all shrink-0"
              title="Summon Nexus AI Facilitator"
            >
              <span className={`text-lg md:text-xl ${isAiLoading ? 'animate-spin' : ''}`}>✨</span>
            </button>
            <button onClick={handleSend} disabled={!input.trim()} className="w-10 h-10 md:w-14 md:h-14 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-800 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </div>
      </footer>

      {/* AI Consultation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[3rem] shadow-[0_0_100px_-20px_rgba(79,70,229,0.4)] overflow-hidden animate-in zoom-in-95 duration-200">
              <header className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">✨</div>
                    <div className="text-left">
                       <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Nexus AI Consultation</h3>
                       <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">Facilitating: {groupName}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAiModal(false)} className="p-3 text-slate-500 hover:text-white transition-colors">✕</button>
              </header>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="space-y-3">
                    <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] italic ml-2">Direct Inquiry</label>
                    <textarea 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-2xl px-6 py-5 text-sm text-white font-medium outline-none focus:border-indigo-600 transition-all placeholder:text-slate-800 resize-none h-32 shadow-inner"
                      placeholder="Enter prompt for Nexus AI..."
                    />
                 </div>

                 {isAiProcessing && (
                   <div className="py-12 flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Consulting Neural Core...</p>
                   </div>
                 )}

                 {aiResult && !isAiProcessing && (
                   <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                      <label className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.4em] italic ml-2">Core Analysis</label>
                      <div className="w-full bg-slate-950 border border-slate-800/50 rounded-2xl p-6 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium shadow-inner">
                         {aiResult}
                      </div>
                   </div>
                 )}
              </div>

              <footer className="p-8 bg-slate-950/40 border-t border-slate-800 flex flex-col sm:flex-row gap-4">
                 <button 
                  onClick={handlePrivateAiQuery}
                  disabled={!aiPrompt.trim() || isAiProcessing}
                  className="flex-1 py-5 bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-indigo-500/30 rounded-2xl font-black uppercase text-[10px] tracking-widest italic shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
                 >
                   Private Analysis
                 </button>
                 <button 
                  onClick={handleDeployAiToChat}
                  disabled={!aiPrompt.trim() || isAiProcessing}
                  className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest italic shadow-[0_15px_40px_-10px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98] disabled:opacity-50"
                 >
                   Deploy to Matrix
                 </button>
              </footer>
           </div>
        </div>
      )}

      {/* Existing Modals & Overlays */}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      {showPollModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8"><h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Strategic Query</h3><button onClick={() => setShowPollModal(false)} className="text-slate-500 hover:text-white">✕</button></div>
            <div className="space-y-6">
              <div className="space-y-2"><label className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic ml-2">Inquiry Objective</label><input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500" placeholder="The query target..." /></div>
              <div className="space-y-3">
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic ml-2">Outcome Variables</label>
                {pollOptions.map((opt, idx) => (
                  <input key={idx} type="text" value={opt} onChange={(e) => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500" placeholder={`Option ${idx + 1}`} />
                ))}
                <button onClick={() => setPollOptions([...pollOptions, ''])} className="w-full py-2 text-[8px] font-black text-indigo-500 uppercase tracking-[0.3em] hover:text-white transition-colors">➕ Add Variable</button>
              </div>
              <div className="flex gap-4 pt-4"><button onClick={() => setShowPollModal(false)} className="flex-1 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Abort</button><button onClick={handleCreatePoll} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest shadow-xl">Deploy</button></div>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-300">
           <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
             <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${facingMode === 'user' ? 'mirror' : ''}`} />
             <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
               <div className="text-white font-black italic tracking-tighter uppercase text-xl text-glow">Visual Scanner</div>
             </div>
           </div>
           <div className="h-40 bg-slate-950 border-t border-slate-900 flex items-center justify-around px-10 shrink-0">
              <button onClick={stopCamera} className="p-4 bg-slate-900 rounded-full text-slate-400 hover:text-white">✕</button>
              <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-indigo-500 p-1 active:scale-95 transition-all"><div className="w-full h-full rounded-full bg-white/10" /></button>
              <button onClick={flipCamera} className="p-4 bg-slate-900 rounded-full text-indigo-400 hover:text-white">🔄</button>
           </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      {showHubSettings && onEditHub && onDeleteHub && (
        <HubSettingsModal 
          hub={group}
          onClose={() => setShowHubSettings(false)}
          onEditHub={onEditHub}
          onDeleteHub={onDeleteHub}
          onLeaveHub={onLeaveHub}
          onInviteMember={onInviteMember}
        />
      )}
    </div>
  );
};

export default ChatArea;
