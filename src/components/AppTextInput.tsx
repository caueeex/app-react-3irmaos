import type { TextInputProps } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

const Wrap = styled.View`
  gap: 6px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  font-weight: 600;
`;

const Field = styled.TextInput`
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-radius: ${({ theme }) => theme.radii.md}px;
  padding: ${({ theme }) => theme.spacing(3)}px;
  font-size: 15px;
`;

type Props = {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  editable?: boolean;
  onPressIn?: () => void;
} & Pick<
  TextInputProps,
  'secureTextEntry' | 'autoCapitalize' | 'autoCorrect' | 'keyboardType'
>;

export function AppTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  onPressIn,
  secureTextEntry,
  autoCapitalize,
  autoCorrect,
  keyboardType,
}: Props) {
  const theme = useTheme();
  return (
    <Wrap>
      {label ? <Label>{label}</Label> : null}
      <Field
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        editable={editable}
        onPressIn={onPressIn}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
      />
    </Wrap>
  );
}
