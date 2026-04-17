import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

/** Espaço extra no fim do scroll para o conteúdo não ficar sob o FAB */
export const CHAT_FAB_SCROLL_PADDING = 72;

const SIZE = 58;

export function ChatFab() {
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const bottom = tabBarHeight + 2;
  const right = 12 + insets.right;

  const openChat = () => {
    navigation.getParent()?.navigate('Chatbot' as never);
  };

  return (
    <Pressable
      onPress={openChat}
      accessibilityRole="button"
      accessibilityLabel="Abrir assistente"
      style={[
        styles.fab,
        {
          bottom,
          right,
          backgroundColor: t.colors.primary,
          shadowColor: t.mode === 'dark' ? '#000' : '#0F172A',
        },
      ]}
    >
      <Ionicons name="chatbubbles" size={28} color={t.colors.fabIcon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
});
