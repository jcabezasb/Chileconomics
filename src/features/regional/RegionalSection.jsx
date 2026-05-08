import React, { useState } from 'react';
import MacroMap from './MacroMap';
import TrendChart from '../../shared/components/TrendChart';
import DataTableModal from '../../shared/components/DataTableModal';
import { getSeries } from '../../data/bcch/api';
import { REGION_NUMERIC_CODE_BY_ID } from '../../shared/constants/regions';

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
    formatMonthLabelDash,
    theme
}) => {
const [activeModal, setActiveModal] = useState(null);
    const [pibActivityData, setPibActivityData] = useState(null);
    const [activityLoading, setActivityLoading] = useState(false);
    const regionId = selectedRegion ? getRegionId(selectedRegion) : null;
    const populationSeries = {
        total: regionId ? regionalData[regionId]?.pob?.total : populationData?.total,
        hombres: regionId ? regionalData[regionId]?.pob?.hombres : populationData?.hombres,
        mujeres: regionId ? regionalData[regionId]?.pob?.mujeres : populationData?.mujeres
    };

    const closeModal = () => setActiveModal(null);

    const loadPibActivities = async (regId) => {
        if (!regId || !REGION_NUMERIC_CODE_BY_ID[regId]) return null;
        const code = REGION_NUMERIC_CODE_BY_ID[regId];
        const baseId = `F035.PIB.FLU.R.CLP.2018`;
        
        const activityMap = {
            bienes: `${baseId}.PB.Z.Z.${code}.0.T`,
            mineria: `${baseId}.03.Z.Z.${code}.0.T`,
            industria: `${baseId}.04.Z.Z.${code}.0.T`,
            resto: `${baseId}.RB.Z.Z.${code}.0.T`,
            comercio: `${baseId}.COM.Z.Z.${code}.0.T`,
            servicios: `${baseId}.SERV.Z.Z.${code}.0.T`
        };

        try {
            const results = await Promise.all([
                getSeries(activityMap.bienes),
                getSeries(activityMap.mineria),
                getSeries(activityMap.industria),
                getSeries(activityMap.resto),
                getSeries(activityMap.comercio),
                getSeries(activityMap.servicios)
            ]);
            
            return {
                bienes: results[0] || [],
                mineria: results[1] || [],
                industria: results[2] || [],
                resto: results[3] || [],
                comercio: results[4] || [],
                servicios: results[5] || []
            };
        } catch (e) {
            console.error('Error loading PIB activities:', e);
            return null;
        }
    };

    const handleOpenPibActivities = async () => {
        if (!regionId) return;
        
        setActivityLoading(true);
        const data = await loadPibActivities(regionId);
        setActivityLoading(false);
        
        if (data) {
            setPibActivityData(data);
            setActiveModal({
                type: 'pib_activities',
                title: `PIB por Actividad - ${selectedRegion}`
            });
        }
    };

    const buildSeriesCsv = (series, header = 'fecha;valor') => {
        if (!series || !series.length) return '';
        const rows = series.map((entry) => {
            const dateValue = entry?.date || entry?.name || '';
            const value = Number(entry?.value);
            const formattedValue = Number.isNaN(value) ? '' : formatNumber(value, 1);
            return `${dateValue};${formattedValue}`;
        });
        return [header, ...rows].join('\n');
    };

    const buildPopulationCsv = () => {
        const mergeMap = new Map();
        const addSeries = (series, key) => {
            (series || []).forEach((entry) => {
                if (!entry || entry.value === null || entry.value === undefined) return;
                const dateValue = entry.date || '';
                const current = mergeMap.get(dateValue) || { date: dateValue };
                current[key] = entry.value;
                mergeMap.set(dateValue, current);
            });
        };

        addSeries(populationSeries.total, 'total');
        addSeries(populationSeries.hombres, 'hombres');
        addSeries(populationSeries.mujeres, 'mujeres');

        const rows = Array.from(mergeMap.values())
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .map((row) => {
                const total = row.total !== undefined ? formatNumber(row.total, 1) : '';
                const hombres = row.hombres !== undefined ? formatNumber(row.hombres, 1) : '';
                const mujeres = row.mujeres !== undefined ? formatNumber(row.mujeres, 1) : '';
                return `${row.date};${total};${hombres};${mujeres}`;
            });

        return rows.length ? ['fecha;total;hombres;mujeres', ...rows].join('\n') : '';
    };

    const buildPopulationRows = () => {
        const mergeMap = new Map();
        const addSeries = (series, key) => {
            (series || []).forEach((entry) => {
                if (!entry || entry.value === null || entry.value === undefined) return;
                const dateValue = entry.date || '';
                const current = mergeMap.get(dateValue) || { id: dateValue, date: dateValue };
                current[key] = entry.value;
                mergeMap.set(dateValue, current);
            });
        };

        addSeries(populationSeries.total, 'total');
        addSeries(populationSeries.hombres, 'hombres');
        addSeries(populationSeries.mujeres, 'mujeres');

        return Array.from(mergeMap.values())
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .map((row) => ({
                ...row,
                total: row.total !== undefined ? formatNumber(row.total, 1) : '',
                hombres: row.hombres !== undefined ? formatNumber(row.hombres, 1) : '',
                mujeres: row.mujeres !== undefined ? formatNumber(row.mujeres, 1) : ''
            }));
    };

    const downloadCsv = (content, filename) => {
        if (!content) return;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadRegionalPib = () => {
        const csvContent = buildSeriesCsv(regionalPibChartData);
        const idSuffix = regionId || 'nacional';
        downloadCsv(csvContent, `pib-regional-${idSuffix}-${regionalTimeRange}.csv`);
    };

    const handleDownloadPopulation = () => {
        const csvContent = buildPopulationCsv();
        const idSuffix = regionId || 'nacional';
        downloadCsv(csvContent, `poblacion-${idSuffix}.csv`);
    };

    const handleDownloadLabor = (card, chartData) => {
        const csvContent = buildSeriesCsv(chartData);
        const idSuffix = regionId || 'nacional';
        downloadCsv(csvContent, `${card.id}-${idSuffix}-${regionalTimeRange}.csv`);
    };

    const handleOpenPibDetails = () => {
        const rows = (regionalPibChartData || []).map((entry, index) => ({
            id: `${entry?.date || index}`,
            date: entry?.date || '',
            value: entry?.value !== undefined ? formatNumber(entry.value, 1) : ''
        }));
        setActiveModal({
            title: `PIB Regional${selectedRegion ? ` - ${selectedRegion}` : ''}`,
            columns: [
                { key: 'date', label: 'Fecha' },
                { key: 'value', label: 'Valor', align: 'right', emphasis: true }
            ],
            rows,
            onDownload: handleDownloadRegionalPib
        });
    };

    const handleOpenPopulationDetails = () => {
        const rows = buildPopulationRows();
        setActiveModal({
            title: `Poblacion${selectedRegion ? ` - ${selectedRegion}` : ' Nacional'}`,
            columns: [
                { key: 'date', label: 'Fecha' },
                { key: 'total', label: 'Total', align: 'right', emphasis: true },
                { key: 'hombres', label: 'Hombres', align: 'right' },
                { key: 'mujeres', label: 'Mujeres', align: 'right' }
            ],
            rows,
            onDownload: handleDownloadPopulation
        });
    };

    const handleOpenLaborDetails = (card, chartData) => {
        const rows = (chartData || []).map((entry, index) => ({
            id: `${card.id}-${entry?.date || index}`,
            date: entry?.date || '',
            value: entry?.value !== undefined ? card.formatter(entry.value) : ''
        }));
        setActiveModal({
            title: `${card.title}${selectedRegion ? ` - ${selectedRegion}` : ' Nacional'}`,
            columns: [
                { key: 'date', label: 'Fecha' },
                { key: 'value', label: 'Valor', align: 'right', emphasis: true }
            ],
            rows,
            onDownload: () => handleDownloadLabor(card, chartData)
        });
    };

    const latestPopulationValue = (series) => (
        series && series.length ? formatNumber(series[series.length - 1].value, 1) : '...'
    );

    const formatLaborValue = (card, value) => {
        if (value === null || value === undefined) return '--';
        if (card.valueFormatter) return card.valueFormatter(value);
        return formatNumber(value, 1);
    };

    const populationHasData = Boolean(
        (populationSeries.total && populationSeries.total.length)
        || (populationSeries.hombres && populationSeries.hombres.length)
        || (populationSeries.mujeres && populationSeries.mujeres.length)
    );

    const content = (
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
                                <div 
                                    className="regional-pib-card"
                                    role="button"
                                    tabIndex={0}
                                    onClick={handleOpenPibDetails}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleOpenPibDetails();
                                        }
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        outline: '2px solid transparent',
                                        outlineOffset: '2px',
                                        transition: 'outline-color 0.2s, box-shadow 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.outlineColor = 'var(--accent)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.outlineColor = 'transparent';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div className="regional-pib-header">
                                        <div>
                                            <div className="regional-pib-label">PIB Real (Cuentas Nacionales)</div>
                                            <div className="regional-pib-value">
                                                {selectedRegion ? (sideIndicators[0].value) : (realPibData ? formatNumber(realPibData[realPibData.length - 1].value, 1) + ' MM' : '...')}
                                            </div>
                                            <div className="regional-pib-trend" style={{
                                                color: (selectedRegion ? sideIndicators[0].trend : (realPibData ? 'up' : 'neutral')) === 'up' ? 'var(--trend-up)' : 'var(--trend-down)'
                                            }}>
                                                {selectedRegion ? sideIndicators[0].variation : (realPibData ? '+2.4%' : '')} YoY
                                                <span className="regional-pib-trend-note"> (Último dato)</span>
                                            </div>
                                        </div>

                                        {/* Selectores de Tiempo para el Gráfico */}
                                        <div className="regional-pib-actions">
                                            <div className="regional-range">
                                                {['1a', '2a', '5a', 'all'].map((range) => {
                                                    const isActive = regionalTimeRange === range;
                                                    const isLight = theme === 'light';
                                                    return (
                                                        <button
                                                            key={range}
                                                            onClick={() => setRegionalTimeRange(range)}
                                                            className="regional-range-button"
                                                            style={{
                                                                background: isActive
                                                                    ? (isLight ? 'var(--bg-hover)' : 'var(--accent)')
                                                                    : 'transparent',
                                                                color: isActive
                                                                    ? (isLight ? 'var(--text-primary)' : 'white')
                                                                    : 'var(--text-secondary)',
                                                                border: isActive && isLight
                                                                    ? '1px solid rgba(37, 99, 235, 0.4)'
                                                                    : undefined
                                                            }}
                                                        >
                                                            {range === 'all' ? 'Todo' : range.toUpperCase()}
                                                        </button>
                                                    );
                                                })}
                                            </div>
<button
                                                type="button"
                                                className="regional-download"
                                                onClick={handleOpenPibActivities}
                                                disabled={!selectedRegion || !regionId}
                                            >
                                                Por actividad
                                            </button>
                                        </div>
                                    </div>

                                    {/* Gráfico de Trayectoria */}
                                    <div className="regional-pib-chart">
                                        <TrendChart
                                            data={regionalPibChartData}
                                            color="#f97316"
                                            height={120}
                                            valueFormatter={(val) => formatNumber(val, 1) + ' MM'}
                                            theme={theme}
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
                                            <div className="regional-pop-header">
                                                <div className="regional-pop-label">Población Total (INE)</div>
                                                <button
                                                    type="button"
                                                    className="regional-download"
                                                    onClick={handleOpenPopulationDetails}
                                                    disabled={!populationHasData}
                                                >
                                                    Mas detalles
                                                </button>
                                            </div>
                                            <div className="regional-pop-value">
                                                {latestPopulationValue(populationSeries.total)}
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
                                            {latestPopulationValue(populationSeries.hombres)}
                                        </div>
                                    </div>

                                    <div className="regional-pop-card">
                                        <div className="regional-pop-card-label">
                                            <span className="regional-pop-dot" style={{ background: '#ec4899' }}></span>
                                            Mujeres
                                        </div>
                                        <div className="regional-pop-card-value">
                                            {latestPopulationValue(populationSeries.mujeres)}
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
                                            <div className="regional-labor-header">
                                                <div className="regional-labor-label">{card.title}</div>
                                                <button
                                                    type="button"
                                                    className="regional-download"
                                                    onClick={() => handleOpenLaborDetails(card, chartData)}
                                                    disabled={!chartData.length}
                                                >
                                                    Mas detalles
                                                </button>
                                            </div>
                                            <div className="regional-labor-value">
                                                {formatLaborValue(card, latest)}
                                                <span className="regional-labor-unit">{card.unit}</span>
                                            </div>
                                            {hasData ? (
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

return (
        <>
            {content}
            {activeModal ? (
                activeModal.type === 'pib_activities' ? (
                    <div className="modal-backdrop" onClick={closeModal}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{activeModal.title}</h2>
                                <button className="modal-close" onClick={closeModal}>×</button>
                            </div>
                            <div className="modal-body" style={{ padding: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                                {activityLoading ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos...</div>
                                ) : pibActivityData ? (
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {[
                                            { key: 'bienes', label: 'Producción de bienes', color: '#3b82f6' },
                                            { key: 'mineria', label: 'Minería', color: '#ef4444' },
                                            { key: 'industria', label: 'Industria', color: '#f59e0b' },
                                            { key: 'resto', label: 'Resto de bienes', color: '#8b5cf6' },
                                            { key: 'comercio', label: 'Comercio', color: '#10b981' },
                                            { key: 'servicios', label: 'Servicios', color: '#06b6d4' }
                                        ].map((activity) => {
                                            const data = pibActivityData[activity.key] || [];
                                            const latest = data[data.length - 1];
                                            return (
                                                <div key={activity.key} style={{
                                                    padding: '0.75rem',
                                                    borderRadius: '8px',
                                                    border: `1px solid var(--border)`,
                                                    background: 'var(--bg-card)'
                                                }}>
                                                    <div style={{ 
                                                        fontWeight: 600, 
                                                        color: activity.color,
                                                        marginBottom: '0.5rem'
                                                    }}>
                                                        {activity.label}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                        <div style={{ flex: 1, height: 60 }}>
                                                            <TrendChart
                                                                data={data.slice(-20)}
                                                                color={activity.color}
                                                                height={60}
                                                                valueFormatter={(v) => formatNumber(v, 1)}
                                                                theme={theme}
                                                            />
                                                        </div>
                                                        <div style={{ minWidth: 80, textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                                                                {latest?.value ? formatNumber(latest.value, 1) + ' MM' : '--'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        No hay datos disponibles para esta región
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <DataTableModal
                        title={activeModal.title}
                        columns={activeModal.columns}
                        rows={activeModal.rows}
                        onClose={closeModal}
                        onDownload={activeModal.onDownload}
                    />
                )
            ) : null}
        </>
    );
};

export default RegionalSection;
