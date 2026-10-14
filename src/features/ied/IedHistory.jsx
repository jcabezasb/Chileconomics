import { formatNumber } from '../../shared/utils/format';
import { sparkline } from './iedLayout';

const WIDTH = 240;
const HEIGHT = 56;

// Minigráfico del stock año a año. El año elegido va marcado; tocar un punto cambia de año.
const IedHistory = ({ history, year, onChooseYear }) => {
    const { points, line, area } = sparkline(history.map((point) => point.value), WIDTH, HEIGHT);
    if (points.length < 2) return null;
    const first = history[0].year;
    const last = history[history.length - 1].year;

    return (
        <div className="ied-history">
            <svg viewBox={`-4 -4 ${WIDTH + 8} ${HEIGHT + 8}`} role="img" aria-label={`Evolución del stock entre ${first} y ${last}`}>
                <path className="ied-history-area" d={area} />
                <path className="ied-history-line" d={line} />
                {points.map((point, index) => {
                    const entry = history[index];
                    const isCurrent = entry.year === year;
                    return (
                        <g key={entry.year} className="ied-history-point" onClick={() => onChooseYear(entry.year)}>
                            <title>{`${entry.year}: US$ ${formatNumber(entry.value, 0)} millones`}</title>
                            <circle className="ied-history-hit" cx={point.x} cy={point.y} r={8} />
                            <circle className={`ied-history-dot${isCurrent ? ' is-current' : ''}`} cx={point.x} cy={point.y} r={isCurrent ? 4 : 2} />
                        </g>
                    );
                })}
            </svg>
            <div className="ied-history-axis">
                <span>{first}</span>
                <span>{last}</span>
            </div>
        </div>
    );
};

export default IedHistory;
