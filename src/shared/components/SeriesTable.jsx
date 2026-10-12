import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, Download } from 'lucide-react';
import { Segmented } from './controls';
import { downloadCsv } from '../utils/download';
import { formatNumber } from '../utils/format';
import {
    FREQUENCY_LABELS,
    FREQUENCY_ORDER,
    addChanges,
    detectFrequency,
    formatChange,
    formatPeriod,
    groupRows,
    periodKey,
    roundChange,
    toTsv
} from '../utils/tableData';
import '../../styles/seriesTable.css';

const ROW_HEIGHT = 34;
const OVERSCAN = 10;
const AGGREGATE_LABELS = { mean: 'promedio de', sum: 'suma de', last: 'último dato de' };
const exportNumber = (value) => (
    Number.isFinite(value) ? formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 4 }) : ''
);

const SortHeader = ({ id, label, align, sort, onSort }) => {
    const active = sort.key === id;
    const Icon = sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
        <button
            type="button"
            className={`series-table-sort${active ? ' is-active' : ''}${align === 'right' ? ' is-right' : ''}`}
            onClick={() => onSort(id)}
            aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
            <span>{label}</span>
            {active ? <Icon size={12} strokeWidth={2.4} aria-hidden="true" /> : null}
        </button>
    );
};

// Tabla de series de tiempo: agrupación por período, variaciones, orden por columna,
// copiar/descargar y render solo de las filas visibles (miles de filas sin trabarse).
//   data: [{ date, <key>: valor }]   columns: [{ key, label, format }]
//   percentUnit: la serie ya es un % (variaciones en pp)   aggregate: 'mean' | 'sum' | 'last'
//   range: { start, end } opcional; las variaciones se calculan con toda la serie y se muestran
//   solo las filas del rango (así la primera fila también tiene su comparación anual).
const SeriesTable = ({
    data,
    columns,
    percentUnit = false,
    aggregate = 'mean',
    range = null,
    maxHeight = 360,
    filename = 'tabla.csv'
}) => {
    const nativeFrequency = useMemo(() => detectFrequency(data), [data]);
    const frequencyOptions = FREQUENCY_ORDER.slice(FREQUENCY_ORDER.indexOf(nativeFrequency));
    const [selectedFrequency, setFrequency] = useState(null);
    const frequency = frequencyOptions.includes(selectedFrequency) ? selectedFrequency : nativeFrequency;
    const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
    const [scrollTop, setScrollTop] = useState(0);
    const [copied, setCopied] = useState(false);
    const bodyRef = useRef(null);

    const single = columns.length === 1 ? columns[0] : null;
    const showYoY = Boolean(single) && frequency !== 'year';

    const rows = useMemo(() => {
        const keys = columns.map((column) => column.key);
        const grouped = frequency === nativeFrequency
            ? (data || []).map((row) => ({ ...row, key: periodKey(row.date, frequency) }))
            : groupRows(data, keys, frequency, aggregate);
        const withChanges = single ? addChanges(grouped, single.key, frequency, percentUnit) : grouped;
        if (!range?.start && !range?.end) return withChanges;
        const from = range.start ? periodKey(range.start, frequency) : '';
        const to = range.end ? periodKey(range.end, frequency) : '';
        return withChanges.filter((row) => (!from || row.key >= from) && (!to || row.key <= to));
    }, [data, columns, frequency, nativeFrequency, aggregate, single, percentUnit, range]);

    // Rango de la columna única: barra de fondo y marcas de máximo/mínimo.
    const extremes = useMemo(() => {
        if (!single) return null;
        const values = rows.map((row) => row[single.key]).filter(Number.isFinite);
        if (!values.length) return null;
        return { min: Math.min(...values), max: Math.max(...values) };
    }, [rows, single]);

    const sortedRows = useMemo(() => {
        const factor = sort.dir === 'asc' ? 1 : -1;
        return [...rows].sort((a, b) => {
            if (sort.key === 'date') return a.key.localeCompare(b.key) * factor;
            const left = a[sort.key];
            const right = b[sort.key];
            if (!Number.isFinite(left)) return 1;
            if (!Number.isFinite(right)) return -1;
            return (left - right) * factor;
        });
    }, [rows, sort]);

    const toggleSort = (key) => setSort((current) => (
        current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
    ));

    // Columnas visibles: fecha, valores y (si es una sola serie) variaciones.
    const header = [
        { id: 'date', label: FREQUENCY_LABELS[frequency].option },
        ...columns.map((column) => ({ id: column.key, label: column.label, align: 'right', color: column.color })),
        ...(single ? [{ id: 'change', label: FREQUENCY_LABELS[frequency].previous, align: 'right' }] : []),
        ...(showYoY ? [{ id: 'yoy', label: 'vs 12 meses antes', align: 'right' }] : [])
    ];
    const gridTemplateColumns = `minmax(0, 1.15fr) ${header.slice(1).map(() => 'minmax(0, 1fr)').join(' ')}`;

    // Ventana de filas a dibujar según el scroll.
    const viewportHeight = Math.min(maxHeight, Math.max(sortedRows.length, 1) * ROW_HEIGHT);
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const last = Math.min(sortedRows.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
    const visibleRows = sortedRows.slice(first, last);

    const exportRows = () => sortedRows.map((row) => [
        formatPeriod(row.key, frequency),
        ...columns.map((column) => exportNumber(row[column.key])),
        ...(single ? [exportNumber(row.change)] : []),
        ...(showYoY ? [exportNumber(row.yoy)] : [])
    ]);
    const exportHeader = header.map((column) => column.label);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(toTsv(exportHeader, exportRows()));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="series-table">
            {frequencyOptions.length > 1 ? (
                <div className="series-table-toolbar">
                    <span className="series-table-toolbar-label">Agrupar por</span>
                    <Segmented
                        ariaLabel="Agrupar por"
                        options={frequencyOptions.map((id) => ({ id, label: FREQUENCY_LABELS[id].option }))}
                        value={frequency}
                        onChange={(id) => {
                            setFrequency(id);
                            setScrollTop(0);
                            if (bodyRef.current) bodyRef.current.scrollTop = 0;
                        }}
                    />
                </div>
            ) : null}

            <div className="series-table-frame">
                <div className="series-table-head" style={{ gridTemplateColumns }}>
                    {header.map((column) => (
                        <SortHeader
                            key={column.id}
                            id={column.id}
                            label={column.color ? (
                                <><i className="series-table-dot" style={{ background: column.color }} />{column.label}</>
                            ) : column.label}
                            align={column.align}
                            sort={sort}
                            onSort={toggleSort}
                        />
                    ))}
                </div>
                {sortedRows.length ? (
                    <div
                        ref={bodyRef}
                        className="series-table-body"
                        style={{ height: viewportHeight }}
                        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
                    >
                        <div style={{ height: sortedRows.length * ROW_HEIGHT, position: 'relative' }}>
                            {visibleRows.map((row, index) => {
                                const position = first + index;
                                const value = single ? row[single.key] : null;
                                const isMax = extremes && value === extremes.max;
                                const isMin = extremes && value === extremes.min && extremes.min !== extremes.max;
                                const barWidth = extremes && Number.isFinite(value) && extremes.max !== extremes.min
                                    ? 8 + ((value - extremes.min) / (extremes.max - extremes.min)) * 92
                                    : 0;
                                return (
                                    <div
                                        key={row.key}
                                        className={`series-table-row${position % 2 ? ' is-odd' : ''}`}
                                        style={{ gridTemplateColumns, top: position * ROW_HEIGHT, height: ROW_HEIGHT }}
                                    >
                                        <span className="series-table-date">
                                            {formatPeriod(row.key, frequency)}
                                            {isMax ? <em className="series-table-badge">máx</em> : null}
                                            {isMin ? <em className="series-table-badge">mín</em> : null}
                                        </span>
                                        {columns.map((column) => (
                                            <span key={column.key} className="series-table-value">
                                                {single && barWidth ? (
                                                    <i className="series-table-bar" style={{ width: `${barWidth}%` }} aria-hidden="true" />
                                                ) : null}
                                                <b>{Number.isFinite(row[column.key]) ? column.format(row[column.key]) : '–'}</b>
                                            </span>
                                        ))}
                                        {single ? (
                                            <span className={`series-table-change is-${Math.sign(roundChange(row.change) || 0)}`}>
                                                {formatChange(row.change, percentUnit)}
                                            </span>
                                        ) : null}
                                        {showYoY ? (
                                            <span className={`series-table-change is-${Math.sign(roundChange(row.yoy) || 0)}`}>
                                                {formatChange(row.yoy, percentUnit)}
                                            </span>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="series-table-empty">Sin datos para mostrar.</div>
                )}
            </div>

            <div className="series-table-footer">
                <span>
                    {sortedRows.length.toLocaleString('es-CL')} filas
                    {frequency !== nativeFrequency ? ` · ${AGGREGATE_LABELS[aggregate]} ${FREQUENCY_LABELS[frequency].aggregate}` : ''}
                </span>
                <div className="series-table-actions">
                    <button type="button" className="series-table-action" onClick={copy}>
                        {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                        {copied ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                        type="button"
                        className="series-table-action"
                        onClick={() => downloadCsv(
                            [exportHeader.join(';'), ...exportRows().map((cells) => cells.join(';'))].join('\n'),
                            filename
                        )}
                    >
                        <Download size={13} aria-hidden="true" />
                        CSV
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeriesTable;
