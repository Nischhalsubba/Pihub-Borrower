interface ImportMetaEnv {
  readonly VITE_PIHUB_RUNTIME?: 'demo' | 'api';
  readonly VITE_PIHUB_API_BASE_URL?: string;
  readonly VITE_PIHUB_TELEMETRY_URL?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
