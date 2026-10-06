import React, { useState } from 'react';
import { Download, LineChart, Table2 } from 'lucide-react';
import DataTable from '../../shared/components/DataTable';

export const Segmented = ({ options, value, onChange, ariaLabel }) => (
    <div className="detail-segmented" role="group" aria-label={ariaLabel}>
        {options.map((option) => {
            const Icon = option.icon;
            const isActive = value === option.id;
            return (
                <button
                    key={option.id}
                    type="button"
                    className={`detail-segment${isActive ? ' is-active' : ''}`}
                    aria-pressed={isActive}
                    title={option.title}
                    onClick={(event) => {
                        event.stopPropagation();
                        onChange(option.id);
                    }}
                >
                    {Icon ? <Icon size={13} strokeWidth={2.2} aria-hidden="true" /> : null}
                    {option.label}
                </button>
            );
        })}
    </div>
);

export const IconButton = ({ icon: Icon, label, onClick, active = false, showLabel = false }) => (
    <button
        type="button"
        className={`detail-icon-btn${active ? ' is-active' : ''}${showLabel ? ' has-label' : ''}`}
        aria-label={label}
        aria-pressed={active || undefined}
        title={label}
        onClick={(event) => {
            event.stopPropagation();
            onClick();
        }}
    >
        <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
        {showLabel ? <span>{label}</span> : null}
    </button>
);

export const StatStrip = ({ items }) => (
    <dl className="detail-stats">
        {items.filter(Boolean).map((item) => (
            <div key={item.label} className="detail-stat">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
                {item.hint ? <span className="detail-stat-hint">{item.hint}</span> : null}
            </div>
        ))}
    </dl>
);

export const Legend = ({ items, onToggle, activeKeys }) => (
    <div className="detail-legend">
        {items.map((item) => {
            const isToggle = typeof onToggle === 'function';
            const isActive = !activeKeys || activeKeys.includes(item.id);
            const content = (
                <>
                    <span className="detail-legend-dot" style={{ background: isActive ? item.color : 'transparent', borderColor: item.color }} />
                    {item.label}
                </>
            );
            return isToggle ? (
                <button
                    key={item.id}
                    type="button"
                    className={`detail-legend-item is-toggle${isActive ? ' is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggle(item.id);
                    }}
                >
                    {content}
                </button>
            ) : (
                <span key={item.id} className="detail-legend-item">{content}</span>
            );
        })}
    </div>
);

// Tarjeta del desglose: título, último valor, acciones y gráfico/tabla intercambiables.
export const DetailPanel = ({
    title,
    subtitle,
    latest,
    change,
    info,
    legend,
    table,
    onDownload,
    wide = false,
    children
}) => {
    const [showTable, setShowTable] = useState(false);
    // La tabla se arma solo al abrirla: formatear miles de filas que nadie mira es caro.
    const tableData = showTable && table ? table() : null;

    return (
        <article className={`detail-panel${wide ? ' is-wide' : ''}`}>
            <header className="detail-panel-header">
                <div className="detail-panel-heading">
                    <h4 className="detail-panel-title">
                        {title}
                        {info ? <span className="detail-info" title={info} aria-label={info}>?</span> : null}
                    </h4>
                    {subtitle ? <p className="detail-panel-subtitle">{subtitle}</p> : null}
                </div>
                <div className="detail-panel-actions">
                    {table ? (
                        <IconButton
                            icon={showTable ? LineChart : Table2}
                            label={showTable ? 'Ver gráfico' : 'Ver tabla'}
                            onClick={() => setShowTable((prev) => !prev)}
                        />
                    ) : null}
                    {onDownload ? (
                        <IconButton icon={Download} label="Descargar CSV" onClick={onDownload} />
                    ) : null}
                </div>
            </header>
            {latest ? (
                <div className="detail-panel-value">
                    <span className="detail-panel-latest">{latest}</span>
                    {change ? (
                        <span className={`detail-change is-${change.direction}`}>{change.text}</span>
                    ) : null}
                </div>
            ) : null}
            {legend}
            <div className="detail-panel-body">
                {tableData ? (
                    <DataTable columns={tableData.columns} rows={tableData.rows} maxHeight={240} />
                ) : children}
            </div>
        </article>
    );
};
