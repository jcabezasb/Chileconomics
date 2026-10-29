import { memo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber } from '../../shared/utils/format';
import { buildSparklinePaths } from '../../shared/utils/sparkline';
import { COUNTRY_COLOR, formatDay, formatMonthTick, formatPoints, formatRate } from './mercadosFormat';
import { TENOR_YEARS } from './mercadosView';

const AXIS_TICK = { fill: 'var(--text-secondary)', fontSize: 11 };
const yearTick = (date) => date.slice(0, 4);

// Una marca por año (o cada dos meses en rangos cortos): la primera fecha de cada período.
const dateTicks = (rows, byYear) => {
    const ticks = [];
    let previous = null;
    rows.forEach((row, index) => {
        const month = Number(row.date.slice(5, 7));
        const period = byYear ? row.date.slice(0, 4) : `${row.date.slice(0, 4)}-${Math.floor((month - 1) / 2)}`;
        if (index > 0 && period !== previous) ticks.push(row.date);
        previous = period;
    });
    return ticks;
};

// formatLabel: cómo se muestra la etiqueta (por defecto, la semana de la fecha).
const ChartTooltip = ({ active, payload, label, unit, formatLabel = (date) => `Semana del ${formatDay(date)}` }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="mk-tooltip">
            <strong>{formatLabel(label)}</strong>
            {payload.map((row) => (
                <span key={row.dataKey}>
                    <i style={{ background: row.color }} aria-hidden="true" />
                    {row.name}
                    <b>{unit === 'pp' ? formatPoints(row.value) : formatRate(row.value)}</b>
                </span>
            ))}
        </div>
    );
};

// Líneas en el tiempo (semanales). lines: [{ key, label, color }]; unit: 'pct' o 'pp' (puntos).
export const TimeChart = memo(({ rows, lines, unit = 'pct', zero = false, step = false, height = 240 }) => {
    const spanYears = rows.length ? Number(rows[rows.length - 1].date.slice(0, 4)) - Number(rows[0].date.slice(0, 4)) : 0;
    const byYear = spanYears >= 2;
    return (
        <div className="mk-chart" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                    <XAxis
                        dataKey="date"
                        ticks={dateTicks(rows, byYear)}
                        tickFormatter={byYear ? yearTick : formatMonthTick}
                        interval="preserveStartEnd"
                        minTickGap={24}
                        tick={AXIS_TICK}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                    />
                    <YAxis tickFormatter={(value) => formatNumber(value, 1)} tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
                    {zero ? <ReferenceLine y={0} stroke="var(--text-secondary)" strokeOpacity={0.6} /> : null}
                    <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: 'var(--text-secondary)', strokeOpacity: 0.4 }} />
                    {lines.map((line) => (
                        <Line
                            key={line.key}
                            type={step ? 'stepAfter' : 'linear'}
                            dataKey={line.key}
                            name={line.label}
                            stroke={line.color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, stroke: 'var(--bg-card)', strokeWidth: 2 }}
                            connectNulls
                            isAnimationActive={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});
TimeChart.displayName = 'TimeChart';

const CURVE_TICKS = [0, 1, 2, 3, 5, 10];
const tenorLabel = (years) => (years === 0 ? 'Política' : `${years} ${years === 1 ? 'año' : 'años'}`);

// Curvas del día: el eje es el plazo (en raíz cuadrada, para que 1 a 3 años no queden apretados).
// Cada país une solo los plazos que publica; los que no tiene quedan sin punto.
export const CurveChart = memo(({ curves }) => {
    // Ordenadas por plazo (en el objeto, 'policy' queda después de las claves numéricas).
    const rows = Object.values(TENOR_YEARS).sort((a, b) => a - b).map((years) => ({
        years,
        chile: curves.chile.find((point) => point.years === years)?.value,
        us: curves.us.find((point) => point.years === years)?.value
    }));
    return (
        <div className="mk-chart" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                    <XAxis
                        dataKey="years"
                        type="number"
                        scale="sqrt"
                        domain={[0, 10]}
                        ticks={CURVE_TICKS}
                        tickFormatter={(years) => (years === 0 ? 'Política' : `${years}a`)}
                        tick={AXIS_TICK}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                    />
                    <YAxis tickFormatter={(value) => formatNumber(value, 1)} tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip formatLabel={tenorLabel} />} cursor={{ stroke: 'var(--text-secondary)', strokeOpacity: 0.4 }} />
                    {[['chile', 'Chile'], ['us', 'EE.UU.']].map(([key, name]) => (
                        <Line
                            key={key}
                            dataKey={key}
                            name={name}
                            stroke={COUNTRY_COLOR[key]}
                            strokeWidth={2}
                            dot={{ r: 4, fill: COUNTRY_COLOR[key], stroke: 'var(--bg-card)', strokeWidth: 2 }}
                            activeDot={{ r: 5, stroke: 'var(--bg-card)', strokeWidth: 2 }}
                            connectNulls
                            isAnimationActive={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});
CurveChart.displayName = 'CurveChart';

// Minigráfico de las tarjetas de mercados (últimos dos años).
export const Sparkline = ({ points }) => {
    if (points.length < 2) return null;
    const { linePath } = buildSparklinePaths(points.map((point) => point.value), 200, 40);
    return (
        <svg className="mk-spark" viewBox="0 -2 200 44" preserveAspectRatio="none" aria-hidden="true">
            <path d={linePath} />
        </svg>
    );
};
