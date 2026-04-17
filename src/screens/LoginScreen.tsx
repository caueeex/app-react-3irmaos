import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { AppTextInput } from '../components/AppTextInput';
import { Button } from '../components/Button';
import { FadeInView } from '../components/FadeInView';
import { useAuth } from '../context/AuthContext';

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

export function LoginScreen() {
  const { login } = useAuth();
  const [name, setName] = useState('');

  const onSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe seu nome para continuar.');
      return;
    }
    login(name.trim());
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
            <Sub>Gestão de estoque com visão operacional em tempo real.</Sub>
            <Card>
              <AppTextInput
                label="Nome do usuário"
                placeholder="Como deve aparecer no painel"
                value={name}
                onChangeText={setName}
              />
              <Button title="Entrar" onPress={onSubmit} />
            </Card>
          </FadeInView>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}
