import { Router } from 'express';
import {
  getChatMovimentacaoMes,
  getChatMovimentacaoMesProduto,
  getChatMovimentacaoMesTipo,
  getChatPerdasMes,
  getChatProdutos,
  getChatQuantidade,
  getChatRisco,
} from '../controllers/chatController.js';
import { autenticar } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/produtos', autenticar, getChatProdutos);
router.get('/quantidade', autenticar, getChatQuantidade);
router.get('/risco', autenticar, getChatRisco);
router.get('/movimentacao-mes', autenticar, getChatMovimentacaoMes);
router.get('/movimentacao-mes/tipo', autenticar, getChatMovimentacaoMesTipo);
router.get('/movimentacao-mes/produto', autenticar, getChatMovimentacaoMesProduto);
router.get('/perdas-mes', autenticar, getChatPerdasMes);

export default router;
