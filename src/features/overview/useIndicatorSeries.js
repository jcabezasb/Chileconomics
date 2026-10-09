import { useCallback, useEffect, useMemo, useState } from 'react';
import { getChartData } from '../../data/bcch/indicators';
import { buildYoYSeries, filterByRange } from '../../shared/utils/dates';
import { DEFAULT_RANGE, YOY_ELIGIBLE } from './indicatorFormat';

// Serie principal de un indicador + rango de fechas elegido + (opcional) variación en 12 meses.
// `prepare(serie)` aplica la misma unidad y rango a cualquier otra serie (desgloses).
const useIndicatorSeries = (indicatorId, { allowYoY = false } = {}) => {
    const [chartData, setChartData] = useState([]);
    const [timeRange, setTimeRange] = useState(DEFAULT_RANGE);
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [showYoY, setShowYoY] = useState(false);

    useEffect(() => {
        let isActive = true;
        setTimeRange(DEFAULT_RANGE);
        setCustomRange({ start: '', end: '' });
        setShowYoY(false);
        getChartData(indicatorId).then((data) => {
            if (isActive) setChartData(data);
        });
        return () => {
            isActive = false;
        };
    }, [indicatorId]);

    const yoyEnabled = allowYoY && showYoY && YOY_ELIGIBLE.has(indicatorId);

    const applyRange = useCallback(
        (series) => filterByRange(series, timeRange, customRange),
        [timeRange, customRange]
    );
    // Misma unidad que el gráfico (nivel o variación en 12 meses), sin recortar al rango.
    const transform = useCallback(
        (series) => (yoyEnabled ? buildYoYSeries(series) : series),
        [yoyEnabled]
    );
    const prepare = useCallback((series) => applyRange(transform(series)), [applyRange, transform]);

    const yoySeries = useMemo(() => (allowYoY ? buildYoYSeries(chartData) : []), [allowYoY, chartData]);
    const fullData = yoyEnabled ? yoySeries : chartData;
    const displayData = useMemo(() => applyRange(fullData), [applyRange, fullData]);
    // Fechas visibles: las tablas calculan variaciones con toda la serie y muestran solo este tramo.
    const range = useMemo(() => (
        displayData.length ? { start: displayData[0].date, end: displayData[displayData.length - 1].date } : null
    ), [displayData]);

    return {
        chartData,
        fullData,
        displayData,
        range,
        timeRange,
        setTimeRange,
        customRange,
        setCustomRange,
        showYoY,
        setShowYoY,
        yoyEnabled,
        transform,
        prepare
    };
};

export default useIndicatorSeries;
