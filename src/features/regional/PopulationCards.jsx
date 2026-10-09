import { formatNumber } from '../../shared/utils/format';

// Las series de población del INE incluyen proyecciones hasta 2035 (regiones) o 2070 (país):
// se muestra el dato del año en curso, no el último de la serie.
const currentYearEntry = (series) => {
    const year = String(new Date().getFullYear());
    const upToNow = (series || []).filter((entry) => entry.date.slice(0, 4) <= year);
    return upToNow[upToNow.length - 1] || null;
};

const SPLIT = [
    { key: 'hombres', label: 'Hombres', color: '#3b82f6' },
    { key: 'mujeres', label: 'Mujeres', color: '#ec4899' }
];

// Población total y por sexo (INE).
const PopulationCards = ({ population, onOpenTable }) => {
    const hasData = ['total', 'hombres', 'mujeres'].some((key) => population[key]?.length);
    const total = currentYearEntry(population.total);
    const show = (series) => {
        const entry = currentYearEntry(series);
        return entry ? formatNumber(entry.value, 0) : '...';
    };

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
                    <div className="regional-pop-value">{show(population.total)}</div>
                </div>
                <div className="regional-pop-meta">
                    <div className="regional-pop-source">Fuente: INE, proyecciones de población</div>
                    {total ? <div className="regional-pop-updated">Año {total.date.slice(0, 4)}</div> : null}
                </div>
            </div>

            {SPLIT.map(({ key, label, color }) => (
                <div key={key} className="regional-pop-card">
                    <div className="regional-pop-card-label">
                        <span className="regional-pop-dot" style={{ background: color }}></span>
                        {label}
                    </div>
                    <div className="regional-pop-card-value">{show(population[key])}</div>
                </div>
            ))}
        </div>
    );
};

export default PopulationCards;
