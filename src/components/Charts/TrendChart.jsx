import React, { useId } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis, ReferenceLine, Tooltip } from 'recharts';

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

    const gradientId = useId();
    const glowId = useId();
    const isDark = theme === 'dark';
    const seriesList = series && series.length
        ? series
        : [{ key: 'value', color }];
    const primaryKey = seriesList[0].key;
    const average = data.reduce((acc, item) => acc + (Number(item[primaryKey]) || 0), 0) / data.length;
    const values = data
        .flatMap((item) => seriesList.map((entry) => Number(item[entry.key])))
        .filter((value) => !Number.isNaN(value));
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 0;
    const range = maxValue - minValue;
    const padding = range === 0 ? Math.abs(maxValue || 1) * 0.05 : range * 0.12;
    const chartDomain = [minValue - padding, maxValue + padding];
    const averageLabel = averageFormatter
        ? averageFormatter(average)
        : new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(average);
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
                    <AreaChart data={data} margin={{ right: 42 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={isDark ? 0.3 : 0.08} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                            </linearGradient>
                            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={color} floodOpacity="0.45" />
                                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={color} floodOpacity="0.18" />
                            </filter>
                        </defs>
                        <YAxis hide domain={chartDomain} />
                        <ReferenceLine
                            y={average}
                            stroke={isDark ? "#ffffff" : "#0b1220"}
                            strokeOpacity={isDark ? 0.85 : 0.3}
                            strokeWidth={1.5}
                            strokeDasharray="4 3"
                        />
                        <Tooltip content={renderTooltip} cursor={{ stroke: 'transparent' }} />
                        {seriesList.map((entry, index) => (
                            <Area
                                key={entry.key}
                                type="monotone"
                                dataKey={entry.key}
                                stroke={entry.color || color}
                                fillOpacity={index === 0 ? 1 : 0}
                                fill={index === 0 ? `url(#${gradientId})` : 'transparent'}
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
                <div
                    style={{
                        position: 'absolute',
                        right: 6,
                        top: `${((chartDomain[1] - average) / (chartDomain[1] - chartDomain[0])) * 100}%`,
                        transform: 'translateY(-50%)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        pointerEvents: 'none',
                        background: 'transparent'
                    }}
                >
                    {averageLabel}
                </div>
            </div>
        </div>
    );
};

export default TrendChart;
