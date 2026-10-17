import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserGuide, saveUserGuide } from "../api/userGuide.js";
import { defaultUserGuideContent } from "./UserGuide.jsx";

const listFields = [
  {
    key: "agentTutorials",
    label: "Agent guides & tutorials",
    help: "Each tutorial needs id, title, category, summary, and a steps array. These appear in the Agent Guides & Tutorials hub."
  },
  {
    key: "workflows",
    label: "Workflow guides",
    help: "Each guide needs id, title, category, tag, route, routeLabel, description, and a steps array."
  },
  {
    key: "directory",
    label: "Page directory",
    help: "Each entry needs title, path, summary, and action. Links must start with /app."
  },
  {
    key: "checklist",
    label: "Onboarding checklist",
    help: "Each entry needs a unique id and label."
  },
  {
    key: "quickFlow",
    label: "Quick-start steps",
    help: "Add the ordered steps shown in the guide's quick-start panel as a JSON list of strings."
  },
  {
    key: "faqs",
    label: "FAQs",
    help: "Each entry needs a question and answer."
  }
];

const toForm = (guide) => ({
  title: guide.title,
  description: guide.description,
  ...Object.fromEntries(listFields.map(({ key }) => [
    key,
    JSON.stringify(guide[key], null, 2)
  ]))
});

const AdminUserGuide = () => {
  const [form, setForm] = useState(() => toForm(defaultUserGuideContent));
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    getUserGuide()
      .then(({ guide, updatedAt: savedAt }) => {
        if (guide) setForm(toForm({ ...defaultUserGuideContent, ...guide }));
        setUpdatedAt(savedAt);
      })
      .catch((loadError) => {
        setLoadFailed(true);
        setError(loadError.message || "Could not load guide content.");
      })
      .finally(() => setLoading(false));
  }, []);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (!loadFailed) setError("");
    setNotice("");
  };

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    let guide;
    try {
      guide = {
        title: form.title.trim(),
        description: form.description.trim(),
        ...Object.fromEntries(listFields.map(({ key, label }) => {
          const items = JSON.parse(form[key]);
          if (!Array.isArray(items)) throw new Error(`${label} must be a JSON list.`);
          return [key, items];
        }))
      };
    } catch (parseError) {
      setError(parseError.message || "Check the guide content format and try again.");
      return;
    }

    try {
      setSaving(true);
      const result = await saveUserGuide(guide);
      setForm(toForm({ ...defaultUserGuideContent, ...result.guide }));
      setUpdatedAt(result.updatedAt);
      setNotice("Guide changes are saved and visible to users.");
    } catch (saveError) {
      setError(saveError.message || "Could not save guide content.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!window.confirm("Replace all guide content with the built-in defaults? Save to publish this change.")) return;
    setForm(toForm(defaultUserGuideContent));
    setNotice("");
    if (!loadFailed) setError("");
  };

  return (
    <section className="page-stack mx-auto max-w-6xl">
      <div className="page-heading">
        <div>
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-600">Super Admin</span>
          <h1 className="mt-2 text-4xl font-extrabold text-slate-900">User Guide</h1>
        </div>
        <p className="max-w-2xl text-sm text-slate-500">
          Edit and publish the help center shown to businesses. Changes are shared platform-wide.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Page introduction</h2>
              <p className="mt-1 text-sm text-slate-500">This title and description appear at the top of the user guide.</p>
            </div>
            {updatedAt && (
              <p className="text-xs text-slate-500">
                Last published {new Date(updatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Page title
            <input
              required
              maxLength={160}
              value={form.title}
              onChange={(event) => setField("title", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </label>
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Description
            <textarea
              required
              maxLength={1000}
              rows={3}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </label>
        </div>

        {listFields.map(({ key, label, help }) => (
          <div key={key} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block text-lg font-bold text-slate-900" htmlFor={`guide-${key}`}>
              {label}
            </label>
            <p className="mt-1 text-sm text-slate-500">{help} Use valid JSON to add, edit, reorder, or remove entries.</p>
            <textarea
              id={`guide-${key}`}
              required
              spellCheck="false"
              rows={Math.min(24, Math.max(8, form[key].split("\n").length))}
              value={form[key]}
              onChange={(event) => setField(key, event.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-800"
            />
          </div>
        ))}

        {(error || notice) && (
          <p role={error ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${error ? "border border-rose-200 bg-rose-50 text-rose-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {error || notice}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={reset} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Reset to built-in defaults
          </button>
          <div className="flex items-center gap-3">
            <Link to="/admin/user-guide/preview" className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Preview guide
            </Link>
            <button type="submit" disabled={loading || saving || loadFailed} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Loading..." : saving ? "Publishing..." : "Save and publish"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default AdminUserGuide;
