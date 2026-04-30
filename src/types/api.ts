/** Resposta de GET /api/dashboard (mesmo contrato do ValiBread web). */
export type ApiGrupoValidade = { nome: string; quantidade: number; cor: string };

export type ApiMovimentacaoSemana = {
  nome: string;
  entradas: number;
  saidas: number;
  perdas?: number;
};

export type ApiItemInventario = {
  tagRfid: string;
  nome: string;
  lote: string;
  dataFabricacao: string;
  dataValidade: string;
  diasRestantes: number | null;
  status: string;
  critico: boolean;
  highlight: boolean;
};

export type ApiBucketsProximos7 = { ate3: number; ate5: number; ate7: number };

export type ApiDashboardData = {
  visaoGeral: {
    totalItens: number;
    marcadosEntrega: number;
    variacaoEstoqueMes?: number;
  };
  alertaValidade: {
    totalCriticos: number;
    totalVencidos?: number;
    bucketsProximos7?: ApiBucketsProximos7;
    grupos: ApiGrupoValidade[];
  };
  movimentacaoMes: ApiMovimentacaoSemana[];
  /** Total de movimentações tipo PERDA no mês corrente. */
  perdasMesTotal?: number;
  inventarioAtivoFEFO: ApiItemInventario[];
  alertasRecentes: unknown[];
  totalAlertasAtivos: number;
};

export type ApiProduto = {
  id_produto: number;
  nome: string;
  descricao?: string;
  estoque_minimo: number;
};
