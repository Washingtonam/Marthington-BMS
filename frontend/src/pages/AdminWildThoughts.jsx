import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiEdit2, FiMic, FiPlus, FiSave, FiSquare, FiTrash2, FiX, FiZap } from "react-icons/fi";
import request from "../api/client.js";

const categories = [
  ["product", "Product"],
  ["marketing", "Marketing"],
  ["sales", "Sales"],
  ["operations", "Operations"],
  ["customer_experience", "Customer experience"],
  ["finance", "Finance"],
  ["new_venture", "New venture"],
  ["other", "Other"]
];

const statuses = [
  ["captured", "Captured"],
  ["planned", "Planned"],
  ["in_progress", "In progress"],
  ["done", "Done"]
];

const blankThought = {
  title: "",
  thought: "",
  venture: "",
  category: "other",
  priority: "medium",
  status: "captured",
  nextAction: "",
  reviewDate: ""
};

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

const formatLabel = (value, options) => options.find(([key]) => key === value)?.[1] || value;

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const suggestCategory = (text) => {
  const value = text.toLowerCase();
  const suggestions = [
    ["marketing", /\b(marketing|advert|campaign|social media|promot|brand|content)\b/],
    ["sales", /\b(sell|sales|customer|lead|client|revenue|pricing|conversion)\b/],
    ["operations", /\b(stock|inventory|staff|process|workflow|delivery|supplier|branch)\b/],
    ["customer_experience", /\b(customer experience|support|service quality|feedback|complaint)\b/],
    ["finance", /\b(cost|budget|cash flow|profit|expense|accounting|finance)\b/],
    ["product", /\b(feature|software|product|app|system|website|storefront|improve)\b/]
  ];
  return suggestions.find(([, pattern]) => pattern.test(value))?.[0] || "other";
};

const makeTitleSuggestion = (text) => {
  const sentence = text.trim().split(/[.!?\n]/, 1)[0].trim();
  if (!sentence) return "";
  const words = sentence.split(/\s+/).slice(0, 9);
  const title = words.join(" ");
  return title.length > 80 ? `${title.slice(0, 77).trimEnd()}...` : title;
};

const matchVentureMention = (text, ventures) => {
  const normalizedText = text.toLocaleLowerCase();
  return [...ventures]
    .sort((left, right) => right.length - left.length)
    .find((venture) => normalizedText.includes(venture.toLocaleLowerCase())) || "";
};

