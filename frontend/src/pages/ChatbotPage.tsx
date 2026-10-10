import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT, SUPPORTED_LANGUAGES } from '../utils/i18n.js';
import {
  MessageSquare,
  Send,
  Plus,
  Sparkles,
  Shield,
  FileText,
  AlertTriangle,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  Eye,
  Volume2,
  VolumeX,
  Share2,
  HelpCircle,
  Pill,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { Conversation, ChatMessage, Citation, Language } from '../types/index.js';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal.js';

export const ChatbotPage: React.FC = () => {
  const { language } = useAuth();
  const t = getT(language);
  const location = useLocation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatLanguage, setChatLanguage] = useState<Language>(language);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [copiedMessageIdx, setCopiedMessageIdx] = useState<number | null>(null);
  const [previewDocData, setPreviewDocData] = useState<any | null>(null);
  const [speakingMessageIdx, setSpeakingMessageIdx] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync chat language with global language when switched
  useEffect(() => {
    setChatLanguage(language);
  }, [language]);

  // Handle Text-to-Speech audio
  const handleToggleSpeech = (text: string, idx: number) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (speakingMessageIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingMessageIdx(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean citations like [Doc: ..., Page: 1] from speech audio for smoother listening
    const cleanText = text.replace(/\[Doc:[^\]]+\]/g, '').replace(/[*_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Map language code to BCP 47 voice tag
    const voiceLangMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      bn: 'bn-IN',
      mr: 'mr-IN',
      es: 'es-ES',
    };
    utterance.lang = voiceLangMap[chatLanguage] || 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => {
      setSpeakingMessageIdx(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageIdx(null);
    };

    setSpeakingMessageIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Check if routed with a prefill query (e.g. from summary modal)
  useEffect(() => {
    const prefill = (location.state as any)?.prefillQuery;
    if (prefill && typeof prefill === 'string') {
      setInputText(prefill);
    }
  }, [location.state]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations);
        if (res.data.conversations.length > 0 && !activeConvId) {
          setActiveConvId(res.data.conversations[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      setLoadingMessages(true);
      const res = await api.get(`/chat/conversations/${convId}/messages`);
      if (res.data.success) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    }
  }, [activeConvId]);

  const handleCreateNewConversation = async () => {
    try {
      const res = await api.post('/chat/conversations', { title: 'New Health Discussion' });
      if (res.data.success) {
        const newConv = res.data.conversation;
        setConversations([newConv, ...conversations]);
        setActiveConvId(newConv._id);
        setMessages([]);
      }
    } catch (err) {
      alert('Failed to create new conversation');
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || sending) return;

    let convId = activeConvId;
    if (!convId) {
      const res = await api.post('/chat/conversations', { title: textToSend.slice(0, 30) });
      convId = res.data.conversation._id;
      setActiveConvId(convId);
      setConversations([res.data.conversation, ...conversations]);
    }

    const optimisticUserMsg: ChatMessage = {
      sender: 'user',
      text: textToSend.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputText('');
    setSending(true);

    try {
      const res = await api.post(`/chat/conversations/${convId}/messages`, {
        text: textToSend.trim(),
        language: chatLanguage,
      });

      if (res.data.success) {
        setMessages((prev) => [...prev, res.data.assistantMessage]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        sender: 'assistant',
        text: `Notice: ${err.response?.data?.error || 'Unable to retrieve answer. Please try again.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const smartPromptCards = [
    {
      category: 'Diagnostic Explainer',
      title: 'Explain My Lab Results in Plain Language',
      query: 'Please explain my recent laboratory test results in simple, plain language. What does each test measure and are they normal?',
      icon: Activity,
    },
    {
      category: 'Risk & Flags',
      title: 'Any Out-of-Range or High Values?',
      query: 'Are there any abnormal, high, or flagged test values across my uploaded medical documents? What are the standard ranges?',
      icon: AlertTriangle,
    },
    {
      category: 'Prescription Review',
      title: 'Check Active Medicines & Dosages',
      query: 'List all active medications prescribed across my documents, including dosage, frequency, and instructions.',
      icon: Pill,
    },
    {
      category: 'Doctor Appointment',
      title: 'Questions for My Next Doctor Visit',
      query: 'Based on my recent lab investigations and history, what 3 to 4 specific questions should I ask my physician at my next visit?',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-4">
      {/* Left Sidebar: Conversations List */}
      <div className="w-full md:w-64 bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col shadow-xs shrink-0">
        <button
          onClick={handleCreateNewConversation}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all mb-3 shadow-sm shadow-emerald-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t.chat.newChat}
        </button>

        <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
          Conversations ({conversations.length})
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {conversations.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">No previous conversations.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => setActiveConvId(conv._id)}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition-all truncate flex items-center gap-2 cursor-pointer ${
                  activeConvId === conv._id
                    ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/70 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Grounded Clinical Assistant</span>
          <Shield className="w-3 h-3 text-emerald-600" />
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 flex flex-col shadow-xs overflow-hidden">
        {/* Chat Header */}
        <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-slate-900 text-xs">
                  {t.chat.title}
                </h2>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                  RAG Grounded
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                {t.chat.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
              {t.chat.answerIn}
            </span>
            <select
              value={chatLanguage}
              onChange={(e) => setChatLanguage(e.target.value as Language)}
              className="px-2.5 py-1 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-700 outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.nativeName} ({lang.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Medical Urgent Warning Banner */}
        <div className="bg-amber-50/90 px-4 py-2 border-b border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="font-medium leading-tight">{t.chat.urgentAlert}</span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto p-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center shadow-xs ring-1 ring-emerald-200/50">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {t.chat.samplePromptTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
                  Ask anything about your blood tests, doctor instructions, dosage schedules, or historical biomarker trends.
                </p>
              </div>

              {/* Smart Prompts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2 text-left">
                {smartPromptCards.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(card.query)}
                      className="p-3 bg-slate-50/80 hover:bg-emerald-50/80 hover:border-emerald-300 border border-slate-200/90 rounded-xl text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                        <Icon className="w-3 h-3" />
                        <span>{card.category}</span>
                      </div>
                      <p className="font-bold text-xs text-slate-800 group-hover:text-emerald-900 leading-snug">
                        {card.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 space-y-2.5 relative group shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                      : 'bg-slate-50/90 border border-slate-200/90 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap leading-relaxed text-xs">
                      {msg.text}
                    </p>

                    {msg.sender === 'assistant' && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Audio Listen Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleSpeech(msg.text, idx)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            speakingMessageIdx === idx
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={speakingMessageIdx === idx ? 'Stop Audio' : 'Listen with Audio Voice'}
                        >
                          {speakingMessageIdx === idx ? (
                            <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Copy Answer Button */}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                            setCopiedMessageIdx(idx);
                            setTimeout(() => setCopiedMessageIdx(null), 2000);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                          title="Copy Answer"
                        >
                          {copiedMessageIdx === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Grounded Source Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-200 mt-2 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider">
                        {t.chat.citations}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c, cIdx) => (
                          <button
                            type="button"
                            key={cIdx}
                            onClick={async () => {
                              if (c.documentId) {
                                try {
                                  const res = await api.get(`/documents/${c.documentId}`);
                                  if (res.data.success) {
                                    setPreviewDocData(res.data.document);
                                  }
                                } catch (err) {
                                  console.error('Failed to preview citation doc', err);
                                }
                              }
                            }}
                            className="bg-white hover:bg-emerald-50 border border-emerald-200/90 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer font-medium"
                            title="Click to view cited document page"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                              {c.documentTitle}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">p.{c.pageNumber}</span>
                            {c.documentId && <Eye className="w-3 h-3 text-slate-400 ml-0.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-3 text-xs justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-700 flex items-center gap-3 shadow-2xs">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.3s]"></span>
                </div>
                <span className="text-xs font-semibold">
                  Synthesizing clinical answer strictly grounded in your health records...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3.5 pt-2 pb-1 bg-slate-50/70 border-t border-slate-200/70 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" /> Suggested:
          </span>
          {[
            { label: 'Summarize latest lab', q: 'Summarize my latest laboratory investigation report' },
            { label: 'Any abnormal findings?', q: 'Do I have any abnormal lab test values across my records?' },
            { label: 'Prescribed medicines', q: 'List my active medications, dosages, and instructions' },
            { label: 'Questions for doctor', q: 'What questions should I ask my doctor about my test results?' },
            { label: 'Diet & lifestyle notes', q: 'What dietary and lifestyle recommendations apply to my results?' },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={sending}
              onClick={() => handleSendMessage(item.q)}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-600 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.chat.placeholder}
              disabled={sending}
              className="flex-1 p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all disabled:opacity-40 shadow-sm cursor-pointer hover:shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Document Citation Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDocData)}
        onClose={() => setPreviewDocData(null)}
        document={previewDocData}
      />
    </div>
  );
};
