import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { fetchChatProdutos } from '../services/api';
import {
  REPORT_PERIODS,
  REPORT_TYPES,
  buildReportData,
  exportReportCsv,
  formatPreviewAlert,
  type ReportPeriod,
  type ReportType,
} from '../services/reportExport';
import { formatDisplayDate } from '../utils/date';
import { daysUntilExpiry } from '../utils/validity';

const PRODUTO_FILTRO_TODOS = 'Todos';

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

const PageMeta = styled.Text`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing(3)}px;
`;

const INVENTORY_PAGE_SIZE = 8;

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
  const [produtoFiltroOpen, setProdutoFiltroOpen] = useState(false);
  const [produtosNomes, setProdutosNomes] = useState<string[]>([]);

  const [reportType, setReportType] = useState<ReportType>(REPORT_TYPES[0]);
  const [period, setPeriod] = useState<ReportPeriod>(REPORT_PERIODS[1]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [inventoryPage, setInventoryPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { produtos } = await fetchChatProdutos();
        if (!cancelled) {
          setProdutosNomes(produtos.map((p) => p.nome));
        }
      } catch {
        if (!cancelled) setProdutosNomes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const produtoFiltroOptions = useMemo(
    () => [PRODUTO_FILTRO_TODOS, ...produtosNomes],
    [produtosNomes],
  );

  const inventoryItems = dashboard.data?.items ?? [];
  const inventoryTotalPages = Math.max(
    1,
    Math.ceil(inventoryItems.length / INVENTORY_PAGE_SIZE),
  );

  useEffect(() => {
    setInventoryPage(0);
  }, [applied, inventoryItems.length]);

  useEffect(() => {
    if (inventoryPage > inventoryTotalPages - 1) {
      setInventoryPage(Math.max(0, inventoryTotalPages - 1));
    }
  }, [inventoryPage, inventoryTotalPages]);

  const inventoryPageItems = useMemo(() => {
    const start = inventoryPage * INVENTORY_PAGE_SIZE;
    return inventoryItems.slice(start, start + INVENTORY_PAGE_SIZE);
  }, [inventoryItems, inventoryPage]);

  const onPreviewReport = useCallback(async () => {
    setReportBusy(true);
    try {
      const { preview } = await buildReportData(reportType, period);
      Alert.alert('Pré-visualização', formatPreviewAlert(preview));
    } catch (e) {
      Alert.alert(
        'Pré-visualização',
        e instanceof Error ? e.message : 'Não foi possível montar o resumo.',
      );
    } finally {
      setReportBusy(false);
    }
  }, [period, reportType]);

  const onExportExcel = useCallback(async () => {
    setReportBusy(true);
    try {
      await exportReportCsv(reportType, period);
    } catch (e) {
      Alert.alert(
        'Exportar planilha',
        e instanceof Error ? e.message : 'Não foi possível gerar a planilha.',
      );
    } finally {
      setReportBusy(false);
    }
  }, [period, reportType]);

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
              <SelectField
                label="Produto"
                value={draft.categoria?.trim() || PRODUTO_FILTRO_TODOS}
                options={produtoFiltroOptions}
                onChange={(v) =>
                  setDraftField(
                    'categoria',
                    v === PRODUTO_FILTRO_TODOS ? undefined : v,
                  )
                }
                open={produtoFiltroOpen}
                onOpenChange={(open) => {
                  setProdutoFiltroOpen(open);
                  if (open) {
                    setReportTypeOpen(false);
                    setPeriodOpen(false);
                  }
                }}
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
                subtitle={
                  inventoryItems.length === 0
                    ? 'Lista dinâmica conforme filtros aplicados.'
                    : `${inventoryItems.length} item(ns) · ${INVENTORY_PAGE_SIZE} por página`
                }
              />
              {inventoryItems.length === 0 ? (
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
                  {inventoryPageItems.map((it) => {
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
                  <PageMeta>
                    Página {inventoryPage + 1} de {inventoryTotalPages}
                  </PageMeta>
                  {inventoryTotalPages > 1 ? (
                    <Row>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="Anterior"
                          variant="secondary"
                          onPress={() =>
                            setInventoryPage((p) => Math.max(0, p - 1))
                          }
                          disabled={inventoryPage === 0}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          title="Próxima"
                          variant="secondary"
                          onPress={() =>
                            setInventoryPage((p) =>
                              Math.min(inventoryTotalPages - 1, p + 1),
                            )
                          }
                          disabled={inventoryPage >= inventoryTotalPages - 1}
                        />
                      </View>
                    </Row>
                  ) : null}
                </>
              )}
            </Card>

            <Card style={{ marginTop: 16 }}>
              <SectionTitle
                title="Painel de relatórios"
                subtitle="Escolha o tipo e o período para visualizar ou exportar."
              />
              <SelectField
                label="Tipo de relatório"
                value={reportType}
                options={[...REPORT_TYPES]}
                onChange={(v) => setReportType(v as ReportType)}
                open={reportTypeOpen}
                onOpenChange={setReportTypeOpen}
              />
              <View style={{ height: 12 }} />
              <SelectField
                label="Período"
                value={period}
                options={[...REPORT_PERIODS]}
                onChange={(v) => setPeriod(v as ReportPeriod)}
                open={periodOpen}
                onOpenChange={setPeriodOpen}
              />
              {reportBusy ? (
                <Row>
                  <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                    <ActivityIndicator color={styledTheme.colors.primary} />
                  </View>
                </Row>
              ) : (
                <>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Pré-visualizar"
                        variant="secondary"
                        onPress={onPreviewReport}
                      />
                    </View>
                  </Row>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Exportar Excel"
                        variant="ghost"
                        onPress={onExportExcel}
                      />
                    </View>
                  </Row>
                </>
              )}
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
