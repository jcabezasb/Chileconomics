import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SECTION, sectionFromHash } from './datosSections';

// Sección elegida en la página Datos, guardada en la URL (#proyecciones) para poder compartir el
// enlace y volver con el botón "atrás" del navegador.
const useDatosSection = () => {
    const [section, setSection] = useState(() => sectionFromHash(window.location.hash));

    useEffect(() => {
        const sync = () => setSection(sectionFromHash(window.location.hash));
        window.addEventListener('hashchange', sync);
        window.addEventListener('popstate', sync);
        return () => {
            window.removeEventListener('hashchange', sync);
            window.removeEventListener('popstate', sync);
        };
    }, []);

    const chooseSection = useCallback((id) => {
        const hash = id === DEFAULT_SECTION ? '' : `#${id}`;
        if (window.location.hash !== hash) {
            window.history.pushState({}, '', `${window.location.pathname}${hash}`);
        }
        setSection(id);
    }, []);

    return { section, chooseSection };
};

export default useDatosSection;
