import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { AppTextInput } from '../components/AppTextInput';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CHAT_FAB_SCROLL_PADDING, ChatFab } from '../components/ChatFab';
import { DateField } from '../components/DateField';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { ValidityBadge } from '../components/ValidityBadge';
import { useInventoryTabFilters } from '../context/InventoryFiltersContext';
import { useDashboard } from '../hooks/useDashboard';
import type { InventoryItem } from '../types/inventory';
import { formatDisplayDate } from '../utils/date';
import { daysUntilExpiry } from '../utils/validity';

const Page = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const HeaderPad = styled.View`
  padding-horizontal: ${({ theme }) => theme.spacing(4)}px;
`;

const Grid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(3)}px;
`;

const Half = styled.View`
  flex-basis: 48%;
  flex-grow: 1;
`;

const FilterRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing(2)}px;
  margin-top: ${({ theme }) => theme.spacing(3)}px;
`;

const Row = styled.View`
  margin-horizontal: ${({ theme }) => theme.spacing(4)}px;
  padding: ${({ theme }) => theme.spacing(3)}px;
  border-radius: ${({ theme }) => theme.radii.md}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.surfaceElevated};
  margin-bottom: ${({ theme }) => theme.spacing(3)}px;
`;

const Title = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 16px;
  font-weight: 800;
`;

const Sub = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  margin-top: 4px;
`;

const Meta = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`;

const Chip = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  padding-vertical: 4px;
  padding-horizontal: 8px;
  border-radius: 999px;
  overflow: hidden;
`;

export function InventoryScreen() {
  const styledTheme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { draft, applied, setDraftField, applyDraft, reset } =
    useInventoryTabFilters();
  const query = useDashboard(applied);

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const dLeft = daysUntilExpiry(item.expiryDate);
    return (
      <Row>
        <Title numberOfLines={2}>{item.productName}</Title>
        <Sub>Lote {item.lot}</Sub>
        <Meta>
          <Chip>Fabricação: {formatDisplayDate(item.manufactureDate)}</Chip>
          <Chip>Validade: {formatDisplayDate(item.expiryDate)}</Chip>
          <Chip>Qtd: {item.quantity}</Chip>
          {item.deliveryPending ? <Chip>Entrega pendente</Chip> : null}
        </Meta>
        <Meta>
          <ValidityBadge daysLeft={dLeft} />
        </Meta>
      </Row>
    );
  };

  return (
    <Page>
      <FlatList
        data={query.data?.items ?? []}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <HeaderPad>
            <ScreenHeader />
            <Card style={{ marginTop: 12 }}>
              <SectionTitle
                title="Filtros do inventário"
              />
              <Grid>
                <Half>
                  <DateField
                    label="Fabricação (de)"
                    value={draft.manufactureFrom}
                    onChange={(v) => setDraftField('manufactureFrom', v)}
                  />
                </Half>
                <Half>
                  <DateField
                    label="Fabricação (até)"
                    value={draft.manufactureTo}
                    onChange={(v) => setDraftField('manufactureTo', v)}
                  />
                </Half>
                <Half>
                  <DateField
                    label="Validade (de)"
                    value={draft.expiryFrom}
                    onChange={(v) => setDraftField('expiryFrom', v)}
                  />
                </Half>
                <Half>
                  <DateField
                    label="Validade (até)"
                    value={draft.expiryTo}
                    onChange={(v) => setDraftField('expiryTo', v)}
                  />
                </Half>
              </Grid>
              <View style={{ height: 12 }} />
              <AppTextInput
                label="Lote / RFID"
                placeholder="Buscar por lote ou RFID"
                value={draft.lotOrRfid ?? ''}
                onChangeText={(t) => setDraftField('lotOrRfid', t)}
              />
              <FilterRow>
                <View style={{ flex: 1 }}>
                  <Button title="Aplicar filtros" onPress={applyDraft} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Limpar" variant="secondary" onPress={reset} />
                </View>
              </FilterRow>
            </Card>
            <Title style={{ marginTop: 16 }}>Itens</Title>
            <Sub>
              {query.data?.items.length ?? 0} resultado(s) com os filtros
              aplicados nesta aba.
            </Sub>
            {query.isPending && !query.data ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator
                  size="large"
                  color={styledTheme.colors.primary}
                />
              </View>
            ) : null}
          </HeaderPad>
        }
        ListEmptyComponent={
          query.isPending ? null : (
            <EmptyState
              title="Sem itens"
              description="Ajuste os filtros acima ou toque em Limpar para ver todos os itens disponíveis."
              icon="cube-outline"
            />
          )
        }
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 24 + CHAT_FAB_SCROLL_PADDING,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !!query.data}
            onRefresh={() => query.refetch()}
            tintColor={styledTheme.colors.primary}
            colors={[styledTheme.colors.primary]}
          />
        }
      />
      <ChatFab />
    </Page>
  );
}
