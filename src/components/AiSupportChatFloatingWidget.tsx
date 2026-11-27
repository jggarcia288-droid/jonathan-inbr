import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Bot, 
  ChevronDown, 
  HelpCircle, 
  CheckCircle2, 
  Loader2,
  ShieldCheck,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  '¿Cómo registro una camada de cachorros en INBR?',
  '¿Cuáles son las medidas del American Bully Pocket y Standard?',
  '¿Cómo se verifica un microchip o certificado con el QR?',
  '¿Qué requisitos piden para homologar un perro de otro club?',
  '¿Cómo descargo mi certificado oficial en PDF?',
];

export const AiSupportChatFloatingWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: '¡Hola! 🐾 Soy el **Asistente Oficial con IA de INBR** (International Breeds Registry).\n\nEstoy aquí para resolver en tiempo real tus dudas sobre:\n• 📜 **Registros:** Camadas, certificados oficiales y genealogía.\n• 🐕 **Estándares Raciales:** Medidas y conformación (Pocket, Standard, XL, Exotic, etc.).\n• 🔍 **Verificación:** Microchips notariados y lectura de códigos QR.\n• 📋 **Homologaciones:** Validación de registros previos de otros clubes.\n\n¿En qué te puedo ayudar hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Format history for server API
      const historyForApi = messages
        .filter((m) => m.id !== 'welcome-1')
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyForApi,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error en el servidor: ${res.status}`);
      }

      const data = await responseToJson(res);
      const replyText = data.reply || 'Disculpa, no pude procesar la respuesta. Intenta de nuevo.';

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Error enviando mensaje al chat de IA:', err);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'model',
        text: '🐾 **Atención:** En este momento nuestro motor de IA está procesando múltiples consultas o la conexión fue interrumpida. Puedes consultar la sección de **Estándares Raciales** o **Formularios** en el menú superior, o intentar de nuevo en unos segundos.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper safely parsing json
  const responseToJson = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return { reply: 'Respuesta recibida en formato no estándar.' };
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: '¡Conversación reiniciada! 🐾 Pregúntame lo que necesites sobre registros, camadas, pedigrí o estándares raciales oficiales de INBR.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Format assistant markdown bold and bullets
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-1 text-xs leading-relaxed">
        {lines.map((line, index) => {
          if (!line.trim()) return <div key={index} className="h-1.5" />;
          
          // Bold formatting **text**
          const parts = line.split(/(\*\*.*?\*\*)/g);
          const renderedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-[#FFE885]">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });

          // Bullet point check
          if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
            return (
              <div key={index} className="flex items-start gap-1.5 pl-1">
                <span className="text-[#D4AF37] font-bold">•</span>
                <span className="flex-1">{renderedLine}</span>
              </div>
            );
          }

          return <p key={index}>{renderedLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      {/* ===================================================================== */}
      {/* 1. FLOATING CHAT BUTTON (TRIGGER)                                    */}
      {/* ===================================================================== */}
      {!isOpen && (
        <div className="relative group">
          {/* Welcome Speech Bubble Pill */}
          {hasUnreadNotification && (
            <div className="absolute -top-12 right-0 bg-[#16130B] border border-[#D4AF37] text-white px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 text-[11px] font-mono whitespace-nowrap animate-bounce">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>¿Dudas con un registro? ¡Pregúntame!</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHasUnreadNotification(false);
                }}
                className="text-neutral-400 hover:text-white text-xs pl-1"
              >
                ✕
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
              setHasUnreadNotification(false);
            }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gold-gradient text-black font-black text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(212,175,55,0.6)] border-2 border-[#FFE885] cursor-pointer"
            title="Abrir chat de soporte con Inteligencia Artificial Gemini"
          >
            <div className="relative">
              <Bot className="w-5 h-5 text-black" />
              <Sparkles className="w-3 h-3 text-amber-900 absolute -top-1 -right-1 animate-spin" />
            </div>
            <span className="hidden sm:inline tracking-wide font-serif">Asistente IA INBR</span>
            <span className="text-[10px] bg-black text-[#FFE885] px-2 py-0.5 rounded-full font-mono font-bold">
              GEMINI
            </span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. CHAT WINDOW (CARD / MODAL)                                        */}
      {/* ===================================================================== */}
      {isOpen && (
        <div 
          className={`w-[92vw] sm:w-[420px] max-w-[440px] bg-[#0C0B08]/95 backdrop-blur-2xl border-2 border-[#D4AF37] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(212,175,55,0.3)] flex flex-col overflow-hidden transition-all duration-200 animate-fadeIn ${
            isMinimized ? 'h-[72px]' : 'h-[580px] max-h-[82vh]'
          }`}
        >
          {/* A. HEADER */}
          <div className="p-3.5 sm:p-4 bg-[#14110A] border-b border-[#D4AF37]/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] p-0.5 bg-black overflow-hidden shadow">
                  <img src="/logo-inbr.jpg" alt="INBR Logo" className="w-full h-full object-cover rounded-full" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-black font-serif text-white uppercase tracking-wider">
                    Asistente Virtual INBR
                  </h4>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#FFE885] border border-[#D4AF37]/40">
                    IA
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Soporte Oficial 24/7 • Gemini 3.8</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-neutral-400">
              {/* Reiniciar chat */}
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                title="Limpiar conversación"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Minimizar */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Cerrar */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-rose-400 transition-colors"
                title="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* B. CHAT BODY (Visible when not minimized) */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-[#080705]/90">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md ${
                        msg.role === 'user'
                          ? 'bg-gold-gradient text-black font-medium rounded-tr-none shadow-[0_4px_15px_rgba(212,175,55,0.2)]'
                          : 'bg-[#18150E] text-neutral-200 border border-[#D4AF37]/40 rounded-tl-none'
                      }`}
                    >
                      {msg.role === 'model' ? (
                        renderFormattedText(msg.text)
                      ) : (
                        <p className="text-xs leading-relaxed font-sans">{msg.text}</p>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-neutral-500 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono p-2 rounded-xl bg-[#14120B] border border-[#D4AF37]/30 max-w-[80%] animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                    <span>Consultando base de conocimientos INBR...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* C. QUICK SUGGESTIONS CAROUSEL */}
              {messages.length <= 3 && !isLoading && (
                <div className="px-3 py-2 bg-[#120F08] border-t border-neutral-800 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono scrollbar-none">
                  <span className="text-neutral-500 shrink-0 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-[#D4AF37]" /> Sugerencias:
                  </span>
                  {QUICK_QUESTIONS.slice(0, 3).map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="whitespace-nowrap px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37] hover:text-[#FFE885] text-neutral-300 transition-all shrink-0 cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* D. INPUT BAR */}
              <div className="p-3 bg-[#110E07] border-t border-[#D4AF37]/50">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Escribe tu duda sobre registros o razas..."
                    disabled={isLoading}
                    className="flex-1 bg-black border border-[#D4AF37]/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FFE885] font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2.5 rounded-xl bg-gold-gradient text-black hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow cursor-pointer shrink-0"
                    title="Enviar mensaje"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </form>

                <div className="flex items-center justify-between mt-2 px-1 text-[9px] font-mono text-neutral-500">
                  <span>Impulsado por Gemini 3.8 Flash</span>
                  <span className="text-[#D4AF37]">INBR Suite 2026</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
