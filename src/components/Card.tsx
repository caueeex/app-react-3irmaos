import styled from 'styled-components/native';

export const Card = styled.View`
  background-color: ${({ theme }) => theme.colors.surfaceElevated};
  border-radius: ${({ theme }) => theme.radii.lg}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing(4)}px;
  shadow-color: #000000;
  shadow-offset: 0px 6px;
  shadow-opacity: 0.35;
  shadow-radius: 12px;
  elevation: 8;
`;
