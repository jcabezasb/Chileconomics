import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import MacroMap from './components/Overview/MacroMap';
import MacroCard from './components/Overview/MacroCard';
import CompactIndicator from './components/Overview/CompactIndicator';
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

    // Mock data for side indicators (matching reference image)
    const sideIndicators = [
        { id: 'pib', title: 'PIB', value: '254,5 MM USD', variation: '+1,2%', trend: 'up' },
        { id: 'dolar_clp', title: 'USD/CLP', value: '940,5', variation: '+1,2%', trend: 'up' },
        { id: 'consumo', title: 'Consumo', value: '+3,4%', variation: '', trend: 'up' },
        { id: 'inversion', title: 'Inversión', value: '-5,2%', variation: '', trend: 'down' },
        { id: 'exportaciones', title: 'Exportaciones', value: '89,3 MM USD', variation: '', trend: 'up' },
        { id: 'importaciones', title: 'Importaciones', value: '75,1 MM USD', variation: '', trend: 'up' },
    ];

    // Chart indicators
    const chartIndicators = indicators.filter(ind =>
        ['ipc', 'dolar', 'cobre', 'desempleo'].includes(ind.id)
    );

    return (
        <div className="container">
            <header className="hero-header">
                <h1 className="hero-title">CHILECONOMICS</h1>
            </header>

            <section className="overview-section" style={{ paddingBottom: '4rem' }}>
                {/* Main Grid: 3 columns - [Map + Cards] | Charts (2x2) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: '1rem',
                    height: '550px'
                }}>
                    {/* Column 1: Map + Indicator Cards (UNIFIED BOX) */}
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gridRow: 'span 2'
                    }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Mapa de Chile</h3>
                        <div style={{
                            display: 'flex',
                            gap: '0.4rem',
                            marginBottom: '1rem',
                            flexWrap: 'wrap'
                        }}>
                            <button style={{
                                background: 'var(--accent)',
                                color: 'white',
                                border: 'none',
                                padding: '0.35rem 0.7rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                cursor: 'pointer'
                            }}>PIB</button>
                            <button style={{
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                                padding: '0.35rem 0.7rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                cursor: 'pointer'
                            }}>Crecimiento</button>
                            <button style={{
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                                padding: '0.35rem 0.7rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                cursor: 'pointer'
                            }}>Exportaciones</button>
                        </div>

                        {/* Map + Cards side by side inside the same box */}
                        <div style={{
                            display: 'flex',
                            gap: '1.5rem',
                            flex: 1,
                            alignItems: 'stretch'
                        }}>
                            {/* Map */}
                            <div style={{ flex: '0 0 40%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <MacroMap onRegionSelect={(reg) => console.log(reg)} />
                            </div>

                            {/* Cards */}
                            <div style={{
                                flex: 1,
                                display: 'grid',
                                gridTemplateRows: 'repeat(6, minmax(0, 1fr))',
                                gap: '0.4rem'
                            }}>
                                {sideIndicators.map(ind => (
                                    <CompactIndicator key={ind.id} indicator={ind} />
                                ))}
                            </div>
                        </div>

                        <p style={{
                            margin: '0.75rem 0 0 0',
                            fontSize: '0.65rem',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic'
                        }}>Datos Nacionales</p>
                    </div>

                    {/* Columns 2-3: 4 Charts in 2x2 grid */}
                    {chartIndicators.slice(0, 2).map(ind => (
                        <MacroCard key={ind.id} indicator={ind} />
                    ))}
                    {chartIndicators.slice(2, 4).map(ind => (
                        <MacroCard key={ind.id} indicator={ind} />
                    ))}
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
