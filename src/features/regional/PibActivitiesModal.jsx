import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import TrendChart from '../../shared/components/TrendChart';
import { getSeriesMap } from '../../data/bcch/client';
import { PIB_ACTIVITIES, regionalKey } from '../../data/bcch/seriesKeys';
import { formatNumber } from '../../shared/utils/format';

const ACTIVITY_META = {
    bienes: { label: 'Producción de bienes', color: '#3b82f6' },
    mineria: { label: 'Minería', color: '#ef4444' },
    industria: { label: 'Industria', color: '#f59e0b' },
    resto: { label: 'Resto de bienes', color: '#8b5cf6' },
    comercio: { label: 'Comercio', color: '#10b981' },
    servicios: { label: 'Servicios', color: '#06b6d4' }
};

// PIB de una región por actividad económica (últimos 20 trimestres).
const PibActivitiesModal = ({ regionId, regionName, theme, onClose }) => {
    const [series, setSeries] = useState(null);

    useEffect(() => {
        let isActive = true;
        getSeriesMap(Object.fromEntries(PIB_ACTIVITIES.map((activity) => [activity, regionalKey.pibActivity(regionId, activity)])))
            .then((data) => {
                if (isActive) setSeries(data);
            });
        return () => {
            isActive = false;
        };
    }, [regionId]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const hasData = series && Object.values(series).some((entries) => entries.length);

    return createPortal(
        <div className="indicator-modal-backdrop data-modal-backdrop" onClick={onClose}>
            <div
                className="indicator-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`PIB por actividad - ${regionName}`}
                onClick={(event) => event.stopPropagation()}
            >
                <button type="button" className="indicator-modal-close" onClick={onClose}>Cerrar</button>
                <h2 className="activity-modal-title">PIB por actividad · {regionName}</h2>
                <p className="activity-modal-subtitle">Miles de millones de pesos encadenados (referencia 2018), últimos 5 años.</p>
                {!series ? (
                    <p className="activity-modal-empty">Cargando datos…</p>
                ) : !hasData ? (
                    <p className="activity-modal-empty">
                        Las series por actividad de esta región todavía no están en los datos publicados.
                        Aparecerán automáticamente después de la próxima sincronización con el Banco Central.
                    </p>
                ) : (
                    <div className="activity-modal-grid">
                        {PIB_ACTIVITIES.map((activity) => {
                            const entries = series[activity];
                            const latest = entries[entries.length - 1];
                            const { label, color } = ACTIVITY_META[activity];
                            return (
                                <div key={activity} className="activity-card">
                                    <div className="activity-card-header">
                                        <span className="activity-card-label" style={{ color }}>{label}</span>
                                        <span className="activity-card-value">
                                            {latest ? `${formatNumber(latest.value, 1)} MM` : '--'}
                                        </span>
                                    </div>
                                    <TrendChart
                                        data={entries.slice(-20)}
                                        color={color}
                                        height={60}
                                        valueFormatter={(value) => formatNumber(value, 1)}
                                        theme={theme}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default PibActivitiesModal;
