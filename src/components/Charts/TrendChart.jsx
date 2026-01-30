import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';

const TrendChart = ({ data, color = "#2563eb", height = 60 }) => {
    if (!data || data.length === 0) return null;

    return (
        <div style={{ width: '100%', height: height, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <YAxis hide domain={['auto', 'auto']} />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#a855f7"
                        fillOpacity={1}
                        fill="url(#purpleGradient)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
