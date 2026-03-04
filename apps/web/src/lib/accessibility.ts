export type FontSize = "normal" | "large" | "xlarge";
export type Contrast = "default" | "high";

export const applyFontSize = (size: FontSize) => {
  const root = document.documentElement;
  root.classList.remove("font-normal", "font-large", "font-xlarge");
  root.classList.add(`font-${size}`);
  localStorage.setItem("a11y-font-size", size);
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
  const size = (localStorage.getItem("a11y-font-size") as FontSize) ?? "normal";
  const contrast = (localStorage.getItem("a11y-contrast") as Contrast) ?? "default";
  applyFontSize(size);
  applyContrast(contrast);
  return { size, contrast };
};
