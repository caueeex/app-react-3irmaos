import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { AppTextInput } from '../components/AppTextInput';
import { Button } from '../components/Button';
import { FadeInView } from '../components/FadeInView';
import { SelectField } from '../components/SelectField';
import { useAuth } from '../context/AuthContext';
import {
  fetchPerfisPublic,
  formatLoginOrConnectionError,
  registerRequest,
  type ApiPerfil,
} from '../services/api';

/** Se definido (ex.: 2 = Operador), o cadastro não exibe o campo Perfil. */
function parseRegisterPerfilIdFromEnv(): number | null {
  const raw = process.env.EXPO_PUBLIC_REGISTER_PERFIL_ID?.trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const Screen = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Brand = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 1.2px;
  text-align: center;
`;

const Sub = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 15px;
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing(2)}px;
  margin-bottom: ${({ theme }) => theme.spacing(8)}px;
`;

const Card = styled.View`
  background-color: ${({ theme }) => theme.colors.surfaceElevated};
  border-radius: ${({ theme }) => theme.radii.xl}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing(5)}px;
  gap: ${({ theme }) => theme.spacing(4)}px;
  shadow-color: #000000;
  shadow-offset: 0px 6px;
  shadow-opacity: 0.35;
  shadow-radius: 12px;
  elevation: 8;
`;

const LinkButton = styled(Pressable)`
  padding-vertical: ${({ theme }) => theme.spacing(2)}px;
  align-self: center;
`;

const LinkLabel = styled.Text`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 14px;
  font-weight: 600;
`;

export function LoginScreen() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [perfis, setPerfis] = useState<ApiPerfil[]>([]);
  const [perfilLabel, setPerfilLabel] = useState('');
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const registerPerfilIdFixo = useMemo(() => parseRegisterPerfilIdFromEnv(), []);
  const escolhePerfilNaTela = registerPerfilIdFixo == null;

  useEffect(() => {
    if (mode !== 'register' || !escolhePerfilNaTela) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPerfisPublic();
        if (cancelled) return;
        setPerfis(list);
        if (list.length > 0) {
          setPerfilLabel(list[0].nome);
        } else {
          setPerfilLabel('');
          Alert.alert(
            'Cadastro indisponível',
            'Não há perfis disponíveis no momento. Fale com o administrador do sistema.',
          );
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const { title, message } = formatLoginOrConnectionError(err, 'login');
          Alert.alert(title, `${message}\n\nNão foi possível carregar os perfis para o cadastro.`);
          setMode('login');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, escolhePerfilNaTela]);

  const perfilOptions = useMemo(() => perfis.map((p) => p.nome), [perfis]);

  const idPerfilSelecionado = useMemo(() => {
    const found = perfis.find((p) => p.nome === perfilLabel);
    return found?.id_perfil;
  }, [perfilLabel, perfis]);

  const idPerfilParaCadastro = registerPerfilIdFixo ?? idPerfilSelecionado;

  const onSubmitLogin = async () => {
    if (!email.trim() || !senha) {
      Alert.alert('Atenção', 'Informe e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), senha);
    } catch (err: unknown) {
      const { title, message } = formatLoginOrConnectionError(err, 'login');
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitRegister = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe seu nome.');
      return;
    }
    if (!email.trim() || !senha) {
      Alert.alert('Atenção', 'Informe e-mail e senha.');
      return;
    }
    if (senha !== confirmSenha) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    if (idPerfilParaCadastro == null) {
      Alert.alert(
        'Atenção',
        escolhePerfilNaTela
          ? perfis.length === 0
            ? 'Não há perfil disponível. Fale com o administrador do sistema.'
            : 'Selecione um perfil.'
          : 'Cadastro temporariamente indisponível. Fale com o administrador do sistema.',
      );
      return;
    }
    setLoading(true);
    try {
      await registerRequest(nome.trim(), email.trim(), senha, idPerfilParaCadastro);
    } catch (err: unknown) {
      const { title, message } = formatLoginOrConnectionError(err, 'register');
      Alert.alert(title, message);
      setLoading(false);
      return;
    }
    try {
      await login(email.trim(), senha);
    } catch (err: unknown) {
      const { title, message } = formatLoginOrConnectionError(err, 'login');
      Alert.alert(
        'Conta criada',
        `Seu cadastro foi concluído, mas não foi possível entrar automaticamente.\n\n${message}`,
        [{ text: 'OK', onPress: () => setMode('login') }],
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setConfirmSenha('');
    if (mode === 'register') setNome('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={24}
    >
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 24,
          }}
        >
          <FadeInView>
            <Brand>3IRMÃOS</Brand>
            <Sub>Gestão de estoque e validade.</Sub>
            <Card>
              {mode === 'register' ? (
                <AppTextInput
                  label="Nome"
                  placeholder="Seu nome"
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                />
              ) : null}
              <AppTextInput
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <AppTextInput
                label="Senha"
                placeholder="••••••••"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
              />
              {mode === 'register' ? (
                <>
                  <AppTextInput
                    label="Confirmar senha"
                    placeholder="••••••••"
                    value={confirmSenha}
                    onChangeText={setConfirmSenha}
                    secureTextEntry
                  />
                  {escolhePerfilNaTela ? (
                    perfis.length > 0 ? (
                      <SelectField
                        label="Perfil"
                        value={perfilLabel}
                        options={perfilOptions}
                        onChange={setPerfilLabel}
                        open={perfilOpen}
                        onOpenChange={setPerfilOpen}
                      />
                    ) : (
                      <View style={{ minHeight: 8 }} />
                    )
                  ) : null}
                </>
              ) : null}
              {loading ? (
                <ActivityIndicator />
              ) : mode === 'login' ? (
                <Button title="Entrar" onPress={onSubmitLogin} />
              ) : (
                <Button title="Cadastrar" onPress={onSubmitRegister} />
              )}
              <LinkButton onPress={toggleMode} disabled={loading}>
                <LinkLabel>
                  {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tenho conta — entrar'}
                </LinkLabel>
              </LinkButton>
            </Card>
          </FadeInView>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}
