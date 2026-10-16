import { memo } from 'react';
import { Bar, CartesianGrid, ComposedChart, ErrorBar, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber } from '../../shared/utils/format';
import { niceTicks } from '../../shared/utils/ticks';
import { formatGrowth, productColor } from './projectionsView';

const axisPct = (value) => `${formatNumber(value, Number.isInteger(value) ? 0 : 1)}%`;
const TICK = { fill: 'var(--text-secondary)', fontSize: 12 };

const YearTooltip = ({ active, payload, label, products, editions }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const entries = products.filter((product) => row[`${product.id}Range`]);
    return (
        <div className="proj-tooltip">
            <strong>{label}</strong>
            {Number.isFinite(row.actual) ? (
                <span>
                    <i className="is-actual" aria-hidden="true" />
                    PIB efectivo
                    <b>{formatGrowth(row.actual)}</b>
                </span>
            ) : null}
            {entries.map((product) => (
                <span key={product.id}>
                    <i style={{ background: productColor(product.id) }} aria-hidden="true" />
                    {editions[product.id]}
                    <b>{formatGrowth(row[`${product.id}Range`])}</b>
                </span>
            ))}
        </div>
    );
};

// Vista "Por año": barras grises con el crecimiento efectivo de los últimos años y, en los años
// siguientes, una barra por cada producto con su última proyección (el IPoM con su rango).
// El efectivo y las proyecciones usan ejes X superpuestos (mismos años) para que cada grupo se
// centre en su año sin dejar huecos.
const ProjectionsYearChart = ({ rows, products, editions, hoveredId }) => {
    const data = rows.map((row) => ({
        ...row,
        ipomError: row.ipomRange ? [row.ipomRange.mid - row.ipomRange.low, row.ipomRange.high - row.ipomRange.mid] : null
    }));
    const hasNegative = rows.some((row) => row.actual < 0 || products.some((product) => row[`${product.id}Range`]?.low < 0));
    const yTicks = niceTicks(rows.flatMap((row) => [
        row.actual,
        ...products.flatMap((product) => [row[`${product.id}Range`]?.low, row[`${product.id}Range`]?.high])
    ])) || [0, 1];
    const dim = (id) => (hoveredId && hoveredId !== id ? 0.3 : 1);

    return (
        <div className="proj-plot">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
                    <XAxis xAxisId="actual" dataKey="year" tick={TICK} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                    <XAxis xAxisId="forecast" dataKey="year" hide />
                    <YAxis
                        ticks={yTicks}
                        domain={[yTicks[0], yTicks[yTicks.length - 1]]}
                        tickFormatter={axisPct}
                        tick={TICK}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                    />
                    {hasNegative ? <ReferenceLine xAxisId="actual" y={0} stroke="var(--text-secondary)" strokeOpacity={0.6} /> : null}
                    <Tooltip
                        cursor={{ fill: 'var(--bg-hover)', opacity: 0.6 }}
                        content={<YearTooltip products={products} editions={editions} />}
                    />
                    <Bar
                        xAxisId="actual"
                        dataKey="actual"
                        name="PIB efectivo"
                        fill="var(--proj-actual)"
                        fillOpacity={dim('actual')}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={30}
                        isAnimationActive={false}
                    />
                    {products.map((product) => (
                        <Bar
                            key={product.id}
                            xAxisId="forecast"
                            dataKey={product.id}
                            name={product.short}
                            fill={productColor(product.id)}
                            fillOpacity={dim(product.id)}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={22}
                            isAnimationActive={false}
                        >
                            {product.id === 'ipom' ? (
                                <ErrorBar dataKey="ipomError" width={6} strokeWidth={2} stroke="var(--text-primary)" direction="y" />
                            ) : null}
                        </Bar>
                    ))}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default memo(ProjectionsYearChart);
