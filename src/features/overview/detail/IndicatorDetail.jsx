import { useState } from 'react';
import { Download, LineChart, Table2, X } from 'lucide-react';
import TrendChart from '../../../shared/components/TrendChart';
import SeriesTable from '../../../shared/components/SeriesTable';
import { downloadCsv } from '../../../shared/utils/download';
import { formatNumber } from '../../../shared/utils/format';
import {
    computeSeriesStats,
    formatPeriodChange,
    formatShortDate,
    isDailySeries,
    makeAxisFormatter
} from '../../../shared/utils/detailStats';
import useIndicatorSeries from '../useIndicatorSeries';
import { YOY_ELIGIBLE, axisUnit, formatIndicatorValue, isPercentUnit } from '../indicatorFormat';
import { IconButton, Segmented } from '../../../shared/components/controls';
import { StatStrip } from './DetailParts';
import DateRangePicker from './DateRangePicker';
import { buildCsv, singleSeriesTable } from './tables';
import ImacecBreakdown from './breakdowns/ImacecBreakdown';
import IpcBreakdown from './breakdowns/IpcBreakdown';
import FxBreakdown from './breakdowns/FxBreakdown';
import CobreBreakdown from './breakdowns/CobreBreakdown';

const RANGE_OPTIONS = [
    { id: '1y', label: '1A' },
    { id: '2y', label: '2A' },
    { id: '5y', label: '5A' },
    { id: 'all', label: 'Todo' },
    { id: 'custom', label: 'Otro', title: 'Elegir fechas' }
];
const UNIT_OPTIONS = [
    { id: 'level', label: 'Nivel' },
    { id: 'yoy', label: 'Var. 12 meses', title: 'Variación porcentual respecto a 12 meses antes' }
];
const VIEW_OPTIONS = [
    { id: 'chart', label: 'Gráfico', icon: LineChart },
    { id: 'table', label: 'Tabla', icon: Table2 }
];
const PERIOD_LABELS = {
    '1y': 'en 12 meses',
    '2y': 'en 2 años',
    '5y': 'en 5 años',
    all: 'en todo el período',
    custom: 'en el período'
};

// Contenido de la ventana de detalle de un indicador.
const IndicatorDetail = ({ indicator, theme, onClose }) => {
    const id = indicator.id;
    const {
        chartData,
        fullData,
        displayData,
        range,
        timeRange,
        setTimeRange,
        customRange,
        setCustomRange,
        showYoY,
        setShowYoY,
        yoyEnabled,
        transform,
        prepare
    } = useIndicatorSeries(id, { allowYoY: true });
    const [view, setView] = useState('chart');

    const format = (value) => formatIndicatorValue(id, value, yoyEnabled);
    const percentUnit = isPercentUnit(id, yoyEnabled);
    const periodLabel = PERIOD_LABELS[timeRange] || 'en el período';
    const stats = computeSeriesStats(displayData);
    const change = formatPeriodChange(stats, percentUnit);
    const daily = isDailySeries(displayData);
    const latestYoY = displayData[displayData.length - 1];
    const displayValue = yoyEnabled
        ? (latestYoY ? `${formatNumber(latestYoY.value, 1)}%` : '--')
        : indicator.value;
    const subtitle = yoyEnabled ? 'Var. % en 12 meses' : indicator.subtitle;
    const breakdownProps = { theme, prepare, transform, range, yoyEnabled };

    return (
        <div className="detail">
            <div className="detail-sticky">
                <header className="detail-header">
                    <div className="detail-heading">
                        <h2 className="detail-title">{indicator.title}</h2>
                        <p className="detail-subtitle">
                            {subtitle}
                            {indicator.period ? <span> · Último dato: {indicator.period}</span> : null}
                        </p>
                    </div>
                    <div className="detail-header-actions">
                        <IconButton
                            icon={Download}
                            label="Descargar CSV"
                            showLabel
                            onClick={() => downloadCsv(buildCsv(displayData, [{ key: 'value', header: 'valor' }]), `${id}-datos.csv`)}
                        />
                        {onClose ? <IconButton icon={X} label="Cerrar" onClick={onClose} /> : null}
                    </div>
                </header>
                <div className="detail-toolbar">
                    <Segmented ariaLabel="Período" options={RANGE_OPTIONS} value={timeRange} onChange={setTimeRange} />
                    {YOY_ELIGIBLE.has(id) ? (
                        <Segmented
                            ariaLabel="Unidad"
                            options={UNIT_OPTIONS}
                            value={showYoY ? 'yoy' : 'level'}
                            onChange={(unit) => setShowYoY(unit === 'yoy')}
                        />
                    ) : null}
                    <span className="detail-toolbar-spacer" />
                    <Segmented ariaLabel="Vista" options={VIEW_OPTIONS} value={view} onChange={setView} />
                </div>
                {timeRange === 'custom' ? (
                    <DateRangePicker series={chartData} value={customRange} onChange={setCustomRange} />
                ) : null}
            </div>

            <section className="detail-main">
                <div className="detail-hero">
                    <div className="detail-hero-value">
                        <span className="detail-value">{displayValue}</span>
                        {indicator.variation && !yoyEnabled ? (
                            <span className={`detail-variation is-${indicator.trend || 'neutral'}`}>{indicator.variation}</span>
                        ) : null}
                    </div>
                    {stats ? (
                        <StatStrip
                            items={[
                                { label: 'Máximo', value: format(stats.max.value), hint: formatShortDate(stats.max.date, daily) },
                                { label: 'Mínimo', value: format(stats.min.value), hint: formatShortDate(stats.min.date, daily) },
                                { label: 'Promedio', value: format(stats.average), hint: 'línea punteada' },
                                change ? { label: 'Cambio', value: change.text, hint: periodLabel } : null
                            ]}
                        />
                    ) : null}
                </div>
                <div className="detail-main-chart">
                    {view === 'table' ? (
                        <SeriesTable
                            {...singleSeriesTable(fullData, indicator.title, format, {
                                percentUnit,
                                range,
                                filename: `${id}-tabla${yoyEnabled ? '-var12m' : ''}.csv`
                            })}
                            maxHeight={340}
                        />
                    ) : (
                        <TrendChart
                            data={displayData}
                            color="var(--chart-neon)"
                            height={300}
                            averageFormatter={format}
                            valueFormatter={format}
                            axisFormatter={makeAxisFormatter(axisUnit(id, yoyEnabled))}
                            theme={theme}
                            detailed
                        />
                    )}
                </div>
            </section>

            {id === 'imacec' ? <ImacecBreakdown {...breakdownProps} /> : null}
            {id === 'ipc' ? <IpcBreakdown {...breakdownProps} mainSeries={displayData} /> : null}
            {id === 'dolar' ? <FxBreakdown {...breakdownProps} /> : null}
            {id === 'cobre' ? (
                <CobreBreakdown
                    theme={theme}
                    cobreSeries={chartData}
                    mainSeries={displayData}
                    yoyEnabled={yoyEnabled}
                    periodLabel={periodLabel}
                />
            ) : null}

            <footer className="detail-footer">
                Fuente: Banco Central de Chile. La línea punteada marca el promedio del período mostrado.
            </footer>
        </div>
    );
};

export default IndicatorDetail;
