import Invoice from "./invoice.model.js";

const generateInvoiceNumber =
  () => {

    return (
      "INV-" +
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()
    );
  };

const createInvoice =
  async (req, res) => {

    try {

      const {
        customerName,
        customerPhone,
        customerEmail,
        items,
        tax,
        discount,
        dueDate,
        notes,
        invoiceType
      } = req.body;

      const subtotal =
        items.reduce(
          (sum, item) =>
            sum + item.total,
          0
        );

      const totalAmount =
        subtotal +
        Number(tax || 0) -
        Number(discount || 0);

      const invoice =
        await Invoice.create({

          business:
            req.user.businessId,

          createdBy:
            req.user.id,

          customerName,

          customerPhone,

          customerEmail,

          items,

          subtotal,

          tax,

          discount,

          totalAmount,

          balance:
            totalAmount,

          dueDate,

          notes,

          invoiceType,

          invoiceNumber:
            generateInvoiceNumber()
        });

      res.json(invoice);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  };

const getInvoices =
  async (req, res) => {

    try {

      const invoices =
        await Invoice.find({
          business:
            req.user.businessId
        })

        .sort({
          createdAt: -1
        });

      res.json(invoices);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  };

const getInvoiceById =
  async (req, res) => {

    try {

      const invoice =
        await Invoice.findById(
          req.params.id
        )

        .populate(
          "business"
        );

      if (!invoice) {

        return res.status(404).json({
          message:
            "Invoice not found"
        });
      }

      res.json(invoice);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  };

export default {
  createInvoice,
  getInvoices,
  getInvoiceById
};