/// <reference types="vite/client" />

export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_TOKEN?: string;
    readonly VITE_CLOUDFLARE_ANALYTICS_TOKEN?: string;
    readonly VITE_IS_PREVIEW?: string;
    readonly [key: string]: string | undefined;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
