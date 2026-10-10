import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      // Create one on the fly if none active
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
        text: `Error: ${err.response?.data?.error || 'Unable to retrieve answer. Please try again.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const samplePrompts = [
    'Summarize my latest laboratory investigation report',
    'What was my Fasting Blood Sugar value in my last two tests?',
    'Which medicines are recorded in my uploaded prescriptions?',
    'Explain my test results in Telugu or Hindi',
  ];

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-4">
      {/* Left Sidebar: Conversations List */}
      <div className="w-full md:w-64 bg-white rounded-xl border border-slate-200 p-3 flex flex-col shadow-sm shrink-0">
        <button
          onClick={handleCreateNewConversation}
          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mb-3 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-4">No previous conversations.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => setActiveConvId(conv._id)}
                className={`w-full text-left p-2 rounded-lg text-xs transition-colors truncate flex items-center gap-2 ${
                  activeConvId === conv._id
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-xs">Swasthya Copilot Clinical RAG</h2>
              <p className="text-[10px] text-slate-500">Strictly grounded in your authenticated health records</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Answer in:</span>
            <select
              value={chatLanguage}
              onChange={(e) => setChatLanguage(e.target.value as Language)}
              className="px-2 py-1 border border-slate-300 rounded text-xs bg-white font-medium"
            >
              <option value="en">English</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>
        </div>

        {/* Medical Urgent Escalation Banner */}
        <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            {t.chat.urgentAlert}
          </span>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Ask questions about your health records</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Answers cite exact original document pages. Unverified drafts are clearly flagged.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="grid grid-cols-1 gap-2 w-full pt-2">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-2.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-lg text-left text-xs text-slate-700 transition-colors"
                  >
                    "{prompt}"
                  </button>
                ))}
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
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 space-y-2 relative group shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    {msg.sender === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          setCopiedMessageIdx(idx);
                          setTimeout(() => setCopiedMessageIdx(null), 2000);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded transition-opacity cursor-pointer shrink-0"
                        title="Copy answer"
                      >
                        {copiedMessageIdx === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Grounded Source Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/80 mt-2 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">
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
                            className="bg-white hover:bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 text-[11px] text-slate-700 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title="Click to preview cited document"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span className="font-semibold text-slate-900 truncate max-w-[140px]">{c.documentTitle}</span>
                            <span className="text-slate-400 font-mono">• p.{c.pageNumber}</span>
                            {c.documentId && <Eye className="w-2.5 h-2.5 text-slate-400 ml-0.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-2xs">
                    U
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-3 text-xs justify-start animate-fade-in">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600 flex items-center gap-2.5">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.3s]"></span>
                </div>
                <span className="text-xs font-medium">Analyzing verified medical records & formulating grounded response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 pt-2 pb-1 bg-slate-50/70 border-t border-slate-200/60 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick:
          </span>
          {[
            { label: 'Summarize latest report', q: 'Summarize my latest laboratory investigation report' },
            { label: 'Abnormal lab values', q: 'Do I have any abnormal lab test values across my records?' },
            { label: 'Active medications', q: 'List my active medications, dosages, and instructions' },
            { label: 'Doctor questions', q: 'What questions should I ask my doctor about my test results?' },
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
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all disabled:opacity-40 shadow-sm cursor-pointer hover:shadow-md"
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
