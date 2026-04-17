import type { ReactNode } from 'react';
import styled from 'styled-components/native';

const Row = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing(3)}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 18px;
  font-weight: 700;
`;

const Sub = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  margin-top: 4px;
`;

const Left = styled.View`
  flex: 1;
  padding-right: ${({ theme }) => theme.spacing(2)}px;
`;

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function SectionTitle({ title, subtitle, right }: Props) {
  return (
    <Row>
      <Left>
        <Title>{title}</Title>
        {subtitle ? <Sub>{subtitle}</Sub> : null}
      </Left>
      {right}
    </Row>
  );
}
