
import React from 'react';
import { Group, GroupType, GroupMember } from '../types';

interface SidebarProps {
  groups: Group[];
  activeGroupId: string;
  activeTopicId: string | null;
  currentUser: GroupMember;
  onSelectGroup: (id: string) => void;
  onSelectTopic: (id: string | null) => void;
  onStartAddingHub: () => void;
  onResetPortal: () => void;
  onAddTopic: (groupId: string) => void;
  onJoinVoice: (mode: 'voice' | 'video') => void;
  onEditProfile: () => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  groups, 
  activeGroupId, 
  activeTopicId,
  currentUser,
  onSelectGroup, 
  onSelectTopic,
  onStartAddingHub,
  onResetPortal,
  onAddTopic,
  onEditProfile,
  onLogout,
}) => {
  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-900/50 flex flex-col h-full shrink-0 z-40 transition-all relative overflow-hidden">
      {/* Decorative vertical scanner line for desktop */}
      <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[1px] bg-indigo-500/10 shadow-[0_0_10px_rgba(79,70,229,0.3)]"></div>

      <div className="p-6 flex items-center justify-between">
        <button 
          onClick={onResetPortal}
          className="flex flex-col text-left group"
        >
          <h1 className="font-black text-2xl text-white tracking-tighter italic leading-none group-hover:text-glow transition-all duration-500 text-glow">NEXUS</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
             <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
             <span className="text-[7px] font-black text-indigo-500 uppercase tracking-[0.4em] leading-none">Global Node</span>
          </div>
        </button>
        <button 
          onClick={onStartAddingHub}
          className="bg-slate-900/50 hover:bg-indigo-600/20 text-slate-500 hover:text-white p-2.5 rounded-xl transition-all border border-slate-800/40 active:scale-90 group"
          title="Initialize New Hub"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:rotate-90 transition-transform duration-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-4 pb-10 space-y-1 px-4 custom-scrollbar">
        <div className="px-1.5 mb-5">
           <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] italic">Active Matrices</span>
        </div>
        {groups.map((group) => {
          const isActive = activeGroupId === group.id;
          return (
            <div key={group.id} className="mb-2">
              <button
                onClick={() => onSelectGroup(group.id)}
                className={`w-full flex items-center p-3 rounded-2xl transition-all duration-300 border relative overflow-hidden group/hub ${
                  isActive 
                    ? 'bg-indigo-600/10 border-indigo-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
                    : 'border-transparent text-slate-500 hover:text-slate-400 hover:bg-slate-900/40'
                }`}
              >
                <div className="relative mr-4">
                  <img 
                    src={group.avatar} 
                    className={`w-10 h-10 rounded-xl object-cover transition-all duration-500 ${
                      isActive ? 'scale-110 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'grayscale opacity-60 group-hover/hub:grayscale-0 group-hover/hub:opacity-100'
                    }`} 
                    alt="" 
                  />
                  {isActive && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-lg pulse-indicator"></div>
                  )}
                </div>
                
                <div className="text-left truncate flex-1 min-w-0">
                  <div className={`font-black text-[11px] truncate leading-tight uppercase tracking-tighter transition-colors ${isActive ? 'text-white italic' : 'text-slate-600 group-hover/hub:text-slate-400'}`}>
                    {group.name}
                  </div>
                  <div className={`text-[7px] font-black tracking-[0.2em] mt-1 uppercase ${isActive ? 'text-indigo-500/80' : 'text-slate-800'}`}>
                    {group.type === GroupType.TOPICS ? 'Workspace' : 'Direct Link'}
                  </div>
                </div>
              </button>

              {/* Nested Module List - Visible on Mobile & Tablet (up to lg breakpoint) */}
              {isActive && group.type === GroupType.TOPICS && (
                <div className="ml-8 mt-2.5 border-l-2 border-slate-900/50 pl-4 space-y-1.5 py-1.5 animate-in slide-in-from-left duration-500 lg:hidden">
                  {group.topics.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => onSelectTopic(topic.id)}
                      className={`w-full flex items-center py-3 px-3 rounded-xl text-[10px] font-black transition-all ${
                        activeTopicId === topic.id 
                          ? 'text-indigo-400 bg-indigo-500/5 shadow-inner' 
                          : 'text-slate-700 hover:text-slate-400 hover:bg-slate-900/40'
                      }`}
                    >
                      <span className="mr-2 opacity-40 font-black">#</span>
                      <span className="truncate uppercase tracking-tight italic">{topic.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => onAddTopic(group.id)}
                    className="w-full flex items-center py-2.5 px-3 rounded-xl text-[9px] font-black text-slate-800 hover:text-indigo-500 hover:bg-slate-900/40 transition-all uppercase tracking-widest group/add"
                  >
                    <span className="mr-2.5 opacity-50 group-hover/add:scale-125 transition-transform duration-300">➕</span>
                    <span>Inject Module</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Card */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-900/50">
         <div 
           onClick={onEditProfile}
           className="flex items-center gap-3.5 p-3.5 bg-slate-900/30 rounded-2xl border border-slate-800/40 group cursor-pointer hover:bg-slate-900/60 transition-all duration-500"
         >
            <div className="relative shrink-0">
              {currentUser.avatar.length > 20 ? (
                <img src={currentUser.avatar} className="w-9 h-9 rounded-xl object-cover border border-indigo-400/20 shadow-lg group-hover:scale-110 transition-transform" alt="" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-[10px] group-hover:scale-110 transition-transform shadow-lg border border-indigo-400/20 uppercase">
                  {currentUser.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-[9px] font-black text-white truncate uppercase tracking-tighter italic leading-none mb-1.5">{currentUser.name.replace(/\s/g, '_')}</div>
               <div className="flex items-center gap-1.5">
                 <span className={`w-1.5 h-1.5 rounded-full ${currentUser.status === 'online' ? 'bg-emerald-500 pulse-indicator shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></span>
                 <span className={`text-[7px] font-black uppercase tracking-widest leading-none ${currentUser.status === 'online' ? 'text-emerald-500' : 'text-slate-600'}`}>
                   {currentUser.status === 'online' ? 'Protocol Secure' : 'Offline'}
                 </span>
               </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onLogout(); }}
              className="p-2 text-slate-600 hover:text-red-500 transition-colors"
              title="Terminate Session"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;
