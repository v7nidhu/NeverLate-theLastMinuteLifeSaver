// File: src/components/ThemeToggle.tsx

import { useAppStore } from '../store/useAppStore';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  return (
    <motion.button
      id="theme-toggler"
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className={`p-1.5 sm:p-2.5 rounded-xl transition-all duration-300 border flex items-center justify-center cursor-pointer ${
        theme === 'dark'
          ? 'bg-[#151515] border-purple-900/40 text-purple-400 hover:border-purple-500/60 hover:text-purple-300 shadow-[0_0_15px_rgba(147,51,234,0.1)]'
          : 'bg-white border-purple-200 text-purple-600 hover:border-purple-400 hover:bg-purple-50/50 shadow-sm'
      }`}
      title={theme === 'dark' ? 'Switch to Accessible Light Theme' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <Sun id="sun-icon" className="w-3.5 h-3.5 sm:w-5 h-5" />
      ) : (
        <Moon id="moon-icon" className="w-3.5 h-3.5 sm:w-5 h-5" />
      )}
    </motion.button>
  );
}
