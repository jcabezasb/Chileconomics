import '../../styles/dataTable.css';

// Tabla simple (no temporal), p. ej. el ranking de regiones.
//   columns: [{ key, label, align, width, emphasis, bar }]
//   bar: clave de la fila con un valor entre 0 y 1 para dibujar una barra detrás del valor.
const DataTable = ({ columns, rows, maxHeight = 360 }) => {
    const safeRows = rows || [];
    const safeColumns = columns || [];
    const gridTemplateColumns = safeColumns.map((col) => col.width || 'minmax(0, 1fr)').join(' ');

    return (
        <div className="data-table">
            <div className="data-table-head" style={{ gridTemplateColumns }}>
                {safeColumns.map((col) => (
                    <span key={col.key} style={{ textAlign: col.align || 'left' }}>{col.label}</span>
                ))}
            </div>
            <div className="data-table-body" style={{ maxHeight }}>
                {safeRows.length ? (
                    safeRows.map((row, index) => (
                        <div key={`${row.id || index}`} className="data-table-row" style={{ gridTemplateColumns }}>
                            {safeColumns.map((col) => (
                                <span
                                    key={`${row.id || index}-${col.key}`}
                                    className={`data-table-cell${col.emphasis ? ' is-emphasis' : ''}${col.align === 'right' ? ' is-right' : ''}`}
                                >
                                    {col.bar && Number.isFinite(row[col.bar]) ? (
                                        <i className="data-table-bar" style={{ width: `${Math.max(0, Math.min(1, row[col.bar])) * 100}%` }} aria-hidden="true" />
                                    ) : null}
                                    <span>{typeof col.render === 'function' ? col.render(row) : row[col.key]}</span>
                                </span>
                            ))}
                        </div>
                    ))
                ) : (
                    <div className="data-table-empty">Sin datos para mostrar.</div>
                )}
            </div>
        </div>
    );
};

export default DataTable;
