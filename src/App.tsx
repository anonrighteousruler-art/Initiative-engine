import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Flame, Crown, CheckCircle2, Lock, Users, ArrowUp, MessageCircle, Mic } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { TogetherBonusModal } from './components/TogetherBonusModal';
import { Guide } from './components/Guide';
import { LiveGuide } from './components/LiveGuide';

// Exponential milestones
const MILESTONES = [
  { day: 1, title: 'The First Step', icon: Shield },
  { day: 2, title: 'Momentum', icon: Zap },
  { day: 4, title: 'Consistency', icon: Flame },
  { day: 8, title: 'The Habit', icon: CheckCircle2 },
  { day: 16, title: 'Energy Upgrade', icon: Zap },
  { day: 32, title: 'Strategic Alliance', icon: Users },
  { day: 64, title: 'Future Time', icon: Crown },
  { day: 128, title: 'Agency Mastered', icon: Lock }, // Lock until reached
];

export default function App() {
  const [streak, setStreak] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  
  const [showTogetherModal, setShowTogetherModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLiveGuide, setShowLiveGuide] = useState(false);

  // Load state on mount
  useEffect(() => {
    const savedStreak = localStorage.getItem('ie_streak');
    const savedLastCheckIn = localStorage.getItem('ie_lastCheckIn');
    
    if (savedStreak) setStreak(parseInt(savedStreak, 10));
    if (savedLastCheckIn) {
      setLastCheckIn(savedLastCheckIn);
      
      // Check if streak is broken (more than 1 day since last check-in)
      const lastDate = new Date(savedLastCheckIn);
      if (!isToday(lastDate) && !isYesterday(lastDate)) {
        // Streak broken
        setStreak(0);
        localStorage.setItem('ie_streak', '0');
      }
    }
  }, []);

  const canCheckIn = !lastCheckIn || !isToday(new Date(lastCheckIn));

  const handleCheckIn = () => {
    if (!canCheckIn) return;
    
    setIsCheckingIn(true);
    
    // Simulate a heavy, calm breathing ritual
    setTimeout(() => {
      const newStreak = streak + 1;
      const today = new Date().toISOString();
      
      setStreak(newStreak);
      setLastCheckIn(today);
      
      localStorage.setItem('ie_streak', newStreak.toString());
      localStorage.setItem('ie_lastCheckIn', today);
      
      setIsCheckingIn(false);
    }, 2000);
  };

  // Determine current theme/glow based on streak
  const getGlowColor = () => {
    if (streak >= 32) return 'shadow-emerald-500/20 border-emerald-500/30';
    if (streak >= 8) return 'shadow-blue-500/20 border-blue-500/30';
    if (streak >= 2) return 'shadow-indigo-500/20 border-indigo-500/30';
    return 'shadow-zinc-500/20 border-zinc-700';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-6 px-6 flex justify-between items-center z-10">
        <div>
          <h1 className="text-sm font-mono text-zinc-500 tracking-widest uppercase">Initiative Engine</h1>
          <p className="text-xs text-zinc-600 mt-1">Architecture of Adult Agency</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowLiveGuide(true)}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            <Mic size={18} />
          </button>
          <button 
            onClick={() => setShowGuide(true)}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            <MessageCircle size={18} />
          </button>
          <button 
            onClick={() => setShowTogetherModal(true)}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            <Users size={18} />
          </button>
        </div>
      </header>

      {/* Main Ritual Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 z-10">
        <div className="relative mb-12">
          {/* Breathing Circle */}
          <motion.button
            onClick={handleCheckIn}
            disabled={!canCheckIn || isCheckingIn}
            className={`
              relative w-64 h-64 rounded-full flex flex-col items-center justify-center
              border transition-all duration-1000
              ${getGlowColor()}
              ${canCheckIn && !isCheckingIn ? 'animate-breathe bg-zinc-900/50 cursor-pointer hover:bg-zinc-900' : 'bg-zinc-950 cursor-default'}
              ${isCheckingIn ? 'scale-110 bg-zinc-900 border-zinc-500' : ''}
            `}
            whileTap={canCheckIn ? { scale: 0.95 } : {}}
          >
            {isCheckingIn ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-zinc-400 font-mono text-sm tracking-widest uppercase"
              >
                Breathe...
              </motion.div>
            ) : (
              <>
                <span className="text-7xl font-light tracking-tighter mb-2">{streak}</span>
                <span className="text-xs font-mono text-zinc-500 tracking-widest uppercase">
                  {streak === 1 ? 'Day' : 'Days'}
                </span>
                
                {canCheckIn && (
                  <div className="absolute bottom-8 flex flex-col items-center text-zinc-400">
                    <ArrowUp size={16} className="mb-1 animate-bounce" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Execute</span>
                  </div>
                )}
                
                {!canCheckIn && !isCheckingIn && (
                  <div className="absolute bottom-8 text-zinc-600 text-[10px] font-mono uppercase tracking-widest">
                    Ritual Complete
                  </div>
                )}
              </>
            )}
          </motion.button>
        </div>

        {/* Identity Roadmap */}
        <div className="w-full max-w-md mt-8">
          <h2 className="text-xs font-mono text-zinc-500 tracking-widest uppercase mb-6 px-2">Identity Roadmap</h2>
          
          <div className="relative pl-6 border-l border-zinc-800/50 space-y-8 pb-12">
            {MILESTONES.map((milestone, index) => {
              const isReached = streak >= milestone.day;
              const isNext = streak < milestone.day && (index === 0 || streak >= MILESTONES[index - 1].day);
              const Icon = milestone.icon;
              
              return (
                <div key={milestone.day} className={`relative transition-opacity duration-500 ${isReached ? 'opacity-100' : isNext ? 'opacity-80' : 'opacity-30'}`}>
                  {/* Timeline dot */}
                  <div className={`
                    absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 
                    ${isReached ? 'bg-zinc-200 border-zinc-200' : isNext ? 'bg-zinc-950 border-zinc-400' : 'bg-zinc-950 border-zinc-800'}
                  `} />
                  
                  <div className="flex items-start gap-4">
                    <div className={`
                      p-2 rounded-xl border
                      ${isReached ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}
                    `}>
                      <Icon size={20} />
                    </div>
                    
                    <div>
                      <div className="flex items-baseline gap-2">
                        <h3 className={`font-medium ${isReached ? 'text-zinc-200' : 'text-zinc-500'}`}>
                          {milestone.title}
                        </h3>
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
                          Day {milestone.day}
                        </span>
                      </div>
                      
                      {isNext && (
                        <p className="text-xs text-zinc-500 mt-1">
                          {milestone.day - streak} {milestone.day - streak === 1 ? 'day' : 'days'} away
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {showTogetherModal && (
          <TogetherBonusModal onClose={() => setShowTogetherModal(false)} streak={streak} />
        )}
        {showGuide && (
          <Guide onClose={() => setShowGuide(false)} />
        )}
        {showLiveGuide && (
          <LiveGuide onClose={() => setShowLiveGuide(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
