// Países del Excel de IED del Banco Central (nombres tal como vienen) y dónde dibujarlos en el globo:
// iso = código numérico ISO 3166 que usa world-atlas para el contorno del país (null si el mapa no lo
// trae por ser muy chico) y at = [longitud, latitud] del punto donde llega la cinta.
// "Resto ...", "No asignados" y los continentes sin desglose no tienen un lugar: van en la barra sin cinta.
export const IED_COUNTRIES = {
    Argentina: { iso: '032', at: [-64, -34] },
    Bahamas: { iso: '044', at: [-77.4, 24.7] },
    Bermudas: { iso: null, at: [-64.75, 32.3] },
    Brasil: { iso: '076', at: [-51, -10] },
    'Canadá': { iso: '124', at: [-98, 57] },
    Colombia: { iso: '170', at: [-73.5, 4] },
    Ecuador: { iso: '218', at: [-78.5, -1.5] },
    'Estados Unidos': { iso: '840', at: [-98, 39] },
    'Islas Caimán': { iso: null, at: [-81.2, 19.3] },
    'Islas Vírgenes Británicas': { iso: null, at: [-64.6, 18.4] },
    'México': { iso: '484', at: [-102, 23.5] },
    'Panamá': { iso: '591', at: [-80, 8.5] },
    Paraguay: { iso: '600', at: [-58, -23.5] },
    'Perú': { iso: '604', at: [-75, -9.5] },
    Uruguay: { iso: '858', at: [-56, -32.8] },
    Alemania: { iso: '276', at: [10.4, 51] },
    Austria: { iso: '040', at: [14.5, 47.5] },
    'Bélgica': { iso: '056', at: [4.6, 50.6] },
    'España': { iso: '724', at: [-3.7, 40.2] },
    Francia: { iso: '250', at: [2.5, 46.6] },
    Italia: { iso: '380', at: [12.5, 42.8] },
    Liechtenstein: { iso: null, at: [9.55, 47.15] },
    Luxemburgo: { iso: '442', at: [6.1, 49.8] },
    Noruega: { iso: '578', at: [9, 61] },
    'Países Bajos': { iso: '528', at: [5.3, 52.2] },
    'Reino Unido': { iso: '826', at: [-2, 53.5] },
    Suecia: { iso: '752', at: [16, 62] },
    Suiza: { iso: '756', at: [8.2, 46.8] },
    China: { iso: '156', at: [104, 35] },
    'Japón': { iso: '392', at: [138, 37] },
    Australia: { iso: '036', at: [134, -25] },
    'Nueva Zelanda': { iso: '554', at: [172.5, -41.5] }
};

export const iedCountry = (name) => IED_COUNTRIES[name] || null;
