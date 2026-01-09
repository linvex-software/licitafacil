/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "./base.cjs",
    "next/core-web-vitals",
  ],
  env: {
    browser: true,
  },
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/jsx-key": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
};

