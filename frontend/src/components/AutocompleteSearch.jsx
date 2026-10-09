import React, { useMemo, useState } from "react";

const AutocompleteSearch = ({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder,
  className = "",
  inputClassName = "",
  ...inputProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const matchingSuggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    if (!query) return [];

    return [...new Set(suggestions.filter(Boolean))]
      .filter((suggestion) => suggestion.toLocaleLowerCase().includes(query))
      .slice(0, 8);
  }, [suggestions, value]);

  const selectSuggestion = (suggestion) => {
    onChange(suggestion);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!isOpen || matchingSuggestions.length === 0) {
      if (event.key === "ArrowDown" && matchingSuggestions.length > 0) setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % matchingSuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? matchingSuggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(matchingSuggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        {...inputProps}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && matchingSuggestions.length > 0}
        aria-controls={`${id}-suggestions`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-suggestion-${activeIndex}` : undefined}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setIsOpen(false);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
      />
      {isOpen && matchingSuggestions.length > 0 && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {matchingSuggestions.map((suggestion, index) => (
            <li key={suggestion} role="option" aria-selected={activeIndex === index}>
              <button
                id={`${id}-suggestion-${index}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-slate-800 ${
                  activeIndex === index ? "bg-emerald-50 dark:bg-slate-800" : ""
                }`}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteSearch;
