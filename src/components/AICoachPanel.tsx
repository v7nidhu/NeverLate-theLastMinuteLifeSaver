// File: src/components/AICoachPanel.tsx

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Send, Sparkles, Trash2, HelpCircle, Mic, Paperclip, X, FileText, Image, Plus, MessageSquare, Menu, Clock, Mail } from 'lucide-react';
import SuggestionForm from './SuggestionForm';
import { motion, AnimatePresence } from 'motion/react';
import { useSpeechRecognition } from '../lib/speech';

interface AttachedFile {
  name: string;
  type: string;
  base64: string;
}

export default function AICoachPanel({ heightClass = "h-[480px]" }: { heightClass?: string }) {
  const { 
    theme, 
    chatHistory, 
    chatSessions, 
    activeSessionId, 
    createNewSession, 
    selectSession, 
    deleteSession, 
    tasks, 
    addChatMessage, 
    clearChat 
  } = useAppStore();

  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isListening, toggleListening } = useSpeechRecognition((newText) => {
    setInputMsg(prev => prev ? `${prev} ${newText}` : newText);
  });

  const themeDark = theme === 'dark';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isSending]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setAttachedFile({
        name: file.name,
        type: file.type,
        base64: base64String
      });
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e?: any) => {
    if (e) e.preventDefault();
    if ((!inputMsg.trim() && !attachedFile) || isSending) return;

    const userText = inputMsg.trim();
    setInputMsg('');
    
    const currentAttachment = attachedFile;
    setAttachedFile(null);

    const displayMessage = currentAttachment 
      ? `${userText} [Attachment: ${currentAttachment.name}]`
      : userText;

    addChatMessage('user', displayMessage);
    setIsSending(true);

    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatHistory, { id: 'new', sender: 'user', text: displayMessage, timestamp: '' }],
          attachedFile: currentAttachment,
          tasks: tasks
        })
      });

      if (response.ok) {
        const data = await response.json();
        addChatMessage('coach', data.text || "I'm right here with you! Let's get things done.");
      } else {
        addChatMessage('coach', "Apologies, my synaptic sensors got delayed. Let's regain focus and conquer your next action block.");
      }
    } catch (err) {
      console.error(err);
      addChatMessage('coach', "Connection bottleneck detected! No worries, set a Pomodoro timer and start on your highest-risk deadline item immediately.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestTask = async () => {
    const promptText = "Can you analyze my current active tasks and suggest which task I should work on right now, considering their deadlines, estimated hours, and risk levels? Please choose from my list and provide a supportive plan.";
    addChatMessage('user', promptText);
    setIsSending(true);

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
    } finally {
      setIsSending(false);
    }
  };

  const handleAskAboutTask = async (taskTitle: string, taskDeadline: string) => {
    const promptText = `Can you help me break down and work on my task "${taskTitle}" (due ${taskDeadline})? Suggest a tactical step-by-step strategy.`;
    addChatMessage('user', promptText);
    setIsSending(true);

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
    } finally {
      setIsSending(false);
    }
  };

  // Quick prompt suggestions
  const suggestions = [
    "Give me an extreme focus strategy.",
    "Draft a quick study plan for tonight."
  ];

  return (
    <div
      id="ai-coach-panel"
      className={`p-0 rounded-2xl border transition-all duration-300 flex flex-row ${heightClass} relative overflow-hidden ${
        themeDark
          ? 'glass-card text-white'
          : 'bg-white/75 border-purple-200/50 backdrop-blur-3xl shadow-[0_8px_32px_rgba(122,87,248,0.06)] text-[#2A1952]'
      }`}
    >
      {/* Collapsible Left-Hand Sidebar */}
      <AnimatePresence initial={false}>
        {isHistorySidebarOpen ? (
          <motion.div
            key="sidebar-expanded"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '50%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={`flex flex-col h-full border-r border-purple-900/10 overflow-hidden shrink-0 text-left ${
              themeDark ? 'bg-[#0f0b21]/90' : 'bg-purple-50/50'
            }`}
          >
            {/* Sidebar Header with Collapse Action */}
            <div 
              onClick={() => setIsHistorySidebarOpen(false)}
              className="p-4 border-b border-purple-900/10 flex items-center justify-between cursor-pointer hover:bg-purple-500/5 transition-all group"
              title="Click to collapse sidebar"
            >
              <div className="flex items-center gap-2">
                <Menu className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">AI Coach Menu</span>
              </div>
              <button 
                type="button"
                className="p-1 rounded-lg hover:bg-purple-500/15 text-gray-400 group-hover:text-purple-300 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sidebar Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar min-h-0">
              {/* New Session Button */}
              <button
                onClick={createNewSession}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold rounded-xl border border-dashed transition-all bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/40 text-purple-300 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start New Chat</span>
              </button>

              {/* Previous Chats List */}
              <div className="space-y-2 shrink-0">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono mb-2">Previous Chats</h4>
                <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                  {chatSessions.length === 0 ? (
                    <p className="text-[11px] text-gray-500 italic pl-1">No sessions yet</p>
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
                                : 'bg-white border border-purple-200 text-purple-800 font-semibold shadow-sm'
                              : 'hover:bg-purple-500/5 text-gray-400 hover:text-gray-200'
                          }`}
                          onClick={() => selectSession(sess.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                            <span className="truncate pr-1">{sess.title}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(sess.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-all cursor-pointer shrink-0"
                            title="Delete Chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Synced Taskbar */}
              <div className="pt-4 border-t border-purple-900/10 flex flex-col min-h-0 text-left">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono">Synced Taskbar</h4>
                  <span className="text-[9px] bg-purple-950/60 text-purple-300 font-mono px-1.5 py-0.5 rounded-full font-bold">
                    {tasks.filter(t => !t.completed).length}
                  </span>
                </div>

                {tasks.filter(t => !t.completed).length > 0 && (
                  <button
                    onClick={handleSuggestTask}
                    className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-bold rounded-lg transition-all bg-[#4e12ff] hover:bg-[#3d0ecc] text-white shadow-md shadow-purple-950/20 cursor-pointer mb-2 shrink-0"
                    title="Let AI Suggest which task you should prioritize"
                  >
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span>Which task to work on?</span>
                  </button>
                )}

                <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                  {tasks.filter(t => !t.completed).length === 0 ? (
                    <div className="text-[10px] text-gray-500 italic p-3 text-center bg-purple-950/10 rounded-xl border border-purple-900/5">
                      🎉 All tasks completed!
                    </div>
                  ) : (
                    tasks.filter(t => !t.completed).map((task) => {
                      const isCritical = task.riskLevel === 'Critical';
                      const isHigh = task.riskLevel === 'High';
                      return (
                        <div
                          key={task.id}
                          onClick={() => handleAskAboutTask(task.title, task.deadline)}
                          className={`p-2 rounded-xl border text-[11px] transition-all cursor-pointer text-left hover:scale-[1.02] active:scale-[0.98] ${
                            themeDark
                              ? 'bg-[#151518]/50 hover:bg-[#1c1c22] border-purple-950/30'
                              : 'bg-white hover:bg-purple-50/50 border-purple-100 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className={`font-bold truncate ${themeDark ? 'text-gray-200' : 'text-[#2a1952]'}`}>{task.title}</span>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${
                              isCritical
                                ? 'bg-red-500/15 text-red-400'
                                : isHigh
                                ? 'bg-orange-500/15 text-orange-400'
                                : 'bg-purple-500/15 text-purple-400'
                            }`}>
                              {task.riskLevel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono">
                            <span>Due: {task.deadline}</span>
                            <span>{task.estimatedHours}h</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Bottom Actions/Settings */}
            <div className="p-4 border-t border-purple-900/10 space-y-2 shrink-0">
              <button
                onClick={clearChat}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl transition-all border ${
                  themeDark
                    ? 'border-purple-900/30 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-950/20'
                    : 'border-purple-100 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
                } cursor-pointer`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Conversation</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sidebar-collapsed"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '56px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={() => setIsHistorySidebarOpen(true)}
            className={`flex flex-col items-center py-4 border-r border-purple-900/10 cursor-pointer hover:bg-purple-500/5 select-none h-full shrink-0 transition-all gap-5 ${
              themeDark ? 'bg-[#0b081a]/90' : 'bg-purple-50/20'
            }`}
            title="Click to expand AI Coach Menu"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsHistorySidebarOpen(true);
              }}
              className="p-2 rounded-xl hover:bg-purple-500/10 text-purple-400 transition-all"
            >
              <Menu className="w-4 h-4 animate-pulse" />
            </button>
            <div className="w-8 h-[1px] bg-purple-900/10" />
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                createNewSession();
              }}
              className="p-2 rounded-xl hover:bg-purple-500/10 text-purple-400 transition-all"
              title="Start New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsHistorySidebarOpen(true);
              }}
              className="p-2 rounded-xl hover:bg-purple-500/10 text-purple-400 transition-all relative"
              title="Previous Chats"
            >
              <MessageSquare className="w-4 h-4" />
              {chatSessions.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSuggestTask();
              }}
              className="p-2 rounded-xl hover:bg-purple-500/10 text-purple-400 transition-all"
              title="Task Advice"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <div className="flex-1" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                clearChat();
              }}
              className="p-2 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area - Full Banner on the right-hand side */}
      <div className="flex-1 min-w-0 h-full flex flex-col min-h-0 p-3 sm:p-5 relative">
        
        {/* Chat Area Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/10 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-600/20 text-purple-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-bold tracking-tight flex items-center gap-1.5">
                NeverLate AI Coach
                <span className="text-xs bg-[#4607af] text-white font-mono px-1.5 py-0.5 rounded">BETA</span>
              </h3>
              <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>Empathic, direct anti-procrastination strategist</p>
            </div>
          </div>
        </div>

        {/* Suggestion Form Modal */}
        <AnimatePresence>
          {showSuggestionForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSuggestionForm(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-md"
              >
                <SuggestionForm onClose={() => setShowSuggestionForm(false)} />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-0 flex flex-col">
          
          {/* Welcome State when empty/starting (rendered inside scrollable area so it never pushes the input form) */}
          {chatHistory.length <= 2 && !isSending && (
            <div className="pb-4 pt-0 space-y-4 text-left shrink-0">
              <div className={`p-4 rounded-xl border ${
                themeDark 
                  ? 'bg-[#151518]/30 border-purple-950/20 text-gray-300' 
                  : 'bg-purple-50/10 border-purple-100 text-purple-950'
              }`}>
                <h4 className="font-bold flex items-center gap-1.5 text-xs uppercase tracking-wider text-purple-400 font-mono mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> Welcome to NeverLate AI Coach
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  I can analyze your active task board, detect high-risk deadlines, and outline custom tactical study plans to master your hours. Speak your mind or type below!
                </p>
              </div>

              {/* Recommended Queries - Beautiful pill design that fits perfectly */}
              <div className="space-y-2">
                <p className={`text-xs font-mono flex items-center gap-1 ${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" /> Click a quick suggestion to begin:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMsg(sug);
                      }}
                      className={`px-3 py-2 text-[11px] font-medium rounded-xl border transition-all cursor-pointer text-left ${
                        themeDark
                          ? 'bg-[#151518] border-purple-900/20 text-purple-300 hover:border-purple-50 hover:bg-purple-950/25'
                          : 'bg-purple-50 border-purple-100 text-purple-700 hover:border-purple-200 hover:bg-purple-100/50'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actual Chat History */}
          <div className="space-y-4">
            {chatHistory.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <div
                    className={`p-3 rounded-2xl text-[13px] leading-relaxed text-left ${
                      isUser
                        ? 'bg-[#4e12ff] text-white rounded-br-none shadow-sm'
                        : themeDark
                        ? 'bg-[#18181b] border border-purple-900/30 text-gray-200 rounded-bl-none shadow-inner'
                        : 'bg-purple-50 border border-purple-100 text-gray-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className={`text-[11px] mt-1 font-mono ${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isSending && (
              <div className="mr-auto flex flex-col max-w-[80%] items-start">
                <div
                  className={`p-3 rounded-2xl rounded-bl-none border flex items-center gap-1.5 ${
                    themeDark ? 'bg-[#18181b] border-purple-900/20' : 'bg-purple-50/40 border-purple-100'
                  }`}
                >
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Attached File Preview Badge */}
        {attachedFile && (
          <div className={`mt-2 p-2 rounded-xl flex items-center justify-between gap-2 text-xs border shrink-0 ${
            themeDark ? 'bg-[#151518] border-purple-950/40 text-gray-300' : 'bg-purple-50/60 border-purple-100 text-[#2A1952]'
          }`}>
            <div className="flex items-center gap-1.5 truncate">
              {attachedFile.type.startsWith('image/') ? (
                <Image className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span className="truncate max-w-[200px] font-mono text-[10px]">{attachedFile.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="p-1 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Compulsory Message Input Form - Anchored at the absolute bottom of the panel */}
        <form onSubmit={handleSendMessage} className={`mt-3 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border flex items-center gap-1 sm:gap-1.5 shrink-0 transition-all ${
          themeDark
            ? 'bg-gradient-to-r from-purple-950/25 to-indigo-950/20 border-purple-900/30 shadow-[0_2px_10px_rgba(142,95,255,0.05)] focus-within:border-purple-500/50'
            : 'bg-pink-50/50 border-pink-100 shadow-[0_2px_10px_rgba(244,63,94,0.03)] focus-within:border-pink-300'
        }`}>
          <div className={`flex-1 min-w-0 flex items-center gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl transition-all ${
            themeDark
              ? 'bg-[#121215]/95'
              : 'bg-white'
          }`}>
            
            {/* Voice Command Button combined with typing marks */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center gap-0.5 sm:gap-1 relative shrink-0 ${
                isListening
                  ? 'text-red-500 bg-red-500/10 animate-pulse'
                  : themeDark
                    ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
                    : 'text-pink-600 hover:text-pink-700 hover:bg-pink-100/50'
              }`}
              title={isListening ? "Listening... Click to stop" : "Voice input (Voice command)"}
              disabled={isSending}
            >
              {isSending ? (
                // Bouncing typing marks (typing indicator) inside the same button!
                <div className="flex items-center gap-0.5" title="AI Coach is thinking...">
                  <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:0s]" />
                  <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              ) : (
                <>
                  <Mic className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isListening ? 'animate-pulse' : ''}`} />
                  {isListening && (
                    // Voice command active speech waves (typing marks)
                    <div className="flex items-center gap-0.5">
                      <span className="w-0.5 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:0s]" />
                      <span className="w-0.5 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-0.5 h-2.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  )}
                </>
              )}
            </button>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0 ${
                themeDark
                  ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
                  : 'text-pink-600 hover:text-pink-700 hover:bg-pink-100/50'
              }`}
              title="Attach a file, document or image"
            >
              <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <input
              type="text"
              value={inputMsg}
              onChange={(e: any) => setInputMsg(e.target.value)}
              placeholder="Ask AI Coach, suggest a task"
              className={`flex-1 min-w-0 bg-transparent text-[11px] sm:text-xs py-2 outline-none pl-1 ${
                themeDark ? 'text-white placeholder-gray-500' : 'text-purple-950 placeholder-pink-800/50 font-medium'
              }`}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={(!inputMsg.trim() && !attachedFile) || isSending}
            id="send-chat-btn"
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              (!inputMsg.trim() && !attachedFile) || isSending
                ? 'bg-purple-800/10 text-purple-500/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/10'
            }`}
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
