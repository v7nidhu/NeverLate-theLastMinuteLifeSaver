// File: src/components/TaskListItem.tsx

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Task } from '../types';
import { Check, Edit, Trash2, Calendar, Clock, ChevronDown, ChevronUp, Sparkles, AlertTriangle, ShieldCheck, Play, Palette, Code, Server, Megaphone, Search, Briefcase, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskListItemProps {
  task: Task;
  onEdit: (id: string) => void;
}

export default function TaskListItem({ task, onEdit }: TaskListItemProps) {
  const { theme, toggleTask, deleteTask, setTaskBreakdown, startFocus, stopFocus, focusSession, addChatMessage, chatHistory, setActiveTab, tasks } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdatingBreakdown, setIsUpdatingBreakdown] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [customMins, setCustomMins] = useState(25);

  const themeDark = theme === 'dark';

  const { id, title, description, completed, deadline, estimatedHours, category, smartPriorityScore, riskLevel, riskPercentage, breakdown, priorityExplanation } = task;

  const isThisTaskFocused = focusSession.isActive && focusSession.focusedTaskId === id;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-purple-400 bg-purple-500/10 border-purple-500/25';
    if (score >= 50) return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25';
    return 'text-gray-400 bg-gray-500/10 border-gray-500/25';
  };

  const handleFetchBreakdown = async () => {
    setIsUpdatingBreakdown(true);
    try {
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.breakdown) {
          setTaskBreakdown(id, data.breakdown, data.explanation || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingBreakdown(false);
    }
  };

  const handleStepToggle = (step: string) => {
    if (completedSteps.includes(step)) {
      setCompletedSteps(completedSteps.filter(s => s !== step));
    } else {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  const categoryConfig: Record<string, { icon: any; color: string; border: string; glow: string; text: string }> = {
    'Design': { 
      icon: Palette, 
      color: themeDark ? 'bg-pink-500/10 text-pink-400' : 'bg-purple-100 text-purple-950 font-extrabold', 
      border: themeDark ? 'border-pink-500/20' : 'border-purple-300', 
      glow: '', 
      text: themeDark ? 'text-pink-400' : 'text-purple-950' 
    },
    'Development': { icon: Code, color: 'bg-cyan-500/10 text-cyan-400', border: 'border-cyan-500/20', glow: '', text: 'text-cyan-400' },
    'Backend': { icon: Server, color: 'bg-purple-500/10 text-purple-400', border: 'border-purple-500/20', glow: '', text: 'text-purple-400' },
    'Marketing': { icon: Megaphone, color: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/20', glow: '', text: 'text-amber-400' },
    'Research': { icon: Search, color: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20', glow: '', text: 'text-emerald-400' },
    'General': { icon: Briefcase, color: 'bg-blue-500/10 text-blue-400', border: 'border-blue-500/20', glow: '', text: 'text-blue-400' },
  };

  const cfg = categoryConfig[category] || categoryConfig['General'];
  const CatIcon = cfg.icon;

  // Calculate local steps completion progress
  const totalSteps = breakdown ? breakdown.length : 0;
  const doneSteps = breakdown ? breakdown.filter(s => completedSteps.includes(s)).length : 0;
  const progressPercent = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0;

  const handleChatAboutTask = async () => {
    setActiveTab('chat');
    const promptText = `Hey AI Coach! Can you help me prioritize and break down my task "${title}"? It is a ${category} task with a ${riskLevel} risk level (${riskPercentage}% deadline risk). Suggest a quick 15-minute start and focus game plan!`;
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
        addChatMessage('coach', "Let's tackle this step-by-step. Let's start with a 15-minute focused interval right now!");
      }
    } catch (err) {
      console.error(err);
      addChatMessage('coach', "Let's tackle this task immediately. Try starting with a small 5-minute action to build inertia.");
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -3, boxShadow: themeDark ? "0 12px 30px rgba(122,87,248,0.12)" : "0 12px 30px rgba(122,87,248,0.08)" }}
      transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
      style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
      id={`task-item-${id}`}
      className={`p-4 rounded-2xl border transition-colors duration-300 relative overflow-hidden ${
        completed
          ? themeDark
            ? 'bg-[#121214]/60 border-purple-950/20 text-gray-500 opacity-60'
            : 'bg-purple-50/60 border-purple-100 text-purple-950/40 opacity-60'
          : themeDark
          ? 'bg-[#121215]/80 border-purple-900/25 hover:border-purple-500/50 shadow-[0_8px_25px_rgba(0,0,0,0.45)]'
          : 'bg-white border-purple-200 hover:border-purple-400 shadow-[0_8px_25px_rgba(122,87,248,0.05)]'
      }`}
    >
      {/* Sleek Gradient Side Stripes */}
      <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 to-indigo-500`} />

      <div className="flex items-start justify-between gap-3 pl-2">
        {/* Left Side Checkbox + Content */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => toggleTask(id)}
            id={`toggle-task-${id}`}
            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 mt-0.5 cursor-pointer ${
              completed
                ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                : themeDark
                ? 'border-purple-800/60 hover:border-purple-400 text-transparent bg-[#18181b]/50'
                : 'border-purple-300 hover:border-purple-500 text-transparent bg-purple-50'
            }`}
          >
            {completed && <Check className="w-4 h-4 text-white" />}
          </motion.button>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                themeDark 
                  ? `${getRiskColor(riskLevel)} bg-purple-950/20 text-[#ff00bb] border-purple-500/20` 
                  : 'bg-purple-50 border-purple-300 text-purple-950 font-extrabold'
              }`} style={{ fontSize: '12px' }}>
                {riskLevel} Risk ({riskPercentage}%)
              </span>
              <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                themeDark 
                  ? `${getPriorityColor(smartPriorityScore)} border-[#ff00bb] text-[#ff00bb]` 
                  : 'bg-purple-50 border-purple-300 text-purple-950 font-extrabold'
              }`} style={{ fontSize: '12px' }}>
                Score: {smartPriorityScore}
              </span>
              <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full flex items-center gap-1 ${cfg.color} ${cfg.border} ${cfg.glow}`} style={{ fontSize: '12px' }}>
                <CatIcon className="w-2.5 h-2.5" />
                <span style={{ fontSize: '12px' }}>{category}</span>
              </span>
            </div>
            
            <h4 className={`text-sm sm:text-base font-bold leading-snug break-words tracking-tight ${completed ? 'line-through opacity-60' : themeDark ? 'text-gray-100' : 'text-[#2A1952]'}`}>
              {title}
            </h4>
            
            {description && (
              <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${themeDark ? 'text-gray-400' : 'text-[#2c00ac]'}`}>
                {description}
              </p>
            )}

            {/* Micro Steps Progress Bar */}
            {totalSteps > 0 && (
              <div className="mt-2.5 max-w-xs">
                <div className="flex justify-between items-center text-xs font-mono mb-1 text-purple-400">
                  <span style={{ fontSize: '12px' }}>Progress Breakdown</span>
                  <span style={{ fontSize: '12px' }}>{doneSteps}/{totalSteps} steps completed</span>
                </div>
                <div className="w-full h-1 bg-purple-950/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className={`flex flex-wrap gap-3 mt-3 text-xs font-mono ${themeDark ? 'text-gray-400' : 'text-[#5E4B9B]'}`}>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                themeDark ? 'bg-[#18181b]/50 border-purple-900/10' : 'bg-purple-50 border-purple-200'
              }`}>
                <Calendar className="w-4 h-4 text-purple-400" />
                <span style={{ fontSize: '12px' }}>{deadline}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                themeDark ? 'bg-[#18181b]/50 border-purple-900/10' : 'bg-purple-50 border-purple-200'
              }`}>
                <Clock className="w-4 h-4 text-purple-400" />
                <span style={{ fontSize: '12px' }}>{estimatedHours} hrs</span>
              </div>
            </div>
          </div>
        </div>
 
        {/* Action Controls */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {!completed && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 bg-purple-950/10 dark:bg-purple-950/20 px-2 py-1 rounded-lg border border-purple-900/10">
                {/* Customizable duration input */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-purple-400 font-bold">Mins:</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customMins}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(180, parseInt((e.target as HTMLInputElement).value) || 25));
                      setCustomMins(val);
                    }}
                    disabled={isThisTaskFocused}
                    className={`w-8 text-center text-[10px] font-mono font-bold bg-transparent border-none focus:ring-0 p-0 ${
                      themeDark ? 'text-white' : 'text-[#2A1952]'
                    } ${isThisTaskFocused ? 'opacity-50' : ''}`}
                    title="Customize Pomodoro Minutes"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <AnimatePresence mode="wait">
                    {isThisTaskFocused ? (
                      <motion.div
                        key="active-timer"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          themeDark 
                            ? 'bg-purple-900/30 text-purple-300' 
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span>{formatTime(focusSession.timeLeft)}</span>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <motion.button
                    onClick={() => {
                      if (isThisTaskFocused) {
                        stopFocus();
                      } else {
                        startFocus(customMins, id);
                      }
                    }}
                    id={`start-focus-${id}`}
                    animate={isThisTaskFocused ? { x: -8, scale: 0.95 } : { x: 0, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      isThisTaskFocused
                        ? 'border-red-500/40 text-red-400 bg-red-950/20'
                        : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
                    }`}
                    title={isThisTaskFocused ? "Stop Focus Session" : "Launch Custom Timer"}
                  >
                    {isThisTaskFocused ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-sm animate-pulse" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-2.5 h-2.5 fill-purple-600/30" />
                        <span>Focus</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleChatAboutTask}
              className={`p-1.5 rounded-lg border border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 cursor-pointer transition-all flex items-center gap-1 shrink-0`}
              title="Chat with AI Coach about this task"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Ask Coach</span>
            </button>
            <button
              onClick={() => onEdit(id)}
              id={`edit-task-${id}`}
              className={`p-1.5 rounded-lg border border-transparent text-gray-400 hover:text-purple-400 hover:bg-purple-950/20 cursor-pointer`}
              title="Edit Task"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteTask(id)}
              id={`delete-task-${id}`}
              className={`p-1.5 rounded-lg border border-transparent text-gray-400 hover:text-red-400 hover:bg-red-950/20 cursor-pointer`}
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              id={`expand-task-${id}`}
              className={`p-1.5 rounded-lg border border-purple-900/20 text-gray-400 hover:text-gray-200 cursor-pointer`}
              title={isExpanded ? "Collapse Details" : "Expand Details"}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details Panel with AI Breakdown checklists */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3.5 pt-3 border-t border-purple-900/10 space-y-3">
              
              {/* Priority explanation */}
              {priorityExplanation && (
                <div className={`p-3 rounded-lg border text-[11px] ${
                  themeDark 
                    ? 'bg-purple-950/10 border-purple-900/35 text-purple-300' 
                    : 'bg-purple-50/50 border-purple-100 text-purple-900'
                }`}>
                  <h5 className="font-bold flex items-center gap-1 mb-0.5">
                    <Sparkles className="w-3 h-3 text-purple-400" /> AI Tactical Explanation
                  </h5>
                  <p className="leading-relaxed">{priorityExplanation}</p>
                </div>
              )}

              {/* Steps Checklists */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className={`text-xs font-bold flex items-center gap-1 ${themeDark ? 'text-gray-200' : 'text-[#2A1952]'}`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> AI-Generated Steps Breakdown
                  </h5>
                  <button
                    onClick={handleFetchBreakdown}
                    disabled={isUpdatingBreakdown}
                    className={`text-[10px] font-mono text-purple-400 hover:text-purple-300 transition-all cursor-pointer flex items-center gap-1 ${
                      isUpdatingBreakdown ? 'animate-pulse' : ''
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${isUpdatingBreakdown ? 'animate-spin' : ''}`} />
                    <span>{isUpdatingBreakdown ? 'Re-generating...' : 'Re-generate steps'}</span>
                  </button>
                </div>

                {breakdown && breakdown.length > 0 ? (
                  <ul className="space-y-1.5">
                    {breakdown.map((step, idx) => {
                      const isStepCompleted = completedSteps.includes(step);
                      return (
                        <li key={idx} className="flex items-center gap-2 text-xs">
                          <button
                            onClick={() => handleStepToggle(step)}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              isStepCompleted
                                ? 'bg-purple-500 border-purple-400 text-white'
                                : themeDark
                                ? 'border-purple-900/50 hover:border-purple-500'
                                : 'border-purple-200 hover:border-purple-500'
                            }`}
                          >
                            {isStepCompleted && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>
                          <span className={`leading-snug ${
                            isStepCompleted 
                              ? 'line-through opacity-50 text-purple-400' 
                              : themeDark 
                              ? 'text-gray-200' 
                              : 'text-[#2A1952]'
                          }`}>
                            {step}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 border border-dashed border-purple-900/20 rounded-xl text-center">
                    <p className="text-[10px] text-gray-500 mb-1.5">No breakdown compiled for this task yet.</p>
                    <button
                      onClick={handleFetchBreakdown}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-[10px] cursor-pointer"
                    >
                      Generate steps now
                    </button>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Quick tiny helper icon
function RefreshCw(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
