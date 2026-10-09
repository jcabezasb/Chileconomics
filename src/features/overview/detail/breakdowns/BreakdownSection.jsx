// Contenedor "Desglose" bajo el gráfico principal.
const BreakdownSection = ({ children }) => (
    <section className="detail-section">
        <div className="detail-section-heading">
            <h3 className="detail-section-title">Desglose</h3>
            <span className="detail-section-note">Mismo período y unidad que el gráfico principal</span>
        </div>
        <div className="detail-grid">{children}</div>
    </section>
);

export default BreakdownSection;
