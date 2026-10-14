import { geoCentroid, geoDistance, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';

// Países del mapa del mundo (world-atlas, escala 1:110 millones) y datos que se calculan una vez:
// el centro de cada país y su "radio" en el globo (distancia angular al punto más lejano), para
// saltarse los países que quedan en la cara de atrás.
export const WORLD = feature(worldTopo, worldTopo.objects.countries).features.map((geo) => {
    const center = geoCentroid(geo);
    let radius = 0;
    const visit = (coordinates) => {
        if (typeof coordinates[0] === 'number') {
            radius = Math.max(radius, geoDistance(center, coordinates));
            return;
        }
        coordinates.forEach(visit);
    };
    visit(geo.geometry.coordinates);
    return { id: geo.id, geo, center, radius };
});

export const GRATICULE = geoGraticule10();
export const SPHERE = { type: 'Sphere' };

// ¿Algo del país queda en la cara visible del globo (centrado en `center`)?
export const isOnFront = (country, center) => geoDistance(country.center, center) - country.radius < Math.PI / 2;
