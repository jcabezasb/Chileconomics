import { useEffect, useRef, useState } from 'react';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

const prefersReducedMotion = () => (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
);

// Pasa suavemente de los valores anteriores a los nuevos ({ clave: número }), cuadro a cuadro.
// Así, al cambiar de año, la barra, las cintas y las cifras se mueven en vez de saltar.
// `target` debe venir memorizado: cada objeto nuevo inicia una animación.
const useTweenedValues = (target, duration = 700) => {
    const [current, setCurrent] = useState(target);
    const currentRef = useRef(target);

    useEffect(() => {
        const from = currentRef.current;
        if (!target || !from || prefersReducedMotion()) {
            currentRef.current = target;
            setCurrent(target);
            return undefined;
        }
        let frame;
        const start = performance.now();
        const step = (now) => {
            const progress = easeInOut(Math.min(1, (now - start) / duration));
            const next = Object.fromEntries(Object.entries(target).map(([key, value]) => {
                const origin = Number.isFinite(from[key]) ? from[key] : value;
                return [key, origin + (value - origin) * progress];
            }));
            currentRef.current = next;
            setCurrent(next);
            if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [target, duration]);

    return current;
};

export default useTweenedValues;
