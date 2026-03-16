import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PIBComparisonChart from './PIBComparisonChart';
import { formatNumber, formatQuarterLabel } from '../../shared/utils/format';
import { buildGovernmentResidualSeries, mergeInvestmentSeries, normalizeSeries } from '../../shared/utils/series';
import '../../styles/pibModal.css';

const PIB_COMPONENTS = [
    { key: 'consumo', label: 'Consumo' },
    { key: 'inversion', label: 'Inversion (FBKF)' },
    { key: 'gasto', label: 'Gasto Gobierno' },
    { key: 'export', label: 'Exportaciones' },
    { key: 'import', label: 'Importaciones' }
];

const buildCsv = (rows) => {
    if (!rows || !rows.length) return '';
    const header = 'periodo;consumo;inversion;gasto_gobierno;exportaciones;importaciones;total_mm_clp';
    const lines = rows.map((row) => (
        `${row.name};${formatNumber(row.consumo, 1)};${formatNumber(row.inversion, 1)};${formatNumber(row.gasto, 1)};${formatNumber(row.export, 1)};${formatNumber(Math.abs(row.import), 1)};${formatNumber(row.total, 1)}`
    ));
    return [header, ...lines].join('\n');
};

const PibModal = ({
    data,
    theme,
    onClose,
    availablePeriods,
    nominalSeries
}) => {
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    useEffect(() => {
        if (!data) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [data, onClose]);

    const periodOptions = useMemo(() => (
        (availablePeriods || [])
            .map((period) => ({
                ...period,
                label: formatQuarterLabel(period.date)
            }))
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    ), [availablePeriods]);

    useEffect(() => {
        if (!periodOptions.length) return;
        if (!rangeStart || !rangeEnd) {
            const end = periodOptions[periodOptions.length - 1].date;
            const start = periodOptions[Math.max(0, periodOptions.length - 4)].date;
            setRangeStart(start);
            setRangeEnd(end);
        }
    }, [periodOptions, rangeStart, rangeEnd]);

    const rangeData = useMemo(() => {
        if (!nominalSeries || !periodOptions.length || !rangeStart || !rangeEnd) return [];
        const startIndex = periodOptions.findIndex((period) => period.date === rangeStart);
        const endIndex = periodOptions.findIndex((period) => period.date === rangeEnd);
        if (startIndex < 0 || endIndex < 0) return [];
        const from = Math.min(startIndex, endIndex);
        const to = Math.max(startIndex, endIndex);
        const slice = periodOptions.slice(from, to + 1);

        const consumoMap = new Map(normalizeSeries(nominalSeries.consumoSeries).map((entry) => [entry.date, entry.value]));
        const exportMap = new Map(normalizeSeries(nominalSeries.exportSeries).map((entry) => [entry.date, entry.value]));
        const importMap = new Map(normalizeSeries(nominalSeries.importSeries).map((entry) => [entry.date, entry.value]));
        const pibMap = new Map(normalizeSeries(nominalSeries.pibSeries).map((entry) => [entry.date, entry.value]));
        const investmentSeries = mergeInvestmentSeries(nominalSeries.fbkfSeries, nominalSeries.existenciasSeries);
        const inversionMap = new Map(investmentSeries.map((entry) => [entry.date, entry.value]));
        const gastoSeries = normalizeSeries(nominalSeries.gastoSeries);
        const gastoMap = new Map(gastoSeries.map((entry) => [entry.date, entry.value]));
        const gastoResidual = buildGovernmentResidualSeries(
            nominalSeries.pibSeries,
            nominalSeries.consumoSeries,
            investmentSeries,
            nominalSeries.exportSeries,
            nominalSeries.importSeries
        );
        const gastoResidualMap = new Map(gastoResidual.map((entry) => [entry.date, entry.value]));

        return slice
            .map((period) => {
                const date = period.date;
                const consumo = consumoMap.get(date) ?? 0;
                const inversion = inversionMap.get(date) ?? 0;
                const exportValue = exportMap.get(date) ?? 0;
                const importRaw = importMap.get(date) ?? 0;
                const gastoValue = gastoMap.get(date) ?? gastoResidualMap.get(date) ?? 0;
                const importValue = -Math.abs(importRaw || 0);
                const total = pibMap.get(date) ?? (consumo + inversion + gastoValue + exportValue + importValue);
                return {
                    name: period.label,
                    consumo,
                    inversion,
                    gasto: gastoValue,
                    export: exportValue,
                    import: importValue,
                    total
                };
            })
            .filter((entry) => Number.isFinite(entry.total));
    }, [nominalSeries, periodOptions, rangeStart, rangeEnd]);

    const csvContent = useMemo(() => buildCsv(rangeData.length ? rangeData : (data ? [{
        name: 'Actual',
        consumo: data.consumo ?? 0,
        inversion: data.inversion ?? 0,
        gasto: data.gasto ?? 0,
        export: data.export ?? 0,
        import: data.import ?? 0,
        total: data.total ?? 0
    }] : [])), [rangeData, data]);

    const handleDownload = () => {
        if (!csvContent) return;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pib-corriente-composicion.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!data) return null;

    return createPortal(
        <div className="indicator-modal-backdrop" onClick={onClose}>
            <div
                className="indicator-modal pib-modal"
                role="dialog"
                aria-modal="true"
                aria-label="PIB corriente - detalle"
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="indicator-modal-close"
                    onClick={onClose}
                >
                    Cerrar
                </button>
                <div className="pib-modal-header">
                    <div>
                        <h3 className="pib-modal-title">PIB corriente</h3>
                        <p className="pib-modal-subtitle">Composicion del PIB a precios del periodo (referencia 2018).</p>
                    </div>
                    <button
                        type="button"
                        className="pib-modal-download"
                        onClick={handleDownload}
                    >
                        Descargar datos
                    </button>
                </div>
                <div className="pib-modal-controls">
                    <div className="pib-modal-control">
                        <span className="pib-modal-label">Desde</span>
                        <select
                            className="period-select"
                            value={rangeStart || ''}
                            onChange={(event) => {
                                const value = event.target.value;
                                setRangeStart(value);
                                if (rangeEnd && value > rangeEnd) setRangeEnd(value);
                            }}
                            disabled={!periodOptions.length}
                        >
                            {periodOptions.map((period) => (
                                <option key={period.date} value={period.date}>{period.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="pib-modal-control">
                        <span className="pib-modal-label">Hasta</span>
                        <select
                            className="period-select"
                            value={rangeEnd || ''}
                            onChange={(event) => {
                                const value = event.target.value;
                                setRangeEnd(value);
                                if (rangeStart && value < rangeStart) setRangeStart(value);
                            }}
                            disabled={!periodOptions.length}
                        >
                            {periodOptions.map((period) => (
                                <option key={period.date} value={period.date}>{period.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="pib-modal-chart">
                    <div
                        className="pib-modal-chart-inner"
                        style={{ minWidth: `${Math.max(520, (rangeData.length || 1) * 110)}px` }}
                    >
                        <PIBComparisonChart data={rangeData.length ? rangeData : data} theme={theme} />
                    </div>
                </div>
                <div className="pib-modal-scroll">
                    <section className="pib-modal-section">
                        <h4>Que es PIB corriente</h4>
                        <p>
                            El PIB corriente mide el valor de los bienes y servicios finales producidos en el pais
                            usando los precios del periodo observado. Esto significa que recoge cambios en cantidades
                            y tambien cambios en precios.
                        </p>
                        <p>
                            Es util para conocer el tamano nominal de la economia y para comparar la composicion del
                            gasto dentro de un mismo periodo.
                        </p>
                    </section>
                    <section className="pib-modal-section">
                        <h4>Que es PIB real</h4>
                        <p>
                            El PIB real ajusta los valores a precios constantes, eliminando el efecto de la inflacion.
                            Asi se puede observar el crecimiento economico en terminos de volumen.
                        </p>
                        <p>
                            Al comparar distintos periodos, el PIB real permite ver si la economia produce mas o menos
                            bienes y servicios, sin que el resultado se distorsione por variaciones de precios.
                        </p>
                    </section>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PibModal;
