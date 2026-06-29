// File: src/types.ts

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  deadline: string;
  estimatedHours: number;
  category: string;
  smartPriorityScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskPercentage: number;
  breakdown?: string[];
  priorityExplanation?: string;
  createdAt: string;
  taskType?: 'core' | 'other';
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  completedDates: string[]; // ISO Date strings (YYYY-MM-DD)
  streak: number;
  createdAt: string;
}

export interface Report {
  id: string;
  userId: string;
  date: string;
  productivityScore: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  focusHours: number;
  summary: string;
  recoveryPlan: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  nickname?: string;
  profilePicture?: string;
  xp: number;
  level: number;
  password?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}
