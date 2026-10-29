-- Seed demo: produtos + lotes com validades variadas (vencidos, críticos, ok)
-- Rode no Supabase → SQL Editor
-- ATENÇÃO: a limpeza abaixo apaga estoque atual (pacotes, RFID, movimentações, alertas, lotes, produtos).
-- Usuários/perfis NÃO são apagados.

BEGIN;

-- ── Limpa inventário (ordem por FKs) ───────────────────────────────────────
DELETE FROM public.movimentacao_estoque;
DELETE FROM public.alerta;
DELETE FROM public.sugestao_reposicao;
DELETE FROM public.chatbot_export;
DELETE FROM public.rfid_etiqueta;
DELETE FROM public.pacote;
DELETE FROM public.lote;
DELETE FROM public.produto;

-- ── Produtos ───────────────────────────────────────────────────────────
INSERT INTO public.produto (nome, descricao, estoque_minimo) VALUES
  ('Pão Francês — Padaria', 'Produção diária', 20),
  ('Pão de Forma Integral', 'Fatiado, embalado', 10),
  ('Croissant Manteiga', 'Folhado', 8),
  ('Bolo de Chocolate', 'Fatias individuais', 5),
  ('Sonho com Creme', 'Confeitaria', 6),
  ('Leite Integral 1L', 'Laticínios', 12),
  ('Queijo Mussarela', 'Fatiado a vácuo', 8),
  ('Iogurte Natural', 'Pote 170g', 15),
  ('Presunto Cozido', 'Fatiado', 8),
  ('Farinha de Trigo 5kg', 'Insumo', 4),
  ('Açúcar Refinado 1kg', 'Insumo', 6),
  ('Fermento Biológico', 'Pacote 500g', 4);

-- ── Lotes com validades relativas a hoje ───────────────────────────────
-- status do lote: livre (dashboard usa "entrega" para marcados); pacotes ficam EM_ESTOQUE
WITH p AS (
  SELECT id_produto, nome FROM public.produto
),
lotes_def AS (
  SELECT * FROM (VALUES
    -- produto (nome parcial), codigo, fab offset dias, val offset dias, status lote, qtd pacotes
    ('Pão Francês',           'LT-PF-V1',  -8,  -3,  'ativo',   3),  -- vencido há 3 dias
    ('Pão Francês',           'LT-PF-OK',  -1,   2,  'ativo',   4),  -- vence em 2 dias (crítico)
    ('Pão de Forma',          'LT-PI-V1', -20,  -5,  'ativo',   2),  -- vencido
    ('Pão de Forma',          'LT-PI-C5',  -5,   5,  'ativo',   3),  -- 5 dias
    ('Croissant',             'LT-CR-C7',  -3,   7,  'ativo',   3),  -- 7 dias
    ('Croissant',             'LT-CR-OK',  -2,  21,  'ativo',   4),  -- 21 dias
    ('Bolo de Chocolate',     'LT-BC-V1', -15,  -1,  'ativo',   2),  -- vencido ontem
    ('Bolo de Chocolate',     'LT-BC-C3',  -4,   3,  'ativo',   2),  -- 3 dias
    ('Sonho',                 'LT-SO-OK',  -1,  10,  'ativo',   3),  -- 10 dias
    ('Leite Integral',        'LT-LI-C5',  -2,   5,  'ativo',   4),  -- 5 dias
    ('Leite Integral',        'LT-LI-OK',  -1,  18,  'ativo',   5),  -- 18 dias
    ('Queijo Mussarela',      'LT-QM-C3',  -5,   3,  'entrega', 2),  -- 3 dias + marcado entrega
    ('Queijo Mussarela',      'LT-QM-OK',  -3,  25,  'ativo',   3),
    ('Iogurte Natural',       'LT-IN-V1', -12,  -7,  'ativo',   2),  -- vencido
    ('Iogurte Natural',       'LT-IN-C7',  -2,   7,  'ativo',   4),
    ('Iogurte Natural',       'LT-IN-OK',  -1,  30,  'ativo',   5),
    ('Presunto Cozido',       'LT-PC-C2',  -6,   2,  'ativo',   2),  -- 2 dias
    ('Presunto Cozido',       'LT-PC-OK',  -2,  40,  'ativo',   3),
    ('Farinha de Trigo',      'LT-FT-OK', -30, 120,  'ativo',   4),  -- longo prazo
    ('Açúcar Refinado',       'LT-AR-OK', -40, 180,  'ativo',   3),
    ('Fermento Biológico',    'LT-FB-C7', -10,   7,  'ativo',   2),
    ('Fermento Biológico',    'LT-FB-OK',  -5,  60,  'ativo',   3)
  ) AS t(nome_like, codigo_lote, fab_off, val_off, status_lote, qtd)
)
INSERT INTO public.lote (codigo_lote, data_fabricacao, data_validade, status, id_produto)
SELECT
  d.codigo_lote,
  CURRENT_DATE + d.fab_off,
  CURRENT_DATE + d.val_off,
  d.status_lote,
  p.id_produto
