import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Table2 } from 'lucide-react';
import DataTableModal from '../../shared/components/DataTableModal';
import SeriesTable from '../../shared/components/SeriesTable';
import { IconButton, Segmented } from '../../shared/components/controls';
import { downloadCsv } from '../../shared/utils/download';
import { formatNumber } from '../../shared/utils/format';
import FiscalHistoryChart from './FiscalHistoryChart';
import FiscalTree from './FiscalTree';
import { FISCAL_COLORS as COLORS, formatPct, formatPesos, formatSignedPct, pctAxis } from './fiscalFormat';
import { FISCAL_NOTES } from './fiscalNotes';
import { findNode, monthlyRows, treeCsv } from './fiscalView';
import useFiscalView from './useFiscalView';
import '../../styles/fiscal.css';

const SUMMARY_LABELS = { ingresos: 'Ingresos', gastos: 'Gastos', balance: 'Balance' };
const MODES = [
    { id: 'pib', label: '% del PIB' },
    { id: 'monto', label: 'Monto' },
    { id: 'real', label: 'Var. real' }
];
const thousandMillionsAxis = (value) => formatNumber(value / 1e3, 0);

// Series del gráfico según la partida elegida y el modo.
const chartSetup = (selectedId, mode, historyOf, color) => {
    if (selectedId === 'resumen') {
        const ingresos = historyOf('ingresos');
        const gastos = historyOf('gastos');
        const balance = historyOf('balance');
        return {
            data: ingresos.map((row, index) => ({
                label: row.label,
                period: row.period,
                partial: row.period.partial,
                ingresos: row.pctPib,
                gastos: gastos[index].pctPib,
                balance: balance[index].pctPib
            })),
            axisFormat: pctAxis,
            series: [
                { key: 'ingresos', name: 'Ingresos', color: COLORS.ingresos, format: formatPct },
                { key: 'gastos', name: 'Gastos', color: COLORS.gastos, format: formatPct },
                { key: 'balance', name: 'Balance', color: COLORS.balance, format: formatPct, type: 'line' }
            ]
        };
    }
    const history = historyOf(selectedId);
    const signed = selectedId === 'balance' || mode === 'real';
    const base = history.map((row) => ({ label: row.label, period: row.period, partial: row.period.partial }));
    if (mode === 'monto') {
        return {
            data: base.map((row, index) => ({ ...row, value: history[index].value })),
            axisFormat: thousandMillionsAxis,
            series: [{ key: 'value', name: 'Monto', color, format: formatPesos, signed: selectedId === 'balance' }]
        };
    }
    if (mode === 'real') {
        return {
            data: base.map((row, index) => ({ ...row, value: history[index].realChange })),
            axisFormat: pctAxis,
            series: [{ key: 'value', name: 'Var. real anual', color, format: formatSignedPct, signed: true }]
        };
    }
    return {
        data: base.map((row, index) => ({ ...row, value: history[index].pctPib })),
        axisFormat: pctAxis,
        series: [{ key: 'value', name: '% del PIB', color, format: formatPct, signed }]
    };
};

const SummaryCard = ({ item, period, active, onSelect }) => {
    const isBalance = item.id === 'balance';
    const tone = isBalance && Number.isFinite(item.value) ? (item.value < 0 ? ' is-deficit' : ' is-surplus') : '';
    return (
        <button type="button" className={`fiscal-kpi${active ? ' is-active' : ''}${tone}`} onClick={() => onSelect(item.id)}>
            <span className="fiscal-kpi-label">
                {SUMMARY_LABELS[item.id]}
                {isBalance && Number.isFinite(item.value) ? <em>{item.value < 0 ? 'déficit' : 'superávit'}</em> : null}
            </span>
            <span className="fiscal-kpi-value">{formatPesos(item.value)}</span>
            <span className="fiscal-kpi-meta">
                <span>{formatPct(item.pctPib)} del PIB</span>
                {!isBalance ? <span>{formatSignedPct(item.realChange)} real</span> : <span>{period.short}</span>}
            </span>
        </button>
    );
};

