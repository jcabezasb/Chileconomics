import { formatNumber } from '../../shared/utils/format';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// '2026-10-15' -> '15 oct 2026'; '2026-10-15' -> 'oct 26' (eje de rangos cortos).
export const formatDay = (date) => (date ? `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}` : '');
export const formatMonthTick = (date) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(2, 4)}`;
export const formatRate = (value) => (Number.isFinite(value) ? `${formatNumber(value, 2)}%` : '–');
export const formatPoints = (value) => (Number.isFinite(value) ? `${value > 0 ? '+' : ''}${formatNumber(value, 2)} pp` : '–');

// Colores de cada país (variables en mercados.css, validadas para daltonismo en claro y oscuro).
export const COUNTRY_COLOR = { chile: 'var(--mk-chile)', us: 'var(--mk-us)', spread: 'var(--mk-neutral)' };
