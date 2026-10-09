import { useState } from 'react';
import PibComparisonChart from './PibComparisonChart';
import PibModal from './PibModal';
import usePibComposition from './usePibComposition';
import { buildSparklinePaths } from '../../shared/utils/sparkline';

const sparklineTrend = (history) => {
    const valid = (history || []).filter((value) => Number.isFinite(value));
    if (valid.length < 2) return 'neutral';
    return valid[valid.length - 1] >= valid[0] ? 'up' : 'down';
};

const PibCompositionSection = ({ sectionRef, nominalSeries, availablePeriods }) => {
    const [showPibInfo, setShowPibInfo] = useState(false);
    const [showPibModal, setShowPibModal] = useState(false);
    const {
        periodYears,
        periodQuarters,
        selectedYear,
        setSelectedYear,
        selectedQuarter,
        setSelectedQuarter,
        compositionData,
        tableRows
    } = usePibComposition(nominalSeries, availablePeriods);

    return (
        <section
            className="pib-composition-section reveal reveal-delay-3"
            ref={sectionRef}
            style={{ padding: '4rem 0' }}
        >
            <div className="overview-pib">
                <div className="overview-pib-header">
                    <h3 className="overview-pib-title">Composicion del PIB corriente</h3>
                    <div className="overview-pib-info">
                        <button
                            type="button"
                            className="overview-pib-detail"
                            onClick={() => setShowPibModal(true)}
                            disabled={!compositionData}
                        >
                            Ver detalle
                        </button>
                        <button
                            className="overview-pib-tooltip"
                            type="button"
                            aria-label="Explicacion del PIB corriente"
                            aria-expanded={showPibInfo}
                            onClick={() => setShowPibInfo((prev) => !prev)}
                        >
                            ?
                        </button>
                        {showPibInfo ? (
                            <div className="overview-pib-info-box">
                                El PIB mide el valor total de los bienes y servicios finales producidos en el pais.
                                &ldquo;Corriente&rdquo; significa que esta expresado a precios del periodo, sin ajuste por inflacion.
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="overview-pib-body">
                    <div className="overview-pib-chart">
                        {compositionData ? <PibComparisonChart data={compositionData} /> : null}
                    </div>

                    <div className="overview-pib-table">
                        <div className="overview-pib-controls">
                            <div className="overview-pib-control">
                                <span className="overview-pib-label">Año</span>
                                <select
                                    className="period-select"
                                    value={selectedYear}
                                    onChange={(event) => setSelectedYear(event.target.value)}
                                >
                                    {periodYears.map((year) => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="overview-pib-control">
                                <span className="overview-pib-label">Trim.</span>
                                <select
                                    className="period-select"
                                    value={selectedQuarter}
                                    onChange={(event) => setSelectedQuarter(event.target.value)}
                                >
                                    {periodQuarters.map((quarter) => (
                                        <option key={quarter} value={quarter}>{quarter}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="pib-table-header">
                            <span>COMPONENTE</span>
                            <span className="pib-col-value">VALOR</span>
                            <span className="pib-col-share">%PIB</span>
                            <span className="pib-col-trend">TREND</span>
                        </div>
                        <div className="pib-table-rows">
                            {tableRows.map((row) => (
                                <div key={row.id} className="pib-table-row">
                                    <span className="pib-col-name">{row.title}</span>
                                    <span className="pib-col-value">{row.value.split(' ')[0]}</span>
                                    <span className="pib-col-share">{row.weight}%</span>
                                    <div className="pib-col-trend">
                                        <svg width="34" height="12" viewBox="0 0 40 16">
                                            <path
                                                d={buildSparklinePaths(row.history, 40, 16).linePath}
                                                fill="none"
                                                stroke={sparklineTrend(row.history) === 'up' ? 'var(--trend-up-neon)' : 'var(--trend-down-neon)'}
                                                strokeWidth="2"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="overview-pib-footnote">
                    Datos: Banco Central de Chile. <em>PIB corriente, referencia 2018.</em>
                </p>
            </div>
            {showPibModal && compositionData ? (
                <PibModal
                    data={compositionData}
                    availablePeriods={availablePeriods}
                    nominalSeries={nominalSeries}
                    onClose={() => setShowPibModal(false)}
                />
            ) : null}
        </section>
    );
};

export default PibCompositionSection;
