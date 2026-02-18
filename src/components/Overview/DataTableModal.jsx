import React from 'react';
import { createPortal } from 'react-dom';

const DataTableModal = ({ title, columns, rows, onClose, onDownload }) => {
    const safeRows = rows || [];
    const safeColumns = columns || [];

    return createPortal(
        <div className="indicator-modal-backdrop data-modal-backdrop" onClick={onClose}>
            <div
                className="indicator-modal"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="indicator-modal-close"
                    onClick={onClose}
                >
                    Cerrar
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
                    {onDownload ? (
                        <button
                            type="button"
                            onClick={onDownload}
                            style={{
                                fontSize: '0.65rem',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '999px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: 700
                            }}
                        >
                            Descargar CSV
                        </button>
                    ) : null}
                </div>
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    maxHeight: '420px'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${safeColumns.length}, minmax(0, 1fr))`,
                        padding: '0.55rem 0.8rem',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        background: 'color-mix(in srgb, var(--bg-card) 80%, transparent)'
                    }}>
                        {safeColumns.map((col) => (
                            <span key={col.key} style={{ textAlign: col.align || 'left' }}>{col.label}</span>
                        ))}
                    </div>
                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                        {safeRows.length ? (
                            safeRows.map((row, index) => (
                                <div
                                    key={`${row.id || index}`}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${safeColumns.length}, minmax(0, 1fr))`,
                                        padding: '0.5rem 0.8rem',
                                        borderTop: '1px solid var(--border)',
                                        fontSize: '0.68rem',
                                        color: 'var(--text-secondary)'
                                    }}
                                >
                                {safeColumns.map((col) => (
                                    <span
                                        key={`${row.id || index}-${col.key}`}
                                        style={{ textAlign: col.align || 'left', color: col.emphasis ? 'var(--text-primary)' : 'inherit', fontWeight: col.emphasis ? 600 : 400 }}
                                    >
                                        {typeof col.render === 'function' ? col.render(row) : row[col.key]}
                                    </span>
                                ))}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '1rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                Sin datos para mostrar.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DataTableModal;
