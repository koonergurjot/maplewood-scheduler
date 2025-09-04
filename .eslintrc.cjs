module.exports = {
  env: { browser: true, node: true, es2020: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2020, sourceType: "module" },
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  ignorePatterns: ["vite.config.ts", "vitest.config.ts", "scripts/**", "dist/**"],
  settings: { react: { version: "detect" } },
  rules: {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "react-hooks/rules-of-hooks": "off",
    "prefer-const": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "react/prop-types": "off",
    "no-ex-assign": "off",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "off"
  }
};
