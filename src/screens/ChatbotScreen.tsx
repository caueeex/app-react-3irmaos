import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import {
  buildWelcomeMessage,
  CHATBOT_MENU_OPTIONS,
  type MenuOption,
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

const ChipLabel = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 14px;
  font-weight: 700;
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

type ChatRole = 'assistant' | 'user';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

function findMenuOption(input: string): MenuOption | undefined {
  const n = input.trim().replace(/^[^0-9]*/, '').slice(0, 1);
  return CHATBOT_MENU_OPTIONS.find((o) => o.key === n);
}

export function ChatbotScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');

  const initialWelcome = useMemo(
    () => buildWelcomeMessage(user?.name ?? ''),
    [user?.name],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: initialWelcome,
    },
  ]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].id !== 'welcome') return prev;
      return [{ ...prev[0], text: initialWelcome }];
    });
  }, [initialWelcome]);

  const appendExchange = useCallback((option: MenuOption) => {
    const userLine = `${option.key} — ${option.title}`;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: userLine },
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: option.stubReply,
      },
    ]);
  }, []);

  const onPickOption = useCallback(
    (option: MenuOption) => {
      appendExchange(option);
    },
    [appendExchange],
  );

  const onSend = useCallback(() => {
    const raw = draft.trim();
    if (!raw) return;
    const opt = findMenuOption(raw);
    if (opt) {
      appendExchange(opt);
      setDraft('');
      return;
    }
    Alert.alert(
      'Mensagem livre',
      'O envio de texto livre e o histórico completo serão conectados à API em breve. Por ora use as opções 1 a 4 ou fale com o time.',
    );
  }, [draft, appendExchange]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [messages]);

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

        <Scroll
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: theme.spacing(4) }}
        >
          {messages.map((m) => (
            <Bubble key={m.id} $assistant={m.role === 'assistant'}>
              <BubbleText>{m.text}</BubbleText>
            </Bubble>
          ))}
          <ChipsRow>
            {CHATBOT_MENU_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                onPress={() => onPickOption(o)}
                accessibilityRole="button"
                accessibilityLabel={`Opção ${o.key}: ${o.title}`}
              >
                <ChipLabel>
                  {o.key} · {o.title}
                </ChipLabel>
              </Chip>
            ))}
          </ChipsRow>
        </Scroll>

        <Footer>
          <InputRow>
            <Field
              value={draft}
              onChangeText={setDraft}
              placeholder="Digite 1, 2, 3 ou 4…"
              placeholderTextColor={theme.colors.textMuted}
              multiline
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={onSend}
            />
            <Button title="Enviar" onPress={onSend} />
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
