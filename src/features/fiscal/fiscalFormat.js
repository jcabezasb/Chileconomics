import { formatNumber } from '../../shared/utils/format';

// Montos de la DIPRES (millones de pesos) en la unidad más legible: billones, miles de millones o millones.
export const formatPesos = (millions) => {
    if (!Number.isFinite(millions)) return '--';
    const sign = millions < 0 ? '−' : '';
    const abs = Math.abs(millions);
    if (abs >= 1e6) return `${sign}$${formatNumber(abs / 1e6, 1)} billones`;
    if (abs >= 1e3) return `${sign}$${formatNumber(abs / 1e3, abs >= 1e5 ? 0 : 1)} mil millones`;
    return `${sign}$${formatNumber(abs, 0)} millones`;
};

// Montos de la tabla: siempre en miles de millones, para comparar filas a simple vista.
export const formatThousandMillions = (millions) => {
    if (!Number.isFinite(millions)) return '--';
    const text = formatNumber(Math.abs(millions) / 1e3, 0);
    return `${millions < 0 && text !== '0' ? '−' : ''}${text}`;
};

export const formatPct = (value, decimals = 1) => {
    if (!Number.isFinite(value)) return '--';
    const text = formatNumber(Math.abs(value), decimals);
    return `${value < 0 && Number(text.replace(',', '.')) !== 0 ? '−' : ''}${text}%`;
};

export const formatSignedPct = (value) => {
    if (!Number.isFinite(value)) return '--';
    const rounded = Math.round(value * 10) / 10;
    const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
    return `${sign}${formatNumber(Math.abs(rounded), 1)}%`;
};

export const pctAxis = (value) => `${value < 0 ? '−' : ''}${formatNumber(Math.abs(value), 0)}%`;

// Marcas del eje Y (incluyen el cero): vive en shared/utils para usarla también en proyecciones.
export { niceTicks } from '../../shared/utils/ticks';

export const FISCAL_COLORS = {
    ingresos: 'var(--accent)',
    gastos: '#f97316',
    balance: 'var(--text-primary)',
    up: 'var(--growth-pos)',
    down: 'var(--growth-neg)'
};
