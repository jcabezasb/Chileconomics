import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { formatNumber } from '../utils/format';

const demandRows = [
    { price: 1, quantity: 9 },
    { price: 2, quantity: 7 },
    { price: 3, quantity: 5 },
    { price: 4, quantity: 3 },
    { price: 5, quantity: 1 }
];

const supplyRows = [
    { price: 1, quantity: 1 },
    { price: 2, quantity: 3 },
    { price: 3, quantity: 5 },
    { price: 4, quantity: 7 },
    { price: 5, quantity: 9 }
];

const quizItems = [
    {
        id: 'quiz-demand-up',
        question: 'Si aumenta la demanda y la oferta se mantiene, que pasa con el equilibrio?',
        options: [
            'Sube el precio y sube la cantidad',
            'Baja el precio y sube la cantidad',
            'Sube el precio y baja la cantidad'
        ],
        correctIndex: 0,
        explanation: 'La demanda se desplaza a la derecha. El equilibrio se mueve hacia arriba y a la derecha.',
        chart: 'demand-up'
    },
    {
        id: 'quiz-supply-up',
        question: 'Si aumenta la oferta y la demanda se mantiene, que pasa con el equilibrio?',
        options: [
            'Baja el precio y sube la cantidad',
            'Sube el precio y baja la cantidad',
            'No cambia'
        ],
        correctIndex: 0,
        explanation: 'Con mas oferta, el precio baja y la cantidad aumenta.',
        chart: 'supply-up'
    },
    {
        id: 'quiz-surplus',
        question: 'Si el precio esta por encima del equilibrio, que ocurre?',
        options: [
            'Exceso de oferta',
            'Escasez',
            'Nada cambia'
        ],
        correctIndex: 0,
        explanation: 'Con un precio alto, la oferta supera la demanda y hay exceso de oferta.',
        chart: 'surplus'
    }
];

const buildQuantityAt = (rows, price) => {
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => a.price - b.price);
    if (price <= sorted[0].price) return sorted[0].quantity;
    for (let i = 0; i < sorted.length - 1; i += 1) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (price >= current.price && price <= next.price) {
            const t = (price - current.price) / (next.price - current.price);
            return current.quantity + t * (next.quantity - current.quantity);
        }
    }
    return sorted[sorted.length - 1].quantity;
};

const findEquilibrium = (demand, supply) => {
    if (!demand.length || !supply.length) return null;
    const prices = [...demand].sort((a, b) => a.price - b.price).map((row) => row.price);
    for (let i = 0; i < prices.length - 1; i += 1) {
        const p0 = prices[i];
        const p1 = prices[i + 1];
        const diff0 = buildQuantityAt(demand, p0) - buildQuantityAt(supply, p0);
        const diff1 = buildQuantityAt(demand, p1) - buildQuantityAt(supply, p1);
        if (diff0 === 0) {
            return { price: p0, quantity: buildQuantityAt(demand, p0) };
        }
        if (diff0 * diff1 <= 0) {
            const t = diff0 / (diff0 - diff1);
            const price = p0 + t * (p1 - p0);
            const quantity = buildQuantityAt(demand, price);
            return { price, quantity };
        }
    }
    return null;
};

const useScrollTrigger = (threshold = 0.3) => {
    const ref = useRef(null);
    const [isTriggered, setIsTriggered] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsTriggered(true);
                        observer.disconnect();
                    }
                });
            },
            { threshold }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [threshold]);

    return [ref, isTriggered];
};

