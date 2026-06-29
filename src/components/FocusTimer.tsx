// File: src/components/FocusTimer.tsx

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Play, Square, Pause, RotateCcw, Flame, Zap, Award, Coffee, Volume2, VolumeX, 
  ChevronUp, ChevronDown, Maximize2, Minimize2, Image as ImageIcon, 
  Settings, Sliders, Layout, Sparkles, SlidersHorizontal, Info, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

let audioCtx: AudioContext | null = null;
let alarmInterval: any = null;

function startAlarmSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const playTone = () => {
      if (!audioCtx) return;
      
      const now = audioCtx.currentTime;
      
      const playNote = (freq: number, startTime: number, duration: number) => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        // Use triangle wave for a soft, woodwind/flute-like warmth
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Soothing envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.08); // soft attack
        gainNode.gain.setValueAtTime(0.08, startTime + duration - 0.1);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // gentle decay
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Play a beautiful ascending melodious arpeggio (E4, G#4, B4, E5)
      playNote(329.63, now, 0.25);        // E4
      playNote(415.30, now + 0.35, 0.25); // G#4
      playNote(493.88, now + 0.70, 0.25); // B4
      playNote(659.25, now + 1.05, 0.40); // E5
    };
    
    playTone();
    if (alarmInterval) clearInterval(alarmInterval);
    alarmInterval = setInterval(playTone, 3500); // Repeat every 3.5 seconds
  } catch (e) {
    console.error("Audio Web API not supported or blocked by browser policy:", e);
  }
}

function stopAlarmSound() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// @ts-ignore
import starryBg from '../assets/images/purple_starry_night_1782498126978.jpg';

