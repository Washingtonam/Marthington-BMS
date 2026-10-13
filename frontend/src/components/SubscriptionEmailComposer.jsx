import React, { useEffect, useMemo, useState } from "react";
import request from "../api/client.js";

const AUDIENCES = [
  { value: "subscription_all", label: "All tenants", description: "Every active business owner with an email address." },
  { value: "subscription_active_pro", label: "Active Pro", description: "Owners with an active Pro subscription." },
  { value: "subscription_expiring_7", label: "Expiring in 7 days", description: "Active Pro subscriptions expiring within seven days." },
  { value: "subscription_expiring_30", label: "Expiring in 30 days", description: "Active Pro subscriptions expiring within thirty days." },
  { value: "subscription_trial", label: "Trial tenants", description: "Owners whose subscription is currently on trial." },
  { value: "subscription_expired", label: "Expired tenants", description: "Owners with an expired subscription or past expiry date." }
];

const DEFAULT_MESSAGES = {
  subscription_all: {
    subject: "A note about your {{businessName}} workspace",
    previewText: "An update from the Marthington BMS team.",
    bodyText: "Hello {{ownerName}},\n\nWe hope {{businessName}} is helping your team run smoothly. We’re here if you have any questions about your account or subscription.\n\nThank you for being part of Marthington BMS."
  },
  subscription_active_pro: {
    subject: "Your {{businessName}} Pro subscription",
    previewText: "A quick check-in from Marthington BMS.",
    bodyText: "Hello {{ownerName}},\n\nYour Pro subscription for {{businessName}} is active. Thank you for choosing Marthington BMS. Please contact our team if you need any help with your plan."
  },
  subscription_expiring_7: {
    subject: "Renew {{businessName}}’s Pro subscription",
    previewText: "Your Pro subscription is approaching renewal.",
    bodyText: "Hello {{ownerName}},\n\nThe Pro subscription for {{businessName}} is approaching its renewal. Please sign in to review your plan and renew to keep your premium tools available.\n\nIf you have already renewed, thank you and please disregard this reminder."
  },
  subscription_expiring_30: {
    subject: "Plan ahead for {{businessName}}’s subscription renewal",
    previewText: "Your Pro subscription renewal is coming up.",
    bodyText: "Hello {{ownerName}},\n\nWe’re reaching out because the Pro subscription for {{businessName}} is coming up for renewal. You can review your plan and renewal options from Billing in your workspace.\n\nPlease contact our team if you need any assistance."
  },
  subscription_trial: {
    subject: "Keep {{businessName}} moving with Marthington BMS",
    previewText: "Explore the plan that fits your business.",
    bodyText: "Hello {{ownerName}},\n\nWe hope you’re enjoying Marthington BMS for {{businessName}}. When you’re ready, review the available subscription plans in Billing to keep using the tools that support your business."
  },
  subscription_expired: {
    subject: "Reactivate {{businessName}}’s subscription",
    previewText: "Choose a plan to continue using your workspace.",
    bodyText: "Hello {{ownerName}},\n\nThe subscription for {{businessName}} has expired. You can review available plans and reactivate your workspace from Billing.\n\nIf you have already renewed, please contact our team so we can help."
  }
};

const renderPreview = (template, values) => String(template || "")
  .replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (token, key) => values[key] || token);

const matchesAudience = (business, audienceType, now = Date.now()) => {
  const subscription = business.subscription || {};
  const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt).getTime() : null;
  if (audienceType === "subscription_active_pro") return subscription.plan === "pro" && subscription.status === "active";
  if (audienceType === "subscription_expiring_7" || audienceType === "subscription_expiring_30") {
    const days = audienceType.endsWith("_7") ? 7 : 30;
    return subscription.plan === "pro" && subscription.status === "active"
      && expiresAt !== null && expiresAt >= now && expiresAt <= now + days * 24 * 60 * 60 * 1000;
  }
  if (audienceType === "subscription_trial") return subscription.status === "trial";
  if (audienceType === "subscription_expired") return subscription.status === "expired" || (expiresAt !== null && expiresAt < now);
  return true;
};

