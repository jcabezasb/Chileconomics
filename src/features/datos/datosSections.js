import { Globe, Landmark, LayoutDashboard, Map as MapIcon, PieChart, TrendingUp } from 'lucide-react';

// Secciones de la página Datos, en el orden del menú. El id va en la URL (/datos#proyecciones).
export const DATOS_SECTIONS = [
    { id: 'indicadores', label: 'Indicadores', icon: LayoutDashboard },
    { id: 'proyecciones', label: 'Proyecciones', icon: TrendingUp },
    { id: 'regiones', label: 'Regiones', icon: MapIcon },
    { id: 'ied', label: 'Inversión extranjera', icon: Globe },
    { id: 'pib', label: 'PIB', icon: PieChart },
    { id: 'fiscal', label: 'Finanzas públicas', icon: Landmark }
];

export const DEFAULT_SECTION = DATOS_SECTIONS[0].id;

// '#proyecciones' -> 'proyecciones'; vacío o desconocido -> la primera sección.
export const sectionFromHash = (hash) => {
    const id = decodeURIComponent(String(hash || '').replace(/^#/, '')).toLowerCase();
    return DATOS_SECTIONS.some((section) => section.id === id) ? id : DEFAULT_SECTION;
};
