import { describe, expect, it } from "vitest";
import { normalizeImportedPhone, parseVCardFile } from "../utils/customerContactImport.js";

describe("customer contact imports", () => {
  it("normalizes imported phone numbers", () => {
    expect(normalizeImportedPhone("+233 (20) 123-4567")).toBe("+233201234567");
  });

  it("parses names and telephone numbers from VCF cards", () => {
    const vcf = `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ava Stone\r\nTEL;TYPE=CELL:+233 20 123 4567\r\nEND:VCARD\r\nBEGIN:VCARD\r\nVERSION:3.0\r\nN:Stone;John;;;\r\nTEL;TYPE=CELL:5550100\r\nEND:VCARD`;
    const contacts = parseVCardFile(vcf);
    expect(contacts).toEqual([
      { name: "Ava Stone", phone: "+233201234567", phones: ["+233201234567"] },
      { name: "John Stone", phone: "5550100", phones: ["5550100"] }
    ]);
  });
});
