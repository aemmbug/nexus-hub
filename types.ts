
export enum GroupType {
  STANDARD = 'STANDARD',
  TOPICS = 'TOPICS'
}

export interface Attachment {
  name: string;
  type: string;
  size: string;
  url?: string;
}

export interface PollOption {
  text: string;
  votes: string[]; // List of user names/IDs who voted
}

export interface Poll {
  question: string;
  options: PollOption[];
}

export interface Resource extends Attachment {
  id: string;
  uploadedBy: string;
  date: Date;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  avatar: string;
  attachment?: Attachment;
  poll?: Poll;
  reactions?: { [emoji: string]: string[] }; // Map of emoji to list of usernames
  isPinned?: boolean;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  icon: string;
  messages: Message[];
  resources: Resource[];
  activeCall?: boolean;
}

export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: 'Owner' | 'Admin' | 'Member' | 'AI Assistant';
  status: 'online' | 'offline';
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  rules?: string;
  type: GroupType;
  topics: Topic[];
  messages: Message[]; // For standard groups
  members: GroupMember[];
  memberIds: string[];
  lastMessage?: string;
  avatar: string;
  activeVoiceChannel?: boolean;
  category?: 'Education' | 'Corporate' | 'Community';
}

export interface VoiceParticipant {
  id: string;
  name: string;
  avatar: string;
  isSpeaking: boolean;
}
