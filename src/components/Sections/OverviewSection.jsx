import React from 'react';
import MacroCard from '../Overview/MacroCard';
import PIBComparisonChart from '../Overview/PIBComparisonChart';

const OverviewSection = ({
    sectionRef,
    pibCompositionData,
    theme,
    showPibInfo,
    setShowPibInfo,
    periodYears,
    periodQuarters,
    selectedYear,
    setSelectedYear,
    selectedQuarter,
    setSelectedQuarter,
    sideIndicators,
    buildSparklinePaths,
    getSparklineTrend,
    chartIndicators
}) => (
    <section
        className="overview-section reveal reveal-delay-1"
        ref={sectionRef}
        style={{ paddingBottom: '4rem' }}
    >
        {/* Main Grid: 3 columns - [PIB Overview] | Charts (2x2) */}
        <div className="overview-grid">
            {/* Column 1: PIB Structure (UNIFIED BOX) */}
            <div className="overview-pib">
                <div className="overview-pib-header">
                    <h3 className="overview-pib-title">Composición del PIB corriente</h3>
                    <div className="overview-pib-info">
                        <button
                            className="overview-pib-tooltip"
                            type="button"
                            aria-label="Explicación del PIB corriente"
                            aria-expanded={showPibInfo}
                            onClick={() => setShowPibInfo((prev) => !prev)}
                        >
                            ?
                        </button>
                        {showPibInfo ? (
                            <div className="overview-pib-info-box">
                                El PIB mide el valor total de los bienes y servicios finales producidos en el país.
                                "Corriente" significa que está expresado a precios del periodo, sin ajuste por inflación.
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="overview-pib-body">
                    {/* Chart Area */}
                    <div className="overview-pib-chart">
                        <PIBComparisonChart data={pibCompositionData} theme={theme} />
                    </div>

                    {/* Components List Area (Table-like density) */}
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
                            {sideIndicators.map(ind => (
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

            {/* Columns 2-3: 4 Charts in 2x2 grid */}
            {chartIndicators.slice(0, 2).map(ind => (
                <MacroCard key={ind.id} indicator={ind} />
            ))}
            {chartIndicators.slice(2, 4).map(ind => (
                <MacroCard key={ind.id} indicator={ind} />
            ))}
        </div>
    </section>
);

export default OverviewSection;
