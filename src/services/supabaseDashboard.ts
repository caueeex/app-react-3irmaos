import type { ApiDashboardData } from '../types/api';
import type { InventoryFilters } from '../types/inventory';
import { supabase } from './supabase';

type FiltrosDb = {
  categoria?: string;
  lote?: string;
  tagRfid?: string;
  dataFabricacaoInicio?: string;
  dataFabricacaoFim?: string;
  dataValidadeInicio?: string;
  dataValidadeFim?: string;
};

function calcularDiasRestantes(dataVencimentoStr: string | null | undefined): number | null {
  if (!dataVencimentoStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dataVencimentoStr);
  vencimento.setHours(0, 0, 0, 0);
  const diffTime = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatarData(dataDb: string | null | undefined): string {
  if (!dataDb) return '';
  const [ano, mes, dia] = dataDb.split('-');
  return `${dia}/${mes}/${ano}`;
}

function normStatus(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

function normTipoMov(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function idsProdutoPorNome(nome: string): Promise<number[]> {
  const termo = nome.trim();
  if (!termo) return [];

  // Preferência: nome exato (select do filtro); fallback: parcial.
  const exact = await supabase
    .from('produto')
    .select('id_produto')
    .eq('nome', termo);
  if (exact.error) throw new Error(exact.error.message);
  if ((exact.data ?? []).length > 0) {
    return (exact.data ?? []).map((r) => r.id_produto as number);
  }

  const { data, error } = await supabase
    .from('produto')
    .select('id_produto')
    .ilike('nome', `%${termo}%`);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id_produto as number);
}

async function buscarInventarioFEFO(filtros: FiltrosDb = {}) {
  let idProdutosCategoria: number[] | null = null;
  if (filtros.categoria) {
    idProdutosCategoria = await idsProdutoPorNome(filtros.categoria);
    if (idProdutosCategoria.length === 0) return [];
  }

  let query = supabase
    .from('pacote')
    .select(`
      id_pacote,
      lote!inner (
        id_lote,
        codigo_lote,
        data_fabricacao,
        data_validade,
        status,
        id_produto,
        produto!inner ( id_produto, nome )
      ),
      rfid_etiqueta ( epc, status )
    `)
    .order('data_validade', { referencedTable: 'lote', ascending: true });

  if (idProdutosCategoria && idProdutosCategoria.length > 0) {
    query = query.filter('lote.id_produto', 'in', `(${idProdutosCategoria.join(',')})`);
  }
  if (filtros.lote) query = query.ilike('lote.codigo_lote', `%${filtros.lote}%`);
  if (filtros.dataFabricacaoInicio) query = query.gte('lote.data_fabricacao', filtros.dataFabricacaoInicio);
  if (filtros.dataFabricacaoFim) query = query.lte('lote.data_fabricacao', filtros.dataFabricacaoFim);
  if (filtros.dataValidadeInicio) query = query.gte('lote.data_validade', filtros.dataValidadeInicio);
  if (filtros.dataValidadeFim) query = query.lte('lote.data_validade', filtros.dataValidadeFim);
  if (filtros.tagRfid) query = query.ilike('rfid_etiqueta.epc', `%${filtros.tagRfid}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function buscarMovimentacoesMesAtual() {
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .select('id_movimentacao, tipo_movimentacao, data_hora')
    .gte('data_hora', inicioMes.toISOString())
    .order('data_hora', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

function buildFiltrosDb(filters: InventoryFilters): FiltrosDb {
  const f: FiltrosDb = {};
  if (filters.manufactureFrom) f.dataFabricacaoInicio = filters.manufactureFrom;
  if (filters.manufactureTo) f.dataFabricacaoFim = filters.manufactureTo;
  if (filters.expiryFrom) f.dataValidadeInicio = filters.expiryFrom;
  if (filters.expiryTo) f.dataValidadeFim = filters.expiryTo;
  const cat = filters.categoria?.trim();
  if (cat) f.categoria = cat;
  const lr = filters.lotOrRfid?.trim();
  if (lr) {
    f.lote = lr;
    f.tagRfid = lr;
  }
  return f;
}

export async function fetchDashboardFromSupabase(filters: InventoryFilters): Promise<ApiDashboardData> {
  const filtros = buildFiltrosDb(filters);

  const [inventarioCru, movimentacoesMes, alertasResult, produtosAbaixoMinimo] = await Promise.all([
    buscarInventarioFEFO(filtros),
    buscarMovimentacoesMesAtual(),
    supabase
      .from('alerta')
      .select('id_alerta, tipo_alerta, mensagem, data_hora', { count: 'exact' })
      .order('data_hora', { ascending: false })
      .limit(10),
    supabase.from('produto').select('id_produto, nome, estoque_minimo'),
  ]);

  if (alertasResult.error) throw new Error(alertasResult.error.message);
  if (produtosAbaixoMinimo.error) throw new Error(produtosAbaixoMinimo.error.message);

  const bucketsProximos7 = { ate3: 0, ate5: 0, ate7: 0 };
  let totalVencidos = 0;

  inventarioCru.forEach((item) => {
    const lote = item.lote as { data_validade?: string } | { data_validade?: string }[] | null;
    const loteObj = Array.isArray(lote) ? lote[0] : lote;
    const diasRestantes = calcularDiasRestantes(loteObj?.data_validade);
    if (diasRestantes === null) return;
    if (diasRestantes < 0) {
      totalVencidos += 1;
      return;
    }
    if (diasRestantes <= 3) bucketsProximos7.ate3 += 1;
    else if (diasRestantes <= 5) bucketsProximos7.ate5 += 1;
    else if (diasRestantes <= 7) bucketsProximos7.ate7 += 1;
  });

  const movimentacaoPorSemana: Record<string, { entradas: number; saidas: number; perdas: number }> = {};
  for (let i = 1; i <= 4; i++) movimentacaoPorSemana[`Sem ${i}`] = { entradas: 0, saidas: 0, perdas: 0 };

  let entradasMes = 0;
  let saidasMes = 0;
  let perdasMesTotal = 0;

  movimentacoesMes.forEach((mov) => {
    const dataMov = new Date(mov.data_hora as string);
    const dia = dataMov.getDate();
    let semana = Math.ceil(dia / 7);
    if (semana > 4) semana = 4;
    const chaveSemana = `Sem ${semana}`;
    const tipo = normTipoMov(mov.tipo_movimentacao);
    if (tipo === 'ENTRADA') {
      movimentacaoPorSemana[chaveSemana].entradas += 1;
      entradasMes += 1;
    } else if (tipo === 'SAIDA') {
      movimentacaoPorSemana[chaveSemana].saidas += 1;
      saidasMes += 1;
    } else if (tipo === 'PERDA') {
      movimentacaoPorSemana[chaveSemana].perdas += 1;
      perdasMesTotal += 1;
    }
  });

  const movimentacaoMes = Object.keys(movimentacaoPorSemana).map((chave) => ({
    nome: chave,
    entradas: movimentacaoPorSemana[chave].entradas,
    saidas: movimentacaoPorSemana[chave].saidas,
    perdas: movimentacaoPorSemana[chave].perdas,
  }));

  const visaoGeral = {
    totalItens: inventarioCru.length,
    marcadosEntrega: inventarioCru.filter((p) => {
      const lote = p.lote as { status?: string } | { status?: string }[] | null;
      const loteObj = Array.isArray(lote) ? lote[0] : lote;
      return normStatus(loteObj?.status) === 'entrega';
    }).length,
    variacaoEstoqueMes: entradasMes - saidasMes,
  };

  const inventarioAtivoFEFO = inventarioCru.map((item) => {
    const lote = item.lote as {
      codigo_lote?: string;
      data_fabricacao?: string;
      data_validade?: string;
      produto?: { nome?: string } | { nome?: string }[];
    } | null;
    const loteObj = Array.isArray(lote) ? lote[0] : lote;
    const produto = loteObj?.produto;
    const prodObj = Array.isArray(produto) ? produto[0] : produto;
    const rfid = item.rfid_etiqueta as { epc?: string } | { epc?: string }[] | null;
    const rfidObj = Array.isArray(rfid) ? rfid[0] : rfid;
    const diasRestantes = calcularDiasRestantes(loteObj?.data_validade);

    return {
      tagRfid: rfidObj?.epc ?? 'Desconhecida',
      nome: prodObj?.nome ?? 'Sem nome',
      lote: loteObj?.codigo_lote ?? '',
      dataFabricacao: formatarData(loteObj?.data_fabricacao),
      dataValidade: formatarData(loteObj?.data_validade),
      diasRestantes,
      status: diasRestantes !== null ? `${diasRestantes} dias` : 'N/A',
      critico: diasRestantes !== null && diasRestantes <= 7,
      highlight: diasRestantes !== null && diasRestantes <= 7,
    };
  });

  const alertaValidade = {
    totalCriticos: bucketsProximos7.ate3,
    totalVencidos,
    bucketsProximos7,
    grupos: [
      { nome: '3 dias restantes', quantidade: bucketsProximos7.ate3, cor: 'hsl(0, 72%, 51%)' },
      { nome: '5 dias restantes', quantidade: bucketsProximos7.ate5, cor: 'hsl(45, 100%, 51%)' },
      { nome: '7 dias restantes', quantidade: bucketsProximos7.ate7, cor: 'hsl(220, 15%, 40%)' },
    ].filter((g) => g.quantidade > 0),
  };

  return {
    visaoGeral,
    alertaValidade,
    movimentacaoMes,
    perdasMesTotal,
    inventarioAtivoFEFO,
    alertasRecentes: alertasResult.data ?? [],
    totalAlertasAtivos: alertasResult.count ?? 0,
    produtosComEstoqueBaixo: (produtosAbaixoMinimo.data ?? []).map((p) => ({
      id_produto: p.id_produto,
      nome: p.nome,
      estoque_minimo: p.estoque_minimo,
    })),
  } as ApiDashboardData;
}
