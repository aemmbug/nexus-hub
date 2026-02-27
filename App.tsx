
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import DashboardArea from './components/DashboardArea';
import MeetingSession from './components/MeetingSession';
import HubCreationScreen from './components/HubCreationScreen';
import StartupScreen from './components/StartupScreen';
import UserProfileScreen from './components/UserProfileScreen';
import AuthScreen from './components/AuthScreen';
import { Group, GroupType, Message, Attachment, Resource, Topic, GroupMember, Poll } from './types';
import { GoogleGenAI } from "@google/genai";
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  setDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore';

const AI_ASSISTANT_MEMBER: GroupMember = { id: 'ai', name: 'Nexus AI Tutor', avatar: 'https://picsum.photos/80/80?u=ai', role: 'AI Assistant', status: 'online' };

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<GroupMember | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [isAddingHub, setIsAddingHub] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [sessionMode, setSessionMode] = useState<'voice' | 'video' | null>(null);
  const [sessionGroupName, setSessionGroupName] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const handleJoinLink = async () => {
      const path = window.location.pathname;
      if (path.startsWith('/join/') && currentUser) {
        const groupId = path.split('/join/')[1];
        if (groupId) {
          setIsJoining(true);
          try {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDocs(query(collection(db, 'groups'), where('__name__', '==', groupId)));
            
            if (!groupSnap.empty) {
              const groupData = groupSnap.docs[0].data() as Group;
              if (!groupData.memberIds.includes(currentUser.id)) {
                await updateDoc(groupRef, {
                  members: [...groupData.members, currentUser],
                  memberIds: [...groupData.memberIds, currentUser.id]
                });
                alert(`Successfully joined ${groupData.name}!`);
              }
              setActiveGroupId(groupId);
              window.history.replaceState({}, '', '/');
            }
          } catch (err) {
            console.error("Join failed", err);
          } finally {
            setIsJoining(false);
          }
        }
      }
    };

    handleJoinLink();
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Unknown',
          avatar: user.photoURL || 'https://picsum.photos/80/80?u=' + user.uid,
          role: 'Member',
          status: 'online'
        });
        setIsRegistered(true);
      } else {
        setCurrentUser(null);
        setIsRegistered(false);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const groupsQuery = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', currentUser.id)
    );

    const unsubscribe = onSnapshot(groupsQuery, 
      (snapshot) => {
        const groupsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((g: any) => !g.deleted) as Group[];
        
        setGroups(groupsData);
      },
      (error) => {
        console.error("Groups listener error:", error);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time messages listener
  useEffect(() => {
    if (!activeGroupId || !currentUser) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('groupId', '==', activeGroupId)
    );

    const unsubscribe = onSnapshot(messagesQuery, 
      (snapshot) => {
        const allMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: (doc.data().timestamp as Timestamp)?.toDate() || new Date()
        })) as (Message & { topicId?: string })[];

        // Sort client-side to avoid the need for a composite index in Firestore
        allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        setGroups(prev => prev.map(g => {
          if (g.id !== activeGroupId) return g;
          
          if (g.type === GroupType.STANDARD) {
            return { ...g, messages: allMessages.filter(m => !m.topicId) };
          } else {
            return {
              ...g,
              topics: g.topics.map(t => ({
                ...t,
                messages: allMessages.filter(m => m.topicId === t.id)
              }))
            };
          }
        }));
      },
      (error) => {
        console.error("Messages listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [activeGroupId, currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveGroupId(null);
      setActiveTopicId(null);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleDeleteHub = async (groupId: string) => {
    try {
      // Mark as deleted or actually delete
      await updateDoc(doc(db, 'groups', groupId), { deleted: true });
      setActiveGroupId(null);
      setActiveTopicId(null);
    } catch (err) {
      console.error("Delete hub failed", err);
    }
  };

  const handleLeaveHub = async (groupId: string) => {
    if (!currentUser) return;
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      const newMembers = group.members.filter(m => m.id !== currentUser.id);
      const newMemberIds = group.memberIds.filter(id => id !== currentUser.id);

      await updateDoc(doc(db, 'groups', groupId), {
        members: newMembers,
        memberIds: newMemberIds
      });
      
      setActiveGroupId(null);
      setActiveTopicId(null);
    } catch (err) {
      console.error("Leave hub failed", err);
    }
  };

  const handleRegister = async (user: GroupMember) => {
    setCurrentUser(user);
    setIsRegistered(true);
  };

  const handleSendMessage = async (topicIdOrNull: string | null, text: string, attachment?: Attachment, poll?: Poll) => {
    if (!currentUser || !activeGroupId) return;
    
    try {
      await addDoc(collection(db, 'messages'), {
        groupId: activeGroupId,
        topicId: topicIdOrNull,
        sender: currentUser.name,
        text,
        timestamp: serverTimestamp(),
        avatar: currentUser.avatar,
        attachment: attachment || null,
        poll: poll || null,
        reactions: {},
        isPinned: false
      });

      if (attachment) {
        const group = groups.find(g => g.id === activeGroupId);
        if (group && group.type === GroupType.TOPICS) {
          const updatedTopics = group.topics.map(t => {
            if (t.id !== topicIdOrNull) return t;
            return {
              ...t,
              resources: [
                {
                  id: `res-${Date.now()}`,
                  name: attachment.name,
                  type: attachment.type,
                  size: attachment.size,
                  url: attachment.url,
                  uploadedBy: currentUser.name,
                  date: new Date()
                },
                ...t.resources
              ]
            };
          });
          await updateDoc(doc(db, 'groups', activeGroupId), { topics: updatedTopics });
        }
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleUploadResource = async (topicId: string, resourceData: Omit<Resource, 'id' | 'uploadedBy' | 'date'>) => {
    if (!currentUser || !activeGroupId) return;
    const newResource: Resource = {
      ...resourceData,
      id: `res-library-${Date.now()}`,
      uploadedBy: currentUser.name,
      date: new Date()
    };

    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    const updatedTopics = group.topics.map(t => {
      if (t.id !== topicId) return t;
      return {
        ...t,
        resources: [newResource, ...t.resources]
      };
    });

    try {
      await updateDoc(doc(db, 'groups', activeGroupId), { topics: updatedTopics });
    } catch (err) {
      console.error("Failed to upload resource", err);
    }
  };

  const handleReactToMessage = async (topicIdOrNull: string | null, messageId: string, emoji: string) => {
    if (!currentUser) return;
    
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    let targetMessage: Message | undefined;
    if (group.type === GroupType.STANDARD) {
      targetMessage = group.messages.find(m => m.id === messageId);
    } else {
      targetMessage = group.topics.find(t => t.id === topicIdOrNull)?.messages.find(m => m.id === messageId);
    }

    if (!targetMessage) return;

    const currentReactions = { ...(targetMessage.reactions || {}) };
    const users = [...(currentReactions[emoji] || [])];
    
    if (users.includes(currentUser.name)) {
      currentReactions[emoji] = users.filter(u => u !== currentUser.name);
      if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
    } else {
      currentReactions[emoji] = [...users, currentUser.name];
    }

    try {
      await updateDoc(doc(db, 'messages', messageId), { reactions: currentReactions });
    } catch (err) {
      console.error("Failed to update reaction", err);
    }
  };

  const handlePinMessage = async (topicIdOrNull: string | null, messageId: string) => {
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    let targetMessage: Message | undefined;
    if (group.type === GroupType.STANDARD) {
      targetMessage = group.messages.find(m => m.id === messageId);
    } else {
      targetMessage = group.topics.find(t => t.id === topicIdOrNull)?.messages.find(m => m.id === messageId);
    }

    if (!targetMessage) return;

    try {
      await updateDoc(doc(db, 'messages', messageId), { isPinned: !targetMessage.isPinned });
    } catch (err) {
      console.error("Failed to pin message", err);
    }
  };

  const handleVotePoll = async (topicIdOrNull: string | null, messageId: string, optionIndex: number) => {
    if (!currentUser) return;
    
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    let targetMessage: Message | undefined;
    if (group.type === GroupType.STANDARD) {
      targetMessage = group.messages.find(m => m.id === messageId);
    } else {
      targetMessage = group.topics.find(t => t.id === topicIdOrNull)?.messages.find(m => m.id === messageId);
    }

    if (!targetMessage || !targetMessage.poll) return;

    const newOptions = targetMessage.poll.options.map((opt, idx) => {
      let votes = [...opt.votes];
      if (idx === optionIndex) {
        if (votes.includes(currentUser.name)) {
          votes = votes.filter(v => v !== currentUser.name);
        } else {
          votes.push(currentUser.name);
        }
      } else {
        votes = votes.filter(v => v !== currentUser.name);
      }
      return { ...opt, votes };
    });

    try {
      await updateDoc(doc(db, 'messages', messageId), { poll: { ...targetMessage.poll, options: newOptions } });
    } catch (err) {
      console.error("Failed to vote in poll", err);
    }
  };

  const handleAddMember = async (name: string, role: GroupMember['role']) => {
    if (!activeGroupId) return;
    const newMember: GroupMember = {
      id: `u-${Date.now()}`,
      name,
      avatar: `https://picsum.photos/80/80?u=${Math.random()}`,
      role,
      status: 'online'
    };
    
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    try {
      await updateDoc(doc(db, 'groups', activeGroupId), {
        members: [...group.members, newMember],
        memberIds: [...(group.memberIds || []), newMember.id]
      });
    } catch (err) {
      console.error("Failed to add member", err);
    }
  };

  const handleInviteMember = () => {
    if (!activeGroupId) return;
    const inviteLink = `${window.location.origin}/join/${activeGroupId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert("Invite link copied to clipboard: " + inviteLink);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleAskAI = async (topicIdOrNull: string | null, prompt: string) => {
    if (!currentUser || isAiLoading || !activeGroupId) return;
    await handleSendMessage(topicIdOrNull, prompt);
    setIsAiLoading(true);

    try {
      const activeGroup = groups.find(g => g.id === activeGroupId);
      if (!activeGroup) return;

      const historyMessages = activeGroup.type === GroupType.STANDARD 
        ? activeGroup.messages.slice(-10)
        : activeGroup.topics.find(t => t.id === topicIdOrNull)?.messages.slice(-10) || [];

      const context = historyMessages.map(m => `${m.sender}: ${m.text}`).join('\n');
      const systemPrompt = `You are Nexus AI Tutor. Previous context:\n${context}`;

      const aiClient = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
      const response = await aiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: systemPrompt }
      });

      const aiResponseText = response.text || "Connection lost.";
      
      await addDoc(collection(db, 'messages'), {
        groupId: activeGroupId,
        topicId: topicIdOrNull,
        sender: AI_ASSISTANT_MEMBER.name,
        text: aiResponseText,
        timestamp: serverTimestamp(),
        avatar: AI_ASSISTANT_MEMBER.avatar,
        reactions: {},
        isPinned: false
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId) || null;

  if (isLoadingAuth || isJoining) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] animate-pulse">
            {isJoining ? 'Establishing Uplink...' : 'Synchronizing Matrix...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return <AuthScreen onRegister={handleRegister} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#020617] text-slate-200 selection:bg-indigo-500/30">
      <div className={`fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {currentUser && (
          <Sidebar 
            groups={groups} 
            activeGroupId={activeGroupId || ''} 
            activeTopicId={activeTopicId}
            currentUser={currentUser}
            onSelectGroup={(id) => { setActiveGroupId(id); setActiveTopicId(groups.find(g => g.id === id)?.topics[0]?.id || null); setIsMobileMenuOpen(false); }}
            onSelectTopic={(id) => { setActiveTopicId(id); setIsMobileMenuOpen(false); }}
            onStartAddingHub={() => { setIsAddingHub(true); setIsMobileMenuOpen(false); }}
            onResetPortal={() => { setActiveGroupId(null); setActiveTopicId(null); setIsAddingHub(false); }}
            onAddTopic={() => setIsTopicModalOpen(true)}
            onJoinVoice={(mode) => { setSessionMode(mode); setSessionGroupName(activeGroup?.name || 'Session'); }}
            onEditProfile={() => { setIsEditingProfile(true); setIsMobileMenuOpen(false); }}
            onLogout={handleLogout}
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {isEditingProfile && currentUser ? (
          <UserProfileScreen user={currentUser} onUpdate={(upd) => { setCurrentUser({...currentUser, ...upd}); setIsEditingProfile(false); }} onCancel={() => setIsEditingProfile(false)} />
        ) : isAddingHub ? (
          <HubCreationScreen onCreate={async (name, type, avatar, desc, rules) => {
            const newGData = { 
              name, 
              type, 
              avatar, 
              description: desc, 
              rules, 
              topics: type === GroupType.TOPICS ? [{ id: 't1', name: 'General', description: 'Main chat', icon: '🌐', messages: [], resources: [] }] : [], 
              messages: [], 
              members: [currentUser!, AI_ASSISTANT_MEMBER],
              memberIds: [currentUser!.id, AI_ASSISTANT_MEMBER.id]
            };
            try {
              const docRef = await addDoc(collection(db, 'groups'), newGData);
              setActiveGroupId(docRef.id);
              setIsAddingHub(false);
            } catch (err) {
              console.error("Failed to create hub", err);
            }
          }} onCancel={() => setIsAddingHub(false)} />
        ) : activeGroup && currentUser ? (
          activeGroup.type === GroupType.STANDARD ? (
            <ChatArea 
              group={activeGroup}
              messages={activeGroup.messages}
              members={activeGroup.members}
              currentUser={currentUser.name}
              isAiLoading={isAiLoading}
              onSendMessage={(txt, att, poll) => handleSendMessage(null, txt, att, poll)}
              onAskAI={(txt) => handleAskAI(null, txt)}
              onVotePoll={(mid, idx) => handleVotePoll(null, mid, idx)} 
              onReactToMessage={(mid, emo) => handleReactToMessage(null, mid, emo)}
              onPinMessage={(mid) => handlePinMessage(null, mid)}
              onAddMember={handleAddMember}
              onInviteMember={handleInviteMember}
              onToggleMenu={() => setIsMobileMenuOpen(true)}
              onOpenVoice={(mode) => setSessionMode(mode)}
              onEditHub={() => setEditingGroup(activeGroup)}
              onDeleteHub={() => handleDeleteHub(activeGroup.id)}
              onLeaveHub={() => handleLeaveHub(activeGroup.id)}
            />
          ) : (
            <DashboardArea 
              group={activeGroup} 
              currentUser={currentUser}
              activeTopicId={activeTopicId}
              isAiLoading={isAiLoading}
              onSelectTopic={setActiveTopicId}
              onOpenVoice={(mode) => setSessionMode(mode)}
              onSendMessage={handleSendMessage}
              onAskAI={handleAskAI}
              onVotePoll={handleVotePoll}
              onReactToMessage={handleReactToMessage}
              onPinMessage={handlePinMessage}
              onRearrangeResources={() => {}}
              onAddMember={handleAddMember}
              onInviteMember={handleInviteMember}
              onUploadResource={handleUploadResource}
              onStartAddingTopic={() => setIsTopicModalOpen(true)}
              onEditTopic={() => {}}
              onEditHub={() => setEditingGroup(activeGroup)}
              onDeleteHub={() => handleDeleteHub(activeGroup.id)}
              onLeaveHub={() => handleLeaveHub(activeGroup.id)}
              onToggleMenu={() => setIsMobileMenuOpen(true)}
            />
          )
        ) : (
          <StartupScreen 
            groups={groups} 
            activeGroupId={activeGroupId}
            onSelectHub={(id) => { setActiveGroupId(id); setActiveTopicId(groups.find(g => g.id === id)?.topics[0]?.id || null); }} 
            onInitializeHub={() => setIsAddingHub(true)} 
            onJoinHub={async (id) => {
              if (currentUser) {
                setIsJoining(true);
                try {
                  const groupRef = doc(db, 'groups', id);
                  const groupSnap = await getDocs(query(collection(db, 'groups'), where('__name__', '==', id)));
                  
                  if (!groupSnap.empty) {
                    const groupData = groupSnap.docs[0].data() as Group;
                    if (!groupData.memberIds.includes(currentUser.id)) {
                      await updateDoc(groupRef, {
                        members: [...groupData.members, currentUser],
                        memberIds: [...groupData.memberIds, currentUser.id]
                      });
                    }
                    setActiveGroupId(id);
                  } else {
                    alert("Hub not found. Please check the ID.");
                  }
                } catch (err) {
                  console.error("Join failed", err);
                  alert("Failed to join hub. Make sure the ID is correct.");
                } finally {
                  setIsJoining(false);
                }
              }
            }}
          />
        )}
      </main>

      {isTopicModalOpen && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"><div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800"><h3 className="text-xl font-black text-white italic mb-6">Deploy Module</h3><input id="t-name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 mb-6 outline-none" placeholder="Module Name..."/><div className="flex gap-4"><button onClick={() => setIsTopicModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black">Abort</button><button onClick={async () => { 
        const n = (document.getElementById('t-name') as HTMLInputElement).value; 
        if(n && activeGroupId){ 
          const group = groups.find(g => g.id === activeGroupId);
          if (group) {
            const newTopic = {id: `t-${Date.now()}`, name: n, description: '', icon: '🛰️', messages: [], resources: []};
            try {
              await updateDoc(doc(db, 'groups', activeGroupId), {
                topics: [...group.topics, newTopic]
              });
              setIsTopicModalOpen(false);
            } catch (err) {
              console.error("Failed to add topic", err);
            }
          }
        } 
      }} className="flex-1 py-4 bg-indigo-600 rounded-xl font-black text-white">Deploy</button></div></div></div>}
      {sessionMode && <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"><MeetingSession mode={sessionMode} onClose={() => setSessionMode(null)} groupName={sessionGroupName || 'Session'} members={activeGroup?.members || []} /></div>}
      
      {editingGroup && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8">Modify Matrix Configuration</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic ml-2">Hub Alias</label>
                <input 
                  id="edit-h-name" 
                  defaultValue={editingGroup.name}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-indigo-500 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic ml-2">Objective Description</label>
                <textarea 
                  id="edit-h-desc" 
                  defaultValue={editingGroup.description}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-medium outline-none focus:border-indigo-500 transition-all h-24 resize-none" 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setEditingGroup(null)} className="flex-1 py-5 text-slate-500 font-black uppercase text-[10px] tracking-widest">Abort</button>
                <button onClick={async () => {
                  const name = (document.getElementById('edit-h-name') as HTMLInputElement).value;
                  const description = (document.getElementById('edit-h-desc') as HTMLTextAreaElement).value;
                  if (name) {
                    try {
                      await updateDoc(doc(db, 'groups', editingGroup.id), { name, description });
                      setEditingGroup(null);
                    } catch (err) {
                      console.error("Update hub failed", err);
                    }
                  }
                }} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20">Update Matrix</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
