import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import MacroMap from './components/Overview/MacroMap';
import { getKeyIndicators } from './services/api';
import './styles/global.css';

function App() {
    const [indicators, setIndicators] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getKeyIndicators().then(data => {
            setIndicators(data);
            setLoading(false);
        });
    }, []);

    const getTrendIcon = (trend) => {
        if (trend === 'up') return <TrendingUp size={16} className="text-up" />;
        if (trend === 'down') return <TrendingDown size={16} className="text-down" />;
        return <Minus size={16} className="text-neutral" />;
    };

    return (
        <div className="container">
            <header style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Chileconomics</h1>
                <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                    Monitor macroeconómico de la actividad chilena. Datos oficiales en tiempo real.
                </p>
            </header>

            {/* Main Scrollytelling Sections */}
            <section className="overview-section" style={{ minHeight: '80vh' }}>
                <h2 style={{ marginBottom: '2rem' }}>Vistazo General</h2>

                <div className="dashboard-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '3rem',
                    alignItems: 'start'
                }}>
                    {/* Column 1: Map */}
                    <div className="map-column">
                        <MacroMap onRegionSelect={(reg) => console.log(reg)} />
                        <p style={{ marginTop: '1rem', fontSize: '0.8rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Seleccione una región para ver detalles locales
                        </p>
                    </div>

                    {/* Column 2: Indicators Grid */}
                    <div className="cards-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '1.5rem',
                    }}>
                        {loading ? (
                            <p>Cargando indicadores...</p>
                        ) : (
                            indicators.map(ind => (
                                <div key={ind.id} style={{
                                    background: 'var(--bg-card)',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    boxShadow: 'var(--shadow-md)',
                                    border: '1px solid var(--border)',
                                    transition: 'transform 0.2s',
                                    cursor: 'default',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    minHeight: '140px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{ind.title}</span>
                                        {getTrendIcon(ind.trend)}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-brand)' }}>{ind.value}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: "space-between", alignItems: "center", marginTop: "0.2rem" }}>
                                            <span style={{ fontSize: '0.9rem', color: ind.trend === 'up' ? 'var(--trend-up)' : ind.trend === 'down' ? 'var(--trend-down)' : 'var(--text-secondary)' }}>
                                                {ind.variation}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {ind.period}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Placeholder for subsequent sections */}
            <section style={{ padding: '4rem 0', borderTop: '1px solid var(--border)', marginTop: '4rem' }}>
                {/* More content will go here */}
            </section>
        </div>
    );
}

export default App;
