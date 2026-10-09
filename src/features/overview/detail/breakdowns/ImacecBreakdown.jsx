import { useMemo, useState } from 'react';
import TrendChart from '../../../../shared/components/TrendChart';
import { getImacecDetailSeries } from '../../../../data/bcch/indicators';
import { mergeSeriesByDate } from '../../../../shared/utils/dates';
import { downloadCsv } from '../../../../shared/utils/download';
import { latestValueOf, periodChangeOf } from '../../../../shared/utils/detailStats';
import { DetailPanel, Legend } from '../DetailParts';
import { buildCsv, buildMultiTable, buildSingleTable } from '../tables';
import BreakdownSection from './BreakdownSection';
import { indexOrPercent, legendItems, useAsyncData } from './breakdownUtils';

const GOODS = [
    { id: 'total', key: 'bienes', label: 'Total', seriesLabel: 'Producción de bienes', color: '#38bdf8' },
    { id: 'mineria', key: 'mineria', label: 'Minería', seriesLabel: 'Minería', color: '#0ea5e9' },
    { id: 'industria', key: 'industria', label: 'Industria', seriesLabel: 'Industria', color: '#f59e0b' },
    { id: 'resto', key: 'resto_bienes', label: 'Resto de bienes', seriesLabel: 'Resto de bienes', color: '#a855f7' }
];
const COMMERCE = [
    { key: 'comercio', label: 'Comercio', color: '#22c55e' },
    { key: 'servicios', label: 'Servicios', color: '#60a5fa' }
];

// "Total" es exclusivo: elegirlo limpia el resto; elegir otra serie saca "Total".
const toggleGoods = (selection, id) => {
    if (id === 'total') return ['total'];
    if (selection.includes('total')) return [id];
    const next = selection.includes(id) ? selection.filter((item) => item !== id) : [...selection, id];
    return next.length ? next : ['total'];
};

// IMACEC: producción de bienes (con selección de componentes), comercio y servicios, y no minero.
const ImacecBreakdown = ({ theme, prepare, yoyEnabled }) => {
    const raw = useAsyncData(getImacecDetailSeries);
    const [selection, setSelection] = useState(['total']);
    const { format, axis, unitLabel } = indexOrPercent(yoyEnabled);
    const fileSuffix = yoyEnabled ? '-var12m' : '';

    const series = useMemo(() => (
        raw ? Object.fromEntries(Object.entries(raw).map(([key, entries]) => [key, prepare(entries)])) : null
    ), [raw, prepare]);

    if (!series) return null;

    const selectedGoods = GOODS.filter((good) => selection.includes(good.id));
    const isSingle = selectedGoods.length === 1;
    const goodsDefs = selectedGoods.map((good) => ({ key: good.key, label: good.seriesLabel, color: good.color, fill: false }));
    const goodsData = isSingle ? series[selectedGoods[0].key] : mergeSeriesByDate(
        Object.fromEntries(selectedGoods.map((good) => [good.key, series[good.key]]))
    );
    const commerceData = mergeSeriesByDate({ comercio: series.comercio, servicios: series.servicios });

    return (
        <BreakdownSection>
            <DetailPanel
                wide
                title="Producción de bienes"
                subtitle={unitLabel}
                latest={isSingle ? latestValueOf(goodsData, format) : null}
                change={isSingle ? periodChangeOf(goodsData, yoyEnabled) : null}
                legend={(
                    <Legend
                        items={GOODS.map(({ id, label, color }) => ({ id, label, color }))}
                        activeKeys={selection}
                        onToggle={(id) => setSelection((current) => toggleGoods(current, id))}
                    />
                )}
                table={() => (isSingle
                    ? buildSingleTable(goodsData, selectedGoods[0].seriesLabel, format)
                    : buildMultiTable(goodsData, goodsDefs, format))}
                onDownload={() => downloadCsv(
                    buildCsv(goodsData, isSingle ? [{ key: 'value' }] : goodsDefs),
                    `imacec-bienes${fileSuffix}.csv`
                )}
            >
                <TrendChart
                    data={goodsData}
                    color={selectedGoods[0].color}
                    height={220}
                    averageFormatter={format}
                    valueFormatter={format}
                    axisFormatter={axis}
                    theme={theme}
                    series={isSingle ? undefined : goodsDefs}
                    showAverage={isSingle}
                    detailed
                />
            </DetailPanel>
            <DetailPanel
                title="Comercio y servicios"
                subtitle={unitLabel}
                legend={<Legend items={legendItems(COMMERCE)} />}
                table={() => buildMultiTable(commerceData, COMMERCE, format)}
                onDownload={() => downloadCsv(buildCsv(commerceData, COMMERCE), `imacec-comercio-servicios${fileSuffix}.csv`)}
            >
                <TrendChart
                    data={commerceData}
                    height={190}
                    valueFormatter={format}
                    axisFormatter={axis}
                    theme={theme}
                    series={COMMERCE}
                    showAverage={false}
                    detailed
                />
            </DetailPanel>
            <DetailPanel
                title="IMACEC no minero"
                subtitle={unitLabel}
                latest={latestValueOf(series.no_minero, format)}
                change={periodChangeOf(series.no_minero, yoyEnabled)}
                table={() => buildSingleTable(series.no_minero, 'IMACEC no minero', format)}
                onDownload={() => downloadCsv(buildCsv(series.no_minero, [{ key: 'value' }]), `imacec-no-minero${fileSuffix}.csv`)}
            >
                <TrendChart
                    data={series.no_minero}
                    color="#f97316"
                    height={190}
                    averageFormatter={format}
                    valueFormatter={format}
                    axisFormatter={axis}
                    theme={theme}
                    detailed
                />
            </DetailPanel>
        </BreakdownSection>
    );
};

export default ImacecBreakdown;
