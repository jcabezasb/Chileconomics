

const DevelopmentSection = ({ items }) => (
    <section className="placeholder-section">
        <div className="placeholder-hero">
            <div className="placeholder-kicker">CHILECONOMICS</div>
            <h1 className="placeholder-title">En desarrollo</h1>
            <p className="placeholder-subtitle">
                Secciones que vienen en Chileconomics.
            </p>
        </div>
        <div className="development-panel">
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
