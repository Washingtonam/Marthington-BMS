import React, { useEffect, useMemo, useState } from "react";

const normalizeWhatsAppNumber = (value) => String(value || "").replace(/\D/g, "").replace(/^0/, "234");

const recipientPhoneOptions = (recipient) => {
  const candidates = [
    recipient.whatsappPhone,
    recipient.ownerPhone,
    recipient.businessPhone,
    recipient.supportPhone,
    recipient.phone
  ].flatMap((value) => Array.isArray(value) ? value : [value])
    .flatMap((value) => String(value || "").split(/[;,|/\n]+/))
    .map((value) => value.trim())
    .filter(Boolean);
  const seenNumbers = new Set();
  return candidates.filter((phone) => {
    const normalized = normalizeWhatsAppNumber(phone);
    if (normalized.length < 8 || normalized.length > 15 || seenNumbers.has(normalized)) return false;
    seenNumbers.add(normalized);
    return true;
  });
};

const buildMailLink = (email, subject, body) => (
  `mailto:${encodeURIComponent(email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
);

const buildWhatsAppLink = (phone, message) => {
  const number = normalizeWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
};

const TenantMessageModal = ({
  recipients,
  onClose,
  onSendDirect,
  onSaveDraft,
  savedDrafts = [],
  initialDraft = null,
  title = "Draft tenant message"
}) => {
  const [recipientId, setRecipientId] = useState(recipients[0]?._id || "");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [channel, setChannel] = useState("email");
  const [draftName, setDraftName] = useState("");
  const [activeDraftId, setActiveDraftId] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaveMessage, setDraftSaveMessage] = useState("");
  const [draftedKeys, setDraftedKeys] = useState([]);
  const [whatsappOptInConfirmed, setWhatsappOptInConfirmed] = useState(false);
  const [sendingDirect, setSendingDirect] = useState(false);
  const [directResult, setDirectResult] = useState(null);

  const recipient = useMemo(
    () => recipients.find((item) => item._id === recipientId) || recipients[0],
    [recipientId, recipients]
  );
  const phoneDraftKey = (item, phone) => `whatsapp:${item._id}:${normalizeWhatsAppNumber(phone)}`;
  const isPhoneDrafted = (item, phone) => draftedKeys.includes(phoneDraftKey(item, phone));
  const isDrafted = (item) => channel === "email"
    ? draftedKeys.includes(`email:${item._id}`)
    : recipientPhoneOptions(item).length > 0 && recipientPhoneOptions(item).every((phone) => isPhoneDrafted(item, phone));
  const emailTargets = recipients.filter((item) => item.ownerEmail || item.recipientEmail);
  const whatsappTargets = recipients.flatMap((item) => recipientPhoneOptions(item).map((phone) => ({ item, phone })));
  const nextTarget = channel === "email"
    ? emailTargets.find((item) => !draftedKeys.includes(`email:${item._id}`))
    : whatsappTargets.find(({ item, phone }) => !isPhoneDrafted(item, phone));
  const nextRecipient = channel === "email" ? nextTarget : nextTarget?.item;
  const draftedCount = channel === "email"
    ? emailTargets.filter((item) => draftedKeys.includes(`email:${item._id}`)).length
    : whatsappTargets.filter(({ item, phone }) => isPhoneDrafted(item, phone)).length;
  const targetCount = channel === "email" ? emailTargets.length : whatsappTargets.length;

  useEffect(() => {
    if (!recipient) return;
    if (initialDraft) {
      setMessageSubject(initialDraft.subject || "");
      setMessageBody(initialDraft.message || "");
      setChannel(initialDraft.channel || "email");
      setDraftName(initialDraft.name || "");
      setActiveDraftId(initialDraft._id || "");
      setDraftSaveMessage("");
      return;
    }
    setMessageSubject(recipients.length > 1 ? "A note from Marthington BMS" : `A note about ${recipient.name || "your business"}`);
    setMessageBody(recipients.length > 1
      ? "Hello,\n\nI’m reaching out regarding your Marthington BMS workspace.\n\n"
      : `Hello ${recipient.ownerName || recipient.recipientName || "there"},\n\nI’m reaching out regarding ${recipient.name || "your business"} and your Marthington BMS workspace.\n\n`);
    setDraftName("");
    setActiveDraftId("");
    setDraftSaveMessage("");
  }, [recipient?._id, recipients.length, initialDraft?._id]);

  if (!recipient) return null;

  const getEmailLink = (item) => buildMailLink(
    item.ownerEmail || item.recipientEmail,
    messageSubject,
    `Hello ${item.ownerName || item.recipientName || "there"},\n\n${messageBody.replace(/^Hello(?: [^,\n]+)?,\n\n/, "")}`
  );
  const getWhatsAppLink = (item, phone = recipientPhoneOptions(item)[0]) => buildWhatsAppLink(
    phone,
    `Hello ${item.ownerName || item.recipientName || "there"},\n\n${messageBody.replace(/^Hello(?: [^,\n]+)?,\n\n/, "")}`
  );

  const markDraftOpened = (item, phone = "") => {
    const key = channel === "email" ? `email:${item._id}` : phoneDraftKey(item, phone);
    setDraftedKeys((current) => current.includes(key) ? current : [...current, key]);
  };

  const openNextDraft = () => {
    if (!nextRecipient) return;
    const draftUrl = channel === "email" ? getEmailLink(nextRecipient) : getWhatsAppLink(nextRecipient, nextTarget.phone);
    if (channel === "whatsapp") window.open(draftUrl, "_blank", "noopener,noreferrer");
    else window.location.href = draftUrl;
    markDraftOpened(nextRecipient, channel === "whatsapp" ? nextTarget.phone : "");
  };

  const sendDirectMessage = async () => {
    if (!onSendDirect) return;
    try {
      setSendingDirect(true);
      setDirectResult(null);
      const result = await onSendDirect({
        recipients,
        channel,
        subject: messageSubject,
        message: messageBody,
        whatsappOptInConfirmed
      });
      setDirectResult(result);
    } catch (error) {
      setDirectResult({ error: error.message || "Message delivery failed" });
    } finally {
      setSendingDirect(false);
    }
  };

  const loadSavedDraft = (draftId) => {
    if (!draftId) {
      setActiveDraftId("");
      setDraftName("");
      setChannel("email");
      setMessageSubject(recipients.length > 1 ? "A note from Marthington BMS" : `A note about ${recipient.name || "your business"}`);
      setMessageBody(recipients.length > 1
        ? "Hello,\n\nI’m reaching out regarding your Marthington BMS workspace.\n\n"
        : `Hello ${recipient.ownerName || recipient.recipientName || "there"},\n\nI’m reaching out regarding ${recipient.name || "your business"} and your Marthington BMS workspace.\n\n`);
      setDraftSaveMessage("");
      return;
    }
    const draft = savedDrafts.find((item) => item._id === draftId);
    if (!draft) return;
    setActiveDraftId(draft._id);
    setDraftName(draft.name);
    setChannel(draft.channel);
    setMessageSubject(draft.subject || "");
    setMessageBody(draft.message);
    setDraftSaveMessage("");
  };

  const saveMessageDraft = async () => {
    if (!onSaveDraft || !draftName.trim() || !messageBody.trim()) return;
    try {
      setSavingDraft(true);
      setDraftSaveMessage("");
      const savedDraft = await onSaveDraft({
        _id: activeDraftId || undefined,
        name: draftName.trim(),
        channel,
        subject: messageSubject,
        message: messageBody
      });
      setActiveDraftId(savedDraft._id);
      setDraftName(savedDraft.name);
      setDraftSaveMessage("Saved. You can reopen this message from Saved messages.");
    } catch (error) {
      setDraftSaveMessage(error.message || "Could not save this message.");
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="tenant-message-title">
      <section className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Tenant messaging</p>
            <h2 id="tenant-message-title" className="mt-1 text-xl font-extrabold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">Save reusable messages, send directly, or open individual email and WhatsApp drafts.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close tenant message draft" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Close</button>
        </div>

        <div className="mt-4 grid gap-3">
          {savedDrafts.length > 0 && <label className="text-xs font-bold text-slate-600">
            Load a saved message
            <select value={activeDraftId} onChange={(event) => loadSavedDraft(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">
              <option value="">Start a new message</option>
              {savedDrafts.map((draft) => <option key={draft._id} value={draft._id}>{draft.name} · {draft.channel === "whatsapp" ? "WhatsApp" : "Email"}</option>)}
            </select>
          </label>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-600">Message channel</span>
            <div className="flex gap-2" role="group" aria-label="Message channel">
              {["email", "whatsapp"].map((value) => (
                <button key={value} type="button" onClick={() => setChannel(value)} aria-pressed={channel === value} className={`rounded-lg border px-3 py-2 text-xs font-bold capitalize ${channel === value ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}>{value === "whatsapp" ? "WhatsApp" : "Email"}</button>
              ))}
            </div>
          </div>
          {channel === "email" && <label className="text-xs font-bold text-slate-600">
            Email subject
            <input value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800" />
          </label>}
          <label className="text-xs font-bold text-slate-600">
            Message {channel === "whatsapp" && <span className="font-medium text-slate-400">(up to 1,024 characters)</span>}
            <textarea aria-label="Message" rows={5} maxLength={channel === "whatsapp" ? 1024 : 5000} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800" />
          </label>
          {onSaveDraft && <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3">
            <label className="block text-xs font-bold text-slate-700">
              Saved message name
              <input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={100} placeholder="e.g. New shop feature follow-up" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800" />
            </label>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p role="status" className="text-xs text-slate-600">{draftSaveMessage || "Save the message and channel settings to reuse them later."}</p>
              <button type="button" onClick={saveMessageDraft} disabled={savingDraft || !draftName.trim() || !messageBody.trim() || (channel === "email" && !messageSubject.trim())} className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50">{savingDraft ? "Saving..." : activeDraftId ? "Update saved message" : "Save message"}</button>
            </div>
          </div>}
          {channel === "whatsapp" && <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-900">
            <input type="checkbox" checked={whatsappOptInConfirmed} onChange={(event) => setWhatsappOptInConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-300 text-emerald-600" />
            I confirm every selected recipient explicitly opted in to WhatsApp messages.
          </label>}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">Tenants</h3>
            <span className="text-xs text-slate-500">{draftedCount} of {targetCount} {channel === "whatsapp" ? "number drafts" : "email drafts"} opened</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {recipients.map((item) => {
              const itemIsDrafted = isDrafted(item);
              const itemEmail = item.ownerEmail || item.recipientEmail;
              const phoneOptions = recipientPhoneOptions(item);
              const itemDraftUrl = getEmailLink(item);
              return (
                <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <input type="checkbox" checked={itemIsDrafted} readOnly aria-label={`${item.name || item.ownerName || "Tenant"} draft opened`} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{item.name || item.ownerName || item.recipientName || "Tenant"}</p>
                      <p className="truncate text-xs text-slate-500">{channel === "email" ? itemEmail || "No email address" : phoneOptions[0] || "No WhatsApp number"}</p>
                    </div>
                  </div>
                  {channel === "email" && itemEmail && (
                    <a href={itemDraftUrl} onClick={() => markDraftOpened(item)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{itemIsDrafted ? "Open email again" : "Open email draft"}</a>
                  )}
                  {channel === "whatsapp" && phoneOptions.length > 0 && (
                    <div className="w-full space-y-2 pl-7">
                      {phoneOptions.map((phone, index) => {
                        const phoneWasDrafted = isPhoneDrafted(item, phone);
                        return <div key={normalizeWhatsAppNumber(phone)} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                          <span className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={phoneWasDrafted} readOnly aria-label={`${phone} draft opened`} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
                            {phone}
                            {index === 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Default</span>}
                          </span>
                          <a href={getWhatsAppLink(item, phone)} target="_blank" rel="noreferrer" onClick={() => markDraftOpened(item, phone)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">{phoneWasDrafted ? "Open again" : "Open WhatsApp draft"}</a>
                        </div>;
                      })}
                    </div>
                  )}
                  {channel === "email" && !itemEmail && <span className="text-xs font-medium text-slate-400">No email address</span>}
                  {channel === "whatsapp" && phoneOptions.length === 0 && <span className="text-xs font-medium text-slate-400">No WhatsApp number</span>}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs text-slate-500">A check means the external draft was opened, not that the message was sent. Each WhatsApp draft uses one number. Tenants without a {channel === "email" ? "email address" : "WhatsApp number"} are skipped.</p>
          <div className="flex flex-wrap gap-2">
            {onSendDirect && <button type="button" onClick={sendDirectMessage} disabled={sendingDirect || !messageBody.trim() || (channel === "whatsapp" && !whatsappOptInConfirmed)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{sendingDirect ? "Sending..." : `Send directly via ${channel === "whatsapp" ? "WhatsApp" : "Email"}`}</button>}
          <div className="flex gap-2">
            {nextRecipient && (
              <button type="button" onClick={openNextDraft} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">
                Open next {channel === "whatsapp" ? "WhatsApp" : "email"} draft
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">{nextRecipient ? "Close" : "Done"}</button>
          </div>
          </div>
        </div>
        {directResult && <p role="status" className={`mt-3 rounded-xl border p-3 text-sm ${directResult.error || directResult.failed ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{directResult.error || `${directResult.sent} sent${directResult.failed ? `, ${directResult.failed} failed` : ""}${directResult.failed ? ". Check the recent delivery activity for details." : "."}`}</p>}
      </section>
    </div>
  );
};

export default TenantMessageModal;
