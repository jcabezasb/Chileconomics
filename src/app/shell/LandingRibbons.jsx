import React from 'react';

const RIBBONS = [
    {
        id: 'datos',
        title: 'Datos',
        accent: 'var(--chart-neon)'
    },
    {
        id: 'blog',
        title: 'Blog',
        accent: 'var(--trend-up)'
    },
    {
        id: 'videos',
        title: 'Videos',
        accent: '#f59e0b'
    },
    {
        id: 'contacto',
        title: 'Contacto',
        accent: 'var(--map-fill-selected)'
    },
    {
        id: 'desarrollo',
        title: 'Otros',
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
                        <span className="landing-ribbon-title">{ribbon.title}</span>
                    </button>
                );
            })}
        </div>
    </section>
);

export default LandingRibbons;
