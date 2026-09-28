import Customer from "./customer.model.js";

import Sale from "../sales/sale.model.js";
import Invoice from "../invoices/invoice.model.js";
import { getScopedBranchQuery, resolveOperationalBranchId } from "../../utils/branchAccess.js";

const createCustomer =
  async (req, res) => {

    try {
      const normalizedPhone = req.body.phone
        ? Customer.normalizePhoneNumber(req.body.phone)
        : "";

      const branchId = resolveOperationalBranchId({ user: req.user, requestedBranchId: req.body.branch });
      if (branchId === undefined) {
        return res.status(403).json({ message: "You can only create customers for your assigned branch." });
      }

      const customer =
        await Customer.create({
          ...req.body,
          phone: normalizedPhone || req.body.phone || "",
          phoneNormalized: normalizedPhone,
          business: req.user.businessId,
          branch: branchId
        });

      res.json(customer);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  };

const getCustomers =
  async (req, res) => {

    try {

      const query = getScopedBranchQuery(req.user, req.user.businessId, req.query.branchId);
      if (!query) return res.status(403).json({ message: "You do not have access to these customers" });

      const customers = await Customer.find(query)

        .sort({
          createdAt: -1
        });

      res.json(customers);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  };

const getCustomerById =
  async (req, res) => {

    try {

      const customer =
        await Customer.findOne({
          _id: req.params.id,
          business: req.user.businessId
        });

      if (!customer) {

        return res.status(404).json({
          message:
            "Customer not found"
        });
      }

      const customerQuery = getScopedBranchQuery(req.user, req.user.businessId, customer.branch?.toString());
      if (!customerQuery) return res.status(403).json({ message: "You do not have access to this customer" });

      const sales =
        await Sale.find({
          customer:
            customer._id,
          business: customerQuery.business,
          ...(customerQuery.branch ? { branch: customerQuery.branch } : {})
        })

        .sort({
          createdAt: -1
        });

      const invoices = await Invoice.find({
        business: req.user.businessId,
        customer: customer._id,
        transactionType: "outgoing",
        ...(customerQuery.branch ? { branch: customerQuery.branch } : {})
      })
        .select("invoiceNumber invoiceType status paymentStatus totalAmount amountPaid balanceDue createdAt dueDate")
        .sort({ createdAt: -1 });

      res.json({
        customer,
        sales,
        invoices
      });

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  };

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      business: req.user.businessId
    });

    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const customerQuery = getScopedBranchQuery(req.user, req.user.businessId, customer.branch?.toString());
    if (!customerQuery) return res.status(403).json({ message: "You do not have access to this customer" });

    const { name, phone, email, address, notes, isActive } = req.body || {};
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) return res.status(400).json({ message: "Customer name is required" });
      customer.name = trimmedName;
    }
    if (phone !== undefined) {
      const trimmedPhone = String(phone).trim();
      if (trimmedPhone && !/^[+()\d\s-]{7,20}$/.test(trimmedPhone)) {
        return res.status(400).json({ message: "Please provide a valid phone number" });
      }
      customer.phone = Customer.normalizePhoneNumber(trimmedPhone) || trimmedPhone;
      customer.phoneNormalized = Customer.normalizePhoneNumber(trimmedPhone);
    }
    if (email !== undefined) {
      const trimmedEmail = String(email).trim();
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }
      customer.email = trimmedEmail;
    }
    if (address !== undefined) customer.address = String(address).trim();
    if (notes !== undefined) customer.notes = String(notes).trim();
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") return res.status(400).json({ message: "Customer active status must be true or false" });
      customer.isActive = isActive;
    }

    await customer.save();
    return res.json(customer);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export default {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer
};