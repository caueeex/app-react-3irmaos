import type { AppTheme } from '../styles/theme';

declare module 'styled-components/native' {
  export interface DefaultTheme extends AppTheme {}
}
