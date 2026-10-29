// Geometría del gráfico de IED: barra del total, tramos del mapa, cintas y etiquetas.
// Funciones puras (todo en píxeles del SVG), probadas en iedLayout.test.js.

const round = (value) => Math.round(value * 10) / 10;

// Reparte la altura de la barra entre los ítems, en orden, dejando `gap` entre segmentos.
export const barSegments = (items, { top, height, gap }) => {
    const total = items.reduce((sum, item) => sum + Math.max(0, item.value || 0), 0);
    const usable = height - gap * Math.max(0, items.length - 1);
    let y = top;
    return items.map((item) => {
        const size = total ? (Math.max(0, item.value || 0) / total) * usable : 0;
        const segment = { id: item.id, y0: y, y1: y + size };
        y += size + gap;
        return segment;
    });
};

// Tramos verticales de cada grupo en el mapa, de norte a sur y sin superponerse: los bordes de
// regiones vecinas se traslapan un poco, así que el límite queda a medio camino entre ambos.
export const contiguousSpans = (spans) => spans.map((span, index) => ({
    ...span,
    y0: index === 0 ? span.y0 : (spans[index - 1].y1 + span.y0) / 2,
    y1: index === spans.length - 1 ? span.y1 : (span.y1 + spans[index + 1].y0) / 2
}));

// Llegada de una cinta al mapa: mismo grosor que su segmento de la barra (el ancho representa el
// monto), centrada en el tramo de su grupo y sin pasarse de él (la RM es angosta en el mapa).
export const ribbonTarget = (segment, span) => {
    const size = Math.min(segment.y1 - segment.y0, span.y1 - span.y0);
    const middle = (span.y0 + span.y1) / 2;
    return [middle - size / 2, middle + size / 2];
};

// Cinta desde el tramo [s0, s1] de la barra (en x0) hasta el tramo [t0, t1] del mapa (en x1).
// Las curvas salen y llegan horizontales, como en un diagrama de Sankey.
export const ribbonPath = (x0, [s0, s1], x1, [t0, t1]) => {
    const mid = round((x0 + x1) / 2);
    const [a, b, c, d, e, f] = [x0, s0, x1, t0, t1, s1].map(round);
    return `M${a},${b} C${mid},${b} ${mid},${d} ${c},${d} L${c},${e} C${mid},${e} ${mid},${f} ${a},${f} Z`;
};

// Separa etiquetas para que no se tapen: al menos minGap entre centros, dentro de [top, bottom].
// ys debe venir ordenado de arriba hacia abajo.
export const spreadLabels = (ys, minGap, top, bottom) => {
    const out = [...ys];
    for (let i = 0; i < out.length; i += 1) {
        out[i] = Math.max(out[i], i === 0 ? top : out[i - 1] + minGap);
    }
    for (let i = out.length - 1; i >= 0; i -= 1) {
        out[i] = Math.min(out[i], i === out.length - 1 ? bottom : out[i + 1] - minGap);
    }
    return out;
};

// Minigráfico de la evolución del stock: línea y área desde cero dentro de width × height.
export const sparkline = (values, width, height) => {
    const max = Math.max(0, ...values.filter(Number.isFinite));
    const step = values.length > 1 ? width / (values.length - 1) : 0;
    const points = values.map((value, index) => ({
        x: round(index * step),
        y: round(max ? height - (value / max) * height : height)
    }));
    const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
    const area = points.length ? `${line} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z` : '';
    return { points, line, area };
};

// Tramos verticales iguales para una lista de `count` filas entre top y bottom (la lista de sectores
// que reemplaza al mapa). Cada cinta llega al centro de su fila con el grosor de su segmento, sin
// pasarse de `fill` (fracción de la fila) para que cintas vecinas no se toquen.
export const listSlots = (count, top, bottom, fill = 0.7) => {
    const size = count ? (bottom - top) / count : 0;
    return Array.from({ length: count }, (_, index) => {
        const middle = top + size * (index + 0.5);
        return { y0: middle - (size * fill) / 2, y1: middle + (size * fill) / 2, middle };
    });
};
