// Grupos de regiones en que el Banco Central publica el stock de IED, de norte a sur.
// Algunos juntan varias regiones; los ids coinciden con IED_REGION_GROUPS de python/bcch_shared.py.
// regions usa los ids de shared/constants/regions.js.
export const IED_GROUPS = [
    { id: 'XV_I', label: 'Arica y Parinacota y Tarapacá', short: 'Arica y Tarapacá', regions: ['XV', 'I'] },
    { id: 'II', label: 'Antofagasta', short: 'Antofagasta', regions: ['II'] },
    { id: 'III', label: 'Atacama', short: 'Atacama', regions: ['III'] },
    { id: 'IV', label: 'Coquimbo', short: 'Coquimbo', regions: ['IV'] },
    { id: 'V', label: 'Valparaíso', short: 'Valparaíso', regions: ['V'] },
    { id: 'RM', label: 'Región Metropolitana', short: 'Metropolitana', regions: ['RM'] },
    { id: 'VI', label: "O'Higgins", short: "O'Higgins", regions: ['VI'] },
    { id: 'VII', label: 'Maule', short: 'Maule', regions: ['VII'] },
    { id: 'XVI_VIII_IX', label: 'Ñuble, Biobío y La Araucanía', short: 'Ñuble a Araucanía', regions: ['XVI', 'VIII', 'IX'] },
    { id: 'X_XIV_XI_XII', label: 'Los Ríos, Los Lagos, Aysén y Magallanes', short: 'Los Ríos al sur', regions: ['XIV', 'X', 'XI', 'XII'] }
];

// Parte del stock que el Banco Central no asigna a ninguna región: va en la barra, sin cinta.
export const IED_UNASSIGNED = { id: 'no_asignado', label: 'No asignado', short: 'No asignado' };

export const IED_ITEMS = [...IED_GROUPS, IED_UNASSIGNED];

const GROUP_BY_REGION = Object.fromEntries(
    IED_GROUPS.flatMap((group) => group.regions.map((regionId) => [regionId, group.id]))
);

export const iedGroupOfRegion = (regionId) => GROUP_BY_REGION[regionId] || null;

export const iedItem = (id) => IED_ITEMS.find((item) => item.id === id) || null;
