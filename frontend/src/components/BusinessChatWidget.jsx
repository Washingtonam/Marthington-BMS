import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiMessageCircle, FiMinus, FiSend, FiX } from "react-icons/fi";
import request from "../api/client.js";

const modes = [
  { value: "assistant", label: "Business assistant" },
  { value: "support", label: "Chat with support" }
];

const BusinessChatWidget = () => {
  const [enabled, setEnabled] = useState(null);
  const [accessError, setAccessError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("assistant");
  const [conversation, setConversation] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const checkAccess = useCallback(async () => {
    try {
      const result = await request("/support-chat/access");
      setEnabled(result.enabled === true);
      setAccessError("");
    } catch (loadError) {
      setEnabled(false);
      setAccessError(loadError.message || "Chat is temporarily unavailable.");
    }
  }, []);

  const loadConversation = useCallback(async (activeMode) => {
    try {
      setLoading(true);
      const result = await request(`/support-chat/threads/${activeMode}`);
      setConversation(result.conversation || null);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Could not load chat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAccess(); }, [checkAccess]);

  useEffect(() => {
    if (!isOpen || enabled !== true) return undefined;
    loadConversation(mode);
    const refresh = window.setInterval(() => loadConversation(mode), 12000);
    return () => window.clearInterval(refresh);
  }, [enabled, isOpen, loadConversation, mode]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages?.length, isOpen]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    try {
      setSending(true);
      setError("");
      const result = await request(`/support-chat/threads/${mode}/messages`, {
        method: "POST",
        body: JSON.stringify({ body })
      });
      setConversation(result.conversation || null);
      setDraft("");
    } catch (sendError) {
      setError(sendError.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  if (enabled === false && !accessError) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen && (
        <section className="mb-3 flex h-[min(78vh,620px)] w-[min(94vw,390px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="false" aria-labelledby="business-chat-title">
          <header className="bg-emerald-800 px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="business-chat-title" className="font-bold">Business chat</h2>
                <p className="mt-1 text-xs text-emerald-100">Ask your assistant or message Marthington support.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Minimize business chat" className="rounded-lg p-1.5 hover:bg-white/10"><FiMinus /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-emerald-950/30 p-1" role="tablist" aria-label="Chat mode">
              {modes.map((item) => (
                <button key={item.value} type="button" role="tab" aria-selected={mode === item.value} onClick={() => { setMode(item.value); setConversation(null); setError(""); }} className={`rounded-lg px-2 py-2 text-xs font-bold ${mode === item.value ? "bg-white text-emerald-900" : "text-emerald-100 hover:bg-white/10"}`}>{item.label}</button>
              ))}
            </div>
          </header>

          {mode === "support" && <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">Send a message and a superadmin will reply in this chat.</p>}
          {mode === "assistant" && <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">Answers use this business’s products, customers, invoices, and help guides.</p>}

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4" aria-live="polite">
            {loading && !conversation?.messages?.length && <p className="text-center text-xs text-slate-500">Loading conversation…</p>}
            {!loading && !conversation?.messages?.length && <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
              {mode === "assistant" ? "Hi! Ask about product stock, your top buyers, unpaid invoices, or how to use the dashboard." : "Tell us what you need help with. Your message will be visible to the superadmin support team."}
            </div>}
            {(conversation?.messages || []).map((message) => {
              const isOwn = message.senderRole === "user";
              const isAssistant = message.senderRole === "assistant";
              return (
                <div key={message._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${isOwn ? "rounded-br-md bg-emerald-700 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                    {!isOwn && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{isAssistant ? "Business assistant" : message.senderName || "Support"}</p>}
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <time className={`mt-1 block text-right text-[10px] ${isOwn ? "text-emerald-100" : "text-slate-400"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p>}
          <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
            <textarea aria-label="Chat message" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} maxLength={2000} rows={1} placeholder={mode === "assistant" ? "Ask about your business…" : "Write a message…"} className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message" className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><FiSend /></button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-label={isOpen ? "Close business chat" : "Open business chat"} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xl transition hover:scale-105 hover:bg-emerald-800">
        {isOpen ? <FiX size={22} /> : <FiMessageCircle size={23} />}
      </button>
      {accessError && !isOpen && <button type="button" onClick={() => { setIsOpen(true); checkAccess(); }} className="absolute bottom-16 right-0 w-56 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900 shadow-lg">{accessError} Retry</button>}
    </div>
  );
};

export default BusinessChatWidget;
