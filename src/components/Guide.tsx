import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Mic, Image as ImageIcon, Send, BrainCircuit, X, Loader2 } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function Guide({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, image?: string}[]>([
    { role: 'model', text: 'I am the Architect. Ask me about building discipline, resolving conflict, or the path to agency.' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [useDeepThink, setUseDeepThink] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{data: string, mimeType: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    
    const userText = input;
    const userImage = selectedImage;
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userText,
      image: userImage ? `data:${userImage.mimeType};base64,${userImage.data}` : undefined
    }]);
    
    setInput('');
    setSelectedImage(null);
    setIsThinking(true);
    
    try {
      const parts: any[] = [];
      if (userText) parts.push({ text: userText });
      if (userImage) {
        parts.push({
          inlineData: {
            data: userImage.data,
            mimeType: userImage.mimeType
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: 'You are the Architect, a guide for couples building discipline and agency. Tone: stoic, warm, mature, zero-fluff.',
          thinkingConfig: useDeepThink ? { thinkingLevel: ThinkingLevel.HIGH } : undefined
        }
      });
      
      setMessages(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: 'Connection to the Architect failed.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({
        data: base64String,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            setIsThinking(true);
            try {
              const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{
                  parts: [
                    { inlineData: { data: base64Audio, mimeType: 'audio/webm' } },
                    { text: 'Transcribe this audio accurately.' }
                  ]
                }]
              });
              if (response.text) {
                setInput(prev => prev + (prev ? ' ' : '') + response.text);
              }
            } catch (e) {
              console.error('Transcription failed', e);
            } finally {
              setIsThinking(false);
            }
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Microphone access denied', e);
      }
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col"
    >
      <header className="pt-12 pb-4 px-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-mono text-zinc-300 uppercase tracking-widest">The Architect</h2>
          <p className="text-xs text-zinc-500 mt-1">Guidance & Analysis</p>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-2">
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm'
            }`}>
              {msg.image && (
                <img src={msg.image} alt="Uploaded" className="w-full rounded-lg mb-3 object-cover max-h-48" />
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-zinc-500" />
              <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Processing</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="h-16 rounded-md border border-zinc-700" alt="Preview" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-zinc-800 rounded-full p-1 border border-zinc-700"
            >
              <X size={12} />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-2 mb-3">
          <button 
            onClick={() => setUseDeepThink(!useDeepThink)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-colors ${
              useDeepThink ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            <BrainCircuit size={14} />
            Deep Think
          </button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center overflow-hidden focus-within:border-zinc-600 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ImageIcon size={20} />
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask the Architect..."
              className="flex-1 bg-transparent py-3 px-2 text-sm focus:outline-none resize-none max-h-32 min-h-[44px]"
              rows={1}
            />
            
            <button 
              onClick={toggleRecording}
              className={`p-3 transition-colors ${isRecording ? 'text-red-400 animate-pulse' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Mic size={20} />
            </button>
          </div>
          
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isThinking}
            className="p-3 bg-zinc-100 text-zinc-950 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
