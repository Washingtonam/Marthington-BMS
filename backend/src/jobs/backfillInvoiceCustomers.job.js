import mongoose from "mongoose";
import Customer from "../modules/customers/customer.model.js";
import Invoice from "../modules/invoices/invoice.model.js";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findMatchingCustomer = async ({ invoice, businessId, session, phoneNormalized, email }) => {
  const scope = {
    business: businessId,
    branch: invoice.branch || null
  };
  const phoneMatch = phoneNormalized
    ? await Customer.findOne({ ...scope, phoneNormalized }).session(session)
    : null;
  const emailMatch = email
    ? await Customer.findOne({
      ...scope,
      email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" }
    }).session(session)
    : null;

  if (phoneMatch && emailMatch && !phoneMatch._id.equals(emailMatch._id)) {
    throw new Error("Invoice phone and email belong to different customers");
  }
  return phoneMatch || emailMatch;
};

const backfillInvoiceCustomers = async () => {
  const candidates = await Invoice.find({
    transactionType: "outgoing",
    $and: [
      { $or: [{ source: "manual" }, { source: { $exists: false } }] },
      { $or: [{ linkedSale: null }, { linkedSale: { $exists: false } }] }
    ],
    $or: [{ customer: null }, { customer: { $exists: false } }],
    customerName: { $regex: /\S/ }
  })
    .select("_id business branch customerName customerPhone customerEmail balanceDue balance totalAmount amountPaid returnedAmount")
    .sort({ createdAt: 1 })
    .lean();

  if (!candidates.length) {
    console.log("No outgoing invoices require customer backfill.");
    return { linked: 0, failed: 0 };
  }

  let linked = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const session = await mongoose.startSession();
    let processed = false;
    try {
      await session.withTransaction(async () => {
        const invoice = await Invoice.findOne({
          _id: candidate._id,
          business: candidate.business,
          transactionType: "outgoing",
          $and: [
            { $or: [{ source: "manual" }, { source: { $exists: false } }] },
            { $or: [{ linkedSale: null }, { linkedSale: { $exists: false } }] }
          ],
          $or: [{ customer: null }, { customer: { $exists: false } }]
        }).session(session);

        if (!invoice) return;

        const phone = String(invoice.customerPhone || "").trim();
        const phoneNormalized = Customer.normalizePhoneNumber(phone);
        const email = String(invoice.customerEmail || "").trim();
        let customer = await findMatchingCustomer({
          invoice,
          businessId: invoice.business,
          session,
          phoneNormalized,
          email
        });

        if (!customer) {
          const [createdCustomer] = await Customer.create([{
            business: invoice.business,
            branch: invoice.branch || null,
            name: String(invoice.customerName || "").trim(),
            phone: phoneNormalized || phone,
            phoneNormalized,
            email
          }], { session });
          customer = createdCustomer;
        } else {
          if (!customer.phone && (phoneNormalized || phone)) {
            customer.phone = phoneNormalized || phone;
            customer.phoneNormalized = phoneNormalized;
          }
          if (!customer.email && email) customer.email = email;
        }

        const balanceDue = Number(invoice.balanceDue ?? invoice.balance ?? Math.max(
          0,
          Number(invoice.totalAmount || 0) - Number(invoice.amountPaid || 0) - Number(invoice.returnedAmount || 0)
        ));
        customer.outstandingBalance = Number(customer.outstandingBalance || 0) + Math.max(0, balanceDue);
        await customer.save({ session });

        invoice.customer = customer._id;
        invoice.customerName = customer.name;
        invoice.customerPhone = customer.phone || "";
        invoice.customerEmail = customer.email || "";
        await invoice.save({ session });
        processed = true;
      });
      if (processed) linked += 1;
    } catch (error) {
      failed += 1;
      console.error(`Customer backfill failed for invoice ${candidate._id}:`, error.message);
    } finally {
      await session.endSession();
    }
  }

  console.log(`Invoice customer backfill complete. ${linked} linked; ${failed} failed.`);
  return { linked, failed };
};

export default backfillInvoiceCustomers;