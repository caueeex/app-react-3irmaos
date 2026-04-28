import { Ionicons } from '@expo/vector-icons';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import styled, { useTheme } from 'styled-components/native';

const WINDOW_H = Dimensions.get('window').height;
/** RN não resolve % sem altura no pai — modal “em branco” no bottom sheet. */
const SHEET_MAX_H = Math.min(Math.round(WINDOW_H * 0.55), 420);

const Wrap = styled.View`
  gap: 6px;
`;

const Label = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  font-weight: 600;
`;

const Field = styled.Pressable`
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.md}px;
  padding: ${({ theme }) => theme.spacing(3)}px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Value = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
`;

const Backdrop = styled.Pressable`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.overlay};
`;

const SheetCard = styled.View`
  background-color: ${({ theme }) => theme.colors.surfaceElevated};
  border-top-left-radius: ${({ theme }) => theme.radii.xl}px;
  border-top-right-radius: ${({ theme }) => theme.radii.xl}px;
  padding: ${({ theme }) => theme.spacing(4)}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
`;

const Option = styled.Pressable`
  padding-vertical: ${({ theme }) => theme.spacing(3)}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const OptionText = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
`;

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  open,
  onOpenChange,
}: Props) {
  const theme = useTheme();
  return (
    <Wrap>
      <Label>{label}</Label>
      <Field onPress={() => onOpenChange(true)}>
        <Value>{value}</Value>
        <Ionicons
          name="chevron-down"
          size={18}
          color={theme.colors.textMuted}
        />
      </Field>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => onOpenChange(false)}
      >
        <View style={{ flex: 1 }}>
          <Backdrop onPress={() => onOpenChange(false)} />
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: SHEET_MAX_H + 24,
            }}
          >
            <SheetCard style={{ maxHeight: SHEET_MAX_H, minHeight: 120 }}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={{ maxHeight: SHEET_MAX_H - 24 }}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {options.length === 0 ? (
                  <OptionText style={{ opacity: 0.75, paddingVertical: 12 }}>
                    Nenhuma opção disponível.
                  </OptionText>
                ) : (
                  options.map((opt, index) => (
                    <Option
                      key={`${index}:${opt}`}
                      onPress={() => {
                        onChange(opt);
                        onOpenChange(false);
                      }}
                    >
                      <OptionText>{opt}</OptionText>
                    </Option>
                  ))
                )}
              </ScrollView>
            </SheetCard>
          </View>
        </View>
      </Modal>
    </Wrap>
  );
}