const CurveAnimationBlock = ({
    rows,
    kicker,
    heading,
    description,
    quantityLabel,
    curveTitle,
    curveColor
}) => {
    const stageRef = useRef(null);
    const chartRef = useRef(null);
    const priceRefs = useRef([]);
    const qtyRefs = useRef([]);
    const [animatedPoints, setAnimatedPoints] = useState([]);
    const [sectionRef, isTriggered] = useScrollTrigger(0.3);

    const chartData = useMemo(
        () => [...rows].sort((a, b) => a.quantity - b.quantity),
        [rows]
    );

    const chartLayout = useMemo(() => {
        const width = 360;
        const height = 230;
        const padding = 36;
        const quantities = chartData.map((point) => point.quantity);
        const prices = chartData.map((point) => point.price);
        const minQ = Math.min(...quantities);
        const maxQ = Math.max(...quantities);
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);

        const scaleX = (value) => {
            if (maxQ === minQ) return padding;
            const ratio = (value - minQ) / (maxQ - minQ);
            return padding + ratio * (width - padding * 2);
        };

        const scaleY = (value) => {
            if (maxP === minP) return height - padding;
            const ratio = (value - minP) / (maxP - minP);
            return height - padding - ratio * (height - padding * 2);
        };

        const points = chartData.map((point) => ({
            ...point,
            x: scaleX(point.quantity),
            y: scaleY(point.price)
        }));

        const path = points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
            .join(' ');

        return { width, height, padding, points, path };
    }, [chartData]);

    useLayoutEffect(() => {
        const updatePositions = () => {
            const stage = stageRef.current;
            const chart = chartRef.current;
            if (!stage || !chart) return;

            const stageRect = stage.getBoundingClientRect();
            const chartRect = chart.getBoundingClientRect();
            const scaleX = chartRect.width / chartLayout.width;
            const scaleY = chartRect.height / chartLayout.height;
            const pointsByPrice = new Map(chartLayout.points.map((point) => [point.price, point]));

            const nextPoints = rows
                .map((row, index) => {
                    const priceEl = priceRefs.current[index];
                    const qtyEl = qtyRefs.current[index];
                    const chartPoint = pointsByPrice.get(row.price);
                    if (!priceEl || !qtyEl || !chartPoint) return null;

                    const priceRect = priceEl.getBoundingClientRect();
                    const qtyRect = qtyEl.getBoundingClientRect();
                    const pointX = chartRect.left + chartPoint.x * scaleX;
                    const pointY = chartRect.top + chartPoint.y * scaleY;
                    const priceX = priceRect.left + priceRect.width / 2 - stageRect.left;
                    const priceY = priceRect.top + priceRect.height / 2 - stageRect.top;
                    const qtyX = qtyRect.left + qtyRect.width / 2 - stageRect.left;
                    const qtyY = qtyRect.top + qtyRect.height / 2 - stageRect.top;
                    const mergeX = (priceX + qtyX) / 2;
                    const mergeY = (priceY + qtyY) / 2;

                    return {
                        id: row.price,
                        price: row.price,
                        quantity: row.quantity,
                        priceX,
                        priceY,
                        qtyX,
                        qtyY,
                        mergeX,
                        mergeY,
                        pointX: pointX - stageRect.left,
                        pointY: pointY - stageRect.top
                    };
                })
                .filter(Boolean);

            if (nextPoints.length) {
                setAnimatedPoints(nextPoints);
            }
        };

        updatePositions();
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => window.requestAnimationFrame(updatePositions));
        }

        const handleResize = () => window.requestAnimationFrame(updatePositions);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [chartLayout, rows]);

    const animationReady = animatedPoints.length === rows.length;
    const sectionClassName = `blog-post-section blog-demand blog-demand-freeze reveal${
        isTriggered ? ' is-visible' : ''
    }${animationReady && isTriggered ? ' is-ready' : ''}`;
    const sectionStyle = curveColor ? { '--curve-color': curveColor } : undefined;

    return (
        <section className={sectionClassName} style={sectionStyle} ref={sectionRef}>
            <span className="blog-block-eyebrow">{kicker}</span>
            <h2>{heading}</h2>
            <p>{description}</p>
            <div className="blog-post-figure blog-demand-stage" ref={stageRef}>
                <div className="blog-table" aria-hidden="true">
                    <div className="blog-table-header">
                        <span>Precio</span>
                        <span>{quantityLabel}</span>
                    </div>
                    <div className="blog-table-rows">
                        {rows.map((row, index) => (
                            <div key={row.price} className="blog-table-row">
                                <span
                                    className="blog-table-price"
                                    ref={(el) => {
                                        priceRefs.current[index] = el;
                                    }}
                                >
                                    {row.price}
                                </span>
                                <span
                                    className="blog-table-qty"
                                    ref={(el) => {
                                        qtyRefs.current[index] = el;
                                    }}
                                >
                                    {row.quantity}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="blog-block-visual">
                    <div className="blog-visual-header">
                        <strong className="demand-title">{curveTitle}</strong>
                    </div>
                    <svg
                        ref={chartRef}
                        className="blog-demand-chart"
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${chartLayout.width} ${chartLayout.height}`}
                        role="img"
                        aria-label={`${curveTitle} basada en la tabla`}
                    >
                        <line
                            x1={chartLayout.padding}
                            y1={chartLayout.height - chartLayout.padding}
                            x2={chartLayout.width - chartLayout.padding}
                            y2={chartLayout.height - chartLayout.padding}
                            className="demand-axis"
                        />
                        <line
                            x1={chartLayout.padding}
                            y1={chartLayout.padding}
                            x2={chartLayout.padding}
                            y2={chartLayout.height - chartLayout.padding}
                            className="demand-axis"
                        />
                        <path
                            d={chartLayout.path}
                            className="demand-line"
                            vectorEffect="non-scaling-stroke"
                        />
                        {chartLayout.points.map((point) => (
                            <circle
                                key={`${point.price}-${point.quantity}`}
                                className="demand-point"
                                cx={point.x}
                                cy={point.y}
                                r="5"
                            />
                        ))}
                        <text
                            x={chartLayout.width / 2}
                            y={chartLayout.height - 10}
                            textAnchor="middle"
                            className="demand-axis-label"
                        >
                            Cantidad (Q)
                        </text>
                        <text
                            x="12"
                            y={chartLayout.height / 2}
                            textAnchor="middle"
                            className="demand-axis-label"
                            transform={`rotate(-90 12 ${chartLayout.height / 2})`}
                        >
                            Precio (P)
                        </text>
                    </svg>
                </div>
                {animationReady ? (
                    <div className="demand-animate-layer" aria-hidden="true">
                        {animatedPoints.map((point) => (
                            <div
                                key={point.id}
                                className="demand-animate-item"
                                style={{
                                    '--point-x': `${point.pointX}px`,
                                    '--point-y': `${point.pointY}px`,
                                    '--merge-x': `${point.mergeX}px`,
                                    '--merge-y': `${point.mergeY}px`
                                }}
                            >
                                <span
                                    className="demand-animate-label demand-animate-price"
                                    style={{
                                        '--start-x': `${point.priceX}px`,
                                        '--start-y': `${point.priceY}px`
                                    }}
                                >
                                    {point.price}
                                </span>
                                <span
                                    className="demand-animate-label demand-animate-qty"
                                    style={{
                                        '--start-x': `${point.qtyX}px`,
                                        '--start-y': `${point.qtyY}px`
                                    }}
                                >
                                    {point.quantity}
                                </span>
                                <span className="demand-animate-dot" />
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </section>
    );
};

const EquilibriumBlock = ({ demand, supply }) => {
    const stageRef = useRef(null);
    const demandRef = useRef(null);
    const supplyRef = useRef(null);
    const combinedRef = useRef(null);
    const [motion, setMotion] = useState(null);
    const [sectionRef, isTriggered] = useScrollTrigger(0.3);

    const bounds = useMemo(() => {
        const quantities = [...demand, ...supply].map((row) => row.quantity);
        const prices = [...demand, ...supply].map((row) => row.price);
        return {
            minQ: Math.min(...quantities),
            maxQ: Math.max(...quantities),
            minP: Math.min(...prices),
            maxP: Math.max(...prices)
        };
    }, [demand, supply]);

    const buildLayout = (rows) => {
        const width = 360;
        const height = 230;
        const padding = 36;
        const sorted = [...rows].sort((a, b) => a.quantity - b.quantity);
        const scaleX = (value) => {
            if (bounds.maxQ === bounds.minQ) return padding;
            const ratio = (value - bounds.minQ) / (bounds.maxQ - bounds.minQ);
            return padding + ratio * (width - padding * 2);
        };
        const scaleY = (value) => {
            if (bounds.maxP === bounds.minP) return height - padding;
            const ratio = (value - bounds.minP) / (bounds.maxP - bounds.minP);
            return height - padding - ratio * (height - padding * 2);
        };
        const points = sorted.map((point) => ({
            ...point,
            x: scaleX(point.quantity),
            y: scaleY(point.price)
        }));
        const path = points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
            .join(' ');
        return { width, height, padding, points, path, scaleX, scaleY };
    };

    const demandLayout = useMemo(() => buildLayout(demand), [demand, bounds]);
    const supplyLayout = useMemo(() => buildLayout(supply), [supply, bounds]);

    const equilibriumPoint = useMemo(() => findEquilibrium(demand, supply), [demand, supply]);
    const equilibriumLabel = equilibriumPoint
        ? {
            price: formatNumber(Math.round(equilibriumPoint.price), 0),
            quantity: formatNumber(Math.round(equilibriumPoint.quantity), 0)
        }
        : null;

    const equilibriumX = equilibriumPoint ? demandLayout.scaleX(equilibriumPoint.quantity) : null;
    const equilibriumY = equilibriumPoint ? demandLayout.scaleY(equilibriumPoint.price) : null;

    useLayoutEffect(() => {
        const updatePositions = () => {
            const stage = stageRef.current;
            const demandChart = demandRef.current;
            const supplyChart = supplyRef.current;
            const combinedChart = combinedRef.current;
            if (!stage || !demandChart || !supplyChart || !combinedChart) return;

            const stageRect = stage.getBoundingClientRect();
            const demandRect = demandChart.getBoundingClientRect();
            const supplyRect = supplyChart.getBoundingClientRect();
            const combinedRect = combinedChart.getBoundingClientRect();

            const endX = combinedRect.left + combinedRect.width / 2 - stageRect.left;
            const endY = combinedRect.top + combinedRect.height / 2 - stageRect.top;
            const endW = combinedRect.width;
            const endH = combinedRect.height;

            const demandScaleX = demandRect.width / combinedRect.width;
            const demandScaleY = demandRect.height / combinedRect.height;
            const supplyScaleX = supplyRect.width / combinedRect.width;
            const supplyScaleY = supplyRect.height / combinedRect.height;

            setMotion({
                endX,
                endY,
                endW,
                endH,
                demand: {
                    startX: demandRect.left + demandRect.width / 2 - stageRect.left,
                    startY: demandRect.top + demandRect.height / 2 - stageRect.top,
                    scaleX: demandScaleX,
                    scaleY: demandScaleY
                },
                supply: {
                    startX: supplyRect.left + supplyRect.width / 2 - stageRect.left,
                    startY: supplyRect.top + supplyRect.height / 2 - stageRect.top,
                    scaleX: supplyScaleX,
                    scaleY: supplyScaleY
                }
            });
        };

        updatePositions();
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => window.requestAnimationFrame(updatePositions));
        }

        const handleResize = () => window.requestAnimationFrame(updatePositions);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isReady = Boolean(motion) && isTriggered;
    const sectionClassName = `blog-post-section equilibrium-block reveal${
        isTriggered ? ' is-visible' : ''
    }${isReady ? ' is-ready' : ''}`;

    return (
        <section className={sectionClassName} ref={sectionRef}>
            <span className="blog-block-eyebrow">Concepto 03</span>
            <h2>Equilibrio: donde oferta y demanda se encuentran</h2>
            <p>
                Cuando ambas curvas se intersectan, surge un precio de equilibrio. En ese punto, la cantidad
                ofrecida coincide con la cantidad demandada.
            </p>
            <div className="equilibrium-stage" ref={stageRef}>
                <div className="equilibrium-grid">
                    <div className="equilibrium-left">
                        <div className="equilibrium-card" style={{ '--curve-color': 'var(--chart-neon)' }}>
                            <div className="equilibrium-card-title">Demanda</div>
                            <svg
                                className="equilibrium-chart"
                                viewBox={`0 0 ${demandLayout.width} ${demandLayout.height}`}
                                role="img"
                                aria-label="Curva de demanda"
                                ref={demandRef}
                            >
                                <line
                                    x1={demandLayout.padding}
                                    y1={demandLayout.height - demandLayout.padding}
                                    x2={demandLayout.width - demandLayout.padding}
                                    y2={demandLayout.height - demandLayout.padding}
                                    className="equilibrium-axis"
                                />
                                <line
                                    x1={demandLayout.padding}
                                    y1={demandLayout.padding}
                                    x2={demandLayout.padding}
                                    y2={demandLayout.height - demandLayout.padding}
                                    className="equilibrium-axis"
                                />
                                <path
                                    d={demandLayout.path}
                                    className="equilibrium-line equilibrium-line-demand"
                                />
                            </svg>
                        </div>
                        <div className="equilibrium-card" style={{ '--curve-color': '#facc15' }}>
                            <div className="equilibrium-card-title">Oferta</div>
                            <svg
                                className="equilibrium-chart"
                                viewBox={`0 0 ${supplyLayout.width} ${supplyLayout.height}`}
                                role="img"
                                aria-label="Curva de oferta"
                                ref={supplyRef}
                            >
                                <line
                                    x1={supplyLayout.padding}
                                    y1={supplyLayout.height - supplyLayout.padding}
                                    x2={supplyLayout.width - supplyLayout.padding}
                                    y2={supplyLayout.height - supplyLayout.padding}
                                    className="equilibrium-axis"
                                />
                                <line
                                    x1={supplyLayout.padding}
                                    y1={supplyLayout.padding}
                                    x2={supplyLayout.padding}
                                    y2={supplyLayout.height - supplyLayout.padding}
                                    className="equilibrium-axis"
                                />
                                <path
                                    d={supplyLayout.path}
                                    className="equilibrium-line equilibrium-line-supply"
                                />
                            </svg>
                        </div>
                    </div>
                    <div className="equilibrium-right">
                        <div className="equilibrium-card-title">Equilibrio</div>
                        <svg
                            className="equilibrium-chart equilibrium-chart-large"
                            viewBox={`0 0 ${demandLayout.width} ${demandLayout.height}`}
                            role="img"
                            aria-label="Equilibrio entre oferta y demanda"
                            ref={combinedRef}
                        >
                            <line
                                x1={demandLayout.padding}
                                y1={demandLayout.height - demandLayout.padding}
                                x2={demandLayout.width - demandLayout.padding}
                                y2={demandLayout.height - demandLayout.padding}
                                className="equilibrium-axis"
                            />
                            <line
                                x1={demandLayout.padding}
                                y1={demandLayout.padding}
                                x2={demandLayout.padding}
                                y2={demandLayout.height - demandLayout.padding}
                                className="equilibrium-axis"
                            />
                            <path
                                d={demandLayout.path}
                                className="equilibrium-line equilibrium-line-demand"
                            />
                            <path
                                d={supplyLayout.path}
                                className="equilibrium-line equilibrium-line-supply"
                            />
                            {equilibriumPoint && equilibriumX !== null && equilibriumY !== null ? (
                                <>
                                    <line
                                        x1={demandLayout.padding}
                                        y1={equilibriumY}
                                        x2={demandLayout.width - demandLayout.padding}
                                        y2={equilibriumY}
                                        className="equilibrium-price-line"
                                    />
                                    <circle
                                        cx={equilibriumX}
                                        cy={equilibriumY}
                                        r="4"
                                        className="equilibrium-price-dot"
                                    />
                                    <text
                                        x={demandLayout.width - demandLayout.padding}
                                        y={equilibriumY - 8}
                                        textAnchor="end"
                                        className="equilibrium-price-label"
                                    >
                                        Precio de equilibrio
                                    </text>
                                </>
                            ) : null}
                            <text
                                x={demandLayout.width / 2}
                                y={demandLayout.height - 10}
                                textAnchor="middle"
                                className="equilibrium-axis-label"
                            >
                                Cantidad (Q)
                            </text>
                            <text
                                x="12"
                                y={demandLayout.height / 2}
                                textAnchor="middle"
                                className="equilibrium-axis-label"
                                transform={`rotate(-90 12 ${demandLayout.height / 2})`}
                            >
                                Precio (P)
                            </text>
                        </svg>
                        {equilibriumLabel ? (
                            <div className="equilibrium-result">
                                En el equilibrio, se comercian {equilibriumLabel.quantity} bienes a un precio de {equilibriumLabel.price}.
                            </div>
                        ) : null}
                    </div>
                </div>
                {motion ? (
                    <div className="equilibrium-move-layer" aria-hidden="true">
                        <div
                            className="equilibrium-move equilibrium-move-demand"
                            style={{
                                '--start-x': `${motion.demand.startX}px`,
                                '--start-y': `${motion.demand.startY}px`,
                                '--end-x': `${motion.endX}px`,
                                '--end-y': `${motion.endY}px`,
                                '--start-scale-x': `${motion.demand.scaleX}`,
                                '--start-scale-y': `${motion.demand.scaleY}`,
                                '--end-w': `${motion.endW}px`,
                                '--end-h': `${motion.endH}px`
                            }}
                        >
                            <svg
                                viewBox={`0 0 ${demandLayout.width} ${demandLayout.height}`}
                                className="equilibrium-move-svg"
                            >
                                <path d={demandLayout.path} className="equilibrium-move-path" />
                            </svg>
                        </div>
                        <div
                            className="equilibrium-move equilibrium-move-supply"
                            style={{
                                '--start-x': `${motion.supply.startX}px`,
                                '--start-y': `${motion.supply.startY}px`,
                                '--end-x': `${motion.endX}px`,
                                '--end-y': `${motion.endY}px`,
                                '--start-scale-x': `${motion.supply.scaleX}`,
                                '--start-scale-y': `${motion.supply.scaleY}`,
                                '--end-w': `${motion.endW}px`,
                                '--end-h': `${motion.endH}px`
                            }}
                        >
                            <svg
                                viewBox={`0 0 ${supplyLayout.width} ${supplyLayout.height}`}
                                className="equilibrium-move-svg"
                            >
                                <path d={supplyLayout.path} className="equilibrium-move-path" />
                            </svg>
                        </div>
                    </div>
                ) : null}
            </div>
        </section>
    );
};

const ShiftPanel = ({ title, moving, demand, supply, shift }) => {
    const movingSupply = moving === 'supply';
    const baseRows = movingSupply ? supply : demand;
    const clipIdRef = useRef(`shift-clip-${Math.random().toString(36).slice(2, 10)}`);
    const shiftRows = (rows, delta) => rows.map((row) => ({
        ...row,
        quantity: Math.max(0, row.quantity + delta)
    }));
    const shiftedPlus = useMemo(() => shiftRows(baseRows, shift), [baseRows, shift]);
    const shiftedMinus = useMemo(() => shiftRows(baseRows, -shift), [baseRows, shift]);

    const bounds = useMemo(() => {
        const quantities = [...demand, ...supply, ...shiftedPlus, ...shiftedMinus]
            .map((row) => row.quantity);
        const prices = [...demand, ...supply, ...shiftedPlus, ...shiftedMinus]
            .map((row) => row.price);
        return {
            minQ: Math.min(...quantities),
            maxQ: Math.max(...quantities),
            minP: Math.min(...prices),
            maxP: Math.max(...prices)
        };
    }, [demand, supply, shiftedPlus, shiftedMinus]);

    const buildLayout = (rows) => {
        const width = 360;
        const height = 230;
        const padding = 36;
        const sorted = [...rows].sort((a, b) => a.quantity - b.quantity);
        const scaleX = (value) => {
            if (bounds.maxQ === bounds.minQ) return padding;
            const ratio = (value - bounds.minQ) / (bounds.maxQ - bounds.minQ);
            return padding + ratio * (width - padding * 2);
        };
        const scaleY = (value) => {
            if (bounds.maxP === bounds.minP) return height - padding;
            const ratio = (value - bounds.minP) / (bounds.maxP - bounds.minP);
            return height - padding - ratio * (height - padding * 2);
        };
        const points = sorted.map((point) => ({
            ...point,
            x: scaleX(point.quantity),
            y: scaleY(point.price)
        }));
        const path = points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
            .join(' ');
        return { width, height, padding, points, path, scaleX, scaleY };
    };

    const demandLayout = useMemo(() => buildLayout(demand), [demand, bounds]);
    const supplyLayout = useMemo(() => buildLayout(supply), [supply, bounds]);

    const shiftX = useMemo(() => {
        const baseValue = baseRows[0]?.quantity ?? 0;
        const base = movingSupply
            ? supplyLayout.scaleX(baseValue)
            : demandLayout.scaleX(baseValue);
        const shifted = movingSupply
            ? supplyLayout.scaleX(baseValue + shift)
            : demandLayout.scaleX(baseValue + shift);
        return shifted - base;
    }, [movingSupply, supplyLayout, demandLayout, baseRows, shift]);

    const eqIncrease = useMemo(
        () => (movingSupply ? findEquilibrium(demand, shiftedPlus) : findEquilibrium(shiftedPlus, supply)),
        [movingSupply, demand, supply, shiftedPlus]
    );
    const eqDecrease = useMemo(
        () => (movingSupply ? findEquilibrium(demand, shiftedMinus) : findEquilibrium(shiftedMinus, supply)),
        [movingSupply, demand, supply, shiftedMinus]
    );

    const roundValue = (value, mode) => {
        if (mode === 'up') return Math.ceil(value);
        if (mode === 'down') return Math.floor(value);
        return Math.round(value);
    };

    const buildLabel = (point, rounding) => (point
        ? {
            price: formatNumber(roundValue(point.price, rounding.price), 0),
            quantity: formatNumber(roundValue(point.quantity, rounding.quantity), 0),
            x: demandLayout.scaleX(point.quantity),
            y: demandLayout.scaleY(point.price)
        }
        : null);

    const roundingIncrease = movingSupply
        ? { price: 'down', quantity: 'up' }
        : { price: 'up', quantity: 'up' };
    const roundingDecrease = movingSupply
        ? { price: 'up', quantity: 'down' }
        : { price: 'down', quantity: 'down' };

    const incLabel = useMemo(
        () => buildLabel(eqIncrease, roundingIncrease),
        [eqIncrease, demandLayout, roundingIncrease]
    );
    const decLabel = useMemo(
        () => buildLabel(eqDecrease, roundingDecrease),
        [eqDecrease, demandLayout, roundingDecrease]
    );

    const panelStyle = {
        '--shift-x': `${shiftX}px`,
        '--move-color': movingSupply ? '#facc15' : 'var(--chart-neon)'
    };

    return (
        <div className={`shift-panel ${moving}`} style={panelStyle}>
            <div className="shift-panel-title">{title}</div>
            <svg
                className="shift-panel-chart"
                viewBox={`0 0 ${demandLayout.width} ${demandLayout.height}`}
                role="img"
                aria-label={`Desplazamiento de ${title.toLowerCase()}`}
            >
                <defs>
                    <clipPath id={clipIdRef.current} clipPathUnits="userSpaceOnUse">
                        <rect
                            x={demandLayout.padding}
                            y={demandLayout.padding}
                            width={demandLayout.width - demandLayout.padding * 2}
                            height={demandLayout.height - demandLayout.padding * 2}
                        />
                    </clipPath>
                </defs>
                <line
                    x1={demandLayout.padding}
                    y1={demandLayout.height - demandLayout.padding}
                    x2={demandLayout.width - demandLayout.padding}
                    y2={demandLayout.height - demandLayout.padding}
                    className="shift-axis"
                />
                <line
                    x1={demandLayout.padding}
                    y1={demandLayout.padding}
                    x2={demandLayout.padding}
                    y2={demandLayout.height - demandLayout.padding}
                    className="shift-axis"
                />
                <g clipPath={`url(#${clipIdRef.current})`}>
                    <path
                        d={demandLayout.path}
                        className="shift-demand-line"
                    />
                    <path
                        d={supplyLayout.path}
                        className="shift-supply-line"
                    />
                    <g className="shift-moving">
                        <path
                            d={movingSupply ? supplyLayout.path : demandLayout.path}
                            className="shift-moving-line"
                        />
                    </g>
                    {incLabel ? (
                        <g className="shift-eq shift-eq-inc">
                            <line
                                x1={demandLayout.padding}
                                y1={incLabel.y}
                                x2={demandLayout.width - demandLayout.padding}
                                y2={incLabel.y}
                                className="shift-eq-line"
                            />
                            <circle
                                cx={incLabel.x}
                                cy={incLabel.y}
                                r="4"
                                className="shift-eq-dot"
                            />
                        </g>
                    ) : null}
                    {decLabel ? (
                        <g className="shift-eq shift-eq-dec">
                            <line
                                x1={demandLayout.padding}
                                y1={decLabel.y}
                                x2={demandLayout.width - demandLayout.padding}
                                y2={decLabel.y}
                                className="shift-eq-line"
                            />
                            <circle
                                cx={decLabel.x}
                                cy={decLabel.y}
                                r="4"
                                className="shift-eq-dot"
                            />
                        </g>
                    ) : null}
                </g>
                {incLabel ? (
                    <text
                        x={demandLayout.width - demandLayout.padding}
                        y={incLabel.y - 8}
                        textAnchor="end"
                        className="shift-eq-label shift-eq-inc"
                    >
                        P={incLabel.price} / Q={incLabel.quantity}
                    </text>
                ) : null}
                {decLabel ? (
                    <text
                        x={demandLayout.width - demandLayout.padding}
                        y={decLabel.y - 8}
                        textAnchor="end"
                        className="shift-eq-label shift-eq-dec"
                    >
                        P={decLabel.price} / Q={decLabel.quantity}
                    </text>
                ) : null}
                <text
                    x={demandLayout.width / 2}
                    y={demandLayout.height - 10}
                    textAnchor="middle"
                    className="shift-axis-label"
                >
                    Cantidad (Q)
                </text>
                <text
                    x="12"
                    y={demandLayout.height / 2}
                    textAnchor="middle"
                    className="shift-axis-label"
                    transform={`rotate(-90 12 ${demandLayout.height / 2})`}
                >
                    Precio (P)
                </text>
            </svg>
            <div className="shift-subtitle">
                {incLabel ? (
                    <div className="shift-subtitle-inc">
                        Aumento: P={incLabel.price}, Q={incLabel.quantity}
                    </div>
                ) : null}
                {decLabel ? (
                    <div className="shift-subtitle-dec">
                        Reduccion: P={decLabel.price}, Q={decLabel.quantity}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const MarketShiftBlock = ({ demand, supply, shift = 3 }) => {
    const [sectionRef, isTriggered] = useScrollTrigger(0.3);
    const sectionClassName = `blog-post-section shift-block reveal${
        isTriggered ? ' is-visible is-ready' : ''
    }`;

    return (
        <section className={sectionClassName} ref={sectionRef}>
            <span className="blog-block-eyebrow">Concepto 04</span>
            <h2>Desplazamientos de oferta y demanda</h2>
            <p>
                Cuando una curva se desplaza, cambia el precio y la cantidad de equilibrio. Observa como un
                aumento o una reduccion mueven el punto de equilibrio.
            </p>
            <div className="shift-grid">
                <ShiftPanel
                    title="Oferta"
                    moving="supply"
                    demand={demand}
                    supply={supply}
                    shift={shift}
                />
                <ShiftPanel
                    title="Demanda"
                    moving="demand"
                    demand={demand}
                    supply={supply}
                    shift={shift}
                />
            </div>
        </section>
    );
};

const DollarExampleBlock = ({ demand, supply }) => {
    const [sectionRef, isTriggered] = useScrollTrigger(0.3);
    const marketClipId = useRef(`dollar-market-${Math.random().toString(36).slice(2, 10)}`);
    const seriesClipId = useRef(`dollar-series-${Math.random().toString(36).slice(2, 10)}`);
    const demandAnimName = useRef(`dollar-demand-${Math.random().toString(36).slice(2, 10)}`);

    const dollarSeries = useMemo(
        () => [820, 860, 840, 900, 950, 910, 980, 930, 990, 960, 1020, 980],
        []
    );

    const marketLayout = useMemo(() => {
        const width = 360;
        const height = 220;
        const padding = 32;
        const quantities = [...demand, ...supply].map((row) => row.quantity);
        const prices = [...demand, ...supply].map((row) => row.price);
        const minQ = Math.min(...quantities);
        const maxQ = Math.max(...quantities);
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);

        const scaleX = (value) => {
            if (maxQ === minQ) return padding;
            const ratio = (value - minQ) / (maxQ - minQ);
            return padding + ratio * (width - padding * 2);
        };
        const scaleY = (value) => {
            if (maxP === minP) return height - padding;
            const ratio = (value - minP) / (maxP - minP);
            return height - padding - ratio * (height - padding * 2);
        };
        const buildPath = (rows) => {
            const points = [...rows]
                .sort((a, b) => a.quantity - b.quantity)
                .map((point) => ({
                    ...point,
                    x: scaleX(point.quantity),
                    y: scaleY(point.price)
                }));
            return points
                .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
                .join(' ');
        };

        return {
            width,
            height,
            padding,
            demandPath: buildPath(demand),
            supplyPath: buildPath(supply)
        };
    }, [demand, supply]);

    const seriesLayout = useMemo(() => {
        const width = 360;
        const height = 220;
        const padding = 32;
        const minValue = Math.min(...dollarSeries);
        const maxValue = Math.max(...dollarSeries);
        const scaleX = (index) => {
            if (dollarSeries.length === 1) return padding;
            const ratio = index / (dollarSeries.length - 1);
            return padding + ratio * (width - padding * 2);
        };
        const scaleY = (value) => {
            if (maxValue === minValue) return height - padding;
            const ratio = (value - minValue) / (maxValue - minValue);
            return height - padding - ratio * (height - padding * 2);
        };
        const path = dollarSeries
            .map((value, index) => {
                const x = scaleX(index);
                const y = scaleY(value);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');
        return { width, height, padding, path };
    }, [dollarSeries]);

    const sectionClassName = `blog-post-section dollar-example reveal${
        isTriggered ? ' is-visible is-ready' : ''
    }`;
    const demandKeyframes = useMemo(() => {
        const shiftRange = (marketLayout.width - marketLayout.padding * 2) * 0.18;
        const minValue = Math.min(...dollarSeries);
        const maxValue = Math.max(...dollarSeries);
        if (!Number.isFinite(shiftRange)) return '';
        const frames = dollarSeries.map((value, index) => {
            const percent = dollarSeries.length > 1
                ? (index / (dollarSeries.length - 1)) * 100
                : 0;
            const ratio = maxValue === minValue
                ? 0.5
                : (value - minValue) / (maxValue - minValue);
            const shift = (ratio - 0.5) * 2 * shiftRange;
            return `${percent.toFixed(2)}% { transform: translateX(${shift.toFixed(2)}px); }`;
        });
        return `@keyframes ${demandAnimName.current} { ${frames.join(' ')} }`;
    }, [dollarSeries, marketLayout]);

    const sectionStyle = {
        '--plot-width': `${seriesLayout.width - seriesLayout.padding * 2}px`
    };

    return (
        <section className={sectionClassName} ref={sectionRef} style={sectionStyle}>
            {demandKeyframes ? <style>{demandKeyframes}</style> : null}
            <span className="blog-block-eyebrow">Concepto 05</span>
            <h2>Ejemplo: precio del dolar en el tiempo</h2>
            <p>
                El precio varia con la demanda. La linea recorre la serie de tiempo y, en paralelo, la
                curva de demanda se desplaza para reflejar esos cambios.
            </p>
            <div className="dollar-grid">
                <div className="dollar-panel">
                    <div className="dollar-title">Oferta y demanda</div>
                    <svg
                        className="dollar-chart"
                        viewBox={`0 0 ${marketLayout.width} ${marketLayout.height}`}
                        role="img"
                        aria-label="Oferta y demanda del dolar"
                    >
                        <defs>
                            <clipPath id={marketClipId.current} clipPathUnits="userSpaceOnUse">
                                <rect
                                    x={marketLayout.padding}
                                    y={marketLayout.padding}
                                    width={marketLayout.width - marketLayout.padding * 2}
                                    height={marketLayout.height - marketLayout.padding * 2}
                                />
                            </clipPath>
                        </defs>
                        <line
                            x1={marketLayout.padding}
                            y1={marketLayout.height - marketLayout.padding}
                            x2={marketLayout.width - marketLayout.padding}
                            y2={marketLayout.height - marketLayout.padding}
                            className="dollar-axis"
                        />
                        <line
                            x1={marketLayout.padding}
                            y1={marketLayout.padding}
                            x2={marketLayout.padding}
                            y2={marketLayout.height - marketLayout.padding}
                            className="dollar-axis"
                        />
                        <g clipPath={`url(#${marketClipId.current})`}>
                            <path d={marketLayout.supplyPath} className="dollar-supply" />
                            <g
                                className="dollar-demand-shift"
                                style={{ animationName: demandAnimName.current }}
                            >
                                <path d={marketLayout.demandPath} className="dollar-demand" />
                            </g>
                        </g>
                    </svg>
                </div>
                <div className="dollar-panel">
                    <div className="dollar-title">Precio del dolar</div>
                    <svg
                        className="dollar-series-chart"
                        viewBox={`0 0 ${seriesLayout.width} ${seriesLayout.height}`}
                        role="img"
                        aria-label="Serie de tiempo del precio del dolar"
                    >
                        <defs>
                            <clipPath id={seriesClipId.current} clipPathUnits="userSpaceOnUse">
                                <rect
                                    x={seriesLayout.padding}
                                    y={seriesLayout.padding}
                                    width={seriesLayout.width - seriesLayout.padding * 2}
                                    height={seriesLayout.height - seriesLayout.padding * 2}
                                />
                            </clipPath>
                        </defs>
                        <line
                            x1={seriesLayout.padding}
                            y1={seriesLayout.height - seriesLayout.padding}
                            x2={seriesLayout.width - seriesLayout.padding}
                            y2={seriesLayout.height - seriesLayout.padding}
                            className="dollar-axis"
                        />
                        <line
                            x1={seriesLayout.padding}
                            y1={seriesLayout.padding}
                            x2={seriesLayout.padding}
                            y2={seriesLayout.height - seriesLayout.padding}
                            className="dollar-axis"
                        />
                        <g clipPath={`url(#${seriesClipId.current})`}>
                            <path d={seriesLayout.path} className="dollar-series-line" />
                            <line
                                x1={seriesLayout.padding}
                                y1={seriesLayout.padding}
                                x2={seriesLayout.padding}
                                y2={seriesLayout.height - seriesLayout.padding}
                                className="dollar-series-scan"
                            />
                        </g>
                    </svg>
                </div>
            </div>
        </section>
    );
};

const QuizChart = ({ type }) => {
    const width = 240;
    const height = 160;
    const pad = 24;
    const left = pad;
    const right = width - pad;
    const top = pad;
    const bottom = height - pad;
    const shift = 10;

    const supplyStartX = left + 14;
    const supplyStartY = bottom - 14;
    const supplyEndX = right - 18;
    const supplyEndY = top + 18;
    const demandStartX = left + 14;
    const demandStartY = top + 18;
    const demandEndX = right - 18;
    const demandEndY = bottom - 14;

    const supplyStart = { x: supplyStartX, y: supplyStartY };
    const supplyEnd = { x: supplyEndX, y: supplyEndY };
    const demandStart = { x: demandStartX, y: demandStartY };
    const demandEnd = { x: demandEndX, y: demandEndY };

    const supplyLine = `M ${supplyStartX} ${supplyStartY} L ${supplyEndX} ${supplyEndY}`;
    const demandLine = `M ${demandStartX} ${demandStartY} L ${demandEndX} ${demandEndY}`;
    const demandShift = `M ${demandStartX + shift} ${demandStartY} L ${demandEndX + shift} ${demandEndY}`;
    const supplyShift = `M ${supplyStartX + shift} ${supplyStartY} L ${supplyEndX + shift} ${supplyEndY}`;

    const lineIntersection = (a, b, c, d) => {
        const a1 = b.y - a.y;
        const b1 = a.x - b.x;
        const c1 = a1 * a.x + b1 * a.y;
        const a2 = d.y - c.y;
        const b2 = c.x - d.x;
        const c2 = a2 * c.x + b2 * c.y;
        const det = a1 * b2 - a2 * b1;
        if (det === 0) return null;
        return {
            x: (b2 * c1 - b1 * c2) / det,
            y: (a1 * c2 - a2 * c1) / det
        };
    };

    const eqBase = lineIntersection(supplyStart, supplyEnd, demandStart, demandEnd);

    const xAtY = (p1, p2, y) => {
        if (p2.y === p1.y) return null;
        const t = (y - p1.y) / (p2.y - p1.y);
        return p1.x + t * (p2.x - p1.x);
    };

    const minY = Math.min(supplyStartY, supplyEndY);
    const maxY = Math.max(supplyStartY, supplyEndY);
    const priceY = eqBase ? Math.min(maxY, Math.max(minY, eqBase.y - 18)) : minY + 12;
    const demandAtPriceX = xAtY(demandStart, demandEnd, priceY);
    const supplyAtPriceX = xAtY(supplyStart, supplyEnd, priceY);
    const gapLeft = demandAtPriceX !== null && supplyAtPriceX !== null
        ? Math.min(demandAtPriceX, supplyAtPriceX)
        : null;
    const gapRight = demandAtPriceX !== null && supplyAtPriceX !== null
        ? Math.max(demandAtPriceX, supplyAtPriceX)
        : null;

    if (type === 'supply-up') {
        return (
            <svg className="quiz-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Oferta aumenta">
                <line x1={left} y1={bottom} x2={right} y2={bottom} className="quiz-axis" />
                <line x1={left} y1={top} x2={left} y2={bottom} className="quiz-axis" />
                <path d={demandLine} className="quiz-demand" />
                <path d={supplyLine} className="quiz-supply" />
                <path d={supplyShift} className="quiz-supply quiz-shift" />
            </svg>
        );
    }

    if (type === 'surplus') {
        return (
            <svg className="quiz-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Precio alto">
                <line x1={left} y1={bottom} x2={right} y2={bottom} className="quiz-axis" />
                <line x1={left} y1={top} x2={left} y2={bottom} className="quiz-axis" />
                <path d={demandLine} className="quiz-demand" />
                <path d={supplyLine} className="quiz-supply" />
                {gapLeft !== null && gapRight !== null ? (
                    <>
                        <line x1={left} y1={priceY} x2={right} y2={priceY} className="quiz-price" />
                        <line x1={gapLeft} y1={priceY} x2={gapRight} y2={priceY} className="quiz-gap" />
                    </>
                ) : null}
            </svg>
        );
    }

    return (
        <svg className="quiz-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Demanda aumenta">
            <line x1={left} y1={bottom} x2={right} y2={bottom} className="quiz-axis" />
            <line x1={left} y1={top} x2={left} y2={bottom} className="quiz-axis" />
            <path d={supplyLine} className="quiz-supply" />
            <path d={demandLine} className="quiz-demand" />
            <path d={demandShift} className="quiz-demand quiz-shift" />
        </svg>
    );
};

const QuizBlock = () => {
    const [sectionRef, isTriggered] = useScrollTrigger(0.3);
    const [answers, setAnswers] = useState(() => quizItems.map(() => null));

    const handleSelect = (questionIndex, optionIndex) => {
        setAnswers((prev) => {
            const next = [...prev];
            if (next[questionIndex] !== null) return next;
            next[questionIndex] = optionIndex;
            return next;
        });
    };

    return (
        <section
            className={`blog-post-section quiz-section reveal${isTriggered ? ' is-visible' : ''}`}
            ref={sectionRef}
        >
            <span className="blog-block-eyebrow">Concepto 06</span>
            <h2>Mini quiz</h2>
            <p>Responde para ver la explicacion y el grafico.</p>
            <div className="quiz-stack">
                {quizItems.map((item, index) => {
                    const unlocked = index === 0 || answers[index - 1] !== null;
                    if (!unlocked) return null;
                    const selected = answers[index];
                    return (
                        <div key={item.id} className="quiz-card">
                            <div className="quiz-question">{item.question}</div>
                            <div className="quiz-options">
                                {item.options.map((option, optionIndex) => {
                                    const isSelected = selected === optionIndex;
                                    const showState = selected !== null;
                                    const isCorrect = optionIndex === item.correctIndex;
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            className={`quiz-option${
                                                isSelected ? ' is-selected' : ''
                                            }${showState && isCorrect ? ' is-correct' : ''}${
                                                showState && isSelected && !isCorrect ? ' is-wrong' : ''
                                            }`}
                                            onClick={() => handleSelect(index, optionIndex)}
                                            disabled={selected !== null}
                                        >
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                            {selected !== null ? (
                                <div className="quiz-answer">
                                    <div className="quiz-explanation">{item.explanation}</div>
                                    <QuizChart type={item.chart} />
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const BlogPostPriceCoordinator = () => {
    const [introRef, introVisible] = useScrollTrigger(0.25);

    return (
        <div className="container">
            <article className="blog-post">
                <header className="blog-post-header">
                    <a className="blog-post-back" href="/blog">Volver al blog</a>
                    <div className="blog-story-meta">
                        <span className="blog-tag">Serie 01</span>
                        <span className="blog-time">Lectura breve</span>
                    </div>
                    <h1 className="blog-post-title">El precio como coordinador</h1>
                    <p className="blog-post-lead">
                        El precio resume informacion dispersa: escasez, costos y valoraciones. Es el numero que
                        permite que millones de decisiones descentralizadas se coordinen sin un plan central.
                    </p>
                </header>

                <section className="blog-post-section">
                    <div className="blog-story-grid">
                        <div className="blog-story-card">
                            <h3>Precio</h3>
                            <p>La senal que ordena que se produce, cuanto y para quien.</p>
                        </div>
                        <div className="blog-story-card">
                            <h3>Demanda</h3>
                            <p>Cuanto estan dispuestos a comprar a cada precio.</p>
                        </div>
                        <div className="blog-story-card">
                            <h3>Oferta</h3>
                            <p>Cuanto estan dispuestos a vender a cada precio.</p>
                        </div>
                    </div>
                </section>

                <section
                    className={`blog-post-section reveal${introVisible ? ' is-visible' : ''}`}
                    ref={introRef}
                >
                    <p>
                        La tabla muestra pares (precio, cantidad). Al avanzar, los valores se unen, se convierten
                        en puntos y forman la curva para visualizar la relacion entre precio y cantidad.
                    </p>
                </section>

                <CurveAnimationBlock
                    rows={demandRows}
                    kicker="Concepto 01"
                    heading="Demanda: la pendiente negativa"
                    description="A mayor precio, menor cantidad demandada. Esta relacion inversa se ve en una tabla simple y luego toma forma como curva."
                    quantityLabel="Cantidad Demandada"
                    curveTitle="Curva de demanda"
                />
                <CurveAnimationBlock
                    rows={supplyRows}
                    kicker="Concepto 02"
                    heading="Oferta: la pendiente positiva"
                    description="A mayor precio, mayor cantidad ofrecida. La relacion directa se observa en una tabla y luego se convierte en curva."
                    quantityLabel="Cantidad Ofertada"
                    curveTitle="Curva de oferta"
                    curveColor="#facc15"
                />
            <EquilibriumBlock demand={demandRows} supply={supplyRows} />
            <MarketShiftBlock demand={demandRows} supply={supplyRows} shift={3} />
            <DollarExampleBlock demand={demandRows} supply={supplyRows} />
            <QuizBlock />
        </article>
            <Analytics />
            <SpeedInsights />
        </div>
    );
};

export default BlogPostPriceCoordinator;
