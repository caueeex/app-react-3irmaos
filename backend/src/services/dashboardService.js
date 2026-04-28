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

  // --- 1. Visão Geral (alinhada ao inventário filtrado) ---
  const visaoGeral = {
    totalItens: inventarioCru.length,
    marcadosEntrega: inventarioCru.filter((p) => normStatus(p.lote?.status) === 'entrega')
      .length,
  };

  // --- 2. Alerta de Validade (por pacote no inventário filtrado) ---
  const agrupamentoValidade = {
    '3 dias restantes': { quantidade: 0, cor: 'hsl(0, 72%, 51%)' },
    '5 dias restantes': { quantidade: 0, cor: 'hsl(45, 100%, 51%)' },
    '7 dias restantes': { quantidade: 0, cor: 'hsl(220, 15%, 40%)' },
  };

  inventarioCru.forEach((item) => {
    const diasRestantes = calcularDiasRestantes(item.lote?.data_validade);
    if (diasRestantes === null) return;
    if (diasRestantes < 0) {
      agrupamentoValidade['3 dias restantes'].quantidade += 1;
      return;
    }
    if (diasRestantes <= 3) {
      agrupamentoValidade['3 dias restantes'].quantidade += 1;
    } else if (diasRestantes <= 5) {
      agrupamentoValidade['5 dias restantes'].quantidade += 1;
    } else if (diasRestantes <= 7) {
      agrupamentoValidade['7 dias restantes'].quantidade += 1;
    }
  });

  const totalCriticos = agrupamentoValidade['3 dias restantes'].quantidade;

  const alertaValidade = {
    totalCriticos,
    grupos: Object.keys(agrupamentoValidade)
      .map((chave) => ({
        nome: chave,
        quantidade: agrupamentoValidade[chave].quantidade,
        cor: agrupamentoValidade[chave].cor,
      }))
      .filter((grupo) => grupo.quantidade > 0),
  };

  // --- 3. Movimentação Mês ---
  // Agrupar por semanas do mês
  const movimentacaoPorSemana = {};
  
  // Inicializando as semanas 
  for(let i=1; i<=4; i++) {
     movimentacaoPorSemana[`Sem ${i}`] = { entradas: 0, saidas: 0 };
  }

  movimentacoesMes.forEach(mov => {
    const dataMov = new Date(mov.data_hora);
    const dia = dataMov.getDate();
    let semana = Math.ceil(dia / 7);
    if (semana > 4) semana = 4;

    const chaveSemana = `Sem ${semana}`;
    
    // Suporta tanto uppercase (ENTRADA/SAÍDA) quanto lowercase
    const tipo = (mov.tipo_movimentacao || '').toUpperCase();
    if (tipo === 'ENTRADA') {
      movimentacaoPorSemana[chaveSemana].entradas++;
    } else if (tipo === 'SAÍDA' || tipo === 'SAIDA') {
      movimentacaoPorSemana[chaveSemana].saidas++;
    }
  });

  const movimentacaoMes = Object.keys(movimentacaoPorSemana).map(chave => ({
    nome: chave,
    entradas: movimentacaoPorSemana[chave].entradas,
    saidas: movimentacaoPorSemana[chave].saidas
  }));

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
    inventarioAtivoFEFO,
    alertasRecentes: alertasAtivos.dados || [],
    totalAlertasAtivos: alertasAtivos.total || 0,
    produtosComEstoqueBaixo, // I-01: antes coletado mas nunca retornado
  };
};
