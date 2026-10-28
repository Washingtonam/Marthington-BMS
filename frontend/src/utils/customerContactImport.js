export const normalizeImportedPhone = (phone = "") => String(phone).replace(/[^+\d]/g, "");

export const parseVCardFile = (text = "") => {
  const cards = String(text).replace(/\r\n?/g, "\n").split(/\n(?=BEGIN:VCARD)/i);
  return cards.map((card) => {
    const lines = card.replace(/\n[ \t]/g, "").split("\n");
    let name = "";
    const phones = [];

    lines.forEach((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return;
      const header = line.slice(0, separator);
      const value = line.slice(separator + 1).trim();
      const normalizedHeader = header.toUpperCase().split(";")[0];

      if (normalizedHeader === "FN" && value && !name) {
        name = value.replace(/\\([,;])/g, "$1").replace(/\\n/gi, " ").trim();
      } else if (normalizedHeader === "N" && !name) {
        const parts = value.split(";").map((part) => part.replace(/\\([,;])/g, "$1").trim());
        name = [parts[1], parts[0]].filter(Boolean).join(" ").trim();
      } else if (normalizedHeader === "TEL" && value) {
        const phone = normalizeImportedPhone(value);
        if (phone && !phones.includes(phone)) phones.push(phone);
      }
    });

    return { name: name || "", phone: phones[0] || "", phones };
  }).filter((contact) => contact.name || contact.phone);
};
