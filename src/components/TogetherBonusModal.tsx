import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { Volume2, X } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function TogetherBonusModal({ onClose, streak }: { onClose: () => void, streak: number }) {
  const [progress, setProgress] = useState(0);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    if (verified) return;
    setProgress(0);
    holdTimer.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(holdTimer.current!);
          handleVerified();
          return 100;
        }
        return p + 2;
      });
    }, 40); // 2 seconds total
  };

  const stopHold = () => {
    if (verified) return;
    if (holdTimer.current) clearInterval(holdTimer.current);
    setProgress(0);
  };

  const handleVerified = async () => {
    setVerified(true);
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: `Generate a short, powerful, 2-sentence message of encouragement for a couple who just completed a shared moment of intentionality. Their current discipline streak is ${streak} days. Tone: stoic, warm, architectural, mature. Do not use hashtags or emojis.`,
      });
      setMessage(response.text || 'Your alliance is verified. Keep building.');
    } catch (e) {
      setMessage('Your alliance is verified. Keep building.');
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = async () => {
    if (audioData) {
      const audio = new Audio(`data:audio/wav;base64,${audioData}`);
      audio.play();
      return;
    }
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: message }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' }
            }
          }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        setAudioData(base64Audio);
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.play();
      }
    } catch (e) {
      console.error("TTS error", e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h2 className="text-lg font-medium">Strategic Alliance</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>
        
        {!verified ? (
          <div className="flex flex-col items-center relative z-10">
            <p className="text-sm text-zinc-400 mb-8 text-center leading-relaxed">
              Place both fingers on the circle below to verify your shared intentionality.
            </p>
            
            <button
              onPointerDown={startHold}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              className="relative w-32 h-32 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden select-none touch-none"
            >
              <div 
                className="absolute bottom-0 left-0 right-0 bg-zinc-800 transition-all duration-75"
                style={{ height: `${progress}%` }}
              />
              <span className="relative z-10 text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Hold
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center relative z-10 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mb-6">
              <div className="w-8 h-8 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            
            {isGenerating ? (
              <p className="text-sm text-zinc-500 font-mono uppercase tracking-widest animate-pulse">
                Synthesizing...
              </p>
            ) : (
              <div className="text-center">
                <p className="text-zinc-300 leading-relaxed mb-6 font-serif italic">
                  "{message}"
                </p>
                <button 
                  onClick={playAudio}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-xs font-mono uppercase tracking-widest"
                >
                  <Volume2 size={14} /> Listen
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
