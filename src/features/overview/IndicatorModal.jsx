import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import MacroCard from './MacroCard';
import '../../styles/indicatorModal.css';

const IndicatorModal = ({ indicator, theme, onClose }) => {
    const dialogRef = useRef(null);

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

    useEffect(() => {
        if (indicator) dialogRef.current?.focus();
    }, [indicator]);

    if (!indicator) return null;

    return createPortal(
        <div className="indicator-modal-backdrop" onClick={onClose}>
            <div
                ref={dialogRef}
                className="indicator-modal indicator-modal--detail"
                role="dialog"
                aria-modal="true"
                aria-label={`${indicator.title} - detalle`}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
            >
                <MacroCard indicator={indicator} theme={theme} variant="modal" onClose={onClose} />
            </div>
        </div>,
        document.body
    );
};

export default IndicatorModal;
