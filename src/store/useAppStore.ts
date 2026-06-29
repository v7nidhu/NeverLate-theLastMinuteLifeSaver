// File: src/store/useAppStore.ts

import { create } from 'zustand';
import { Task, Habit, Report, UserProfile, ChatMessage, ChatSession } from '../types';

interface AppState {
  currentUser: UserProfile | null;
  tasks: Task[];
  habits: Habit[];
  reports: Report[];
  chatHistory: ChatMessage[];
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  theme: 'dark' | 'light';
  activeTab: 'home' | 'calendar-stats' | 'habits' | 'focus' | 'chat';
  setActiveTab: (tab: 'home' | 'calendar-stats' | 'habits' | 'focus' | 'chat') => void;
  focusSession: {
    isActive: boolean;
    isPaused: boolean;
    timeLeft: number; // in seconds
    duration: number; // in seconds
    mode: 'work' | 'break';
    completedSessions: number;
    totalFocusHours: number;
    focusedTaskId: string | null;
  };
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => boolean;
  socialLogin: (email: string, name: string, nickname?: string, profilePicture?: string) => void;
  register: (email: string, name: string, password: string) => boolean;
  logout: () => void;
  toggleTheme: () => void;
  updateProfile: (profile: { displayName: string; nickname?: string; profilePicture?: string }) => void;
  
  // Tasks Actions
  addTask: (task: Omit<Task, 'id' | 'userId' | 'createdAt' | 'smartPriorityScore' | 'riskLevel' | 'riskPercentage'>) => Promise<void>;
  updateTask: (id: string, updated: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  setTaskBreakdown: (id: string, breakdown: string[], explanation: string) => void;

  // Habits Actions
  addHabit: (name: string) => void;
  toggleHabit: (id: string, dateStr: string) => void;
  deleteHabit: (id: string) => void;

  // Reports Actions
  generateWeeklyReport: () => Promise<void>;

  // Chat Actions
  addChatMessage: (sender: 'user' | 'coach', text: string) => void;
  clearChat: () => void;
  createNewSession: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // Focus Actions
  startFocus: (durationMinutes: number, taskId?: string) => void;
  tickFocus: () => void;
  stopFocus: () => void;
  resumeFocus: () => void;
  resetFocus: () => void;
  completeFocusSession: () => void;

  // Gamification Actions
  addXP: (amount: number) => void;

  // Celebration state and triggers
  celebration: { isActive: boolean; message: string; taskId: string } | null;
  clearCelebration: () => void;
}

// Utility: Calculate Priority Score & Risk level
export const calculateSmartPriority = (deadline: string, estimatedHours: number) => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // If already overdue
  if (diffDays <= 0) {
    return {
      score: 100,
      riskPercentage: 100,
      riskLevel: 'Critical' as const
    };
  }

  // Workload demand ratio = Estimated hours / Available days
  const demandRatio = estimatedHours / Math.max(0.5, diffDays);
  
  // Priority score base: scale days linearly (fewer days -> higher priority)
  let scoreBase = Math.max(0, 100 - diffDays * 10);
  
  // Add weight for estimated workload complexity
  scoreBase += demandRatio * 15;
  const score = Math.min(100, Math.round(scoreBase));

  // Risk predictor percentage
  const riskPercentage = Math.min(100, Math.round((estimatedHours / (diffDays * 8)) * 100));
  
  let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (riskPercentage > 85 || diffDays <= 1) {
    riskLevel = 'Critical';
  } else if (riskPercentage > 60 || diffDays <= 2) {
    riskLevel = 'High';
  } else if (riskPercentage > 30 || diffDays <= 4) {
    riskLevel = 'Medium';
  }

  return { score, riskPercentage, riskLevel };
};

