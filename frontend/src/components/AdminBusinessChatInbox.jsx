import React from "react";
import { useCallback, useEffect, useState } from "react";
import request from "../api/client.js";

const filters = [
  ["all", "All chats"],
  ["assistant", "Assistant"],
  ["support", "Support"]
];

const AdminBusinessChatInbox = () => {
  const [mode, setMode] = useState("all");
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadThreads = useCallback(async () => {
    try {
      const query = mode === "all" ? "" : `?mode=${mode}`;
      const result = await request(`/support-chat/admin/threads${query}`);
      setThreads(result.conversations || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Could not load business chats.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const loadThread = useCallback(async (id) => {
    if (!id) return;
    try {
      const result = await request(`/support-chat/admin/threads/${id}`);
      setConversation(result.conversation || null);
    } catch (loadError) {
      setError(loadError.message || "Could not load chat thread.");
    }
  }, []);

  useEffect(() => {
    loadThreads();
    const timer = window.setInterval(loadThreads, 15000);
    return () => window.clearInterval(timer);
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedId) return undefined;
    loadThread(selectedId);
    const timer = window.setInterval(() => loadThread(selectedId), 12000);
    return () => window.clearInterval(timer);
  }, [loadThread, selectedId]);

  useEffect(() => {
    if (!selectedId || threads.some((thread) => thread._id === selectedId)) return;
    setSelectedId("");
    setConversation(null);
  }, [selectedId, threads]);

  const sendReply = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId || sending) return;
    try {
      setSending(true);
      setError("");
      const result = await request(`/support-chat/admin/threads/${selectedId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body })
      });
      setConversation(result.conversation || null);
      setDraft("");
      await loadThreads();
    } catch (sendError) {
      setError(sendError.message || "Could not send support reply.");
    } finally {
      setSending(false);
    }
  };

  const openThread = (thread) => {
    setSelectedId(thread._id);
    setConversation(thread);
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-labelledby="business-chat-inbox-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 id="business-chat-inbox-title" className="text-lg font-extrabold text-slate-900">Business chats</h2>
          <p className="mt-1 text-sm text-slate-500">Automated assistant conversations and direct support messages from business workspaces.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter chats">
          {filters.map(([value, label]) => <button key={value} type="button" onClick={() => { setMode(value); setSelectedId(""); setConversation(null); }} aria-pressed={mode === value} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${mode === value ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"}`}>{label}</button>)}
        </div>
      </div>

      {error && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">{error}</p>}

      <div className="grid min-h-[440px] lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.5fr)]">
        <div className="max-h-[560px] overflow-y-auto border-b border-slate-100 lg:border-b-0 lg:border-r">
          {loading && <p className="p-5 text-sm text-slate-500">Loading chats…</p>}
          {!loading && !threads.length && <p className="p-5 text-sm text-slate-500">No business chat messages yet.</p>}
          <ul className="divide-y divide-slate-100">
            {threads.map((thread) => {
              const latest = thread.messages?.[thread.messages.length - 1];
              return (
                <li key={thread._id}>
                  <button type="button" onClick={() => openThread(thread)} className={`w-full p-4 text-left transition hover:bg-slate-50 ${selectedId === thread._id ? "bg-emerald-50/70" : ""}`}>
                    <span className="flex items-center justify-between gap-2">
                      <strong className="truncate text-sm text-slate-900">{thread.business?.name || "Business workspace"}</strong>
                      {thread.unreadForAdmin && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" aria-label="Unread chat" />}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${thread.mode === "assistant" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>{thread.mode === "assistant" ? "Automated" : "Support"}</span>
                      <time className="text-[10px] text-slate-400">{thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : ""}</time>
                    </span>
                    <span className="mt-2 block truncate text-xs text-slate-500">{latest?.senderName || "User"}: {latest?.body || "No messages"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-h-[440px] flex-col">
          {!conversation && <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">Select a conversation to read the full history.</div>}
          {conversation && <>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">{conversation.business?.name || "Business workspace"}</h3>
              <p className="mt-1 text-xs text-slate-500">{conversation.mode === "assistant" ? "Automated assistant history · read only" : "Support conversation"}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
              {(conversation.messages || []).map((message) => {
                const own = message.senderRole === "super_admin";
                return <div key={message._id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${own ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                    <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${own ? "text-emerald-100" : "text-slate-500"}`}>{message.senderName || (message.senderRole === "assistant" ? "Business assistant" : "Business user")}</p>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <time className={`mt-1 block text-right text-[10px] ${own ? "text-emerald-100" : "text-slate-400"}`}>{new Date(message.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</time>
                  </div>
                </div>;
              })}
            </div>
            {conversation.mode === "support" && <form onSubmit={sendReply} className="flex items-end gap-2 border-t border-slate-200 p-3">
              <textarea aria-label="Support reply" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Write a support reply…" className="min-h-11 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
              <button type="submit" disabled={!draft.trim() || sending} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{sending ? "Sending…" : "Reply"}</button>
            </form>}
          </>}
        </div>
      </div>
    </section>
  );
};

export default AdminBusinessChatInbox;
