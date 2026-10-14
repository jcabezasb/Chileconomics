import { useCallback, useState } from 'react';
import { Download, Pause, Play, Table2 } from 'lucide-react';
import DataTable from '../../shared/components/DataTable';
import DataTableModal from '../../shared/components/DataTableModal';
import { IconButton, Segmented } from '../../shared/components/controls';
import { downloadCsv } from '../../shared/utils/download';
import { IED_GROUPS, IED_UNASSIGNED } from './iedGroups';
import IedFlowChart from './IedFlowChart';
import IedHistory from './IedHistory';
import IedLinesChart from './IedLinesChart';
import { formatChange, formatMillions, formatShare, iedTable } from './iedTable';
import useIedView from './useIedView';
import '../../styles/ied.css';

const DIRECTIONS = [
    { id: 'inward', label: 'Hacia Chile' },
    { id: 'outward', label: 'Desde Chile' }
];
const VIEWS = [
    { id: 'mapa', label: 'Mapa' },
    { id: 'lineas', label: 'Líneas' }
];
const BREAKDOWNS = [
    { id: 'paises', label: 'Países' },
    { id: 'regiones', label: 'Regiones' }
];
const LIST_SIZE = 10;

// Ficha de lo destacado (todo Chile si no hay nada), con la evolución del stock.
const FocusCard = ({ view }) => {
    const { focus, year, selectedId, clearSelected, chooseYear, chartView } = view;
    if (!focus) return null;
    return (
        <div className={`ied-focus${focus.isTotal ? ' is-chile' : ''}`}>
            <span className="ied-focus-label">{focus.isTotal ? focus.label : `${focus.label} · ${year}`}</span>
            <span className="ied-focus-value">US$ {formatMillions(focus.value)}</span>
            <span className="ied-focus-meta">
                <span>millones</span>
                <span>{formatChange(focus.change)} vs {year - 1}</span>
                {focus.isTotal ? null : <span>{formatShare(focus.share)} del total</span>}
            </span>
            <IedHistory history={focus.history} year={year} onChooseYear={chooseYear} />
            {focus.note ? <span className="ied-focus-note">{focus.note}</span> : null}
            {focus.isTotal ? (
                <span className="ied-focus-hint">
                    {chartView === 'mapa'
                        ? 'Pasa el mouse (o toca) un país, la barra o una región. Arrastra el globo para girarlo.'
                        : 'Pasa el mouse (o toca) una línea o la leyenda. Toca el gráfico para elegir un año.'}
                </span>
            ) : null}
            {selectedId ? (
                <button type="button" className="ied-focus-reset" onClick={clearSelected}>Volver a todo Chile</button>
            ) : null}
        </div>
    );
};

