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

const deliveryChannelOptions = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "whatsapp-first", label: "WhatsApp first" },
  { value: "email-first", label: "Email first" }
];

const readableChannelLabel = (value) => deliveryChannelOptions.find((option) => option.value === value)?.label || "Email";
const resolvePreferredChannel = (channel, item) => {
  const hasEmail = Boolean(item?.ownerEmail || item?.recipientEmail);
  const hasPhone = recipientPhoneOptions(item).length > 0;

  if (channel === "email") return "email";
  if (channel === "whatsapp") return "whatsapp";
  if (channel === "email-first") return hasEmail ? "email" : hasPhone ? "whatsapp" : "email";
  if (channel === "whatsapp-first") return hasPhone ? "whatsapp" : hasEmail ? "email" : "whatsapp";
  return hasEmail ? "email" : "whatsapp";
};

const TenantMessageModal = ({
  recipients,
  onClose,
  onSendDirect,
  onSaveDraft,
  savedDrafts = [],
  initialDraft = null,
  allowRecipientSelection = false,
  fullPage = false,
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
  const [selectedTargetIds, setSelectedTargetIds] = useState([]);
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
  const getResolvedChannelForItem = (item) => resolvePreferredChannel(channel, item);
  const isDrafted = (item) => {
    const actualChannel = getResolvedChannelForItem(item);
    if (actualChannel === "email") return draftedKeys.includes(`email:${item._id}`);
    const phones = recipientPhoneOptions(item);
    return phones.length > 0 && phones.every((phone) => isPhoneDrafted(item, phone));
  };
  const directRecipients = allowRecipientSelection
    ? recipients.filter((item) => selectedTargetIds.includes(item._id))
    : recipients;
  const draftTargets = directRecipients.flatMap((item) => {
    const resolvedChannel = getResolvedChannelForItem(item);
    if (resolvedChannel === "email") {
      return item.ownerEmail || item.recipientEmail ? [{ item, channel: "email" }] : [];
    }
    return recipientPhoneOptions(item).map((phone) => ({ item, channel: "whatsapp", phone }));
  });
  const nextTarget = draftTargets.find(({ item, channel: targetChannel, phone }) => (
    targetChannel === "email"
      ? !draftedKeys.includes(`email:${item._id}`)
      : !isPhoneDrafted(item, phone)
  ));
  const nextRecipient = nextTarget?.item;
  const draftedCount = draftTargets.filter(({ item, channel: targetChannel, phone }) => (
    targetChannel === "email"
      ? draftedKeys.includes(`email:${item._id}`)
      : isPhoneDrafted(item, phone)
  )).length;
  const targetCount = draftTargets.length;
  const whatsappOptInRequired = directRecipients.some((item) => getResolvedChannelForItem(item) === "whatsapp");
  const showWhatsappOptInPrompt = whatsappOptInRequired || (directRecipients.length === 0 && ["whatsapp", "whatsapp-first"].includes(channel));
  const messageMaxLength = ["whatsapp", "whatsapp-first", "email-first"].includes(channel) ? 1024 : 5000;

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

  const markDraftOpened = (item, actualChannel, phone = "") => {
    const key = actualChannel === "email" ? `email:${item._id}` : phoneDraftKey(item, phone);
    setDraftedKeys((current) => current.includes(key) ? current : [...current, key]);
  };

  const openNextDraft = () => {
    if (!nextTarget) return;
    const { item, channel: resolvedChannel, phone } = nextTarget;
    const draftUrl = resolvedChannel === "email" ? getEmailLink(item) : getWhatsAppLink(item, phone);
    if (resolvedChannel === "whatsapp") window.open(draftUrl, "_blank", "noopener,noreferrer");
    else window.location.href = draftUrl;
    markDraftOpened(item, resolvedChannel, phone);
  };

  const sendDirectMessage = async () => {
    if (!onSendDirect || !directRecipients.length) return;
    try {
      setSendingDirect(true);
      setDirectResult(null);
      const result = await onSendDirect({
        recipients: directRecipients,
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
        ...(activeDraftId ? { _id: activeDraftId } : {}),
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
    <div className={fullPage ? "w-full" : "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"} role={fullPage ? undefined : "dialog"} aria-modal={fullPage ? undefined : "true"} aria-labelledby="tenant-message-title">
      <section className={`${fullPage ? "w-full max-w-4xl" : "my-auto max-h-[90vh] w-full max-w-2xl"} overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7`}>
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
              {savedDrafts.map((draft) => <option key={draft._id} value={draft._id}>{draft.name} · {readableChannelLabel(draft.channel)}</option>)}
            </select>
          </label>}
          {allowRecipientSelection && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-xs font-bold text-slate-700">Choose businesses to send to</p><p className="mt-0.5 text-[11px] text-slate-500">{directRecipients.length} selected · {recipients.length} available</p></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setSelectedTargetIds(recipients.map((item) => item._id)); setWhatsappOptInConfirmed(false); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100">Select all</button>
                <button type="button" onClick={() => { setSelectedTargetIds([]); setWhatsappOptInConfirmed(false); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100">Clear</button>
              </div>
            </div>
            <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
              {recipients.map((item) => <label key={item._id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-white">
                <input type="checkbox" checked={selectedTargetIds.includes(item._id)} onChange={() => { setSelectedTargetIds((current) => current.includes(item._id) ? current.filter((id) => id !== item._id) : [...current, item._id]); setWhatsappOptInConfirmed(false); }} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate font-semibold">{item.name || item.ownerName || item.recipientName || "Business"}</span>
                <span className="min-w-0 truncate text-slate-500">Email: {item.ownerEmail || item.recipientEmail || "—"} · Phone: {recipientPhoneOptions(item)[0] || "—"}</span>
              </label>)}
            </div>
          </div>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-600">Message channel</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Message channel">
              {deliveryChannelOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => { setChannel(option.value); setWhatsappOptInConfirmed(false); }} aria-pressed={channel === option.value} className={`rounded-lg border px-3 py-2 text-xs font-bold ${channel === option.value ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}>{option.label}</button>
              ))}
            </div>
          </div>
          {(["email", "email-first", "whatsapp-first"].includes(channel)) && <label className="text-xs font-bold text-slate-600">
            Email subject
            <input value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800" />
          </label>}
          <label className="text-xs font-bold text-slate-600">
            Message {messageMaxLength === 1024 && <span className="font-medium text-slate-400">(up to 1,024 characters)</span>}
            <textarea aria-label="Message" rows={5} maxLength={messageMaxLength} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800" />
          </label>
          {onSaveDraft && <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3">
            <label className="block text-xs font-bold text-slate-700">
              Saved message name
              <input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={100} placeholder="e.g. New shop feature follow-up" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800" />
            </label>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p role="status" className="text-xs text-slate-600">{draftSaveMessage || "Save the message and channel settings to reuse them later."}</p>
              <button type="button" onClick={saveMessageDraft} disabled={savingDraft || !draftName.trim() || !messageBody.trim() || (["email", "email-first", "whatsapp-first"].includes(channel) && !messageSubject.trim())} className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50">{savingDraft ? "Saving..." : activeDraftId ? "Update saved message" : "Save message"}</button>
            </div>
          </div>}
          {showWhatsappOptInPrompt && <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-900">
            <input type="checkbox" checked={whatsappOptInConfirmed} onChange={(event) => setWhatsappOptInConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-300 text-emerald-600" />
            I confirm every selected recipient explicitly opted in to WhatsApp messages.
          </label>}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">Tenants</h3>
            <span className="text-xs text-slate-500">{draftedCount} of {targetCount} drafts opened</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {directRecipients.map((item) => {
              const itemIsDrafted = isDrafted(item);
              const itemEmail = item.ownerEmail || item.recipientEmail;
              const phoneOptions = recipientPhoneOptions(item);
              const itemDraftUrl = getEmailLink(item);
              const itemResolvedChannel = resolvePreferredChannel(channel, item);
              return (
                <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <input type="checkbox" checked={itemIsDrafted} readOnly aria-label={`${item.name || item.ownerName || "Tenant"} draft opened`} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{item.name || item.ownerName || item.recipientName || "Tenant"}</p>
                      <p className="truncate text-xs text-slate-500">{itemResolvedChannel === "email" ? itemEmail || "No email address" : phoneOptions[0] || "No WhatsApp number"}</p>
                    </div>
                  </div>
                  {itemResolvedChannel === "email" && itemEmail && (
                    <a href={itemDraftUrl} onClick={() => markDraftOpened(item, "email")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{itemIsDrafted ? "Open email again" : "Open email draft"}</a>
                  )}
                  {itemResolvedChannel === "whatsapp" && phoneOptions.length > 0 && (
                    <div className="w-full space-y-2 pl-7">
                      {phoneOptions.map((phone, index) => {
                        const phoneWasDrafted = isPhoneDrafted(item, phone);
                        return <div key={normalizeWhatsAppNumber(phone)} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                          <span className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={phoneWasDrafted} readOnly aria-label={`${phone} draft opened`} className="h-4 w-4 rounded border-slate-300 text-emerald-600" />
                            {phone}
                            {index === 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Default</span>}
                          </span>
                          <a href={getWhatsAppLink(item, phone)} target="_blank" rel="noreferrer" onClick={() => markDraftOpened(item, "whatsapp", phone)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">{phoneWasDrafted ? "Open again" : "Open WhatsApp draft"}</a>
                        </div>;
                      })}
                      {directRecipients.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">Select at least one business above to open message drafts.</li>}
                    </div>
                  )}
                  {itemResolvedChannel === "email" && !itemEmail && <span className="text-xs font-medium text-slate-400">No email address</span>}
                  {itemResolvedChannel === "whatsapp" && phoneOptions.length === 0 && <span className="text-xs font-medium text-slate-400">No WhatsApp number</span>}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-xs text-slate-500">A check means the external draft was opened, not that the message was sent. Each WhatsApp draft uses one number. Channel preferences fall back to the other channel when contact details are unavailable.</p>
          <div className="flex flex-wrap gap-2">
            {onSendDirect && <button type="button" onClick={sendDirectMessage} disabled={sendingDirect || !directRecipients.length || !messageBody.trim() || (whatsappOptInRequired && !whatsappOptInConfirmed)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{sendingDirect ? "Sending..." : `Send directly via ${readableChannelLabel(channel)}${allowRecipientSelection ? ` (${directRecipients.length})` : ""}`}</button>}
          <div className="flex gap-2">
            {nextRecipient && (
              <button type="button" onClick={openNextDraft} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">
                Open next {readableChannelLabel(channel).toLowerCase()} draft
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
