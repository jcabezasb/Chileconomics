import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FISCAL_COLORS as COLORS, niceTicks } from './fiscalFormat';

const ChartTooltip = ({ active, payload, label, series }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
        <div className="fiscal-tooltip">
            <p className="fiscal-tooltip-title">{row.partial ? `${label.replace('*', '')} (${row.period.short})` : label}</p>
            {series.map((item) => (
                <div key={item.key} className="fiscal-tooltip-row">
                    <span style={{ color: item.color }}>{item.name}</span>
                    <strong>{item.format(row[item.key])}</strong>
                </div>
            ))}
        </div>
    );
};

// Historia anual. series: [{ key, name, color, format, type: 'bar' | 'line', signed }]
// signed: colorea cada barra según su signo (balance, variaciones).
const FiscalHistoryChart = ({ data, series, axisFormat }) => {
    const hasValues = data.some((row) => series.some((item) => Number.isFinite(row[item.key])));
    if (!hasValues) return <p className="fiscal-empty">Sin datos para esta vista.</p>;
    const hasNegative = data.some((row) => series.some((item) => row[item.key] < 0));
    const ticks = niceTicks(data.flatMap((row) => series.map((item) => row[item.key])));

    return (
        <div className="fiscal-chart">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis
                        tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                        ticks={ticks}
                        domain={ticks ? [ticks[0], ticks[ticks.length - 1]] : undefined}
                        tickFormatter={axisFormat}
                    />
                    {hasNegative ? <ReferenceLine y={0} stroke="var(--text-secondary)" strokeOpacity={0.6} /> : null}
                    <Tooltip
                        cursor={{ fill: 'var(--bg-hover)' }}
                        content={<ChartTooltip series={series} />}
                    />
                    {series.map((item) => (item.type === 'line' ? (
                        <Line
                            key={item.key}
                            dataKey={item.key}
                            name={item.name}
                            stroke={item.color}
                            strokeWidth={2}
                            dot={{ r: 2.5, fill: item.color }}
                            isAnimationActive={false}
                            connectNulls={false}
                        />
                    ) : (
                        <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.color} radius={[3, 3, 0, 0]} maxBarSize={34} isAnimationActive={false}>
                            {data.map((row) => (
                                <Cell
                                    key={row.label}
                                    fill={item.signed ? (row[item.key] < 0 ? COLORS.down : COLORS.up) : item.color}
                                    fillOpacity={row.partial ? 0.45 : 0.9}
                                />
                            ))}
                        </Bar>
                    )))}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default FiscalHistoryChart;
