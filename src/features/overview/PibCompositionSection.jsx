import React, { useState } from 'react';
import PIBComparisonChart from './PIBComparisonChart';
import PibModal from './PibModal';

const PibCompositionSection = ({
    sectionRef,
    pibCompositionData,
    theme,
    periodYears,
    periodQuarters,
    selectedYear,
    setSelectedYear,
    selectedQuarter,
    setSelectedQuarter,
    availablePeriods,
    nominalSeries,
    pibTableIndicators,
    buildSparklinePaths,
    getSparklineTrend
}) => {
    const [showPibInfo, setShowPibInfo] = useState(false);
    const [showPibModal, setShowPibModal] = useState(false);

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
                                "Corriente" significa que esta expresado a precios del periodo, sin ajuste por inflacion.
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="overview-pib-body">
                    <div className="overview-pib-chart">
                        <PIBComparisonChart data={pibCompositionData} theme={theme} />
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
                            {pibTableIndicators.map((ind) => (
                                <div key={ind.id} className="pib-table-row">
                                    <span className="pib-col-name">{ind.title}</span>
                                    <span className="pib-col-value">
                                        {ind.value.split(' ')[0]}
                                    </span>
                                    <span className="pib-col-share">
                                        {ind.weight}%
                                    </span>
                                    <div className="pib-col-trend">
                                        <svg width="34" height="12" viewBox="0 0 40 16">
                                            <path
                                                d={buildSparklinePaths(ind.history || [], 40, 16).linePath}
                                                fill="none"
                                                stroke={getSparklineTrend(ind.history || []) === 'up' ? 'var(--trend-up-neon)' : 'var(--trend-down-neon)'}
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
            {showPibModal ? (
                <PibModal
                    data={pibCompositionData}
                    theme={theme}
                    availablePeriods={availablePeriods}
                    nominalSeries={nominalSeries}
                    onClose={() => setShowPibModal(false)}
                />
            ) : null}
        </section>
    );
};

export default PibCompositionSection;
