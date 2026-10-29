-- Rode no Supabase: SQL Editor → New query
-- Habilita login/cadastro e leitura de dados direto do app mobile (sem API Express).

-- No Supabase, pgcrypto fica no schema "extensions" (Dashboard → Database → Extensions → pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── Login (valida bcrypt da tabela usuario) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.app_login(p_email text, p_senha text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user record;
BEGIN
  SELECT u.id_usuario, u.nome, u.email, u.senha, p.nome AS perfil_nome
  INTO v_user
  FROM usuario u
  LEFT JOIN perfil p ON p.id_perfil = u.id_perfil
  WHERE lower(trim(u.email)) = lower(trim(p_email));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E-mail ou senha incorretos.';
  END IF;

  IF v_user.senha IS NULL OR extensions.crypt(p_senha, v_user.senha) <> v_user.senha THEN
    RAISE EXCEPTION 'E-mail ou senha incorretos.';
  END IF;

  RETURN json_build_object(
    'token', encode(extensions.gen_random_bytes(32), 'hex'),
    'usuario', json_build_object(
      'id', v_user.id_usuario,
      'nome', v_user.nome,
      'email', v_user.email,
      'perfil', COALESCE(v_user.perfil_nome, 'Operador')
    )
  );
END;
$$;

-- ── Cadastro ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.app_register(
  p_nome text,
  p_email text,
  p_senha text,
  p_id_perfil integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_existe integer;
  v_novo record;
BEGIN
  IF p_nome IS NULL OR trim(p_nome) = '' OR p_email IS NULL OR trim(p_email) = ''
     OR p_senha IS NULL OR p_senha = '' OR p_id_perfil IS NULL THEN
    RAISE EXCEPTION 'Todos os campos são obrigatórios (nome, email, senha, id_perfil).';
  END IF;

  SELECT count(*) INTO v_existe FROM usuario WHERE lower(trim(email)) = lower(trim(p_email));
  IF v_existe > 0 THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado no sistema.';
  END IF;

  INSERT INTO usuario (nome, email, senha, id_perfil)
  VALUES (trim(p_nome), trim(p_email), extensions.crypt(p_senha, extensions.gen_salt('bf', 10)), p_id_perfil)
  RETURNING id_usuario, nome, email INTO v_novo;

  RETURN json_build_object(
    'mensagem', 'Usuário cadastrado com sucesso!',
    'usuario', json_build_object('id', v_novo.id_usuario, 'nome', v_novo.nome, 'email', v_novo.email)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_register(text, text, text, integer) TO anon, authenticated;

-- ── Leitura para o app (ajuste se já tiver políticas próprias) ────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'perfil', 'usuario', 'produto', 'lote', 'pacote',
    'rfid_etiqueta', 'movimentacao_estoque', 'alerta'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_mobile_read_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY app_mobile_read_%I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t, t
    );
  END LOOP;
END $$;

-- Se o login falhar com senha correta (hash gerado pelo Node bcrypt $2b$),
-- regrave a senha com pgcrypto, por exemplo:
-- UPDATE usuario SET senha = extensions.crypt('SUA_SENHA', extensions.gen_salt('bf', 10))
-- WHERE lower(email) = lower('seu@email.com');
