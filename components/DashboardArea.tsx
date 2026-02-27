
import React, { useState, useRef } from 'react';
import { Group, Topic, Attachment, Resource, GroupMember, Poll } from '../types';
import ChatArea from './ChatArea';
import { GoogleGenAI } from "@google/genai";
import HubSettingsModal from './HubSettingsModal';

interface DashboardAreaProps {
  group: Group;
  currentUser: GroupMember;
  activeTopicId: string | null;
  isAiLoading?: boolean;
  onSelectTopic: (id: string) => void;
  onOpenVoice: (mode: 'voice' | 'video') => void;
  onSendMessage: (topicId: string, text: string, attachment?: Attachment, poll?: Poll) => void;
  onAskAI: (topicId: string, text: string) => void;
  onVotePoll: (topicId: string, messageId: string, optionIndex: number) => void;
  onReactToMessage: (topicId: string, messageId: string, emoji: string) => void;
  onReactToMessageInTopic?: (topicId: string, messageId: string, emoji: string) => void;
  onPinMessage: (topicId: string, messageId: string) => void;
  onRearrangeResources: (topicId: string, direction: 'up' | 'down', resourceId: string) => void;
  onAddMember: (name: string, role: GroupMember['role']) => void;
  onInviteMember?: () => void;
  onUploadResource: (topicId: string, resource: Omit<Resource, 'id' | 'uploadedBy' | 'date'>) => void;
  onStartAddingTopic: () => void;
  onEditTopic: (topic: Topic) => void;
  onEditHub: () => void;
  onDeleteHub: () => void;
  onLeaveHub?: () => void;
  onToggleMenu: () => void;
}

