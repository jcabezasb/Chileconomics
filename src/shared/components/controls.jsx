import '../../styles/controls.css';

// Controles reutilizables con el estilo de píldora del sitio (estilos en controls.css).

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
