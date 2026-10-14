import React from "react";
import { accentPresets, defaultAccentColor } from "../utils/appearance.js";

const AccentColorSettings = ({ value = defaultAccentColor, onChange, description = "Choose a preset or use the color picker to set a custom accent." }) => {
  const selectedColor = /^#[0-9a-f]{6}$/i.test(value) ? value : defaultAccentColor;

  return (
    <section aria-label="Accent color" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Accent theme</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {accentPresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            aria-label={`${preset.name} theme`}
            aria-pressed={selectedColor.toLowerCase() === preset.value}
            onClick={() => onChange(preset.value)}
            className={`h-9 w-9 rounded-full border-2 transition hover:scale-105 ${selectedColor.toLowerCase() === preset.value ? "border-slate-900 ring-2 ring-slate-300 dark:border-white dark:ring-slate-600" : "border-white shadow dark:border-slate-700"}`}
            style={{ backgroundColor: preset.value }}
          />
        ))}
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Custom color
          <input aria-label="Custom accent color" type="color" value={selectedColor} onChange={(event) => onChange(event.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-900" />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="h-7 w-7 rounded-lg shadow-sm" style={{ backgroundColor: selectedColor }} />
        <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{selectedColor}</span>
      </div>
    </section>
  );
};

export default AccentColorSettings;
