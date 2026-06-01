import js from "@eslint/js";
import globals from "globals";
import next from "@next/eslint-plugin-next";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  js.configs.recommended,
  {
    plugins: {
      next,
    },
    extends: ["plugin:@next/next/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-undef": "off", // TypeScript handles this
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/generated/**",
      "*.config.ts",
      "*.config.js",
      "dist/**",
      ".history/**",
    ],
  },
];

export default config;
