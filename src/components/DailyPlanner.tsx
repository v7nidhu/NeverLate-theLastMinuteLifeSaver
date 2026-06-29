// File: src/components/DailyPlanner.tsx

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Sparkles, Calendar, Clock, RefreshCw, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

export default function DailyPlanner() {
  const { theme, tasks, habits, isLoading, addChatMessage, chatHistory, setActiveTab } = useAppStore();
  const [plannerText, setPlannerText] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);

  const themeDark = theme === 'dark';

  const handleChatAboutSchedule = async () => {
    setActiveTab('chat');
    const promptText = `Hey AI Coach! I'd like to discuss my daily schedule. Can you help me review my time management and design a perfect routine based on my current list of ${tasks.filter(t => !t.completed).length} active core tasks?`;
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
        addChatMessage('coach', data.text || "Let's build a rock-solid cognitive routine to master your day.");
      } else {
        addChatMessage('coach', "Let's structure your schedule! We should start with your hardest tasks during your peak cognitive energy hours (usually in the morning) and take strategic breaks.");
      }
    } catch (err) {
      console.error(err);
      addChatMessage('coach', "Let's block your hours beautifully! Place your highest-risk task in your first focus block of the day.");
    }
  };

  const handleGeneratePlanner = async () => {
    setIsCompiling(true);
    try {
      const res = await fetch('/api/ai/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, habits })
      });
      if (res.ok) {
        const data = await res.json();
        setPlannerText(data.plan || '');
      } else {
        setPlannerText("Failed to compile. Please try again in a few moments!");
      }
    } catch (err) {
      console.error(err);
      setPlannerText("Connection lag! Let's prioritize clearing overdue deadlines before writing a tight schedule.");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div
      id="daily-planner-container"
      className={`p-5 rounded-2xl border transition-all duration-300 ${
        themeDark
          ? 'bg-[#121214] border-purple-950/40 text-gray-100 shadow-md'
          : 'bg-white border-purple-100 text-gray-800'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/10 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-600/10 text-purple-400 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">AI Daily Planner & Optimizer</h3>
            <p className={`text-[10px] ${themeDark ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontSize: '11px' }}>
              Draft a high-productivity bullet schedule dynamically aligned to your deadlines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleChatAboutSchedule}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              themeDark 
                ? 'bg-purple-950/40 border border-purple-500/30 text-purple-300 hover:bg-purple-900/40' 
                : 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Discuss Schedule</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGeneratePlanner}
            disabled={isCompiling}
            id="optimize-schedule-btn"
            className="px-4 py-2 text-white bg-[#c27aff] hover:bg-[#b05cff] disabled:opacity-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCompiling ? 'animate-spin' : ''}`} />
            <span className="text-white" style={{ color: '#ffffff' }}>{isCompiling ? 'Optimizing Plan...' : 'Generate AI Plan'}</span>
          </motion.button>
        </div>
      </div>

      {/* Daily schedule rendering */}
      {plannerText ? (
        <div className={`p-4 rounded-xl text-xs leading-relaxed overflow-y-auto max-h-[300px] whitespace-pre-wrap custom-scrollbar ${
          themeDark ? 'bg-[#18181b]/50 text-gray-200 font-sans' : 'bg-purple-50/50 text-gray-800'
        }`}>
          {plannerText}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-purple-900/15 rounded-xl">
          <Sparkles className="w-7 h-7 text-purple-500/30 mb-2 animate-bounce" />
          <p className="text-xs font-medium">Daily Schedule Empty</p>
          <p className={`text-[10px] max-w-xs mt-1 ${themeDark ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontSize: '10px' }}>
            Ready to structure your hours? Click "Generate AI Plan" above to create an optimized daily agenda based on your workload.
          </p>
        </div>
      )}
    </div>
  );
}
