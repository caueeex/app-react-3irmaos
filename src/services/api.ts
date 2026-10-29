import type { DashboardPayload, InventoryFilters, InventoryItem } from '../types/inventory';
import type { ApiDashboardData } from '../types/api';
import { clearAuthSession } from './authStorage';
import { emitUnauthorized } from './authEvents';
import { getSupabaseUrl, isSupabaseConfigured, supabase } from './supabase';
import { fetchDashboardFromSupabase } from './supabaseDashboard';
import {
  listarProdutosChat,
  textoMovimentacaoMes,
  textoMovimentacaoMesApenasTipo,
  textoMovimentacaoMesProduto,
  textoPerdasMes,
  textoQuantidade,
  textoRisco,
} from './supabaseChat';

export function getApiBaseURL(): string {
  return getSupabaseUrl();
}

export function getApiTunnelNeedsEnvHint(): boolean {
  return false;
}

type AuthFlowContext = 'login' | 'register';

function supabaseErrorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return undefined;
}

/** Mensagem amigável para falha de login/cadastro. */
export function formatLoginOrConnectionError(
  error: unknown,
  context: AuthFlowContext = 'login',
): { title: string; message: string } {
  const httpTitle = context === 'register' ? 'Não foi possível cadastrar' : 'Não foi possível entrar';

  if (!isSupabaseConfigured()) {
    return {
      title: 'Serviço indisponível',
      message: 'O acesso ao sistema está temporariamente indisponível. Tente mais tarde ou fale com o administrador.',
    };
  }

  const msg = supabaseErrorMessage(error);
  if (msg) {
    // Mensagens já amigáveis vindas do banco (login/senha, e-mail duplicado, etc.)
    if (/e-mail ou senha|já está cadastrado|obrigatórios/i.test(msg)) {
      return { title: httpTitle, message: msg };
    }
    if (/invalid.?api.?key|JWT|Unauthorized|Failed to fetch|NetworkError|network/i.test(msg)) {
      return {
        title: 'Sem conexão',
        message: 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.',
      };
    }
    return {
      title: httpTitle,
      message: 'Não foi possível concluir. Tente de novo ou fale com o administrador.',
    };
  }

  return {
    title: httpTitle,
    message: 'Algo inesperado aconteceu. Tente de novo.',
  };
}

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
    data.perdasMesTotal ?? movement.reduce((acc, w) => acc + w.losses, 0);

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

export async function fetchDashboard(filters: InventoryFilters): Promise<DashboardPayload> {
  const data = await fetchDashboardFromSupabase(filters);
  return mapDashboardApiToPayload(data);
}

export type LoginResponse = {
  token: string;
  usuario: { id: number; nome: string; email: string; perfil: string };
};

export async function loginRequest(email: string, senha: string): Promise<LoginResponse> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado.');
  }
  const { data, error } = await supabase.rpc('app_login', {
    p_email: email.trim(),
    p_senha: senha,
  });
  if (error) throw error;
  return data as LoginResponse;
}

export type ApiPerfil = {
  id_perfil: number;
  nome: string;
  descricao?: string | null;
};

export async function fetchPerfisPublic(): Promise<ApiPerfil[]> {
  const { data, error } = await supabase
    .from('perfil')
    .select('id_perfil, nome, descricao')
    .order('id_perfil', { ascending: true });
  if (error) throw error;
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
  const { data, error } = await supabase.rpc('app_register', {
    p_nome: nome.trim(),
    p_email: email.trim(),
    p_senha: senha,
    p_id_perfil: id_perfil,
  });
  if (error) throw error;
  return data as RegisterResponse;
}

export type ChatProduto = { id_produto: number; nome: string };

export async function fetchChatProdutos(): Promise<{ produtos: ChatProduto[] }> {
  const produtos = await listarProdutosChat();
  return { produtos };
}

export async function fetchChatQuantidade(idProduto?: number): Promise<{ texto: string }> {
  return { texto: await textoQuantidade(idProduto) };
}

export async function fetchChatRisco(): Promise<{ texto: string }> {
  return { texto: await textoRisco() };
}

export async function fetchChatMovimentacaoMes(): Promise<{ texto: string }> {
  return { texto: await textoMovimentacaoMes() };
}

export async function fetchChatMovimentacaoMesTipo(
  tipo: 'ENTRADA' | 'SAÍDA',
): Promise<{ texto: string }> {
  return { texto: await textoMovimentacaoMesApenasTipo(tipo) };
}

export async function fetchChatMovimentacaoMesProduto(
  tipo: 'ENTRADA' | 'SAÍDA',
  idProduto: number,
): Promise<{ texto: string }> {
  return { texto: await textoMovimentacaoMesProduto(tipo, idProduto) };
}

export async function fetchChatPerdasMes(): Promise<{ texto: string }> {
  return { texto: await textoPerdasMes() };
}

/** Mantido para chamadas legadas; com Supabase direto não há 401 HTTP. */
export async function forceLogoutOnAuthFailure(): Promise<void> {
  await clearAuthSession();
  emitUnauthorized();
}
