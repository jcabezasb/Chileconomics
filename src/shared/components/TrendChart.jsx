import React, { useId, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip } from 'recharts';
import { formatNumber } from '../utils/format';
import { downsampleLTTB, downsampleStride } from '../utils/downsample';
import '../../styles/dataTable.css';

const monthShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const formatTooltipDate = (date, fallback) => {
    if (!date) return fallback || '';
    const parts = date.split('-');
    if (parts.length < 2) return fallback || date;
    const year = parts[0];
    const month = Number(parts[1]);
    const day = parts[2] ? Number(parts[2]) : null;
    const mon = monthShort[month - 1] || '';
    if (day) return `${String(day).padStart(2, '0')}-${mon} ${year}`;
    return `${mon} ${year}`;
};

// Ejes "redondos" (0, 5, 10...) en vez de los extremos exactos de la serie.
const buildNiceTicks = (min, max, count = 4) => {
    let low = min;
    let high = max;
    if (low === high) {
        low -= Math.abs(low || 1) * 0.05;
        high += Math.abs(high || 1) * 0.05;
    }
    const rough = (high - low) / Math.max(count - 1, 1);
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / magnitude;
    const niceFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    const step = niceFactor * magnitude;
    const start = Math.floor(low / step) * step;
    const end = Math.ceil(high / step) * step;
    const ticks = [];
    for (let value = start; value <= end + step / 2; value += step) {
        ticks.push(Number(value.toFixed(10)));
    }
    return { ticks, step };
};

// Fechas del eje X: años si el rango es largo, "mes año" si es corto.
const buildDateTicks = (data, count = 5) => {
    const dates = data.map((item) => item.date).filter(Boolean);
    if (dates.length < 2) return { ticks: dates, format: (value) => value };
    const first = dates[0];
    const last = dates[dates.length - 1];
    const spanYears = Number(last.slice(0, 4)) - Number(first.slice(0, 4));
    const formatDate = (value) => {
        if (!value) return '';
        const year = value.slice(0, 4);
        const month = monthShort[Number(value.slice(5, 7)) - 1] || '';
        return spanYears >= 4 ? year : `${month} ${year.slice(2)}`;
    };
    const ticks = [];
    const seen = new Set();
    for (let i = 0; i < count; i += 1) {
        const index = Math.round((i * (dates.length - 1)) / (count - 1));
        const label = formatDate(dates[index]);
        if (!seen.has(label)) {
            seen.add(label);
            ticks.push(dates[index]);
        }
    }
    return { ticks, format: formatDate };
};

