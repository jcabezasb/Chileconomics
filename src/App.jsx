import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import MacroMap from './components/Overview/MacroMap';
import MacroCard from './components/Overview/MacroCard'; // Import new component
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



    return (
        <div className="container">
            <header style={{ padding: '2rem 0', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Chileconomics</h1>
                <p style={{ fontSize: '1rem', maxWidth: '600px', margin: '0 auto', color: 'var(--text-secondary)' }}>
                    Monitor macroeconómico de la actividad chilena.
                </p>
            </header>

            {/* Main Scrollytelling Sections */}
            <section className="overview-section" style={{ paddingBottom: '4rem' }}>
                <h2 style={{ marginBottom: '2rem' }}>Vistazo General</h2>

                <div className="dashboard-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(250px, 1fr) 2.5fr',
                    gap: '1.5rem',
                    alignItems: 'stretch' // Ensure they match height
                }}>
                    {/* Column 1: Map */}
                    <div className="map-column">
                        <MacroMap onRegionSelect={(reg) => console.log(reg)} />
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
                                <MacroCard key={ind.id} indicator={ind} />
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
