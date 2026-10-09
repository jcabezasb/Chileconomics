import TrendChart from '../../shared/components/TrendChart';
import { formatMonthLabelDash } from '../../shared/utils/format';

// Fuerza de trabajo, ocupados y tasa de desocupación (región elegida o suma nacional).
const LaborCards = ({ cards, theme, onOpenTable }) => (
    <div className="regional-labor-grid">
        {cards.map((card) => {
            const latest = card.series.length ? card.series[card.series.length - 1].value : null;
            const { chartData } = card;
            return (
                <div key={card.id} className="regional-labor-card">
                    <div className="regional-labor-header">
                        <div className="regional-labor-label">{card.title}</div>
                        <button
                            type="button"
                            className="regional-download"
                            onClick={() => onOpenTable(card)}
                            disabled={!chartData.length}
                        >
                            Mas detalles
                        </button>
                    </div>
                    <div className="regional-labor-value">
                        {latest === null ? '--' : card.valueFormatter(latest)}
                        <span className="regional-labor-unit">{card.unit}</span>
                    </div>
                    {chartData.length ? (
                        <>
                            <TrendChart
                                data={chartData}
                                color={card.color}
                                height={70}
                                averageFormatter={card.averageFormatter}
                                valueFormatter={card.formatter}
                                theme={theme}
                            />
                            <div className="regional-labor-range">
                                <span>{formatMonthLabelDash(chartData[0].date)}</span>
                                <span>{formatMonthLabelDash(chartData[chartData.length - 1].date)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="regional-labor-empty">Sin datos disponibles.</div>
                    )}
                </div>
            );
        })}
    </div>
);

export default LaborCards;
