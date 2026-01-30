import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

const TrendChart = ({ data, color = "#2563eb", height = 60 }) => {
    if (!data || data.length === 0) return null;

    // Neon Purple constant
    const NEON_PURPLE = "#d946ef"; // Fuchsia 500 equivalent

    return (
        <div style={{ width: '100%', height: height, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`colorGradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={NEON_PURPLE} stopOpacity={0.5} />
                            <stop offset="95%" stopColor={NEON_PURPLE} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <YAxis hide domain={['auto', 'auto']} />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        fillOpacity={1}
                        fill={`url(#colorGradient-${color})`}
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
