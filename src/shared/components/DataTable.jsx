
import '../../styles/dataTable.css';

const DataTable = ({ columns, rows, maxHeight = 360 }) => {
    const safeRows = rows || [];
    const safeColumns = columns || [];
    const gridTemplateColumns = `repeat(${safeColumns.length}, minmax(0, 1fr))`;

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
                                    className={col.emphasis ? 'is-emphasis' : undefined}
                                    style={{ textAlign: col.align || 'left' }}
                                >
                                    {typeof col.render === 'function' ? col.render(row) : row[col.key]}
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
