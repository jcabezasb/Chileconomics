import { useCallback, useState } from 'react';
import { Download, Table2 } from 'lucide-react';
import DataTable from '../../shared/components/DataTable';
import DataTableModal from '../../shared/components/DataTableModal';
import { IconButton, Segmented } from '../../shared/components/controls';
import { downloadCsv } from '../../shared/utils/download';
import ProjectionsRevisionChart from './ProjectionsRevisionChart';
import ProjectionsYearChart from './ProjectionsYearChart';
import { SOURCES, formatGrowth, latestForecast, productColor } from './projectionsView';
import { projectionsTable } from './projectionsTable';
import useProjectionsView from './useProjectionsView';
import '../../styles/projections.css';

// "EEE octubre 2026" -> "oct. 2026" (cabe en una línea del panel).
const shortEdition = (label) => {
    const [, month, year] = label.match(/(\p{L}+)\s+(\d{4})$/u) || [];
    return month ? `${month.slice(0, 3)}. ${year}` : label;
};

const VIEWS = [
    { id: 'anual', label: 'Por año' },
    { id: 'revisiones', label: 'Revisiones' }
];

// Botones de cada producto de la fuente elegida: muestran u ocultan su serie y sirven de leyenda.
const ProductToggles = ({ view }) => {
    const { sourceProducts, hidden, toggleProduct, setHoveredId, view: chartView } = view;
    return (
        <div className="proj-keys" role="group" aria-label="Proyecciones que se muestran">
            {chartView === 'anual' ? (
                <span className="proj-key is-static">
                    <i className="is-actual" aria-hidden="true" />
                    PIB efectivo
                </span>
            ) : null}
            {sourceProducts.map((product) => {
                const visible = !hidden.includes(product.id);
                return (
                    <button
                        key={product.id}
                        type="button"
                        className={`proj-key${visible ? '' : ' is-off'}`}
                        aria-pressed={visible}
                        title={visible ? `Ocultar ${product.label}` : `Mostrar ${product.label}`}
                        onClick={() => toggleProduct(product.id)}
                        onMouseEnter={() => setHoveredId(product.id)}
                        onMouseLeave={() => setHoveredId(null)}
                    >
                        <i style={{ background: productColor(product.id) }} aria-hidden="true" />
                        {product.label}
                    </button>
                );
            })}
        </div>
    );
};

// Panel: la última proyección de cada producto para este año y los dos siguientes.
const Summary = ({ summary, sourceProducts }) => {
    if (!summary) return null;
    return (
        <div className="proj-summary">
            <span className="proj-summary-title">Última proyección</span>
            <table>
                <thead>
                    <tr>
                        <th scope="col"><span className="proj-sr">Fuente</span></th>
                        {summary.years.map((year) => <th key={year} scope="col">{year}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {summary.rows.map((row) => (
                        <tr key={row.id}>
                            <th scope="row">
                                <i style={{ background: productColor(row.id) }} aria-hidden="true" />
                                {row.label}
                                {row.edition ? <small>{shortEdition(row.edition)}</small> : null}
                            </th>
                            {row.values.map((value, index) => <td key={summary.years[index]}>{formatGrowth(value)}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
            <ul className="proj-notes">
                {sourceProducts.map((product) => (
                    <li key={product.id}><b>{product.short}:</b> {product.description}</li>
                ))}
            </ul>
        </div>
    );
};

// Proyecciones de crecimiento del PIB: Banco Central (Encuesta de Expectativas e IPoM) y FMI.
// "Por año" compara la última proyección de cada uno con el crecimiento efectivo; "Revisiones"
// muestra cómo fue cambiando lo que se esperaba para un año.
const ProjectionsSection = ({ sectionRef }) => {
    const view = useProjectionsView();
    const {
        loading, hasData, actual, source, chooseSource, products, view: chartView, setView, years, targetYear, setTarget,
        rows, revisions, summary, sourceProducts, hoveredId
    } = view;
    const [table, setTable] = useState(null);
    const closeTable = useCallback(() => setTable(null), []);
    const editions = Object.fromEntries(products.map((product) => [product.id, latestForecast(product)?.label]));

    return (
        <section className="proj-section reveal reveal-delay-1" ref={sectionRef}>
            <div className="regional-card proj-card">
                <div className="proj-header">
                    <h2 className="regional-title">Proyecciones de Crecimiento</h2>
                    <p className="regional-subtitle">
                        Cuánto crecerá la economía chilena según el Banco Central y el FMI, y cómo han ido cambiando esas proyecciones.
                    </p>
                </div>

                {loading ? <p className="proj-empty">Cargando proyecciones…</p> : null}
                {!loading && !hasData ? <p className="proj-empty">Las proyecciones aún no están disponibles.</p> : null}

                {!loading && hasData ? (
                    <>
                        <div className="proj-toolbar">
                            <Segmented
                                ariaLabel="Fuente"
                                options={SOURCES.map(({ id, label }) => ({ id, label }))}
                                value={source}
                                onChange={chooseSource}
                            />
                            <Segmented ariaLabel="Vista" options={VIEWS} value={chartView} onChange={setView} />
                        </div>

                        <div className="proj-body">
                            <div className="proj-stage">
                                <div className="proj-stage-head">
                                    <ProductToggles view={view} />
                                    {chartView === 'revisiones' && years.length ? (
                                        <label className="proj-target">
                                            <span>Proyecciones para</span>
                                            <select value={targetYear ?? ''} onChange={(event) => setTarget(Number(event.target.value))}>
                                                {years.map((year) => <option key={year} value={year}>{year}</option>)}
                                            </select>
                                        </label>
                                    ) : null}
                                </div>
                                {chartView === 'anual' ? (
                                    <ProjectionsYearChart rows={rows} products={products} editions={editions} hoveredId={hoveredId} />
                                ) : (
                                    <ProjectionsRevisionChart
                                        series={revisions}
                                        target={targetYear}
                                        actual={actual[targetYear]}
                                        hoveredId={hoveredId}
                                    />
                                )}
                            </div>

                            <aside className="proj-side">
                                <Summary summary={summary} sourceProducts={sourceProducts} />
                                <div className="proj-footer">
                                    <p className="proj-footnote">
                                        Variación anual del PIB real (%). Efectivo: Cuentas Nacionales del Banco Central.
                                        Fuentes: Banco Central de Chile (EEE e IPoM) y FMI (World Economic Outlook).
                                    </p>
                                    <IconButton
                                        icon={Table2}
                                        label="Ver tabla"
                                        showLabel
                                        onClick={() => setTable(projectionsTable({ view: chartView, rows, revisions, products, editions, targetYear }))}
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
                        <IconButton icon={Download} label="Descargar CSV" onClick={() => downloadCsv(table.csv, table.filename)} />
                    )}
                >
                    <DataTable columns={table.columns} rows={table.rows} maxHeight={420} />
                </DataTableModal>
            ) : null}
        </section>
    );
};

export default ProjectionsSection;
