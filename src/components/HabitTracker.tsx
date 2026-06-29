// File: src/components/HabitTracker.tsx

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, Check, Trash2, Award, Flame, CalendarRange, Mic, MicOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function HabitTracker() {
  const { theme, habits, addHabit, toggleHabit, deleteHabit } = useAppStore();
  const [newHabitName, setNewHabitName] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const themeDark = theme === 'dark';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setNewHabitName((prev) => {
            const added = prev ? prev + ' ' + transcript : transcript;
            return added;
          });
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser/iframe. Please open in a new tab or grant microphone access.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAddHabit = (e: any) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    addHabit(newHabitName.trim());
    setNewHabitName('');
  };

  return (
    <div
      id="habit-tracker"
      className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden h-[calc(100vh-200px)] lg:h-[calc(100vh-150px)] flex flex-col ${
        themeDark
          ? 'glass-card text-white'
          : 'bg-white/75 border-purple-200/50 backdrop-blur-3xl shadow-[0_8px_32px_rgba(122,87,248,0.06)] text-[#2A1952]'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-purple-900/10 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${themeDark ? 'bg-purple-600/10 text-purple-400' : 'bg-purple-100 text-purple-900'}`}>
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">Proactive Habit Streaks</h3>
            <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>Maintain consecutive days to double XP speed!</p>
          </div>
        </div>
      </div>

      {/* Habits Checklist Grid */}
      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar mb-4">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-gray-400">
            <CalendarRange className="w-7 h-7 text-purple-500/30 mb-1" />
            <span>No habits set up yet. Establish a streak below.</span>
          </div>
        ) : (
          habits.map((habit) => {
            const isCompletedToday = habit.completedDates.includes(todayStr);
            return (
              <motion.div
                key={habit.id}
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isCompletedToday
                    ? themeDark
                      ? 'bg-purple-950/25 border-purple-800/40 text-purple-200'
                      : 'bg-purple-50 border-purple-200 text-purple-800'
                    : themeDark
                    ? 'bg-[#17171a] border-purple-900/15 hover:border-purple-800/40'
                    : 'bg-gray-50/75 border-purple-100 hover:border-purple-200'
                }`}
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleHabit(habit.id, todayStr)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
                      isCompletedToday
                        ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                        : themeDark
                        ? 'border-purple-800/50 text-transparent hover:border-purple-400'
                        : 'border-purple-300 text-transparent hover:border-purple-500'
                    }`}
                  >
                    {isCompletedToday && <Check className="w-3.5 h-3.5 text-white" />}
                  </motion.button>
                  <div 
                    onClick={() => toggleHabit(habit.id, todayStr)}
                    className="cursor-pointer select-none flex-1"
                    title="Click to toggle habit status"
                  >
                    <p className={`text-xs font-semibold ${isCompletedToday ? 'line-through opacity-70' : ''}`}>
                      {habit.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                      <span className="flex items-center gap-0.5 text-amber-500 font-mono font-bold">
                        <Flame className="w-3 h-3 fill-amber-500" /> {habit.streak} day streak
                      </span>
                      <span className={`w-1 h-1 rounded-full ${themeDark ? 'bg-purple-900' : 'bg-purple-200'}`} />
                      <span className="text-purple-400 font-mono">+20 XP daily</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteHabit(habit.id)}
                  id={`delete-habit-${habit.id}`}
                  className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                    themeDark
                      ? 'border-transparent text-gray-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-950/20'
                      : 'border-transparent text-gray-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50'
                  } cursor-pointer`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Habit Form */}
      <form onSubmit={handleAddHabit} className="mt-auto pt-4 flex gap-1.5 border-t border-purple-900/10 shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            value={newHabitName}
            onChange={(e: any) => setNewHabitName(e.target.value)}
            placeholder="New daily habit (e.g. Drink 3L water)..."
            className={`w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all ${
              themeDark
                ? 'bg-[#18181b] border-purple-900/30 text-gray-200 focus:border-purple-500 focus:ring-purple-500'
                : 'bg-gray-50 border-purple-100 text-gray-800 focus:border-purple-400 focus:ring-purple-400'
            }`}
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer text-white flex items-center justify-center ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white'
                : 'bg-[#c27aff] hover:bg-[#b05cff] text-white'
            }`}
            title={isListening ? "Listening... click to stop" : "Start Voice Assistant"}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          id="add-habit-submit"
          className="p-2.5 bg-[#c27aff] hover:bg-[#b05cff] text-white rounded-xl shadow-md cursor-pointer flex items-center justify-center shrink-0 transition-all"
        >
          <Plus className="w-4 h-4 text-white" />
        </motion.button>
      </form>
    </div>
  );
}
