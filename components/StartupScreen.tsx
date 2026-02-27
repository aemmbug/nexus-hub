
import React, { useState, useEffect } from 'react';
import { Group } from '../types';

interface StartupScreenProps {
  groups: Group[];
  activeGroupId: string | null;
  onSelectHub: (id: string) => void;
  onInitializeHub: () => void;
  onJoinHub: (id: string) => void;
}

const NexusLogo = () => (
  <svg viewBox="0 0 100 100" className="w-24 h-24 md:w-32 md:h-32 filter drop-shadow-[0_0_20px_rgba(79,70,229,0.7)]">
    <defs>
      <linearGradient id="nexusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <path 
      d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" 
      fill="none" 
      stroke="url(#nexusGradient)" 
      strokeWidth="1.5" 
      className="opacity-30"
    />
    <path 
      d="M30 35 V65 L50 45 L70 65 V35" 
      fill="none" 
      stroke="url(#nexusGradient)" 
      strokeWidth="7" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="drop-shadow-[0_0_8px_rgba(79,70,229,0.8)]"
    />
    <circle cx="50" cy="75" r="4" fill="url(#nexusGradient)" className="animate-pulse" />
  </svg>
);

const SYNC_MESSAGES = [
  "Initializing Kernel...",
  "Authenticating Node...",
  "Decrypting Uplink...",
  "Synchronizing Matrix...",
  "Link Established"
];

const StartupScreen: React.FC<StartupScreenProps> = ({ groups, activeGroupId, onSelectHub, onInitializeHub, onJoinHub }) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinId, setJoinId] = useState('');

  useEffect(() => {
    const duration = 3000; // 3 seconds sync
    const intervalTime = 30;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Cycle messages based on progress
    const idx = Math.min(
      Math.floor((progress / 100) * SYNC_MESSAGES.length),
      SYNC_MESSAGES.length - 1
    );
    setMessageIndex(idx);

    // Auto-transition when progress hits 100%
    if (progress >= 100 && groups.length > 0 && !activeGroupId) {
      const timeout = setTimeout(() => {
        onSelectHub(groups[0].id);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, groups, onSelectHub, activeGroupId]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] relative overflow-hidden animate-in fade-in duration-1000">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-indigo-600/5 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] brightness-50 contrast-150" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-12 group">
             <div className="absolute inset-0 rounded-[4rem] bg-indigo-600/10 blur-3xl scale-150 animate-pulse" />
             <div className="w-36 h-36 md:w-48 md:h-48 bg-slate-950/40 backdrop-blur-md rounded-[3rem] flex items-center justify-center border border-slate-800/50 shadow-[0_0_80px_-20px_rgba(79,70,229,0.4)] relative z-10 transform transition-all duration-1000">
               <NexusLogo />
               <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-indigo-500/30" />
               <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-indigo-500/30" />
               <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-indigo-500/30" />
               <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-indigo-500/30" />
             </div>
          </div>

          <div className="space-y-8 w-full max-w-xs">
            <h1 className="text-6xl md:text-8xl font-black text-white italic uppercase tracking-tighter leading-none opacity-90">
              NEXUS
            </h1>
            
            <div className="flex flex-col items-center gap-6">
               <div className="w-full space-y-3">
                  <div className="h-[2px] w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-75 ease-out shadow-[0_0_10px_rgba(79,70,229,0.8)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] italic animate-pulse">
                      {SYNC_MESSAGES[messageIndex]}
                    </p>
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic">
                      {Math.floor(progress)}%
                    </p>
                  </div>
               </div>
               
               {progress >= 100 && groups.length === 0 && (
                 <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
                   <button 
                     onClick={onInitializeHub}
                     className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] hover:bg-indigo-500 transition-all active:scale-95"
                   >
                     Initialize Hub
                   </button>
                   <button 
                     onClick={() => setIsJoinModalOpen(true)}
                     className="px-10 py-5 bg-slate-900 text-slate-400 border border-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] hover:text-white hover:border-slate-700 transition-all active:scale-95"
                   >
                     Join Existing Hub
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>

        {isJoinModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-sm p-8 shadow-2xl">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6">Enter Hub ID</h3>
              <input 
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="e.g. hub-123-abc"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-indigo-500 transition-all mb-6"
              />
              <div className="flex gap-4">
                <button onClick={() => setIsJoinModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button 
                  onClick={() => {
                    if (joinId.trim()) {
                      onJoinHub(joinId.trim());
                      setIsJoinModalOpen(false);
                    }
                  }}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-12 left-0 right-0 px-12 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-0 pointer-events-none opacity-40">
           <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest mb-1 text-left">Authorization</span>
                <span className="text-[9px] font-black text-white uppercase tracking-tighter italic">Secured_Admin_Node</span>
              </div>
              <div className="h-8 w-[1px] bg-slate-800"></div>
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest mb-1 text-left">Latency</span>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter italic">0.02ms_Sync</span>
              </div>
           </div>

           <div className="flex items-center gap-12">
              <div className="text-[8px] font-black text-slate-800 uppercase tracking-[0.5em] hidden lg:block">
                 Global Encryption Matrix v2.5.4
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right">
                    <div className="text-[7px] font-black text-slate-700 uppercase tracking-widest mb-1">Status</div>
                    <div className="text-[9px] font-black text-white uppercase tracking-tighter italic">
                      {progress < 100 ? 'Syncing_Data' : 'Ready_For_Uplink'}
                    </div>
                 </div>
                 <div className={`w-1.5 h-1.5 rounded-full ${progress < 100 ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`}></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StartupScreen;
