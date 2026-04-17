/** Opções do menu inicial — textos e respostas stub até integrar API. */
export const CHATBOT_ASSISTANT_NAME = 'Assistente 3IRMÃOS';

export type MenuOption = {
  key: string;
  title: string;
  stubReply: string;
};

export const CHATBOT_MENU_OPTIONS: MenuOption[] = [
  {
    key: '1',
    title: 'Informações gerais e pedidos',
    stubReply:
      'Você escolheu informações gerais e pedidos. Em breve esta opção consultará o sistema em tempo real. Por enquanto, registre seu pedido com o setor comercial.',
  },
  {
    key: '2',
    title: 'Orçamento',
    stubReply:
      'Você escolheu orçamento. A integração com orçamentos e propostas será ligada aqui. Entre em contato com o comercial para valores e prazos.',
  },
  {
    key: '3',
    title: 'Estoque e movimentação',
    stubReply:
      'Você escolheu estoque e movimentação. Esta trilha mostrará saldos, lotes e alertas como no painel principal. Use a aba Início no app enquanto a API do chat não estiver ativa.',
  },
  {
    key: '4',
    title: 'Outros assuntos',
    stubReply:
      'Você escolheu outros assuntos. Descreva sua necessidade ao time de TI ou ao seu gestor; o canal completo de atendimento será conectado em seguida.',
  },
];

export function buildWelcomeMessage(displayName: string): string {
  const account =
    displayName.trim().length > 0
      ? `\nConta conectada: ${displayName.trim()}.`
      : '';
  return (
    `Olá! Eu me chamo ${CHATBOT_ASSISTANT_NAME}. O que gostaria de saber?${account}\n\n` +
    `Escolha uma opção (toque em um dos botões ou digite o número no campo abaixo):\n\n` +
    CHATBOT_MENU_OPTIONS.map((o) => `${o.key} — ${o.title}`).join('\n')
  );
}
