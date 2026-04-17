import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { formatDisplayDate, parseISODate, toISODateString } from '../utils/date';
import { Button } from './Button';

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
`;

const Value = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 15px;
`;

const Sheet = styled.View`
  background-color: ${({ theme }) => theme.colors.surfaceElevated};
  border-top-left-radius: ${({ theme }) => theme.radii.xl}px;
  border-top-right-radius: ${({ theme }) => theme.radii.xl}px;
  padding: ${({ theme }) => theme.spacing(4)}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
`;

type Props = {
  label: string;
  value?: string;
  onChange: (isoDate: string) => void;
};

export function DateField({ label, value, onChange }: Props) {
  const theme = useTheme();
  const pickerTheme = theme.mode === 'dark' ? 'dark' : 'light';

  const selected = useMemo(
    () => (value ? parseISODate(value) : new Date()),
    [value],
  );
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(selected);

  useEffect(() => {
    if (open) setTemp(selected);
  }, [open, selected]);

  const applyAndroid = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'dismissed') return;
    if (date) onChange(toISODateString(date));
  };

  if (Platform.OS === 'android') {
    return (
      <Wrap>
        <Label>{label}</Label>
        <Field onPress={() => setOpen(true)}>
          <Value>{value ? formatDisplayDate(value) : 'Selecionar'}</Value>
        </Field>
        {open ? (
          <DateTimePicker
            value={selected}
            mode="date"
            display="default"
            onChange={applyAndroid}
            themeVariant={pickerTheme}
          />
        ) : null}
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Label>{label}</Label>
      <Field onPress={() => setOpen(true)}>
        <Value>{value ? formatDisplayDate(value) : 'Selecionar'}</Value>
      </Field>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Sheet>
              <DateTimePicker
                value={temp}
                mode="date"
                display="inline"
                onChange={(_, date) => {
                  if (date) setTemp(date);
                }}
                themeVariant={pickerTheme}
              />
              <View style={{ height: 12 }} />
              <Button
                title="Confirmar"
                onPress={() => {
                  onChange(toISODateString(temp));
                  setOpen(false);
                }}
              />
            </Sheet>
          </Pressable>
        </Pressable>
      </Modal>
    </Wrap>
  );
}
