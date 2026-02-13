import React from 'react';

const DevelopmentSection = ({ items }) => (
    <section className="placeholder-section">
        <div className="placeholder-hero">
            <div className="placeholder-kicker">CHILECONOMICS</div>
            <h1 className="placeholder-title">En desarrollo</h1>
            <p className="placeholder-subtitle">
                Checklist interno para seguir el avance y mantener foco en lo prioritario.
            </p>
        </div>
        <div className="placeholder-grid">
            <article className="placeholder-card">
                <div className="placeholder-card-header">
                    <div className="placeholder-card-title">Checklist interno</div>
                    <span className="placeholder-badge">PROXIMAMENTE</span>
                </div>
                <p className="placeholder-card-text">
                    Esta lista se activara cuando se habilite la vista interna.
                </p>
            </article>
        </div>
        <div className="development-panel is-hidden">
            {items.map((item) => (
                <label key={item.id} className={`development-item ${item.done ? 'is-done' : ''}`}>
                    <input type="checkbox" checked={item.done} readOnly />
                    <span>{item.label}</span>
                </label>
            ))}
        </div>
    </section>
);

export default DevelopmentSection;
