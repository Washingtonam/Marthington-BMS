export const defaultAccentColor = "#10b981";

export const accentPresets = [
  { name: "Emerald", value: "#10b981" },
  { name: "Blue", value: "#2563eb" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Rose", value: "#e11d48" },
  { name: "Amber", value: "#d97706" },
  { name: "Teal", value: "#0d9488" }
];

const shadeStops = [
  [50, 0.94],
  [100, 0.86],
  [200, 0.70],
  [300, 0.48],
  [400, 0.22],
  [500, 0],
  [600, 0.16],
  [700, 0.32],
  [800, 0.48],
  [900, 0.62],
  [950, 0.76]
];

const mixRgb = (base, amount, target) => base.map((channel, index) => (
  Math.round(channel * (1 - amount) + target[index] * amount)
));

export const applyAccentColor = (color = defaultAccentColor) => {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  const normalized = match ? `#${match[1].toLowerCase()}` : defaultAccentColor;
  const hex = normalized.slice(1);
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const root = document.documentElement;
  root.dataset.accentColor = normalized;

  shadeStops.forEach(([shade, amount]) => {
    const result = shade < 500
      ? mixRgb(rgb, amount, [255, 255, 255])
      : shade > 500
        ? mixRgb(rgb, amount, [0, 0, 0])
        : rgb;
    root.style.setProperty(`--app-emerald-${shade}`, result.join(" "));
  });
};

export const getColorMode = () => {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  const legacyPartnerTheme = localStorage.getItem("partner-theme");
  return legacyPartnerTheme === "light" || legacyPartnerTheme === "dark" ? legacyPartnerTheme : "light";
};

export const applyColorMode = (mode) => {
  const nextMode = mode === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("dark", nextMode === "dark");
  document.documentElement.classList.toggle("light", nextMode === "light");
  localStorage.setItem("theme", nextMode);
  localStorage.setItem("partner-theme", nextMode);
};
