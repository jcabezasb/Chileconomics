import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import MacroCard from './MacroCard';
import '../../styles/indicatorModal.css';

const IndicatorModal = ({ indicator, theme, onClose }) => {
    useEffect(() => {
        if (!indicator) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [indicator, onClose]);

    if (!indicator) return null;

    return createPortal(
        <div className="indicator-modal-backdrop" onClick={onClose}>
            <div
                className="indicator-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${indicator.title} - detalle`}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className="indicator-modal-close"
                    onClick={onClose}
                >
                    Cerrar
                </button>
                <MacroCard indicator={indicator} theme={theme} variant="modal" />
            </div>
        </div>,
        document.body
    );
};

export default IndicatorModal;