// Sección de finanzas públicas: ingresos y gastos del Gobierno Central (DIPRES), desplegables por
// partida, con la evolución anual de la partida elegida.
const FiscalSection = ({ sectionRef }) => {
    const { loading, error, data, periods, period, setPeriodId, selectedId, setSelectedId, view } = useFiscalView();
    const [mode, setMode] = useState('pib');
    const [showTable, setShowTable] = useState(false);
    const detailRef = useRef(null);
    const closeTable = useCallback(() => setShowTable(false), []);

    const selectedLabel = useMemo(() => {
        if (!data) return '';
        if (selectedId === 'resumen') return 'Ingresos, gastos y balance';
        return findNode(data.tree, selectedId)?.label || data.extra.find((item) => item.id === selectedId)?.label || '';
    }, [data, selectedId]);

    const chart = useMemo(() => {
        if (!view) return null;
        // Partidas de gasto en naranjo, de ingreso en azul (como en el resumen).
        const isGasto = Boolean(findNode(data.tree.filter((node) => node.id === 'gastos'), selectedId));
        return chartSetup(selectedId, mode, view.historyOf, isGasto ? COLORS.gastos : COLORS.ingresos);
    }, [view, data, selectedId, mode]);

    // Al elegir una partida se baja hasta el gráfico solo si no está a la vista (en celular queda lejos).
    const selectNode = (id) => {
        setSelectedId(id);
        if (id === 'balance' && mode === 'real') setMode('pib');
        const panel = detailRef.current;
        if (panel && panel.getBoundingClientRect().top > window.innerHeight - 120) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const modes = selectedId === 'balance' ? MODES.filter((item) => item.id !== 'real') : MODES;

    return (
        <section className="fiscal-section reveal reveal-delay-3" ref={sectionRef}>
            <div className="regional-card fiscal-card">
                <div className="regional-header fiscal-header">
                    <h2 className="regional-title">Finanzas Públicas</h2>
                    <p className="regional-subtitle">
                        Cuánto recauda y cuánto gasta el Gobierno Central. Abre cada partida para ver de qué se compone.
                    </p>
                </div>

                {loading ? <p className="fiscal-empty">Cargando datos…</p> : null}
                {error ? <p className="fiscal-empty">No se pudieron cargar los datos de finanzas públicas.</p> : null}

                {view && period ? (
                    <>
                        <div className="fiscal-toolbar">
                            <label className="fiscal-period">
                                <span>Período</span>
                                <select className="period-select" value={period.id} onChange={(event) => setPeriodId(event.target.value)}>
                                    {periods.map((item) => (
                                        <option key={item.id} value={item.id}>{item.label}</option>
                                    ))}
                                </select>
                            </label>
                            <IconButton
                                icon={Download}
                                label="Descargar período (CSV)"
                                onClick={() => downloadCsv(treeCsv(view.tree, formatNumber), `finanzas-publicas-${period.id}.csv`)}
                            />
                        </div>

                        <div className="fiscal-kpis">
                            {view.summary.map((item) => (
                                <SummaryCard key={item.id} item={item} period={period} active={selectedId === item.id} onSelect={selectNode} />
                            ))}
                        </div>

                        <div className="fiscal-trees">
                            {view.tree.map((root) => (
                                <FiscalTree key={root.id} root={root} selectedId={selectedId} onSelect={selectNode} />
                            ))}
                        </div>

                        <div className="fiscal-detail" ref={detailRef}>
                            <div className="fiscal-detail-header">
                                <div>
                                    <h3 className="fiscal-detail-title">{selectedLabel}</h3>
                                    <p className="fiscal-detail-note">{FISCAL_NOTES[selectedId]}</p>
                                </div>
                                <div className="fiscal-detail-actions">
                                    {selectedId !== 'resumen' ? (
                                        <>
                                            <Segmented options={modes} value={mode} onChange={setMode} ariaLabel="Unidad del gráfico" />
                                            <IconButton icon={Table2} label="Ver datos mensuales" onClick={() => setShowTable(true)} />
                                            <IconButton icon={ArrowLeft} label="Volver al resumen" onClick={() => setSelectedId('resumen')} />
                                        </>
                                    ) : null}
                                </div>
                            </div>
                            {chart ? <FiscalHistoryChart data={chart.data} series={chart.series} axisFormat={chart.axisFormat} /> : null}
                            {selectedId === 'resumen' ? (
                                <div className="fiscal-legend">
                                    <span><i style={{ background: COLORS.ingresos }} />Ingresos</span>
                                    <span><i style={{ background: COLORS.gastos }} />Gastos</span>
                                    <span><i className="is-line" style={{ background: COLORS.balance }} />Balance</span>
                                </div>
                            ) : null}
                        </div>

                        <p className="fiscal-footnote">
                            Fuente: <a href={data.sourceUrl} target="_blank" rel="noreferrer">DIPRES</a>, Estado de Operaciones del
                            Gobierno Central Total (base devengado), e IPC y PIB del Banco Central. Montos en pesos de cada año.
                            Var. real: comparación con los mismos meses del año anterior, descontando la inflación.
                            {periods[0]?.partial ? ` *${periods[0].year}: acumulado ${periods[0].short.replace(` ${periods[0].year}`, '')} (año en curso).` : ''}
                        </p>
                    </>
                ) : null}
            </div>

            {showTable && data ? (
                <DataTableModal
                    title={`${selectedLabel} · Gobierno Central`}
                    subtitle="Millones de pesos de cada mes (DIPRES). Al agrupar por trimestre o año se suman los meses."
                    onClose={closeTable}
                >
                    <SeriesTable
                        data={monthlyRows(data, selectedId)}
                        columns={[{ key: 'value', label: selectedLabel, format: (value) => formatNumber(value, 0) }]}
                        aggregate="sum"
                        maxHeight={420}
                        filename={`dipres-${selectedId}.csv`}
                    />
                </DataTableModal>
            ) : null}
        </section>
    );
};

export default FiscalSection;
