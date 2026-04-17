# 3IRMÃOS — App de gestão de estoque

Aplicativo mobile em **React Native (Expo)** para acompanhamento de estoque, validade e movimentação, com dashboard, filtros, gráficos e assistente em chat (fluxo inicial preparado para integração futura).

## Requisitos

- [Node.js](https://nodejs.org/) (LTS recomendado)
- [npm](https://www.npmjs.com/) (vem com o Node)
- App **Expo Go** no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)) ou emulador Android / simulador iOS

## Como rodar

Na pasta do projeto:

```bash
npm install
npx expo start
```

Depois escaneie o QR code com o Expo Go (Android) ou a câmera (iOS), ou use as teclas do terminal para abrir em Android / iOS / web.

Scripts úteis:

| Comando | Descrição |
|--------|------------|
| `npm start` | Inicia o bundler Expo (`expo start`) |
| `npm run android` | Abre no emulador/dispositivo Android |
| `npm run ios` | Abre no simulador iOS (macOS) |
| `npm run web` | Abre a versão web (opcional) |

## Stack principal

- **Expo SDK 54** — compatível com Expo Go
- **TypeScript**
- **React Navigation** (stack + bottom tabs)
- **styled-components** (temas claro / escuro)
- **TanStack React Query** — dados do dashboard
- **Axios** — cliente HTTP (estrutura pronta; dados mock no momento)
- **react-native-chart-kit** + **react-native-svg** — gráficos
- **@react-native-community/datetimepicker** — datas nos filtros
- **@react-native-async-storage/async-storage** — preferência de tema

## Estrutura do código (`src/`)

```
src/
├── components/     # UI reutilizável (Card, Button, ChatFab, gráficos, etc.)
├── context/        # Auth, filtros de inventário, modo de tema
├── hooks/          # useDashboard, useCategories (React Query)
├── navigation/     # Root stack, tabs, tipos de rotas
├── screens/        # Login, Dashboard, Inventário, Chatbot + menu do chat
├── services/       # api.ts (Axios) + mockData
├── styles/         # darkTheme / lightTheme
├── types/          # Tipos TypeScript + augmentação do styled-components
└── utils/          # Datas, validade de produtos
```

## Funcionalidades

- **Login** simples (nome do usuário) e **logout**
- **Dashboard**: filtros (fabricação, validade, categoria, lote/RFID), cartões de resumo, gráficos (visão geral, validade, movimentação), tabela de inventário, painel de relatórios (pré-visualização / exportação como placeholder)
- **Aba Inventário**: mesma base de dados e filtros, lista com pull-to-refresh
- **Tema claro / escuro** com persistência e botão no header
- **FAB de chat** no canto inferior direito
- **Chatbot**: mensagem inicial com menu numerado (1–4), chips e campo de texto; respostas stub até ligar à API (ver `src/screens/chatbotMenu.ts`)

## API e variáveis de ambiente

Por padrão os dados vêm de **mock** em `src/services/mockData.ts`, consumidos via `src/services/api.ts`.

Para apontar para uma API real no futuro, defina por exemplo:

```env
EXPO_PUBLIC_API_URL=https://sua-api.com
```

e adapte as funções em `api.ts` (comentários no arquivo indicam o padrão sugerido).

## Boas práticas do projeto

- Componentes com responsabilidade única
- Tipagem TypeScript nos modelos de inventário e no tema
- Filtros compartilhados entre Dashboard e Inventário via contexto

## Licença

Projeto privado (`"private": true` no `package.json`). Ajuste conforme a política da sua organização.
