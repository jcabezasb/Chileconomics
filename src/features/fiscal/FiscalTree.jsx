import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatPct, formatSignedPct, formatThousandMillions } from './fiscalFormat';

const changeClass = (value) => {
    if (!Number.isFinite(value) || Math.abs(value) < 0.05) return '';
    return value > 0 ? ' is-up' : ' is-down';
};

const TreeRow = ({ node, expanded, onToggle, selectedId, onSelect }) => {
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id);
    const isRoot = node.depth === 0;
    const showShare = !isRoot && Number.isFinite(node.share) && node.share > 0;

    return (
        <>
            <div
                className={`fiscal-row depth-${Math.min(node.depth, 3)}${isRoot ? ' is-root' : ''}${selectedId === node.id ? ' is-selected' : ''}`}
                role="row"
            >
                <div className="fiscal-row-name" role="cell" style={{ '--depth': node.depth }}>
                    {hasChildren ? (
                        <button
                            type="button"
                            className={`fiscal-toggle${isOpen ? ' is-open' : ''}`}
                            aria-expanded={isOpen}
                            aria-label={`${isOpen ? 'Cerrar' : 'Abrir'} ${node.label}`}
                            onClick={() => onToggle(node.id)}
                        >
                            <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                    ) : (
                        <span className="fiscal-toggle-spacer" aria-hidden="true" />
                    )}
                    <button type="button" className="fiscal-row-label" onClick={() => onSelect(node.id)} title="Ver evolución">
                        <span>{node.label}</span>
                        {showShare ? (
                            <span className="fiscal-share" aria-hidden="true">
                                <span style={{ width: `${Math.min(node.share, 100)}%` }} />
                            </span>
                        ) : null}
                    </button>
                </div>
                <span className="fiscal-cell" role="cell">{formatThousandMillions(node.value)}</span>
                <span className="fiscal-cell fiscal-col-pib" role="cell">{formatPct(node.pctPib)}</span>
                <span className={`fiscal-cell fiscal-change${changeClass(node.realChange)}`} role="cell">
                    {formatSignedPct(node.realChange)}
                </span>
            </div>
            {hasChildren && isOpen
                ? node.children.map((child) => (
                    <TreeRow
                        key={child.id}
                        node={child}
                        expanded={expanded}
                        onToggle={onToggle}
                        selectedId={selectedId}
                        onSelect={onSelect}
                    />
                ))
                : null}
        </>
    );
};

// Tabla desplegable de una rama (ingresos o gastos). La raíz parte abierta, y también sus
// componentes si son pocos (los gastos: corriente y de capital).
const FiscalTree = ({ root, selectedId, onSelect }) => {
    const [expanded, setExpanded] = useState(() => new Set([
        root.id,
        ...(root.children.length <= 3 ? root.children.map((child) => child.id) : [])
    ]));
    const toggle = (id) => setExpanded((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    return (
        <div className="fiscal-tree" role="table" aria-label={root.label}>
            <div className="fiscal-row fiscal-head" role="row">
                <span role="columnheader">Partida</span>
                <span className="fiscal-cell" role="columnheader" title="Miles de millones de pesos">$ mil mill.</span>
                <span className="fiscal-cell fiscal-col-pib" role="columnheader">% PIB</span>
                <span className="fiscal-cell" role="columnheader" title="Variación real contra los mismos meses del año anterior">Var. real</span>
            </div>
            <TreeRow node={root} expanded={expanded} onToggle={toggle} selectedId={selectedId} onSelect={onSelect} />
        </div>
    );
};

export default FiscalTree;
