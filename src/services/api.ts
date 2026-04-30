import axios from 'axios';
import type { DashboardPayload, InventoryFilters, InventoryItem } from '../types/inventory';
import type { ApiDashboardData } from '../types/api';
import { clearAuthSession, getStoredToken } from './authStorage';
import { emitUnauthorized } from './authEvents';
import { resolveApiBase } from './apiBase';

const { baseURL: resolvedApiBaseURL, tunnelLikelyNeedsEnv } = resolveApiBase();

if (__DEV__) {
  console.log('[api] baseURL =', resolvedApiBaseURL, tunnelLikelyNeedsEnv ? '(tunnel: defina EXPO_PUBLIC_API_URL se o login falhar)' : '');
}

export const api = axios.create({
  baseURL: resolvedApiBaseURL,
  timeout: 20000,
});

export function getApiBaseURL(): string {
  return resolvedApiBaseURL;
}

export function getApiTunnelNeedsEnvHint(): boolean {
  return tunnelLikelyNeedsEnv;
}

type AuthFlowContext = 'login' | 'register';

/** Mensagem amigável para falha de login/cadastro (rede vs API). */
export function formatLoginOrConnectionError(
  error: unknown,
  context: AuthFlowContext = 'login',
): { title: string; message: string } {
  const httpTitle = context === 'register' ? 'Não foi possível cadastrar' : 'Não foi possível entrar';

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const apiErro =
      typeof data === 'object' && data !== null && 'erro' in data && typeof (data as { erro: unknown }).erro === 'string'
        ? (data as { erro: string }).erro
        : typeof data === 'string'
          ? data
          : undefined;

    if (error.response) {
      return {
        title: httpTitle,
        message: apiErro ?? `Resposta HTTP ${status ?? 'desconhecida'}.`,
      };
    }

    const tunnelHint = tunnelLikelyNeedsEnv
      ? '\n\nVocê está com Expo em modo tunnel: crie um arquivo .env na raiz do app com EXPO_PUBLIC_API_URL=http://SEU_IP_NA_REDE_LOCAL:3000 (ex.: ipconfig no Windows), depois reinicie o Expo (npx expo start --clear).'
      : '';

    return {
      title: 'Sem conexão com o servidor',
      message: `O app tentou falar com:\n${resolvedApiBaseURL}\n\ne não obteve resposta (rede / firewall / backend desligado).\n\nEm dados móveis, algumas operadoras bloqueiam portas como a 3000 — experimente Wi‑Fi ou use a API em HTTPS na porta 443.${tunnelHint}`,
    };
  }

  return {
    title: 'Não foi possível entrar',
    message: 'Algo inesperado aconteceu. Tente de novo.',
  };
}

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      await clearAuthSession();
      emitUnauthorized();
    }
    return Promise.reject(error);
  },
);

/** DD/MM/AAAA → AAAA-MM-DD (vazio se inválido). */
function parseBrazilianDateToIso(br: string): string {
  const m = br.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function grupoQuantidade(grupos: ApiDashboardData['alertaValidade']['grupos'], needle: string): number {
  const g = grupos.find((x) => x.nome.includes(needle));
  return g?.quantidade ?? 0;
}

function buildStockOverview(totalItens: number) {
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const base = Math.max(0, Math.round(totalItens / 6));
  return labels.map((label, idx) => ({
    label,
    total: Math.max(0, base + Math.round((totalItens * idx) / 15)),
  }));
}

function mapInventarioRow(row: ApiDashboardData['inventarioAtivoFEFO'][number], index: number): InventoryItem {
  const manufactureIso = parseBrazilianDateToIso(row.dataFabricacao);
  const expiryIso = parseBrazilianDateToIso(row.dataValidade);
  const todayIso = new Date().toISOString().slice(0, 10);
  return {
    id: `${row.lote}-${row.tagRfid}-${index}`,
    productName: row.nome,
    lot: row.lote,
    rfid: row.tagRfid,
    category: row.nome.split('—')[1]?.trim() ?? 'Geral',
    manufactureDate: manufactureIso || todayIso,
    expiryDate: expiryIso || todayIso,
    deliveryPending: false,
    quantity: 1,
  };
}

export function mapDashboardApiToPayload(data: ApiDashboardData): DashboardPayload {
  const { visaoGeral, alertaValidade, movimentacaoMes, inventarioAtivoFEFO } = data;
  const grupos = alertaValidade.grupos ?? [];
  const b7 = alertaValidade.bucketsProximos7;

  const validityBuckets = b7
    ? { within3: b7.ate3, within5: b7.ate5, within7: b7.ate7 }
    : {
        within3: grupoQuantidade(grupos, '3 dias'),
        within5: grupoQuantidade(grupos, '5 dias'),
        within7: grupoQuantidade(grupos, '7 dias'),
      };

  const movement =
    movimentacaoMes.length > 0
      ? movimentacaoMes.map((m) => ({
          label: m.nome,
          inflow: m.entradas,
          outflow: m.saidas,
          losses: m.perdas ?? 0,
        }))
      : ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map((label) => ({
          label,
          inflow: 0,
          outflow: 0,
          losses: 0,
        }));

  const lossesMonthTotal =
    data.perdasMesTotal ??
    movement.reduce((acc, w) => acc + w.losses, 0);

  return {
    items: inventarioAtivoFEFO.map(mapInventarioRow),
    itemsForDelivery: visaoGeral.marcadosEntrega ?? 0,
    totalItems: visaoGeral.totalItens ?? 0,
    criticalItems: alertaValidade.totalCriticos ?? grupoQuantidade(grupos, '3 dias'),
    expiredItems: alertaValidade.totalVencidos ?? 0,
    stockDeltaMonth: visaoGeral.variacaoEstoqueMes ?? 0,
    lossesMonthTotal,
    stockOverview: buildStockOverview(visaoGeral.totalItens ?? 0),
    validityBuckets,
    movement,
  };
}

function buildDashboardQueryParams(filters: InventoryFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.manufactureFrom) p.dataFabricacaoInicio = filters.manufactureFrom;
  if (filters.manufactureTo) p.dataFabricacaoFim = filters.manufactureTo;
  if (filters.expiryFrom) p.dataValidadeInicio = filters.expiryFrom;
  if (filters.expiryTo) p.dataValidadeFim = filters.expiryTo;
  const cat = filters.categoria?.trim();
  if (cat) p.categoria = cat;
  const lr = filters.lotOrRfid?.trim();
  if (lr) {
    p.lote = lr;
    p.tagRfid = lr;
  }
  return p;
}

