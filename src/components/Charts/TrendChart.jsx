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

const TrendChart = ({ data, color = "#2563eb", height = 60, averageFormatter, valueFormatter }) => {
    if (!data || data.length === 0) return null;

    const gradientId = useId();
    const glowId = useId();
    const average = data.reduce((acc, item) => acc + (Number(item.value) || 0), 0) / data.length;
    const values = data.map((item) => Number(item.value)).filter((value) => !Number.isNaN(value));
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 0;
    const range = maxValue - minValue;
    const padding = range === 0 ? Math.abs(maxValue || 1) * 0.05 : range * 0.12;
    const chartDomain = [minValue - padding, maxValue + padding];
    const averageLabel = averageFormatter
        ? averageFormatter(average)
        : new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(average);
    const renderTooltip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        const point = payload[0]?.payload || {};
        const formattedValue = valueFormatter ? valueFormatter(point.value) : averageLabel;
        const dateLabel = formatTooltipDate(point.date, label);
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.5rem 0.6rem',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-md)',
                fontSize: '0.75rem'
            }}>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{formattedValue}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{dateLabel}</div>
            </div>
        );
    };

    return (
        <div style={{ width: '100%', height: height, marginTop: '1rem', display: 'flex', alignItems: 'stretch' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                            </linearGradient>
                            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={color} floodOpacity="0.45" />
                                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={color} floodOpacity="0.18" />
                            </filter>
                        </defs>
                        <YAxis hide domain={chartDomain} />
                        <ReferenceLine
                            y={average}
                            stroke="#ffffff"
                            strokeOpacity={0.7}
                            strokeDasharray="4 4"
                        />
                        <Tooltip content={renderTooltip} cursor={{ stroke: 'transparent' }} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            fillOpacity={1}
                            fill={`url(#${gradientId})`}
                            strokeWidth={2.4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            dot={false}
                            activeDot={false}
                            connectNulls
                            filter={`url(#${glowId})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div style={{ width: '52px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.85)' }}>{averageLabel}</span>
            </div>
        </div>
    );
};

export default TrendChart;
