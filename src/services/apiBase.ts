import { NativeModules, Platform } from 'react-native';

/** Remove barra final e evita base terminando em `/api` (paths já incluem `/api/...`). */
export function normalizeApiBaseUrl(url: string): string {
  let u = url.trim().replace(/\/$/, '');
  if (u.toLowerCase().endsWith('/api')) {
    u = u.slice(0, -4).replace(/\/$/, '');
  }
  return u;
}

function hostFromPackagerScript(): string | null {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
    if (!scriptURL) return null;
    const m = String(scriptURL).match(/^https?:\/\/([^/:?]+)/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function isTunnelLikeHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.includes('exp.direct') ||
    h.includes('ngrok') ||
    h.includes('ngrok-free') ||
    h.includes('.tunnel.')
  );
}

export type ApiBaseResolution = {
  baseURL: string;
  /** Quando true, o app provavelmente não alcança o backend sem EXPO_PUBLIC_API_URL. */
  tunnelLikelyNeedsEnv: boolean;
};

/**
 * URL base do backend (sem `/api` no final). Ordem:
 * 1) EXPO_PUBLIC_API_URL
 * 2) IP/host do Metro (bundle) — funciona no celular na mesma rede LAN
 * 3) Android emulador: 10.0.2.2; iOS/outros: localhost
 */
export function resolveApiBase(): ApiBaseResolution {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return { baseURL: normalizeApiBaseUrl(fromEnv), tunnelLikelyNeedsEnv: false };
  }

  const packagerHost = hostFromPackagerScript();
  if (packagerHost && isTunnelLikeHost(packagerHost)) {
    return {
      baseURL: Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000',
      tunnelLikelyNeedsEnv: true,
    };
  }

  if (packagerHost) {
    if (Platform.OS === 'android' && (packagerHost === 'localhost' || packagerHost === '127.0.0.1')) {
      return { baseURL: 'http://10.0.2.2:3000', tunnelLikelyNeedsEnv: false };
    }
    return { baseURL: `http://${packagerHost}:3000`, tunnelLikelyNeedsEnv: false };
  }

  return {
    baseURL: Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000',
    tunnelLikelyNeedsEnv: false,
  };
}
