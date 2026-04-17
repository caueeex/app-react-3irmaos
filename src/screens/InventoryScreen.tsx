import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { CHAT_FAB_SCROLL_PADDING, ChatFab } from '../components/ChatFab';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { ValidityBadge } from '../components/ValidityBadge';
import { useInventoryFilters } from '../context/InventoryFiltersContext';
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
  const { applied } = useInventoryFilters();
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
            <Title style={{ marginTop: 8 }}>Inventário filtrado</Title>
            <Sub>
              Os mesmos filtros aplicados na aba Início são usados aqui.
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
              description="Ajuste os filtros na aba Início para ver mais resultados."
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
