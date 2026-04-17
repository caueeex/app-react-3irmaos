import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';
import { useThemeMode } from '../context/ThemeModeContext';
import { useAuth } from '../context/AuthContext';

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-bottom: ${({ theme }) => theme.spacing(3)}px;
`;

const Brand = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
`;

const User = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  margin-top: 2px;
`;

const Left = styled.View`
  flex: 1;
`;

const Actions = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)}px;
`;

const IconButton = styled.Pressable`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
`;

export function ScreenHeader() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const topPad = insets.top + theme.spacing(4);

  const themeIcon =
    mode === 'dark' ? ('sunny-outline' as const) : ('moon-outline' as const);
  const themeHint =
    mode === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';

  return (
    <Row style={{ paddingTop: topPad }}>
      <Left>
        <Brand>3IRMÃOS</Brand>
        <User>{user?.name ?? '—'}</User>
      </Left>
      <Actions>
        <IconButton
          onPress={toggleMode}
          accessibilityRole="button"
          accessibilityLabel={themeHint}
        >
          <Ionicons
            name={themeIcon}
            size={22}
            color={theme.colors.text}
          />
        </IconButton>
        <IconButton
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Sair"
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={theme.colors.iconLogout}
          />
        </IconButton>
      </Actions>
    </Row>
  );
}
