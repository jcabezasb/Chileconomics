import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './controls';
import '../../styles/indicatorModal.css';

// Ventana para mostrar una tabla: título, acciones opcionales (ej. descargar) y cerrar.
// El contenido (SeriesTable o DataTable) va como children.
const DataTableModal = ({ title, subtitle, actions, onClose, children }) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return createPortal(
        <div className="indicator-modal-backdrop data-modal-backdrop" onClick={onClose}>
            <div
                className="indicator-modal table-modal"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
            >
                <header className="table-modal-header">
                    <div>
                        <h2 className="table-modal-title">{title}</h2>
                        {subtitle ? <p className="table-modal-subtitle">{subtitle}</p> : null}
                    </div>
                    <div className="table-modal-actions">
                        {actions}
                        <IconButton icon={X} label="Cerrar" onClick={onClose} />
                    </div>
                </header>
                {children}
            </div>
        </div>,
        document.body
    );
};

export default DataTableModal;
