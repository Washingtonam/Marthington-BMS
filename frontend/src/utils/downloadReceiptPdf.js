import html2pdf from "html2pdf.js";

const downloadReceiptPdf = async (
  filename = "receipt.pdf"
) => {

  const element =
    document.getElementById(
      "receipt"
    );

  if (!element) return;

  await html2pdf()
    .from(element)
    .set({

      margin: 0,

      filename,

      image: {
        type: "jpeg",
        quality: 1
      },

      html2canvas: {
        scale: 3
      },

      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      }
    })

    .save();
};

export default downloadReceiptPdf;