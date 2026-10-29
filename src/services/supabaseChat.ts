import { supabase } from './supabase';

function inicioMesAtualISO() {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  return inicio.toISOString();
}

function calcularDiasRestantes(dataVencimentoStr: string | null | undefined): number | null {
  if (!dataVencimentoStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dataVencimentoStr);
  vencimento.setHours(0, 0, 0, 0);
  return Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

async function buscarInventarioFEFO() {
  const { data, error } = await supabase
    .from('pacote')
    .select(`
      id_pacote,
      lote!inner (
        data_validade,
        produto!inner ( nome )
      )
    `)
    .order('data_validade', { referencedTable: 'lote', ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function contarTotalPacotes(): Promise<number> {
  const { count, error } = await supabase
    .from('pacote')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function buscarMovimentacoesMesAtual() {
  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .select('id_movimentacao, tipo_movimentacao, data_hora')
    .gte('data_hora', inicioMesAtualISO())
    .order('data_hora', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type ChatProduto = { id_produto: number; nome: string };

export async function listarProdutosChat(): Promise<ChatProduto[]> {
  const { data, error } = await supabase
    .from('produto')
    .select('id_produto, nome')
    .order('nome', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ChatProduto[];
}

async function contarQuantidadePacotes(idProduto?: number): Promise<number> {
  if (idProduto === undefined || idProduto === null) {
    return contarTotalPacotes();
  }
  const { count, error } = await supabase
    .from('pacote')
    .select('id_pacote, lote!inner(id_produto)', { count: 'exact', head: true })
    .eq('lote.id_produto', idProduto);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function metricasProdutosEmRisco() {
  const inventario = await buscarInventarioFEFO();
  const buckets = { tres: 0, cinco: 0, semana: 0 };

  inventario.forEach((item) => {
    const lote = item.lote as { data_validade?: string } | { data_validade?: string }[] | null;
    const loteObj = Array.isArray(lote) ? lote[0] : lote;
    const dias = calcularDiasRestantes(loteObj?.data_validade);
    if (dias === null) return;
    if (dias < 0) {
      buckets.tres += 1;
      return;
    }
    if (dias <= 3) buckets.tres += 1;
    else if (dias <= 5) buckets.cinco += 1;
    else if (dias <= 7) buckets.semana += 1;
  });

  return { total: buckets.tres + buckets.cinco + buckets.semana, ...buckets };
}

async function contarMovimentacaoMes() {
  const movs = await buscarMovimentacoesMesAtual();
  let entradas = 0;
  let saidas = 0;
  for (const mov of movs) {
    const tipo = String(mov.tipo_movimentacao ?? '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (tipo === 'ENTRADA') entradas += 1;
    else if (tipo === 'SAIDA') saidas += 1;
  }
  return { entradas, saidas };
}

async function contarMovimentacaoMesPorProduto(tipoMov: string, idProduto: number) {
  const tipoUp = tipoMov.toUpperCase();
  const tipoEq = tipoUp === 'SAIDA' ? 'SAÍDA' : tipoUp;

  const { data, error } = await supabase
    .from('movimentacao_estoque')
    .select(`id_movimentacao, tipo_movimentacao, pacote ( lote ( id_produto ) )`)
    .eq('tipo_movimentacao', tipoEq)
    .gte('data_hora', inicioMesAtualISO());

  if (error) throw new Error(error.message);
  let n = 0;
  for (const row of data ?? []) {
    const pacote = row.pacote as { lote?: { id_produto?: number } | { id_produto?: number }[] } | null;
    const lote = pacote?.lote;
    const loteObj = Array.isArray(lote) ? lote[0] : lote;
    if (loteObj?.id_produto === idProduto) n += 1;
  }
  return n;
}

async function metricasPacotesVencidosPorProduto() {
  const inventario = await buscarInventarioFEFO();
  const porNome = new Map<string, number>();

  for (const item of inventario) {
    const lote = item.lote as
      | { data_validade?: string; produto?: { nome?: string } | { nome?: string }[] }
      | { data_validade?: string; produto?: { nome?: string } | { nome?: string }[] }[]
      | null;
    const loteObj = Array.isArray(lote) ? lote[0] : lote;
    const dias = calcularDiasRestantes(loteObj?.data_validade);
    if (dias === null || dias >= 0) continue;
    const produto = loteObj?.produto;
    const prodObj = Array.isArray(produto) ? produto[0] : produto;
    const nome = prodObj?.nome ?? 'Sem nome';
    porNome.set(nome, (porNome.get(nome) ?? 0) + 1);
  }

  const porProduto = [...porNome.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'))
    .map(([nome, quantidade]) => ({ nome, quantidade }));
  const total = porProduto.reduce((a, x) => a + x.quantidade, 0);
  return { total, porProduto };
}

export async function textoQuantidade(idProduto?: number): Promise<string> {
  const n = await contarQuantidadePacotes(idProduto);
  if (idProduto === undefined || idProduto === null) {
    return `Quantidade geral no estoque: ${n} pacote(s) rastreável(is) (todos os produtos).`;
  }
  const { data: prod, error } = await supabase
    .from('produto')
    .select('nome')
    .eq('id_produto', idProduto)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return `Quantidade para "${prod?.nome ?? 'Produto'}": ${n} pacote(s) no estoque.`;
}

export async function textoRisco(): Promise<string> {
  const m = await metricasProdutosEmRisco();
  return (
    `${m.total} itens em risco, ${m.semana} têm uma semana restante, ${m.cinco} têm cinco dias restantes ` +
    `e ${m.tres} têm três dias restantes.`
  );
}

export async function textoMovimentacaoMes(): Promise<string> {
  const { entradas, saidas } = await contarMovimentacaoMes();
  return `Houveram ${entradas} entradas e ${saidas} saídas no mês atual.`;
}

export async function textoMovimentacaoMesApenasTipo(tipoMov: 'ENTRADA' | 'SAÍDA'): Promise<string> {
  const { entradas, saidas } = await contarMovimentacaoMes();
  const isEntrada = tipoMov.toUpperCase() === 'ENTRADA';
  const n = isEntrada ? entradas : saidas;
  return `${isEntrada ? 'Entradas' : 'Saídas'} no mês atual (todos os produtos): ${n} movimentação(ões).`;
}

export async function textoMovimentacaoMesProduto(
  tipo: 'ENTRADA' | 'SAÍDA',
  idProduto: number,
): Promise<string> {
  const n = await contarMovimentacaoMesPorProduto(tipo, idProduto);
  const { data: prod, error } = await supabase
    .from('produto')
    .select('nome')
    .eq('id_produto', idProduto)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const rotulo = tipo.toUpperCase().includes('ENTRADA') ? 'Entradas' : 'Saídas';
  return `${rotulo} no mês atual para "${prod?.nome ?? 'Produto'}": ${n} movimentação(ões).`;
}

export async function textoPerdasMes(): Promise<string> {
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
    const mais = restantes > 0 ? `\n… e mais ${restantes} produto(s) com pacotes vencidos.` : '';
    texto += `\n\nPor produto:\n${detalhe}${mais}`;
  }

  return texto;
}