export async function fetchDashboard(filters: InventoryFilters): Promise<DashboardPayload> {
  const params = buildDashboardQueryParams(filters);
  const { data } = await api.get<ApiDashboardData>('/api/dashboard', { params });
  return mapDashboardApiToPayload(data);
}

export type LoginResponse = {
  token: string;
  usuario: { id: number; nome: string; email: string; perfil: string };
};

export async function loginRequest(email: string, senha: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/api/auth/login', { email, senha });
  return data;
}

export type ApiPerfil = {
  id_perfil: number;
  nome: string;
  descricao?: string | null;
};

/** Lista perfis (rota pública no backend) para escolha no cadastro. */
export async function fetchPerfisPublic(): Promise<ApiPerfil[]> {
  const { data } = await api.get<ApiPerfil[]>('/api/perfil');
  return Array.isArray(data) ? data : [];
}

export type RegisterResponse = {
  mensagem: string;
  usuario: { id: number; nome: string; email: string };
};

export async function registerRequest(
  nome: string,
  email: string,
  senha: string,
  id_perfil: number,
): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/api/auth/cadastro', {
    nome: nome.trim(),
    email: email.trim(),
    senha,
    id_perfil,
  });
  return data;
}

export type ChatProduto = { id_produto: number; nome: string };

export async function fetchChatProdutos(): Promise<{ produtos: ChatProduto[] }> {
  const { data } = await api.get<{ produtos: ChatProduto[] }>('/api/chat/produtos');
  return data;
}

/** Quantidade de pacotes no estoque; omita id_produto para “Geral”. */
export async function fetchChatQuantidade(idProduto?: number): Promise<{ texto: string }> {
  const { data } = await api.get<{ texto: string }>('/api/chat/quantidade', {
    params:
      idProduto === undefined ? {} : { id_produto: idProduto },
  });
  return data;
}

export async function fetchChatRisco(): Promise<{ texto: string }> {
  const { data } = await api.get<{ texto: string }>('/api/chat/risco');
  return data;
}

export async function fetchChatMovimentacaoMes(): Promise<{ texto: string }> {
  const { data } = await api.get<{ texto: string }>('/api/chat/movimentacao-mes');
  return data;
}

/** Só entradas ou só saídas no mês (opção Geral no submenu por produto). */
export async function fetchChatMovimentacaoMesTipo(
  tipo: 'ENTRADA' | 'SAÍDA',
): Promise<{ texto: string }> {
  const { data } = await api.get<{ texto: string }>('/api/chat/movimentacao-mes/tipo', {
    params: { tipo },
  });
  return data;
}

export async function fetchChatMovimentacaoMesProduto(
  tipo: 'ENTRADA' | 'SAÍDA',
  idProduto: number,
): Promise<{ texto: string }> {
  const { data } = await api.get<{ texto: string }>('/api/chat/movimentacao-mes/produto', {
    params: { tipo, id_produto: idProduto },
  });
  return data;
}

export async function fetchChatPerdasMes(): Promise<{ texto: string }> {
  const { data } = await api.get<{ texto: string }>('/api/chat/perdas-mes');
  return data;
}
