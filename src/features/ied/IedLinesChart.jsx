import { memo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber } from '../../shared/utils/format';

// Colores categóricos en orden fijo (validados para daltonismo en claro y oscuro; ver ied.css).
const seriesColor = (index) => `var(--ied-series-${index + 1})`;
const thousands = (value) => formatNumber(value / 1000, 0);

const LinesTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const rows = [...payload].sort((a, b) => b.value - a.value);
    return (
        <div className="ied-lines-tooltip">
            <strong>{label}</strong>
            {rows.map((row) => (
                <span key={row.dataKey}>
                    <i style={{ background: row.color }} aria-hidden="true" />
                    {row.name}
                    <b>{formatNumber(row.value, 0)}</b>
                </span>
            ))}
        </div>
    );
};

// Vista tradicional: stock por año de los principales países (o regiones), una línea por cada uno.
// La leyenda destaca una serie; la línea vertical marca el año elegido; tocar el gráfico cambia de año.
const IedLinesChart = ({ series, rows, year, activeId, onHover, onSelect, onChooseYear }) => (
    <div className="ied-lines">
        <div className="ied-lines-legend" role="list">
            {series.map((entry, index) => (
                <button
                    key={entry.id}
                    type="button"
                    role="listitem"
                    className={`ied-lines-key${activeId === entry.id ? ' is-active' : ''}${activeId && activeId !== entry.id ? ' is-dim' : ''}`}
                    onMouseEnter={() => onHover(entry.id)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onSelect(entry.id)}
                >
                    <i style={{ background: seriesColor(index) }} aria-hidden="true" />
                    {entry.label}
                </button>
            ))}
        </div>
        <div className="ied-lines-plot">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={rows}
                    margin={{ top: 12, right: 16, bottom: 4, left: 0 }}
                    onClick={(state) => {
                        if (Number.isFinite(state?.activeLabel)) onChooseYear(state.activeLabel);
                    }}
                >
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                    <YAxis
                        tickFormatter={thousands}
                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                        label={{ value: 'miles de millones de US$', angle: -90, position: 'insideLeft', offset: 8, fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                    <ReferenceLine x={year} stroke="var(--text-secondary)" strokeDasharray="3 3" />
                    <Tooltip content={<LinesTooltip />} cursor={{ stroke: 'var(--text-secondary)', strokeOpacity: 0.4 }} />
                    {series.map((entry, index) => (
                        <Line
                            key={entry.id}
                            type="monotone"
                            dataKey={entry.id}
                            name={entry.label}
                            stroke={seriesColor(index)}
                            strokeWidth={activeId === entry.id ? 3 : 2}
                            strokeOpacity={activeId && activeId !== entry.id ? 0.2 : 1}
                            dot={false}
                            activeDot={{ r: 4, stroke: 'var(--bg-card)', strokeWidth: 2 }}
                            isAnimationActive={false}
                            onMouseEnter={() => onHover(entry.id)}
                            onMouseLeave={() => onHover(null)}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);

export default memo(IedLinesChart);
