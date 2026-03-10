import React from 'react';

const SECTIONS = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'datos', label: 'Datos' },
    { id: 'blog', label: 'Blog' },
    { id: 'videos', label: 'Videos' },
    { id: 'contacto', label: 'Contacto' },
    { id: 'desarrollo', label: 'En desarrollo' }
];

const TopNav = ({
    theme,
    onToggleTheme,
    activeSection,
    onSelectSection,
    isVisible
}) => {

    return (
        <div className={`top-nav ${isVisible ? 'is-visible' : ''}`}>
            <div className="top-nav-inner">
                <nav className="top-nav-links" aria-label="Secciones">
                    {SECTIONS.map((section) => {
                        const isActive = activeSection === section.id;
                        return (
                            <button
                                key={section.id}
                                type="button"
                                className={`top-nav-link ${isActive ? 'is-active' : ''}`}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => onSelectSection(section.id)}
                            >
                                {section.label}
                            </button>
                        );
                    })}
                </nav>
                <button
                    className="theme-toggle"
                    onClick={onToggleTheme}
                    aria-label="Alternar modo oscuro"
                >
                    <span style={{ fontWeight: 600 }}>{theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}</span>
                    <span
                        style={{
                            width: '30px',
                            height: '16px',
                            borderRadius: '999px',
                            background: theme === 'dark' ? 'rgba(168, 85, 247, 0.5)' : 'rgba(31, 42, 90, 0.16)',
                            border: '1px solid var(--border)',
                            position: 'relative',
                            display: 'inline-block'
                        }}
                    >
                        <span
                            style={{
                                position: 'absolute',
                                top: '1px',
                                left: theme === 'dark' ? '14px' : '2px',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: theme === 'dark' ? '#a855f7' : 'var(--chart-neon)',
                                transition: 'left 0.2s ease'
                            }}
                        />
                    </span>
                </button>
            </div>
        </div>
    );
};

export default TopNav;
