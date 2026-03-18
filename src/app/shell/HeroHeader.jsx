import React from 'react';

const HeroHeader = ({ children }) => (
    <header className="hero-header">
        <h1 className="hero-title">CHILECONOMICS</h1>
        <p className="hero-subtitle">
            ECONOMÍA. DATOS.
        </p>
        {children}
    </header>
);

export default HeroHeader;
