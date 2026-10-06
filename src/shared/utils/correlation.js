// Relación entre dos series diarias (ej. cobre y dólar) a partir de sus variaciones diarias.
// Se usan variaciones (log-retornos) y no niveles: dos series con tendencia siempre parecen
// correlacionadas en niveles aunque no tengan relación.

// Último dato de cada semana (lunes a domingo). Las series diarias del Banco Central no siempre
// fechan igual el mismo día de mercado (el dólar observado de hoy se calcula con transacciones
// de ayer), así que comparar día a día subestima la relación; semana a semana ese desfase se diluye.
export const toWeekly = (series) => {
    const byWeek = new Map();
    (series || []).forEach((entry) => {
        const value = Number(entry?.value);
        if (!entry?.date || !(value > 0)) return;
        const day = new Date(`${entry.date}T00:00:00Z`);
        const monday = new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * 86400000);
        const weekKey = monday.toISOString().slice(0, 10);
        const current = byWeek.get(weekKey);
        if (!current || entry.date > current.lastDate) {
            byWeek.set(weekKey, { date: weekKey, lastDate: entry.date, value });
        }
    });
    return Array.from(byWeek.values()).sort((a, b) => a.date.localeCompare(b.date));
};

// Une por fecha exacta y calcula el log-retorno entre observaciones comunes consecutivas.
export const buildJoinedReturns = (seriesA, seriesB) => {
    const mapB = new Map();
    (seriesB || []).forEach((entry) => {
        const value = Number(entry?.value);
        if (entry?.date && value > 0) mapB.set(entry.date, value);
    });
    const joined = [];
    (seriesA || []).forEach((entry) => {
        const a = Number(entry?.value);
        const b = mapB.get(entry?.date);
        if (a > 0 && b > 0) joined.push({ date: entry.date, a, b });
    });
    joined.sort((x, y) => x.date.localeCompare(y.date));

    const returns = [];
    for (let i = 1; i < joined.length; i += 1) {
        returns.push({
            date: joined[i].date,
            ra: Math.log(joined[i].a / joined[i - 1].a),
            rb: Math.log(joined[i].b / joined[i - 1].b)
        });
    }
    return returns;
};

const pearson = (n, sumA, sumB, sumAA, sumBB, sumAB) => {
    const cov = n * sumAB - sumA * sumB;
    const varA = n * sumAA - sumA * sumA;
    const varB = n * sumBB - sumB * sumB;
    if (varA <= 0 || varB <= 0) return null;
    return cov / Math.sqrt(varA * varB);
};

// Correlación de Pearson en una ventana móvil de `window` observaciones (sumas acumuladas, O(n)).
// windows: [{ key: 'corr3m', size: 63 }, ...] -> filas [{ date, corr3m, ... }]
export const buildRollingCorrelation = (returns, windows) => {
    const rows = (returns || []).map((entry) => ({ date: entry.date }));
    windows.forEach(({ key, size }) => {
        let sumA = 0;
        let sumB = 0;
        let sumAA = 0;
        let sumBB = 0;
        let sumAB = 0;
        returns.forEach((entry, index) => {
            sumA += entry.ra;
            sumB += entry.rb;
            sumAA += entry.ra * entry.ra;
            sumBB += entry.rb * entry.rb;
            sumAB += entry.ra * entry.rb;
            if (index >= size) {
                const old = returns[index - size];
                sumA -= old.ra;
                sumB -= old.rb;
                sumAA -= old.ra * old.ra;
                sumBB -= old.rb * old.rb;
                sumAB -= old.ra * old.rb;
            }
            if (index >= size - 1) {
                rows[index][key] = pearson(size, sumA, sumB, sumAA, sumBB, sumAB);
            }
        });
    });
    return rows.filter((row) => windows.some(({ key }) => row[key] !== undefined && row[key] !== null));
};

// Correlación de todas las variaciones diarias entre dos fechas (inclusive).
export const correlationBetween = (returns, startDate, endDate) => {
    let n = 0;
    let sumA = 0;
    let sumB = 0;
    let sumAA = 0;
    let sumBB = 0;
    let sumAB = 0;
    (returns || []).forEach((entry) => {
        if ((startDate && entry.date < startDate) || (endDate && entry.date > endDate)) return;
        n += 1;
        sumA += entry.ra;
        sumB += entry.rb;
        sumAA += entry.ra * entry.ra;
        sumBB += entry.rb * entry.rb;
        sumAB += entry.ra * entry.rb;
    });
    return n > 2 ? pearson(n, sumA, sumB, sumAA, sumBB, sumAB) : null;
};
