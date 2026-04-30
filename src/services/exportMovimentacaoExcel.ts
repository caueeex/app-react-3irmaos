import axios from 'axios';
import * as Sharing from 'expo-sharing';
import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { api } from './api';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return globalThis.btoa(binary);
}

/** Período padrão: primeiro dia do mês até hoje (alinhado ao uso típico do painel). */
export function defaultExportMonthRange(): { dataInicio: string; dataFim: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const dataInicio = start.toISOString().slice(0, 10);
  const dataFim = now.toISOString().slice(0, 10);
  return { dataInicio, dataFim };
}

function parseErrorFromBuffer(data: ArrayBuffer): string | null {
  try {
    const text = new TextDecoder().decode(data);
    const j = JSON.parse(text) as { erro?: unknown };
    return typeof j.erro === 'string' ? j.erro : null;
  } catch {
    return null;
  }
}

/** Alinha com o fluxo do chat (quantidade/mov. por produto). */
export type ExcelExportChatContext = {
  /** Filtra linhas do relatório a este produto (movimentações daquele lote). */
  idProduto?: number;
  /** ENTRADA | SAÍDA — quando só quer um tipo (ex.: submenu movimentação). */
  tipo?: string;
};

export async function fetchMovimentacaoExcelBuffer(params?: {
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
  idProduto?: number;
}): Promise<ArrayBuffer> {
  const range =
    params?.dataInicio && params?.dataFim
      ? { dataInicio: params.dataInicio, dataFim: params.dataFim }
      : defaultExportMonthRange();

  try {
    const response = await api.get<ArrayBuffer>('/api/export/inventario', {
      params: {
        formato: 'EXCEL',
        tipo: params?.tipo ?? 'TODOS',
        dataInicio: range.dataInicio,
        dataFim: range.dataFim,
        ...(params?.idProduto != null ? { id_produto: params.idProduto } : {}),
      },
      responseType: 'arraybuffer',
      timeout: 120000,
    });

    const buf = response.data as ArrayBuffer;
    if (buf.byteLength < 4096) {
      const text = new TextDecoder().decode(buf);
      if (text.trimStart().startsWith('{')) {
        const msg = parseErrorFromBuffer(buf);
        throw new Error(msg ?? 'Erro ao gerar Excel.');
      }
    }

    return buf;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.data !== undefined && e.response.status >= 400) {
      const raw = e.response.data as ArrayBuffer | { erro?: string };
      if (raw instanceof ArrayBuffer) {
        const msg = parseErrorFromBuffer(raw);
        if (msg) throw new Error(msg);
      } else if (raw && typeof raw === 'object' && typeof raw.erro === 'string') {
        throw new Error(raw.erro);
      }
    }
    throw e;
  }
}

export async function saveAndShareMovimentacaoExcel(
  buffer: ArrayBuffer,
  filename: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
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
  await writeAsStringAsync(uri, arrayBufferToBase64(buffer), {
    encoding: EncodingType.Base64,
  });

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Compartilhamento não disponível neste aparelho.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Salvar ou enviar Excel',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });
}

/** Baixa movimentações do backend e abre a folha de compartilhamento (ou download na web). */
export async function exportMovimentacaoExcelToShareSheet(
  ctx?: ExcelExportChatContext | null,
): Promise<void> {
  const range = defaultExportMonthRange();
  const buf = await fetchMovimentacaoExcelBuffer({
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

  const filename = `movimentacoes_${range.dataInicio}_${range.dataFim}${suffix}.xlsx`;
  await saveAndShareMovimentacaoExcel(buf, filename);
}
