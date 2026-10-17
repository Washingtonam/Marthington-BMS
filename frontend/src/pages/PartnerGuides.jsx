import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserGuide } from "../api/userGuide.js";
import { defaultPartnerGuides } from "../data/partnerGuides.js";

const PartnerGuides = () => {
  const [guides, setGuides] = useState(defaultPartnerGuides);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getUserGuide()
      .then(({ guide }) => {
        if (Array.isArray(guide?.agentTutorials)) setGuides(guide.agentTutorials);
      })
      .catch((loadError) => setError(loadError.message || "Could not load the latest agent tutorials."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">Agent learning hub</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Guides &amp; Tutorials</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Practical guidance for sharing tracking links, understanding traffic, and promoting Marthington responsibly.
          Guides published by the platform team appear here automatically.
        </p>
      </header>

      {loading && <p role="status" className="text-sm text-slate-400">Loading the latest tutorials…</p>}
      {error && <p role="alert" className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">{error} Showing the built-in agent guides.</p>}

      {!guides.length && !loading && (
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-sm text-slate-300">
          No tutorials have been published yet. Your referral link and performance details are available on the <Link className="font-semibold text-emerald-300 hover:text-emerald-200" to="/partners/dashboard">Agent dashboard</Link>.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {guides.map((guide) => (
          <article key={guide.id} className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">{guide.category}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{guide.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{guide.summary}</p>
            <ol className="mt-5 space-y-3">
              {guide.steps.map((step, index) => (
                <li key={`${guide.id}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-emerald-200">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PartnerGuides;
