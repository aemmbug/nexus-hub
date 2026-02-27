
import React, { useState, useRef } from 'react';
import { GroupMember } from '../types';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';

interface UserProfileScreenProps {
  user: GroupMember;
  onUpdate: (updatedUser: Partial<GroupMember>) => void;
  onCancel: () => void;
}

const AVATAR_PRESETS = [
  'https://picsum.photos/150/150?u=1',
  'https://picsum.photos/150/150?u=2',
  'https://picsum.photos/150/150?u=3',
  'https://picsum.photos/150/150?u=4',
  'https://picsum.photos/150/150?u=5',
  'https://picsum.photos/150/150?u=6',
];

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ user, onUpdate, onCancel }) => {
  const [name, setName] = useState(user.name);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [status, setStatus] = useState(user.status);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const finalAvatar = customAvatarUrl.trim() || selectedAvatar;

  const handleUpdate = async () => {
    if (name.trim()) {
      setIsLoading(true);
      try {
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: name,
            photoURL: finalAvatar
          });
        }
        onUpdate({
          name,
          avatar: finalAvatar,
          status
        });
      } catch (err) {
        console.error("Failed to update profile", err);
        alert("Failed to update profile");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedAvatar(base64String);
        setCustomAvatarUrl('');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] overflow-hidden animate-in fade-in duration-300">
      <nav className="h-16 border-b border-slate-900 bg-slate-950/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black italic shadow-lg">NX</div>
          <div className="flex flex-col">
            <h2 className="text-xs font-black text-white uppercase tracking-widest italic leading-tight">Node Identity Management</h2>
            <span className="text-[7px] text-slate-500 font-bold uppercase tracking-[0.3em]">Operational Node: {user.id}</span>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 text-slate-600 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
          
          {/* Hero Section */}
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative group">
              <div className="absolute inset-0 rounded-[3rem] bg-indigo-600/20 blur-3xl animate-pulse" />
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[3rem] bg-slate-900 border-2 border-slate-800 overflow-hidden relative z-10 shadow-2xl transition-all duration-500 group-hover:border-indigo-500/50">
                <img src={finalAvatar} className="w-full h-full object-cover" alt="" />
                <div className={`absolute bottom-3 right-3 w-4 h-4 rounded-full border-4 border-slate-950 ${status === 'online' ? 'bg-emerald-500 pulse-indicator' : 'bg-slate-700'}`} />
              </div>
            </div>
            
            <div className="space-y-1">
               <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">{name || 'Node_Primary'}</h3>
               <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.5em]">{user.role} Authorization</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Left Column: Designation */}
            <div className="space-y-8">
               <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic border-b border-slate-900 pb-2">Operational Alias</h4>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-2xl px-6 py-4 text-base text-white font-bold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-800"
                    placeholder="Enter Alias..."
                  />
               </section>

               <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic border-b border-slate-900 pb-2">Network Presence</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setStatus('online')}
                      className={`py-3 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-widest ${status === 'online' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}
                    >
                      Active Uplink
                    </button>
                    <button 
                      onClick={() => setStatus('offline')}
                      className={`py-3 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-widest ${status === 'offline' ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}
                    >
                      Ghost Node
                    </button>
                  </div>
               </section>
            </div>

            {/* Right Column: Identity Signature */}
            <div className="space-y-6">
               <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic border-b border-slate-900 pb-2">Visual Signature</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center gap-1 hover:border-indigo-500 hover:bg-indigo-600/10 transition-all group"
                    >
                      <span className="text-lg">📤</span>
                      <span className="text-[7px] font-black uppercase text-slate-600">Inject</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    
                    {AVATAR_PRESETS.map((url, i) => (
                      <button
                        key={url}
                        onClick={() => { setSelectedAvatar(url); setCustomAvatarUrl(''); }}
                        className={`aspect-square rounded-xl border-2 overflow-hidden transition-all ${selectedAvatar === url && !customAvatarUrl ? 'border-indigo-500 ring-4 ring-indigo-500/10 scale-105' : 'border-slate-800 opacity-40 hover:opacity-100 hover:scale-105'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className="w-full bg-slate-900/30 border border-slate-800 rounded-xl px-4 py-3 text-[10px] text-white font-black uppercase tracking-tighter outline-none focus:border-indigo-500 transition-all placeholder:text-slate-800"
                    placeholder="Direct Data Link (URL)..."
                  />
               </section>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-900 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleUpdate}
              disabled={isLoading}
              className="flex-1 py-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] italic shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Authorize Signature Change'}
            </button>
            <button 
              onClick={onCancel}
              className="px-10 py-6 text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-[0.2em] transition-colors"
            >
              Abort Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileScreen;
