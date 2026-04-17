import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';

type Variant = 'primary' | 'secondary' | 'ghost';

const Pressable = styled.Pressable<{
  $variant: Variant;
  $disabled?: boolean;
}>`
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  border-radius: ${({ theme }) => theme.radii.md}px;
  padding-vertical: ${({ theme }) => theme.spacing(3)}px;
  padding-horizontal: ${({ theme }) => theme.spacing(4)}px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 8px;
  background-color: ${({ theme, $variant }) =>
    $variant === 'primary'
      ? theme.colors.primary
      : $variant === 'secondary'
        ? theme.colors.surface
        : 'transparent'};
  border-width: ${({ $variant }) => ($variant === 'secondary' ? 1 : 0)}px;
  border-color: ${({ theme }) => theme.colors.border};
`;

const Label = styled.Text<{ $variant: Variant }>`
  color: ${({ theme, $variant }) =>
    $variant === 'ghost' ? theme.colors.text : '#FFFFFF'};
  font-size: 15px;
  font-weight: 600;
`;

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      $variant={variant}
      $disabled={isDisabled}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? '#E5E7EB' : '#FFFFFF'}
        />
      ) : (
        <>
          {icon}
          <Label $variant={variant}>{title}</Label>
        </>
      )}
    </Pressable>
  );
}
