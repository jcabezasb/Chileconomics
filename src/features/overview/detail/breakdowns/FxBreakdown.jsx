import { useMemo } from 'react';
import TrendChart from '../../../../shared/components/TrendChart';
import { getFxDetailSeries, getTcrDetailSeries } from '../../../../data/bcch/indicators';
import { mergeSeriesByDate } from '../../../../shared/utils/dates';
import { downloadCsv } from '../../../../shared/utils/download';
import { latestValueOf, makeAxisFormatter, makeValueFormatter, periodChangeOf } from '../../../../shared/utils/detailStats';
import { DetailPanel, Legend } from '../DetailParts';
import { buildCsv, multiSeriesTable, singleSeriesTable } from '../tables';
import BreakdownSection from './BreakdownSection';
import { indexOrPercent, legendItems, percentFormatter, useAsyncData } from './breakdownUtils';

const CURRENCIES = [
    { key: 'cny', title: 'Yuan chino', code: 'CNY', color: '#22d3ee' },
    { key: 'eur', title: 'Euro', code: 'EUR', color: '#60a5fa' },
    { key: 'ars', title: 'Peso argentino', code: 'ARS', color: '#f97316' },
    { key: 'jpy', title: 'Yen japonés', code: 'JPY', color: '#22c55e' }
];
const TCR_SERIES = [
    { key: 'tcr', label: 'TCR', color: '#38bdf8' },
    { key: 'tcr5', label: 'TCR-5', color: '#f97316' }
];

const loadFx = () => Promise.all([getFxDetailSeries(), getTcrDetailSeries()]).then(([fx, tcr]) => ({ fx, tcr }));

// Tipo de cambio: peso contra otras monedas y tipo de cambio real.
const FxBreakdown = ({ theme, prepare, transform, range, yoyEnabled }) => {
    const raw = useAsyncData(loadFx);
    const fileSuffix = yoyEnabled ? '-var12m' : '';
    // Monedas de valor bajo (ARS, JPY) necesitan 2 decimales.
    const fxFormat = (value) => (
        yoyEnabled
            ? percentFormatter(value)
            : makeValueFormatter({ prefix: '$', decimals: Math.abs(Number(value)) < 10 ? 2 : 1 })(value)
    );
    const fxAxis = makeAxisFormatter(yoyEnabled ? { suffix: '%' } : { prefix: '$' });
    const tcrUnits = indexOrPercent(yoyEnabled);

    const prepared = useMemo(() => {
        if (!raw) return null;
        const fx = Object.fromEntries(CURRENCIES.map(({ key }) => [key, prepare(raw.fx[key] || [])]));
        const tcr = mergeSeriesByDate({ tcr: prepare(raw.tcr.tcr || []), tcr5: prepare(raw.tcr.tcr5 || []) });
        return { fx, tcr };
    }, [raw, prepare]);

    if (!prepared) return null;
    const currencies = CURRENCIES.filter(({ key }) => prepared.fx[key].length);
    if (!currencies.length && !prepared.tcr.length) return null;

    return (
        <BreakdownSection>
            {currencies.map((currency) => {
                const series = prepared.fx[currency.key];
                return (
                    <DetailPanel
                        key={currency.key}
                        title={`${currency.title} (${currency.code})`}
                        subtitle={yoyEnabled ? 'Var. % en 12 meses' : `Pesos por ${currency.code}`}
                        latest={latestValueOf(series, fxFormat)}
                        change={periodChangeOf(series, yoyEnabled)}
                        table={() => singleSeriesTable(transform(raw.fx[currency.key] || []), `${currency.code}/CLP`, fxFormat, { percentUnit: yoyEnabled, range })}
                        onDownload={() => downloadCsv(buildCsv(series, [{ key: 'value' }], 2), `${currency.key}-clp${fileSuffix}.csv`)}
                    >
                        <TrendChart
                            data={series}
                            color={currency.color}
                            height={170}
                            averageFormatter={fxFormat}
                            valueFormatter={fxFormat}
                            axisFormatter={fxAxis}
                            theme={theme}
                            detailed
                        />
                    </DetailPanel>
                );
            })}
            {prepared.tcr.length ? (
                <DetailPanel
                    wide
                    title="Tipo de cambio real"
                    subtitle={yoyEnabled ? 'Var. % en 12 meses' : 'Índice promedio 1986=100'}
                    info="Mide la competitividad cambiaria ajustando por inflación. Un valor más alto indica un tipo de cambio real más depreciado."
                    legend={<Legend items={legendItems(TCR_SERIES)} />}
                    table={() => multiSeriesTable(prepared.tcr, TCR_SERIES, tcrUnits.format)}
                    onDownload={() => downloadCsv(buildCsv(prepared.tcr, TCR_SERIES), `tcr${fileSuffix}.csv`)}
                >
                    <TrendChart
                        data={prepared.tcr}
                        height={220}
                        valueFormatter={tcrUnits.format}
                        axisFormatter={tcrUnits.axis}
                        theme={theme}
                        series={TCR_SERIES}
                        showAverage={false}
                        detailed
                    />
                </DetailPanel>
            ) : null}
        </BreakdownSection>
    );
};

export default FxBreakdown;
