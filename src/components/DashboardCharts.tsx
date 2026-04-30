import { Dimensions, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';
import type { DashboardPayload } from '../types/inventory';

function chartWidth() {
  return Math.max(280, Dimensions.get('window').width - 40);
}

/** Largura para dois gráficos lado a lado dentro do card (padding scroll + card). */
export function dashboardChartPairColumnWidth(windowWidth: number) {
  const inner = windowWidth - 64;
  return Math.max(120, (inner - 12) / 2);
}

type Props = {
  data: DashboardPayload;
};

function useChartBase() {
  const t = useTheme();
  return useMemo(
    () => ({
      backgroundGradientFrom: t.colors.chartBgFrom,
      backgroundGradientTo: t.colors.chartBgTo,
      decimalPlaces: 0,
      color: (opacity = 1) =>
        t.mode === 'dark'
          ? `rgba(96, 165, 250, ${opacity})`
          : `rgba(37, 99, 235, ${opacity})`,
      labelColor: () => t.colors.chartLabel,
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: t.colors.chartLine,
      },
    }),
    [t],
  );
}

export function StockOverviewChart({ data }: Props) {
  const w = chartWidth();
  const chartBase = useChartBase();
  const t = useTheme();

  return (
    <LineChart
      data={{
        labels: data.stockOverview.map((p) => p.label),
        datasets: [
          {
            data: data.stockOverview.map((p) => p.total),
            color: (opacity = 1) =>
              t.mode === 'dark'
                ? `rgba(96, 165, 250, ${opacity})`
                : `rgba(37, 99, 235, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      }}
      width={w}
      height={200}
      chartConfig={{
        ...chartBase,
        propsForBackgroundLines: {
          strokeDasharray: '',
          stroke: t.colors.chartGrid,
        },
      }}
      bezier
      style={{ borderRadius: 16, alignSelf: 'center' }}
      withInnerLines
      withVerticalLines={false}
      fromZero
    />
  );
}

type SizedChartProps = Props & {
  width?: number;
  height?: number;
};

export function ValidityBarChart({ data, width: widthOverride, height: heightOverride }: SizedChartProps) {
  const w = widthOverride ?? chartWidth();
  const h = heightOverride ?? 210;
  const t = useTheme();
  const chartBase = useChartBase();
  const points = data.validityBuckets;

  return (
    <BarChart
      data={{
        labels: ['≤ 3 dias', '≤ 5 dias', '≤ 7 dias'],
        datasets: [
          {
            data: [points.within3, points.within5, points.within7],
            colors: [
              (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
              (opacity = 1) => `rgba(234, 179, 8, ${opacity})`,
              (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            ],
          },
        ],
      }}
      width={w}
      height={h}
      yAxisLabel=""
      yAxisSuffix=""
      chartConfig={{
        ...chartBase,
        barPercentage: 0.65,
        color: (opacity = 1) =>
          t.mode === 'dark'
            ? `rgba(96, 165, 250, ${opacity})`
            : `rgba(37, 99, 235, ${opacity})`,
      }}
      style={{ borderRadius: 16, alignSelf: 'center' }}
      fromZero
      showValuesOnTopOfBars
      withCustomBarColorFromData
      flatColor
    />
  );
}

type ExpiredBarProps = {
  count: number;
  width?: number;
  height?: number;
};

export function ExpiredItemsBarChart({
  count,
  width: widthOverride,
  height: heightOverride,
}: ExpiredBarProps) {
  const w = widthOverride ?? chartWidth();
  const h = heightOverride ?? 210;
  const chartBase = useChartBase();
  const v = Math.max(0, count);

  return (
    <BarChart
      data={{
        labels: ['Vencidos'],
        datasets: [
          {
            data: [v],
            colors: [(opacity = 1) => `rgba(185, 28, 28, ${opacity})`],
          },
        ],
      }}
      width={w}
      height={h}
      yAxisLabel=""
      yAxisSuffix=""
      chartConfig={{
        ...chartBase,
        barPercentage: 0.5,
        color: (opacity = 1) => `rgba(185, 28, 28, ${opacity})`,
      }}
      style={{ borderRadius: 16, alignSelf: 'center' }}
      fromZero
      showValuesOnTopOfBars
      withCustomBarColorFromData
      flatColor
    />
  );
}

const GROUP_BAR_H = 132;

export function MovementGroupedBarChart({ data }: Props) {
  const t = useTheme();
  const weeks = data.movement;
  const maxVal = Math.max(1, ...weeks.flatMap((w) => [w.inflow, w.outflow]));

  return (
    <View style={{ marginTop: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          height: GROUP_BAR_H + 22,
          paddingHorizontal: 2,
        }}
      >
        {weeks.map((w) => {
          const hIn = (w.inflow / maxVal) * GROUP_BAR_H;
          const hOut = (w.outflow / maxVal) * GROUP_BAR_H;
          return (
            <View key={w.label} style={{ flex: 1, alignItems: 'center', maxWidth: '26%' }}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 5,
                  alignItems: 'flex-end',
                  height: GROUP_BAR_H,
                }}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <View
                    style={{
                      width: '100%',
                      height: Math.max(w.inflow > 0 ? 4 : 0, hIn),
                      backgroundColor: t.colors.chartBar1,
                      borderRadius: 5,
                    }}
                  />
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <View
                    style={{
                      width: '100%',
                      height: Math.max(w.outflow > 0 ? 4 : 0, hOut),
                      backgroundColor: t.colors.chartBar2,
                      borderRadius: 5,
                    }}
                  />
                </View>
              </View>
              <Text style={{ marginTop: 8, fontSize: 11, color: t.colors.textMuted }}>{w.label}</Text>
            </View>
          );
        })}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 20,
          marginTop: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: t.colors.chartBar1 }} />
          <Text style={{ fontSize: 12, color: t.colors.textMuted }}>Entradas</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: t.colors.chartBar2 }} />
          <Text style={{ fontSize: 12, color: t.colors.textMuted }}>Saídas</Text>
        </View>
      </View>
    </View>
  );
}

export function PerdasWeeklyBarChart({ data }: Props) {
  const t = useTheme();
  const weeks = data.movement;
  const maxVal = Math.max(1, ...weeks.map((w) => w.losses));

  return (
    <View style={{ marginTop: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          height: GROUP_BAR_H + 22,
          paddingHorizontal: 2,
        }}
      >
        {weeks.map((w) => {
          const h = (w.losses / maxVal) * GROUP_BAR_H;
          return (
            <View key={w.label} style={{ flex: 1, alignItems: 'center', maxWidth: '26%' }}>
              <View style={{ height: GROUP_BAR_H, justifyContent: 'flex-end', width: '55%' }}>
                <View
                  style={{
                    height: Math.max(w.losses > 0 ? 4 : 0, h),
                    backgroundColor: t.colors.danger,
                    borderRadius: 5,
                  }}
                />
              </View>
              <Text style={{ marginTop: 8, fontSize: 11, color: t.colors.textMuted }}>{w.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={{ fontSize: 12, color: t.colors.textMuted, textAlign: 'center', marginTop: 10 }}>
        Total no mês: {data.lossesMonthTotal}
      </Text>
    </View>
  );
}

export function MovementLineChart({ data }: Props) {
  const w = chartWidth();
  const t = useTheme();
  const chartBase = useChartBase();

  return (
    <LineChart
      data={{
        labels: data.movement.map((m) => m.label),
        legend: ['Entradas', 'Saídas'],
        datasets: [
          {
            data: data.movement.map((m) => m.inflow),
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            strokeWidth: 3,
          },
          {
            data: data.movement.map((m) => m.outflow),
            color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
            strokeWidth: 3,
          },
        ],
      }}
      width={w}
      height={220}
      chartConfig={{
        ...chartBase,
        propsForBackgroundLines: {
          strokeDasharray: '',
          stroke: t.colors.chartGrid,
        },
      }}
      bezier
      style={{ borderRadius: 16, alignSelf: 'center' }}
      withInnerLines
      withVerticalLines={false}
      fromZero
    />
  );
}
