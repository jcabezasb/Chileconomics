import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_SPEED = 0.35; // grados por píxel arrastrado
const MAX_TILT = 60;
const clampTilt = (value) => Math.max(-MAX_TILT, Math.min(MAX_TILT, value));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

// Rotación del globo ([λ, φ] de d3-geo): se arrastra con el mouse o el dedo, y rotateTo(lon, lat) lo
// gira suavemente hasta dejar ese punto al centro. wasDrag() dice si el último gesto fue un arrastre
// (para no tomarlo como clic sobre un país).
const useGlobeRotation = (initial) => {
    const [rotation, setRotation] = useState(initial);
    const rotationRef = useRef(initial);
    const drag = useRef(null);
    const moved = useRef(false);
    const frame = useRef(null);
    const pending = useRef(null);
    const dragFrame = useRef(null);

    const apply = useCallback((next) => {
        rotationRef.current = next;
        setRotation(next);
    }, []);

    const stopAnimation = () => {
        if (frame.current) cancelAnimationFrame(frame.current);
        frame.current = null;
    };

    useEffect(() => () => {
        stopAnimation();
        if (dragFrame.current) cancelAnimationFrame(dragFrame.current);
    }, []);

    const rotateTo = useCallback((lon, lat, duration = 700) => {
        stopAnimation();
        const [fromLambda, fromPhi] = rotationRef.current;
        // Camino más corto en longitud.
        const delta = ((((-lon - fromLambda) % 360) + 540) % 360) - 180;
        const toPhi = clampTilt(-lat * 0.7);
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            apply([fromLambda + delta, toPhi]);
            return;
        }
        const start = performance.now();
        const step = (now) => {
            const t = easeInOut(Math.min(1, (now - start) / duration));
            apply([fromLambda + delta * t, fromPhi + (toPhi - fromPhi) * t]);
            frame.current = t < 1 ? requestAnimationFrame(step) : null;
        };
        frame.current = requestAnimationFrame(step);
    }, [apply]);

    const onPointerDown = useCallback((event) => {
        stopAnimation();
        drag.current = { x: event.clientX, y: event.clientY, rotation: rotationRef.current };
        moved.current = false;
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }, []);

    const onPointerMove = useCallback((event) => {
        if (!drag.current) return;
        const dx = event.clientX - drag.current.x;
        const dy = event.clientY - drag.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
        const [lambda, phi] = drag.current.rotation;
        // El mouse puede mandar más eventos que cuadros por segundo: se dibuja una vez por cuadro.
        pending.current = [lambda + dx * DRAG_SPEED, clampTilt(phi - dy * DRAG_SPEED)];
        if (!dragFrame.current) {
            dragFrame.current = requestAnimationFrame(() => {
                dragFrame.current = null;
                if (pending.current) apply(pending.current);
            });
        }
    }, [apply]);

    const onPointerUp = useCallback((event) => {
        drag.current = null;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    }, []);

    const wasDrag = useCallback(() => moved.current, []);

    return { rotation, rotateTo, wasDrag, dragHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
};

export default useGlobeRotation;
