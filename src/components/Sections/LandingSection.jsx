import React from 'react';

const LANDING_ENTRIES = [
    {
        id: 'datos',
        title: 'Datos',
        description: 'Indicadores macro, mapas regionales y series con contexto para decisiones rapidas.',
        cta: 'Explorar datos'
    },
    {
        id: 'blog',
        title: 'Blog',
        description: 'Notas breves con lecturas guiadas y visualizaciones sobre la economia chilena.',
        cta: 'Ver articulos'
    },
    {
        id: 'videos',
        title: 'Videos',
        description: 'Contenido audiovisual para explicar conceptos, entrevistas y analisis.',
        cta: 'Ir a videos',
        badge: 'Proximamente'
    },
    {
        id: 'contacto',
        title: 'Contacto',
        description: 'Colabora, sugiere temas o solicita datos especificos para tu proyecto.',
        cta: 'Contactar'
    },
    {
        id: 'desarrollo',
        title: 'Desarrollo',
        description: 'Roadmap de mejoras visuales, nuevas funciones y siguientes entregas.',
        cta: 'Ver avances'
    }
];

const LandingSection = ({ sectionRef, onSelectSection }) => (
    <section
        id="inicio"
        className="landing-section reveal reveal-delay-1"
        data-reveal-once="true"
        ref={sectionRef}
    >
        <div className="landing-intro">
            <p className="landing-kicker">Explora</p>
            <h2 className="landing-title">Entradas rapidas a cada seccion</h2>
            <p className="landing-subtitle">
                Selecciona una tarjeta para ir directo al contenido que buscas.
            </p>
        </div>
        <div className="landing-grid">
            {LANDING_ENTRIES.map((entry) => (
                <button
                    key={entry.id}
                    type="button"
                    className="landing-card"
                    onClick={() => onSelectSection(entry.id)}
                    aria-label={entry.title}
                >
                    <div className="landing-card-top">
                        <span className="landing-card-title">{entry.title}</span>
                        {entry.badge ? (
                            <span className="landing-card-badge">{entry.badge}</span>
                        ) : null}
                    </div>
                    <p className="landing-card-text">{entry.description}</p>
                    <span className="landing-card-cta">{entry.cta}</span>
                </button>
            ))}
        </div>
        <div className="landing-note">
            <p className="landing-note-text">
                Chileconomics nace para acercar datos economicos oficiales en un formato claro y accesible.
                En Datos reunimos indicadores macro, series y mapas regionales para entender el pulso del pais.
                En el Blog publicamos notas breves con contexto, explicaciones y visualizaciones guiadas.
                En Videos iremos sumando entrevistas y explicaciones cortas para aprender mas rapido.
                Todo con foco en mejorar la lectura de la economia y apoyar decisiones informadas.
            </p>
        </div>
    </section>
);

export default LandingSection;
