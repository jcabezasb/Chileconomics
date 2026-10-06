// Reduce una serie larga a ~threshold puntos para dibujarla, sin perder su forma.
// Usa LTTB (Largest-Triangle-Three-Buckets): en cada tramo se queda con el punto real
// que forma el triángulo más grande con sus vecinos, así se conservan peaks y caídas.
// Solo afecta el dibujo: tablas y CSV siguen usando la serie completa.
export const downsampleLTTB = (data, threshold, key = 'value') => {
    if (!data || threshold < 3 || data.length <= threshold) return data;

    const points = data.filter((item) => Number.isFinite(Number(item[key])));
    if (points.length <= threshold) return points;

    const sampled = [points[0]];
    const bucketSize = (points.length - 2) / (threshold - 2);
    let anchorIndex = 0;

    for (let bucket = 0; bucket < threshold - 2; bucket += 1) {
        // Promedio del tramo siguiente: el tercer vértice del triángulo.
        const nextStart = Math.floor((bucket + 1) * bucketSize) + 1;
        const nextEnd = Math.min(Math.floor((bucket + 2) * bucketSize) + 1, points.length);
        let avgX = 0;
        let avgY = 0;
        for (let i = nextStart; i < nextEnd; i += 1) {
            avgX += i;
            avgY += Number(points[i][key]);
        }
        const nextCount = Math.max(nextEnd - nextStart, 1);
        avgX /= nextCount;
        avgY /= nextCount;

        const start = Math.floor(bucket * bucketSize) + 1;
        const end = Math.floor((bucket + 1) * bucketSize) + 1;
        const anchorY = Number(points[anchorIndex][key]);
        let maxArea = -1;
        let chosen = start;
        for (let i = start; i < end; i += 1) {
            const area = Math.abs(
                (anchorIndex - avgX) * (Number(points[i][key]) - anchorY)
                - (anchorIndex - i) * (avgY - anchorY)
            );
            if (area > maxArea) {
                maxArea = area;
                chosen = i;
            }
        }
        sampled.push(points[chosen]);
        anchorIndex = chosen;
    }

    sampled.push(points[points.length - 1]);
    return sampled;
};

// Para gráficos con varias series en filas compartidas: toma una fila cada N.
export const downsampleStride = (data, threshold) => {
    if (!data || data.length <= threshold) return data;
    const step = data.length / threshold;
    const sampled = [];
    for (let i = 0; i < threshold; i += 1) {
        sampled.push(data[Math.floor(i * step)]);
    }
    if (sampled[sampled.length - 1] !== data[data.length - 1]) sampled.push(data[data.length - 1]);
    return sampled;
};
