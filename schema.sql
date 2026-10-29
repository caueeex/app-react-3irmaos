-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.perfil (
  id_perfil integer NOT NULL DEFAULT nextval('perfil_id_perfil_seq'::regclass),
  nome character varying NOT NULL,
  descricao text,
  CONSTRAINT perfil_pkey PRIMARY KEY (id_perfil)
);
CREATE TABLE public.usuario (
  id_usuario integer NOT NULL DEFAULT nextval('usuario_id_usuario_seq'::regclass),
  nome character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  senha text NOT NULL,
  id_perfil integer NOT NULL,
  CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT fk_usuario_perfil FOREIGN KEY (id_perfil) REFERENCES public.perfil(id_perfil)
);
CREATE TABLE public.produto (
  id_produto integer NOT NULL DEFAULT nextval('produto_id_produto_seq'::regclass),
  nome character varying NOT NULL,
  descricao text,
  estoque_minimo integer NOT NULL,
  CONSTRAINT produto_pkey PRIMARY KEY (id_produto)
);
CREATE TABLE public.lote (
  id_lote integer NOT NULL DEFAULT nextval('lote_id_lote_seq'::regclass),
  codigo_lote character varying NOT NULL,
  data_fabricacao date,
  data_validade date,
  status character varying,
  id_produto integer NOT NULL,
  CONSTRAINT lote_pkey PRIMARY KEY (id_lote),
  CONSTRAINT fk_lote_produto FOREIGN KEY (id_produto) REFERENCES public.produto(id_produto)
);
CREATE TABLE public.pacote (
  id_pacote integer NOT NULL DEFAULT nextval('pacote_id_pacote_seq'::regclass),
  id_lote integer NOT NULL,
  status character varying NOT NULL DEFAULT 'EM_ESTOQUE'::character varying CHECK (status::text = ANY (ARRAY['EM_ESTOQUE'::character varying, 'SEPARADO'::character varying, 'EXPEDIDO'::character varying]::text[])),
  CONSTRAINT pacote_pkey PRIMARY KEY (id_pacote),
  CONSTRAINT fk_pacote_lote FOREIGN KEY (id_lote) REFERENCES public.lote(id_lote)
);
CREATE TABLE public.rfid_etiqueta (
  id_rfid integer NOT NULL DEFAULT nextval('rfid_etiqueta_id_rfid_seq'::regclass),
  epc character varying NOT NULL UNIQUE,
  id_pacote integer NOT NULL UNIQUE,
  status character varying DEFAULT 'ATIVO'::character varying,
  data_associacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT rfid_etiqueta_pkey PRIMARY KEY (id_rfid),
  CONSTRAINT fk_rfid_pacote FOREIGN KEY (id_pacote) REFERENCES public.pacote(id_pacote)
);
CREATE TABLE public.movimentacao_estoque (
  id_movimentacao integer NOT NULL DEFAULT nextval('movimentacao_estoque_id_movimentacao_seq'::regclass),
  tipo_movimentacao character varying NOT NULL,
  data_hora timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_pacote integer NOT NULL,
  id_usuario integer,
  id_leitor integer,
  CONSTRAINT movimentacao_estoque_pkey PRIMARY KEY (id_movimentacao),
  CONSTRAINT fk_movimentacao_pacote FOREIGN KEY (id_pacote) REFERENCES public.pacote(id_pacote),
  CONSTRAINT fk_movimentacao_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT fk_movimentacao_leitor FOREIGN KEY (id_leitor) REFERENCES public.leitor_rfid(id_leitor)
);
CREATE TABLE public.alerta (
  id_alerta integer NOT NULL DEFAULT nextval('alerta_id_alerta_seq'::regclass),
  tipo_alerta character varying NOT NULL,
  mensagem text,
  data_hora timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_lote integer NOT NULL,
  CONSTRAINT alerta_pkey PRIMARY KEY (id_alerta),
  CONSTRAINT fk_alerta_lote FOREIGN KEY (id_lote) REFERENCES public.lote(id_lote)
);
CREATE TABLE public.relatorio (
  id_relatorio integer NOT NULL DEFAULT nextval('relatorio_id_relatorio_seq'::regclass),
  tipo_relatorio character varying,
  data_geracao timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_usuario integer NOT NULL,
  CONSTRAINT relatorio_pkey PRIMARY KEY (id_relatorio),
  CONSTRAINT fk_relatorio_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);
CREATE TABLE public.sugestao_reposicao (
  id_sugestao integer NOT NULL DEFAULT nextval('sugestao_reposicao_id_sugestao_seq'::regclass),
  data_sugestao timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  quantidade_sugerida integer NOT NULL,
  id_produto integer NOT NULL,
  CONSTRAINT sugestao_reposicao_pkey PRIMARY KEY (id_sugestao),
  CONSTRAINT fk_sugestao_produto FOREIGN KEY (id_produto) REFERENCES public.produto(id_produto)
);
CREATE TABLE public.leitor_rfid (
  id_leitor integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  codigo_equipamento character varying NOT NULL UNIQUE,
  localizacao character varying NOT NULL,
  status character varying DEFAULT 'ATIVO'::character varying,
  tipo_operacao character varying NOT NULL DEFAULT 'Entrada'::character varying CHECK (tipo_operacao::text = ANY (ARRAY['Entrada'::character varying, 'Saída'::character varying, 'Transferência'::character varying]::text[])),
  CONSTRAINT leitor_rfid_pkey PRIMARY KEY (id_leitor)
);
CREATE TABLE public.leitura_rfid_raw (
  id_leitura bigint NOT NULL DEFAULT nextval('leitura_rfid_raw_id_leitura_seq'::regclass),
  epc character varying NOT NULL,
  id_leitor integer NOT NULL,
  data_hora timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rssi integer,
  CONSTRAINT leitura_rfid_raw_pkey PRIMARY KEY (id_leitura),
  CONSTRAINT fk_leitura_raw_leitor FOREIGN KEY (id_leitor) REFERENCES public.leitor_rfid(id_leitor)
);
CREATE TABLE public.chatbot_export (
  id_export integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario integer NOT NULL,
  nome_arquivo character varying NOT NULL,
  url_arquivo character varying NOT NULL,
  data_geracao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chatbot_export_pkey PRIMARY KEY (id_export),
  CONSTRAINT chatbot_export_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);