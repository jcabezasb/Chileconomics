import { useCallback, useEffect, useRef } from 'react';

// Agrega la clase `is-visible` a los elementos registrados cuando entran en pantalla
// (la animación está en global.css: .reveal / .landing-reveal).
// Uso: const register = useRevealOnScroll(0.25); <section ref={register(0)} />
const useRevealOnScroll = (threshold, active = true) => {
    const elements = useRef([]);

    useEffect(() => {
        if (!active) return undefined;
        const targets = elements.current.filter(Boolean);
        if (!targets.length) return undefined;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
        }, { threshold });
        targets.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [threshold, active]);

    return useCallback((index) => (element) => {
        elements.current[index] = element;
    }, []);
};

export default useRevealOnScroll;
