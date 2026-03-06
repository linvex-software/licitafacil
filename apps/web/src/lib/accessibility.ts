export type FontSize = "normal" | "large" | "xlarge";
export type Contrast = "default" | "high";
const FONT_SIZE_STORAGE_KEY = "licitafacil:fontSize";

export const applyFontSize = (size: FontSize) => {
  const root = document.documentElement;
  root.classList.remove("font-normal", "font-large", "font-xlarge");
  if (size !== "normal") {
    root.classList.add(`font-${size}`);
  }
  localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
};

export const applyContrast = (contrast: Contrast) => {
  const root = document.documentElement;
  if (contrast === "high") {
    root.classList.add("high-contrast");
  } else {
    root.classList.remove("high-contrast");
  }
  localStorage.setItem("a11y-contrast", contrast);
};

export const loadAccessibilityPrefs = () => {
  const size = (localStorage.getItem(FONT_SIZE_STORAGE_KEY) as FontSize) ?? "normal";
  const contrast = (localStorage.getItem("a11y-contrast") as Contrast) ?? "default";
  applyFontSize(size);
  applyContrast(contrast);
  return { size, contrast };
};
