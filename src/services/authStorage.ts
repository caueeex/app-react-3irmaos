import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@tres_irmaos/auth_token';
const USER_KEY = '@tres_irmaos/auth_user';

export type StoredUser = { name: string; email: string };

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function setAuthSession(token: string, user: StoredUser): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
