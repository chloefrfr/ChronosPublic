import globals from "globals";
import js from "@eslint/js";
import { configs as tsConfigs } from "@typescript-eslint/eslint-plugin";
import { parser } from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      parser,
      globals: globals.browser,
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "import/order": [
        "error",
        {
          groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "class-methods-use-this": "off",
      "max-len": ["error", { code: 100, ignoreComments: true }],
    },
  },
  js.configs.recommended,
  tsConfigs.recommended,
];
