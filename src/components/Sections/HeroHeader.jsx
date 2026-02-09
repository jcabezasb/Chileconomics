import React from 'react';

const HeroHeader = ({ theme, onToggleTheme }) => (
    <header className="hero-header" style={{ position: 'relative' }}>
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
        <h1 className="hero-title">CHILECONOMICS</h1>
        <p className="hero-subtitle">
            ECONOMÍA. DATOS.
        </p>
    </header>
);

export default HeroHeader;
