// ESLint 9 flat config.
// Ek bağımlılık gerektirmez; yalnızca `eslint` paketinin kendisiyle çalışır.

export default [
  {
    ignores: [
      "node_modules/**",
      "build/**",
      ".react-router/**",
      ".cache/**",
      "extensions/*/dist/**",
      "extensions/*/node_modules/**",
      "prisma/migrations/**",
      "**/*.config.js",
    ],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Tarayıcı
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        FormData: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        crypto: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        // Node
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        globalThis: "readonly",
        global: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "writable",
        require: "readonly",
        exports: "writable",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-undef": "error",
      "no-console": "off",
    },
  },
];
