import TrendChart from '../../shared/components/TrendChart';
import { REGION_SHORT_NAME_BY_ID } from '../../shared/constants/regions';
import { formatNumber } from '../../shared/utils/format';
import { formatGrowth } from './useRegionalView';
import { formatMillions } from './regionalTables';

// '2026-04-01' -> '2T 2026'
const quarterLabel = (date) => `${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}T ${date.slice(0, 4)}`;

// PIB per cápita (año móvil): valor, variación real y posición entre regiones.
const PerCapitaCard = ({ view, theme, onOpenRanking }) => {
    const { regionId, perCapita } = view;
    const { selected, history, ranking, extremes } = perCapita;

    return (
        <div className="regional-pib-card regional-percapita-card">
            <div className="regional-pib-header">
                <div>
                    <div className="regional-pib-label">
                        PIB per cápita
                        {selected?.date ? (
                            <span className="regional-pib-trend-note"> · año móvil al {quarterLabel(selected.date)}</span>
                        ) : null}
                    </div>
                    <div className="regional-percapita-value">
                        {formatMillions(selected?.value)}
                        <span className="regional-percapita-unit"> por habitante</span>
                    </div>
                    {Number.isFinite(selected?.growth) ? (
                        <div
                            className="regional-pib-trend"
                            style={{ color: selected.growth >= 0 ? 'var(--trend-up)' : 'var(--trend-down)' }}
                        >
                            {formatGrowth(selected.growth)} real a/a
                        </div>
                    ) : null}
                    <div className="regional-percapita-context">
                        {regionId && selected?.rank ? (
                            <>
                                <strong>#{selected.rank}</strong> de {ranking.rows.length} regiones
                                {ranking.average ? ` · ${formatNumber(selected.value / ranking.average, 2)}× el promedio regional` : ''}
                            </>
                        ) : extremes ? (
                            <>
                                Promedio regional {formatMillions(ranking.average)} · mayor en {REGION_SHORT_NAME_BY_ID[extremes.max.regionId]}
                            </>
                        ) : null}
                    </div>
                </div>
                <div className="regional-pib-actions">
                    <button
                        type="button"
                        className="regional-download"
                        onClick={onOpenRanking}
                        disabled={!ranking.rows.length}
                    >
                        Ranking
                    </button>
                </div>
            </div>
            {history.length ? (
                <>
                    <TrendChart
                        data={history}
                        color="#22d3ee"
                        height={80}
                        valueFormatter={formatMillions}
                        averageFormatter={(value) => `$${formatNumber(value / 1e6, 1)}M`}
                        theme={theme}
                    />
                    <div className="regional-labor-range">
                        <span>{history[0].date.slice(0, 4)}</span>
                        <span>{history[history.length - 1].date.slice(0, 4)}</span>
                    </div>
                </>
            ) : null}
        </div>
    );
};

export default PerCapitaCard;
