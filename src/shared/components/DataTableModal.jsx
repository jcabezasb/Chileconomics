import React from 'react';
import { createPortal } from 'react-dom';
import DataTable from './DataTable';

const DataTableModal = ({ title, columns, rows, onClose, onDownload }) => createPortal(
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
            <DataTable columns={columns} rows={rows} />
        </div>
    </div>,
    document.body
);

export default DataTableModal;
