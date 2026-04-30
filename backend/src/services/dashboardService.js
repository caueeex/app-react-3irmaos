import {
  buscarMovimentacoesMesAtual,
  buscarInventarioFEFO,
} from '../models/dashboardModel.js';
import supabase from '../config/supabase.js';

/**
 * Funcao auxiliar para calcular a diferenca em dias entre duas datas.
 */
const calcularDiasRestantes = (dataVencimentoStr) => {
  if (!dataVencimentoStr) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas datas
  const vencimento = new Date(dataVencimentoStr);
  vencimento.setHours(0, 0, 0, 0);
  
  const diffTime = vencimento - hoje;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
};

/**
 * Obtem e consolida todos os dados para o dashboard.
 */
export const obterDadosDashboard = async (filtros) => {
  // Inventário é o único conjunto que aplica `filtros` (model). Métricas e validade
  // passam a ser derivadas desse resultado para o app refletir “Aplicar filtros”.
  const [
    inventarioCru,
    movimentacoesMes,
    alertasAtivos,
    produtosAbaixoMinimo,
  ] = await Promise.all([
    buscarInventarioFEFO(filtros),
    buscarMovimentacoesMesAtual(),
    supabase
      .from('alerta')
      .select('id_alerta, tipo_alerta, mensagem, data_hora', { count: 'exact' })
      .order('data_hora', { ascending: false })
      .limit(10)
      .then((r) => ({ dados: r.data || [], total: r.count || 0 })),
    supabase.from('produto').select('id_produto, nome, estoque_minimo').then((r) => r.data || []),
  ]);

  const normStatus = (s) => String(s ?? '').trim().toLowerCase();

  const normTipoMov = (raw) =>
    String(raw ?? '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  // --- 1. Alerta de Validade (por pacote no inventário filtrado) ---
  // Vencidos (data < hoje) separados dos buckets 3/5/7 dias (alinha à versão web).
  const bucketsProximos7 = { ate3: 0, ate5: 0, ate7: 0 };
  let totalVencidos = 0;

  inventarioCru.forEach((item) => {
    const diasRestantes = calcularDiasRestantes(item.lote?.data_validade);
    if (diasRestantes === null) return;
    if (diasRestantes < 0) {
      totalVencidos += 1;
      return;
    }
    if (diasRestantes <= 3) bucketsProximos7.ate3 += 1;
    else if (diasRestantes <= 5) bucketsProximos7.ate5 += 1;
    else if (diasRestantes <= 7) bucketsProximos7.ate7 += 1;
  });

  const totalCriticos = bucketsProximos7.ate3;

  const alertaValidade = {
    totalCriticos,
    totalVencidos,
    bucketsProximos7,
    grupos: [
      {
        nome: '3 dias restantes',
        quantidade: bucketsProximos7.ate3,
        cor: 'hsl(0, 72%, 51%)',
      },
      {
        nome: '5 dias restantes',
        quantidade: bucketsProximos7.ate5,
        cor: 'hsl(45, 100%, 51%)',
      },
      {
        nome: '7 dias restantes',
        quantidade: bucketsProximos7.ate7,
        cor: 'hsl(220, 15%, 40%)',
      },
    ].filter((grupo) => grupo.quantidade > 0),
  };

  // --- 2. Movimentação Mês (entradas / saídas / perdas por semana) ---
  const movimentacaoPorSemana = {};
  for (let i = 1; i <= 4; i++) {
    movimentacaoPorSemana[`Sem ${i}`] = { entradas: 0, saidas: 0, perdas: 0 };
  }

  let entradasMes = 0;
  let saidasMes = 0;
  let perdasMesTotal = 0;

  movimentacoesMes.forEach((mov) => {
    const dataMov = new Date(mov.data_hora);
    const dia = dataMov.getDate();
    let semana = Math.ceil(dia / 7);
    if (semana > 4) semana = 4;

    const chaveSemana = `Sem ${semana}`;
    const tipo = normTipoMov(mov.tipo_movimentacao);

    if (tipo === 'ENTRADA') {
      movimentacaoPorSemana[chaveSemana].entradas++;
      entradasMes++;
    } else if (tipo === 'SAIDA') {
      movimentacaoPorSemana[chaveSemana].saidas++;
      saidasMes++;
    } else if (tipo === 'PERDA') {
      movimentacaoPorSemana[chaveSemana].perdas++;
      perdasMesTotal++;
    }
  });

  const movimentacaoMes = Object.keys(movimentacaoPorSemana).map((chave) => ({
    nome: chave,
    entradas: movimentacaoPorSemana[chave].entradas,
    saidas: movimentacaoPorSemana[chave].saidas,
    perdas: movimentacaoPorSemana[chave].perdas,
  }));

  // --- 3. Visão Geral (alinhada ao inventário filtrado + tendência do mês) ---
  const visaoGeral = {
    totalItens: inventarioCru.length,
    marcadosEntrega: inventarioCru.filter((p) => normStatus(p.lote?.status) === 'entrega')
      .length,
    variacaoEstoqueMes: entradasMes - saidasMes,
  };

  // --- 4. Inventário Ativo FEFO ---
  const inventarioAtivoFEFO = inventarioCru.map(item => {
    const diasRestantes = calcularDiasRestantes(item.lote?.data_validade);
    
    // Tratamento para data_fabricacao e validade no formato amigável, se existirem
    const formatarData = (dataDb) => {
        if (!dataDb) return "";
        const [ano, mes, dia] = dataDb.split('-');
        return `${dia}/${mes}/${ano}`;
    };

    return {
      tagRfid: item.rfid_etiqueta?.epc || item.rfid_etiqueta?.[0]?.epc || 'Desconhecida',
      nome: item.lote?.produto?.nome || 'Sem nome',
      lote: item.lote?.codigo_lote || '',
      dataFabricacao: formatarData(item.lote?.data_fabricacao),
      dataValidade: formatarData(item.lote?.data_validade),
      diasRestantes: diasRestantes,
      status: diasRestantes !== null ? `${diasRestantes} dias` : 'N/A',
      critico: diasRestantes !== null && diasRestantes <= 7,
      highlight: diasRestantes !== null && diasRestantes <= 7
    };
  });

  // --- 5. Produtos abaixo do estoque mínimo (I-01) ---
  // produtosAbaixoMinimo contém todos os produtos — filtramos os que têm estoque baixo
  // Nota: contagem exata exigiria query por produto; aqui estimamos via etiquetas ativas
  // Para simplicidade do dashboard, retornamos a lista de produtos para o frontend verificar
  const produtosComEstoqueBaixo = (produtosAbaixoMinimo || []).map(p => ({
    id_produto: p.id_produto,
    nome: p.nome,
    estoque_minimo: p.estoque_minimo,
  }));

  // Retorno final
  return {
    visaoGeral,
    alertaValidade,
    movimentacaoMes,
    perdasMesTotal,
    inventarioAtivoFEFO,
    alertasRecentes: alertasAtivos.dados || [],
    totalAlertasAtivos: alertasAtivos.total || 0,
    produtosComEstoqueBaixo, // I-01: antes coletado mas nunca retornado
  };
};
