import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import {
  type ChatProduto,
  fetchChatMovimentacaoMes,
  fetchChatMovimentacaoMesProduto,
  fetchChatMovimentacaoMesTipo,
  fetchChatPerdasMes,
  fetchChatProdutos,
  fetchChatQuantidade,
  fetchChatRisco,
} from '../services/api';
import {
  exportMovimentacaoExcelToShareSheet,
  type ExcelExportChatContext,
} from '../services/exportMovimentacaoExcel';
import {
  buildExportFooter,
  buildMainMenuPrompt,
  buildMovSubmenuText,
  buildProductPickerText,
  buildWelcomeMessage,
} from './chatbotMenu';

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-horizontal: ${({ theme }) => theme.spacing(4)}px;
  padding-bottom: ${({ theme }) => theme.spacing(3)}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 18px;
  font-weight: 800;
`;

const Scroll = styled(ScrollView)`
  flex: 1;
  padding-horizontal: ${({ theme }) => theme.spacing(4)}px;
`;

const Bubble = styled.View<{ $assistant: boolean }>`
  max-width: 92%;
  align-self: ${({ $assistant }) => ($assistant ? 'flex-start' : 'flex-end')};
  background-color: ${({ theme, $assistant }) =>
    $assistant ? theme.colors.surfaceElevated : theme.colors.primaryMuted};
  border-width: 1px;
  border-color: ${({ theme, $assistant }) =>
    $assistant ? theme.colors.border : theme.colors.primary};
  border-radius: ${({ theme }) => theme.radii.lg}px;
  padding: ${({ theme }) => theme.spacing(3)}px;
  margin-bottom: ${({ theme }) => theme.spacing(3)}px;
`;

const BubbleText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
  line-height: 22px;
`;

const ChipsRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(2)}px;
  margin-bottom: ${({ theme }) => theme.spacing(4)}px;
`;

const Chip = styled.Pressable`
  padding-vertical: 8px;
  padding-horizontal: 12px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
`;

const ChipInner = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const ChipLabel = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 14px;
  font-weight: 700;
`;

const LoadingRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)}px;
  margin-bottom: ${({ theme }) => theme.spacing(3)}px;
`;

const LoadingText = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 14px;
`;

const Footer = styled.View`
  padding: ${({ theme }) => theme.spacing(3)}px;
  padding-bottom: ${({ theme }) => theme.spacing(2)}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.surface};
`;

const InputRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)}px;
`;

const Field = styled(TextInput)`
  flex: 1;
  min-height: 44px;
  max-height: 100px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radii.md}px;
  padding-horizontal: ${({ theme }) => theme.spacing(3)}px;
  padding-vertical: 10px;
  font-size: 15px;
`;

const PickerSection = styled.View`
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.background};
  padding-horizontal: ${({ theme }) => theme.spacing(4)}px;
  padding-top: ${({ theme }) => theme.spacing(2)}px;
  padding-bottom: ${({ theme }) => theme.spacing(2)}px;
`;

const PickerTitle = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  font-weight: 700;
  margin-bottom: ${({ theme }) => theme.spacing(2)}px;
`;

const ProductSearchField = styled(TextInput)`
  min-height: 42px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radii.md}px;
  padding-horizontal: ${({ theme }) => theme.spacing(3)}px;
  padding-vertical: 10px;
  font-size: 15px;
  margin-bottom: ${({ theme }) => theme.spacing(1)}px;
`;

const PickerMeta = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  margin-bottom: ${({ theme }) => theme.spacing(2)}px;
`;

const ProductRow = styled.View`
  flex-direction: row;
  align-items: center;
  padding-vertical: 11px;
  padding-horizontal: ${({ theme }) => theme.spacing(2)}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
  gap: 10px;
`;

const ProductRowNum = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 14px;
  font-weight: 800;
  min-width: 28px;
`;

const ProductRowName = styled.Text`
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
`;

const BodyWrap = styled.View`
  flex: 1;
`;

type ChatRole = 'assistant' | 'user';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type Phase =
  | 'main'
  | 'pick_prod_quantidade'
  | 'pick_prod_mov'
  | 'mov_actions'
  | 'post_reply';

