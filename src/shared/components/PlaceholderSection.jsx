import React from 'react';

const PlaceholderSection = ({ title, subtitle, items }) => (
    <section className="placeholder-section">
        <div className="placeholder-hero">
            <div className="placeholder-kicker">CHILECONOMICS</div>
            <h1 className="placeholder-title">{title}</h1>
            <p className="placeholder-subtitle">{subtitle}</p>
        </div>
        <div className="placeholder-grid">
            {items.map((item) => (
                <article key={item.title} className="placeholder-card">
                    <div className="placeholder-card-header">
                        <div className="placeholder-card-title">{item.title}</div>
                        {item.badge ? (
                            <span className="placeholder-badge">{item.badge}</span>
                        ) : null}
                    </div>
                    {item.meta ? (
                        <div className="placeholder-card-meta">{item.meta}</div>
                    ) : null}
                    {item.description ? (
                        <p className="placeholder-card-text">{item.description}</p>
                    ) : null}
                </article>
            ))}
        </div>
    </section>
);

export default PlaceholderSection;
