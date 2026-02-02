import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const PIBComparisonChart = ({ data, theme }) => {
    // data format: { name: 'PIB Structural', total: 51880, consumo: 31000, inversion: 11000, gasto: 7000, export: 16000, import: -13120 }

    const chartData = [
        {
            name: 'PIB Total',
            value: data.total,
            type: 'total'
        },
        {
            name: 'Componentes',
            consumo: data.consumo,
            inversion: data.inversion,
            gasto: data.gasto,
            export: data.export,
            import: data.import, // Negative value
            type: 'breakdown'
        }
    ];

    const formatYAxis = (value) => {
        return `${(value / 1000).toFixed(0)}k`;
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <p style={{ fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                        {payload[0].payload.name || 'Componente'}
                    </p>
                    {payload.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem' }}>
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {new Intl.NumberFormat('es-CL').format(Math.abs(entry.value))} MM CLP
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                    barSize={60}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    />
                    <YAxis
                        tickFormatter={formatYAxis}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-card)', opacity: 0.4 }} />
                    <ReferenceLine y={0} stroke="var(--text-muted)" />

                    {/* Barra de PIB Total */}
                    <Bar dataKey="value" stackId="a" name="Total PIB">
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.type === 'total' ? 'var(--accent)' : 'transparent'} />
                        ))}
                    </Bar>

                    {/* Barra de Componentes - Stacked */}
                    <Bar dataKey="consumo" stackId="b" name="Consumo" fill="#3b82f6" />
                    <Bar dataKey="inversion" stackId="b" name="Inversion" fill="#8b5cf6" />
                    <Bar dataKey="gasto" stackId="b" name="Gasto Gob." fill="#ec4899" />
                    <Bar dataKey="export" stackId="b" name="Exportaciones" fill="#10b981" />
                    <Bar dataKey="import" stackId="b" name="Importaciones" fill="#ef4444" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PIBComparisonChart;
