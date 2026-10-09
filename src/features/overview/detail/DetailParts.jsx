import { useState } from 'react';
import { Download, LineChart, Table2 } from 'lucide-react';
import { IconButton } from '../../../shared/components/controls';
import SeriesTable from '../../../shared/components/SeriesTable';

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
                    <SeriesTable {...tableData} maxHeight={260} />
                ) : children}
            </div>
        </article>
    );
};
