import type { ChatProduto } from '../services/api';

export const CHATBOT_ASSISTANT_NAME = 'Assistente 3IRMÃOS';

/** Menu principal (texto exibido no chat). */
export function buildMainMenuPrompt(): string {
  return (
    `O que você deseja saber?\n\n` +
    `1. Quantidade\n` +
    `2. Produtos em Risco\n` +
    `3. Entradas e Saídas\n` +
    `4. Perdas / produtos vencidos`
  );
}

export function buildWelcomeMessage(displayName: string): string {
  const account =
    displayName.trim().length > 0
      ? `\nConta conectada: ${displayName.trim()}.`
      : '';
  return (
    `Olá! Eu me chamo ${CHATBOT_ASSISTANT_NAME}.${account}\n\n` +
    `${buildMainMenuPrompt()}\n\n` +
    `Toque nos botões ou digite o número do menu (quando vir “Exportar planilha”, use o botão ou * no campo).`
  );
}

/**
 * Pergunta ao escolher produto — nomes aparecem só nos chips (evita lista duplicada).
 */
export function buildProductPickerText(produtos: ChatProduto[]): string {
  const n = produtos.length;
  const hint =
    n === 0
      ? ''
      : `\n\nAbaixo há um campo de busca e uma lista rolável com ${n} produto${n === 1 ? '' : 's'} — toque no nome ou use o número no rodapé.`;
  return (
    `De qual produto?\n\n` +
    `Exportar planilha — use o botão com ícone ou digite * no campo.\n` +
    `Voltar ao menu — botão ou digite 0\n` +
    `1 — Visão geral (todos os produtos)` +
    hint
  );
}

/** Após escolher opção 3 — submenu antes de filtrar por produto. */
export function buildMovSubmenuText(): string {
  return (
    `Escolha uma ação:\n\n` +
    `Exportar planilha — botão com ícone ou *\n` +
    `Voltar ao menu — botão ou digite 0\n` +
    `1 — Entradas por produto\n` +
    `2 — Saídas por produto`
  );
}

/** Rodapé após respostas que oferecem exportação (ex.: Perdas / Quantidade). */
export function buildExportFooter(): string {
  return (
    `Exportar planilha — botão com ícone ou *\n` +
    `Voltar ao menu — botão ou digite 0`
  );
}