const AdminWildThoughts = () => {
  const [thoughts, setThoughts] = useState([]);
  const [form, setForm] = useState(blankThought);
  const [editingId, setEditingId] = useState("");
  const [ventureFilter, setVentureFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechNotice, setSpeechNotice] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const recognitionRef = useRef(null);

  const loadThoughts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("/admin/wild-thoughts");
      setThoughts(data.thoughts || []);
    } catch (loadError) {
      setError(loadError.message || "Could not load your wild thoughts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognition()));
    loadThoughts();

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const ventures = useMemo(
    () => [...new Set(thoughts.map((item) => item.venture).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [thoughts]
  );

  const visibleThoughts = useMemo(() => thoughts.filter((item) => (
    (ventureFilter === "all" || item.venture === ventureFilter) &&
    (statusFilter === "all" || item.status === statusFilter) &&
    (categoryFilter === "all" || item.category === categoryFilter)
  )), [thoughts, ventureFilter, statusFilter, categoryFilter]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const appendTranscript = (transcript) => {
    if (!transcript.trim()) return;
    const ventureMention = matchVentureMention(transcript, ventures);
    setForm((current) => {
      const thought = [current.thought.trim(), transcript.trim()].filter(Boolean).join(" ");
      return {
        ...current,
        thought,
        venture: current.venture.trim() || ventureMention,
        title: current.title.trim() ? current.title : makeTitleSuggestion(thought),
        category: current.category === "other" ? suggestCategory(thought) : current.category
      };
    });
    setSpeechNotice(ventureMention
      ? `Matched “${ventureMention}” from your saved ventures. Please confirm it before saving.`
      : "Dictation added. Choose the correct venture before saving; no venture was guessed.");
  };

  const stopDictation = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  };

  const startDictation = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setSpeechNotice("Voice dictation is not supported in this browser. You can still type your thought.");
      return;
    }

    setError("");
    setNotice("");
    setSpeechNotice("");
    setInterimTranscript("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || "";
        if (result.isFinal) finalTranscript += transcript;
        else interim += transcript;
      }
      if (finalTranscript) appendTranscript(finalTranscript);
      setInterimTranscript(interim);
    };
    recognition.onerror = (event) => {
      setListening(false);
      setInterimTranscript("");
      const messages = {
        "not-allowed": "Microphone access was denied. Allow microphone access in your browser settings to dictate a thought.",
        "audio-capture": "No working microphone was found. Connect a microphone or type your thought.",
        "network": "Voice recognition could not connect. Check your connection or type your thought."
      };
      setSpeechNotice(messages[event.error] || "Voice dictation stopped unexpectedly. Your saved and typed text is unchanged.");
    };
    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setSpeechNotice("Listening. Review the recognized text and venture before saving.");
    } catch (startError) {
      recognitionRef.current = null;
      setListening(false);
      setSpeechNotice(startError.message || "Could not start voice dictation. Check microphone access and try again.");
    }
  };

  const startEditing = (thought) => {
    setEditingId(thought._id);
    setForm({
      title: thought.title || "",
      thought: thought.thought || "",
      venture: thought.venture || "",
      category: thought.category || "other",
      priority: thought.priority || "medium",
      status: thought.status || "captured",
      nextAction: thought.nextAction || "",
      reviewDate: thought.reviewDate ? new Date(thought.reviewDate).toISOString().slice(0, 10) : ""
    });
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    stopDictation();
    setEditingId("");
    setForm(blankThought);
  };

  const saveThought = async (event) => {
    event.preventDefault();
    stopDictation();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = { ...form, reviewDate: form.reviewDate || null };
    try {
      const result = await request(
        editingId ? `/admin/wild-thoughts/${editingId}` : "/admin/wild-thoughts",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload)
        }
      );
      if (editingId) {
        setThoughts((current) => current.map((thought) => thought._id === editingId ? result.thought : thought));
        setNotice("Wild thought updated.");
      } else {
        setThoughts((current) => [result.thought, ...current]);
        setNotice("Wild thought saved.");
      }
      resetForm();
    } catch (saveError) {
      setError(saveError.message || "Could not save this wild thought.");
    } finally {
      setSaving(false);
    }
  };

  const deleteThought = async (thought) => {
    if (!window.confirm(`Delete “${thought.title}”? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await request(`/admin/wild-thoughts/${thought._id}`, { method: "DELETE" });
      setThoughts((current) => current.filter((item) => item._id !== thought._id));
      if (editingId === thought._id) resetForm();
      setNotice("Wild thought deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete this wild thought.");
    }
  };

  return (
    <section className="page-stack mx-auto max-w-7xl">
      <header className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-10">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-emerald-300"><FiZap aria-hidden="true" /> Super Admin · Idea workspace</p>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Wild Thoughts</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
          Capture ideas while they are fresh, connect each one to the right venture, and turn good thoughts into clear next steps. You can update them whenever the idea evolves.
        </p>
      </header>

      {(error || notice) && <p role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || notice}</p>}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={saveThought} className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{editingId ? "Update an idea" : "Capture an idea"}</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-900">{editingId ? "Edit wild thought" : "What’s on your mind?"}</h2>
            </div>
            {editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FiX aria-hidden="true" /> Cancel edit</button>}
          </div>

          <label className="mt-5 block text-sm font-semibold text-slate-700">Idea title<input required maxLength={160} value={form.title} onChange={(event) => updateField("title", event.target.value)} className={inputClass} placeholder="A short, memorable summary" /></label>
          <div className="mt-4 block text-sm font-semibold text-slate-700">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>Thought</span>
              <button type="button" disabled={!speechSupported && !listening} onClick={listening ? stopDictation : startDictation} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">
                {listening ? <FiSquare aria-hidden="true" /> : <FiMic aria-hidden="true" />}
                {listening ? "Stop dictation" : speechSupported ? "Dictate thought" : "Voice unavailable"}
              </button>
            </span>
            <textarea aria-label="Thought" required maxLength={10000} rows={5} value={form.thought} onChange={(event) => updateField("thought", event.target.value)} className={inputClass} placeholder="Write it down as you thought of it. Add context, opportunity, or the problem it solves." />
          </div>
          {(speechNotice || interimTranscript) && <p role="status" aria-live="polite" className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{interimTranscript ? `Recognizing: ${interimTranscript}` : speechNotice}</p>}
          <p className="mt-2 text-xs leading-5 text-slate-500">Dictation uses your browser’s speech recognition and requires microphone permission. A venture is suggested only when its saved name is spoken; otherwise, choose one yourself. Review all recognized text before saving. Typed entry is always available.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">Business / venture<input required maxLength={120} list="wild-thought-ventures" value={form.venture} onChange={(event) => updateField("venture", event.target.value)} className={inputClass} placeholder="e.g. Marthington BMS" /><datalist id="wild-thought-ventures">{ventures.map((venture) => <option key={venture} value={venture} />)}</datalist></label>
            <label className="block text-sm font-semibold text-slate-700">Category<select value={form.category} onChange={(event) => updateField("category", event.target.value)} className={inputClass}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block text-sm font-semibold text-slate-700">Priority<select value={form.priority} onChange={(event) => updateField("priority", event.target.value)} className={inputClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label className="block text-sm font-semibold text-slate-700">Status<select value={form.status} onChange={(event) => updateField("status", event.target.value)} className={inputClass}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Next action (optional)<textarea maxLength={1000} rows={2} value={form.nextAction} onChange={(event) => updateField("nextAction", event.target.value)} className={inputClass} placeholder="What is the smallest useful step to move this forward?" /></label>
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Review date (optional)<input type="date" value={form.reviewDate} onChange={(event) => updateField("reviewDate", event.target.value)} className={inputClass} /></label>
          </div>
          <button type="submit" disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
            {editingId ? <FiSave aria-hidden="true" /> : <FiPlus aria-hidden="true" />}{saving ? "Saving..." : editingId ? "Update thought" : "Save wild thought"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Your idea library</p><h2 className="mt-2 text-xl font-extrabold text-slate-900">{thoughts.length} {thoughts.length === 1 ? "thought" : "thoughts"}</h2></div>
              <button type="button" onClick={loadThoughts} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Refresh</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-500">Venture<select value={ventureFilter} onChange={(event) => setVentureFilter(event.target.value)} className={inputClass}><option value="all">All ventures</option>{ventures.map((venture) => <option key={venture} value={venture}>{venture}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-500">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="all">All statuses</option>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-500">Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={inputClass}><option value="all">All categories</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
          </div>

          {loading && <p role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading saved thoughts…</p>}
          {!loading && visibleThoughts.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <FiZap className="mx-auto h-7 w-7 text-emerald-700" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-slate-900">{thoughts.length ? "No thoughts match these filters" : "Your next great idea starts here"}</h3>
              <p className="mt-2 text-sm text-slate-500">{thoughts.length ? "Try a different venture, status, or category." : "Capture a thought and assign it to the venture it can help."}</p>
            </div>
          )}
          {!loading && visibleThoughts.map((thought) => (
            <article key={thought._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{thought.venture}</p>
                  <h3 className="mt-1 break-words text-lg font-bold text-slate-900">{thought.title}</h3>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEditing(thought)} aria-label={`Edit ${thought.title}`} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><FiEdit2 aria-hidden="true" /></button>
                  <button type="button" onClick={() => deleteThought(thought)} aria-label={`Delete ${thought.title}`} className="rounded-lg border border-rose-100 p-2 text-rose-700 hover:bg-rose-50"><FiTrash2 aria-hidden="true" /></button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{thought.thought}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{formatLabel(thought.category, categories)}</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{formatLabel(thought.status, statuses)}</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-800">{thought.priority} priority</span>
                {thought.reviewDate && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">Review {new Date(thought.reviewDate).toLocaleDateString()}</span>}
              </div>
              {thought.nextAction && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-700"><strong>Next action:</strong> {thought.nextAction}</p>}
              <p className="mt-3 text-[11px] text-slate-400">Updated {new Date(thought.updatedAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdminWildThoughts;
