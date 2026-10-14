import { useCallback, useState } from 'react';
import { Download, Pause, Play, Table2 } from 'lucide-react';
import DataTable from '../../shared/components/DataTable';
import DataTableModal from '../../shared/components/DataTableModal';
import { IconButton } from '../../shared/components/controls';
import { downloadCsv } from '../../shared/utils/download';
import { IED_GROUPS, IED_UNASSIGNED } from './iedGroups';
import IedRibbonMap from './IedRibbonMap';
import { formatChange, formatMillions, formatShare, iedTable } from './iedTable';
import useIedView from './useIedView';
import '../../styles/ied.css';

const GROUPED_NOTE = 'El Banco Central publica estas regiones juntas.';
const UNASSIGNED_NOTE = 'Parte del stock que el Banco Central no asigna a ninguna región.';

// Ficha del grupo destacado (o una invitación a explorar si no hay ninguno).
const ActiveDetail = ({ item, year }) => {
    if (!item) {
        return (
            <p className="ied-detail-hint">
                Pasa el mouse (o toca) una región, la barra o una cinta para ver cuánto recibe.
            </p>
        );
    }
    const group = IED_GROUPS.find((entry) => entry.id === item.id);
    const note = item.id === IED_UNASSIGNED.id ? UNASSIGNED_NOTE : group?.regions.length > 1 ? GROUPED_NOTE : null;
    return (
        <div className="ied-detail">
            <span className="ied-detail-name">{item.label}</span>
            <span className="ied-detail-value">US$ {formatMillions(item.value)} millones</span>
            <span className="ied-detail-meta">
                <span>{formatShare(item.share)} del total</span>
                <span>{formatChange(item.change)} vs {year - 1}</span>
            </span>
            {note ? <span className="ied-detail-note">{note}</span> : null}
        </div>
    );
};

// Inversión extranjera directa por región: barra del stock total, cintas hacia cada grupo de
// regiones y el mapa de Chile. Se puede recorrer año a año (2012 en adelante).
const IedSection = ({ sectionRef }) => {
    const view = useIedView();
    const { loading, years, year, chooseYear, playing, togglePlay, snapshot, animatedValues, activeId, activeItem } = view;
    const [table, setTable] = useState(null);
    const closeTable = useCallback(() => setTable(null), []);

    return (
        <section className="ied-section reveal reveal-delay-2" ref={sectionRef}>
            <div className="regional-card ied-card">
                <div className="regional-header ied-header">
                    <h2 className="regional-title">Inversión Extranjera Directa</h2>
                    <p className="regional-subtitle">
                        Cuánto han invertido empresas extranjeras en Chile y en qué regiones está esa inversión.
                    </p>
                </div>

                {loading ? <p className="ied-empty">Cargando datos…</p> : null}
                {!loading && !snapshot ? (
                    <p className="ied-empty">Los datos de inversión extranjera por región aún no están disponibles.</p>
                ) : null}

                {snapshot && animatedValues ? (
                    <div className="ied-layout">
                        <IedRibbonMap
                            values={animatedValues}
                            year={year}
                            activeId={activeId}
                            onHover={view.setHoveredId}
                            onSelect={view.toggleSelected}
                        />

                        <aside className="ied-panel">
                            <div className="ied-kpi">
                                <span className="ied-kpi-label">Stock total {year}</span>
                                <span className="ied-kpi-value">US$ {formatMillions(snapshot.total)}</span>
                                <span className="ied-kpi-meta">
                                    millones · {formatChange(snapshot.totalChange)} vs {year - 1}
                                </span>
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

                            <ActiveDetail item={activeItem} year={year} />

                            <ul className="ied-list" aria-label="Stock por región">
                                {[...IED_GROUPS, IED_UNASSIGNED].map((group) => {
                                    const item = snapshot.items.find((entry) => entry.id === group.id);
                                    return (
                                        <li key={group.id}>
                                            <button
                                                type="button"
                                                className={`ied-list-row${activeId === group.id ? ' is-active' : ''}`}
                                                onClick={() => view.toggleSelected(group.id)}
                                            >
                                                <span>{group.short}</span>
                                                <span>{formatMillions(item.value)}</span>
                                                <span>{formatShare(item.share)}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>

                            <p className="ied-footnote">
                                Stock (monto acumulado) a fin de cada año, en millones de dólares. Algunas regiones se
                                publican agrupadas. Fuente: Banco Central de Chile.
                            </p>
                            <div className="ied-actions">
                                <IconButton
                                    icon={Table2}
                                    label="Ver tabla"
                                    showLabel
                                    onClick={() => setTable(iedTable(snapshot, view.data))}
                                />
                            </div>
                        </aside>
                    </div>
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
                            onClick={() => downloadCsv(table.ranking.csv, table.ranking.filename)}
                        />
                    )}
                >
                    <DataTable columns={table.ranking.columns} rows={table.ranking.rows} maxHeight={480} />
                </DataTableModal>
            ) : null}
        </section>
    );
};

export default IedSection;
