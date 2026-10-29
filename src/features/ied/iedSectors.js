import {
    BedDouble, Briefcase, Building2, Circle, Factory, HardHat, Landmark, Mountain, RadioTower, ShoppingCart, Sprout, Truck, Zap
} from 'lucide-react';

// Sectores económicos en que el Banco Central publica el stock de IED (hoja "Sector" del Excel,
// ver python/import_ied_paises.py). El nombre del Excel se asocia a una etiqueta corta y un ícono;
// un sector nuevo que no esté aquí se muestra con su nombre del Excel y un ícono genérico.
const SECTORS = {
    'Agricultura y pesca': { short: 'Agricultura y pesca', icon: Sprout },
    'Minería': { short: 'Minería', icon: Mountain },
    'Industria manufacturera': { short: 'Industria', icon: Factory },
    'Electricidad, gas y agua': { short: 'Electricidad, gas y agua', icon: Zap },
    'Construcción': { short: 'Construcción', icon: HardHat },
    'Comercio': { short: 'Comercio', icon: ShoppingCart },
    'Hoteles y restaurantes': { short: 'Hoteles y restaurantes', icon: BedDouble },
    'Transporte y Almacenaje': { short: 'Transporte', icon: Truck },
    'Comunicaciones': { short: 'Comunicaciones', icon: RadioTower },
    'Servicios financieros': { short: 'Servicios financieros', icon: Landmark },
    'Inmobiliarios y servicios empresariales': { short: 'Inmobiliarios y empresariales', icon: Building2 },
    'Otros servicios': { short: 'Otros servicios', icon: Briefcase }
};

const slug = (text) => text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const SECTOR_UNASSIGNED_ID = 's-no-asignados';

// Bloque de sectores del JSON -> ítems en el orden del Excel, más los no asignados al final.
// Los ids llevan prefijo "s-" para no chocar con los de países ("c-") ni regiones.
export const sectorItems = (block) => [
    ...block.items.map((sector) => {
        const meta = SECTORS[sector.name];
        return {
            id: `s-${slug(sector.name)}`,
            label: sector.name,
            short: meta?.short || sector.name,
            icon: meta?.icon || Circle,
            kind: 'sector',
            values: sector.values
        };
    }),
    { id: SECTOR_UNASSIGNED_ID, label: 'No asignados', short: 'No asignados', icon: null, kind: 'unassigned', values: block.unassigned }
];
