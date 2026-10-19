import { ExternalLink } from 'lucide-react';
import { Segmented } from '../../shared/components/controls';
import useSourcesView from './useSourcesView';
import '../../styles/sources.css';

const EMPTY = '—';

// Fuentes: de dónde sale cada dato, cada cuánto se publica, cuál es el último dato y cuándo el sitio
// revisó la fuente por última vez. Un botón por institución.
const SourcesSection = ({ sectionRef, onSelectSection }) => {
    const { loading, groups, current, group, setGroup } = useSourcesView();

    return (
        <section className="sources-section reveal reveal-delay-1" ref={sectionRef}>
            <div className="regional-card sources-card">
                <div className="sources-header">
                    <h2 className="regional-title">Fuentes</h2>
                    <p className="regional-subtitle">
                        De dónde viene cada dato del sitio. Todas las fuentes se revisan automáticamente cada día.
                    </p>
                </div>

                <div className="sources-toolbar">
                    <Segmented
                        ariaLabel="Institución"
                        options={groups.map(({ id, label }) => ({ id, label }))}
                        value={group}
                        onChange={setGroup}
                    />
                </div>

                <p className="sources-intro">
                    <b>{current.name}.</b> {current.description}
                </p>

                <div className="sources-table-wrap">
                    <table className="sources-table">
                        <thead>
                            <tr>
                                <th scope="col">Dato</th>
                                <th scope="col">Sección</th>
                                <th scope="col">Frecuencia</th>
                                <th scope="col">Último dato</th>
                                <th scope="col">Revisado</th>
                                <th scope="col"><span className="sources-sr">Enlace</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {current.rows.map((row) => (
                                <tr key={row.id}>
                                    <th scope="row">
                                        {row.label}
                                        {row.note ? <small>{row.note}</small> : null}
                                    </th>
                                    <td data-label="Sección">
                                        <button type="button" className="sources-section-link" onClick={() => onSelectSection(row.section)}>
                                            {row.sectionLabel}
                                        </button>
                                    </td>
                                    <td data-label="Frecuencia">{row.frequency}</td>
                                    <td data-label="Último dato">{loading ? '…' : row.lastData || EMPTY}</td>
                                    <td data-label="Revisado">{loading ? '…' : row.checked || EMPTY}</td>
                                    <td className="sources-link-cell">
                                        <a href={row.url} target="_blank" rel="noreferrer" className="sources-link">
                                            Ver fuente
                                            <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="sources-footnote">
                    <b>Último dato:</b> el período más reciente que ha publicado la fuente.{' '}
                    <b>Revisado:</b> el último día en que el sitio consultó la fuente con éxito. Un dato puede tener
                    meses y estar al día: algunas fuentes publican cada trimestre o cada año.
                </p>
            </div>
        </section>
    );
};

export default SourcesSection;
