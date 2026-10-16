import { memo } from 'react';
import {
    CartesianGrid,
    ComposedChart,
    ErrorBar,
    Line,
    ReferenceArea,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { formatNumber } from '../../shared/utils/format';
import { niceTicks } from '../../shared/utils/ticks';
import { formatGrowth, productColor } from './projectionsView';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const TICK = { fill: 'var(--text-secondary)', fontSize: 12 };
const axisPct = (value) => `${formatNumber(value, Number.isInteger(value) ? 0 : 1)}%`;
const utc = (year, month = 0) => Date.UTC(year, month, 1);
const monthLabel = (time) => {
    const date = new Date(time);
    return `${MONTHS[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`;
};

// Marca del FMI: rombo de 10 px con anillo del color de fondo.
const Diamond = ({ cx, cy, fill, fillOpacity }) => (
    <path
        d={`M${cx},${cy - 6} L${cx + 6},${cy} L${cx},${cy + 6} L${cx - 6},${cy} Z`}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke="var(--bg-card)"
        strokeWidth={2}
    />
);

// Marca del IPoM: punto medio (el rango lo dibuja ErrorBar).
const Dot = ({ cx, cy, fill, fillOpacity }) => (
    <circle cx={cx} cy={cy} r={5} fill={fill} fillOpacity={fillOpacity} stroke="var(--bg-card)" strokeWidth={2} />
);

const RevisionTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    if (!point?.label) return null;
    return (
        <div className="proj-tooltip">
            <strong>{point.label}</strong>
            <span>
                <i style={{ background: payload[0].color || payload[0].payload.fill }} aria-hidden="true" />
                Proyección
                <b>{formatGrowth(point)}</b>
            </span>
        </div>
    );
};

// Vista "Revisiones": eje X = fecha de cada edición, eje Y = crecimiento que proyectaba para el año
// elegido. La EEE es mensual (línea); el IPoM, un punto con su rango; el FMI, rombos. La franja marca
// el año proyectado y la línea punteada, el dato efectivo cuando ya existe.
const ProjectionsRevisionChart = ({ series, target, actual, hoveredId }) => {
    const times = series.flatMap((entry) => entry.points.map((point) => point.time));
    if (!times.length) return <p className="proj-empty">Sin proyecciones para {target}.</p>;
    const start = Math.min(...times, utc(target));
    const end = Math.max(...times, utc(target, 11));
    const ticks = [];
    for (let year = new Date(start).getUTCFullYear(); utc(year) <= end; year += 1) {
        [0, 6].forEach((month) => {
            if (utc(year, month) >= start && utc(year, month) <= end) ticks.push(utc(year, month));
        });
    }
    // Eje Y con los rangos completos del IPoM y el dato efectivo adentro.
    const yTicks = niceTicks([...series.flatMap((entry) => entry.points.flatMap((point) => [point.low, point.high])), actual]);
    const opacity = (id) => (hoveredId && hoveredId !== id ? 0.25 : 1);

    return (
        <div className="proj-plot">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                    <XAxis
                        type="number"
                        dataKey="time"
                        domain={[start, end]}
                        ticks={ticks}
                        tickFormatter={monthLabel}
                        tick={TICK}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                        allowDuplicatedCategory={false}
                    />
                    <YAxis
                        dataKey="mid"
                        ticks={yTicks}
                        domain={[yTicks[0], yTicks[yTicks.length - 1]]}
                        tickFormatter={axisPct}
                        tick={TICK}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                    />
                    <ReferenceArea
                        x1={utc(target)}
                        x2={Math.min(utc(target, 11), end)}
                        fill="var(--text-secondary)"
                        fillOpacity={0.07}
                        label={{ value: String(target), position: 'insideTopLeft', fill: 'var(--text-secondary)', fontSize: 12 }}
                    />
                    {Number.isFinite(actual) ? (
                        <ReferenceLine
                            y={actual}
                            stroke="var(--text-primary)"
                            strokeDasharray="4 4"
                            label={{ value: `Efectivo ${formatGrowth(actual)}`, position: 'insideBottomRight', fill: 'var(--text-primary)', fontSize: 12 }}
                        />
                    ) : null}
                    <Tooltip content={<RevisionTooltip />} cursor={false} />
                    {series.map((entry) => {
                        const color = productColor(entry.id);
                        if (entry.id === 'eee') {
                            return (
                                <Line
                                    key={entry.id}
                                    data={entry.points}
                                    dataKey="mid"
                                    name={entry.short}
                                    stroke={color}
                                    strokeOpacity={opacity(entry.id)}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, stroke: 'var(--bg-card)', strokeWidth: 2 }}
                                    isAnimationActive={false}
                                />
                            );
                        }
                        const points = entry.points.map((point) => ({ ...point, error: [point.mid - point.low, point.high - point.mid] }));
                        return (
                            <Scatter
                                key={entry.id}
                                data={points}
                                dataKey="mid"
                                name={entry.short}
                                fill={color}
                                fillOpacity={opacity(entry.id)}
                                shape={entry.id === 'weo' ? <Diamond /> : <Dot />}
                                isAnimationActive={false}
                            >
                                {entry.id === 'ipom' ? (
                                    <ErrorBar dataKey="error" direction="y" width={0} strokeWidth={2} stroke={color} />
                                ) : null}
                            </Scatter>
                        );
                    })}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default memo(ProjectionsRevisionChart);
