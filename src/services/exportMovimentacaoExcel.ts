import * as Sharing from 'expo-sharing';
import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/** Período padrão: primeiro dia do mês até hoje. */
export function defaultExportMonthRange(): { dataInicio: string; dataFim: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const dataInicio = start.toISOString().slice(0, 10);
  const dataFim = now.toISOString().slice(0, 10);
  return { dataInicio, dataFim };
}

/**
 * escopo `estoque` — planilha do inventário (fluxo Quantidade).
 * escopo `movimentacao` (padrão) — entradas/saídas do período.
 */
export type ExcelExportChatContext = {
  idProduto?: number;
  tipo?: string;
  escopo?: 'estoque' | 'movimentacao';
};

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => escapeCsv(c)).join(',')).join('\n');
}

type MovRow = {
  id_movimentacao: number;
  tipo_movimentacao: string;
  data_hora: string;
  pacote:
    | {
        lote:
          | {
              codigo_lote?: string;
              id_produto?: number;
              produto?: { nome?: string } | { nome?: string }[];
            }
          | {
              codigo_lote?: string;
              id_produto?: number;
              produto?: { nome?: string } | { nome?: string }[];
            }[];
      }
    | {
        lote:
          | {
              codigo_lote?: string;
              id_produto?: number;
              produto?: { nome?: string } | { nome?: string }[];
            }
          | {
              codigo_lote?: string;
              id_produto?: number;
              produto?: { nome?: string } | { nome?: string }[];
            }[];
      }[]
    | null;
};

type EstoqueRow = {
  id_pacote: number;
  status: string;
  lote:
    | {
        codigo_lote?: string;
        data_fabricacao?: string | null;
        data_validade?: string | null;
        status?: string | null;
        id_produto?: number;
        produto?: { nome?: string } | { nome?: string }[];
      }
    | {
        codigo_lote?: string;
        data_fabricacao?: string | null;
        data_validade?: string | null;
        status?: string | null;
        id_produto?: number;
        produto?: { nome?: string } | { nome?: string }[];
      }[]
    | null;
  rfid_etiqueta: { epc?: string } | { epc?: string }[] | null;
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Inventário atual (pacotes) — usado no fluxo Quantidade do chatbot. */
export async function fetchEstoqueCsv(params?: { idProduto?: number }): Promise<string> {
  let query = supabase
    .from('pacote')
    .select(
      `
      id_pacote,
      status,
      lote!inner (
        codigo_lote,
        data_fabricacao,
        data_validade,
        status,
        id_produto,
        produto!inner ( nome )
      ),
      rfid_etiqueta ( epc )
    `,
    )
    .order('data_validade', { referencedTable: 'lote', ascending: true });

  if (params?.idProduto != null) {
    query = query.eq('lote.id_produto', params.idProduto);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EstoqueRow[];
  const header = [
    'id_pacote',
    'produto',
    'lote',
    'status_pacote',
    'data_fabricacao',
    'data_validade',
    'dias_restantes',
    'epc',
  ];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const body = rows.map((row) => {
    const lote = unwrapOne(row.lote);
    const produto = unwrapOne(lote?.produto);
    const rfid = unwrapOne(row.rfid_etiqueta);
    let dias = '';
    if (lote?.data_validade) {
      const venc = new Date(lote.data_validade);
      venc.setHours(0, 0, 0, 0);
      dias = String(Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return [
      String(row.id_pacote),
      String(produto?.nome ?? ''),
      String(lote?.codigo_lote ?? ''),
      String(row.status ?? ''),
      String(lote?.data_fabricacao ?? ''),
      String(lote?.data_validade ?? ''),
      dias,
      String(rfid?.epc ?? ''),
    ];
  });

  return `\uFEFF${toCsv([header, ...body])}`;
}

export async function fetchMovimentacaoCsv(params?: {
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
  idProduto?: number;
}): Promise<string> {
  const range =
    params?.dataInicio && params?.dataFim
      ? { dataInicio: params.dataInicio, dataFim: params.dataFim }
      : defaultExportMonthRange();

  let query = supabase
    .from('movimentacao_estoque')
    .select(
      `
      id_movimentacao,
      tipo_movimentacao,
      data_hora,
      pacote (
        lote (
          codigo_lote,
          id_produto,
          produto ( nome )
        )
      )
    `,
    )
    .gte('data_hora', `${range.dataInicio}T00:00:00`)
    .lte('data_hora', `${range.dataFim}T23:59:59`)
    .order('data_hora', { ascending: false });

  const tipo = params?.tipo?.trim();
  if (tipo && tipo.toUpperCase() !== 'TODOS') {
    query = query.eq('tipo_movimentacao', tipo.toUpperCase() === 'SAIDA' ? 'SAÍDA' : tipo);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MovRow[];
  const filtered =
    params?.idProduto != null
      ? rows.filter((row) => {
          const pacote = unwrapOne(row.pacote);
          const lote = unwrapOne(pacote?.lote);
          return lote?.id_produto === params.idProduto;
        })
      : rows;

  const header = ['id_movimentacao', 'tipo', 'data_hora', 'produto', 'lote'];
  const body = filtered.map((row) => {
    const pacote = unwrapOne(row.pacote);
    const lote = unwrapOne(pacote?.lote);
    const produto = unwrapOne(lote?.produto);
    return [
      String(row.id_movimentacao),
      String(row.tipo_movimentacao ?? ''),
      String(row.data_hora ?? ''),
      String(produto?.nome ?? ''),
      String(lote?.codigo_lote ?? ''),
    ];
  });

  return `\uFEFF${toCsv([header, ...body])}`;
}

export async function saveAndShareCsv(csv: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const dir = cacheDirectory;
  if (!dir) throw new Error('Armazenamento temporário indisponível.');

  const uri = `${dir}${filename}`;
  const base64 = globalThis.btoa(unescape(encodeURIComponent(csv)));
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Compartilhamento não disponível neste aparelho.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Salvar ou enviar CSV',
    UTI: 'public.comma-separated-values-text',
  });
}

/** Exporta planilha conforme o contexto do chatbot (estoque ou movimentações). */
export async function exportMovimentacaoExcelToShareSheet(
  ctx?: ExcelExportChatContext | null,
): Promise<void> {
  const escopo = ctx?.escopo ?? 'movimentacao';

  if (escopo === 'estoque') {
    const csv = await fetchEstoqueCsv({ idProduto: ctx?.idProduto });
    const hoje = new Date().toISOString().slice(0, 10);
    const suffix = ctx?.idProduto != null ? `_produto_${ctx.idProduto}` : '_geral';
    await saveAndShareCsv(csv, `estoque_${hoje}${suffix}.csv`);
    return;
  }

  const range = defaultExportMonthRange();
  const csv = await fetchMovimentacaoCsv({
    ...range,
    tipo: ctx?.tipo ?? 'TODOS',
    idProduto: ctx?.idProduto,
  });

  let suffix = '';
  if (ctx?.idProduto != null) suffix += `_produto_${ctx.idProduto}`;
  else if (ctx?.tipo && ctx.tipo !== 'TODOS') {
    const t = ctx.tipo.toUpperCase();
    if (t === 'ENTRADA') suffix += '_somente_entradas';
    else if (t === 'SAÍDA' || t === 'SAIDA') suffix += '_somente_saidas';
    else suffix += `_${t.toLowerCase()}`;
  }

  const filename = `movimentacoes_${range.dataInicio}_${range.dataFim}${suffix}.csv`;
  await saveAndShareCsv(csv, filename);
}
