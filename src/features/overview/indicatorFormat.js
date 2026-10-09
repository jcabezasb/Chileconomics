// Unidad y formato de cada indicador.
import { formatNumber } from '../../shared/utils/format';

const PERCENT_INDICATORS = new Set(['ipc', 'desempleo']);
const CURRENCY_INDICATORS = new Set(['dolar', 'cobre']);

export const DEFAULT_RANGE = '1y';
export const YOY_ELIGIBLE = new Set(['imacec', 'cobre', 'dolar']);

// ¿La serie mostrada ya es un porcentaje? (cambios en pp en vez de %)
export const isPercentUnit = (indicatorId, yoy) => yoy || PERCENT_INDICATORS.has(indicatorId);

// '4,1%', '$984,8' o '109,1' según el indicador; con variación en 12 meses siempre en %.
export const formatIndicatorValue = (indicatorId, value, yoy = false) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    const formatted = formatNumber(value, 1);
    if (isPercentUnit(indicatorId, yoy)) return `${formatted}%`;
    if (CURRENCY_INDICATORS.has(indicatorId)) return `$${formatted}`;
    return formatted;
};

export const axisUnit = (indicatorId, yoy) => {
    if (isPercentUnit(indicatorId, yoy)) return { suffix: '%' };
    if (CURRENCY_INDICATORS.has(indicatorId)) return { prefix: '$' };
    return {};
};
