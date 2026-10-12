import { memo } from 'react';
import TrendChart from '../../shared/components/TrendChart';
import { formatShortDate } from '../../shared/utils/format';
import useIndicatorSeries from './useIndicatorSeries';
import { formatIndicatorValue } from './indicatorFormat';
import '../../styles/indicatorCard.css';

const RANGE_OPTIONS = [
    { id: '1y', label: '1A' },
    { id: '2y', label: '2A' },
    { id: '5y', label: '5A' },
    { id: 'all', label: 'Todo' }
];

// Tarjeta de un indicador en la grilla de Datos. `featured` es la tarjeta grande (IMACEC).
// Al hacer clic abre la vista de detalle (onOpen).
const IndicatorCard = ({ indicator, theme, onOpen, featured = false }) => {
    const { displayData, timeRange, setTimeRange } = useIndicatorSeries(indicator.id);
    const format = (value) => formatIndicatorValue(indicator.id, value);
    const open = () => onOpen?.(indicator);
    const trendClass = indicator.trend === 'up' || indicator.trend === 'down' ? ` is-${indicator.trend}` : '';

    return (
        <div
            className={`indicator-card${featured ? ' indicator-card--featured' : ''}`}
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open();
                }
            }}
        >
            <div className="indicator-card-header">
                <div>
                    <span className="indicator-card-title">{indicator.title}</span>
                    {indicator.subtitle ? <div className="indicator-card-subtitle">({indicator.subtitle})</div> : null}
                </div>
                <div className="indicator-card-ranges">
                    {RANGE_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={`indicator-card-range${timeRange === option.id ? ' is-active' : ''}`}
                            aria-pressed={timeRange === option.id}
                            onClick={(event) => {
                                event.stopPropagation();
                                setTimeRange(option.id);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className="indicator-card-values">
                    <span className="indicator-card-value">{indicator.value}</span>
                    {indicator.variation ? (
                        <span className={`indicator-card-variation${indicator.id === 'imacec' ? ' is-small' : ''}${trendClass}`}>
                            ({indicator.variation})
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="indicator-card-chart">
                <TrendChart
                    data={displayData}
                    color="var(--chart-neon)"
                    height={featured ? 260 : 110}
                    averageFormatter={format}
                    valueFormatter={format}
                    theme={theme}
                />
                {displayData.length ? (
                    <span className="indicator-card-edge is-start">{formatShortDate(displayData[0].date)}</span>
                ) : null}
                {indicator.period ? <span className="indicator-card-edge is-end">{indicator.period}</span> : null}
            </div>
        </div>
    );
};

export default memo(IndicatorCard);
