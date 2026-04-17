import { Ionicons } from '@expo/vector-icons';
import styled, { useTheme } from 'styled-components/native';

const Wrap = styled.View`
  align-items: center;
  justify-content: center;
  padding-vertical: ${({ theme }) => theme.spacing(8)}px;
  gap: ${({ theme }) => theme.spacing(2)}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 700;
`;

const Sub = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 14px;
  text-align: center;
  padding-horizontal: ${({ theme }) => theme.spacing(6)}px;
`;

type Props = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
}: Props) {
  const theme = useTheme();
  return (
    <Wrap>
      <Ionicons name={icon} size={42} color={theme.colors.textMuted} />
      <Title>{title}</Title>
      {description ? <Sub>{description}</Sub> : null}
    </Wrap>
  );
}
