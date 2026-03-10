import React from 'react';

const HeroHeader = ({ hasScrolled }) => (
    <header
        className={`hero-header ${hasScrolled ? 'is-scrolled' : ''}`}
        style={{ position: 'relative' }}
    >
        <h1 className="hero-title">CHILECONOMICS</h1>
        <p className="hero-subtitle">
            ECONOMÍA - DATOS
        </p>
    </header>
);

export default HeroHeader;
