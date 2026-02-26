import React, { useEffect, useMemo, useRef, useState } from 'react';

const demandRows = [
    { price: 1, quantity: 9 },
    { price: 2, quantity: 7 },
    { price: 3, quantity: 5 },
    { price: 4, quantity: 3 },
    { price: 5, quantity: 1 }
];

const BlogSection = () => {
    const demandRef = useRef(null);
    const [demandActive, setDemandActive] = useState(false);

    useEffect(() => {
        const node = demandRef.current;
        if (!node) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setDemandActive(true);
                    }
                });
            },
            { threshold: 0.35 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const chartData = useMemo(
        () => [...demandRows].sort((a, b) => a.quantity - b.quantity),
        []
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

    return (
        <section id="blog" className="blog-section">
            <div className="blog-hero">
                <div className="blog-kicker">CHILECONOMICS</div>
                <h1 className="blog-title">Blog de divulgacion</h1>
                <p className="blog-subtitle">
                    Ideas economicas claras, visuales y directas. Primer paso: entender el precio como el
                    gran coordinador.
                </p>
            </div>

            <article className="blog-story">
                <div className="blog-story-meta">
                    <span className="blog-tag">Serie 01</span>
                    <span className="blog-time">Lectura breve</span>
                </div>
                <h2>El precio como coordinador</h2>
                <p>
                    El precio resume informacion dispersa: escasez, costos y valoraciones. Es el numero que
                    permite que millones de decisiones descentralizadas se coordinen sin un plan central.
                </p>
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
            </article>

            <div className="blog-blocks">
                <section
                    ref={demandRef}
                    className={`blog-block blog-demand ${demandActive ? 'is-active' : ''}`}
                >
                    <div className="blog-block-copy">
                        <span className="blog-block-eyebrow">Concepto 01</span>
                        <h3>Demanda: la pendiente negativa</h3>
                        <p>
                            A mayor precio, menor cantidad demandada. Esta relacion inversa se ve en una tabla
                            simple y luego toma forma como curva.
                        </p>
                        <div className="blog-table">
                            <div className="blog-table-header">
                                <span>Precio</span>
                                <span>Demanda</span>
                            </div>
                            <div className="blog-table-rows">
                                {demandRows.map((row, index) => (
                                    <div
                                        key={row.price}
                                        className="blog-table-row"
                                        style={{ transitionDelay: `${220 + index * 120}ms` }}
                                    >
                                        <span className="blog-table-price">{row.price}</span>
                                        <span className="blog-table-qty">{row.quantity}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="blog-table-note">Ejemplo: tomates por kilo.</div>
                        </div>
                    </div>
                    <div className="blog-block-visual">
                        <div className="blog-visual-header">
                            <span>Del dato al grafico</span>
                            <strong>Curva de demanda</strong>
                        </div>
                        <svg
                            className="blog-demand-chart"
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${chartLayout.width} ${chartLayout.height}`}
                            role="img"
                            aria-label="Curva de demanda basada en la tabla"
                        >
                            <defs>
                                <linearGradient id="demandGlow" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="var(--chart-neon)" stopOpacity="0.35" />
                                    <stop offset="100%" stopColor="var(--trend-up)" stopOpacity="0.05" />
                                </linearGradient>
                            </defs>
                            <rect
                                x="16"
                                y="16"
                                width={chartLayout.width - 32}
                                height={chartLayout.height - 32}
                                rx="16"
                                fill="url(#demandGlow)"
                                opacity="0.7"
                            />
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
                            {chartLayout.points.map((point, index) => (
                                <circle
                                    key={`${point.price}-${point.quantity}`}
                                    className="demand-point"
                                    cx={point.x}
                                    cy={point.y}
                                    r="5"
                                    style={{ transitionDelay: `${540 + index * 120}ms` }}
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
                </section>
            </div>
        </section>
    );
};

export default BlogSection;