const DashboardArea: React.FC<DashboardAreaProps> = ({ 
  group, 
  currentUser,
  activeTopicId, 
  isAiLoading = false,
  onSelectTopic, 
  onOpenVoice, 
  onSendMessage,
  onAskAI,
  onVotePoll,
  onReactToMessage,
  onPinMessage,
  onRearrangeResources,
  onAddMember,
  onInviteMember,
  onUploadResource,
  onStartAddingTopic,
  onEditTopic,
  onEditHub,
  onDeleteHub,
  onLeaveHub,
  onToggleMenu
}) => {
  const [viewMode, setViewMode] = useState<'discussion' | 'resources' | 'members'>('discussion');
  const [showHubSettings, setShowHubSettings] = useState(false);
  
  // Resource AI Modal State
  const [showResourceAi, setShowResourceAi] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTopic = group.topics.find(t => t.id === activeTopicId);

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📕';
    if (type.includes('excel')) return '📊';
    if (type.includes('image')) return '🖼️';
    return '📁';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeTopic) {
      const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`;
      onUploadResource(activeTopic.id, { name: file.name, type: file.type || 'application/octet-stream', size: sizeStr });
      e.target.value = '';
    }
  };

  const handleResourceAiQuery = async (presetPrompt?: string) => {
    if (!selectedResource || isAiProcessing) return;
    const promptToUse = presetPrompt || aiPrompt;
    if (!promptToUse.trim()) return;

    setIsAiProcessing(true);
    setAiResult('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: promptToUse,
        config: {
          systemInstruction: `You are Nexus AI Resource Analyst. You are analyzing the file: "${selectedResource.name}" (Type: ${selectedResource.type}, Size: ${selectedResource.size}) within the "${activeTopic?.name}" module. Provide expert-level analysis, summaries, or insights based on scholarly principles.`
        }
      });
      setAiResult(response.text || "Neural core unresponsive.");
    } catch (err) {
      console.error(err);
      setAiResult("Interface Error: Protocol failure in Gemini Core.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleDeployResourceAiToChat = () => {
    if (!aiResult || !activeTopic || !selectedResource) return;
    const deploymentText = `[AI RESOURCE ANALYSIS: ${selectedResource.name}]\n\n${aiResult}`;
    onSendMessage(activeTopic.id, deploymentText);
    setShowResourceAi(false);
    setAiResult('');
    setAiPrompt('');
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'Owner': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'Admin': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'AI Assistant': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-900 text-slate-600 border-slate-800';
    }
  };

  const handleRecruitNode = () => {
    const name = prompt("Designate Node Alias:");
    if (name) {
      onAddMember(name, 'Member');
    }
  };

  const NavigationTabs = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 shadow-inner ${className}`}>
      <button onClick={() => setViewMode('discussion')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black tracking-[0.1em] uppercase transition-all ${viewMode === 'discussion' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Uplink</button>
      <button onClick={() => setViewMode('resources')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black tracking-[0.1em] uppercase transition-all ${viewMode === 'resources' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Library</button>
      <button onClick={() => setViewMode('members')} className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black tracking-[0.1em] uppercase transition-all ${viewMode === 'members' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Nodes</button>
    </div>
  );

  return (
    <div className="flex h-full bg-slate-950 relative overflow-hidden">
      {/* High-Density Module Matrix */}
      <div className="w-64 bg-slate-950/40 border-r border-slate-900/50 hidden lg:flex flex-col shrink-0 custom-scrollbar overflow-y-auto">
        <div className="p-6 border-b border-slate-900/30 flex items-center justify-between">
          <div className="font-black uppercase tracking-[0.2em] text-[9px] text-slate-600 italic">Core Modules</div>
          <button onClick={() => setShowHubSettings(true)} className="text-indigo-500 hover:text-white transition-colors p-1.5 bg-slate-900/40 rounded-lg border border-slate-800/40 shadow-lg">⚙️</button>
        </div>
        
        <div className="px-3 py-6 space-y-1.5">
          {group.topics.map((topic) => (
            <button key={topic.id} onClick={() => onSelectTopic(topic.id)} className={`w-full text-left p-4 rounded-2xl flex items-center transition-all duration-300 border group ${activeTopicId === topic.id ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/40 shadow-xl' : 'border-transparent text-slate-600 hover:text-slate-400 hover:bg-slate-900/60'}`}>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-black text-[11px] tracking-tight uppercase italic mb-1.5">{topic.name}</span>
                <span className="block text-[8px] text-slate-700 font-bold uppercase truncate">{topic.description || 'Primary Objective'}</span>
              </div>
            </button>
          ))}
          <button onClick={onStartAddingTopic} className="w-full text-left p-4 rounded-2xl flex items-center gap-4 text-slate-700 hover:text-indigo-500 border border-dashed border-slate-900 mt-6 group transition-all hover:bg-slate-900/30">
            <span className="text-xl opacity-40 group-hover:scale-125 transition-transform duration-300">➕</span><span className="truncate flex-1 text-[10px] font-black uppercase tracking-widest">Inject Module</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {!activeTopic ? (
          <div className="flex flex-col h-full items-center justify-center p-12 text-center animate-in fade-in duration-700">
             <div className="w-24 h-24 bg-slate-900/40 rounded-3xl flex items-center justify-center text-4xl mb-8 border border-slate-800 shadow-2xl text-slate-700">📡</div>
             <h2 className="text-3xl font-black text-white mb-4 italic tracking-tighter uppercase text-glow">System Idle</h2>
             <button onClick={onToggleMenu} className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] lg:hidden shadow-2xl">Select Node</button>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <header className="bg-slate-950/60 backdrop-blur-3xl border-b border-slate-900 px-4 md:px-6 py-4 flex flex-col gap-3 md:gap-4 z-10 shrink-0">
               <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1">
                    <button onClick={onToggleMenu} className="p-2.5 bg-slate-900 rounded-xl md:hidden text-slate-500 border border-slate-800/50 shrink-0 shadow-lg">☰</button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                         <span className="text-indigo-500/50 font-black text-sm">#</span>
                         <h2 className="text-base md:text-xl font-black text-white leading-tight truncate uppercase italic tracking-tighter">{activeTopic.name}</h2>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <NavigationTabs className="hidden md:flex" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowHubSettings(true)} className="p-2 md:p-2.5 text-slate-500 hover:text-white bg-slate-900/40 rounded-xl border border-slate-800/40 shadow-lg lg:hidden">⚙️</button>
                      <button onClick={() => onOpenVoice('voice')} className="p-2 md:p-2.5 text-indigo-400 hover:text-white bg-slate-900/40 rounded-xl border border-slate-800/40 shadow-lg">🔊</button>
                      <button onClick={() => onOpenVoice('video')} className="p-2 md:p-2.5 text-indigo-400 hover:text-white bg-slate-900/40 rounded-xl border border-slate-800/40 shadow-lg">🎥</button>
                    </div>
                  </div>
               </div>
               {/* Tab Navigation for Mobile and Tablet */}
               <div className="md:hidden">
                 <NavigationTabs className="w-full overflow-x-auto custom-scrollbar" />
               </div>
            </header>

            <div className="flex-1 overflow-hidden">
              {viewMode === 'discussion' && (
                <ChatArea 
                  group={group}
                  groupName={activeTopic.name} 
                  messages={activeTopic.messages} 
                  members={group.members} 
                  currentUser={currentUser.name}
                  isAiLoading={isAiLoading}
                  onSendMessage={(text, attachment, poll) => onSendMessage(activeTopic.id, text, attachment, poll)} 
                  onAskAI={(text) => onAskAI(activeTopic.id, text)}
                  onVotePoll={(messageId, optIdx) => onVotePoll(activeTopic.id, messageId, optIdx)}
                  onReactToMessage={(messageId, emoji) => onReactToMessage(activeTopic.id, messageId, emoji)}
                  onPinMessage={(messageId) => onPinMessage(activeTopic.id, messageId)}
                  onAddMember={onAddMember}
                  onInviteMember={onInviteMember}
                  onToggleMenu={onToggleMenu}
                  hideHeader={true}
                />
              )}
              {viewMode === 'resources' && (
                <div className="h-full overflow-y-auto p-4 md:p-8 bg-slate-950/40 custom-scrollbar">
                   <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="aspect-square bg-indigo-600/5 border border-dashed border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-indigo-600/10 transition-all group">
                           <span className="text-2xl group-hover:scale-125 transition-transform duration-500">➕</span><span className="text-[10px] font-black text-white uppercase italic">Inject Archive</span>
                        </button>
                        {activeTopic.resources.map((res) => (
                          <div key={res.id} className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between hover:bg-slate-900 transition-all shadow-xl group aspect-square relative overflow-hidden">
                             {/* AI Analysis Overlay Trigger */}
                             <button 
                                onClick={() => { setSelectedResource(res); setAiResult(''); setAiPrompt(''); setShowResourceAi(true); }}
                                className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-110 active:scale-95"
                                title="Neural Analysis"
                             >
                                ✨
                             </button>

                             <div className="flex flex-col items-center text-center gap-3">
                               <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-xl border border-slate-800/50 shadow-inner shrink-0">{getFileIcon(res.type)}</div>
                               <div className="min-w-0 w-full">
                                 <h5 className="font-black text-white truncate text-[10px] tracking-tighter uppercase italic">{res.name}</h5>
                                 <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">{res.size}</span>
                               </div>
                             </div>
                             <div className="flex gap-1.5 mt-2">
                               <button className="flex-1 py-1.5 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shadow-lg">Download</button>
                             </div>
                          </div>
                        ))}
                    </div>
                </div>
              )}
              {viewMode === 'members' && (
                <div className="h-full overflow-y-auto p-4 md:p-8 bg-slate-950/40 custom-scrollbar">
                   <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      <button onClick={onInviteMember} className="bg-indigo-600/10 border border-indigo-500/30 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-indigo-600/20 transition-all group aspect-square md:aspect-auto shadow-[0_0_20px_rgba(79,70,229,0.1)]">
                        <span className="text-xl group-hover:scale-125 transition-transform duration-300">📡</span><span className="text-[8px] font-black text-indigo-400 uppercase italic">Share Uplink</span>
                      </button>
                      <button onClick={handleRecruitNode} className="bg-slate-900/50 border border-dashed border-slate-800 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-900 transition-all group aspect-square md:aspect-auto">
                        <span className="text-xl group-hover:scale-125 transition-transform duration-300">➕</span><span className="text-[8px] font-black text-slate-500 uppercase italic">Local Node</span>
                      </button>
                      {group.members.map(member => (
                        <div key={member.id} className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-2xl flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl group">
                           <div className="relative shrink-0"><img src={member.avatar} className="w-8 h-8 rounded-lg object-cover border border-slate-800 shadow-md" alt="" /><div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${member.status === 'online' ? 'bg-emerald-500' : 'bg-slate-800'}`}></div></div>
                           <div className="flex-1 min-w-0"><div className="font-black text-white text-[9px] truncate uppercase italic tracking-tighter leading-none mb-1">{member.name}</div><div className={`inline-flex px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-widest border ${getRoleColor(member.role)}`}>{member.role}</div></div>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resource AI Consultation Modal */}
      {showResourceAi && selectedResource && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[3.5rem] shadow-[0_0_120px_-20px_rgba(79,70,229,0.5)] overflow-hidden animate-in zoom-in-95 duration-200">
              <header className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-2xl shadow-indigo-500/30">✨</div>
                    <div className="text-left">
                       <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-tight">Neural Resource Analysis</h3>
                       <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic flex items-center gap-2">
                         <span className="opacity-50">Packet:</span> {selectedResource.name}
                       </p>
                    </div>
                 </div>
                 <button onClick={() => setShowResourceAi(false)} className="p-4 text-slate-500 hover:text-white transition-colors bg-slate-950/50 rounded-2xl border border-slate-800/50 shadow-inner">✕</button>
              </header>

              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 {/* Preset Actions */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleResourceAiQuery("Summarize this packet and provide 3 executive takeaways.")}
                      className="p-5 bg-indigo-600/5 border border-indigo-500/20 rounded-2xl hover:bg-indigo-600/15 transition-all text-left group"
                    >
                      <div className="text-[10px] font-black text-indigo-400 uppercase italic mb-1 group-hover:text-white transition-colors">Summarize Packet</div>
                      <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Execute Executive Digest</div>
                    </button>
                    <button 
                      onClick={() => handleResourceAiQuery("Identify and extract all critical data points and strategic insights from this resource.")}
                      className="p-5 bg-emerald-600/5 border border-emerald-500/20 rounded-2xl hover:bg-emerald-600/15 transition-all text-left group"
                    >
                      <div className="text-[10px] font-black text-emerald-400 uppercase italic mb-1 group-hover:text-white transition-colors">Extract Insights</div>
                      <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Perform Deep-Scan Insight Extraction</div>
                    </button>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] italic ml-2">Neural Inquiry</label>
                    <textarea 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-2xl px-6 py-5 text-sm text-white font-medium outline-none focus:border-indigo-600 transition-all placeholder:text-slate-800 resize-none h-28 shadow-inner"
                      placeholder="Ask Nexus AI about this file..."
                    />
                    <button 
                      onClick={() => handleResourceAiQuery()}
                      disabled={!aiPrompt.trim() || isAiProcessing}
                      className="w-full py-4 bg-slate-900 border border-slate-800 hover:border-indigo-500 text-indigo-400 font-black uppercase text-[9px] tracking-[0.3em] rounded-xl transition-all disabled:opacity-30"
                    >
                      Process Inquiry
                    </button>
                 </div>

                 {isAiProcessing && (
                   <div className="py-12 flex flex-col items-center justify-center gap-4 bg-slate-950/30 rounded-[2.5rem] border border-slate-800/30">
                      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse italic">Scanning Data Matrix...</p>
                   </div>
                 )}

                 {aiResult && !isAiProcessing && (
                   <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between px-2">
                         <label className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">Analysis Result</label>
                         <span className="text-[7px] text-slate-600 font-bold uppercase">Confidence: High-Sig</span>
                      </div>
                      <div className="w-full bg-slate-950 border border-slate-800/50 rounded-2xl p-8 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium shadow-2xl relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600/30"></div>
                         {aiResult}
                      </div>
                   </div>
                 )}
              </div>

              <footer className="p-8 bg-slate-950/60 border-t border-slate-800 flex gap-4">
                 <button 
                  onClick={() => setShowResourceAi(false)}
                  className="px-10 py-5 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest italic transition-all active:scale-[0.98]"
                 >
                   Abort
                 </button>
                 <button 
                  onClick={handleDeployResourceAiToChat}
                  disabled={!aiResult || isAiProcessing}
                  className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] italic shadow-[0_20px_50px_-15px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98] disabled:opacity-30"
                 >
                   Deploy Analysis to Uplink
                 </button>
              </footer>
           </div>
        </div>
      )}

      {showHubSettings && (
        <HubSettingsModal 
          hub={group}
          onClose={() => setShowHubSettings(false)}
          onEditHub={onEditHub}
          onDeleteHub={onDeleteHub}
          onLeaveHub={onLeaveHub}
          onInviteMember={onInviteMember}
          onAddTopic={onStartAddingTopic}
          showAddTopic={true}
        />
      )}
    </div>
  );
};

export default DashboardArea;
