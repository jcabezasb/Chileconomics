// Contenido de las ventanas de tabla de la sección regional.
// Las series de tiempo usan SeriesTable con la serie completa (no solo el rango del gráfico).
import { REGION_SHORT_NAME_BY_ID } from '../../shared/constants/regions';
import { formatNumber } from '../../shared/utils/format';
import { formatGrowth } from './useRegionalView';

const placeName = (selectedRegion) => selectedRegion || 'Chile';

export const pibTable = ({ pib, selectedRegion, regionId }) => ({
    title: `PIB real · ${placeName(selectedRegion)}`,
    subtitle: 'Miles de millones de pesos encadenados (referencia 2018). Al agrupar por año se suman los trimestres.',
    series: {
        data: pib.raw,
        columns: [{ key: 'value', label: 'PIB real', format: (value) => `${formatNumber(value, 1)} MM` }],
        aggregate: 'sum',
        filename: `pib-regional-${regionId || 'nacional'}.csv`
    }
});

export const laborTable = ({ card, selectedRegion, regionId }) => ({
    title: `${card.title} · ${placeName(selectedRegion)}`,
    subtitle: 'Encuesta Nacional de Empleo (INE), trimestres móviles. Al agrupar se promedian los meses.',
    series: {
        data: card.series,
        columns: [{ key: 'value', label: card.title, format: card.formatter }],
        percentUnit: !card.thousands,
        filename: `${card.id}-${regionId || 'nacional'}.csv`
    }
});

export const populationTable = ({ population, selectedRegion, regionId }) => {
    const byDate = new Map();
    ['total', 'hombres', 'mujeres'].forEach((key) => {
        (population[key] || []).forEach(({ date, value }) => {
            byDate.set(date, { ...(byDate.get(date) || { date }), [key]: value });
        });
    });
    const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const lastYear = data.length ? data[data.length - 1].date.slice(0, 4) : '';
    const persons = (value) => formatNumber(value, 0);
    return {
        title: `Población · ${placeName(selectedRegion)}`,
        subtitle: `INE. Incluye proyecciones hasta ${lastYear}.`,
        series: {
            data,
            columns: [
                { key: 'total', label: 'Total', format: persons },
                { key: 'hombres', label: 'Hombres', color: '#3b82f6', format: persons },
                { key: 'mujeres', label: 'Mujeres', color: '#ec4899', format: persons }
            ],
            filename: `poblacion-${regionId || 'nacional'}.csv`
        }
    };
};

export const formatMillions = (value) => (
    Number.isFinite(value) ? `$${formatNumber(value / 1e6, 1)} millones` : '...'
);

export const perCapitaRankingTable = ({ rows, average }) => {
    const regionName = (row) => REGION_SHORT_NAME_BY_ID[row.regionId] || row.regionId;
    return {
        title: 'PIB per cápita por región',
        subtitle: 'Últimos 12 meses, pesos encadenados (referencia 2018) por habitante.',
        ranking: {
            columns: [
                { key: 'rank', label: '#', width: '36px' },
                { key: 'region', label: 'Región', emphasis: true, width: 'minmax(0, 1.3fr)' },
                { key: 'value', label: 'Por habitante', align: 'right', emphasis: true, bar: 'share', width: 'minmax(0, 1.6fr)' },
                { key: 'ratio', label: 'vs promedio', align: 'right' },
                { key: 'growth', label: 'Var. real a/a', align: 'right' }
            ],
            rows: rows.map((row) => ({
                id: row.regionId,
                rank: row.rank,
                region: regionName(row),
                value: formatMillions(row.value),
                share: rows.length ? row.value / rows[0].value : null,
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
        }
    };
};
