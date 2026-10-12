import { useCallback, useEffect, useState } from 'react';
import { SECTION_PATHS, normalizePath, resolveRoute } from '../routes';

// Ruta actual sincronizada con la URL (botones atrás/adelante incluidos).
const useRoute = () => {
    const [route, setRoute] = useState(() => resolveRoute(window.location.pathname));

    useEffect(() => {
        const handlePopState = () => setRoute(resolveRoute(window.location.pathname));
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const navigate = useCallback((section) => {
        const nextPath = SECTION_PATHS[section] || '/';
        if (normalizePath(window.location.pathname) !== nextPath) {
            window.history.pushState({}, '', nextPath);
        }
        setRoute({ section });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return { route, navigate };
};

export default useRoute;
