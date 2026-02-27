
import React from 'react';
import { Group } from '../types';

interface HubSettingsModalProps {
  hub: Group;
  onClose: () => void;
  onEditHub: () => void;
  onDeleteHub: () => void;
  onLeaveHub?: () => void;
  onInviteMember?: () => void;
  onAddTopic?: () => void;
  showAddTopic?: boolean;
}

const HubSettingsModal: React.FC<HubSettingsModalProps> = ({ 
  hub,
  onClose, 
  onEditHub, 
  onDeleteHub, 
  onLeaveHub,
  onInviteMember, 
  onAddTopic,
  showAddTopic = false
}) => {
  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
       <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <header className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-4">
              <img src={hub.avatar} className="w-12 h-12 rounded-2xl object-cover border border-slate-800" alt="" />
              <div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{hub.name}</h3>
                <div className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1.5">Hub Intelligence Matrix</div>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-2 bg-slate-950/50 rounded-xl border border-slate-800/50">✕</button>
          </header>
          
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
             {/* Hub Identity Section */}
             <div className="p-6 bg-slate-950/40 border border-slate-800/50 rounded-3xl space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.4em]">Matrix Identifier</span>
                  <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800/30">
                    <code className="text-[10px] font-mono text-indigo-400 select-all">{hub.id}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(hub.id);
                        alert("Hub ID copied to clipboard");
                      }}
                      className="text-[8px] font-black text-slate-500 hover:text-white uppercase tracking-widest"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                {hub.description && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.4em]">Operational Directive</span>
                    <p className="text-xs text-slate-400 leading-relaxed italic">{hub.description}</p>
                  </div>
                )}
             </div>

             <div className="space-y-3">
               <button onClick={() => { onClose(); onEditHub(); }} className="w-full flex items-center justify-between p-5 bg-slate-950/60 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all group">
                 <div className="flex items-center gap-5">
                   <span className="text-3xl">🧩</span>
                   <div className="text-left">
                     <div className="text-sm font-black text-white uppercase italic tracking-tighter">Modify Matrix</div>
                     <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1">Update Hub Configuration</div>
                   </div>
                 </div>
                 <span className="text-indigo-500 group-hover:translate-x-1 transition-transform">→</span>
               </button>

               {showAddTopic && onAddTopic && (
                 <button onClick={() => { onClose(); onAddTopic(); }} className="w-full flex items-center justify-between p-6 bg-slate-950/60 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all group">
                   <div className="flex items-center gap-5">
                     <span className="text-3xl">🛰️</span>
                     <div className="text-left">
                       <div className="text-sm font-black text-white uppercase italic tracking-tighter">Inject Module</div>
                       <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1">Add New Workspace Module</div>
                     </div>
                   </div>
                   <span className="text-indigo-500 group-hover:translate-x-1 transition-transform">→</span>
                 </button>
               )}

               {onInviteMember && (
                 <button onClick={() => { onClose(); onInviteMember(); }} className="w-full flex items-center justify-between p-6 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl hover:border-indigo-500 transition-all group">
                   <div className="flex items-center gap-5">
                     <span className="text-3xl">📡</span>
                     <div className="text-left">
                       <div className="text-sm font-black text-white uppercase italic tracking-tighter">Share Uplink</div>
                       <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1">Invite Collaborators</div>
                     </div>
                   </div>
                   <span className="text-indigo-500 group-hover:translate-x-1 transition-transform">→</span>
                 </button>
               )}
             </div>

             <div className="pt-8 mt-4 border-t border-slate-800/50 space-y-4">
               {onLeaveHub && (
                 <button onClick={() => { if(window.confirm("Disconnect from Hub?")) { onClose(); onLeaveHub(); } }} className="w-full flex items-center justify-between p-6 bg-slate-950/60 border border-slate-800 rounded-2xl hover:border-amber-500 transition-all group">
                   <div className="flex items-center gap-5 text-amber-500 group-hover:text-white">
                     <span className="text-3xl opacity-60">🚪</span>
                     <div className="text-left">
                       <div className="text-sm font-black uppercase tracking-tighter italic">Disconnect Uplink</div>
                       <div className="text-[8px] font-bold uppercase tracking-widest mt-1">Leave this Hub</div>
                     </div>
                   </div>
                 </button>
               )}
               <button onClick={() => { if(window.confirm("Permanent Deletion?")) { onClose(); onDeleteHub(); } }} className="w-full flex items-center justify-between p-6 bg-rose-950/20 border border-rose-900/30 rounded-2xl hover:bg-rose-600 hover:text-white transition-all group">
                 <div className="flex items-center gap-5 text-rose-500 group-hover:text-white">
                   <span className="text-3xl opacity-60">☢️</span>
                   <div className="text-left">
                     <div className="text-sm font-black uppercase tracking-tighter italic">Decommission Hub</div>
                     <div className="text-[8px] font-bold uppercase tracking-widest mt-1">Irreversible System Purge</div>
                   </div>
                 </div>
               </button>
             </div>
          </div>
       </div>
    </div>
  );
};

export default HubSettingsModal;
