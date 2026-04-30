import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { AppTextInput } from '../components/AppTextInput';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  ExpiredItemsBarChart,
  MovementGroupedBarChart,
  PerdasWeeklyBarChart,
  StockOverviewChart,
  ValidityBarChart,
} from '../components/DashboardCharts';
import { DateField } from '../components/DateField';
import { EmptyState } from '../components/EmptyState';
import { FadeInView } from '../components/FadeInView';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionTitle } from '../components/SectionTitle';
import { SelectField } from '../components/SelectField';
import { CHAT_FAB_SCROLL_PADDING, ChatFab } from '../components/ChatFab';
import { ValidityBadge } from '../components/ValidityBadge';
import { useDashboardFilters } from '../context/InventoryFiltersContext';
import { useDashboard } from '../hooks/useDashboard';
import { formatDisplayDate } from '../utils/date';
import { daysUntilExpiry } from '../utils/validity';

const Page = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Content = styled(ScrollView)`
  flex: 1;
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

const Metric = styled.View`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.md}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing(3)}px;
`;

const MetricLabel = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  font-weight: 600;
`;

const MetricValue = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 22px;
  font-weight: 800;
  margin-top: 6px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing(2)}px;
  margin-top: ${({ theme }) => theme.spacing(3)}px;
`;

const TableHeader = styled.View`
  flex-direction: row;
  padding-vertical: 10px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const Th = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 11px;
  font-weight: 700;
  flex: 1;
`;

const Tr = styled.View`
  flex-direction: row;
  padding-vertical: 12px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const Td = styled.Text`
  color: ${({ theme }) => theme.colors.text};
  font-size: 12px;
  flex: 1;
`;

const TdMuted = styled(Td)`
  color: ${({ theme }) => theme.colors.textMuted};
`;

const StatusCell = styled.View`
  flex: 1;
  align-items: flex-start;
`;

const Hint = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  margin-bottom: ${({ theme }) => theme.spacing(2)}px;
`;

const ProductCell = styled(Td)`
  flex: 2;
`;

const LoadingBox = styled.View`
  padding-vertical: ${({ theme }) => theme.spacing(10)}px;
  align-items: center;
