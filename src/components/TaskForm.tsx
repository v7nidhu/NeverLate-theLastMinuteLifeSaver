// File: src/components/TaskForm.tsx

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, X, Sparkles, AlertCircle, Clock, Tag, Calendar, Palette, Code, Server, Megaphone, Search, Briefcase, ChevronDown, Check, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpeechRecognition } from '../lib/speech';

interface TaskFormProps {
  onClose?: () => void;
  editTaskId?: string | null;
  initialDeadline?: string;
  initialCategory?: string;
}

export default function TaskForm({ onClose, editTaskId, initialDeadline, initialCategory }: TaskFormProps) {
  const { theme, tasks, addTask, updateTask, isLoading } = useAppStore();

  const isEdit = !!editTaskId;
  const taskToEdit = isEdit ? tasks.find(t => t.id === editTaskId) : null;

  const [title, setTitle] = useState(taskToEdit ? taskToEdit.title : '');
  const [description, setDescription] = useState(taskToEdit ? taskToEdit.description : '');

  const speechTitle = useSpeechRecognition((newText) => {
    setTitle(prev => prev ? `${prev} ${newText}` : newText);
  });
  const speechDesc = useSpeechRecognition((newText) => {
    setDescription(prev => prev ? `${prev} ${newText}` : newText);
  });
  const [deadline, setDeadline] = useState(taskToEdit ? taskToEdit.deadline : (initialDeadline || new Date().toISOString().split('T')[0]));
  const [estimatedHours, setEstimatedHours] = useState(taskToEdit ? taskToEdit.estimatedHours : 2);
  const [category, setCategory] = useState(taskToEdit ? taskToEdit.category : (initialCategory || 'Design'));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date(taskToEdit ? taskToEdit.deadline : Date.now()).getMonth());
  const [calYear, setCalYear] = useState(new Date(taskToEdit ? taskToEdit.deadline : Date.now()).getFullYear());

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const handleSelectDay = (day: number) => {
    const formattedMonth = (calMonth + 1).toString().padStart(2, '0');
    const formattedDay = day.toString().padStart(2, '0');
    setDeadline(`${calYear}-${formattedMonth}-${formattedDay}`);
    setIsCalendarOpen(false);
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(prev => prev + 1);
    } else {
      setCalMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(prev => prev - 1);
    } else {
      setCalMonth(prev => prev - 1);
    }
  };

  const monthDaysCount = daysInMonth(calMonth, calYear);
  const startOffset = startDayOfMonth(calMonth, calYear);
  const blankDays = Array(startOffset).fill(null);
  const actualDays = Array.from({ length: monthDaysCount }, (_, i) => i + 1);
  const allDays = [...blankDays, ...actualDays];

  const themeDark = theme === 'dark';

  const categoryConfig: Record<string, { label: string, icon: any, color: string, border: string, glow: string }> = {
    'Design': { 
      label: 'Design', 
      icon: Palette, 
      color: themeDark ? 'text-pink-400' : 'text-purple-950 font-extrabold', 
      border: themeDark ? 'border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10' : 'border-purple-300 bg-purple-50 hover:bg-purple-100', 
      glow: '' 
    },
    'Development': { label: 'Development', icon: Code, color: 'text-cyan-400', border: 'border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10', glow: '' },
    'Backend': { label: 'Backend', icon: Server, color: 'text-purple-400', border: 'border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10', glow: '' },
    'Marketing': { label: 'Marketing', icon: Megaphone, color: 'text-amber-400', border: 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10', glow: '' },
    'Research': { label: 'Research', icon: Search, color: 'text-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10', glow: '' },
    'General': { label: 'General', icon: Briefcase, color: 'text-blue-400', border: 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10', glow: '' },
  };

  const categories = Object.keys(categoryConfig);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskPayload = {
      title: title.trim(),
      description: description.trim(),
      deadline,
      estimatedHours,
      category,
      completed: isEdit && taskToEdit ? taskToEdit.completed : false,
    };

    if (isEdit && editTaskId) {
      updateTask(editTaskId, taskPayload);
    } else {
      await addTask(taskPayload);
    }

    if (onClose) onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className={`block text-xs font-semibold mb-1.5 ${themeDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Task Title
        </label>
        <div className={`w-full rounded-xl border focus-within:ring-1 transition-all ${
          themeDark
            ? 'bg-[#18181b] border-purple-900/30 focus-within:border-purple-500 focus-within:ring-purple-500'
            : 'bg-gray-50 border-purple-100 focus-within:border-purple-400 focus-within:ring-purple-400'
        } flex items-center`}>
          <input
            type="text"
            value={title}
            onChange={(e: any) => setTitle(e.target.value)}
            required
            placeholder="e.g., Deliver UX Landing Mockup"
            className="flex-1 bg-transparent text-xs px-3.5 py-2.5 outline-none"
          />
          <button 
            type="button" 
            onClick={speechTitle.toggleListening} 
            className={`p-2.5 rounded-xl transition-all ${speechTitle.isListening ? 'text-red-500 animate-pulse' : 'text-purple-400 hover:text-purple-600'}`}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={`block text-xs font-semibold mb-1.5 ${themeDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Task Description
        </label>
        <div className={`w-full rounded-xl border focus-within:ring-1 transition-all ${
          themeDark
            ? 'bg-[#18181b] border-purple-900/30 focus-within:border-purple-500 focus-within:ring-purple-500'
            : 'bg-gray-50 border-purple-100 focus-within:border-purple-400 focus-within:ring-purple-400'
        } flex items-start`}>
          <textarea
            value={description}
            onChange={(e: any) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief details regarding task scope..."
            className="flex-1 bg-transparent text-xs px-3.5 py-2.5 outline-none resize-none"
          />
          <button 
            type="button" 
            onClick={speechDesc.toggleListening} 
            className={`p-2.5 rounded-xl transition-all ${speechDesc.isListening ? 'text-red-500 animate-pulse' : 'text-purple-400 hover:text-purple-600'}`}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid: Deadline & Estimated Hours */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* Deadline */}
        <div className="relative">
          <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1 ${themeDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <Calendar className="w-3.5 h-3.5 text-purple-400" /> Deadline Date
          </label>
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={`w-full text-left text-xs px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              themeDark
                ? 'bg-[#151518] border-purple-900/40 text-gray-200 hover:border-purple-500/50'
                : 'bg-white border-purple-200 text-purple-950 hover:bg-purple-50'
            }`}
          >
            <span>{deadline ? deadline : "Select date..."}</span>
            <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
          </button>

          {isCalendarOpen && (
            <>
              {/* Click outside to close */}
              <div className="fixed inset-0 z-40" onClick={() => setIsCalendarOpen(false)} />
              
              <div className={`absolute left-0 mt-1.5 z-50 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl w-[260px] ${
                themeDark
                  ? 'bg-[#0f0f12]/95 border-purple-900/50 shadow-black/80 text-white'
                  : 'bg-white border-purple-200 text-[#2A1952] shadow-purple-950/15'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3 text-xs font-bold">
                  <button type="button" onClick={prevMonth} className="p-1 hover:bg-purple-500/10 rounded cursor-pointer text-purple-500">&lt;</button>
                  <span>{months[calMonth]} {calYear}</span>
                  <button type="button" onClick={nextMonth} className="p-1 hover:bg-purple-500/10 rounded cursor-pointer text-purple-500">&gt;</button>
                </div>

                {/* Days of week */}
                <div className="grid grid-cols-7 gap-1 text-[9px] text-center font-mono opacity-60 mb-2 font-bold">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {allDays.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />;
                    
                    const isSelected = deadline === `${calYear}-${(calMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    
                    return (
                      <button
                        key={`day-${day}`}
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        className={`py-1 rounded font-mono text-center cursor-pointer transition-all text-[11px] ${
                          isSelected
                            ? 'bg-purple-600 text-white font-bold'
                            : themeDark
                            ? 'hover:bg-purple-500/20 text-gray-200'
                            : 'hover:bg-purple-100 text-[#2A1952]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Estimated Hours */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1 ${themeDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <Clock className="w-3.5 h-3.5 text-purple-400" /> Estimated Hours
          </label>
          <input
            type="number"
            min={1}
            max={40}
            value={estimatedHours}
            onChange={(e: any) => setEstimatedHours(parseInt(e.target.value) || 1)}
            required
            className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-1 transition-all ${
              themeDark
                ? 'bg-[#18181b] border-purple-900/30 text-gray-200 focus:border-purple-500 focus:ring-purple-500'
                : 'bg-gray-50 border-purple-100 text-gray-800 focus:border-purple-400 focus:ring-purple-400'
            }`}
          />
        </div>

      </div>

      {/* Category Chips */}
      <div>
        <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1 ${themeDark ? 'text-gray-300' : 'text-gray-700'}`}>
          <Tag className="w-3.5 h-3.5 text-purple-400" /> Task Category
        </label>
        
        <div className="relative">
          {/* Custom Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full text-xs px-3.5 py-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              themeDark
                ? 'bg-[#151518] border-purple-900/40 text-gray-200 hover:border-purple-500/50'
                : 'bg-purple-950/5 border-purple-950/15 text-purple-950 hover:bg-purple-950/10'
            }`}
          >
            <div className="flex items-center gap-2">
              {(() => {
                const cfg = categoryConfig[category] || categoryConfig['General'];
                const IconComp = cfg.icon;
                return (
                  <>
                    <span className={`p-1 rounded-lg ${cfg.border} ${cfg.color}`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-semibold">{cfg.label}</span>
                  </>
                );
              })()}
            </div>
            <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Glassmorphic Dropdown List */}
          <AnimatePresence>
            {isDropdownOpen && (
              <>
                {/* Click outside backdrop */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 4, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute left-0 right-0 z-20 max-h-60 overflow-y-auto p-1.5 rounded-2xl border backdrop-blur-xl shadow-2xl custom-scrollbar ${
                    themeDark
                      ? 'bg-[#0f0f12]/95 border-purple-900/50 shadow-black/80'
                      : 'bg-purple-950/95 border-purple-950/30 text-white shadow-purple-900/45'
                  }`}
                >
                  <div className="grid grid-cols-1 gap-1">
                    {categories.map((cat) => {
                      const isSelected = category === cat;
                      const cfg = categoryConfig[cat];
                      const IconComp = cfg.icon;
                      
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setCategory(cat);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600/35 text-white border border-purple-500/30'
                              : 'hover:bg-purple-500/10 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`p-1 rounded-lg ${cfg.border} ${cfg.color} ${cfg.glow}`}>
                              <IconComp className="w-3.5 h-3.5" />
                            </span>
                            <span className={`font-medium ${isSelected ? 'text-white' : themeDark ? 'text-gray-300' : 'text-gray-200'}`}>
                              {cfg.label}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Submit */}
      <div className="flex items-center justify-end gap-2.5 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium border cursor-pointer ${
              themeDark
                ? 'border-purple-900/30 text-gray-400 hover:text-gray-200 hover:bg-purple-950/20'
                : 'border-purple-100 text-gray-500 hover:bg-purple-50'
            }`}
          >
            Cancel
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          id="task-form-submit"
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/20 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing Task...</span>
            </>
          ) : (
            <>
              {isEdit ? 'Save Changes' : 'Generate AI Backlog'}
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}
