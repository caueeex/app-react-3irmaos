import * as Sharing from 'expo-sharing';
import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export const REPORT_TYPES = [
  'Movimentação',
  'Validade',
  'Inventário crítico',
  'Entregas pendentes',
] as const;

export const REPORT_PERIODS = [
  'Últimos 7 dias',
  'Últimos 30 dias',
  'Trimestre atual',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export type ReportRange = { dataInicio: string; dataFim: string; label: string };

export type ReportPreview = {
  titulo: string;
  periodo: string;
  totalLinhas: number;
  destaques: string[];
};

type ReportRow = Record<string, string | number>;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolveReportRange(period: ReportPeriod): ReportRange {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = isoDate(hoje);

  if (period === 'Últimos 7 dias') {
    const ini = new Date(hoje);
    ini.setDate(ini.getDate() - 6);
    return { dataInicio: isoDate(ini), dataFim: fim, label: period };
  }
  if (period === 'Últimos 30 dias') {
    const ini = new Date(hoje);
    ini.setDate(ini.getDate() - 29);
    return { dataInicio: isoDate(ini), dataFim: fim, label: period };
  }
  // Trimestre atual
  const q = Math.floor(hoje.getMonth() / 3);
  const ini = new Date(hoje.getFullYear(), q * 3, 1);
  return { dataInicio: isoDate(ini), dataFim: fim, label: period };
}

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function diasRestantes(dataValidade: string | null | undefined): number | null {
  if (!dataValidade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataValidade);
  venc.setHours(0, 0, 0, 0);
  return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function rowsToCsv(headers: string[], rows: ReportRow[]): string {
  const body = rows.map((r) => headers.map((h) => escapeCsv(String(r[h] ?? ''))).join(','));
  return `\uFEFF${[headers.join(','), ...body].join('\n')}`;
}

async function fetchMovimentacaoRows(range: ReportRange): Promise<{ headers: string[]; rows: ReportRow[] }> {
  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .select(
      `
      id_movimentacao,
      tipo_movimentacao,
      data_hora,
      pacote (
        lote (
          codigo_lote,
          produto ( nome )
        )
      )
    `,
    )
    .gte('data_hora', `${range.dataInicio}T00:00:00`)
    .lte('data_hora', `${range.dataFim}T23:59:59`)
    .order('data_hora', { ascending: false });

  if (error) throw new Error(error.message);

  const headers = ['id', 'tipo', 'data_hora', 'produto', 'lote'];
  const rows: ReportRow[] = (data ?? []).map((row) => {
    const pacote = unwrapOne(row.pacote as object | object[] | null);
    const lote = unwrapOne(
      pacote && 'lote' in pacote
        ? (pacote as { lote?: object | object[] }).lote
        : null,
    ) as { codigo_lote?: string; produto?: { nome?: string } | { nome?: string }[] } | null;
    const produto = unwrapOne(lote?.produto);
    return {
      id: row.id_movimentacao,
      tipo: String(row.tipo_movimentacao ?? ''),
      data_hora: String(row.data_hora ?? ''),
      produto: String(produto?.nome ?? ''),
      lote: String(lote?.codigo_lote ?? ''),
    };
  });
  return { headers, rows };
}

async function fetchInventarioRows(opts: {
  range: ReportRange;
  mode: 'validade' | 'critico' | 'entrega';
}): Promise<{ headers: string[]; rows: ReportRow[] }> {
  const { data, error } = await supabase
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
        produto!inner ( nome )
      ),
      rfid_etiqueta ( epc )
    `,
    )
    .order('data_validade', { referencedTable: 'lote', ascending: true });

  if (error) throw new Error(error.message);

  const headers = [
    'id_pacote',
    'produto',
    'lote',
    'status_pacote',
    'data_fabricacao',
    'data_validade',
    'dias_restantes',
    'tag_rfid',
  ];

  let rows: ReportRow[] = (data ?? []).map((row) => {
    const lote = unwrapOne(row.lote as object | object[] | null) as {
      codigo_lote?: string;
      data_fabricacao?: string | null;
      data_validade?: string | null;
      status?: string | null;
      produto?: { nome?: string } | { nome?: string }[];
    } | null;
    const produto = unwrapOne(lote?.produto);
    const rfid = unwrapOne(row.rfid_etiqueta as { epc?: string } | { epc?: string }[] | null);
    const dias = diasRestantes(lote?.data_validade);
    return {
      id_pacote: row.id_pacote,
      produto: String(produto?.nome ?? ''),
      lote: String(lote?.codigo_lote ?? ''),
      status_pacote: String(row.status ?? ''),
      data_fabricacao: String(lote?.data_fabricacao ?? ''),
      data_validade: String(lote?.data_validade ?? ''),
      dias_restantes: dias ?? '',
      tag_rfid: String(rfid?.epc ?? ''),
      _lote_status: String(lote?.status ?? '').toLowerCase(),
      _dias: dias ?? 9999,
      _validade: String(lote?.data_validade ?? ''),
    };
  });

  if (opts.mode === 'critico') {
    rows = rows.filter((r) => typeof r._dias === 'number' && r._dias <= 7);
  } else if (opts.mode === 'entrega') {
    rows = rows.filter((r) => String(r._lote_status) === 'entrega');
  } else {
    // Validade: itens cuja data de validade cai no período, ou já vencidos até o fim do período
    rows = rows.filter((r) => {
      const v = String(r._validade);
      if (!v) return false;
      return v >= opts.range.dataInicio && v <= opts.range.dataFim;
    });
  }

  return {
    headers,
    rows: rows.map(({ _lote_status, _dias, _validade, ...rest }) => rest),
  };
}

export async function buildReportData(
  type: ReportType,
  period: ReportPeriod,
): Promise<{ range: ReportRange; headers: string[]; rows: ReportRow[]; preview: ReportPreview }> {
  const range = resolveReportRange(period);

  let headers: string[];
  let rows: ReportRow[];

  if (type === 'Movimentação') {
    ({ headers, rows } = await fetchMovimentacaoRows(range));
  } else if (type === 'Validade') {
    ({ headers, rows } = await fetchInventarioRows({ range, mode: 'validade' }));
  } else if (type === 'Inventário crítico') {
    ({ headers, rows } = await fetchInventarioRows({ range, mode: 'critico' }));
  } else {
    ({ headers, rows } = await fetchInventarioRows({ range, mode: 'entrega' }));
  }

  const destaques: string[] = [];
  if (type === 'Movimentação') {
    const entradas = rows.filter((r) => String(r.tipo).toUpperCase().includes('ENTRADA')).length;
    const saidas = rows.filter((r) =>
      String(r.tipo)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .includes('SAIDA'),
    ).length;
    const perdas = rows.filter((r) => String(r.tipo).toUpperCase().includes('PERDA')).length;
    destaques.push(`Entradas: ${entradas}`, `Saídas: ${saidas}`, `Perdas: ${perdas}`);
  } else if (type === 'Inventário crítico') {
    const vencidos = rows.filter((r) => Number(r.dias_restantes) < 0).length;
    const ate7 = rows.filter((r) => {
      const d = Number(r.dias_restantes);
      return Number.isFinite(d) && d >= 0 && d <= 7;
    }).length;
    destaques.push(`Vencidos: ${vencidos}`, `Críticos (0–7 dias): ${ate7}`);
  } else if (type === 'Validade') {
    destaques.push(`Itens com validade no período: ${rows.length}`);
  } else {
    destaques.push(`Pacotes marcados para entrega: ${rows.length}`);
  }

  return {
    range,
    headers,
    rows,
    preview: {
      titulo: type,
      periodo: `${range.label} (${range.dataInicio} a ${range.dataFim})`,
      totalLinhas: rows.length,
      destaques,
    },
  };
}

async function saveAndShare(content: string, filename: string, mimeType: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
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
  const base64 = globalThis.btoa(unescape(encodeURIComponent(content)));
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartilhamento não disponível neste aparelho.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Salvar ou enviar relatório' });
}

export async function exportReportCsv(type: ReportType, period: ReportPeriod): Promise<void> {
  const { range, headers, rows } = await buildReportData(type, period);
  const csv = rowsToCsv(headers, rows);
  const slug = type
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  await saveAndShare(
    csv,
    `relatorio_${slug}_${range.dataInicio}_${range.dataFim}.csv`,
    'text/csv',
  );
}

export function formatPreviewAlert(preview: ReportPreview): string {
  return [
    `Tipo: ${preview.titulo}`,
    `Período: ${preview.periodo}`,
    `Registros: ${preview.totalLinhas}`,
    ...preview.destaques,
  ].join('\n');
}
