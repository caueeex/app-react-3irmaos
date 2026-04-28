/** Resposta de GET /api/dashboard (mesmo contrato do ValiBread web). */
export type ApiGrupoValidade = { nome: string; quantidade: number; cor: string };

export type ApiMovimentacaoSemana = {
  nome: string;
  entradas: number;
  saidas: number;
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

export type ApiDashboardData = {
  visaoGeral: { totalItens: number; marcadosEntrega: number };
  alertaValidade: { totalCriticos: number; grupos: ApiGrupoValidade[] };
  movimentacaoMes: ApiMovimentacaoSemana[];
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
