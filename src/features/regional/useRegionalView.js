import { useMemo, useState } from 'react';
import { REGION_ID_BY_NAME } from '../../shared/constants/regions';
import { formatNumber, formatQuarterLabel, formatShortDate } from '../../shared/utils/format';
import { getTrendFromHistory } from '../../shared/utils/series';
import { buildAnnualPerCapita, buildLatestPerCapita, buildRegionalPerCapitaRanking } from '../../shared/utils/perCapita';

// Cuántos puntos muestra cada rango: trimestres para el PIB, meses para el empleo.
const PIB_POINTS = { '1a': 4, '2a': 8, '5a': 20, all: null };
const LABOR_POINTS = { '1a': 12, '2a': 24, '5a': 60, all: null };

const takeLast = (series, count) => (count ? series.slice(-count) : series);
const scale = (series, factor) => series.map((entry) => ({ ...entry, value: entry.value * factor }));
export const formatGrowth = (value) => (
    Number.isFinite(value) ? `${value > 0 ? '+' : ''}${formatNumber(value, 1)}%` : ''
);
// Igual que formatGrowth pero con '+' también para 0 (formato histórico de la tarjeta regional).
const percentLabel = (value) => `${value >= 0 ? '+' : ''}${formatNumber(value, 1)}%`;
const yoyQuarterly = (series) => {
    if (series.length < 5) return null;
    const previous = series[series.length - 5].value;
    return previous ? ((series[series.length - 1].value - previous) / previous) * 100 : null;
};
const edgeLabel = (entry) => formatQuarterLabel(entry?.date) || formatShortDate(entry?.date);

// Empleo nacional = suma de las regiones (fuerza de trabajo y ocupados, en miles de personas).
const buildNationalLabor = (regionalData) => {
    const sumByDate = (field) => {
        const totals = new Map();
        Object.values(regionalData).forEach((region) => {
            (region?.labor?.[field] || []).forEach(({ date, value }) => {
                totals.set(date, (totals.get(date) || 0) + value);
            });
        });
        return Array.from(totals, ([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
    };
    const ftr = sumByDate('ftr');
    const ocu = sumByDate('ocu');
    const ocuByDate = new Map(ocu.map((entry) => [entry.date, entry.value]));
    const des = ftr
        .map(({ date, value }) => {
            const employed = ocuByDate.get(date);
            return employed && value ? { date, value: (1 - employed / value) * 100 } : null;
        })
        .filter(Boolean);
    return { ftr, ocu, des };
};

const LABOR_CARDS = [
    { id: 'labor-ftr', field: 'ftr', title: 'Fuerza de trabajo', color: '#38bdf8', unit: 'personas', thousands: true },
    { id: 'labor-ocu', field: 'ocu', title: 'Ocupados', color: '#22c55e', unit: 'personas', thousands: true },
    { id: 'labor-des', field: 'des', title: 'Tasa de desocupacion', color: '#facc15', unit: '%', thousands: false }
];

const useRegionalView = ({ regionalData, realPibData, populationData }) => {
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [timeRange, setTimeRange] = useState('1a');
    const [mapMode, setMapMode] = useState('regions');

    const regionId = selectedRegion ? REGION_ID_BY_NAME[selectedRegion] : null;
    const region = regionId ? regionalData[regionId] : null;
    const toggleRegion = (name) => setSelectedRegion((current) => (current === name ? null : name));

    // PIB real: región elegida o nacional.
    const pib = useMemo(() => {
        const raw = region ? region.pib?.history || [] : realPibData;
        const chartData = takeLast(raw, PIB_POINTS[timeRange]);
        let headline;
        if (region?.pib) {
            const { value, variation, history } = region.pib;
            headline = {
                value: `${formatNumber(value, 1)} MM CLP`,
                variation: variation === null ? '' : percentLabel(variation),
                trend: getTrendFromHistory(history.map((entry) => entry.value), variation === null || variation >= 0 ? 'up' : 'down')
            };
        } else {
            const yoy = yoyQuarterly(realPibData);
            headline = {
                value: realPibData.length ? `${formatNumber(realPibData[realPibData.length - 1].value, 1)} MM` : '...',
                variation: formatGrowth(yoy),
                trend: (yoy ?? 0) >= 0 ? 'up' : 'down'
            };
        }
        return {
            ...headline,
            chartData,
            startLabel: edgeLabel(chartData[0]),
            endLabel: edgeLabel(chartData[chartData.length - 1])
        };
    }, [region, realPibData, timeRange]);

    const population = region ? region.pob : populationData || { total: [], hombres: [], mujeres: [] };

    const nationalLabor = useMemo(() => buildNationalLabor(regionalData), [regionalData]);
    const laborCards = useMemo(() => LABOR_CARDS.map((card) => {
        const raw = (region ? region.labor?.[card.field] : nationalLabor[card.field]) || [];
        const series = card.thousands ? scale(raw, 1000) : raw;
        const decimals = card.thousands ? 0 : 1;
        return {
            ...card,
            series,
            chartData: takeLast(series, LABOR_POINTS[timeRange]),
            valueFormatter: (value) => formatNumber(value, decimals),
            averageFormatter: (value) => formatNumber(value, decimals),
            formatter: (value) => (card.thousands ? `${formatNumber(value, 0)} personas` : `${formatNumber(value, 1)}%`)
        };
    }), [region, nationalLabor, timeRange]);

    // PIB per cápita: ranking de regiones, valor nacional y serie anual de la vista actual.
    const perCapitaRanking = useMemo(() => buildRegionalPerCapitaRanking(regionalData), [regionalData]);
    const nationalPerCapita = useMemo(
        () => buildLatestPerCapita(realPibData, populationData?.total),
        [realPibData, populationData]
    );
    const perCapitaHistory = useMemo(() => (
        region
            ? buildAnnualPerCapita(region.pib?.history, region.pob?.total)
            : buildAnnualPerCapita(realPibData, populationData?.total)
    ), [region, realPibData, populationData]);
    const choropleth = useMemo(() => {
        if (mapMode !== 'percapita' || !perCapitaRanking.rows.length) return null;
        return {
            values: Object.fromEntries(perCapitaRanking.rows.map((row) => [row.regionId, row.value])),
            getId: (name) => REGION_ID_BY_NAME[name]
        };
    }, [mapMode, perCapitaRanking]);

    return {
        selectedRegion,
        regionId,
        toggleRegion,
        timeRange,
        setTimeRange,
        mapMode,
        setMapMode,
        pib,
        population,
        laborCards,
        perCapita: {
            ranking: perCapitaRanking,
            selected: regionId ? perCapitaRanking.byId[regionId] : nationalPerCapita,
            history: perCapitaHistory,
            extremes: perCapitaRanking.rows.length
                ? { max: perCapitaRanking.rows[0], min: perCapitaRanking.rows[perCapitaRanking.rows.length - 1] }
                : null
        },
        choropleth
    };
};

export default useRegionalView;
