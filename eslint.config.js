import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      "dist",
      "eslint.config.js",
      "postcss.config.js",
      "tailwind.config.js",
      "vite.config.ts",
      "netlify",
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Only warn on unused variables, and ignore variables starting with `_`
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],

      // Allow escaping the compiler
      "@typescript-eslint/ban-ts-comment": "error",

      // Allow explicit `any`s
      "@typescript-eslint/no-explicit-any": "off",

      // START: Allow implicit `any`s
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // END: Allow implicit `any`s

      // Allow async functions without await
      "@typescript-eslint/require-await": "off",
    },
  },
]);
