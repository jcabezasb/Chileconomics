import { useMemo } from 'react';
import TrendChart from '../../../../shared/components/TrendChart';
import { getChartData } from '../../../../data/bcch/indicators';
import { buildYoYSeries, mergeSeriesByDate } from '../../../../shared/utils/dates';
import { downloadCsv } from '../../../../shared/utils/download';
import { formatNumber } from '../../../../shared/utils/format';
import { buildJoinedReturns, buildRollingCorrelation, correlationBetween, toWeekly } from '../../../../shared/utils/correlation';
import { DetailPanel, Legend } from '../DetailParts';
import { buildCsv, buildMultiTable } from '../tables';
import BreakdownSection from './BreakdownSection';
import { indexFormatter, legendItems, percentAxis, percentFormatter, plainAxis, useAsyncData } from './breakdownUtils';

const PAIR = [
    { key: 'cobre', label: 'Cobre (US$/lb)', color: '#f97316' },
    { key: 'dolar', label: 'Dólar (CLP/US$)', color: '#38bdf8' }
];
const CORRELATION = [
    { key: 'corr12m', label: 'Ventana 12 meses', color: 'var(--chart-neon)', strokeWidth: 2.5 },
    { key: 'corr3m', label: 'Ventana 3 meses', color: '#94a3b8', strokeWidth: 1.5 }
];
// Ventanas en semanas: 13 ≈ 3 meses, 52 ≈ 12 meses.
const WINDOWS = [{ key: 'corr3m', size: 13 }, { key: 'corr12m', size: 52 }];
const ZERO_LINE = [{ y: 0, label: '' }];

const loadDolar = () => getChartData('dolar');
const formatCorrelation = (value) => (Number.isFinite(Number(value)) && value !== null ? formatNumber(Number(value), 2) : '');
const rebaseTo100 = (series) => {
    const base = series[0]?.value;
    return base ? series.map(({ date, value }) => ({ date, value: (value / base) * 100 })) : [];
};

// Cobre vs dólar: ambas series en el mismo gráfico y su correlación (variaciones semanales) en el tiempo.
// Semanal porque el dólar observado de cada día se calcula con transacciones del día hábil anterior.
const CobreBreakdown = ({ theme, cobreSeries, mainSeries, yoyEnabled, periodLabel }) => {
    const dolar = useAsyncData(loadDolar);

    const rolling = useMemo(() => {
        if (!dolar?.length || !cobreSeries.length) return { returns: [], rows: [] };
        const returns = buildJoinedReturns(toWeekly(cobreSeries), toWeekly(dolar));
        return { returns, rows: buildRollingCorrelation(returns, WINDOWS) };
    }, [dolar, cobreSeries]);
    const dolarYoY = useMemo(() => (dolar && yoyEnabled ? buildYoYSeries(dolar) : null), [dolar, yoyEnabled]);

    if (!dolar?.length || !mainSeries.length) return null;

    const start = mainSeries[0].date;
    const end = mainSeries[mainSeries.length - 1].date;
    const inPeriod = (entry) => entry.date >= start && entry.date <= end;
    const dolarInPeriod = (yoyEnabled ? dolarYoY : dolar).filter(inPeriod);
    const pairData = mergeSeriesByDate({
        cobre: yoyEnabled ? mainSeries : rebaseTo100(mainSeries),
        dolar: yoyEnabled ? dolarInPeriod : rebaseTo100(dolarInPeriod)
    });
    const correlationData = rolling.rows.filter(inPeriod);
    const periodCorrelation = correlationBetween(rolling.returns, start, end);
    const pairFormat = yoyEnabled ? percentFormatter : indexFormatter;

    return (
        <BreakdownSection>
            <DetailPanel
                wide
                title="Cobre y dólar"
                subtitle={yoyEnabled
                    ? 'Var. % en 12 meses de cada serie'
                    : 'Índice: inicio del período = 100 · cuando el cobre sube, el dólar suele bajar (el peso se aprecia)'}
                legend={<Legend items={legendItems(PAIR)} />}
                table={() => buildMultiTable(pairData, PAIR, pairFormat)}
                onDownload={() => downloadCsv(buildCsv(pairData, PAIR), `cobre-dolar${yoyEnabled ? '-var12m' : '-base100'}.csv`)}
            >
                <TrendChart
                    data={pairData}
                    height={240}
                    valueFormatter={pairFormat}
                    axisFormatter={yoyEnabled ? percentAxis : plainAxis}
                    theme={theme}
                    series={PAIR}
                    showAverage={false}
                    referenceLines={yoyEnabled ? ZERO_LINE : [{ y: 100, label: 'Inicio' }]}
                    detailed
                />
            </DetailPanel>
            {correlationData.length ? (
                <DetailPanel
                    wide
                    title="Correlación móvil cobre–dólar"
                    subtitle="Variaciones semanales · −1: se mueven siempre en sentido opuesto, 0: sin relación"
                    info="Correlación de Pearson entre las variaciones semanales del precio del cobre y del dólar observado. Se usan variaciones (no niveles) para no confundir tendencias comunes con relación."
                    latest={periodCorrelation !== null ? formatCorrelation(periodCorrelation) : null}
                    change={periodCorrelation !== null ? { text: `correlación ${periodLabel}`, direction: 'flat' } : null}
                    legend={<Legend items={legendItems(CORRELATION)} />}
                    table={() => buildMultiTable(correlationData, CORRELATION, formatCorrelation)}
                    onDownload={() => downloadCsv(buildCsv(correlationData, CORRELATION, 3), 'correlacion-cobre-dolar.csv')}
                >
                    <TrendChart
                        data={correlationData}
                        height={200}
                        valueFormatter={formatCorrelation}
                        axisFormatter={(value, decimals) => formatNumber(value, Math.max(decimals, 1))}
                        theme={theme}
                        series={CORRELATION}
                        showAverage={false}
                        referenceLines={ZERO_LINE}
                        detailed
                    />
                </DetailPanel>
            ) : null}
        </BreakdownSection>
    );
};

export default CobreBreakdown;