const TrendChart = ({
    data,
    color = "#2563eb",
    height = 60,
    averageFormatter,
    valueFormatter,
    theme = 'dark',
    series,
    detailed = false,
    showAverage = true,
    axisFormatter,
    referenceLines = [],
    maxPoints
}) => {
    const safeData = useMemo(() => data || [], [data]);
    const gradientBaseId = useId();
    const glowId = useId();
    const isDark = theme === 'dark';
    const seriesList = useMemo(() => (
        series && series.length
            ? series
            : [{ key: 'value', color, fill: true }]
    ), [series, color]);
    const isMulti = seriesList.length > 1;
    const fillGradientIds = useMemo(
        () => seriesList.map((_, index) => `${gradientBaseId}-fill-${index}`),
        [seriesList, gradientBaseId]
    );
    const primaryKey = seriesList[0].key;
    // Una pantalla no muestra más de ~1 punto por píxel: dibujar 16.000 puntos solo hace lento el gráfico.
    const pointLimit = maxPoints ?? (detailed ? 600 : 250);
    const plotData = useMemo(() => (
        isMulti ? downsampleStride(safeData, pointLimit) : downsampleLTTB(safeData, pointLimit, primaryKey)
    ), [safeData, pointLimit, isMulti, primaryKey]);
    const seriesAverages = useMemo(() => (
        seriesList.map((entry) => {
            const valuesForSeries = safeData
                .map((item) => Number(item[entry.key]))
                .filter((value) => !Number.isNaN(value));
            const sum = valuesForSeries.reduce((acc, value) => acc + value, 0);
            const average = valuesForSeries.length ? sum / valuesForSeries.length : 0;
            return { key: entry.key, average, color: entry.color || color };
        })
    ), [safeData, seriesList, color]);
    const average = seriesAverages[0]?.average || 0;
    const values = useMemo(() => (
        safeData
            .flatMap((item) => seriesList.map((entry) => Number(item[entry.key])))
            .filter((value) => !Number.isNaN(value))
    ), [safeData, seriesList]);
    const chartDomain = useMemo(() => {
        const minValue = values.length ? Math.min(...values) : 0;
        const maxValue = values.length ? Math.max(...values) : 0;
        const range = maxValue - minValue;
        const padding = range === 0 ? Math.abs(maxValue || 1) * 0.05 : range * 0.12;
        return [minValue - padding, maxValue + padding];
    }, [values]);
    const yAxis = useMemo(() => {
        if (!detailed || !values.length) return null;
        const refValues = referenceLines.map((line) => line.y);
        const { ticks, step } = buildNiceTicks(
            Math.min(...values, ...refValues),
            Math.max(...values, ...refValues),
            4
        );
        const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
        return { ticks, decimals, domain: [ticks[0], ticks[ticks.length - 1]] };
    }, [detailed, values, referenceLines]);
    const xAxis = useMemo(() => (detailed ? buildDateTicks(plotData) : null), [detailed, plotData]);
    const averageLabel = useMemo(() => (
        averageFormatter
            ? averageFormatter(average)
            : formatNumber(average, 1)
    ), [average, averageFormatter]);
    const averageLabelBySeries = useMemo(() => (
        seriesAverages.map((entry) => (
            averageFormatter
                ? averageFormatter(entry.average)
                : formatNumber(entry.average, 1)
        ))
    ), [seriesAverages, averageFormatter]);

    if (!safeData.length) return null;

    const longestAverageLabel = isMulti
        ? averageLabelBySeries.reduce((acc, label) => (label.length > acc.length ? label : acc), '')
        : averageLabel;
    const averageLabelWidth = Math.max(longestAverageLabel.length, 1) * 7;
    const labelRightOffset = 8;
    const rightMargin = detailed
        ? (showAverage ? averageLabelWidth + 14 : 12)
        : Math.max(42, averageLabelWidth + labelRightOffset + 10);
    const animateChart = true;
    const formatAxisTick = (value) => (
        axisFormatter
            ? axisFormatter(value, yAxis?.decimals ?? 0)
            : formatNumber(value, yAxis?.decimals ?? 0)
    );

    const renderTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        const point = payload[0]?.payload || {};
        const formattedValue = valueFormatter ? valueFormatter(point[primaryKey]) : averageLabel;
        const dateLabel = formatTooltipDate(point.date, label);
        if (detailed) {
            return (
                <div className="trend-tooltip">
                    <div className="trend-tooltip-date">{dateLabel}</div>
                    {isMulti ? (
                        seriesList.map((entry) => (
                            <div key={entry.key} className="trend-tooltip-row">
                                <span className="trend-tooltip-dot" style={{ background: entry.color || color }} />
                                <span className="trend-tooltip-label">{entry.label || entry.key}</span>
                                <span className="trend-tooltip-value">
                                    {valueFormatter ? valueFormatter(point[entry.key]) : point[entry.key]}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="trend-tooltip-main">{formattedValue}</div>
                    )}
                </div>
            );
        }
        return (
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.5rem 0.6rem',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-md)',
                fontSize: '0.75rem'
            }}>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{formattedValue}</div>
                {isMulti ? (
                    <div style={{ display: 'grid', gap: '0.2rem' }}>
                        {seriesList.map((entry) => (
                            <div key={entry.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{entry.label || entry.key}</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                    {valueFormatter ? valueFormatter(point[entry.key]) : averageLabel}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : null}
                <div style={{ color: 'var(--text-secondary)' }}>{dateLabel}</div>
            </div>
        );
    };

    const axisTick = { fontSize: 11, fill: 'var(--text-secondary)' };

    return (
        <div
            className={`trend-chart${detailed ? ' trend-chart--detailed' : ''}`}
            style={{ width: '100%', height: height, marginTop: detailed ? 0 : '1rem', display: 'flex', alignItems: 'stretch' }}
        >
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={plotData}
                        margin={detailed ? { top: 8, right: rightMargin, bottom: 0, left: 0 } : { right: rightMargin }}
                    >
                        <defs>
                            {seriesList.map((entry, index) => (
                                <linearGradient key={entry.key} id={fillGradientIds[index]} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={entry.color || color} stopOpacity={isDark ? (entry.fillOpacity ?? 0.22) : 0.08} />
                                    <stop offset="95%" stopColor={entry.color || color} stopOpacity={0.01} />
                                </linearGradient>
                            ))}
                            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={color} floodOpacity="0.45" />
                                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={color} floodOpacity="0.18" />
                            </filter>
                        </defs>
                        {detailed ? (
                            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                        ) : null}
                        {detailed ? (
                            <XAxis
                                dataKey="date"
                                ticks={xAxis.ticks}
                                tickFormatter={xAxis.format}
                                tick={axisTick}
                                tickLine={false}
                                axisLine={{ stroke: 'var(--border)' }}
                                interval={0}
                                minTickGap={8}
                                tickMargin={8}
                                padding={{ left: 4, right: 4 }}
                            />
                        ) : null}
                        {detailed ? (
                            <YAxis
                                domain={yAxis.domain}
                                ticks={yAxis.ticks}
                                tickFormatter={formatAxisTick}
                                tick={axisTick}
                                tickLine={false}
                                axisLine={false}
                                width={52}
                                allowDataOverflow
                            />
                        ) : (
                            <YAxis hide domain={chartDomain} />
                        )}
                        {referenceLines.map((line) => (
                            <ReferenceLine
                                key={`ref-${line.y}`}
                                y={line.y}
                                stroke="var(--text-secondary)"
                                strokeOpacity={0.6}
                                strokeDasharray="6 4"
                                label={{ value: line.label, position: 'insideTopLeft', fill: 'var(--text-secondary)', fontSize: 11 }}
                            />
                        ))}
                        {showAverage ? (
                            isMulti ? (
                                seriesAverages.map((entry, index) => (
                                    <ReferenceLine
                                        key={`avg-${entry.key}`}
                                        y={entry.average}
                                        stroke={entry.color}
                                        strokeOpacity={isDark ? 0.75 : 0.5}
                                        strokeWidth={1.5}
                                        strokeDasharray="4 3"
                                        label={detailed ? { value: averageLabelBySeries[index], position: 'right', fill: entry.color, fontSize: 11, fontWeight: 700 } : undefined}
                                    />
                                ))
                            ) : (
                                <ReferenceLine
                                    y={average}
                                    stroke={seriesList[0]?.color || (isDark ? "#ffffff" : "#0b1220")}
                                    strokeOpacity={isDark ? 0.85 : 0.45}
                                    strokeWidth={1.5}
                                    strokeDasharray="4 3"
                                    label={detailed ? { value: averageLabel, position: 'right', fill: seriesList[0]?.color || color, fontSize: 11, fontWeight: 700 } : undefined}
                                />
                            )
                        ) : null}
                        <Tooltip
                            content={renderTooltip}
                            cursor={detailed ? { stroke: 'var(--text-secondary)', strokeOpacity: 0.5, strokeDasharray: '3 3' } : { stroke: 'transparent' }}
                            isAnimationActive={false}
                        />
                        {seriesList.map((entry, index) => (
                            <Area
                                key={entry.key}
                                type="monotone"
                                dataKey={entry.key}
                                name={entry.label || entry.key}
                                stroke={entry.color || color}
                                fillOpacity={entry.fill ? 1 : 0}
                                fill={entry.fill ? `url(#${fillGradientIds[index]})` : 'transparent'}
                                strokeWidth={entry.strokeWidth ?? 2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                dot={false}
                                activeDot={detailed ? { r: 4, fill: entry.color || color, stroke: 'var(--bg-card)', strokeWidth: 2 } : false}
                                connectNulls
                                filter={isDark ? `url(#${glowId})` : "none"}
                                isAnimationActive={animateChart}
                                animationDuration={400}
                                animationEasing="ease-out"
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
                {detailed || !showAverage ? null : !isMulti ? (
                    <div
                        style={{
                            position: 'absolute',
                            right: labelRightOffset,
                            top: `${((chartDomain[1] - average) / (chartDomain[1] - chartDomain[0])) * 100}%`,
                            transform: 'translateY(-50%)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: seriesList[0]?.color || 'var(--text-secondary)',
                            pointerEvents: 'none',
                            background: 'transparent'
                        }}
                    >
                        {averageLabel}
                    </div>
                ) : (
                    seriesAverages.map((entry) => (
                        <div
                            key={`avg-label-${entry.key}`}
                            style={{
                                position: 'absolute',
                                right: labelRightOffset,
                                top: `${((chartDomain[1] - entry.average) / (chartDomain[1] - chartDomain[0])) * 100}%`,
                                transform: 'translateY(-50%)',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: entry.color,
                                pointerEvents: 'none',
                                background: 'transparent'
                            }}
                        >
                            {averageLabelBySeries.find((label, index) => seriesAverages[index]?.key === entry.key) || ''}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default React.memo(TrendChart);
