import React from 'react';

const RIBBONS = [
    {
        id: 'datos',
        kicker: 'Series oficiales',
        title: 'Datos macro y regionales',
        description: 'Indicadores clave, series historicas y comparaciones en contexto.',
        cta: 'Explorar datos',
        accent: 'var(--chart-neon)'
    },
    {
        id: 'blog',
        kicker: 'Lectura guiada',
        title: 'Blog de analisis',
        description: 'Notas breves para explicar los movimientos del momento.',
        cta: 'Ir al blog',
        accent: 'var(--trend-up)'
    },
    {
        id: 'videos',
        kicker: 'Multimedia',
        title: 'Videos explicativos',
        description: 'Resumenes rapidos, entrevistas y visualizaciones en pantalla.',
        cta: 'Ver videos',
        accent: '#f59e0b'
    },
    {
        id: 'contacto',
        kicker: 'Colaboraciones',
        title: 'Contacto directo',
        description: 'Comparte ideas, solicita series o coordina un analisis.',
        cta: 'Contactar',
        accent: 'var(--map-fill-selected)'
    },
    {
        id: 'desarrollo',
        kicker: 'Roadmap',
        title: 'En desarrollo',
        description: 'Funciones nuevas, ajustes visuales y mejoras continuas.',
        cta: 'Ver avance',
        accent: 'var(--trend-neutral)'
    }
];

const LandingRibbons = ({ activeSection, onSelectSection, sectionRef }) => (
    <section
        className="landing-ribbons landing-reveal"
        aria-label="Accesos principales"
        ref={sectionRef}
    >
        <div className="landing-ribbon-list">
            {RIBBONS.map((ribbon) => {
                const isActive = activeSection === ribbon.id;
                return (
                    <button
                        key={ribbon.id}
                        type="button"
                        className={`landing-ribbon ${isActive ? 'is-active' : ''}`}
                        style={{ '--ribbon-accent': ribbon.accent }}
                        onClick={() => onSelectSection(ribbon.id)}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <div className="landing-ribbon-copy">
                            <span className="landing-ribbon-kicker">{ribbon.kicker}</span>
                            <h2 className="landing-ribbon-title">{ribbon.title}</h2>
                            <p className="landing-ribbon-text">{ribbon.description}</p>
                        </div>
                        <span className="landing-ribbon-cta">{ribbon.cta}</span>
                    </button>
                );
            })}
        </div>
    </section>
);

export default LandingRibbons;
