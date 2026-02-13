import React from 'react';

const ContactSection = () => (
    <section className="placeholder-section">
        <div className="placeholder-hero">
            <div className="placeholder-kicker">CHILECONOMICS</div>
            <h1 className="placeholder-title">Contacto</h1>
            <p className="placeholder-subtitle">
                Estamos preparando un centro de contacto con redes sociales y boletines.
            </p>
        </div>
        <div className="placeholder-grid">
            <article className="placeholder-card">
                <div className="placeholder-card-title">Correo oficial</div>
                <a className="placeholder-email" href="mailto:contacto@chileconomics.cl">
                    contacto@chileconomics.cl
                </a>
            </article>
            <article className="placeholder-card">
                <div className="placeholder-card-header">
                    <div className="placeholder-card-title">Redes sociales</div>
                    <span className="placeholder-badge">PROXIMAMENTE</span>
                </div>
                <p className="placeholder-card-text">
                    En esta sección aparecerán los accesos oficiales a redes.
                </p>
            </article>
        </div>
    </section>
);

export default ContactSection;