FROM lotes_def d
JOIN p ON p.nome ILIKE d.nome_like || '%';

-- ── Pacotes (1 por unidade) + RFID ─────────────────────────────────────
WITH lote_qtd AS (
  SELECT l.id_lote, l.codigo_lote,
    CASE l.codigo_lote
      WHEN 'LT-PF-V1' THEN 3 WHEN 'LT-PF-OK' THEN 4
      WHEN 'LT-PI-V1' THEN 2 WHEN 'LT-PI-C5' THEN 3
      WHEN 'LT-CR-C7' THEN 3 WHEN 'LT-CR-OK' THEN 4
      WHEN 'LT-BC-V1' THEN 2 WHEN 'LT-BC-C3' THEN 2
      WHEN 'LT-SO-OK' THEN 3
      WHEN 'LT-LI-C5' THEN 4 WHEN 'LT-LI-OK' THEN 5
      WHEN 'LT-QM-C3' THEN 2 WHEN 'LT-QM-OK' THEN 3
      WHEN 'LT-IN-V1' THEN 2 WHEN 'LT-IN-C7' THEN 4 WHEN 'LT-IN-OK' THEN 5
      WHEN 'LT-PC-C2' THEN 2 WHEN 'LT-PC-OK' THEN 3
      WHEN 'LT-FT-OK' THEN 4 WHEN 'LT-AR-OK' THEN 3
      WHEN 'LT-FB-C7' THEN 2 WHEN 'LT-FB-OK' THEN 3
      ELSE 1
    END AS qtd
  FROM public.lote l
  WHERE l.codigo_lote LIKE 'LT-%'
),
gerado AS (
  SELECT id_lote, codigo_lote, gs AS n
  FROM lote_qtd, generate_series(1, qtd) AS gs
),
ins_pacote AS (
  INSERT INTO public.pacote (id_lote, status)
  SELECT id_lote, 'EM_ESTOQUE'
  FROM gerado
  RETURNING id_pacote, id_lote
)
INSERT INTO public.rfid_etiqueta (epc, id_pacote, status)
SELECT
  'EPC-DEMO-' || l.codigo_lote || '-' || p.id_pacote,
  p.id_pacote,
  'ATIVO'
FROM ins_pacote p
JOIN public.lote l ON l.id_lote = p.id_lote;

-- ── Movimentações do mês (para gráficos / chat) ────────────────────────
INSERT INTO public.movimentacao_estoque (tipo_movimentacao, data_hora, id_pacote)
SELECT
  v.tipo,
  date_trunc('month', CURRENT_TIMESTAMP) + (v.dia || ' days')::interval + (v.hora || ' hours')::interval,
  p.id_pacote
FROM (
  VALUES
    ('ENTRADA', 1, 9),
    ('ENTRADA', 2, 10),
    ('ENTRADA', 3, 11),
    ('SAÍDA',   4, 14),
    ('SAÍDA',   5, 15),
    ('ENTRADA', 8, 9),
    ('SAÍDA',  10, 16),
    ('PERDA',  12, 8),
    ('ENTRADA', 15, 10),
    ('SAÍDA',  18, 13),
    ('ENTRADA', 20, 9),
    ('SAÍDA',  22, 17),
    ('PERDA',  25, 7)
) AS v(tipo, dia, hora)
JOIN LATERAL (
  SELECT id_pacote FROM public.pacote ORDER BY random() LIMIT 1
) p ON true;

COMMIT;

-- Conferência rápida
SELECT
  pr.nome,
  l.codigo_lote,
  l.data_validade,
  (l.data_validade - CURRENT_DATE) AS dias_restantes,
  COUNT(pa.id_pacote) AS pacotes
FROM public.lote l
JOIN public.produto pr ON pr.id_produto = l.id_produto
LEFT JOIN public.pacote pa ON pa.id_lote = l.id_lote
GROUP BY pr.nome, l.codigo_lote, l.data_validade
ORDER BY l.data_validade;
