// Contenido de las ventanas de tabla de la sección regional: columnas, filas y CSV.
import { REGION_SHORT_NAME_BY_ID } from '../../shared/constants/regions';
import { formatNumber } from '../../shared/utils/format';
import { formatGrowth } from './useRegionalView';

const seriesCsv = (series) => [
    'fecha;valor',
    ...series.map(({ date, value }) => `${date};${formatNumber(value, 1)}`)
].join('\n');

const VALUE_COLUMNS = [
    { key: 'date', label: 'Fecha' },
    { key: 'value', label: 'Valor', align: 'right', emphasis: true }
];

export const pibTable = ({ chartData, selectedRegion, regionId, timeRange }) => ({
    title: `PIB Regional${selectedRegion ? ` - ${selectedRegion}` : ''}`,
    columns: VALUE_COLUMNS,
    rows: chartData.map(({ date, value }) => ({ id: date, date, value: formatNumber(value, 1) })),
    csv: seriesCsv(chartData),
    filename: `pib-regional-${regionId || 'nacional'}-${timeRange}.csv`
});

export const laborTable = ({ card, selectedRegion, regionId, timeRange }) => ({
    title: `${card.title}${selectedRegion ? ` - ${selectedRegion}` : ' Nacional'}`,
    columns: VALUE_COLUMNS,
    rows: card.chartData.map(({ date, value }) => ({ id: `${card.id}-${date}`, date, value: card.formatter(value) })),
    csv: seriesCsv(card.chartData),
    filename: `${card.id}-${regionId || 'nacional'}-${timeRange}.csv`
});

export const populationTable = ({ population, selectedRegion, regionId }) => {
    const byDate = new Map();
    ['total', 'hombres', 'mujeres'].forEach((key) => {
        (population[key] || []).forEach(({ date, value }) => {
            byDate.set(date, { ...(byDate.get(date) || { date }), [key]: value });
        });
    });
    const merged = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const fmt = (value) => (value === undefined ? '' : formatNumber(value, 1));
    return {
        title: `Poblacion${selectedRegion ? ` - ${selectedRegion}` : ' Nacional'}`,
        columns: [
            { key: 'date', label: 'Fecha' },
            { key: 'total', label: 'Total', align: 'right', emphasis: true },
            { key: 'hombres', label: 'Hombres', align: 'right' },
            { key: 'mujeres', label: 'Mujeres', align: 'right' }
        ],
        rows: merged.map((row) => ({
            id: row.date,
            date: row.date,
            total: fmt(row.total),
            hombres: fmt(row.hombres),
            mujeres: fmt(row.mujeres)
        })),
        csv: merged.length
            ? ['fecha;total;hombres;mujeres', ...merged.map((row) => `${row.date};${fmt(row.total)};${fmt(row.hombres)};${fmt(row.mujeres)}`)].join('\n')
            : '',
        filename: `poblacion-${regionId || 'nacional'}.csv`
    };
};

export const formatMillions = (value) => (
    Number.isFinite(value) ? `$${formatNumber(value / 1e6, 1)} millones` : '...'
);

export const perCapitaRankingTable = ({ rows, average }) => {
    const regionName = (row) => REGION_SHORT_NAME_BY_ID[row.regionId] || row.regionId;
    return {
        title: 'PIB per cápita por región (12 meses, pesos encadenados 2018)',
        columns: [
            { key: 'rank', label: '#' },
            { key: 'region', label: 'Región', emphasis: true },
            { key: 'value', label: 'Por habitante', align: 'right', emphasis: true },
            { key: 'ratio', label: 'vs promedio', align: 'right' },
            { key: 'growth', label: 'Var. real a/a', align: 'right' }
        ],
        rows: rows.map((row) => ({
            id: row.regionId,
            rank: row.rank,
            region: regionName(row),
            value: formatMillions(row.value),
            ratio: average ? `${formatNumber(row.value / average, 2)}×` : '',
            growth: formatGrowth(row.growth)
        })),
        csv: [
            'posicion;region;pib_per_capita_clp;veces_promedio;variacion_real_pct',
            ...rows.map((row) => [
                row.rank,
                regionName(row),
                Math.round(row.value),
                average ? formatNumber(row.value / average, 2) : '',
                Number.isFinite(row.growth) ? formatNumber(row.growth, 1) : ''
            ].join(';'))
        ].join('\n'),
        filename: 'pib-per-capita-regiones.csv'
    };
};
