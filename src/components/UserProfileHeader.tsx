// File: src/components/UserProfileHeader.tsx

import { useAppStore } from '../store/useAppStore';
import { Award, Zap, Trophy, ShieldCheck, MessageSquare, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function UserProfileHeader() {
  const { theme, currentUser, addChatMessage, chatHistory, setActiveTab, tasks } = useAppStore();

  const themeDark = theme === 'dark';
  const { displayName, nickname, profilePicture, xp, level } = currentUser || { 
    displayName: 'Guest User', 
    xp: 0, 
    level: 1 
  };

  const handleCoachReview = async () => {
    setActiveTab('chat');
    const promptText = `Hey AI Coach! I am currently at Level ${level} with ${xp} total XP. Can you analyze my progress, check my core tasks, and give me a custom gamified cognitive focus recommendation?`;
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
        addChatMessage('coach', data.text || "Keep up the amazing momentum! You're making beautiful progress.");
      } else {
        addChatMessage('coach', "Outstanding work on your level milestones! Let's prioritize finishing your highest priority tasks to score even more XP today.");
      }
    } catch (err) {
      console.error(err);
      addChatMessage('coach', "Fabulous progress! Let's crush your next deadline block to unlock your next level badge!");
    }
  };

  // Max XP per level is 200
  const nextLevelXp = level * 200;
  const currentLevelMinXp = (level - 1) * 200;
  const levelProgressXp = xp - currentLevelMinXp;
  const levelProgressPercent = Math.min(100, Math.max(0, (levelProgressXp / 200) * 100));

  return (
    <div
      id="user-profile-header-card"
      className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
        themeDark
          ? 'bg-white/[0.04] border-white/[0.08] backdrop-blur-[25px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-white'
          : 'bg-white/75 border-purple-200/50 backdrop-blur-3xl shadow-[0_8px_32px_rgba(122,87,248,0.06)] text-[#2A1952]'
      }`}
    >
      {/* Background radial highlight */}
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* User Info details */}
        <div className="flex items-center gap-3.5">
          {/* Animated Avatar Circle with badge */}
          <div className="relative">
            {profilePicture ? (
              <img
                src={profilePicture}
                className="w-12 h-12 rounded-xl object-cover border border-purple-500/40"
                alt={displayName}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center font-bold text-lg text-purple-400 font-mono">
                {displayName.charAt(0)}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
              <Trophy className="w-2.5 h-2.5 fill-black" />
              <span>Lv.{level}</span>
            </div>
          </div>
 
          <div>
            <h2 className="text-sm font-bold tracking-tight">
              {displayName}
            </h2>
            {/* Coach Advice button removed as requested */}
          </div>
        </div>

        {/* Gamified Level Progress Bar */}
        <div className="flex-1 max-w-sm w-full">
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
            <span className={themeDark ? 'text-[#B1A7D6]' : 'text-[#8575B8]'} style={{ fontSize: '12px' }}>Level Progress</span>
            <span className="text-purple-400 font-bold" style={{ fontSize: '12px' }}>{levelProgressXp} / 200 XP</span>
          </div>

          {/* Progress bar container */}
          <div className={`w-full h-2.5 rounded-full overflow-hidden ${themeDark ? 'bg-purple-950/30' : 'bg-purple-100'}`}>
            <motion.div
              id="xp-progress-bar"
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          <p className={`text-[9px] mt-1 text-right font-mono ${themeDark ? 'text-[#8D83B3]' : 'text-[#8575B8]/80'}`} style={{ fontSize: '11px' }}>
            {200 - levelProgressXp} XP to Level {level + 1}
          </p>
        </div>

      </div>
    </div>
  );
}
