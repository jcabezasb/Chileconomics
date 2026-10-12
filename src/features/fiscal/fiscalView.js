// Cálculos de la sección de finanzas públicas (funciones puras, con pruebas en fiscalView.test.js).
// Los montos vienen mensuales en millones de pesos; aquí se suman por período y se expresan
// como % del PIB y como variación real (deflactando cada mes por el IPC).

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

// JSON de import_dipres.py -> { tree, extra, startYear, lastYear, lastMonth, series: { id: Map('2025-03' -> valor) } }
export const prepareFiscalData = (payload) => {
    if (!payload?.series || !payload.start) return null;
    const [startYear, startMonth] = payload.start.split('-').map(Number);
    const [lastYear, lastMonth] = payload.last_period.split('-').map(Number);
    const series = {};
    Object.entries(payload.series).forEach(([id, values]) => {
        const byMonth = new Map();
        values.forEach((value, offset) => {
            if (value === null || value === undefined) return;
            const index = startMonth - 1 + offset;
            byMonth.set(monthKey(startYear + Math.floor(index / 12), (index % 12) + 1), value);
        });
        series[id] = byMonth;
    });
    return {
        tree: payload.tree || [],
        extra: payload.extra || [],
        source: payload.source,
        sourceUrl: payload.source_url,
        startYear,
        lastYear,
        lastMonth,
        series
    };
};

// Contexto macro: IPC mensual (índice) y PIB nominal trimestral (miles de millones -> millones).
export const buildMacroContext = ({ ipc = [], pibNominal = [] }) => ({
    ipc: new Map(ipc.map(({ date, value }) => [date.slice(0, 7), value])),
    pib: new Map(pibNominal.map(({ date, value }) => [
        `${date.slice(0, 4)}-T${Math.ceil(Number(date.slice(5, 7)) / 3)}`,
        value * 1000
    ]))
});

// Períodos para elegir: el año en curso acumulado (si no está completo) y los años cerrados.
export const buildPeriods = ({ startYear, lastYear, lastMonth }) => {
    const periods = [];
    if (lastMonth < 12) {
        periods.push({
            id: `${lastYear}-ytd`,
            year: lastYear,
            months: lastMonth,
            partial: true,
            label: `${lastYear} (ene–${MONTHS[lastMonth - 1]})`,
            short: `ene–${MONTHS[lastMonth - 1]} ${lastYear}`
        });
    }
    for (let year = lastMonth < 12 ? lastYear - 1 : lastYear; year >= startYear; year -= 1) {
        periods.push({ id: String(year), year, months: 12, partial: false, label: String(year), short: String(year) });
    }
    return periods;
};

// Suma de los meses 1..months de un año. null si falta algún mes.
const sumMonths = (byMonth, year, months, transform = (value) => value) => {
    if (!byMonth) return null;
    let total = 0;
    for (let month = 1; month <= months; month += 1) {
        const key = monthKey(year, month);
        if (!byMonth.has(key)) return null;
        const value = transform(byMonth.get(key), key);
        if (!Number.isFinite(value)) return null;
        total += value;
    }
    return total;
};

export const periodTotal = (byMonth, year, months) => sumMonths(byMonth, year, months);

// Monto en pesos constantes (cada mes dividido por su IPC). Sirve para comparar entre años.
const realTotal = (byMonth, ipc, year, months) => sumMonths(
    byMonth,
    year,
    months,
    (value, key) => (ipc.has(key) ? value / ipc.get(key) : NaN)
);

// Variación real contra los mismos meses del año anterior. Solo tiene sentido si ambos montos
// tienen el mismo signo (en un balance que pasa de déficit a superávit no se informa).
export const realChange = (byMonth, ipc, year, months) => {
    const current = realTotal(byMonth, ipc, year, months);
    const previous = realTotal(byMonth, ipc, year - 1, months);
    if (current === null || previous === null || previous === 0) return null;
    if (Math.sign(current) !== Math.sign(previous)) return null;
    return (current / previous - 1) * 100;
};

// PIB nominal de los mismos trimestres del período (los informes de la DIPRES son trimestrales).
export const periodPib = (pib, year, months) => {
    if (months % 3 !== 0) return null;
    let total = 0;
    for (let quarter = 1; quarter <= months / 3; quarter += 1) {
        const value = pib.get(`${year}-T${quarter}`);
        if (!Number.isFinite(value)) return null;
        total += value;
    }
    return total;
};

export const nodeStats = (data, context, id, period) => {
    const byMonth = data.series[id];
    const value = periodTotal(byMonth, period.year, period.months);
    const pib = periodPib(context.pib, period.year, period.months);
    return {
        value,
        pctPib: value !== null && pib ? (value / pib) * 100 : null,
        realChange: realChange(byMonth, context.ipc, period.year, period.months)
    };
};

// Árbol con los números del período. share = peso dentro del total de su rama (ingresos o gastos).
export const buildTreeView = (data, context, period) => {
    const decorate = (node, rootValue, depth) => {
        const stats = nodeStats(data, context, node.id, period);
        const root = depth === 0 ? stats.value : rootValue;
        return {
            ...node,
            ...stats,
            depth,
            share: stats.value !== null && root ? (stats.value / root) * 100 : null,
            children: (node.children || []).map((child) => decorate(child, root, depth + 1))
        };
    };
    return data.tree.map((node) => decorate(node, null, 0));
};

// Historia anual de una partida: años cerrados y, al final, el año en curso acumulado.
export const buildHistory = (data, context, id, periods) => (
    [...periods].reverse().map((period) => ({
        label: period.partial ? `${period.year}*` : String(period.year),
        period,
        ...nodeStats(data, context, id, period)
    }))
);

// Serie mensual de una partida para la tabla ([{ date: 'YYYY-MM-01', value }]).
export const monthlyRows = (data, id) => (
    Array.from(data.series[id]?.entries() || [])
        .map(([key, value]) => ({ date: `${key}-01`, value }))
        .sort((a, b) => a.date.localeCompare(b.date))
);

// Busca una partida del árbol (o de las series extra) por id.
export const findNode = (nodes, id) => {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.children || [], id);
        if (found) return found;
    }
    return null;
};

// CSV del árbol del período (todas las partidas, abiertas o no). Separador ';' y coma decimal.
export const treeCsv = (tree, formatNumber) => {
    const cell = (value, decimals) => (Number.isFinite(value) ? formatNumber(value, decimals) : '');
    const lines = [];
    const visit = (node) => {
        lines.push([
            `${'  '.repeat(node.depth)}${node.label}`,
            cell(node.value, 0),
            cell(node.pctPib, 2),
            cell(node.realChange, 1)
        ].join(';'));
        (node.children || []).forEach(visit);
    };
    tree.forEach(visit);
    return ['partida;monto_millones_pesos;porcentaje_pib;variacion_real_pct', ...lines].join('\n');
};
