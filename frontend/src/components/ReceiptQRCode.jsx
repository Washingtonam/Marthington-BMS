import { QRCodeCanvas } from "qrcode.react";

const ReceiptQRCode = ({ receiptId }) => {

  const receiptUrl =
    `${window.location.origin}/r/${receiptId}`;

  return (

    <div className="flex justify-center mt-4">

      <QRCodeCanvas
        value={receiptUrl}
        size={80}
      />

    </div>
  );
};

export default ReceiptQRCode;