// Lista de apoyo (y para celular): principales países y, hacia Chile, las regiones.
const FocusList = ({ view }) => {
    const { direction, countries, regional, activeId, toggleSelected } = view;
    const topCountries = countries ? [...countries.items].sort((a, b) => b.value - a.value).slice(0, LIST_SIZE) : [];
    const rows = [
        ...topCountries.map((item) => ({ id: item.id, label: item.label, value: item.value, share: item.share })),
        ...(direction === 'inward' && regional
            ? [...IED_GROUPS, IED_UNASSIGNED].map((group) => {
                const item = regional.items.find((entry) => entry.id === group.id);
                return { id: group.id, label: group.short, value: item.value, share: item.share, region: true };
            })
            : [])
    ];
    return (
        <ul className="ied-list" aria-label="Stock por país y región">
            {rows.map((row, index) => (
                <li key={row.id} className={row.region && !rows[index - 1]?.region ? 'is-first-region' : ''}>
                    <button
                        type="button"
                        className={`ied-list-row${activeId === row.id ? ' is-active' : ''}`}
                        onClick={() => toggleSelected(row.id)}
                    >
                        <span>{row.label}</span>
                        <span>{formatMillions(row.value)}</span>
                        <span>{formatShare(row.share)}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
};

// Inversión extranjera directa: el globo con los países, la barra del stock total y el mapa de Chile
// por región (o, con el botón "Líneas", la evolución de los principales). "Desde Chile" invierte el
// sentido: dónde invierte Chile en el exterior. Toda la sección cabe en una pantalla.
const IedSection = ({ sectionRef }) => {
    const view = useIedView();
    const {
        loading, hasCountries, direction, chooseDirection, chartView, setChartView, lineBreakdown, setLineBreakdown, lines,
        years, year, chooseYear, playing, togglePlay, regional, countries, animatedValues, activeId
    } = view;
    const [table, setTable] = useState(null);
    const closeTable = useCallback(() => setTable(null), []);
    const inward = direction === 'inward';

    return (
        <section className="ied-section reveal reveal-delay-2" ref={sectionRef}>
            <div className="regional-card ied-card">
                <div className="ied-header">
                    <h2 className="regional-title">Inversión Extranjera Directa</h2>
                    <p className="regional-subtitle">
                        {inward
                            ? 'De qué países viene la inversión extranjera en Chile y en qué regiones está.'
                            : 'En qué países invierten las empresas chilenas.'}
                    </p>
                </div>

                {loading ? <p className="ied-empty">Cargando datos…</p> : null}
                {!loading && !regional ? (
                    <p className="ied-empty">Los datos de inversión extranjera aún no están disponibles.</p>
                ) : null}

                {regional && animatedValues ? (
                    <>
                        <div className="ied-toolbar">
                            <div className="ied-toolbar-group">
                                {hasCountries ? (
                                    <Segmented ariaLabel="Sentido de la inversión" options={DIRECTIONS} value={direction} onChange={chooseDirection} />
                                ) : null}
                                <Segmented ariaLabel="Tipo de gráfico" options={VIEWS} value={chartView} onChange={setChartView} />
                                {chartView === 'lineas' && inward ? (
                                    <Segmented ariaLabel="Líneas por" options={BREAKDOWNS} value={lineBreakdown} onChange={setLineBreakdown} />
                                ) : null}
                            </div>
                            <div className="ied-years">
                                <IconButton
                                    icon={playing ? Pause : Play}
                                    label={playing ? 'Pausar' : 'Recorrer los años'}
                                    onClick={togglePlay}
                                    active={playing}
                                />
                                <input
                                    type="range"
                                    className="ied-year-range"
                                    min={years[0]}
                                    max={years[years.length - 1]}
                                    step={1}
                                    value={year}
                                    onChange={(event) => chooseYear(Number(event.target.value))}
                                    aria-label="Año"
                                />
                                <span className="ied-year-value">{year}</span>
                            </div>
                        </div>

                        <div className="ied-body">
                            <div className={`ied-stage is-${chartView}`}>
                                {chartView === 'mapa' ? (
                                    <IedFlowChart
                                        direction={direction}
                                        regionValues={animatedValues}
                                        countryItems={countries?.items || []}
                                        countryValues={animatedValues}
                                        year={year}
                                        activeId={activeId}
                                        onHover={view.setHoveredId}
                                        onSelect={view.toggleSelected}
                                        onReset={view.clearSelected}
                                    />
                                ) : lines ? (
                                    <IedLinesChart
                                        series={lines.series}
                                        rows={lines.rows}
                                        year={year}
                                        activeId={activeId}
                                        onHover={view.setHoveredId}
                                        onSelect={view.toggleSelected}
                                        onChooseYear={chooseYear}
                                    />
                                ) : null}
                            </div>

                            <aside className="ied-side">
                                <FocusCard view={view} />
                                <FocusList view={view} />
                                <div className="ied-notes">
                                    <p className="ied-footnote">
                                        Stock a fin de año, millones de US$. País del inversionista inmediato (puede
                                        diferir del dueño final). Fuente: Banco Central de Chile.
                                    </p>
                                    <IconButton
                                        icon={Table2}
                                        label="Ver tabla"
                                        showLabel
                                        onClick={() => setTable(iedTable({ ...view, year }))}
                                    />
                                </div>
                            </aside>
                        </div>
                    </>
                ) : null}
            </div>

            {table ? (
                <DataTableModal
                    title={table.title}
                    subtitle={table.subtitle}
                    onClose={closeTable}
                    actions={(
                        <IconButton
                            icon={Download}
                            label="Descargar CSV (todos los años)"
                            onClick={() => downloadCsv(table.csv, table.filename)}
                        />
                    )}
                >
                    {table.tables.map((entry) => (
                        <div key={entry.heading} className="ied-table-block">
                            <h4 className="ied-table-heading">{entry.heading}</h4>
                            <DataTable columns={entry.columns} rows={entry.rows} maxHeight={360} />
                        </div>
                    ))}
                </DataTableModal>
            ) : null}
        </section>
    );
};

export default IedSection;
