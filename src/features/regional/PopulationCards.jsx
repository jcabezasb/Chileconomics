import { formatNumber } from '../../shared/utils/format';

const latestValue = (series) => (series?.length ? formatNumber(series[series.length - 1].value, 1) : '...');

const SPLIT = [
    { key: 'hombres', label: 'Hombres', color: '#3b82f6' },
    { key: 'mujeres', label: 'Mujeres', color: '#ec4899' }
];

// Población total y por sexo (INE).
const PopulationCards = ({ population, onOpenTable }) => {
    const hasData = ['total', 'hombres', 'mujeres'].some((key) => population[key]?.length);

    return (
        <div className="regional-pop-grid">
            <div className="regional-pop-total">
                <div>
                    <div className="regional-pop-header">
                        <div className="regional-pop-label">Población Total (INE)</div>
                        <button type="button" className="regional-download" onClick={onOpenTable} disabled={!hasData}>
                            Mas detalles
                        </button>
                    </div>
                    <div className="regional-pop-value">{latestValue(population.total)}</div>
                </div>
                <div className="regional-pop-meta">
                    <div className="regional-pop-source">Fuente: INE Cine</div>
                    <div className="regional-pop-updated">Actualizado 2024</div>
                </div>
            </div>

            {SPLIT.map(({ key, label, color }) => (
                <div key={key} className="regional-pop-card">
                    <div className="regional-pop-card-label">
                        <span className="regional-pop-dot" style={{ background: color }}></span>
                        {label}
                    </div>
                    <div className="regional-pop-card-value">{latestValue(population[key])}</div>
                </div>
            ))}
        </div>
    );
};

export default PopulationCards;
