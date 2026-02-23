import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const PIBComparisonChart = ({ data, theme }) => {
    // data format: { name: 'PIB Structural', total: 51880, consumo: 31000, inversion: 11000, gasto: 7000, export: 16000, import: -13120 }

    // Premium Color Palette
    const colors = {
        consumo: '#00E5FF',
        inversion: '#7C4DFF',
        gasto: '#00FF85',
        export: '#FFD600',
        import: '#FF3D71'
    };

    const normalizeEntry = (entry) => {
        const importValue = entry.import < 0 ? entry.import : -Math.abs(entry.import || 0);
        return {
            name: entry.name || 'Estructura',
            consumo: entry.consumo,
            inversion: entry.inversion,
            gasto: entry.gasto,
            export: entry.export,
            import: importValue
        };
    };

    const chartData = Array.isArray(data)
        ? data.map(normalizeEntry)
        : [normalizeEntry(data)];

    const barSize = chartData.length > 1
        ? Math.max(28, Math.min(70, Math.round(320 / chartData.length)))
        : 120;

    const glowStyle = () => ({});

    const formatYAxis = (value) => {
        return `${(value / 1000).toFixed(1)}k`;
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '240px'
                }}>
                    <p style={{ fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                        Composicion
                    </p>
                    {payload.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {new Intl.NumberFormat('es-CL', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                }).format(Math.abs(entry.value))} MM CLP
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '340px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    barSize={barSize}
                    stackOffset="sign"
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 700 }}
                        dy={10}
                    />
                    <YAxis
                        tickFormatter={formatYAxis}
                        axisLine={false}
                        tickLine={false}
                        width={36}
                        tickMargin={0}
                        domain={['auto', 'auto']} // Allows negative values to be shown
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11, dx: -12 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={2} />

                    {/* Components - Recharts stacks positives on top and negatives on bottom automatically */}
                    <Bar dataKey="consumo" stackId="pib" name="Consumo" fill={colors.consumo} stroke={colors.consumo} strokeWidth={0.8} style={glowStyle(colors.consumo)} />
                    <Bar dataKey="inversion" stackId="pib" name="Inversion" fill={colors.inversion} stroke={colors.inversion} strokeWidth={0.8} style={glowStyle(colors.inversion)} />
                    <Bar dataKey="gasto" stackId="pib" name="Gasto Gob." fill={colors.gasto} stroke={colors.gasto} strokeWidth={0.8} style={glowStyle(colors.gasto)} />
                    <Bar dataKey="export" stackId="pib" name="Exportaciones" fill={colors.export} stroke={colors.export} strokeWidth={0.8} style={glowStyle(colors.export)} />
                    <Bar dataKey="import" stackId="pib" name="Importaciones" fill={colors.import} stroke={colors.import} strokeWidth={0.8} style={glowStyle(colors.import)} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PIBComparisonChart;
