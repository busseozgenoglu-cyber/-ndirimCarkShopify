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
        cancelAnimationFrame: "readonly",
        performance: "readonly",
        structuredClone: "readonly",
        queueMicrotask: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        EventTarget: "readonly",
        HTMLElement: "readonly",
        HTMLCanvasElement: "readonly",
        CanvasRenderingContext2D: "readonly",
        Image: "readonly",
        alert: "readonly",
        confirm: "readonly",
        btoa: "readonly",
        atob: "readonly",
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
      // Not: eslint-plugin-react gibi eklentiler olmadan çekirdek
      // "no-unused-vars" kuralı JSX içinde kullanılan import'ları "kullanılmıyor"
      // sanır (yanlış pozitif). Bu repo ek bağımlılık istemediği için kural
      // kapalı tutuluyor; tanımsız değişkenler "no-undef" ile yakalanıyor.
      "no-unused-vars": "off",
      "no-undef": "error",
      "no-console": "off",
    },
  },
];