type MovTipo = 'ENTRADA' | 'SAÍDA';

const nid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function ChatbotScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  /** Escopo do próximo Excel (última resposta do chat com produto/tipo). */
  const [excelExportContext, setExcelExportContext] = useState<ExcelExportChatContext | null>(null);

  const [phase, setPhase] = useState<Phase>('main');
  const [produtos, setProdutos] = useState<ChatProduto[]>([]);
  const [productFilter, setProductFilter] = useState('');
  const [movTipo, setMovTipo] = useState<MovTipo>('ENTRADA');

  const initialWelcome = useMemo(
    () => buildWelcomeMessage(user?.name ?? ''),
    [user?.name],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 'welcome', role: 'assistant', text: initialWelcome },
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].id !== 'welcome') return prev;
      return [{ ...prev[0], text: initialWelcome }];
    });
  }, [initialWelcome]);

  useEffect(() => {
    if (phase !== 'pick_prod_quantidade' && phase !== 'pick_prod_mov') {
      setProductFilter('');
    }
  }, [phase]);

  const produtosFiltradosComNumero = useMemo(() => {
    const q = productFilter.trim().toLowerCase();
    const base = produtos.map((p, i) => ({ p, menuNum: i + 2 }));
    if (!q) return base;
    return base.filter(({ p }) => p.nome.toLowerCase().includes(q));
  }, [produtos, productFilter]);

  const pushUser = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: `u-${nid()}`, role: 'user', text }]);
  }, []);

  const pushAssistant = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: `a-${nid()}`, role: 'assistant', text }]);
  }, []);

  const runExportExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      await exportMovimentacaoExcelToShareSheet(excelExportContext);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Não foi possível gerar o Excel. Tente de novo.';
      Alert.alert('Exportar Excel', msg);
    } finally {
      setExportingExcel(false);
    }
  }, [excelExportContext]);

  const goMainMenu = useCallback(() => {
    setExcelExportContext(null);
    setPhase('main');
    pushAssistant(buildMainMenuPrompt());
  }, [pushAssistant]);

  const loadProdutosAndShowPicker = useCallback(
    async (mode: 'quantidade' | MovTipo) => {
      setExcelExportContext(null);
      setLoadingInsight(true);
      try {
        const { produtos: list } = await fetchChatProdutos();
        setProdutos(list);
        if (mode === 'quantidade') setPhase('pick_prod_quantidade');
        else {
          setMovTipo(mode);
          setPhase('pick_prod_mov');
        }
        pushAssistant(buildProductPickerText(list));
      } catch {
        pushAssistant('Não foi possível carregar a lista de produtos. Tente de novo.');
      } finally {
        setLoadingInsight(false);
      }
    },
    [pushAssistant],
  );

  /** Resolve índice numérico na lista de produtos (1=Geral, 2+=produto). */
  const resolveQuantidadeChoice = useCallback(
    async (num: number) => {
      setLoadingInsight(true);
      try {
        if (num === 1) {
          const { texto } = await fetchChatQuantidade();
          pushAssistant(texto);
          setExcelExportContext(null);
        } else {
          const p = produtos[num - 2];
          if (!p) {
            pushAssistant('Opção de produto inválida.');
            return;
          }
          const { texto } = await fetchChatQuantidade(p.id_produto);
          pushAssistant(texto);
          setExcelExportContext({ idProduto: p.id_produto });
        }
        setPhase('post_reply');
      } catch {
        pushAssistant('Não foi possível obter a quantidade. Verifique a conexão.');
        setExcelExportContext(null);
        setPhase('post_reply');
      } finally {
        setLoadingInsight(false);
      }
    },
    [produtos, pushAssistant],
  );

  const resolveMovProdChoice = useCallback(
    async (num: number) => {
      setLoadingInsight(true);
      try {
        if (num === 1) {
          const { texto } = await fetchChatMovimentacaoMesTipo(movTipo);
          pushAssistant(texto);
          setExcelExportContext({ tipo: movTipo });
        } else {
          const p = produtos[num - 2];
          if (!p) {
            pushAssistant('Opção de produto inválida.');
            setExcelExportContext(null);
            setPhase('post_reply');
            return;
          }
          const { texto } = await fetchChatMovimentacaoMesProduto(movTipo, p.id_produto);
          pushAssistant(texto);
          setExcelExportContext({ idProduto: p.id_produto, tipo: movTipo });
        }
        setPhase('post_reply');
      } catch {
        pushAssistant('Não foi possível consultar movimentações por produto.');
        setExcelExportContext(null);
        setPhase('post_reply');
      } finally {
        setLoadingInsight(false);
      }
    },
    [movTipo, produtos, pushAssistant],
  );

  const selectProductFromList = useCallback(
    (menuNum: number) => {
      if (loadingInsight || exportingExcel) return;
      const nome = produtos[menuNum - 2]?.nome ?? '';
      pushUser(`${menuNum} · ${nome}`);
      if (phase === 'pick_prod_quantidade') void resolveQuantidadeChoice(menuNum);
      else if (phase === 'pick_prod_mov') void resolveMovProdChoice(menuNum);
    },
    [
      loadingInsight,
      exportingExcel,
      produtos,
      phase,
      pushUser,
      resolveQuantidadeChoice,
      resolveMovProdChoice,
    ],
  );

  const handleMainDigit = useCallback(
    async (digit: string) => {
      if (digit === '1') {
        pushUser('1 — Quantidade');
        await loadProdutosAndShowPicker('quantidade');
        return;
      }
      if (digit === '2') {
        pushUser('2 — Produtos em Risco');
        setExcelExportContext(null);
        setLoadingInsight(true);
        try {
          const { texto } = await fetchChatRisco();
          pushAssistant(texto);
          setPhase('post_reply');
        } catch {
          pushAssistant('Não foi possível consultar produtos em risco.');
          setPhase('post_reply');
        } finally {
          setLoadingInsight(false);
        }
        return;
      }
      if (digit === '3') {
        pushUser('3 — Entradas e Saídas');
        setExcelExportContext(null);
        setLoadingInsight(true);
        try {
          const { texto } = await fetchChatMovimentacaoMes();
          pushAssistant(`${texto}\n\n${buildMovSubmenuText()}`);
          setPhase('mov_actions');
        } catch {
          pushAssistant('Não foi possível consultar entradas e saídas.');
        } finally {
          setLoadingInsight(false);
        }
        return;
      }
      if (digit === '4') {
        pushUser('4 — Perdas');
        setExcelExportContext(null);
        setLoadingInsight(true);
        try {
          const { texto } = await fetchChatPerdasMes();
          pushAssistant(`${texto}\n\n${buildExportFooter()}`);
          setPhase('post_reply');
        } catch {
          pushAssistant('Não foi possível consultar perdas.');
          setPhase('post_reply');
        } finally {
          setLoadingInsight(false);
        }
      }
    },
    [pushUser, pushAssistant, loadProdutosAndShowPicker],
  );

  const handleMovActions = useCallback(
    async (raw: string) => {
      const t = raw.trim();
      if (t === '0') {
        pushUser('Voltar');
        goMainMenu();
        return;
      }
      if (t === '*' || t.startsWith('*')) {
        pushUser('Exportar Excel');
        await runExportExcel();
        return;
      }
      if (t === '1') {
        pushUser('1 — Entradas por produto');
        await loadProdutosAndShowPicker('ENTRADA');
        return;
      }
      if (t === '2') {
        pushUser('2 — Saídas por produto');
        await loadProdutosAndShowPicker('SAÍDA');
        return;
      }
      Alert.alert('Opção inválida', 'Use 0, *, 1 ou 2.');
    },
    [pushUser, goMainMenu, loadProdutosAndShowPicker, runExportExcel],
  );

  const handleProductMenuInput = useCallback(
    async (raw: string, mode: 'quantidade' | 'mov') => {
      const t = raw.trim();
      if (t === '0') {
        pushUser('Voltar');
        setProdutos([]);
        goMainMenu();
        return;
      }
      if (t === '*' || t.startsWith('*')) {
        pushUser('Exportar Excel');
        await runExportExcel();
        return;
      }
      const num = parseInt(t.replace(/^[^0-9]*/, '').slice(0, 2), 10);
      if (Number.isNaN(num) || num < 1) {
        Alert.alert('Opção inválida', 'Digite um número do menu, 0 ou * para exportar.');
        return;
      }
      const max = 1 + produtos.length;
      if (num > max) {
        Alert.alert('Opção inválida', `Escolha entre 1 e ${max}.`);
        return;
      }
      if (mode === 'quantidade') {
        pushUser(`${num} — opção`);
        await resolveQuantidadeChoice(num);
        return;
      }
      pushUser(`${num} — opção`);
      await resolveMovProdChoice(num);
    },
    [produtos.length, pushUser, goMainMenu, resolveQuantidadeChoice, resolveMovProdChoice, runExportExcel],
  );

  const handlePostReply = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (t === '0') {
        pushUser('Voltar');
        goMainMenu();
        return;
      }
      if (t === '*' || t.startsWith('*')) {
        pushUser('Exportar Excel');
        void runExportExcel();
        return;
      }
      Alert.alert('Opção inválida', 'Use 0 para voltar ao menu ou * para exportar Excel.');
    },
    [pushUser, goMainMenu, runExportExcel],
  );

  const onChip = useCallback(
    (key: string) => {
      if (loadingInsight || exportingExcel) return;
      void (async () => {
        if (phase === 'main') {
          await handleMainDigit(key);
          return;
        }
        if (phase === 'mov_actions') {
          await handleMovActions(key);
          return;
        }
        if (phase === 'pick_prod_quantidade') {
          await handleProductMenuInput(key, 'quantidade');
          return;
        }
        if (phase === 'pick_prod_mov') {
          await handleProductMenuInput(key, 'mov');
          return;
        }
        if (phase === 'post_reply') {
          handlePostReply(key);
        }
      })();
    },
    [
      loadingInsight,
      exportingExcel,
      phase,
      handleMainDigit,
      handleMovActions,
      handleProductMenuInput,
      handlePostReply,
    ],
  );

  const onSend = useCallback(() => {
    const raw = draft.trim();
    if (!raw || loadingInsight || exportingExcel) return;
    setDraft('');
    void (async () => {
      if (phase === 'main') {
        const d = raw.replace(/^[^0-9]*/, '').slice(0, 1);
        if (['1', '2', '3', '4'].includes(d)) {
          await handleMainDigit(d);
          return;
        }
      }
      if (phase === 'mov_actions') {
        await handleMovActions(raw);
        return;
      }
      if (phase === 'pick_prod_quantidade') {
        await handleProductMenuInput(raw, 'quantidade');
        return;
      }
      if (phase === 'pick_prod_mov') {
        await handleProductMenuInput(raw, 'mov');
        return;
      }
      if (phase === 'post_reply') {
        handlePostReply(raw);
        return;
      }
      Alert.alert('Comando inválido', 'Siga os números exibidos acima ou use os botões.');
    })();
  }, [draft, loadingInsight, exportingExcel, phase, handleMainDigit, handleMovActions, handleProductMenuInput, handlePostReply]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [messages, loadingInsight, exportingExcel]);

  const chips = useMemo(() => {
    if (phase === 'main') {
      return [
        { key: '1', label: '1 · Quantidade' },
        { key: '2', label: '2 · Produtos em Risco' },
        { key: '3', label: '3 · Entradas e Saídas' },
        { key: '4', label: '4 · Perdas' },
      ];
    }
    if (phase === 'mov_actions') {
      return [
        { key: '*', label: 'Exportar Excel' },
        { key: '0', label: 'Voltar' },
        { key: '1', label: '1 · Entradas por produto' },
        { key: '2', label: '2 · Saídas por produto' },
      ];
    }
    if (phase === 'pick_prod_quantidade' || phase === 'pick_prod_mov') {
      return [
        { key: '*', label: 'Exportar Excel' },
        { key: '0', label: 'Voltar' },
        { key: '1', label: '1 · Geral' },
      ];
    }
    if (phase === 'post_reply') {
      return [
        { key: '*', label: 'Exportar Excel' },
        { key: '0', label: 'Voltar' },
      ];
    }
    return [];
  }, [phase]);

  const placeholder =
    phase === 'main'
      ? '1–4 (menu)…'
      : phase === 'pick_prod_quantidade' || phase === 'pick_prod_mov'
        ? 'Número do produto, 0 ou *…'
        : 'Número, 0 ou * (Excel)…';

  const showProductPicker =
    (phase === 'pick_prod_quantidade' || phase === 'pick_prod_mov') && produtos.length > 0;

  return (
    <Container edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <Header>
          <Title>Assistente</Title>
          <Ionicons
            name="close"
            size={28}
            color={theme.colors.text}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
        </Header>

        <BodyWrap>
          <Scroll
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: theme.spacing(4) }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {messages.map((m) => (
              <Bubble key={m.id} $assistant={m.role === 'assistant'}>
                <BubbleText>{m.text}</BubbleText>
              </Bubble>
            ))}
            {loadingInsight || exportingExcel ? (
              <LoadingRow accessibilityLiveRegion="polite">
                <ActivityIndicator color={theme.colors.primary} />
                <LoadingText>
                  {exportingExcel ? 'Gerando Excel…' : 'Consultando dados do sistema…'}
                </LoadingText>
              </LoadingRow>
            ) : null}
            <ChipsRow>
              {chips.map((c) => (
                <Chip
                  key={`${phase}-${c.key}`}
                  disabled={loadingInsight || exportingExcel}
                  onPress={() => onChip(c.key)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    c.key === '*' ? 'Exportar planilha Excel' : c.label
                  }
                >
                  <ChipInner>
                    {c.key === '*' ? (
                      <Ionicons
                        name="document-text-outline"
                        size={19}
                        color={theme.colors.primary}
                      />
                    ) : null}
                    <ChipLabel numberOfLines={2}>{c.label}</ChipLabel>
                  </ChipInner>
                </Chip>
              ))}
            </ChipsRow>
          </Scroll>

          {showProductPicker ? (
            <PickerSection>
              <PickerTitle>Buscar produto</PickerTitle>
              <ProductSearchField
                value={productFilter}
                onChangeText={setProductFilter}
                placeholder="Digite parte do nome…"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                editable={!loadingInsight && !exportingExcel}
              />
              <PickerMeta>
                {produtosFiltradosComNumero.length === produtos.length
                  ? `${produtos.length} produto${produtos.length === 1 ? '' : 's'} — toque para escolher`
                  : `${produtosFiltradosComNumero.length} encontrado(s) · ${produtos.length} no catálogo`}
              </PickerMeta>
              <FlatList
                data={produtosFiltradosComNumero}
                keyExtractor={(item) => String(item.p.id_produto)}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 240 }}
                nestedScrollEnabled
                scrollIndicatorInsets={{ right: 1 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => selectProductFromList(item.menuNum)}
                    disabled={loadingInsight || exportingExcel}
                    accessibilityRole="button"
                    accessibilityLabel={`Opção ${item.menuNum}, ${item.p.nome}`}
                  >
                    {({ pressed }) => (
                      <ProductRow style={{ opacity: pressed ? 0.75 : 1 }}>
                        <ProductRowNum>{item.menuNum}</ProductRowNum>
                        <ProductRowName numberOfLines={3}>{item.p.nome}</ProductRowName>
                        <Ionicons
                          name="chevron-forward-outline"
                          size={18}
                          color={theme.colors.textMuted}
                        />
                      </ProductRow>
                    )}
                  </Pressable>
                )}
                ListEmptyComponent={
                  productFilter.trim().length > 0 ? (
                    <PickerMeta style={{ textAlign: 'center', paddingVertical: 12 }}>
                      Nenhum produto encontrado para essa busca.
                    </PickerMeta>
                  ) : null
                }
              />
            </PickerSection>
          ) : null}
        </BodyWrap>

        <Footer>
          <InputRow>
            <Field
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textMuted}
              multiline
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={onSend}
            />
            <Button title="Enviar" onPress={onSend} disabled={loadingInsight || exportingExcel} />
          </InputRow>
          <View style={{ height: 8 }} />
          <Button
            title="Fechar conversa"
            variant="secondary"
            onPress={() => navigation.goBack()}
          />
        </Footer>
      </KeyboardAvoidingView>
    </Container>
  );
}
