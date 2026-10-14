import React, { useEffect, useMemo, useState } from "react";

const normalizeWhatsAppNumber = (value) => String(value || "").replace(/\D/g, "").replace(/^0/, "234");

const buildMailLink = (email, subject, body, bcc = "") => (
  `mailto:${encodeURIComponent(email || "")}${bcc ? `?bcc=${encodeURIComponent(bcc)}` : "?"}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
);

const buildWhatsAppLink = (phone, message) => {
  const number = normalizeWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
};

const TenantMessageModal = ({ recipients, onClose, title = "Draft tenant message" }) => {
  const [recipientId, setRecipientId] = useState(recipients[0]?._id || "");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  const recipient = useMemo(
    () => recipients.find((item) => item._id === recipientId) || recipients[0],
    [recipientId, recipients]
  );
  const emailAddresses = [...new Set(recipients.map((item) => item.ownerEmail || item.recipientEmail).filter(Boolean))];
  const phone = recipient?.whatsappPhone || recipient?.ownerPhone || recipient?.businessPhone;
  const mailLink = recipient
    ? buildMailLink(recipient.ownerEmail || recipient.recipientEmail, messageSubject, messageBody)
    : "";
  const bulkMailLink = emailAddresses.length > 1
    ? buildMailLink("", messageSubject, messageBody, emailAddresses.join(","))
    : "";
  const whatsAppLink = buildWhatsAppLink(phone, messageBody);

  useEffect(() => {
    if (!recipient) return;
    const isBulkDraft = recipients.length > 1;
    setMessageSubject(isBulkDraft ? "A note from Marthington BMS" : `A note about ${recipient.name || "your business"}`);
    setMessageBody(isBulkDraft
      ? "Hello,\n\nI’m reaching out regarding your Marthington BMS workspace.\n\n"
      : `Hello ${recipient.ownerName || recipient.recipientName || "there"},\n\nI’m reaching out regarding ${recipient.name || "your business"} and your Marthington BMS workspace.\n\n`);
  }, [recipient?._id, recipients.length]);

  if (!recipient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="tenant-message-title">
      <section className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Tenant messaging</p>
            <h2 id="tenant-message-title" className="mt-1 text-xl font-extrabold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{recipient.ownerName || recipient.recipientName || "Business owner"} · {recipient.ownerEmail || recipient.recipientEmail || "No email"} · {phone || "No phone number"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close tenant message draft" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Close</button>
        </div>

        {recipients.length > 1 && (
          <label className="mt-4 block text-xs font-bold text-slate-600">
            Draft for tenant
            <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">
              {recipients.map((item) => <option key={item._id} value={item._id}>{item.name || item.recipientName || item.ownerEmail || item.recipientEmail}</option>)}
            </select>
          </label>
        )}

        <div className="mt-4 grid gap-3">
          <label className="text-xs font-bold text-slate-600">
            Email subject
            <input value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Message
            <textarea rows={5} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800" />
          </label>
          <div className="flex flex-wrap gap-2">
            {mailLink && (recipient.ownerEmail || recipient.recipientEmail) ? (
              <a href={mailLink} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Open drafted email</a>
            ) : (
              <span className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500">No email address available</span>
            )}
            {bulkMailLink && (
              <a href={bulkMailLink} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Email all selected ({emailAddresses.length})</a>
            )}
            {whatsAppLink ? (
              <a href={whatsAppLink} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">Open WhatsApp draft</a>
            ) : (
              <span className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500">No WhatsApp number available</span>
            )}
          </div>
          {recipients.length > 1 && <p className="text-xs text-slate-500">Bulk email opens a BCC draft for selected tenants with email addresses. WhatsApp drafts open for one selected tenant at a time.</p>}
        </div>
      </section>
    </div>
  );
};

export default TenantMessageModal;
