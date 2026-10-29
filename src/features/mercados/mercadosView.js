// Cálculos de la sección Mercados (funciones puras, probadas en mercadosView.test.js).
// Series como [{ date: 'YYYY-MM-DD', value }] ordenadas por fecha.

export const RANGES = [
    { id: '1', label: '1A' },
    { id: '5', label: '5A' },
    { id: '10', label: '10A' }
];

// Plazos comparables: los que publican ambos países (Chile no tiene bonos a 1 ni 3 años).
export const SPREAD_TENORS = ['2', '5', '10'];
export const REAL_TENORS = ['5', '10'];

// Plazo en años de cada punto de la curva ('policy' es la tasa de política, plazo 0).
export const TENOR_YEARS = { policy: 0, 1: 1, 2: 2, 3: 3, 5: 5, 10: 10 };

export const lastPoint = (series) => (series?.length ? series[series.length - 1] : null);

// Último valor con fecha <= date (o null si no hay).
export const valueOn = (series, date) => {
    if (!series?.length || !date) return null;
    for (let i = series.length - 1; i >= 0; i -= 1) {
        if (series[i].date <= date) return series[i].value;
    }
    return null;
};

const shiftYears = (date, years) => `${Number(date.slice(0, 4)) - years}${date.slice(4)}`;

// Los últimos `years` años de una serie, contados desde su último dato.
export const lastYears = (series, years) => {
    const last = lastPoint(series);
    if (!last) return [];
    const from = shiftYears(last.date, Number(years));
    return series.filter((point) => point.date >= from);
};

// Último dato de cada semana (lunes a domingo): aliviana los gráficos de series diarias.
export const weekly = (series) => {
    const byWeek = new Map();
    (series || []).forEach((point) => {
        const day = new Date(`${point.date}T00:00:00Z`);
        day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
        byWeek.set(day.toISOString().slice(0, 10), point);
    });
    return Array.from(byWeek.values());
};

// a − b en las fechas que tienen ambas series (por ejemplo, Chile menos EE.UU. al mismo plazo).
export const diffByDate = (a, b) => {
    const other = new Map((b || []).map((point) => [point.date, point.value]));
    return (a || [])
        .filter((point) => other.has(point.date))
        .map((point) => ({ date: point.date, value: point.value - other.get(point.date) }));
};

// Variación porcentual del último dato contra el de un año antes (o null).
export const yearChange = (series) => {
    const last = lastPoint(series);
    if (!last) return null;
    const before = valueOn(series, shiftYears(last.date, 1));
    return Number.isFinite(before) && before !== 0 ? (last.value / before - 1) * 100 : null;
};

// Curvas del día: la fecha es la más reciente que tienen ambos países en sus bonos, y cada punto
// toma su valor a esa fecha. points: { [plazo]: serie }. Plazos sin dato quedan fuera.
export const yieldCurves = (chile, us) => {
    const lastOf = (points) => Object.entries(points)
        .filter(([tenor]) => tenor !== 'policy')
        .map(([, series]) => lastPoint(series)?.date)
        .filter(Boolean)
        .sort()
        .pop();
    const date = [lastOf(chile), lastOf(us)].filter(Boolean).sort()[0] || null;
    const curve = (points) => Object.entries(points)
        .map(([tenor, series]) => ({ tenor, years: TENOR_YEARS[tenor], value: valueOn(series, date) }))
        .filter((point) => Number.isFinite(point.value))
        .sort((p, q) => p.years - q.years);
    return { date, chile: date ? curve(chile) : [], us: date ? curve(us) : [] };
};

// Filas para un gráfico de varias líneas: { clave: serie } -> [{ date, clave1, clave2 }], semanal y
// dentro del rango.
export const chartRows = (seriesByKey, years) => {
    const rows = new Map();
    Object.entries(seriesByKey).forEach(([key, series]) => {
        weekly(lastYears(series, years)).forEach((point) => {
            const row = rows.get(point.date) || { date: point.date };
            row[key] = point.value;
            rows.set(point.date, row);
        });
    });
    return Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
};
