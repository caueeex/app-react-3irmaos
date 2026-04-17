import { Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';
import type { DashboardPayload } from '../types/inventory';

function chartWidth() {
  return Math.max(280, Dimensions.get('window').width - 40);
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

export function ValidityBarChart({ data }: Props) {
  const w = chartWidth();
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
      height={210}
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
