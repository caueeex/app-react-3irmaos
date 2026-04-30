import supabase from '../config/supabase.js';
import {
  buscarInventarioFEFO,
  buscarMovimentacoesMesAtual,
  contarTotalPacotes,
} from '../models/dashboardModel.js';

function inicioMesAtualISO() {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  return inicio.toISOString();
}

function calcularDiasRestantes(dataVencimentoStr) {
  if (!dataVencimentoStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dataVencimentoStr);
  vencimento.setHours(0, 0, 0, 0);
  const diffTime = vencimento - hoje;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/** Lista produtos para montar o submenu do chat (ordenado por nome). */
export async function listarProdutosChat() {
  const { data, error } = await supabase
    .from('produto')
    .select('id_produto, nome')
    .order('nome', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Conta pacotes (itens) no estoque; opcionalmente filtrado por produto. */
export async function contarQuantidadePacotes(idProduto) {
  if (idProduto === undefined || idProduto === null || idProduto === '') {
    return contarTotalPacotes();
  }
  const id = Number(idProduto);
  if (Number.isNaN(id)) throw new Error('id_produto inválido.');

  const { count, error } = await supabase
    .from('pacote')
    .select('id_pacote, lote!inner(id_produto)', { count: 'exact', head: true })
    .eq('lote.id_produto', id);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Mesmos buckets de validade do dashboard (pacotes no inventário ativo). */
export async function metricasProdutosEmRisco() {
  const inventario = await buscarInventarioFEFO({});
  const buckets = {
    tres: 0,
    cinco: 0,
    semana: 0,
  };

  inventario.forEach((item) => {
    const dias = calcularDiasRestantes(item.lote?.data_validade);
    if (dias === null) return;
    if (dias < 0) {
      buckets.tres += 1;
      return;
    }
    if (dias <= 3) buckets.tres += 1;
    else if (dias <= 5) buckets.cinco += 1;
    else if (dias <= 7) buckets.semana += 1;
  });

  const total = buckets.tres + buckets.cinco + buckets.semana;
  return { total, ...buckets };
}

/** Entradas e saídas no mês corrente (mesma base do dashboard). */
export async function contarMovimentacaoMes() {
  const movs = await buscarMovimentacoesMesAtual();
  let entradas = 0;
  let saidas = 0;
  for (const mov of movs) {
    const tipo = (mov.tipo_movimentacao || '').toUpperCase();
    if (tipo === 'ENTRADA') entradas += 1;
    else if (tipo === 'SAÍDA' || tipo === 'SAIDA') saidas += 1;
  }
  return { entradas, saidas };
}

/**
 * Movimentações no mês por tipo e produto (via pacote → lote).
 * Filtra em memória para compatibilidade com o cliente Supabase.
 */
export async function contarMovimentacaoMesPorProduto(tipoMov, idProduto) {
  const id = Number(idProduto);
  if (Number.isNaN(id)) throw new Error('id_produto inválido.');
  const tipoUp = (tipoMov || '').toUpperCase();
  let tipoEq = tipoUp === 'SAIDA' ? 'SAÍDA' : tipoUp;

  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .select(
      `
      id_movimentacao,
      tipo_movimentacao,
      pacote ( lote ( id_produto ) )
    `,
    )
    .eq('tipo_movimentacao', tipoEq)
    .gte('data_hora', inicioMesAtualISO());

  if (error) throw new Error(error.message);
  let n = 0;
  for (const row of data ?? []) {
    const pid = row.pacote?.lote?.id_produto;
    if (pid === id) n += 1;
  }
  return n;
}

/**
 * Pacotes ainda no inventário ativo (FEFO) cuja data_validade do lote já passou.
 * Mesma base visual do dashboard — conta por produto para o texto do chat.
 */
export async function metricasPacotesVencidosPorProduto() {
  const inventario = await buscarInventarioFEFO({});
  /** @type {Map<string, number>} */
  const porNome = new Map();

  for (const item of inventario) {
    const dias = calcularDiasRestantes(item.lote?.data_validade);
    if (dias === null || dias >= 0) continue;
    const nome = item.lote?.produto?.nome ?? 'Sem nome';
    porNome.set(nome, (porNome.get(nome) ?? 0) + 1);
  }

  const total = [...porNome.values()].reduce((a, b) => a + b, 0);
  const porProduto = [...porNome.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'))
    .map(([nome, quantidade]) => ({ nome, quantidade }));

  return { total, porProduto };
}

/** Texto formatado — Quantidade. */
export async function textoQuantidade(idProduto) {
  const n = await contarQuantidadePacotes(idProduto);
  if (idProduto === undefined || idProduto === null || idProduto === '') {
    return `Quantidade geral no estoque: ${n} pacote(s) rastreável(is) (todos os produtos).`;
  }
  const { data: prod, error } = await supabase
    .from('produto')
    .select('nome')
    .eq('id_produto', Number(idProduto))
    .maybeSingle();
  if (error) throw new Error(error.message);
  const nome = prod?.nome ?? 'Produto';
  return `Quantidade para "${nome}": ${n} pacote(s) no estoque.`;
}

/** Texto formatado — Produtos em risco. */
export async function textoRisco() {
  const m = await metricasProdutosEmRisco();
  return (
    `${m.total} itens em risco, ${m.semana} têm uma semana restante, ${m.cinco} têm cinco dias restantes ` +
    `e ${m.tres} têm três dias restantes.`
  );
}

/** Texto formatado — Movimentação do mês. */
export async function textoMovimentacaoMes() {
  const { entradas, saidas } = await contarMovimentacaoMes();
  return `Houveram ${entradas} entradas e ${saidas} saídas no mês atual.`;
}

/** Texto formatado — apenas entradas ou apenas saídas no mês (opção Geral no submenu). */
export async function textoMovimentacaoMesApenasTipo(tipoMov) {
  const { entradas, saidas } = await contarMovimentacaoMes();
  const tipoUp = (tipoMov || '').toUpperCase();
  const isEntrada = tipoUp === 'ENTRADA';
  const n = isEntrada ? entradas : saidas;
  const nome = isEntrada ? 'Entradas' : 'Saídas';
  return `${nome} no mês atual (todos os produtos): ${n} movimentação(ões).`;
}

/** Texto formatado — Movimentação do mês por produto. */
export async function textoMovimentacaoMesProduto(tipo, idProduto) {
  const n = await contarMovimentacaoMesPorProduto(tipo, idProduto);
  const { data: prod, error } = await supabase
    .from('produto')
    .select('nome')
    .eq('id_produto', Number(idProduto))
    .maybeSingle();
  if (error) throw new Error(error.message);
  const nome = prod?.nome ?? 'Produto';
  const rotulo = (tipo || '').toUpperCase().includes('ENTRADA') ? 'Entradas' : 'Saídas';
  return `${rotulo} no mês atual para "${nome}": ${n} movimentação(ões).`;
}

/** Texto formatado — Perdas (= pacotes com produto vencido no inventário ativo). */
export async function textoPerdasMes() {
  const { total, porProduto } = await metricasPacotesVencidosPorProduto();

  let texto =
    total === 0
      ? 'No inventário ativo não há pacotes com validade vencida.'
      : `No estoque há ${total} pacote(s) com validade vencida (lote com data de validade anterior a hoje).`;

  if (total > 0) {
    const maxLinhas = 14;
    const amostra = porProduto.slice(0, maxLinhas);
    const detalhe = amostra.map((x) => `• ${x.nome}: ${x.quantidade}`).join('\n');
    const restantes = porProduto.length - maxLinhas;
    const mais =
      restantes > 0 ? `\n… e mais ${restantes} produto(s) com pacotes vencidos.` : '';
    texto += `\n\nPor produto:\n${detalhe}${mais}`;
  }

  return texto;
}