const SubscriptionEmailComposer = ({ subscriptions = [], initialAudience = "subscription_all" }) => {
  const [audienceType, setAudienceType] = useState(initialAudience);
  const [drafts, setDrafts] = useState({});
  const [audienceCount, setAudienceCount] = useState(null);
  const [audienceRecipients, setAudienceRecipients] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [delivery, setDelivery] = useState(null);

  useEffect(() => {
    setAudienceType(initialAudience);
  }, [initialAudience]);

  useEffect(() => {
    let active = true;
    request("/admin/subscriptions/email-drafts")
      .then((data) => {
        if (!active) return;
        const savedDrafts = {};
        (data.drafts || []).forEach((draft) => {
          savedDrafts[draft.audienceType] = {
            id: draft._id,
            subject: draft.subject,
            previewText: draft.previewText || "",
            bodyText: draft.bodyHtml || "",
            dirty: false
          };
        });
        setDrafts(savedDrafts);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Could not load saved subscription email drafts.");
      })
      .finally(() => {
        if (active) setLoadingDrafts(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setAudienceCount(null);
    setAudienceRecipients([]);
    setSelectedEmails(null);
    request(`/admin/subscriptions/email-audience?audienceType=${encodeURIComponent(audienceType)}`)
      .then((data) => {
        if (!active) return;
        const recipients = Array.isArray(data.recipients) ? data.recipients : [];
        setAudienceCount(Number(data.count) || 0);
        setAudienceRecipients(recipients);
        setSelectedEmails(Array.isArray(data.recipients) ? recipients.map((recipient) => recipient.email) : null);
      })
      .catch((countError) => {
        if (active) setError(countError.message || "Could not count subscription email recipients.");
      });
    return () => { active = false; };
  }, [audienceType]);

  useEffect(() => {
    if (!campaignId) return undefined;
    let active = true;
    const checkDelivery = async () => {
      try {
        const result = await request(`/admin/subscriptions/email-campaigns/${campaignId}`);
        const campaign = result.campaign;
        if (!active || !["sent", "failed"].includes(campaign.status)) return;
        setDelivery(campaign);
        setCampaignId("");
        setSending(false);
        setNotice(campaign.status === "sent"
          ? `Email delivered to ${campaign.deliveredCount} recipient(s).`
          : `Email delivery finished: ${campaign.deliveredCount} sent, ${campaign.failedCount} failed.`);
      } catch (pollError) {
        if (active) {
          setError(pollError.message || "Could not retrieve email delivery status.");
          setCampaignId("");
          setSending(false);
        }
      }
    };
    const timer = window.setInterval(checkDelivery, 2000);
    checkDelivery();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [campaignId]);

  const draft = drafts[audienceType] || DEFAULT_MESSAGES[audienceType];
  const selectedAudience = AUDIENCES.find((audience) => audience.value === audienceType) || AUDIENCES[0];
  const sampleBusiness = useMemo(() => subscriptions.find((item) => matchesAudience(item, audienceType)) || subscriptions[0], [audienceType, subscriptions]);
  const previewValues = {
    businessName: sampleBusiness?.name || "Your business",
    ownerName: sampleBusiness?.ownerName || "Business owner",
    planName: sampleBusiness?.subscription?.tier || (sampleBusiness?.subscription?.plan === "pro" ? "Pro" : "Free"),
    billingCycle: sampleBusiness?.subscription?.billingCycle || "your selected cycle",
    expiryDate: sampleBusiness?.subscription?.expiresAt
      ? new Date(sampleBusiness.subscription.expiresAt).toLocaleDateString()
      : "your renewal date"
  };

  const updateDraft = (field, value) => {
    setDrafts((current) => ({
      ...current,
      [audienceType]: {
        ...(current[audienceType] || DEFAULT_MESSAGES[audienceType]),
        [field]: value,
        dirty: true
      }
    }));
    setNotice("");
    setDelivery(null);
  };

  const saveDraft = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await request("/admin/subscriptions/email-drafts", {
        method: "PUT",
        body: JSON.stringify({
          audienceType,
          subject: draft.subject,
          previewText: draft.previewText,
          bodyText: draft.bodyText
        })
      });
      setDrafts((current) => ({
        ...current,
        [audienceType]: { ...draft, id: result.draft._id, dirty: false }
      }));
      setNotice(`Draft saved for ${selectedAudience.label}.`);
      return result.draft._id;
    } catch (saveError) {
      setError(saveError.message || "Could not save this email draft.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const selectedRecipientCount = selectedEmails === null ? audienceCount : selectedEmails.length;
  const visibleRecipients = audienceRecipients.filter((recipient) => (
    `${recipient.name || ""} ${recipient.email || ""} ${recipient.businessName || ""}`
      .toLowerCase()
      .includes(recipientSearch.trim().toLowerCase())
  ));

  const toggleRecipient = (email) => {
    setSelectedEmails((current) => {
      const selected = new Set(current || []);
      if (selected.has(email)) selected.delete(email);
      else selected.add(email);
      return [...selected];
    });
  };

  const selectVisibleRecipients = (select) => {
    setSelectedEmails((current) => {
      const selected = new Set(current || []);
      visibleRecipients.forEach((recipient) => {
        if (select) selected.add(recipient.email);
        else selected.delete(recipient.email);
      });
      return [...selected];
    });
  };

  const sendDraft = async () => {
    if (!selectedRecipientCount) {
      setError("There are no business owner email addresses in this audience.");
      return;
    }
    if (audienceCount === null) {
      setError("Wait for the recipient list to finish loading before sending.");
      return;
    }
    if (!window.confirm(`Send “${draft.subject}” to ${selectedRecipientCount} selected business owner(s) in ${selectedAudience.label}?`)) return;

    setSending(true);
    setError("");
    setNotice("");
    setDelivery(null);
    try {
      const draftId = draft.id && !draft.dirty ? draft.id : await saveDraft();
      if (!draftId) {
        setSending(false);
        return;
      }
      const result = await request(`/admin/subscriptions/email-drafts/${draftId}/send`, {
        method: "POST",
        body: JSON.stringify({ recipientEmails: selectedEmails === null ? undefined : selectedEmails })
      });
      setCampaignId(result.campaignId);
      setDrafts((current) => ({
        ...current,
        [audienceType]: { ...draft, ...(current[audienceType] || {}), id: null, dirty: true }
      }));
      setNotice(`Sending to ${result.recipientCount} business owner(s). Delivery status will update here.`);
    } catch (sendError) {
      setSending(false);
      setError(sendError.message || "Could not send this subscription email.");
    }
  };

  return (
    <section id="subscription-email" className="scroll-mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/60 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Owner communications</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">Subscription email studio</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">Save a reusable draft for each audience, preview its placeholders, and send when you’re ready.</p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">Manual send · transactional</span>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
          <label className="block text-xs font-bold text-slate-600">
            Recipients
            <select
              aria-label="Subscription email audience"
              value={audienceType}
              onChange={(event) => setAudienceType(event.target.value)}
              disabled={loadingDrafts || sending}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800"
            >
              {AUDIENCES.map((audience) => <option key={audience.value} value={audience.value}>{audience.label}</option>)}
            </select>
            <span className="mt-1 block font-normal text-slate-500">{selectedAudience.description}</span>
          </label>

          {audienceRecipients.length > 0 && (
            <section aria-label="Choose recipients" className="overflow-hidden rounded-xl border border-slate-200">
              <div className="space-y-3 border-b border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Choose recipients</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">{selectedRecipientCount?.toLocaleString() || 0} of {audienceCount?.toLocaleString() || 0} selected</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => selectVisibleRecipients(true)} className="text-xs font-bold text-emerald-700 hover:underline">Select visible</button>
                    <button type="button" onClick={() => selectVisibleRecipients(false)} className="text-xs font-bold text-slate-600 hover:underline">Clear visible</button>
                  </div>
                </div>
                <input
                  type="search"
                  aria-label="Search email recipients"
                  value={recipientSearch}
                  onChange={(event) => setRecipientSearch(event.target.value)}
                  placeholder="Search name, business, or email"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                />
              </div>
              <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
                {visibleRecipients.map((recipient) => (
                  <label key={recipient.email} className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={selectedEmails?.includes(recipient.email) || false}
                      onChange={() => toggleRecipient(recipient.email)}
                      aria-label={`Select ${recipient.name || recipient.email}`}
                      className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-800">{recipient.name || "Business owner"}</span>
                      <span className="block truncate text-[11px] text-slate-500">{recipient.email}</span>
                      {recipient.businessName && <span className="block truncate text-[11px] text-slate-400">{recipient.businessName}</span>}
                    </span>
                  </label>
                ))}
                {visibleRecipients.length === 0 && <p className="px-3 py-5 text-center text-xs text-slate-500">No matching email recipients.</p>}
              </div>
            </section>
          )}

          {loadingDrafts ? (
            <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Loading saved email drafts...</p>
          ) : (
            <>
              <label className="block text-xs font-bold text-slate-600">
                Subject
                <input
                  maxLength={200}
                  value={draft.subject}
                  onChange={(event) => updateDraft("subject", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-800"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Inbox preview text
                <input
                  maxLength={300}
                  value={draft.previewText}
                  onChange={(event) => updateDraft("previewText", event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-800"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Message
                <textarea
                  rows={9}
                  maxLength={20000}
                  value={draft.bodyText}
                  onChange={(event) => updateDraft("bodyText", event.target.value)}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-800"
                />
              </label>
              <p className="text-xs leading-5 text-slate-500">
                Placeholders: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{"{{businessName}}"}</code>{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{"{{ownerName}}"}</code>{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{"{{planName}}"}</code>{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{"{{billingCycle}}"}</code>
              </p>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              Recipients with email: <strong className="text-slate-900">{audienceCount === null ? "Loading..." : audienceCount.toLocaleString()}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveDraft} disabled={loadingDrafts || saving || sending} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save draft"}
              </button>
              <button type="button" onClick={sendDraft} disabled={loadingDrafts || saving || sending || audienceCount === null || selectedRecipientCount === 0} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                {sending ? "Sending..." : "Send reminder"}
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Live preview</p>
              <h3 className="mt-1 text-sm font-extrabold text-slate-900">Email as the owner sees it</h3>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">Sample: {previewValues.businessName}</span>
          </div>
          <article className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-4">
              <p className="text-xs font-bold text-emerald-700">Marthington BMS</p>
              <h4 className="mt-3 text-base font-extrabold text-slate-900">{renderPreview(draft.subject, previewValues)}</h4>
              <p className="mt-1 text-xs text-slate-500">{renderPreview(draft.previewText, previewValues)}</p>
            </div>
            <div className="min-h-48 whitespace-pre-wrap px-4 py-5 text-sm leading-6 text-slate-700">
              {renderPreview(draft.bodyText, previewValues)}
            </div>
            <footer className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-[11px] text-slate-500">Marthington BMS | Business management, made clearer.</footer>
          </article>
          {delivery && <p className="mt-3 text-xs text-slate-600">Last send: {delivery.deliveredCount} delivered, {delivery.failedCount} failed.</p>}
        </aside>
      </div>
    </section>
  );
};

export default SubscriptionEmailComposer;
