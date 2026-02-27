
import React, { useState, useRef } from 'react';
import { Group, GroupType } from '../types';

interface HubCreationScreenProps {
  initialData?: Group;
  onCreate: (name: string, type: GroupType, avatar: string, description?: string, rules?: string) => void;
  onCancel: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=150&h=150&fit=crop',
];

const HubCreationScreen: React.FC<HubCreationScreenProps> = ({ initialData, onCreate, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [rules, setRules] = useState(initialData?.rules || '');
  const [type, setType] = useState<GroupType>(initialData?.type || GroupType.TOPICS);
  const [selectedAvatar, setSelectedAvatar] = useState(initialData?.avatar || AVATAR_PRESETS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const finalAvatar = customAvatarUrl.trim() || selectedAvatar;

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name, type, finalAvatar, description, rules);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB limit for local storage uplink.");
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
      {/* Top Navigation Bar */}
      <nav className="h-16 border-b border-slate-900 bg-slate-950/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black italic shadow-lg shadow-indigo-500/20">NX</div>
          <div className="flex flex-col">
            <h2 className="text-xs font-black text-white uppercase tracking-widest italic leading-tight">
              {initialData ? 'Hub Manifest Maintenance' : 'Hub Initialization'}
            </h2>
            <span className="text-[7px] text-slate-500 font-bold uppercase tracking-[0.3em]">
              Protocol Phase: {initialData ? 'Modification' : 'Configuration'}
            </span>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="p-2 text-slate-600 hover:text-white transition-colors"
          title="Abort Protocol"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 md:p-10">
          
          {/* Left Column: Live Preview & Status */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-0">
              <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-950/40">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Network Preview</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/50"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                  </div>
                </div>
                
                <div className="p-8 flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-[2.5rem] bg-indigo-600/20 blur-2xl animate-pulse" />
                    <img 
                      src={finalAvatar} 
                      onError={(e) => (e.currentTarget.src = AVATAR_PRESETS[0])}
                      className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] border-2 border-indigo-500/50 relative z-10 object-cover shadow-2xl bg-slate-950 transition-all duration-500" 
                      alt="" 
                    />
                  </div>
                  
                  <div className="space-y-1 w-full">
                    <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter truncate px-4">
                      {name || 'SYSTEM.NULL'}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                        {type === GroupType.TOPICS ? 'Workspace Link' : 'Direct Link'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Presence Ready</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2">
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest">Uplink Integrity</span>
                      <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Secured</span>
                    </div>
                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 w-[85%] shadow-[0_0_8px_rgba(79,70,229,0.8)]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Configuration Form */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Step 1: Designation */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-500 shadow-inner">01</span>
                <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">Channel Designation</h4>
              </div>
              <input 
                type="text" 
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900/30 border-2 border-slate-800 rounded-2xl px-6 py-5 text-base text-white font-bold outline-none focus:border-indigo-600 transition-all placeholder:text-slate-800 shadow-inner"
                placeholder="Initialize Hub Label..."
              />
            </section>

            {/* Step 2: Manifesto & Rules */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-500 shadow-inner">02</span>
                <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">Operational Parameters</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] px-2 italic">Mission Briefing</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-900/20 border border-slate-800 rounded-2xl px-4 py-4 text-[12px] text-white font-medium outline-none focus:border-indigo-500 transition-all placeholder:text-slate-800 resize-none h-32 custom-scrollbar shadow-inner"
                    placeholder="Brief members on primary objectives..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] px-2 italic">Engagement Protocols</label>
                  <textarea 
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    className="w-full bg-slate-900/20 border border-slate-800 rounded-2xl px-4 py-4 text-[12px] text-white font-medium outline-none focus:border-indigo-500 transition-all placeholder:text-slate-800 resize-none h-32 custom-scrollbar shadow-inner"
                    placeholder="Define behavioral standards for the node..."
                  />
                </div>
              </div>
            </section>

            {/* Step 3: Identity Signature */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-500 shadow-inner">03</span>
                <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">Identity Signature</h4>
              </div>
              
              <div className="space-y-6">
                 <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {/* File Upload Trigger */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center gap-1 hover:border-indigo-500 hover:bg-indigo-600/10 transition-all group"
                      title="Upload Local Media"
                    >
                      <span className="text-lg group-hover:scale-110 transition-transform">📤</span>
                      <span className="text-[6px] font-black uppercase text-slate-600 group-hover:text-indigo-400">Upload</span>
                    </button>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*"
                    />

                    {AVATAR_PRESETS.map((url) => (
                      <button
                        key={url}
                        onClick={() => { setSelectedAvatar(url); setCustomAvatarUrl(''); }}
                        className={`aspect-square rounded-xl border-2 overflow-hidden relative group transition-all ${selectedAvatar === url && !customAvatarUrl ? 'border-indigo-500 ring-4 ring-indigo-500/10 scale-105' : 'border-slate-800 opacity-40 hover:opacity-100 hover:scale-105'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                  
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      className="w-full bg-slate-900/30 border border-slate-800 rounded-xl px-4 py-4 text-[11px] text-white font-black uppercase tracking-tighter outline-none focus:border-indigo-500 transition-all placeholder:text-slate-800 shadow-inner"
                      placeholder="Or inject external Node Link (Image URL)..."
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-30 group-focus-within:opacity-100 transition-opacity">
                       <span className="text-[7px] text-indigo-400 font-black uppercase tracking-widest">External Data Link</span>
                    </div>
                  </div>
              </div>
            </section>

            {/* Step 4: Protocol Type */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-500 shadow-inner">04</span>
                <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">Uplink Protocol</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => setType(GroupType.STANDARD)}
                  className={`flex items-center p-6 rounded-2xl border-2 transition-all gap-5 text-left group/btn ${type === GroupType.STANDARD ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'bg-slate-900/20 border-slate-800 opacity-60 hover:opacity-100'}`}
                >
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover/btn:scale-110 transition-transform">💬</div>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${type === GroupType.STANDARD ? 'text-white' : 'text-slate-400'}`}>Standard Hub</div>
                    <div className="text-[8px] text-slate-600 font-bold uppercase mt-1 tracking-wider">Unified Communication Link</div>
                  </div>
                </button>
                <button 
                  onClick={() => setType(GroupType.TOPICS)}
                  className={`flex items-center p-6 rounded-2xl border-2 transition-all gap-5 text-left group/btn ${type === GroupType.TOPICS ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'bg-slate-900/20 border-slate-800 opacity-60 hover:opacity-100'}`}
                >
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover/btn:scale-110 transition-transform">🏗️</div>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${type === GroupType.TOPICS ? 'text-white' : 'text-slate-400'}`}>Multi-Thread</div>
                    <div className="text-[8px] text-slate-600 font-bold uppercase mt-1 tracking-wider">Modular Workspace Link</div>
                  </div>
                </button>
              </div>
            </section>

            {/* Actions */}
            <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleCreate}
                disabled={!name.trim()}
                className="flex-1 py-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] italic shadow-[0_15px_40px_-10px_rgba(79,70,229,0.5)] transition-all active:scale-[0.97]"
              >
                Authorize {initialData ? 'Update' : 'Initialization'}
              </button>
              <button 
                onClick={onCancel}
                className="px-10 py-6 text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-[0.2em] transition-colors sm:border-l sm:border-slate-900"
              >
                Abort Protocol
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HubCreationScreen;
