import { memo, useCallback, useEffect, useRef } from 'react';
import { geoOrthographic, geoPath } from 'd3-geo';
import { GRATICULE, SPHERE, WORLD, isOnFront } from './globeData';

// Colores del tema actual (variables CSS), leídos al dibujar para seguir el modo claro/oscuro.
const themeColors = (element) => {
    const style = getComputedStyle(element);
    const read = (name) => style.getPropertyValue(name).trim();
    return {
        card: read('--bg-card'),
        border: read('--border'),
        land: read('--map-fill'),
        accent: read('--map-fill-selected'),
        text: read('--text-primary')
    };
};

// Rellena y bordea un grupo de países con una sola ruta (más rápido que uno por uno).
const paint = (ctx, path, countries, fill, overlay) => {
    if (!countries.length) return;
    ctx.beginPath();
    countries.forEach((country) => path(country.geo));
    ctx.fillStyle = fill;
    ctx.fill();
    if (overlay) {
        ctx.globalAlpha = overlay.alpha;
        ctx.fillStyle = overlay.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    ctx.stroke();
};

// Globo dibujado en un <canvas> debajo del SVG del gráfico. En canvas cada cuadro del giro cuesta
// poco: no hay que generar ni leer cientos de rutas SVG. Ocupa el cuadrado del globo dentro del
// SVG (cx, cy, radio en unidades del SVG de ancho `width` y alto `height`).
const GlobeCanvas = ({ cx, cy, radius, width, height, rotation, dataIsos, activeIso }) => {
    const canvasRef = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        const pixels = Math.max(1, Math.round(rect.width * ratio));
        if (canvas.width !== pixels || canvas.height !== pixels) {
            canvas.width = pixels;
            canvas.height = pixels;
        }
        const ctx = canvas.getContext('2d');
        const scale = pixels / (radius * 2);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.clearRect(0, 0, radius * 2, radius * 2);

        const projection = geoOrthographic().scale(radius).translate([radius, radius]).rotate(rotation).clipAngle(90).precision(2);
        const path = geoPath(projection, ctx);
        const colors = themeColors(canvas);
        const center = [-rotation[0], -rotation[1]];
        const visible = WORLD.filter((country) => isOnFront(country, center));

        ctx.beginPath();
        path(SPHERE);
        ctx.fillStyle = colors.card;
        ctx.fill();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = colors.accent;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        path(GRATICULE);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.strokeStyle = colors.card;
        ctx.lineWidth = 0.5;
        paint(ctx, path, visible.filter((country) => !dataIsos.has(country.id)), colors.land);
        paint(ctx, path, visible.filter((country) => dataIsos.has(country.id) && country.id !== activeIso), colors.land, { color: colors.accent, alpha: 0.55 });
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 0.9;
        paint(ctx, path, visible.filter((country) => country.id === activeIso), colors.accent);

        ctx.beginPath();
        path(SPHERE);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1;
        ctx.stroke();
    }, [radius, rotation, dataIsos, activeIso]);

    // El último dibujo vigente, para que los observadores (creados una sola vez) lo usen.
    const drawRef = useRef(draw);
    useEffect(() => {
        drawRef.current = draw;
        draw();
    }, [draw]);

    // Redibujar si cambia el tamaño o el tema (claro/oscuro).
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const redraw = () => drawRef.current();
        const resize = new ResizeObserver(redraw);
        resize.observe(canvas);
        const theme = new MutationObserver(redraw);
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        const media = window.matchMedia?.('(prefers-color-scheme: dark)');
        media?.addEventListener?.('change', redraw);
        return () => {
            resize.disconnect();
            theme.disconnect();
            media?.removeEventListener?.('change', redraw);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="ied-globe-canvas"
            aria-hidden="true"
            style={{
                left: `${((cx - radius) / width) * 100}%`,
                top: `${((cy - radius) / height) * 100}%`,
                width: `${((radius * 2) / width) * 100}%`,
                height: `${((radius * 2) / height) * 100}%`
            }}
        />
    );
};

export default memo(GlobeCanvas);
