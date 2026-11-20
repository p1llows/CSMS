// ESLint Flat Config for Vite + React + TypeScript
// Docs: https://eslint.org/docs/latest/use/configure/configuration-files-new

const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import");
const jsxA11y = require("eslint-plugin-jsx-a11y");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  // Global ignore patterns
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
    ],
  },
  // Type-aware rules for TS/TSX files (uses tsconfig project)
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
        node: { extensions: [".js", ".jsx", ".ts", ".tsx"] },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      // React JSX runtime
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Accessibility
      "jsx-a11y/anchor-is-valid": "warn",

      // Import hygiene
      "import/order": [
        "warn",
        {
          groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-unresolved": ["error", { commonjs: true, amd: true }],

      // TypeScript
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // JS/JSX files without TS project requirement (avoids parser project errors)
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
        node: { extensions: [".js", ".jsx", ".ts", ".tsx"] },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "import/order": [
        "warn",
        {
          groups: [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-unresolved": ["error", { commonjs: true, amd: true }],
    },
  },
];
