import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { AppTextInput } from '../components/AppTextInput';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  MovementLineChart,
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
import { useInventoryFilters } from '../context/InventoryFiltersContext';
import { useCategories, useDashboard } from '../hooks/useDashboard';
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

export function DashboardScreen() {
  const styledTheme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { draft, applied, setDraftField, applyDraft, reset } =
    useInventoryFilters();
  const dashboard = useDashboard(applied);
  const categoriesQuery = useCategories();

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [reportTypeOpen, setReportTypeOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);

  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [period, setPeriod] = useState(PERIODS[0]);

  const categoryOptions = categoriesQuery.data ?? ['Todas'];

  useEffect(() => {
    if (!draft.category) {
      setDraftField('category', 'Todas');
    }
  }, [draft.category, setDraftField]);

  const categoryValue = draft.category ?? 'Todas';

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
          <SectionTitle
            title="Filtros"
            subtitle="Refine os dados exibidos nos cartões e listas."
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
          <SelectField
            label="Categoria"
            value={categoryValue}
            options={categoryOptions}
            onChange={(v) => setDraftField('category', v)}
            open={categoryOpen}
            onOpenChange={setCategoryOpen}
          />
          <View style={{ height: 12 }} />
          <AppTextInput
            label="Lote / RFID"
            placeholder="Buscar por lote ou RFID"
            value={draft.lotOrRfid ?? ''}
            onChangeText={(t) => setDraftField('lotOrRfid', t)}
          />
          <Row>
            <View style={{ flex: 1 }}>
              <Button title="Aplicar filtros" onPress={applyDraft} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Limpar" variant="secondary" onPress={reset} />
            </View>
          </Row>
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
                title="Visão geral do estoque"
                subtitle="Acompanhe volume e tendência."
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
              <View style={{ marginTop: 12 }}>
                <StockOverviewChart data={dashboard.data} />
              </View>
            </Card>

            <Card style={{ marginTop: 16 }}>
              <SectionTitle
                title="Alerta de validade"
                subtitle="Distribuição por janelas de vencimento."
              />
              <Metric style={{ marginBottom: 12 }}>
                <MetricLabel>Itens críticos (≤ 3 dias)</MetricLabel>
                <MetricValue>{dashboard.data.criticalItems}</MetricValue>
              </Metric>
              <Hint>
                Barras mostram quantidades dentro de 3, 5 e 7 dias até o
                vencimento.
              </Hint>
              <ValidityBarChart data={dashboard.data} />
            </Card>

            <Card style={{ marginTop: 16 }}>
              <SectionTitle
                title="Relatório de movimentação"
                subtitle="Entradas e saídas por dia da semana (mock)."
              />
              <MovementLineChart data={dashboard.data} />
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
