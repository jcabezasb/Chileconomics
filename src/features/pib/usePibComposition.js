import { useEffect, useMemo, useState } from 'react';
import { formatNumber } from '../../shared/utils/format';
import {
    buildGovernmentResidualSeries,
    computeSeriesStatsAtDate,
    getTrendFromHistory,
    mergeInvestmentSeries
} from '../../shared/utils/series';

const QUARTER_ORDER = ['Q1', 'Q2', 'Q3', 'Q4'];
const STATS_OPTIONS = { lag: 4, historyPoints: 4 };

const COMPONENTS = [
    { id: 'pib', key: 'total', title: 'PIB Total' },
    { id: 'consumo', key: 'consumo', title: 'Consumo Privado' },
    { id: 'inversion', key: 'inversion', title: 'Inversion (FBKF)' },
    { id: 'gasto', key: 'gasto', title: 'Gasto Gobierno' },
    { id: 'exportaciones', key: 'export', title: 'Exportaciones' },
    { id: 'importaciones', key: 'import', title: 'Importaciones' }
];

// Estadísticas de cada componente del gasto (C, I, G, X, M) en el trimestre elegido.
// La inversión suma FBKF y variación de existencias; el gasto de gobierno se completa como residuo
// cuando falta en la serie oficial.
const buildCompositionStats = (nominalSeries, selectedDate) => {
    const investment = mergeInvestmentSeries(nominalSeries.fbkfSeries, nominalSeries.existenciasSeries);
    const governmentResidual = buildGovernmentResidualSeries(
        nominalSeries.pibSeries,
        nominalSeries.consumoSeries,
        investment,
        nominalSeries.exportSeries,
        nominalSeries.importSeries
    );
    const at = (series) => computeSeriesStatsAtDate(series, selectedDate, STATS_OPTIONS);
    return {
        total: at(nominalSeries.pibSeries),
        consumo: at(nominalSeries.consumoSeries),
        inversion: at(investment),
        gasto: at(nominalSeries.gastoSeries) || at(governmentResidual),
        export: at(nominalSeries.exportSeries),
        import: at(nominalSeries.importSeries)
    };
};

// Selector de año/trimestre + composición del PIB nominal en ese trimestre.
const usePibComposition = (nominalSeries, availablePeriods) => {
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedQuarter, setSelectedQuarter] = useState('');

    const periodYears = useMemo(() => (
        Array.from(new Set(availablePeriods.map((period) => period.year)))
            .sort((a, b) => Number(b) - Number(a))
    ), [availablePeriods]);

    const periodQuarters = useMemo(() => (
        Array.from(new Set(
            availablePeriods
                .filter((period) => period.year === selectedYear)
                .map((period) => period.quarter)
        )).sort((a, b) => QUARTER_ORDER.indexOf(a) - QUARTER_ORDER.indexOf(b))
    ), [availablePeriods, selectedYear]);

    // Por defecto: el último año y su último trimestre disponible.
    useEffect(() => {
        if (periodYears.length && !periodYears.includes(selectedYear)) setSelectedYear(periodYears[0]);
    }, [periodYears, selectedYear]);
    useEffect(() => {
        if (periodQuarters.length && !periodQuarters.includes(selectedQuarter)) {
            setSelectedQuarter(periodQuarters[periodQuarters.length - 1]);
        }
    }, [periodQuarters, selectedQuarter]);

    const selectedDate = useMemo(() => (
        availablePeriods.find((period) => period.year === selectedYear && period.quarter === selectedQuarter)?.date
        || null
    ), [availablePeriods, selectedYear, selectedQuarter]);

    const stats = useMemo(
        () => (nominalSeries ? buildCompositionStats(nominalSeries, selectedDate) : null),
        [nominalSeries, selectedDate]
    );

    // Valores para el gráfico de barras apiladas (importaciones en negativo).
    const compositionData = useMemo(() => {
        if (!stats?.total) return null;
        return {
            total: stats.total.value,
            consumo: stats.consumo?.value ?? 0,
            inversion: stats.inversion?.value ?? 0,
            gasto: stats.gasto?.value ?? 0,
            export: stats.export?.value ?? 0,
            import: -Math.abs(stats.import?.value ?? 0)
        };
    }, [stats]);

    // Filas de la tabla: valor, peso en el PIB y tendencia de los últimos 4 trimestres.
    const tableRows = useMemo(() => {
        if (!compositionData) return [];
        return COMPONENTS.map(({ id, key, title }) => {
            const componentStats = stats[key];
            const value = compositionData[key];
            const history = componentStats?.history || [];
            const variation = componentStats?.variation ?? null;
            return {
                id,
                title,
                value: `${formatNumber(value, 1)} MM CLP`,
                weight: id === 'pib' ? 100 : Number(((Math.abs(value) / compositionData.total) * 100).toFixed(1)),
                history,
                variation,
                trend: getTrendFromHistory(history, variation === null || variation >= 0 ? 'up' : 'down')
            };
        });
    }, [compositionData, stats]);

    return {
        periodYears,
        periodQuarters,
        selectedYear,
        setSelectedYear,
        selectedQuarter,
        setSelectedQuarter,
        compositionData,
        tableRows
    };
};

export default usePibComposition;