`;

const REPORT_TYPES = [
  'Movimentação',
  'Validade',
  'Inventário crítico',
  'Entregas pendentes',
];

const PERIODS = ['Últimos 7 dias', 'Últimos 30 dias', 'Trimestre atual'];

/** Largura dos gráficos de barras (scroll + card); evita hook só para dimensão. */
function alertPanelChartWidth(): number {
  return Math.max(280, Dimensions.get('window').width - 40);
}

export function DashboardScreen() {
  const styledTheme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const alertChartsW = alertPanelChartWidth();
  const { draft, applied, setDraftField, applyDraft, reset } =
    useDashboardFilters();
  const dashboard = useDashboard(applied);

  const [reportTypeOpen, setReportTypeOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);

  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [period, setPeriod] = useState(PERIODS[0]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const previewText = useMemo(() => {
    const lines = [
      `Tipo: ${reportType}`,
      `Período: ${period}`,
      `Itens considerados: ${dashboard.data?.items.length ?? 0}`,
      `Total (unidades): ${dashboard.data?.totalItems ?? 0}`,
    ];
    return lines.join('\n');
  }, [dashboard.data, period, reportType]);

  return (
    <Page>
      <Content
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 0,
          paddingBottom: tabBarHeight + 24 + CHAT_FAB_SCROLL_PADDING,
        }}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isFetching && !!dashboard.data}
            onRefresh={() => dashboard.refetch()}
            tintColor={styledTheme.colors.primary}
            colors={[styledTheme.colors.primary]}
          />
        }
      >
        <FadeInView>
          <ScreenHeader />
        </FadeInView>

        <Card style={{ marginTop: 12 }}>
          <Pressable
            onPress={() => setFiltersExpanded((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={
              filtersExpanded ? 'Recolher filtros' : 'Expandir filtros'
            }
          >
            <SectionTitle
              title="Filtros"
              subtitle={
                filtersExpanded
                  ? 'Refine os dados exibidos nos cartões e listas.'
                  : 'Toque aqui ou em Filtrar para abrir as opções.'
              }
              right={
                <Ionicons
                  name={filtersExpanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={styledTheme.colors.textMuted}
                />
              }
            />
          </Pressable>
          {!filtersExpanded ? (
            <Button
              title="Filtrar"
              onPress={() => setFiltersExpanded(true)}
            />
          ) : (
            <>
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
                label="Categoria (produto)"
                placeholder="Nome parcial do produto"
                value={draft.categoria ?? ''}
                onChangeText={(txt) => setDraftField('categoria', txt)}
              />
              <View style={{ height: 12 }} />
              <AppTextInput
                label="Lote / RFID"
                placeholder="Buscar por lote ou RFID"
                value={draft.lotOrRfid ?? ''}
                onChangeText={(txt) => setDraftField('lotOrRfid', txt)}
              />
              <Row>
                <View style={{ flex: 1 }}>
                  <Button title="Aplicar filtros" onPress={applyDraft} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Limpar" variant="secondary" onPress={reset} />
                </View>
              </Row>
              <View style={{ marginTop: 12 }}>
                <Button
                  title="Fechar"
                  variant="ghost"
                  onPress={() => setFiltersExpanded(false)}
                />
              </View>
            </>
          )}
        </Card>

        {dashboard.isPending && !dashboard.data ? (
          <LoadingBox>
            <ActivityIndicator
              size="large"
              color={styledTheme.colors.primary}
            />
          </LoadingBox>
        ) : dashboard.data ? (
          <>
            <Card style={{ marginTop: 16 }}>
              <SectionTitle
                title="Painel de alertas"
                subtitle="Validade próxima e itens vencidos (reflete os filtros aplicados)."
              />
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 18,
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: styledTheme.colors.warning,
                    }}
                  />
                  <Text style={{ fontSize: 13, color: styledTheme.colors.textMuted }}>
                    {dashboard.data.criticalItems} críticos (≤ 3 dias)
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: styledTheme.colors.danger,
                    }}
                  />
                  <Text style={{ fontSize: 13, color: styledTheme.colors.textMuted }}>
                    {dashboard.data.expiredItems} vencidos
                  </Text>
                </View>
              </View>
              <View style={{ gap: 20 }}>
                <View>
                  <Hint>Alerta de validade — próximos 7 dias</Hint>
                  <ValidityBarChart
                    data={dashboard.data}
                    width={alertChartsW}
                    height={210}
                  />
                </View>
                <View>
                  <Hint>Visão geral — itens vencidos</Hint>
                  <ExpiredItemsBarChart
                    count={dashboard.data.expiredItems}
                    width={alertChartsW}
                    height={210}
                  />
                </View>
              </View>
              <Hint style={{ marginTop: 14, marginBottom: 0 }}>
                Gráfico de validade: faixas exclusivas (≤3, 4–5, 6–7 dias úteis), sem contar vencidos.
              </Hint>
            </Card>

            <Card style={{ marginTop: 16 }}>
              <SectionTitle
                title="Resumo de estoque"
                subtitle="Volume filtrado e linha de tendência."
              />
              <Grid>
                <Half>
                  <Metric>
                    <MetricLabel>Itens para entrega</MetricLabel>
                    <MetricValue>
                      {dashboard.data.itemsForDelivery}
                    </MetricValue>
                  </Metric>
                </Half>
                <Half>
                  <Metric>
                    <MetricLabel>Total de itens (unid.)</MetricLabel>
                    <MetricValue>{dashboard.data.totalItems}</MetricValue>
                  </Metric>
                </Half>
              </Grid>
              <Text
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  fontWeight: '600',
                  color:
                    dashboard.data.stockDeltaMonth >= 0
                      ? styledTheme.colors.success
                      : styledTheme.colors.danger,
                }}
              >
                {dashboard.data.stockDeltaMonth >= 0 ? '+' : ''}
                {dashboard.data.stockDeltaMonth} no mês (entradas − saídas)
              </Text>
              <View style={{ marginTop: 12 }}>
                <StockOverviewChart data={dashboard.data} />
              </View>
            </Card>

            <Card style={{ marginTop: 16 }}>
              <SectionTitle
                title="Movimentação — mês atual"
                subtitle="Entradas e saídas por semana."
              />
              <MovementGroupedBarChart data={dashboard.data} />
            </Card>

            <Card style={{ marginTop: 16 }}>
              <SectionTitle
                title="Perdas — mês atual"
                subtitle="Movimentações tipo PERDA por semana."
              />
              <PerdasWeeklyBarChart data={dashboard.data} />
            </Card>

            <Card style={{ marginTop: 16 }}>
              <SectionTitle
                title="Inventário ativo"
                subtitle="Lista dinâmica conforme filtros aplicados."
              />
              {dashboard.data.items.length === 0 ? (
                <EmptyState
                  title="Nenhum item encontrado"
                  description="Ajuste os filtros ou limpe os campos para ampliar o resultado."
                  icon="search-outline"
                />
              ) : (
                <>
                  <TableHeader>
                    <Th style={{ flex: 2 }}>Produto</Th>
                    <Th>Lote</Th>
                    <Th>Fab.</Th>
                    <Th>Val.</Th>
                    <Th>Status</Th>
                  </TableHeader>
                  {dashboard.data.items.map((it) => {
                    const dLeft = daysUntilExpiry(it.expiryDate);
                    return (
                      <Tr key={it.id}>
                        <ProductCell numberOfLines={2}>
                          {it.productName}
                        </ProductCell>
                        <TdMuted>{it.lot}</TdMuted>
                        <TdMuted>
                          {formatDisplayDate(it.manufactureDate)}
                        </TdMuted>
                        <TdMuted>
                          {formatDisplayDate(it.expiryDate)}
                        </TdMuted>
                        <StatusCell>
                          <ValidityBadge daysLeft={dLeft} />
                        </StatusCell>
                      </Tr>
                    );
                  })}
                </>
              )}
            </Card>

            <Card style={{ marginTop: 16 }}>
              <SectionTitle
                title="Painel de relatórios"
                subtitle="Fluxo preparado para exportação futura."
              />
              <SelectField
                label="Tipo de relatório"
                value={reportType}
                options={REPORT_TYPES}
                onChange={setReportType}
                open={reportTypeOpen}
                onOpenChange={setReportTypeOpen}
              />
              <View style={{ height: 12 }} />
              <SelectField
                label="Período"
                value={period}
                options={PERIODS}
                onChange={setPeriod}
                open={periodOpen}
                onOpenChange={setPeriodOpen}
              />
              <Row>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Pré-visualizar"
                    variant="secondary"
                    onPress={() =>
                      Alert.alert('Pré-visualização', previewText)
                    }
                  />
                </View>
              </Row>
              <Row>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Exportar PDF"
                    variant="ghost"
                    onPress={() =>
                      Alert.alert(
                        'Exportação',
                        'Integração com endpoint de PDF pendente. Estrutura pronta no service.',
                      )
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Exportar Excel"
                    variant="ghost"
                    onPress={() =>
                      Alert.alert(
                        'Exportação',
                        'Integração com endpoint de Excel pendente. Estrutura pronta no service.',
                      )
                    }
                  />
                </View>
              </Row>
            </Card>
          </>
        ) : (
          <EmptyState
            title="Não foi possível carregar"
            description="Tente atualizar a tela."
            icon="alert-circle-outline"
          />
        )}
      </Content>
      <ChatFab />
    </Page>
  );
}
