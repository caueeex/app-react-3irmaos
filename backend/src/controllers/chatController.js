import {
  listarProdutosChat,
  textoQuantidade,
  textoRisco,
  textoMovimentacaoMes,
  textoMovimentacaoMesApenasTipo,
  textoMovimentacaoMesProduto,
  textoPerdasMes,
} from '../services/chatService.js';

export const getChatProdutos = async (_req, res) => {
  try {
    const produtos = await listarProdutosChat();
    return res.status(200).json({ produtos });
  } catch (error) {
    console.error('[chat] produtos', error);
    return res.status(500).json({ erro: error.message ?? 'Erro ao listar produtos.' });
  }
};

export const getChatQuantidade = async (req, res) => {
  try {
    const raw = req.query.id_produto;
    const id_produto =
      raw === undefined || raw === '' || raw === 'null' ? undefined : String(raw);
    const texto = await textoQuantidade(id_produto);
    return res.status(200).json({ texto });
  } catch (error) {
    console.error('[chat] quantidade', error);
    return res.status(500).json({ erro: error.message ?? 'Erro ao consultar quantidade.' });
  }
};

export const getChatRisco = async (_req, res) => {
  try {
    const texto = await textoRisco();
    return res.status(200).json({ texto });
  } catch (error) {
    console.error('[chat] risco', error);
    return res.status(500).json({ erro: error.message ?? 'Erro ao consultar risco.' });
  }
};

export const getChatMovimentacaoMes = async (_req, res) => {
  try {
    const texto = await textoMovimentacaoMes();
    return res.status(200).json({ texto });
  } catch (error) {
    console.error('[chat] movimentacao-mes', error);
    return res.status(500).json({ erro: error.message ?? 'Erro ao consultar movimentações.' });
  }
};

/** GET ?tipo=ENTRADA|SAÍDA — totais do mês só de entradas ou só de saídas (Geral no submenu). */
export const getChatMovimentacaoMesTipo = async (req, res) => {
  try {
    const { tipo } = req.query;
    if (!tipo) {
      return res.status(400).json({ erro: 'Informe tipo (ENTRADA ou SAÍDA).' });
    }
    const texto = await textoMovimentacaoMesApenasTipo(String(tipo));
    return res.status(200).json({ texto });
  } catch (error) {
    console.error('[chat] movimentacao-mes/tipo', error);
    return res.status(500).json({ erro: error.message ?? 'Erro ao consultar movimentações.' });
  }
};

export const getChatMovimentacaoMesProduto = async (req, res) => {
  try {
    const { tipo, id_produto } = req.query;
    if (!tipo || id_produto === undefined) {
      return res.status(400).json({ erro: 'Informe tipo (ENTRADA ou SAÍDA) e id_produto.' });
    }
    const texto = await textoMovimentacaoMesProduto(String(tipo), String(id_produto));
    return res.status(200).json({ texto });
  } catch (error) {
    console.error('[chat] movimentacao-mes/produto', error);
    return res.status(500).json({ erro: error.message ?? 'Erro ao consultar movimentações por produto.' });
  }
};

export const getChatPerdasMes = async (_req, res) => {
  try {
    const texto = await textoPerdasMes();
    return res.status(200).json({ texto });
  } catch (error) {
    console.error('[chat] perdas-mes', error);
    return res.status(500).json({ erro: error.message ?? 'Erro ao consultar perdas.' });
  }
};
