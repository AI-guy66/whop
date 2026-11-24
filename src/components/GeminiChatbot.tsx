import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Trash2, X } from 'lucide-react';

type RolePreset = 'concierge' | 'strategist' | 'copywriter' | 'analyst';
type TaskMode = 'general' | 'fast' | 'interactive' | 'reasoning';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

const ROLE_OPTIONS: {
  id: RolePreset;
  label: string;
  description: string;
  starters: string[];
}[] = [
  {
    id: 'concierge',
    label: 'Marketplace Concierge',
    description: 'Finds products, compares pricing, and explains Whop Apps.',
    starters: [
      'Which Whop is best for learning production AI agents?',
      'How do Whop Apps work for members?',
    ],
  },
  {
    id: 'strategist',
    label: 'Creator Strategist',
    description: 'Designs pricing tiers, offers, and member retention loops.',
    starters: [
      'Help me structure a $49/mo software + community Whop.',
      'How should I reduce monthly member churn?',
    ],
  },
  {
    id: 'copywriter',
    label: 'Launch Copywriter',
    description: 'Drafts crisp taglines, storefront copy, and member perks.',
    starters: [
      'Write a tagline and 4 perks for a Figma UI kit Whop.',
      'Tighten my storefront headline for higher conversion.',
    ],
  },
  {
    id: 'analyst',
    label: 'Growth Analyst',
    description: 'Models LTV, churn sensitivity, and 3% fee unit economics.',
    starters: [
      'Model net earnings for 150 members at $79/mo after 3% fee.',
      'Compare monthly vs quarterly billing cashflow.',
    ],
  },
];

const MODEL_OPTIONS: {
  id: TaskMode;
  label: string;
  modelName: string;
}[] = [
  { id: 'general', label: 'General', modelName: 'gemini-4-hydrogen' },
  { id: 'fast', label: 'Fast', modelName: 'gemini-3.1-flash-lite' },
  { id: 'interactive', label: 'Interactive', modelName: 'gemini-4-neon' },
  { id: 'reasoning', label: 'Deep Reasoning', modelName: 'gemini-4-carbon' },
];

export const GeminiChatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [rolePreset, setRolePreset] = useState<RolePreset>('concierge');
  const [taskMode, setTaskMode] = useState<TaskMode>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const activeRole =
    ROLE_OPTIONS.find((r) => r.id === rolePreset) || ROLE_OPTIONS[0];
  const activeModel =
    MODEL_OPTIONS.find((m) => m.id === taskMode) || MODEL_OPTIONS[0];

  useEffect(() => {
    if (open) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, loading]);

  const sendMessage = async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textOverride) setInput('');
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          rolePreset,
          taskMode,
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        modelUsed?: string;
        error?: string;
      };

      if (!response.ok || !data.reply) {
        setErrorMsg(
          data.error || 'Unable to reach Gemini right now. Please try again.'
        );
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          role: 'model',
          text: data.reply!,
          modelUsed: data.modelUsed,
        },
      ]);
    } catch {
      setErrorMsg('Network error communicating with the chat server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  return (
    <>
      {/* Floating Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Whop AI Assistant"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold rounded-xl shadow-lg transition-colors"
        >
          <MessageSquare className="w-4 h-4 text-[#FA4616]" />
          <span>Whop Assistant</span>
        </button>
      )}

      {/* Multi-Turn Chat Drawer */}
      {open && (
        <section
          aria-label="Whop Gemini Assistant"
          className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[82vh] bg-white border border-neutral-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-neutral-200 flex items-center justify-between gap-3 bg-white">
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-[#111111] truncate">
                Whop AI Assistant
              </h2>
              <p className="text-[11px] text-neutral-500 truncate">
                {activeRole.label} · {activeModel.modelName}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setErrorMsg(null);
                  }}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className="p-2 text-neutral-500 hover:text-[#111111] rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="p-2 text-neutral-500 hover:text-[#111111] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Role & Model Controls */}
          <div className="px-4 py-2.5 border-b border-neutral-200 bg-[#FAFAFA] grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="chatbot-role"
                className="block text-[10px] font-semibold text-neutral-500 mb-1"
              >
                Assistant Role
              </label>
              <select
                id="chatbot-role"
                value={rolePreset}
                onChange={(e) => setRolePreset(e.target.value as RolePreset)}
                className="w-full h-8 px-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="chatbot-model"
                className="block text-[10px] font-semibold text-neutral-500 mb-1"
              >
                Task Routing
              </label>
              <select
                id="chatbot-model"
                value={taskMode}
                onChange={(e) => {
                  setTaskMode(e.target.value as TaskMode);
                  setErrorMsg(null);
                }}
                className="w-full h-8 px-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.modelName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scrollable Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
            {messages.length === 0 ? (
              <div className="space-y-4 py-2">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {activeRole.description} Ask a follow-up question anytime—conversation history is preserved across turns.
                </p>
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-neutral-400">
                    Suggested prompts
                  </div>
                  {activeRole.starters.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="w-full text-left px-3 py-2.5 text-xs text-[#111111] bg-[#FAFAFA] hover:bg-neutral-100 border border-neutral-200 rounded-xl transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#111111] text-white'
                        : 'bg-[#FAFAFA] border border-neutral-200 text-[#111111]'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.modelUsed && (
                    <span className="text-[10px] font-mono text-neutral-400 mt-1 px-1">
                      {msg.modelUsed}
                    </span>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-start">
                <div className="bg-[#FAFAFA] border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-500">
                  Thinking with {activeModel.modelName}...
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs space-y-2">
                <p>{errorMsg}</p>
                {(taskMode === 'interactive' || taskMode === 'reasoning') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTaskMode('general');
                      setErrorMsg(null);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#111111] text-white rounded-md"
                  >
                    Switch to gemini-4-hydrogen
                  </button>
                )}
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-neutral-200 bg-[#FAFAFA] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${activeRole.label}...`}
              aria-label="Message Whop AI Assistant"
              className="flex-1 h-10 px-3.5 bg-white border border-neutral-200 rounded-xl text-xs text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:border-[#111111]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="h-10 px-3.5 bg-[#FA4616] hover:bg-[#e03a0c] disabled:opacity-50 text-white rounded-xl inline-flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}
    </>
  );
};
