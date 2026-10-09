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
    const prepare = useCallback(
        (series) => applyRange(yoyEnabled ? buildYoYSeries(series) : series),
        [applyRange, yoyEnabled]
    );

    const yoySeries = useMemo(() => (allowYoY ? buildYoYSeries(chartData) : []), [allowYoY, chartData]);
    const displayData = useMemo(
        () => applyRange(yoyEnabled ? yoySeries : chartData),
        [applyRange, yoyEnabled, yoySeries, chartData]
    );

    return {
        chartData,
        displayData,
        timeRange,
        setTimeRange,
        customRange,
        setCustomRange,
        showYoY,
        setShowYoY,
        yoyEnabled,
        prepare
    };
};

export default useIndicatorSeries;
