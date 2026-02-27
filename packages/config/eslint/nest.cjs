/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./base.cjs"],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    // Em NestJS muitos providers precisam import runtime para DI;
    // forçar type-only import gera falso positivo e pode quebrar injeção.
    "@typescript-eslint/consistent-type-imports": "off",
  },
};