export const useAppStore = create<AppState>((set, get) => {
  // Load initial local states
  const isClient = typeof window !== 'undefined';
  const getLocal = (key: string, def: any, scoped = true, userDisplayName?: string) => {
    if (!isClient) return def;
    let displayName = userDisplayName;
    if (scoped && !displayName) {
      try {
        displayName = get()?.currentUser?.displayName;
      } catch (e) {
        // silent
      }
    }
    const finalKey = (scoped && displayName) ? `${key}_${displayName}` : key;
    const stored = localStorage.getItem(finalKey);
    try {
      return stored ? JSON.parse(stored) : def;
    } catch {
      return def;
    }
  };

  const initialUser = getLocal('nl_user', null, false);
  const userDisplayName = initialUser?.displayName;

  const initialTasks = initialUser ? getLocal('nl_tasks', [], true, userDisplayName) : [];
  const initialHabits = initialUser ? getLocal('nl_habits', [], true, userDisplayName) : [];
  const initialReports = initialUser ? getLocal('nl_reports', [], true, userDisplayName) : [];
  
  const initialChat = initialUser ? getLocal('nl_chat', [
    {
      id: 'msg-1',
      sender: 'coach',
      text: "Hi! I'm your friendly NeverLate AI Coach. There are so many ways we can interact! Whether you're completely new here or already know your way around, I can suggest optimal tools, help you manage tight deadlines, and guide you with focus strategies. How are you doing today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ], true, userDisplayName) : [];

  const initialSessions = initialUser ? getLocal('nl_chat_sessions', [], true, userDisplayName) : [];
  let seededSessions = initialSessions;
  let seededActiveId = initialUser ? getLocal('nl_active_session_id', null, true, userDisplayName) : null;
  
  if (seededSessions.length === 0 && initialUser) {
    const defaultSession = {
      id: 'session-default',
      title: 'Anti-Procrastination Welcome',
      messages: initialChat.length > 0 ? initialChat : [
        {
          id: 'msg-1',
          sender: 'coach' as const,
          text: "Hi! I'm your friendly NeverLate AI Coach. There are so many ways we can interact! Whether you're completely new here or already know your way around, I can suggest optimal tools, help you manage tight deadlines, and guide you with focus strategies. How are you doing today?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      createdAt: new Date().toLocaleDateString()
    };
    seededSessions = [defaultSession];
    seededActiveId = 'session-default';
  }

  if (seededSessions.length > 0 && !seededActiveId) {
    seededActiveId = seededSessions[0].id;
  }

  const initialTheme = getLocal('nl_theme', 'dark', false);
  const initialFocusHours = initialUser ? getLocal('nl_total_focus_hours', 0, true, userDisplayName) : 0;

  const saveLocal = (key: string, val: any, scoped = true) => {
    if (isClient) {
      let user = null;
      try {
        user = get()?.currentUser;
      } catch (e) {
        // silent
      }
      const finalKey = (scoped && user) ? `${key}_${user.displayName}` : key;
      localStorage.setItem(finalKey, JSON.stringify(val));

      // Asynchronously back up to the server
      if (scoped && user && user.email) {
        fetch('/api/user/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            key: key,
            data: val
          })
        }).catch(err => console.warn('[NeverLate] Sync backup failed:', err));
      }
    }
  };

  return {
    currentUser: initialUser,
    tasks: initialTasks,
    habits: initialHabits,
    reports: initialReports,
    chatHistory: initialChat,
    chatSessions: seededSessions,
    activeSessionId: seededActiveId,
    theme: initialTheme,
    activeTab: 'home',
    setActiveTab: (tab) => set({ activeTab: tab }),
    focusSession: {
      isActive: false,
      isPaused: false,
      timeLeft: 1500,
      duration: 1500,
      mode: 'work',
      completedSessions: 0,
      totalFocusHours: initialFocusHours,
      focusedTaskId: null
    },
    isLoading: false,

    celebration: null,

    clearCelebration: () => set({ celebration: null }),

    updateProfile: (profile) => set((state) => {
      if (!state.currentUser) return {};
      const oldName = state.currentUser.displayName;
      const newName = profile.displayName;
      
      if (oldName !== newName && isClient) {
        const keysToMigrate = ['nl_tasks', 'nl_habits', 'nl_reports', 'nl_chat', 'nl_chat_sessions', 'nl_active_session_id', 'nl_total_focus_hours'];
        keysToMigrate.forEach(k => {
          const val = localStorage.getItem(`${k}_${oldName}`);
          if (val !== null) {
            localStorage.setItem(`${k}_${newName}`, val);
            localStorage.removeItem(`${k}_${oldName}`);
          }
        });
      }

      const updatedUser = {
        ...state.currentUser,
        displayName: profile.displayName,
        nickname: profile.nickname,
        profilePicture: profile.profilePicture
      };
      saveLocal('nl_user', updatedUser, false);
      
      const allUsers = getLocal('nl_all_users', [], false);
      const updatedAllUsers = allUsers.map((u: any) => u.email === updatedUser.email ? { ...u, ...profile } : u);
      saveLocal('nl_all_users', updatedAllUsers, false);

      return { currentUser: updatedUser };
    }),

    socialLogin: async (email, name, nickname, profilePicture) => {
      set({ isLoading: true });
      const user = { 
        uid: 'user-' + Date.now(), 
        email, 
        displayName: name, 
        nickname: nickname || name.split(' ')[0],
        profilePicture: profilePicture || '',
        xp: 120, 
        level: 1 
      };

      // Try fetching backup data from the server first
      let backupData: any = {};
      try {
        const response = await fetch(`/api/user/data?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          backupData = await response.json();
          console.log('[NeverLate] Successfully loaded cloud backup for:', email, backupData);
        }
      } catch (err) {
        console.warn('[NeverLate] Could not load cloud backup:', err);
      }

      const displayName = name;

      // Populate localStorage with restored cloud items
      const keysToSync = [
        'nl_tasks', 'nl_habits', 'nl_reports', 'nl_chat', 
        'nl_chat_sessions', 'nl_active_session_id', 'nl_total_focus_hours'
      ];

      keysToSync.forEach(k => {
        if (backupData[k] !== undefined) {
          localStorage.setItem(`${k}_${displayName}`, JSON.stringify(backupData[k]));
        }
      });

      const loadedSessions = getLocal('nl_chat_sessions', [], true, displayName);
      let seededSessions = loadedSessions;
      let seededActiveId = getLocal('nl_active_session_id', null, true, displayName);
      const loadedChat = getLocal('nl_chat', [], true, displayName);

      if (seededSessions.length === 0) {
        const defaultSession = {
          id: 'session-default',
          title: 'Anti-Procrastination Welcome',
          messages: loadedChat.length > 0 ? loadedChat : [
            {
              id: 'msg-1',
              sender: 'coach' as const,
              text: "Hi! I'm your friendly NeverLate AI Coach. There are so many ways we can interact! Whether you're completely new here or already know your way around, I can suggest optimal tools, help you manage tight deadlines, and guide you with focus strategies. How are you doing today?",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ],
          createdAt: new Date().toLocaleDateString()
        };
        seededSessions = [defaultSession];
        seededActiveId = 'session-default';
      }
      if (seededSessions.length > 0 && !seededActiveId) {
        seededActiveId = seededSessions[0].id;
      }

      set({ 
        currentUser: user,
        tasks: getLocal('nl_tasks', [], true, displayName),
        habits: getLocal('nl_habits', [], true, displayName),
        reports: getLocal('nl_reports', [], true, displayName),
        chatHistory: loadedChat.length > 0 ? loadedChat : seededSessions[0].messages,
        chatSessions: seededSessions,
        activeSessionId: seededActiveId,
        focusSession: {
          ...get().focusSession,
          totalFocusHours: getLocal('nl_total_focus_hours', 0, true, displayName)
        },
        isLoading: false
      });
      saveLocal('nl_user', user, false);

      // Back up user details as well
      fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, key: 'nl_user', data: user })
      }).catch(err => console.warn('[NeverLate] Backup user details failed:', err));

      const allUsers = getLocal('nl_all_users', [], false);
      if (!allUsers.find((u: any) => u.email === email)) {
        saveLocal('nl_all_users', [...allUsers, user], false);
      }
    },

    login: (email, password) => {
      const allUsers = getLocal('nl_all_users', [], false);
      const storedUser = allUsers.find((u: any) => u.email === email && u.password === password);
      if (storedUser) {
        const loadedSessions = getLocal('nl_chat_sessions', [], true, storedUser.displayName);
        let seededSessions = loadedSessions;
        let seededActiveId = getLocal('nl_active_session_id', null, true, storedUser.displayName);
        const loadedChat = getLocal('nl_chat', [], true, storedUser.displayName);

        if (seededSessions.length === 0) {
          const defaultSession = {
            id: 'session-default',
            title: 'Anti-Procrastination Welcome',
            messages: loadedChat.length > 0 ? loadedChat : [
              {
                id: 'msg-1',
                sender: 'coach' as const,
                text: "Hi! I'm your friendly NeverLate AI Coach. There are so many ways we can interact! Whether you're completely new here or already know your way around, I can suggest optimal tools, help you manage tight deadlines, and guide you with focus strategies. How are you doing today?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ],
            createdAt: new Date().toLocaleDateString()
          };
          seededSessions = [defaultSession];
          seededActiveId = 'session-default';
        }
        if (seededSessions.length > 0 && !seededActiveId) {
          seededActiveId = seededSessions[0].id;
        }

        set({ 
          currentUser: storedUser,
          tasks: getLocal('nl_tasks', [], true, storedUser.displayName),
          habits: getLocal('nl_habits', [], true, storedUser.displayName),
          reports: getLocal('nl_reports', [], true, storedUser.displayName),
          chatHistory: loadedChat.length > 0 ? loadedChat : seededSessions[0].messages,
          chatSessions: seededSessions,
          activeSessionId: seededActiveId,
          focusSession: {
            ...get().focusSession,
            totalFocusHours: getLocal('nl_total_focus_hours', 0, true, storedUser.displayName)
          }
        });
        saveLocal('nl_user', storedUser, false);
        return true;
      }
      return false;
    },

    register: (email, name, password) => {
      const allUsers = getLocal('nl_all_users', [], false);
      if (allUsers.find((u: any) => u.email === email)) {
        return false;
      }

      const user = { 
        uid: 'user-' + Date.now(), 
        email, 
        displayName: name, 
        nickname: name.split(' ')[0],
        profilePicture: '',
        xp: 0, 
        level: 1,
        password
      };

      const defaultSession = {
        id: 'session-default',
        title: 'Anti-Procrastination Welcome',
        messages: [
          {
            id: 'msg-1',
            sender: 'coach' as const,
            text: "Hi! I'm your friendly NeverLate AI Coach. There are so many ways we can interact! Whether you're completely new here or already know your way around, I can suggest optimal tools, help you manage tight deadlines, and guide you with focus strategies. How are you doing today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        createdAt: new Date().toLocaleDateString()
      };

      set({ 
        currentUser: user,
        tasks: [],
        habits: [],
        reports: [],
        chatHistory: defaultSession.messages,
        chatSessions: [defaultSession],
        activeSessionId: 'session-default',
        focusSession: {
            isActive: false,
            isPaused: false,
            timeLeft: 1500,
            duration: 1500,
            mode: 'work',
            completedSessions: 0,
            totalFocusHours: 0,
            focusedTaskId: null
        }
      });

      saveLocal('nl_user', user, false);
      saveLocal('nl_all_users', [...allUsers, user], false);
      
      saveLocal('nl_tasks', [], true);
      saveLocal('nl_habits', [], true);
      saveLocal('nl_reports', [], true);
      saveLocal('nl_chat', defaultSession.messages, true);
      saveLocal('nl_chat_sessions', [defaultSession], true);
      saveLocal('nl_active_session_id', 'session-default', true);
      saveLocal('nl_total_focus_hours', 0, true);

      return true;
    },

    logout: () => {
      set({ 
        currentUser: null,
        tasks: [],
        habits: [],
        reports: [],
        chatHistory: [
          {
            id: 'msg-1',
            sender: 'coach',
            text: "Hi! I'm your friendly NeverLate AI Coach. There are so many ways we can interact! Whether you're completely new here or already know your way around, I can suggest optimal tools, help you manage tight deadlines, and guide you with focus strategies. How are you doing today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        focusSession: {
          isActive: false,
          isPaused: false,
          timeLeft: 1500,
          duration: 1500,
          mode: 'work',
          completedSessions: 0,
          totalFocusHours: 0,
          focusedTaskId: null
        }
      });
      if (isClient) {
        localStorage.removeItem('nl_user');
      }
    },

    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      saveLocal('nl_theme', nextTheme, false);
      return { theme: nextTheme };
    }),

    addTask: async (task) => {
      set({ isLoading: true });
      const { score, riskPercentage, riskLevel } = calculateSmartPriority(task.deadline, task.estimatedHours);
      
      const newTask: Task = {
        ...task,
        id: 'task-' + Date.now(),
        userId: get().currentUser?.uid || 'user-default',
        createdAt: new Date().toISOString(),
        completed: false,
        smartPriorityScore: score,
        riskLevel,
        riskPercentage
      };

      set((state) => {
        const nextTasks = [newTask, ...state.tasks];
        saveLocal('nl_tasks', nextTasks);
        return { tasks: nextTasks };
      });
      
      get().addXP(10);

      if (task.taskType !== 'other') {
        try {
          const res = await fetch('/api/ai/breakdown', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
          });
          const aiData = await res.json();
          if (aiData.breakdown || aiData.explanation) {
              get().setTaskBreakdown(newTask.id, aiData.breakdown, aiData.explanation);
          }
        } catch (err) {
          console.error('Failed to pre-fetch task breakdown:', err);
        }
      }
      set({ isLoading: false });
    },

    updateTask: (id, updated) => set((state) => {
      const nextTasks = state.tasks.map((t) => {
        if (t.id === id) {
          const merged = { ...t, ...updated };
          const { score, riskPercentage, riskLevel } = calculateSmartPriority(merged.deadline, merged.estimatedHours);
          return {
            ...merged,
            smartPriorityScore: score,
            riskPercentage,
            riskLevel
          };
        }
        return t;
      });
      saveLocal('nl_tasks', nextTasks);
      return { tasks: nextTasks };
    }),

    deleteTask: (id) => set((state) => {
      const nextTasks = state.tasks.filter((t) => t.id !== id);
      saveLocal('nl_tasks', nextTasks);
      return { tasks: nextTasks };
    }),

    toggleTask: (id) => set((state) => {
      let earnedXP = 0;
      let shouldCelebrate = false;
      const congratsMessages = [
        "Unstoppable! Task crushed!",
        "Magnificent work! You are on fire!",
        "Goal demolished! Keep up the momentum!",
        "Procrastination defeated! Absolute legend!",
        "Sensational execution! Leveling up!"
      ];
      const selectedMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];

      const nextTasks = state.tasks.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          earnedXP = nextCompleted ? 50 : -50;
          if (nextCompleted) {
            shouldCelebrate = true;
          }
          return { ...t, completed: nextCompleted };
        }
        return t;
      });

      saveLocal('nl_tasks', nextTasks);

      setTimeout(() => {
        if (earnedXP !== 0) get().addXP(earnedXP);
        if (shouldCelebrate) {
          set({
            celebration: {
              isActive: true,
              message: selectedMessage,
              taskId: id
            }
          });
        }
      }, 0);

      return { tasks: nextTasks };
    }),

    setTaskBreakdown: (id, breakdown, explanation) => set((state) => {
      const nextTasks = state.tasks.map((t) => 
        t.id === id ? { ...t, breakdown, priorityExplanation: explanation } : t
      );
      saveLocal('nl_tasks', nextTasks);
      return { tasks: nextTasks };
    }),

    addHabit: (name) => set((state) => {
      const newHabit: Habit = {
        id: 'habit-' + Date.now(),
        userId: state.currentUser?.uid || 'user-default',
        name,
        completedDates: [],
        streak: 0,
        createdAt: new Date().toISOString()
      };
      const nextHabits = [newHabit, ...state.habits];
      saveLocal('nl_habits', nextHabits);
      return { habits: nextHabits };
    }),

    toggleHabit: (id, dateStr) => set((state) => {
      let earnedXP = 0;
      const nextHabits = state.habits.map((h) => {
        if (h.id === id) {
          const index = h.completedDates.indexOf(dateStr);
          let nextDates = [...h.completedDates];
          let nextStreak = h.streak;

          if (index >= 0) {
            nextDates.splice(index, 1);
            nextStreak = Math.max(0, nextStreak - 1);
            earnedXP = -20;
          } else {
            nextDates.push(dateStr);
            nextStreak = nextStreak + 1;
            earnedXP = 20;
          }

          return { ...h, completedDates: nextDates, streak: nextStreak };
        }
        return h;
      });
      saveLocal('nl_habits', nextHabits);
      setTimeout(() => {
        if (earnedXP !== 0) get().addXP(earnedXP);
      }, 0);
      return { habits: nextHabits };
    }),

    deleteHabit: (id) => set((state) => {
      const nextHabits = state.habits.filter((h) => h.id !== id);
      saveLocal('nl_habits', nextHabits);
      return { habits: nextHabits };
    }),

    generateWeeklyReport: async () => {
      set({ isLoading: true });
      const currentTasks = get().tasks;
      const currentHours = get().focusSession.totalFocusHours;

      try {
        const res = await fetch('/api/ai/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: currentTasks, focusHours: currentHours })
        });
        
        if (res.ok) {
          const data = await res.json();
          const newReport: Report = {
            id: 'report-' + Date.now(),
            userId: get().currentUser?.uid || 'user-default',
            date: new Date().toISOString().split('T')[0],
            productivityScore: data.productivityScore || 75,
            completedTasksCount: currentTasks.filter(t => t.completed).length,
            overdueTasksCount: currentTasks.filter(t => !t.completed && new Date(t.deadline) < new Date()).length,
            focusHours: currentHours,
            summary: data.summary,
            recoveryPlan: Array.isArray(data.recoveryPlan) ? data.recoveryPlan.join('\n') : (data.recoveryPlan || ''),
            createdAt: new Date().toISOString()
          };

          set((state) => {
            const nextReports = [newReport, ...state.reports];
            saveLocal('nl_reports', nextReports);
            return { reports: nextReports, isLoading: false };
          });
          // Reward XP for compiling report
          get().addXP(30);
        } else {
          set({ isLoading: false });
        }
      } catch (err) {
        console.error('Failed to generate weekly report:', err);
        set({ isLoading: false });
      }
    },

    addChatMessage: (sender, text) => set((state) => {
      const newMsg: ChatMessage = {
        id: 'msg-' + Date.now(),
        sender,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const nextChat = [...state.chatHistory, newMsg];
      saveLocal('nl_chat', nextChat);

      // Sync into the active session
      const updatedSessions = state.chatSessions.map((s) => {
        if (s.id === state.activeSessionId) {
          let nextTitle = s.title;
          if ((s.title === 'New Coaching Session' || s.title === 'Anti-Procrastination Welcome') && sender === 'user') {
            nextTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
          }
          return {
            ...s,
            title: nextTitle,
            messages: [...s.messages, newMsg]
          };
        }
        return s;
      });
      saveLocal('nl_chat_sessions', updatedSessions);

      return { 
        chatHistory: nextChat,
        chatSessions: updatedSessions
      };
    }),

    clearChat: () => set((state) => {
      const nextChat = [
        {
          id: 'msg-init-' + Date.now(),
          sender: 'coach' as const,
          text: "NeverLate Coach back on duty! Let's conquer procrastination. What task are we tackling right now?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      saveLocal('nl_chat', nextChat);

      const updatedSessions = state.chatSessions.map((s) => {
        if (s.id === state.activeSessionId) {
          return {
            ...s,
            messages: nextChat
          };
        }
        return s;
      });
      saveLocal('nl_chat_sessions', updatedSessions);

      return { 
        chatHistory: nextChat,
        chatSessions: updatedSessions
      };
    }),

    createNewSession: () => set((state) => {
      const newId = 'session-' + Date.now();
      const newSession: ChatSession = {
        id: newId,
        title: 'New Coaching Session',
        messages: [
          {
            id: 'msg-init-' + Date.now(),
            sender: 'coach' as const,
            text: "NeverLate Coach back on duty! Let's conquer procrastination. What task are we tackling right now?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ],
        createdAt: new Date().toLocaleDateString()
      };
      const nextSessions = [newSession, ...state.chatSessions];
      saveLocal('nl_chat_sessions', nextSessions);
      saveLocal('nl_active_session_id', newId);
      saveLocal('nl_chat', newSession.messages);
      return {
        chatSessions: nextSessions,
        activeSessionId: newId,
        chatHistory: newSession.messages
      };
    }),

    selectSession: (id: string) => set((state) => {
      const sess = state.chatSessions.find(s => s.id === id);
      if (!sess) return {};
      saveLocal('nl_active_session_id', id);
      saveLocal('nl_chat', sess.messages);
      return {
        activeSessionId: id,
        chatHistory: sess.messages
      };
    }),

    deleteSession: (id: string) => set((state) => {
      const nextSessions = state.chatSessions.filter(s => s.id !== id);
      let nextActiveId = state.activeSessionId;
      let nextChat = state.chatHistory;
      
      if (nextActiveId === id) {
        if (nextSessions.length > 0) {
          nextActiveId = nextSessions[0].id;
          nextChat = nextSessions[0].messages;
        } else {
          const defId = 'session-default';
          const defaultSession: ChatSession = {
            id: defId,
            title: 'Anti-Procrastination Welcome',
            messages: [
              {
                id: 'msg-1',
                sender: 'coach' as const,
                text: "Hi! I'm your friendly NeverLate AI Coach. There are so many ways we can interact! Whether you're completely new here or already know your way around, I can suggest optimal tools, help you manage tight deadlines, and guide you with focus strategies. How are you doing today?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ],
            createdAt: new Date().toLocaleDateString()
          };
          nextSessions.push(defaultSession);
          nextActiveId = defId;
          nextChat = defaultSession.messages;
        }
      }
      
      saveLocal('nl_chat_sessions', nextSessions);
      saveLocal('nl_active_session_id', nextActiveId);
      saveLocal('nl_chat', nextChat);
      return {
        chatSessions: nextSessions,
        activeSessionId: nextActiveId,
        chatHistory: nextChat
      };
    }),

    startFocus: (durationMinutes, taskId) => set((state) => {
      const totalSecs = durationMinutes * 60;
      return {
        focusSession: {
          ...state.focusSession,
          isActive: true,
          isPaused: false,
          timeLeft: totalSecs,
          duration: totalSecs,
          mode: 'work',
          focusedTaskId: taskId || null
        }
      };
    }),

    tickFocus: () => set((state) => {
      const session = state.focusSession;
      if (!session.isActive || session.isPaused) return {};

      if (session.timeLeft <= 1) {
        return {
          focusSession: {
            ...session,
            timeLeft: 0,
            isActive: false,
            isPaused: false
          }
        };
      }

      return {
        focusSession: {
          ...session,
          timeLeft: session.timeLeft - 1
        }
      };
    }),

    stopFocus: () => set((state) => ({
      focusSession: {
        ...state.focusSession,
        isActive: true,
        isPaused: true
      }
    })),

    resumeFocus: () => set((state) => ({
      focusSession: {
        ...state.focusSession,
        isActive: true,
        isPaused: false
      }
    })),

    resetFocus: () => set((state) => ({
      focusSession: {
        ...state.focusSession,
        isActive: false,
        isPaused: false,
        timeLeft: state.focusSession.duration,
        focusedTaskId: null
      }
    })),

    completeFocusSession: () => set((state) => {
      const session = state.focusSession;
      const isWork = session.mode === 'work';
      const hoursEarned = isWork ? Number((session.duration / 3600).toFixed(2)) : 0;
      const nextFocusHours = Number((session.totalFocusHours + hoursEarned).toFixed(2));
      saveLocal('nl_total_focus_hours', nextFocusHours);

      const nextMode = isWork ? 'break' : 'work';
      const nextDuration = nextMode === 'break' ? 300 : 1500; // 5-min break or 25-min work

      // Award +100 XP for focused block completion
      setTimeout(() => {
        get().addXP(isWork ? 100 : 20);
      }, 0);

      return {
        focusSession: {
          ...session,
          isActive: false,
          isPaused: false,
          timeLeft: nextDuration,
          duration: nextDuration,
          mode: nextMode,
          completedSessions: isWork ? session.completedSessions + 1 : session.completedSessions,
          totalFocusHours: nextFocusHours,
          focusedTaskId: null
        }
      };
    }),

    addXP: (amount) => set((state) => {
      if (!state.currentUser) return {};
      let nextXP = Math.max(0, state.currentUser.xp + amount);
      // Math: Level = Math.floor(xp / 200) + 1
      const nextLevel = Math.floor(nextXP / 200) + 1;
      
      const updatedUser = {
        ...state.currentUser,
        xp: nextXP,
        level: nextLevel
      };
      saveLocal('nl_user', updatedUser);
      return { currentUser: updatedUser };
    })
  };
});
