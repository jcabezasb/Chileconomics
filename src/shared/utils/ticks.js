// Marcas del eje en números redondos (1, 2, 2,5 o 5 por potencia de 10) que incluyen el cero.
export const niceTicks = (values, count = 5) => {
    const finite = values.filter(Number.isFinite);
    if (!finite.length) return undefined;
    const min = Math.min(0, ...finite);
    const max = Math.max(0, ...finite);
    const raw = (max - min || 1) / count;
    const power = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw);
    const ticks = [];
    for (let tick = Math.floor(min / step) * step; tick <= max + step * 1e-9; tick += step) ticks.push(Number(tick.toFixed(10)));
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
};
