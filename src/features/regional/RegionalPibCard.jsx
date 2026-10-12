import TrendChart from '../../shared/components/TrendChart';
import { formatNumber } from '../../shared/utils/format';

const RANGES = [
    { id: '1a', label: '1A' },
    { id: '2a', label: '2A' },
    { id: '5a', label: '5A' },
    { id: 'all', label: 'Todo' }
];

// PIB real (nacional o de la región elegida). Toda la tarjeta abre la tabla de datos.
const RegionalPibCard = ({ view, theme, onOpenTable, onOpenActivities }) => {
    const { pib, regionId, timeRange, setTimeRange } = view;
    const stop = (handler) => (event) => {
        event.stopPropagation();
        handler();
    };

    return (
        <div
            className="regional-pib-card is-clickable"
            role="button"
            tabIndex={0}
            onClick={onOpenTable}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenTable();
                }
            }}
        >
            <div className="regional-pib-header">
                <div>
                    <div className="regional-pib-label">PIB Real (Cuentas Nacionales)</div>
                    <div className="regional-pib-value">{pib.value}</div>
                    <div
                        className="regional-pib-trend"
                        style={{ color: pib.trend === 'up' ? 'var(--trend-up)' : 'var(--trend-down)' }}
                    >
                        {pib.variation} YoY
                        <span className="regional-pib-trend-note"> (Último dato)</span>
                    </div>
                </div>

                <div className="regional-pib-actions">
                    <div className="regional-range">
                        {RANGES.map((range) => (
                            <button
                                key={range.id}
                                type="button"
                                className={`regional-range-button${timeRange === range.id ? ' is-active' : ''}`}
                                onClick={stop(() => setTimeRange(range.id))}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="regional-download"
                        onClick={stop(onOpenActivities)}
                        disabled={!regionId}
                    >
                        Por actividad
                    </button>
                </div>
            </div>

            <div className="regional-pib-chart">
                <TrendChart
                    data={pib.chartData}
                    color="#f97316"
                    height={120}
                    valueFormatter={(value) => `${formatNumber(value, 1)} MM`}
                    theme={theme}
                />
                {pib.startLabel || pib.endLabel ? (
                    <div className="regional-pib-range-labels">
                        <span>{pib.startLabel}</span>
                        <span>{pib.endLabel}</span>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default RegionalPibCard;
