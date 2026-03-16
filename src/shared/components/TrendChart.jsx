import React, { useId, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis, ReferenceLine, Tooltip } from 'recharts';
import { formatNumber } from '../utils/format';

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

const TrendChart = ({
    data,
    color = "#2563eb",
    height = 60,
    averageFormatter,
    valueFormatter,
    theme = 'dark',
    series
}) => {
    if (!data || data.length === 0) return null;

    const gradientBaseId = useId();
    const glowId = useId();
    const isDark = theme === 'dark';
    const seriesList = useMemo(() => (
        series && series.length
            ? series
            : [{ key: 'value', color, fill: true }]
    ), [series, color]);
    const fillGradientIds = useMemo(
        () => seriesList.map((_, index) => `${gradientBaseId}-fill-${index}`),
        [seriesList, gradientBaseId]
    );
    const primaryKey = seriesList[0].key;
    const seriesAverages = useMemo(() => (
        seriesList.map((entry) => {
            const valuesForSeries = data
                .map((item) => Number(item[entry.key]))
                .filter((value) => !Number.isNaN(value));
            const sum = valuesForSeries.reduce((acc, value) => acc + value, 0);
            const average = valuesForSeries.length ? sum / valuesForSeries.length : 0;
            return { key: entry.key, average, color: entry.color || color };
        })
    ), [data, seriesList, color]);
    const average = seriesAverages[0]?.average || 0;
    const values = useMemo(() => (
        data
            .flatMap((item) => seriesList.map((entry) => Number(item[entry.key])))
            .filter((value) => !Number.isNaN(value))
    ), [data, seriesList]);
    const chartDomain = useMemo(() => {
        const minValue = values.length ? Math.min(...values) : 0;
        const maxValue = values.length ? Math.max(...values) : 0;
        const range = maxValue - minValue;
        const padding = range === 0 ? Math.abs(maxValue || 1) * 0.05 : range * 0.12;
        return [minValue - padding, maxValue + padding];
    }, [values]);
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
    const longestAverageLabel = seriesList.length > 1
        ? averageLabelBySeries.reduce((acc, label) => (label.length > acc.length ? label : acc), '')
        : averageLabel;
    const averageLabelWidth = Math.max(longestAverageLabel.length, 1) * 7;
    const labelRightOffset = 8;
    const rightMargin = Math.max(42, averageLabelWidth + labelRightOffset + 10);
    const animateChart = true;
    const renderTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        const point = payload[0]?.payload || {};
        const formattedValue = valueFormatter ? valueFormatter(point[primaryKey]) : averageLabel;
        const dateLabel = formatTooltipDate(point.date, label);
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
                {seriesList.length > 1 ? (
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

    return (
        <div
            className="trend-chart"
            style={{ width: '100%', height: height, marginTop: '1rem', display: 'flex', alignItems: 'stretch' }}
        >
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ right: rightMargin }}>
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
                        <YAxis hide domain={chartDomain} />
                        {seriesList.length > 1 ? (
                            seriesAverages.map((entry) => (
                                <ReferenceLine
                                    key={`avg-${entry.key}`}
                                    y={entry.average}
                                    stroke={entry.color}
                                    strokeOpacity={isDark ? 0.75 : 0.5}
                                    strokeWidth={1.5}
                                    strokeDasharray="4 3"
                                />
                            ))
                        ) : (
                            <ReferenceLine
                                y={average}
                                stroke={seriesList[0]?.color || (isDark ? "#ffffff" : "#0b1220")}
                                strokeOpacity={isDark ? 0.85 : 0.45}
                                strokeWidth={1.5}
                                strokeDasharray="4 3"
                            />
                        )}
                        <Tooltip content={renderTooltip} cursor={{ stroke: 'transparent' }} />
                        {seriesList.map((entry, index) => (
                            <Area
                                key={entry.key}
                                type="monotone"
                                dataKey={entry.key}
                                stroke={entry.color || color}
                                fillOpacity={entry.fill ? 1 : 0}
                                fill={entry.fill ? `url(#${fillGradientIds[index]})` : 'transparent'}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                dot={false}
                                activeDot={false}
                                connectNulls
                                filter={isDark ? `url(#${glowId})` : "none"}
                                isAnimationActive={animateChart}
                                animationDuration={400}
                                animationEasing="ease-out"
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
                {seriesList.length === 1 ? (
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
