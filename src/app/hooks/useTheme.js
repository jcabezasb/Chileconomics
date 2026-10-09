import { useEffect, useState } from 'react';

const readInitialTheme = () => {
    try {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark' || stored === 'light') return stored;
    } catch {
        // Sin acceso a localStorage (modo privado): se usa la preferencia del sistema.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Tema claro/oscuro: se guarda en localStorage y se aplica como data-theme en <html>.
const useTheme = () => {
    const [theme, setTheme] = useState(readInitialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch {
            // Ignorado: el tema igual funciona durante la visita.
        }
    }, [theme]);

    const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    return { theme, toggleTheme };
};

export default useTheme;
