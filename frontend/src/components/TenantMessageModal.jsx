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

const TenantMessageModal = ({ recipients, onClose, title = "Draft tenant message" }) => {
  const [recipientId, setRecipientId] = useState(recipients[0]?._id || "");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [channel, setChannel] = useState("email");
  const [draftedKeys, setDraftedKeys] = useState([]);

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
    setMessageSubject(recipients.length > 1 ? "A note from Marthington BMS" : `A note about ${recipient.name || "your business"}`);
    setMessageBody(recipients.length > 1
      ? "Hello,\n\nI’m reaching out regarding your Marthington BMS workspace.\n\n"
      : `Hello ${recipient.ownerName || recipient.recipientName || "there"},\n\nI’m reaching out regarding ${recipient.name || "your business"} and your Marthington BMS workspace.\n\n`);
  }, [recipient?._id, recipients.length]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="tenant-message-title">
      <section className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Tenant messaging</p>
            <h2 id="tenant-message-title" className="mt-1 text-xl font-extrabold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">Compose once, then open an individual draft for each tenant.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close tenant message draft" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Close</button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-600">Draft channel</span>
            <div className="flex gap-2" role="group" aria-label="Draft channel">
              {["email", "whatsapp"].map((value) => (
                <button key={value} type="button" onClick={() => setChannel(value)} aria-pressed={channel === value} className={`rounded-lg border px-3 py-2 text-xs font-bold capitalize ${channel === value ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}>{value === "whatsapp" ? "WhatsApp" : "Email"}</button>
              ))}
            </div>
          </div>
          <label className="text-xs font-bold text-slate-600">
            Email subject
            <input value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Message
            <textarea rows={5} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800" />
          </label>
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
          <div className="flex gap-2">
            {nextRecipient && (
              <button type="button" onClick={openNextDraft} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">
                Open next {channel === "whatsapp" ? "WhatsApp" : "email"} draft
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">{nextRecipient ? "Close" : "Done"}</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TenantMessageModal;
