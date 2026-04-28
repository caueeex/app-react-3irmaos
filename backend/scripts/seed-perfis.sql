-- Rode no Supabase: SQL Editor → New query.
-- Garante perfis padrão para o cadastro público (GET /api/perfil).
-- Ajuste nomes se quiser; ids 1 e 2 costumam bater com usuários já existentes.

INSERT INTO public.perfil (id_perfil, nome, descricao)
VALUES
  (1, 'Administrador', 'Acesso completo ao sistema'),
  (2, 'Operador', 'Operações de estoque e leitura')
ON CONFLICT (id_perfil) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao;

-- Se a sequence ficar atrás dos ids fixos (opcional):
SELECT setval(
  pg_get_serial_sequence('public.perfil', 'id_perfil'),
  COALESCE((SELECT MAX(id_perfil) FROM public.perfil), 1)
);
