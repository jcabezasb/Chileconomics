import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { buildMiniSparklinePath } from '../../utils/sparkline';

// Mini sparkline SVG component
const getTrendFromHistory = (history, fallback = 'up') => {
    if (!history || history.length < 2) return fallback;
    const first = history[0];
    const last = history[history.length - 1];
    if (first === null || last === null) return fallback;
    if (Number.isNaN(first) || Number.isNaN(last)) return fallback;
    return last >= first ? 'up' : 'down';
};

const MiniSparkline = ({ history, trend }) => {
    const trendFromHistory = getTrendFromHistory(history, trend);
    const color = trendFromHistory === 'up' ? 'var(--trend-up)' : trendFromHistory === 'down' ? 'var(--trend-down)' : 'var(--text-secondary)';

    // Si no hay history o es corta, usar un path estático como fallback
    if (!history || history.length < 2) {
        const points = trendFromHistory === 'up'
            ? "M0,20 L10,18 L20,22 L30,15 L40,18 L50,12 L60,14 L70,8 L80,10 L90,5 L100,3"
            : trendFromHistory === 'down'
                ? "M0,5 L10,8 L20,6 L30,12 L40,10 L50,15 L60,13 L70,18 L80,16 L90,20 L100,22"
                : "M0,12 L10,10 L20,14 L30,12 L40,13 L50,11 L60,13 L70,12 L80,14 L90,11 L100,13";
        return (
            <svg width="45" height="18" viewBox="0 0 100 25" style={{ flexShrink: 0 }}>
                <path d={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    const sparkline = buildMiniSparklinePath(history);
    if (!sparkline) return null;

    return (
        <svg width="45" height="18" viewBox={sparkline.viewBox} style={{ flexShrink: 0 }}>
            <path
                d={sparkline.path}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

const CompactIndicator = ({ indicator }) => {
    const getTrendIcon = (trend) => {
        if (trend === 'up') return <TrendingUp size={16} style={{ color: 'var(--trend-up)' }} />;
        if (trend === 'down') return <TrendingDown size={16} style={{ color: 'var(--trend-down)' }} />;
        return <Minus size={16} style={{ color: 'var(--text-secondary)' }} />;
    };

    const trendColor = indicator.trend === 'up'
        ? 'var(--trend-up)'
        : indicator.trend === 'down'
            ? 'var(--trend-down)'
            : 'var(--text-secondary)';

    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) max-content max-content max-content',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                cursor: 'default',
                height: '100%'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'var(--border)';
            }}
        >
            {/* Title */}
            <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                fontWeight: 500
            }}>
                {indicator.title}
            </span>

            {/* Value */}
            <span style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                minWidth: '80px',
                textAlign: 'right'
            }}>
                {indicator.value}
            </span>

            {/* Sparkline */}
            <MiniSparkline history={indicator.history} trend={indicator.trend} />

            {/* Variation + Icon */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                minWidth: '55px',
                justifyContent: 'flex-end'
            }}>
                {indicator.variation && (
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: trendColor
                    }}>
                        {indicator.variation}
                    </span>
                )}
                {getTrendIcon(indicator.trend)}
            </div>
        </div>
    );
};

export default CompactIndicator;
