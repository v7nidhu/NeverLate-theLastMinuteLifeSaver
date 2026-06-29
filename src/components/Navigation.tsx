import { useState } from 'react';
import { Calendar, Flame, Home, Clock, MessageSquare } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, themeDark }: { activeTab: string, setActiveTab: (tab: string) => void, themeDark: boolean }) {
  const navItems = [
    { id: 'calendar-stats', icon: Calendar, label: 'Activity' },
    { id: 'habits', icon: Flame, label: 'Habits' },
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'focus', icon: Clock, label: 'Focus' },
    { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
  ];

  const bgColor = themeDark ? 'bg-[#090613]' : 'bg-purple-50/95 backdrop-blur-md';
  const borderColor = themeDark ? 'border-white/10' : 'border-purple-200/60';
  const activeColor = themeDark ? 'text-pink-400 font-bold' : 'text-pink-600 font-bold';
  const inactiveColor = themeDark ? 'text-purple-300/70' : 'text-purple-950/60';

  return (
    <>
      {/* Mobile: Bottom Nav */}
      <nav className={`lg:hidden fixed bottom-0 left-0 w-full ${bgColor} border-t ${borderColor} grid grid-cols-5 p-3 z-50`}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === item.id ? activeColor : inactiveColor}`}
          >
            <div className={`p-1.5 rounded-full transition-all duration-200 ${
              activeTab === item.id 
                ? (themeDark ? 'bg-[#1a0046] text-pink-400' : 'bg-pink-100 text-pink-600') 
                : (themeDark ? 'hover:bg-purple-500/10' : 'hover:bg-purple-200/30')
            }`}>
                <item.icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Desktop: Vertical Left Sidebar */}
      <nav className={`hidden lg:flex fixed left-0 top-0 h-screen w-20 ${bgColor} border-r ${borderColor} flex-col items-center py-8 gap-8 z-50`}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${activeTab === item.id ? activeColor : inactiveColor}`}
          >
            <div className={`p-2 rounded-full transition-all duration-200 ${
              activeTab === item.id 
                ? (themeDark ? 'bg-[#1a0046] text-pink-400' : 'bg-pink-100 text-pink-600') 
                : (themeDark ? 'hover:bg-purple-500/10' : 'hover:bg-purple-200/30')
            }`}>
                <item.icon className="w-8 h-8" />
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
