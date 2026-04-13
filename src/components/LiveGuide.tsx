import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, X, Activity } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function LiveGuide({ onClose }: { onClose: () => void }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Audio playback queue
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      sourceNodeRef.current.connect(processorNodeRef.current);
      processorNodeRef.current.connect(audioContextRef.current.destination);
      
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the Architect, a stoic and wise guide for a couple building discipline. Keep responses concise and impactful.",
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            processorNodeRef.current!.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for UI
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              setVolume(Math.sqrt(sum / inputData.length));

              // Convert Float32 to Int16
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }
              
              // Convert to Base64
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = '';
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = btoa(binary);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              playAudioChunk(base64Audio);
            }
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
            }
          },
          onclose: () => {
            disconnect();
          },
          onerror: (err) => {
            console.error(err);
            setError("Connection error");
            disconnect();
          }
        }
      });
      
      sessionRef.current = await sessionPromise;
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect");
      disconnect();
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current) return;
    
    // Decode base64 to Int16Array
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    
    // Convert Int16 to Float32
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }
    
    audioQueueRef.current.push(float32);
    scheduleNextAudio();
  };

  const scheduleNextAudio = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return;
    
    isPlayingRef.current = true;
    const float32 = audioQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000); // Output rate is 24000
    audioBuffer.getChannelData(0).set(float32);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    const currentTime = audioContextRef.current.currentTime;
    const playTime = Math.max(currentTime, nextPlayTimeRef.current);
    
    source.start(playTime);
    nextPlayTimeRef.current = playTime + audioBuffer.duration;
    
    source.onended = () => {
      isPlayingRef.current = false;
      scheduleNextAudio();
    };
  };

  const disconnect = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-zinc-950/95 backdrop-blur-md"
    >
      <button 
        onClick={onClose}
        className="absolute top-12 right-6 text-zinc-500 hover:text-zinc-300 p-2"
      >
        <X size={24} />
      </button>

      <div className="text-center mb-12">
        <h2 className="text-xl font-mono text-zinc-200 uppercase tracking-widest mb-2">Live Counsel</h2>
        <p className="text-sm text-zinc-500">Speak directly with the Architect</p>
      </div>

      <div className="relative mb-12">
        {isConnected && (
          <motion.div 
            className="absolute inset-0 rounded-full bg-indigo-500/20"
            animate={{ scale: 1 + volume * 2, opacity: 0.5 + volume }}
            transition={{ type: 'tween', duration: 0.1 }}
          />
        )}
        
        <button
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center border-2 transition-colors ${
            isConnected 
              ? 'bg-zinc-900 border-indigo-500/50 text-indigo-400' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
          }`}
        >
          {isConnecting ? (
            <Activity className="animate-pulse" size={32} />
          ) : isConnected ? (
            <Mic size={32} />
          ) : (
            <MicOff size={32} />
          )}
        </button>
      </div>

      <div className="h-8">
        {error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : isConnecting ? (
          <p className="text-zinc-500 text-sm font-mono uppercase tracking-widest animate-pulse">Connecting...</p>
        ) : isConnected ? (
          <p className="text-indigo-400 text-sm font-mono uppercase tracking-widest">Listening</p>
        ) : (
          <p className="text-zinc-600 text-sm font-mono uppercase tracking-widest">Tap to Connect</p>
        )}
      </div>
    </motion.div>
  );
}
