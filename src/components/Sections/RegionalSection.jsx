import React from 'react';
import MacroMap from '../Overview/MacroMap';
import TrendChart from '../Charts/TrendChart';

const RegionalSection = ({
    sectionRef,
    selectedRegion,
    setSelectedRegion,
    regionalData,
    sideIndicators,
    realPibData,
    formatNumber,
    regionalTimeRange,
    setRegionalTimeRange,
    regionalPibChartData,
    regionalPibStartLabel,
    regionalPibEndLabel,
    getRegionId,
    populationData,
    laborCards,
    buildLaborChartData,
    formatMonthLabelDash
}) => (
    <section
        className="regional-section reveal reveal-delay-2"
        ref={sectionRef}
        style={{ padding: '4rem 0' }}
    >
        <div className="regional-card">
            <div className="regional-header">
                <h2 className="regional-title">Análisis Geográfico y Demográfico</h2>
                <p className="regional-subtitle">
                    {selectedRegion
                        ? `Explorando datos detallados de la ${selectedRegion}.`
                        : "Visión general de Chile. Selecciona una región en el mapa para ver estadísticas locales."}
                </p>
            </div>

            <div className="regional-layout">
                {/* Mapa (Columna Izquierda) */}
                <div className="regional-map">
                    <MacroMap
                        selectedRegion={selectedRegion}
                        onRegionSelect={(regionName) => {
                            setSelectedRegion((prev) => prev === regionName ? null : regionName);
                        }}
                    />
                </div>

                {/* Fichas de Datos (Columna Derecha) */}
                <div className="regional-cards">
                    <h3 className="regional-highlight">
                        <span className="regional-dot"></span>
                        {selectedRegion || "Chile (Nacional)"}
                    </h3>

                    <div className="regional-metrics-grid">
                        <div className="regional-metrics-left">
                            {/* Ficha 1: Detalle PIB Real */}
                            <div className="regional-pib-card">
                                <div className="regional-pib-header">
                                    <div>
                                        <div className="regional-pib-label">PIB Real (Cuentas Nacionales)</div>
                                        <div className="regional-pib-value">
                                            {selectedRegion ? (sideIndicators[0].value) : (realPibData ? formatNumber(realPibData[realPibData.length - 1].value, 0) + ' MM' : '...')}
                                        </div>
                                        <div className="regional-pib-trend" style={{
                                            color: (selectedRegion ? sideIndicators[0].trend : (realPibData ? 'up' : 'neutral')) === 'up' ? 'var(--trend-up)' : 'var(--trend-down)'
                                        }}>
                                            {selectedRegion ? sideIndicators[0].variation : (realPibData ? '+2.4%' : '')} YoY
                                            <span className="regional-pib-trend-note"> (Último dato)</span>
                                        </div>
                                    </div>

                                    {/* Selectores de Tiempo para el Gráfico */}
                                    <div className="regional-range">
                                        {['1a', '2a', '5a', 'all'].map((range) => (
                                            <button
                                                key={range}
                                                onClick={() => setRegionalTimeRange(range)}
                                                className="regional-range-button"
                                                style={{
                                                    background: regionalTimeRange === range ? 'var(--accent)' : 'transparent',
                                                    color: regionalTimeRange === range ? 'white' : 'var(--text-secondary)'
                                                }}
                                            >
                                                {range === 'all' ? 'Todo' : range.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Gráfico de Trayectoria */}
                                <div className="regional-pib-chart">
                                    <TrendChart
                                        data={regionalPibChartData}
                                        color="#f97316"
                                        height={120}
                                        valueFormatter={(val) => formatNumber(val, 0) + ' MM'}
                                    />
                                    {(regionalPibStartLabel || regionalPibEndLabel) ? (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginTop: '0.25rem',
                                            fontSize: '0.65rem',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            <span>{regionalPibStartLabel}</span>
                                            <span>{regionalPibEndLabel}</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Ficha 2: Población INE */}
                            <div className="regional-pop-grid">
                                <div className="regional-pop-total">
                                    <div>
                                        <div className="regional-pop-label">Población Total (INE)</div>
                                        <div className="regional-pop-value">
                                            {(() => {
                                                const id = selectedRegion ? getRegionId(selectedRegion) : null;
                                                const series = id ? regionalData[id]?.pob?.total : populationData?.total;
                                                return series && series.length ? formatNumber(series[series.length - 1].value, 0) : '...';
                                            })()}
                                        </div>
                                    </div>
                                    <div className="regional-pop-meta">
                                        <div className="regional-pop-source">Fuente: INE Cine</div>
                                        <div className="regional-pop-updated">Actualizado 2024</div>
                                    </div>
                                </div>

                                <div className="regional-pop-card">
                                    <div className="regional-pop-card-label">
                                        <span className="regional-pop-dot" style={{ background: '#3b82f6' }}></span>
                                        Hombres
                                    </div>
                                    <div className="regional-pop-card-value">
                                        {(() => {
                                            const id = selectedRegion ? getRegionId(selectedRegion) : null;
                                            const series = id ? regionalData[id]?.pob?.hombres : populationData?.hombres;
                                            return series && series.length ? formatNumber(series[series.length - 1].value, 0) : '...';
                                        })()}
                                    </div>
                                </div>

                                <div className="regional-pop-card">
                                    <div className="regional-pop-card-label">
                                        <span className="regional-pop-dot" style={{ background: '#ec4899' }}></span>
                                        Mujeres
                                    </div>
                                    <div className="regional-pop-card-value">
                                        {(() => {
                                            const id = selectedRegion ? getRegionId(selectedRegion) : null;
                                            const series = id ? regionalData[id]?.pob?.mujeres : populationData?.mujeres;
                                            return series && series.length ? formatNumber(series[series.length - 1].value, 0) : '...';
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ficha 3: Empleo Regional */}
                        <div className="regional-labor-grid">
                            {laborCards.map((card) => {
                                const latest = card.series && card.series.length
                                    ? card.series[card.series.length - 1]?.value
                                    : null;
                                const chartData = buildLaborChartData(card.series);
                                const hasData = chartData.length > 0;

                                return (
                                    <div key={card.id} className="regional-labor-card">
                                        <div className="regional-labor-label">{card.title}</div>
                                        <div className="regional-labor-value">
                                            {latest !== null && latest !== undefined
                                                ? formatNumber(latest, 1)
                                                : '--'}
                                            <span className="regional-labor-unit">{card.unit}</span>
                                        </div>
                                        {hasData ? (
                                            <>
                                                <TrendChart
                                                    data={chartData}
                                                    color={card.color}
                                                    height={70}
                                                    valueFormatter={card.formatter}
                                                />
                                                <div className="regional-labor-range">
                                                    <span>{formatMonthLabelDash(chartData[0]?.date)}</span>
                                                    <span>{formatMonthLabelDash(chartData[chartData.length - 1]?.date)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="regional-labor-empty">Sin datos disponibles.</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

export default RegionalSection;
