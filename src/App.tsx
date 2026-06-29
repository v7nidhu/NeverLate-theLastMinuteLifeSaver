// File: src/App.tsx

import { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Calendar, BarChart3, Clock, Sparkles, LogOut, CheckCircle, 
  HelpCircle, UserPlus, LogIn, ChevronRight, MessageSquare, ListTodo, Flame,
  Menu, X, Sliders, User, Image as ImageIcon, BadgeCheck, Award, Check, RotateCcw, Camera, Settings, Globe, Upload,
  Bell, BellOff, Trash, Eye, EyeOff, ChevronDown, ChevronUp, MessageCircle
} from 'lucide-react';

import UserProfileHeader from './components/UserProfileHeader';
import ThemeToggle from './components/ThemeToggle';
import FocusTimer from './components/FocusTimer';
import HabitTracker from './components/HabitTracker';
import AICoachPanel from './components/AICoachPanel';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import CalendarView from './components/CalendarView';
import DailyPlanner from './components/DailyPlanner';
import { sendNotification } from './lib/notifications';
import TaskListItem from './components/TaskListItem';
import TaskForm from './components/TaskForm';
import Navigation from './components/Navigation';

export default function App() {
  const { 
    theme, 
    currentUser, 
    login, 
    socialLogin, 
    register, 
    logout, 
    tasks, 
    updateProfile, 
    celebration, 
    clearCelebration, 
    startFocus, 
    stopFocus, 
    tickFocus, 
    focusSession,
    chatSessions,
    activeSessionId,
    createNewSession,
    selectSession,
    deleteSession,
    addChatMessage,
    chatHistory,
    activeTab,
    setActiveTab
  } = useAppStore();

  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed' | 'critical'>('all');
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const [otherTaskTitle, setOtherTaskTitle] = useState('');
  const [otherTaskDue, setOtherTaskDue] = useState('');

  const [headerMins, setHeaderMins] = useState(25);

  const [isCoachingHubExpanded, setIsCoachingHubExpanded] = useState(true);

  const handleAskCoachAboutTask = async (title: string, deadline: string) => {
    setActiveTab('chat');
    setIsSidebarOpen(false);
    
    const promptText = `Can you help me break down and work on my task "${title}" (due ${deadline})? Suggest a tactical step-by-step strategy.`;
    addChatMessage('user', promptText);
    
    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatHistory, { id: 'new', sender: 'user', text: promptText, timestamp: '' }],
          tasks: tasks
        })
      });
      if (response.ok) {
        const data = await response.json();
        addChatMessage('coach', data.text || "Let's chunk this task down into bite-sized actionable milestones.");
      } else {
        addChatMessage('coach', "I see that deadline coming up! Break it down into three simple 15-minute segments and let's start the first segment right now.");
      }
    } catch (err) {
      console.error(err);
      addChatMessage('coach', "Brief interruption! Start with a tiny, five-minute introductory action on this task to build momentum.");
    }
  };

  const handleSuggestTaskFromSidebar = async () => {
    setActiveTab('chat');
    setIsSidebarOpen(false);
    
    const promptText = "Can you analyze my current active tasks and suggest which task I should work on right now, considering their deadlines, estimated hours, and risk levels? Please choose from my list and provide a supportive plan.";
    addChatMessage('user', promptText);
    
    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatHistory, { id: 'new', sender: 'user', text: promptText, timestamp: '' }],
          tasks: tasks
        })
      });
      if (response.ok) {
        const data = await response.json();
        addChatMessage('coach', data.text || "I've scanned your tasks! Let's focus on your highest risk deadline first.");
      } else {
        addChatMessage('coach', "I couldn't access your task list right now, but looking at your dashboard, starting on your most imminent deadline is the smartest move!");
      }
    } catch (err) {
      console.error(err);
      addChatMessage('coach', "A brief network gap occurred! Pick your highest-risk task from the taskbar and start on it now.");
    }
  };

  // Global Pomodoro Ticker that continues working when user switches pages/tabs
  useEffect(() => {
    let timerId: any = null;
    if (focusSession?.isActive) {
      timerId = setInterval(() => {
        tickFocus();
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [focusSession?.isActive, tickFocus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Sync theme to root html element class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sidebar & Google Modal States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Profile Editor Form State
  const [editName, setEditName] = useState('');
  const [editPic, setEditPic] = useState('');

  // Sync profile editing states when user changes
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.displayName || '');
      setEditPic(currentUser.profilePicture || '');
    } else {
      setEditName('');
      setEditPic('');
    }
  }, [currentUser]);

  // Google Sign-In postMessage Event Listener
  useEffect(() => {
    const handleGoogleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_GOOGLE_SUCCESS') {
        const { email, name } = event.data;
        await socialLogin(email, name, name.split(' ')[0], '');
        showCustomToast("Google Sign-In", `Welcome back, ${name}! Your cloud backup has been restored.`);
        setShowGoogleModal(false);
      }
    };
    window.addEventListener('message', handleGoogleMessage);
    return () => window.removeEventListener('message', handleGoogleMessage);
  }, [socialLogin]);

  const handleGoogleSignInClick = () => {
    const width = 450;
    const height = 580;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      '/google-signin.html',
      'GoogleSignIn',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );
  };

  // Auth States
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'forgot-sent'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const passwordValid = {
      eightChars: authPassword.length >= 8,
      hasNumbers: /\d/.test(authPassword),
      hasAlphabets: /[a-zA-Z]/.test(authPassword)
  };
  const isRegisterDisabled = !(passwordValid.eightChars && passwordValid.hasNumbers && passwordValid.hasAlphabets);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotWarning, setForgotWarning] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const handleForgotSubmit = () => {
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setForgotWarning(true);
    }, 1500); // Simulate network delay
  };

  const themeDark = theme === 'dark';


  // Notifications State & Logic
  const [notificationsPermission, setNotificationsPermission] = useState<NotificationPermission>('default');
  const [activeNotificationAlert, setActiveNotificationAlert] = useState<{
    id: string;
    taskTitle: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    timeRemainingStr: string;
    aiCoachTip: string;
    taskId: string;
  } | null>(null);
  const [customToast, setCustomToast] = useState<{ title: string; desc: string } | null>(null);

  const showCustomToast = (title: string, desc: string) => {
    setCustomToast({ title, desc });
    setTimeout(() => {
      setCustomToast((current) => current?.title === title ? null : current);
    }, 4500);
  };

  // Sound chime synthesizer
  const playNotificationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(523.25, now, 0.5);        // C5
      playTone(659.25, now + 0.1, 0.5);  // E5
      playTone(783.99, now + 0.2, 0.7);  // G5
    } catch (e) {
      console.error("Audio Notification Chime failed", e);
    }
  };

  // Check initial browser notification state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsPermission(Notification.permission);
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) {
      showCustomToast("Browser Limit", "This device/browser does not support device alerts.");
      return;
    }
    if (Notification.permission === 'granted') {
      playNotificationChime();
      showCustomToast("System Active", "Notifications are active and scanning risky deadlines!");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsPermission(permission);
    if (permission === 'granted') {
      playNotificationChime();
      try {
        new Notification("NeverLate Active", {
          body: "Smart notifications enabled! You will receive high-priority alerts for tight deadlines.",
        });
      } catch (err) {
        console.error("Native browser Notification initial trigger failed:", err);
      }
      showCustomToast("Alerts Active", "NeverLate device notifications enabled successfully!");
    } else {
      showCustomToast("Alerts Blocked", "Please enable notifications in browser permissions to receive alerts.");
    }
  };

  // Local storage helpers for notified list
  const getNotifiedAlerts = (): string[] => {
    try {
      const data = localStorage.getItem('nl_notified_alerts');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };
  const saveNotifiedAlerts = (alerts: string[]) => {
    try {
      localStorage.setItem('nl_notified_alerts', JSON.stringify(alerts));
    } catch {}
  };

  // Background monitor tick effect
  useEffect(() => {
    if (!currentUser) return;
    const checkDeadlines = () => {
      const now = new Date();
      const notified = getNotifiedAlerts();
      let updatedNotified = [...notified];
      let didTriggerAlert = false;

      tasks.forEach((task) => {
        if (task.completed) return;
        const deadlineDate = new Date(task.deadline);
        const diffTime = deadlineDate.getTime() - now.getTime();
        const diffHours = diffTime / (1000 * 60 * 60);

        if (diffHours <= 0) return; // overdue is handled by standard views

        let triggerTier: string | null = null;
        let alertMessage = '';
        let remainingStr = '';

        if (task.riskLevel === 'Critical') {
          if (diffHours <= 2) {
            triggerTier = `${task.id}-critical-final`;
            remainingStr = `${Math.round(diffHours * 60)} mins remaining!`;
            alertMessage = `TIGHT MARGIN ALERT! "${task.title}" is due in ${remainingStr}. Focus instantly!`;
          } else if (diffHours <= 24) {
            triggerTier = `${task.id}-critical-warning`;
            remainingStr = `${Math.round(diffHours)} hrs remaining`;
            alertMessage = `Critical risk: "${task.title}" is due in ${remainingStr}. Plan your work block now.`;
          }
        } else if (task.riskLevel === 'High') {
          if (diffHours <= 3) {
            triggerTier = `${task.id}-high-final`;
            remainingStr = `${Math.round(diffHours)} hrs remaining`;
            alertMessage = `High risk final warning: "${task.title}" is due soon. Open details now.`;
          } else if (diffHours <= 36) {
            triggerTier = `${task.id}-high-warning`;
            remainingStr = `${Math.round(diffHours)} hrs remaining`;
            alertMessage = `High priority: "${task.title}" due in ${remainingStr}. Start subtasks now.`;
          }
        } else if (task.riskLevel === 'Medium' && diffHours <= 12) {
          triggerTier = `${task.id}-medium-warning`;
          remainingStr = `${Math.round(diffHours)} hrs remaining`;
          alertMessage = `Task Reminder: "${task.title}" is due in ${remainingStr}. Maintain progress.`;
        } else if (task.riskLevel === 'Low' && diffHours <= 6) {
          triggerTier = `${task.id}-low-warning`;
          remainingStr = `${Math.round(diffHours)} hrs remaining`;
          alertMessage = `Gentle reminder: "${task.title}" is due in ${remainingStr}.`;
        }

        if (triggerTier && !notified.includes(triggerTier)) {
          updatedNotified.push(triggerTier);
          didTriggerAlert = true;

          if (Notification.permission === 'granted') {
            try {
              new Notification(`NeverLate: ${task.riskLevel} Risk Alert!`, {
                body: alertMessage,
                tag: task.id,
                requireInteraction: true
              });
            } catch (err) {
              console.error(err);
            }
          }

          const aiCoachTips: Record<string, string[]> = {
            Critical: [
              "Shut down all other tabs immediately. Let's do a 25-minute extreme focus block right now.",
              "Do not aim for perfection; aim for a functional submission first! Perfectionism causes procrastination.",
              "This is the critical margin. Execute subtask 1 first to break the cold-start resistance."
            ],
            High: [
              "Focus on high-value, easy wins first. Get the skeleton of this task written.",
              "Place your device on DND and set a 25-minute Pomodoro timer.",
              "Don't worry about the whole mountain. Just focus on taking the very next step."
            ],
            Medium: [
              "We have comfortable time, but let's avoid a late-night rush. Spend 15 minutes drafting now.",
              "A minor effort now pays compounding dividends of sleep later tonight. Let's do it!"
            ],
            Low: [
              "Clear this quick task from your mental space so you can focus 100% of your energy on critical high-risk blockages.",
              "Slam this out of your queue and bank another sweet +50 XP!"
            ]
          };

          const tips = aiCoachTips[task.riskLevel] || aiCoachTips['Low'];
          const randomTip = tips[Math.floor(Math.random() * tips.length)];

          setActiveNotificationAlert({
            id: triggerTier,
            taskTitle: task.title,
            riskLevel: task.riskLevel,
            timeRemainingStr: remainingStr,
            aiCoachTip: randomTip,
            taskId: task.id
          });
          sendNotification(task.title, `Deadline Alert: ${remainingStr}`);

          playNotificationChime();
        }
      });

      if (didTriggerAlert) {
        saveNotifiedAlerts(updatedNotified);
      }
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 15000);
    return () => clearInterval(interval);
  }, [tasks, currentUser]);

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditPic(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuthSubmit = (e: any) => {
    e.preventDefault();
    setPasswordError(null);
    setLoginError(null);
    
    if (isAuthMode === 'login') {
      if (!login(authEmail, authPassword)) {
        setLoginError("Wrong password.");
        return;
      }
    } else {
      const errors = [];
      if (authPassword.length < 8) errors.push("At least 8 characters");
      if (!/[a-zA-Z]/.test(authPassword)) errors.push("Alphabets");
      if (!/\d/.test(authPassword)) errors.push("Numbers");
      
      if (errors.length > 0) {
        setPasswordError(`Password needs: ${errors.join(', ')}`);
        return;
      }
      if (!register(authEmail, authName, authPassword)) {
        alert("This email has already been registered.");
        return;
      }
    }
    setShowGoogleModal(false);
  };

  const handleGoogleLogin = () => {
    socialLogin('nidhiverma777777@gmail.com', 'Nidhi Verma', 'Nidh', '');
    setShowGoogleModal(false);
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    if (t.taskType === 'other') return false; // other compartment
    if (taskFilter === 'active') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    if (taskFilter === 'critical') return !t.completed && (t.riskLevel === 'Critical' || t.riskLevel === 'High');
    return true; // all
  });

  // Priority/Risk-wise sorting
  const getRiskWeight = (risk: string) => {
    switch (risk) {
      case 'Critical': return 4;
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Keep incomplete tasks at the top, completed at the bottom
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // Most risky level at the top
    const rA = getRiskWeight(a.riskLevel);
    const rB = getRiskWeight(b.riskLevel);
    if (rA !== rB) {
      return rB - rA;
    }
    // Highest smart priority score next
    if (b.smartPriorityScore !== a.smartPriorityScore) {
      return b.smartPriorityScore - a.smartPriorityScore;
    }
    // Closest deadline next (earliest date first)
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div className={`min-h-screen transition-all duration-300 pb-12 lg:pb-0 overflow-x-hidden relative ${
      themeDark
        ? 'bg-[#05030D] text-white'
        : 'bg-gradient-to-b from-[#F7F4FF] via-[#F1EBFF] to-[#ECE6FF] text-[#2A1952]'
    }`}>
      {/* Premium Ambient Arc and Leakage Glow System */}
      {themeDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Giant Light Arc behind Header/Hero */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[320px] bg-gradient-to-b from-white/20 via-[#E6D6FF]/12 to-[#B98BFF]/5 blur-[120px] rounded-b-[1000px] opacity-30 pointer-events-none" />
          
          {/* Subtle leakage spotlights */}
          <div className="absolute top-[15%] left-[5%] w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(142,95,255,0.12)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute top-[35%] right-[5%] w-[550px] h-[550px] bg-[radial-gradient(circle,rgba(180,130,255,0.08)_0%,transparent_70%)] pointer-events-none" />
        </div>
      )}
      
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} themeDark={themeDark} />

      <div className="lg:ml-20">
        {/* Upper Navigation Header */}
        <header className={`sticky top-0 z-40 transition-all border-b relative z-10 ${
          themeDark
            ? 'bg-[#090613]/85 border-white/[0.08] backdrop-blur-md text-white'
            : 'bg-white/70 border-purple-200/50 backdrop-blur-md text-[#2A1952]'
        }`}>
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              {/* Sidebar toggle */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex-shrink-0 ${
                  themeDark
                    ? 'bg-white/[0.04] border-white/[0.08] text-purple-300 hover:text-white'
                    : 'bg-white border-purple-200/60 text-purple-700 hover:bg-purple-50'
                }`}
                title="Open Sidebar Profile Editor"
              >
                <Menu className="w-3.5 h-3.5 sm:w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div 
                  className={`p-1 sm:p-1.5 rounded-xl transition-all duration-300 flex-shrink-0 ${
                    themeDark 
                      ? 'bg-purple-600/35 text-purple-300 border border-purple-400/50' 
                      : 'bg-purple-100 text-purple-800 border border-purple-300/60'
                  }`}
                >
                  <Clock className="w-4 h-4 sm:w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[14px] sm:text-base font-black tracking-tight text-purple-500 dark:text-purple-400 transition-colors duration-200 whitespace-nowrap leading-none">
                    NeverLate
                  </h1>
                  <p 
                    className={`text-[9.5px] font-mono leading-none tracking-widest font-bold whitespace-nowrap mt-0.5 ${themeDark ? 'text-[#A89FC9]' : 'text-[#8575B8]'}`}
                  >
                    THE LAST MINUTE LIFE SAVER
                  </p>
                </div>
              </div>
            </div>

            {/* Header Taskbar Focus Controller */}


            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <ThemeToggle />
              
              {/* Login / Logout button */}
              <button
                onClick={() => currentUser ? setShowLogoutConfirm(true) : setShowGoogleModal(true)}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${
                  themeDark
                    ? 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                    : 'bg-white border-purple-100 text-gray-500 hover:text-purple-600'
                }`}
                title={currentUser ? "Logout" : "Sign In"}
              >
                {currentUser ? (
                  <LogOut className="w-3.5 h-3.5 sm:w-4 h-4" />
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 sm:w-4 h-4 text-purple-500" />
                    <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap hidden md:inline">Sign in to sync data</span>
                    <span className="text-[10px] font-semibold whitespace-nowrap md:hidden">Sign In</span>
                  </>
                )}
              </button>

              {/* Logout Confirmation Modal */}
              <AnimatePresence>
                {showLogoutConfirm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowLogoutConfirm(false)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`w-full max-w-xs p-6 rounded-3xl relative z-10 ${
                        themeDark ? 'bg-[#0f0f12] border border-purple-900/30' : 'bg-white'
                      }`}
                    >
                      <h3 className={`text-lg font-bold mb-4 ${themeDark ? 'text-white' : 'text-gray-900'}`}>Confirm Logout</h3>
                      <p className={`text-sm mb-6 ${themeDark ? 'text-gray-400' : 'text-gray-600'}`}>Do you want to log out?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowLogoutConfirm(false)}
                          className={`flex-1 py-2 rounded-xl font-bold ${
                            themeDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            logout();
                            setShowLogoutConfirm(false);
                          }}
                          className="flex-1 py-2 rounded-xl font-bold bg-red-500 text-white"
                        >
                          Log out
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {currentUser && (
                <button
                  onClick={handleToggleNotifications}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative ${
                    notificationsPermission === 'granted'
                      ? themeDark
                        ? 'bg-purple-950/20 border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30'
                        : 'bg-purple-50 border-purple-200 text-purple-600 hover:text-purple-700'
                      : themeDark
                      ? 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08]'
                      : 'bg-white border-purple-100 text-gray-500 hover:text-purple-600'
                  }`}
                  title={notificationsPermission === 'granted' ? 'Device Notifications Active' : 'Enable Device Notifications'}
                >
                  {notificationsPermission === 'granted' ? (
                    <div className="relative">
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <Bell className="w-4 h-4 text-purple-400" />
                    </div>
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
          {activeTab === 'home' && (
            <div className="space-y-6">
              <UserProfileHeader />
              <div 
                onClick={() => setActiveTab('chat')}
                className={`p-5 rounded-2xl border relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[110px] transition-all duration-300 hover:scale-[1.01] hover:shadow-lg cursor-pointer group ${
                  themeDark 
                    ? 'bg-gradient-to-r from-purple-900/30 to-indigo-900/20 border-purple-500/20 hover:border-purple-500/40' 
                    : 'bg-pink-50 border-pink-200 hover:border-pink-300'
                }`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
                  themeDark ? 'bg-purple-500/10' : 'bg-pink-400/20'
                }`} />
                <div className="relative z-10">
                  <h2 className={`text-base font-black tracking-tight mt-1.5 flex items-center gap-1.5 ${themeDark ? 'text-purple-300' : 'text-purple-950 font-extrabold'}`}>
                    You're on a wave of productivity! <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
                  </h2>
                  <p className={`text-xs mt-1 max-w-md ${themeDark ? 'text-[#B4ACC9]' : 'text-pink-900/80 font-medium'}`}>
                    NeverLate coordinates with your cognitive habits in real-time. Tap anywhere to open the AI Coach, or use quick shortcuts below.
                  </p>
                </div>

              </div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* 75% Column: Core Sprint Tasks */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${themeDark ? 'text-purple-300' : 'text-purple-900'}`}>
                        Core Sprint Tasks
                      </h3>
                      <p className="text-[10px] opacity-65" style={{ fontSize: '11px' }}>Structured focus & cognitive estimation blocks</p>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${themeDark ? 'bg-purple-950/40 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                      {sortedTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setEditTaskId(null);
                      setShowTaskForm(true);
                    }}
                    className={`w-full py-3 px-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${
                      themeDark
                        ? 'border-purple-900/50 bg-purple-900/10 text-purple-300 hover:border-purple-500/50 hover:bg-purple-900/20'
                        : 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-300 hover:bg-purple-100'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Add New Task</span>
                  </button>

                  <div className="space-y-4">
                    {sortedTasks.map((task) => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        onEdit={(id) => {
                          setEditTaskId(id);
                          setShowTaskForm(true);
                        }}
                      />
                    ))}
                    {sortedTasks.length === 0 && (
                      <div className="text-center py-10 text-gray-500 text-xs border border-dashed border-purple-500/10 rounded-2xl">
                        No active core sprint tasks. Click above to create one.
                      </div>
                    )}
                  </div>
                </div>

                {/* 25% Column: Other Tasks */}
                <div className="lg:col-span-1">
                  <div className={`p-4 rounded-2xl border ${
                    themeDark 
                      ? 'bg-[#121020]/30 border-purple-900/15' 
                      : 'bg-white border-purple-100 shadow-[0_4px_20px_rgba(122,87,248,0.02)]'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${themeDark ? 'text-purple-300' : 'text-purple-900'}`}>
                          Other Tasks
                        </h3>
                        <p className="text-[10px] opacity-65 font-medium" style={{ fontSize: '12px' }}>Quick lists & reminders</p>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${themeDark ? 'bg-purple-950/40 text-purple-300' : 'bg-purple-50 text-purple-700'}`}>
                        {tasks.filter((t) => t.taskType === 'other').length}
                      </span>
                    </div>

                    {/* Inline Quick Add form */}
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!otherTaskTitle.trim()) return;
                        
                        const addTaskAction = useAppStore.getState().addTask;
                        await addTaskAction({
                          title: otherTaskTitle.trim(),
                          description: 'Quick reminder to-do task',
                          deadline: otherTaskDue.trim() || 'Today',
                          estimatedHours: 0,
                          category: 'Other',
                          completed: false,
                          taskType: 'other'
                        });

                        setOtherTaskTitle('');
                        setOtherTaskDue('');
                      }}
                      className="space-y-2 mb-4"
                    >
                      <input
                        type="text"
                        placeholder="Add simple task (e.g. Pay bill)..."
                        value={otherTaskTitle}
                        onChange={(e: any) => setOtherTaskTitle(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                          themeDark
                            ? 'bg-[#0b0a12]/60 border-purple-900/40 focus:border-purple-500 text-white placeholder-gray-500'
                            : 'bg-purple-50/50 border-purple-200 focus:border-purple-300 text-purple-950 font-semibold placeholder-purple-700/80'
                        }`}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Due (e.g. 5:00 PM)"
                          value={otherTaskDue}
                          onChange={(e: any) => setOtherTaskDue(e.target.value)}
                          className={`flex-1 px-3 py-1.5 text-xs rounded-xl border outline-none transition-all ${
                            themeDark
                              ? 'bg-[#0b0a12]/60 border-purple-900/40 focus:border-purple-500 text-white placeholder-gray-500'
                              : 'bg-purple-50/50 border-purple-200 focus:border-purple-300 text-purple-950 font-semibold placeholder-purple-700/80'
                          }`}
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-[#c27aff] hover:bg-[#b05cff] rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="text-white" style={{ color: '#ffffff' }}>Add</span>
                        </button>
                      </div>
                    </form>

                    {/* Other tasks list */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {tasks.filter((t) => t.taskType === 'other').map((task) => (
                        <div
                          key={task.id}
                          style={{ fontSize: '11px' }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                            task.completed
                              ? 'opacity-60 bg-black/5 border-transparent'
                              : themeDark
                              ? 'bg-purple-950/10 border-purple-500/10'
                              : 'bg-purple-50/30 border-purple-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => {
                                const toggleTaskAction = useAppStore.getState().toggleTask;
                                toggleTaskAction(task.id);
                              }}
                              className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-3.5 h-3.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <p 
                                style={{ fontSize: '11px' }}
                                className={`text-xs font-semibold truncate ${
                                  task.completed 
                                    ? 'line-through text-gray-500 font-normal' 
                                    : themeDark ? 'text-gray-200' : 'text-purple-950'
                                }`}
                              >
                                {task.title}
                              </p>
                              {task.deadline && (
                                <span className="text-[9px] font-mono text-purple-400 block mt-0.5">
                                  🕒 {task.deadline}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              const deleteTaskAction = useAppStore.getState().deleteTask;
                              deleteTaskAction(task.id);
                            }}
                            className="text-gray-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/15 cursor-pointer shrink-0 transition-all"
                            title="Delete simple task"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {tasks.filter((t) => t.taskType === 'other').length === 0 && (
                        <div className="text-center py-6 text-gray-500 text-[10px] border border-dashed border-purple-500/10 rounded-xl">
                          No simple to-do reminders.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <AnimatePresence>
                {showTaskForm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowTaskForm(false)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`w-full max-w-md p-6 rounded-3xl relative z-10 ${
                        themeDark ? 'bg-[#0f0f12] border border-purple-900/30' : 'bg-white'
                      }`}
                    >
                      <TaskForm onClose={() => setShowTaskForm(false)} editTaskId={editTaskId} />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
              <DailyPlanner />
            </div>
          )}
          
          {activeTab === 'calendar-stats' && (
            <div className="space-y-6">
                <CalendarView />
                <AnalyticsDashboard />
            </div>
          )}
          {activeTab === 'habits' && (
            <div className="pb-12 lg:pb-0">
              <HabitTracker />
            </div>
          )}
          {activeTab === 'focus' && <FocusTimer />}
          {activeTab === 'chat' && (
            <div className="pb-12 lg:pb-0">
              <AICoachPanel heightClass="h-[calc(100vh-200px)] lg:h-[calc(100vh-150px)]" />
            </div>
          )}
        </main>
      </div>

      {/* LEFT SIDEBAR (PROFILE EDITOR & OPTIONS LIST) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-[#020203] z-50 backdrop-blur-sm"
            />

            {/* Sidebar Canvas */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className={`fixed top-0 left-0 h-full w-full max-w-[340px] z-50 p-6 flex flex-col justify-between overflow-y-auto border-r shadow-2xl backdrop-blur-2xl ${
                themeDark
                  ? 'bg-[#0b0b0f]/95 border-purple-900/30 text-gray-100 shadow-black/80'
                  : 'bg-white/95 border-purple-200/50 text-gray-800 shadow-black/10'
              }`}
            >
              <div>
                {/* Header close */}
                <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
                  themeDark ? 'border-purple-950/40' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
                      Settings & Profile
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-lg bg-purple-950/20 text-gray-400 hover:text-white hover:bg-purple-950/40 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Editor */}
                <div className="space-y-5">
                  <div>
                    <h4 className={`text-xs font-bold ${themeDark ? 'text-purple-400' : 'text-purple-900'} mb-2 flex items-center gap-1`}>
                      <User className="w-3.5 h-3.5" /> App Nickname & Profile
                    </h4>
                    
                    {/* Live Preview Avatar */}
                    <div className={`flex items-center gap-4 mb-4 p-3 rounded-xl border ${
                      themeDark 
                        ? 'bg-purple-950/10 border-purple-900/10' 
                        : 'bg-purple-50/50 border-purple-200'
                    }`}>
                      <div className="relative">
                        {editPic ? (
                          <img
                            src={editPic}
                            className="w-12 h-12 rounded-xl object-cover border border-purple-500/40"
                            alt="preview"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold text-lg ${
                            themeDark
                              ? 'bg-purple-600/25 border-purple-500/30 text-purple-400'
                              : 'bg-purple-100 border-purple-300 text-purple-900'
                          }`}>
                            {editName ? editName.charAt(0) : '?'}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 bg-purple-600 text-[8px] font-bold px-1 rounded text-white border border-purple-400">
                          PRO
                        </span>
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${themeDark ? 'text-white' : 'text-purple-950'}`}>{editName || 'Guest User'}</p>
                      </div>
                      <div>
                        <button
                          onClick={() => setIsSidebarOpen(true)}
                          className="text-[9px] bg-purple-600/30 text-purple-300 hover:bg-purple-600 px-2 py-1 rounded font-semibold cursor-pointer"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>

                    {/* Editor Fields */}
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className={`block text-[10px] font-semibold ${themeDark ? 'text-gray-400' : 'text-purple-900'} mb-1`}>Display Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e: any) => setEditName(e.target.value)}
                          className={`w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:border-purple-500 transition-all ${
                            themeDark
                              ? 'bg-[#121215] border-purple-900/40 text-white'
                              : 'bg-white border-purple-300 text-purple-950 font-semibold'
                          }`}
                          placeholder="example"
                        />
                      </div>
                      {/* Nickname input removed as requested */}
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-400 mb-1">Upload Profile Image File</label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-purple-500/40 rounded-xl p-3 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-all">
                            <Upload className="w-4 h-4 text-purple-400 mb-1" />
                            <span className="text-[10px] text-gray-400">Choose custom image file</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                          {editPic && editPic.startsWith('data:') && (
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-purple-500 shrink-0">
                              <img src={editPic} className="w-full h-full object-cover" alt="Uploaded preview" />
                              <button
                                type="button"
                                onClick={() => setEditPic('')}
                                className="absolute top-0 right-0 p-0.5 bg-red-600 text-white rounded-bl"
                                title="Remove file"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Settings */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      updateProfile({
                        displayName: editName.trim() || 'Nidhi Verma',
                        profilePicture: editPic
                      });
                      setIsSidebarOpen(false);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/10 cursor-pointer"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span className="text-white">Apply Profile Changes</span>
                  </motion.button>
                </div>

                {/* NeverLate Coaching Hub Collapsible Accordion */}
                <div className={`mt-6 pt-5 border-t ${themeDark ? 'border-purple-950/40' : 'border-gray-100'}`}>
                  <button
                    onClick={() => setIsCoachingHubExpanded(!isCoachingHubExpanded)}
                    className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                      <h4 className={`text-xs font-black tracking-wider uppercase font-mono ${themeDark ? 'text-purple-300' : 'text-purple-950'}`}>
                        NeverLate Coaching Hub
                      </h4>
                    </div>
                    {isCoachingHubExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isCoachingHubExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-3 space-y-3.5"
                      >
                        {/* Start New Chat Button */}
                        <button
                          onClick={() => {
                            createNewSession();
                            setActiveTab('chat');
                            setIsSidebarOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl border border-dashed transition-all bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/40 text-purple-300 cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Start New Chat</span>
                        </button>

                        {/* Previous/Past Chats */}
                        <div className="space-y-1">
                          <h5 className="text-[9px] font-bold uppercase tracking-wider text-purple-400 font-mono mb-1">Past Coaching Chats</h5>
                          <div className="space-y-1 max-h-[110px] overflow-y-auto custom-scrollbar pr-1">
                            {chatSessions.length === 0 ? (
                              <p className="text-[10px] text-gray-500 italic pl-1">No chats yet</p>
                            ) : (
                              chatSessions.map((sess) => {
                                const isActive = sess.id === activeSessionId;
                                return (
                                  <div
                                    key={sess.id}
                                    className={`group flex items-center justify-between p-2 rounded-xl text-[11px] transition-all cursor-pointer ${
                                      isActive
                                        ? themeDark
                                          ? 'bg-purple-600/20 border border-purple-500/30 text-purple-200 font-semibold'
                                          : 'bg-purple-50 border border-purple-100 text-purple-800 font-semibold'
                                        : 'hover:bg-purple-500/5 text-gray-400 hover:text-gray-200'
                                    }`}
                                    onClick={() => {
                                      selectSession(sess.id);
                                      setActiveTab('chat');
                                      setIsSidebarOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <MessageSquare className={`w-3 h-3 shrink-0 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                                      <span className="truncate pr-1">{sess.title}</span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSession(sess.id);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 rounded transition-all cursor-pointer shrink-0"
                                      title="Delete Chat"
                                    >
                                      <Trash className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Active Tasks helper sync */}
                        <div className="pt-2 border-t border-purple-900/10">
                          <div className="flex items-center justify-between mb-1.5">
                            <h5 className="text-[9px] font-bold uppercase tracking-wider text-purple-400 font-mono">Synced Tasks (Coach Help)</h5>
                            {tasks.filter(t => !t.completed).length > 0 && (
                              <button
                                onClick={handleSuggestTaskFromSidebar}
                                className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                                title="Let AI Suggest which task to prioritize"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>AI Suggest</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                            {tasks.filter(t => !t.completed).length === 0 ? (
                              <div className="text-[10px] text-gray-500 italic p-2 text-center bg-purple-950/10 rounded-lg">
                                🎉 All tasks completed!
                              </div>
                            ) : (
                              tasks.filter(t => !t.completed).map((task) => {
                                return (
                                  <div
                                    key={task.id}
                                    onClick={() => handleAskCoachAboutTask(task.title, task.deadline)}
                                    className={`p-2 rounded-xl border border-purple-950/20 text-[10px] transition-all cursor-pointer text-left hover:scale-[1.01] active:scale-[0.99] ${
                                      themeDark
                                        ? 'bg-[#151518]/50 hover:bg-[#1c1c22]'
                                        : 'bg-purple-50/20 hover:bg-purple-50/50'
                                    }`}
                                  >
                                    <div className="font-bold truncate text-gray-200">{task.title}</div>
                                    <div className="flex items-center justify-between text-[9px] text-gray-500 mt-0.5">
                                      <span>Due: {task.deadline}</span>
                                      <span className="text-[8px] uppercase tracking-wider px-1 bg-purple-500/10 text-purple-400 rounded">
                                        {task.riskLevel}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Additional Sidebar Actions */}
                <div className={`mt-8 pt-6 border-t space-y-3.5 text-xs ${
                  themeDark ? 'border-purple-950/30' : 'border-gray-200'
                }`}>
                  <h4 className="text-[10px] font-black text-gray-500 tracking-widest uppercase">System Options</h4>
                  
                  {!currentUser?.profilePicture && (
                    <p className="text-sm font-semibold text-gray-400 mt-2 mb-2">Sign in to sync data</p>
                  )}
                  
                  {/* Account link row */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-purple-950/5 border border-purple-900/10">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.3 1.5-1.1 2.8-2.4 3.7v3h3.8c2.2-2 3.8-5 3.8-8.5z"/>
                        <path fill="#34A853" d="M12 24c3.2 0 6-1 8-2.8l-3.8-3c-1.1.7-2.5 1.2-4.2 1.2-3.2 0-6-2.2-7-5.2H1.2v3c2 4 6.1 6.8 10.8 6.8z"/>
                        <path fill="#FBBC05" d="M5 14.2c-.3-.8-.4-1.7-.4-2.7s.1-1.9.4-2.7V5.8H1.2C.4 7.4 0 9.2 0 11s.4 3.6 1.2 5.2l3.8-2z"/>
                        <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.3 0 3.2 2.8 1.2 6.8l3.8 3c1-3 3.8-5.2 7-5.2z"/>
                      </svg>
                      <span className="font-medium text-gray-300">Sign In Connection</span>
                    </div>
                    {currentUser?.profilePicture ? (
                      <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-0.5">
                        <BadgeCheck className="w-3 h-3" /> Linked
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        {!currentUser?.profilePicture && (
                            <p className="hidden">Sign in to Google Account for syncing the data</p>
                        )}
                        <button
                          onClick={() => {
                            setIsSidebarOpen(false);
                            setShowGoogleModal(true);
                          }}
                          className="text-[9px] bg-purple-600/30 text-purple-300 hover:bg-purple-600 px-2 py-1 rounded font-semibold cursor-pointer"
                        >
                          Link Account
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-gray-400">
                    <span>Focus Target Streak</span>
                    <span className="text-amber-400 font-bold font-mono">100 XP / cycle</span>
                  </div>
                </div>
              </div>

              {/* Reset database & Logout buttons */}
               <div className={`pt-6 border-t space-y-2.5 ${
                 themeDark ? 'border-purple-950/30' : 'border-gray-200'
               }`}>
                <button
                  onClick={() => {
                    logout();
                    setIsSidebarOpen(false);
                  }}
                  className="w-full py-2 bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white rounded-xl text-[10px] font-bold tracking-widest uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout Account</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all tasks, habits and reset settings?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full py-2 bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-900/30 rounded-xl text-[10px] font-bold tracking-widest uppercase cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Wipe All Data</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Google Modal will now handle login, register, and forgot password */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with thick blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGoogleModal(false)}
              className="fixed inset-0 bg-[#05030D]/80 backdrop-blur-md"
            />

            {/* Modal Card with premium black glass */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`${themeDark ? 'bg-[#0b071a]/95 border-purple-950/40 text-[#D7D0F8]' : 'bg-white border-purple-100 text-gray-900'} border p-8 rounded-3xl w-full max-w-sm z-50 shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center relative`}
              style={{
                boxShadow: themeDark ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.6)' : '0 20px 40px rgba(122,87,248,0.05)'
              }}
            >
              {/* Decorative light leakage */}
              {themeDark && <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#8E5FFF]/15 rounded-full blur-3xl pointer-events-none" />}

              {/* Multicolor Google 'G' Logo */}
              <div className={`p-4 ${themeDark ? 'bg-white/[0.03] border-white/10' : 'bg-gray-50 border-gray-100'} rounded-2xl border mb-5 z-10 relative`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" className="animate-pulse">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>

              <h3 className={`text-lg font-extrabold tracking-tight ${themeDark ? 'text-white' : 'text-[#2A1952]'} mb-2 z-10 relative`}>
                Sign in with Google
              </h3>
              
              <p className={`text-xs ${themeDark ? 'text-[#A89FC9]' : 'text-purple-950/70'} max-w-xs mb-6 z-10 relative leading-relaxed`}>
                NeverLate connects with your Google Account to back up your tasks, deadlines, habits, and chat sessions securely in the cloud. Access your workspace from any device.
              </p>

              {/* Direct Sign-In block */}
              <div className="w-full space-y-3 mb-6 z-10 relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleSignInClick}
                  className={`w-full py-3.5 ${
                    themeDark 
                      ? 'bg-[#8E5FFF] text-white hover:bg-[#7C4DFF]' 
                      : 'bg-[#E9E3FF] text-black hover:bg-[#DCD4FF]'
                  } font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 shadow-lg cursor-pointer transition-colors duration-200`}
                >
                  {/* Miniature Google multi-colored G */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" className="bg-white p-0.5 rounded-full">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </motion.button>
              </div>

              <button
                onClick={() => setShowGoogleModal(false)}
                className={`w-full py-2.5 ${themeDark ? 'bg-white/[0.04] border-white/[0.08] text-[#A89FC9] hover:bg-white/[0.08] hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'} rounded-xl text-xs font-semibold cursor-pointer transition-all`}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STUNNING CELEBRATORY PARTY POPPER CONE POP-UP */}
      <AnimatePresence>
        {celebration?.isActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-6 rounded-2xl border transition-all duration-300 max-w-xs w-full text-center flex flex-col items-center gap-4 ${
                themeDark
                  ? 'bg-[#120A28] border-purple-500/30 text-white shadow-[0_0_35px_rgba(168,85,247,0.3)]'
                  : 'bg-white border-purple-200 text-[#2A1952] shadow-2xl'
              }`}
            >
              {/* Cute Party Popper Emoji */}
              <div className="text-4xl animate-bounce">🎉</div>
 
              <div>
                <h4 className={`text-sm font-black tracking-tight ${themeDark ? 'text-white' : 'text-[#2A1952]'}`}>Task Completed!</h4>
                <p className={`text-xs mt-1.5 leading-relaxed font-semibold ${themeDark ? 'text-[#D4CCF5]' : 'text-[#5E4B9B]'}`}>
                  {celebration.message}
                </p>
              </div>
 
              <button
                onClick={clearCelebration}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Thank You
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ON-SCREEN HIGH-FIDELITY GLASSMORPHIC RISK ALERT BANNER */}
      <AnimatePresence>
        {activeNotificationAlert && (
          <div className="fixed top-20 right-6 z-50 w-full max-w-sm px-4 sm:px-0">
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="p-5 rounded-2xl relative overflow-hidden text-white border border-purple-500/30 bg-[#090613]/95 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
              style={{
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Risk theme bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                activeNotificationAlert.riskLevel === 'Critical' 
                  ? 'from-red-500 to-amber-500' 
                  : activeNotificationAlert.riskLevel === 'High' 
                  ? 'from-orange-500 to-yellow-500' 
                  : 'from-purple-500 to-indigo-500'
              }`} />
 
              <button
                onClick={() => setActiveNotificationAlert(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-[#A89FC9] hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
 
              <div className="flex items-start gap-3 mt-1">
                <div className={`p-2 rounded-xl shrink-0 ${
                  activeNotificationAlert.riskLevel === 'Critical'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : activeNotificationAlert.riskLevel === 'High'
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                }`}>
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
 
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      activeNotificationAlert.riskLevel === 'Critical'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/15'
                        : activeNotificationAlert.riskLevel === 'High'
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/15'
                        : 'bg-purple-500/15 text-purple-400 border border-purple-500/15'
                    }`}>
                      {activeNotificationAlert.riskLevel} Risk
                    </span>
                    <span className="text-[10px] font-mono text-[#A89FC9]">{activeNotificationAlert.timeRemainingStr}</span>
                  </div>
 
                  <h4 className="text-xs font-black tracking-tight text-white mt-2 truncate">
                    {activeNotificationAlert.taskTitle}
                  </h4>
                  
                  <div className="mt-2.5 p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/10 text-[10.5px] text-[#D7D0F8] italic leading-relaxed">
                    <span className="font-bold text-purple-400 not-italic block mb-0.5">💡 AI Coach Suggestion:</span>
                    "{activeNotificationAlert.aiCoachTip}"
                  </div>
 
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        startFocus(25); 
                        setActiveNotificationAlert(null);
                        showCustomToast("Focus Running", "Pomodoro timer initialized!");
                      }}
                      className="flex-1 py-1.5 px-3 bg-[#4607af] text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <Flame className="w-3 h-3" />
                      <span>Start Pomodoro</span>
                    </button>
                    <button
                      onClick={() => setActiveNotificationAlert(null)}
                      className="py-1.5 px-2.5 bg-white/[0.04] border border-white/10 text-[#A89FC9] hover:text-white rounded-lg text-[10px] cursor-pointer transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* GLOBAL HIGH-FIDELITY GLASSMORPHIC SUCCESS TOAST */}
      <AnimatePresence>
        {customToast && (
          <div className="fixed bottom-6 left-6 z-50 w-80 max-w-sm">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 rounded-xl border border-purple-500/20 bg-[#090613]/90 backdrop-blur-md relative overflow-hidden text-white"
              style={{
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-green-500/15 rounded-lg text-green-400 border border-green-500/20">
                  <BadgeCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{customToast.title}</h4>
                  <p className="text-[10px] text-[#A89FC9] mt-0.5">{customToast.desc}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


 
    </div>
  );
}