export default function FocusTimer() {
  const { theme, focusSession, startFocus, stopFocus, resumeFocus, resetFocus, tickFocus, completeFocusSession } = useAppStore();
  
  // Custom states for the customizable preset values
  const [presetWork, setPresetWork] = useState(25);
  const [presetShort, setPresetShort] = useState(5);
  const [presetLong, setPresetLong] = useState(50);
  const [customMin, setCustomMin] = useState(25);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  // Layout custom states
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Warning states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningCallback, setWarningCallback] = useState<(() => void) | null>(null);

  const { isActive, isPaused, timeLeft, duration, mode, completedSessions, totalFocusHours } = focusSession;

  const motivationalQuotes = [
    "Focus on being productive instead of busy.",
    "Procrastination makes easy things hard.",
    "Your future self will thank you for starting now.",
    "Action is the foundational key to all success.",
    "Done is better than perfect. Begin today!",
    "Only you can control your clock. Master it!",
    "Success is the sum of small focus sessions.",
    "Defeat the doubt. Finish the work."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      setIsAlarmActive(true);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (isAlarmActive) {
      startAlarmSound();
    } else {
      stopAlarmSound();
    }
  }, [isAlarmActive]);

  useEffect(() => {
    return () => {
      stopAlarmSound();
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (isCurrentlyFullscreen !== isFullscreen) {
        setIsFullscreen(isCurrentlyFullscreen);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  const toggleFullscreen = async (shouldEnter: boolean) => {
    if (shouldEnter) {
      try {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen request blocked or unsupported inside iframe:", err);
      }
      setIsFullscreen(true);
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen exit failed:", err);
      }
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;

  const handleStart = () => {
    startFocus(customMin);
  };

  const handleStopAlarm = () => {
    stopAlarmSound();
    setIsAlarmActive(false);
  };

  // Adjust custom preset minutes
  const handleAdjust = (idx: number, delta: number) => {
    if (idx === 0) {
      const val = Math.max(1, presetWork + delta);
      setPresetWork(val);
      setCustomMin(val);
    } else if (idx === 1) {
      const val = Math.max(1, presetShort + delta);
      if (delta > 0 && val > 15) {
        setWarningCallback(() => () => {
          setPresetShort(val);
          setCustomMin(val);
          setShowWarningModal(false);
        });
        setShowWarningModal(true);
      } else {
        setPresetShort(val);
        setCustomMin(val);
      }
    } else {
      const val = Math.max(1, presetLong + delta);
      setPresetLong(val);
      setCustomMin(val);
    }
  };

  const incrementCustomMin = () => {
    setCustomMin(prev => Math.min(180, prev + 1));
    if (isActive) stopFocus();
  };

  const decrementCustomMin = () => {
    setCustomMin(prev => Math.max(1, prev - 1));
    if (isActive) stopFocus();
  };

  const presets = [
    { label: 'Work Sprint', mins: presetWork, icon: Flame, idx: 0 },
    { label: 'Short Break', mins: presetShort, icon: Coffee, idx: 1 },
    { label: 'Power Hour', mins: presetLong, icon: Zap, idx: 2 }
  ];

  const themeDark = theme === 'dark';

  // Helper styles for the wallpaper placement
  const getWallpaperStyle = () => {
    return {
      backgroundImage: `url("${starryBg}")`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      opacity: themeDark ? 1 : 0.45
    };
  };

  const timerContent = (
    <div className="flex flex-col items-center justify-center text-center z-10 w-full max-w-lg px-4 select-none">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="mb-1"
      >
        <span className={`text-xs sm:text-sm font-bold tracking-[0.3em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${
          themeDark ? 'text-purple-300' : 'text-purple-950 font-extrabold'
        }`}>
          Focus Mode
        </span>
      </motion.div>

      {/* Normal timer display - strictly text-based, NO box, NO key second pop! */}
      <div className="my-2 relative flex flex-col items-center justify-center text-center">
        <h1 className="text-7xl sm:text-9xl font-bold font-sans tracking-tight text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.45)] select-none">
          {formatTime(timeLeft)}
        </h1>
        
        {/* Only show linear progress tracker when NOT active to keep active screen absolutely empty */}
        {!isActive && (
          <div className="w-40 h-1 bg-white/20 rounded-full mt-2 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
            <div 
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Timer Controls bar */}
      <div className="flex items-center gap-3 mt-4">
        {isAlarmActive ? (
          <div className="flex items-center gap-3">
             <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                handleStopAlarm();
                resetFocus();
              }}
              className={`px-6 py-2.5 font-bold rounded-xl text-xs shadow-xl cursor-pointer ${
                themeDark 
                  ? 'bg-purple-900/50 hover:bg-purple-900/70 text-purple-200' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              Go Back
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                handleStopAlarm();
                // "Move Next" could imply starting another block or just finishing
                completeFocusSession();
              }}
              className="px-6 py-2.5 font-bold rounded-xl text-xs shadow-xl cursor-pointer bg-purple-600 text-white"
            >
              Move Next
            </motion.button>
          </div>
        ) : !isActive ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStart}
            className={`px-6 py-2.5 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xl cursor-pointer ${
              themeDark 
                ? 'bg-purple-700 hover:bg-purple-800 text-white' 
                : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300'
            }`}
          >
            <Play className={`w-4 h-4 ${themeDark ? 'fill-white text-white' : 'fill-purple-950 text-purple-950'}`} />
            <span>Start {customMin}m</span>
          </motion.button>
        ) : (
          <div className="flex items-center gap-2 bg-white/[0.04] p-1.5 rounded-xl border border-white/10 backdrop-blur-xl shadow-lg">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isPaused ? resumeFocus : stopFocus}
              className="w-20 py-1.5 bg-white/5 hover:bg-white/15 text-white font-semibold rounded-lg text-[10.5px] flex items-center justify-center gap-1 cursor-pointer border border-white/10 backdrop-blur-md transition-all shadow-sm"
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3 fill-white text-white" />
                  <span className="text-[#ffffff]">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 fill-white text-white" />
                  <span className="text-[#ffffff]">Pause</span>
                </>
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetFocus}
              className="w-20 py-1.5 bg-white/5 hover:bg-white/15 text-white font-semibold rounded-lg text-[10.5px] flex items-center justify-center gap-1 cursor-pointer border border-white/10 backdrop-blur-md transition-all shadow-sm"
              title="Reset Timer"
            >
              <RotateCcw className="w-3 h-3 fill-white text-white" />
              <span className="text-[#fefefe]">Reset</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={completeFocusSession}
              className="w-20 py-1.5 bg-white/5 hover:bg-white/15 text-white font-semibold rounded-lg text-[10.5px] flex items-center justify-center gap-1 cursor-pointer border border-white/10 backdrop-blur-md transition-all shadow-sm"
              title="Skip this Block"
            >
              <Square className="w-3 h-3 fill-white text-white" />
              <span className="text-[#fefefe]">Skip</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Mini Streak display in white aesthetic - Hide when active! */}
      {!isActive && (
        <div className="flex items-center gap-2 text-xs font-mono font-bold mt-4 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.45)]">
          <span>{completedSessions} blocks completed</span>
          <div className="flex gap-0.5 ml-1">
            {Array.from({ length: Math.min(completedSessions, 5) }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-450 border border-white/20 shadow-sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Immersive Sandbox Full-Screen Overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed -inset-10 z-[999] flex flex-col items-center justify-center p-6 bg-[#09080f] select-none portrait:max-md:rotate-90 portrait:max-md:w-[100vh] portrait:max-md:h-[100vw] portrait:max-md:fixed portrait:max-md:top-1/2 portrait:max-md:left-1/2 portrait:max-md:-translate-x-1/2 portrait:max-md:-translate-y-1/2 portrait:max-md:origin-center"
          >
            {/* Absolute Wallpaper Backdrop */}
            <div 
              className="absolute -inset-10 transition-all duration-700 pointer-events-none"
              style={getWallpaperStyle()}
            />
            {/* Mask overlay to maximize contrast */}
            <div className={`absolute -inset-10 ${themeDark ? 'bg-black/45' : 'bg-purple-100/50'} pointer-events-none`} />
 
            {/* Float HUD controls inside full screen */}
            <div className="absolute top-5 right-5 z-20">
              <button
                onClick={() => toggleFullscreen(!isFullscreen)}
                className="px-3 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 text-white rounded-lg text-xs font-mono border border-purple-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
            </div>
 
            {/* Immersive Main Center Timer */}
            <div className="flex-1 flex items-center justify-center w-full z-10">
              {timerContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Card for non-fullscreen view */}
      <div
        id="focus-timer-container"
        className={`rounded-2xl transition-all duration-500 relative overflow-hidden ${
          isActive 
            ? 'border-none bg-transparent' 
            : themeDark 
            ? 'border border-purple-500/10' 
            : 'border border-gray-300 bg-white shadow-sm'
        }`}
      >
        {/* Background Wallpaper Container */}
        <div 
          className="absolute inset-0 transition-all duration-700 pointer-events-none"
          style={getWallpaperStyle()}
        />
        {/* contrast masking overlay */}
        <div className={`absolute inset-0 ${themeDark ? 'bg-black/45' : 'bg-purple-100/50'} pointer-events-none`} />

        {/* Enter Immersive Fullscreen Mode - absolutely positioned in top right */}
        <button
          onClick={() => toggleFullscreen(!isFullscreen)}
          className={`absolute top-4 right-4 z-20 p-2 rounded-lg cursor-pointer transition-all ${
            themeDark 
              ? 'bg-black/45 hover:bg-black/60 text-white border border-white/10' 
              : 'bg-white hover:bg-gray-100 text-purple-950 border border-gray-300 shadow-sm'
          }`}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Main Stage Panel */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 min-h-[300px] landscape:py-6 landscape:min-h-[220px]">
          {/* Main Centered Timer Section */}
          {timerContent}
        </div>
      </div>

      {/* ALL OTHER SETTINGS/PRESETS SHIFTED TO THE BOTTOM */}
      {!isActive && (
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${
          themeDark
            ? 'bg-[#121020]/40 border-purple-900/25 text-white'
            : 'bg-white border-gray-300 text-[#2A1952] shadow-[0_4px_20px_rgba(122,87,248,0.03)]'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Preset options */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest font-mono text-[#9b00ff]">Focus Presets</h4>
                <p className={`text-xs font-semibold ${themeDark ? 'text-purple-400/90' : 'text-purple-950/80'}`}>Instantly switch timer shifts or make adjustments (+ / -)</p>
              </div>
 
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => {
                  const PresetIcon = preset.icon;
                  return (
                    <div
                      key={preset.label}
                      className={`flex flex-col rounded-xl overflow-hidden border transition-all ${
                        customMin === preset.mins
                          ? 'border-purple-500 bg-purple-500/10'
                          : themeDark
                          ? 'bg-white/[0.02] border-white/5 hover:border-purple-500/20'
                          : 'bg-purple-50/50 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCustomMin(preset.mins);
                          if (isActive) stopFocus();
                        }}
                        className={`py-3 px-1 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                          customMin === preset.mins
                            ? 'text-purple-400 font-bold'
                            : themeDark
                            ? 'text-gray-300'
                            : 'text-purple-950'
                        }`}
                      >
                        <span className="text-[12.5px] uppercase font-mono font-medium tracking-wide opacity-80 text-center">{preset.label}</span>
                        <span className="text-xs font-black">{preset.mins}m</span>
                      </button>
 
                      {/* Add/Subtract Minutes controls */}
                      <div className="flex items-center justify-between border-t border-purple-500/10 mt-1.5 px-1 py-0.5 bg-black/10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdjust(preset.idx, -1);
                            if (isActive) stopFocus();
                          }}
                          className="px-1 text-[18px] font-extrabold text-red-400 hover:bg-white/10 rounded cursor-pointer"
                          title="Subtract minute"
                        >
                          -
                        </button>
                        <span className="text-[13px] font-mono opacity-60">adj</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdjust(preset.idx, 1);
                            if (isActive) stopFocus();
                          }}
                          className="px-1 text-[18px] font-extrabold text-emerald-400 hover:bg-white/10 rounded cursor-pointer"
                          title="Add minute"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
 
            {/* Time Customizer Shift */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest font-mono text-[#9b00ff]">Customized Shift Input</h4>
                <p className={`text-xs font-semibold ${themeDark ? 'text-purple-400/90' : 'text-purple-950/80'}`}>Customize focus blocks to align with your sprint planning</p>
              </div>
 
              <div className="flex items-center gap-3">
                <div 
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl border relative transition-all ${
                    themeDark 
                      ? 'bg-[#111114] border-purple-900/40 focus-within:border-purple-500' 
                      : 'bg-purple-50/20 border-gray-300 focus-within:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${themeDark ? 'text-purple-400' : 'text-purple-900'}`}>Duration:</span>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={customMin}
                      onChange={(e: any) => {
                        const val = Math.max(1, Math.min(180, parseInt(e.target.value) || 25));
                        setCustomMin(val);
                        if (isActive) stopFocus();
                      }}
                      className={`w-14 text-sm font-mono font-bold bg-transparent border-none outline-none focus:ring-0 p-0 ${
                        themeDark ? 'text-white' : 'text-[#2A1952]'
                      }`}
                    />
                    <span className="text-[10px] opacity-60">mins</span>
                  </div>

                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button 
                      type="button" 
                      onClick={incrementCustomMin}
                      className="p-0.5 hover:bg-purple-500/20 rounded cursor-pointer text-purple-400"
                      title="Increase 1m"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={decrementCustomMin}
                      className="p-0.5 hover:bg-purple-500/20 rounded cursor-pointer text-purple-400"
                      title="Decrease 1m"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Motivational Quotes Banner */}
          <div className="border-t border-purple-500/10 mt-5 pt-4">
            <div className={`flex items-center gap-2 mb-1 ${themeDark ? 'text-purple-400' : 'text-purple-900 font-extrabold'}`}>
              <Info className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-wider font-mono">Daily Coach Tip</span>
            </div>
            <p className="text-sm md:text-base italic font-semibold transition-all duration-500 leading-relaxed text-[#9b00ff]">
              "{motivationalQuotes[quoteIndex]}"
            </p>
          </div>

          {/* Peak Flow Recommendation Callout */}
          <div className={`mt-4 p-3 rounded-xl flex items-start gap-2.5 border ${
            themeDark 
              ? 'bg-purple-500/5 border-purple-500/15' 
              : 'bg-purple-50 border-purple-300'
          }`}>
            <span className="text-sm">💡</span>
            <p className={`text-[10.5px] leading-relaxed font-medium ${
              themeDark ? 'text-purple-400/95' : 'text-purple-950'
            }`}>
              <strong>Structured Timers</strong> ensure you execute tasks in digestible, predictable slots. This keeps your flow metrics focused, matching estimated hours to beat daily procrastinating habits.
            </p>
          </div>
        </div>
      )}
      {/* Alarm Continuous Notification Ring modal removed */}

      {/* Break Warning Popup Alert Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`p-5 rounded-2xl max-w-sm w-full border ${
            themeDark ? 'bg-[#120A28] border-purple-500/30 text-white' : 'bg-white border-purple-200 text-[#2A1952]'
          } shadow-2xl`}>
            <div className="flex items-center gap-2 text-amber-500 mb-3">
              <Zap className="w-5 h-5 animate-bounce" />
              <h4 className="text-sm font-black tracking-tight">Flow Break Warning!</h4>
            </div>
            <p className="text-xs leading-relaxed mb-4 opacity-90">
              You're taking a break longer than <span className="font-bold text-amber-500">15 minutes</span>. 
              Taking excessively long breaks can disrupt your hyperfocus flow and slow down your peak productivity streak!
            </p>
            <div className="flex gap-2 justify-end text-xs font-semibold">
              <button
                onClick={() => {
                  setShowWarningModal(false);
                }}
                className={`px-3 py-1.5 rounded-lg border ${
                  themeDark ? 'border-white/10 hover:bg-white/5' : 'border-purple-200 hover:bg-purple-50'
                }`}
              >
                No, Go Back
              </button>
              <button
                onClick={() => {
                  if (warningCallback) warningCallback();
                }}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
              >
                Yes, Continue anyway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
