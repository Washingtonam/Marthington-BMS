import ReceiptQRCode from "./ReceiptQRCode.jsx";

const EnterpriseReceipt = ({
  sale
}) => {

  const business =
    sale?.business || {};

  const theme =
    business.receiptTheme ||
    "modern";

  const branding =
    business.brandSettings || {};

  return (

    <div
      className={`receipt ${theme}`}
      id="receipt"
    >

      {/* LOGO */}

      {branding.showLogo &&
        business.logo && (

        <div className="flex justify-center mb-3">

          <img
            src={business.logo}
            alt="logo"
            className="h-16 object-contain"
          />

        </div>
      )}

      {/* BUSINESS */}

      <div className="text-center">

        <h2 className="font-bold text-xl">
          {business.name}
        </h2>

        {branding.showBusinessAddress && (
          <p className="text-sm opacity-70">
            {business.address}
          </p>
        )}

        {branding.showPhone && (
          <p className="text-sm opacity-70">
            {business.phone}
          </p>
        )}

      </div>

      {/* RECEIPT */}

      <div className="mt-5 border-t pt-4">

        <div className="flex justify-between text-sm">

          <span>Receipt ID</span>

          <strong>
            {sale.receiptId}
          </strong>

        </div>

        <div className="flex justify-between text-sm mt-1">

          <span>Date</span>

          <strong>
            {
              new Date(
                sale.createdAt
              ).toLocaleString()
            }
          </strong>

        </div>

      </div>

      {/* ITEMS */}

      <div className="mt-5 space-y-3">

        {sale.items.map((item, i) => (

          <div
            key={i}
            className="flex justify-between"
          >

            <div>

              <strong>
                {item.name}
              </strong>

              <div className="text-xs opacity-70">

                {item.quantity} × ₦
                {item.sellingPrice}

              </div>

            </div>

            <strong>
              ₦{item.total}
            </strong>

          </div>
        ))}

      </div>

      {/* TOTAL */}

      <div className="mt-5 border-t pt-4 flex justify-between">

        <strong>Total</strong>

        <strong>
          ₦{sale.totalAmount}
        </strong>

      </div>

      {/* NOTES */}

      {sale.notes && (

        <div className="mt-4 text-sm">

          <strong>Note:</strong>

          <p>{sale.notes}</p>

        </div>

      )}

      {/* FOOTER */}

      <div className="mt-6 text-center text-xs opacity-70">

        {business.receiptFooter}

      </div>

      {/* QR */}

      <ReceiptQRCode
        receiptId={sale.receiptId}
      />

    </div>
  );
};

export default EnterpriseReceipt;