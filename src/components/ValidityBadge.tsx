import styled from 'styled-components/native';
import type { ValidityLevel } from '../types/inventory';
import { validityLabel } from '../utils/validity';

const Badge = styled.View<{ $level: ValidityLevel }>`
  padding-vertical: 4px;
  padding-horizontal: 10px;
  border-radius: 999px;
  background-color: ${({ theme, $level }) =>
    $level === 'critical'
      ? 'rgba(239,68,68,0.18)'
      : $level === 'warning'
        ? 'rgba(234,179,8,0.18)'
        : 'rgba(34,197,94,0.18)'};
  border-width: 1px;
  border-color: ${({ theme, $level }) =>
    $level === 'critical'
      ? theme.colors.danger
      : $level === 'warning'
        ? theme.colors.warning
        : theme.colors.success};
`;

const Text = styled.Text<{ $level: ValidityLevel }>`
  color: ${({ theme, $level }) =>
    $level === 'critical'
      ? theme.colors.danger
      : $level === 'warning'
        ? theme.colors.warning
        : theme.colors.success};
  font-size: 12px;
  font-weight: 700;
`;

type Props = {
  daysLeft: number;
};

export function ValidityBadge({ daysLeft }: Props) {
  const level: ValidityLevel =
    daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'warning' : 'ok';
  return (
    <Badge $level={level}>
      <Text $level={level}>{validityLabel(daysLeft)}</Text>
    </Badge>
  );
}
