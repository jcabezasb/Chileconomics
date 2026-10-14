import { memo, useEffect, useMemo } from 'react';
import { geoDistance, geoGraticule10, geoMercator, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';
import chileTopo from '../../assets/chile.json';
import { REGION_ID_BY_NAME } from '../../shared/constants/regions';
import { formatNumber } from '../../shared/utils/format';
import { IED_GROUPS, IED_ITEMS, IED_UNASSIGNED, iedGroupOfRegion } from './iedGroups';
import { barSegments, contiguousSpans, ribbonPath, ribbonTarget, spreadLabels } from './iedLayout';
import useGlobeRotation from './useGlobeRotation';

const WORLD = feature(worldTopo, worldTopo.objects.countries).features;
const CHILE = feature(chileTopo, Object.values(chileTopo.objects)[0]).features;
const GRATICULE = geoGraticule10();

// Medidas del SVG (en sus propias unidades; se escala al ancho disponible).
const WIDTH = 1180;
const HEIGHT = 640;
const TOP = 34;
const BOTTOM = 606;
const MIDDLE = (TOP + BOTTOM) / 2;
const GLOBE_RADIUS = 205;
const BAR_X = 562;
const COLUMN = 18;
const COLUMN_GAP = 4;
const BAR_RIGHT = BAR_X + COLUMN * 2 + COLUMN_GAP;
const SEGMENT_GAP = 1.5;
const LABEL_GAP = 16;
const MIN_LABEL_SEGMENT = 11;

// Hacia Chile: globo, barra, mapa. Desde Chile: mapa, barra, globo.
const LAYOUT = {
    inward: { globeX: 240, chileX: 905, initialRotation: [45, -20] },
    outward: { globeX: WIDTH - 240, chileX: 230, initialRotation: [62, 12] }
};

const segmentHeight = (segment) => Math.max(0, segment.y1 - segment.y0);

// Mapa de Chile para una posición horizontal: regiones, tramo vertical de cada grupo y su borde.
const buildChile = (chileX) => {
    const projection = geoMercator().center([-70.5, -39.3]).scale(660).translate([chileX, MIDDLE]);
    const path = geoPath(projection);
    const bounds = {};
    const regions = CHILE.map((geo, index) => {
        const groupId = iedGroupOfRegion(REGION_ID_BY_NAME[geo.properties.name]);
        const [[x0, y0], [x1, y1]] = path.bounds(geo);
        if (groupId) {
            const current = bounds[groupId];
            bounds[groupId] = current
                ? { x0: Math.min(current.x0, x0), y0: Math.min(current.y0, y0), x1: Math.max(current.x1, x1), y1: Math.max(current.y1, y1) }
                : { x0, y0, x1, y1 };
        }
        return { key: index, d: path(geo), groupId };
    });
    const groups = IED_GROUPS.filter((group) => bounds[group.id]);
    const spans = Object.fromEntries(contiguousSpans(groups.map((group) => ({ id: group.id, ...bounds[group.id] })))
        .map((span) => [span.id, span]));
    const all = Object.values(bounds);
    return {
        regions,
        bounds,
        spans,
        groups,
        east: Math.max(...all.map((b) => b.x1)),
        west: Math.min(...all.map((b) => b.x0)),
        top: Math.min(...all.map((b) => b.y0)),
        bottom: Math.max(...all.map((b) => b.y1))
    };
};

// Punto del globo donde llega la cinta de un país. Si está en la cara de atrás, la cinta llega al
// borde del globo en esa dirección (y se dibuja más tenue).
const globePoint = (projection, center, at, cx) => {
    const [x, y] = projection(at);
    if (geoDistance(at, center) < Math.PI / 2 - 0.05) return { x, y, back: false };
    const dx = x - cx;
    const dy = y - MIDDLE;
    const length = Math.hypot(dx, dy) || 1;
    return { x: cx + (dx / length) * GLOBE_RADIUS, y: MIDDLE + (dy / length) * GLOBE_RADIUS, back: true };
};

const IedFlowChart = ({ direction, regionValues, countryItems, countryValues, year, activeId, onHover, onSelect, onReset }) => {
    const layout = LAYOUT[direction];
    const inward = direction === 'inward';
    const { rotation, rotateTo, wasDrag, dragHandlers } = useGlobeRotation(layout.initialRotation);

    // Al cambiar de sentido, el globo vuelve a su vista inicial (Atlántico norte o Sudamérica).
    useEffect(() => {
        const [lambda, phi] = LAYOUT[direction].initialRotation;
        rotateTo(-lambda, -phi / 0.7, 600);
    }, [direction, rotateTo]);

    const chile = useMemo(() => buildChile(layout.chileX), [layout.chileX]);

    const globe = useMemo(() => {
        const projection = geoOrthographic().scale(GLOBE_RADIUS).translate([layout.globeX, MIDDLE]).rotate(rotation).clipAngle(90);
        const path = geoPath(projection);
        return {
            projection,
            center: [-rotation[0], -rotation[1]],
            countries: WORLD.map((geo) => ({ id: geo.id, d: path(geo) })).filter((geo) => geo.d),
            graticule: path(GRATICULE)
        };
    }, [layout.globeX, rotation]);

    // Si se destaca un país que está atrás, el globo gira hasta mostrarlo.
    const activeCountry = countryItems.find((item) => item.id === activeId && item.place);
    useEffect(() => {
        if (!activeCountry) return;
        if (geoDistance(activeCountry.place.at, globe.center) > Math.PI / 2 - 0.2) rotateTo(...activeCountry.place.at);
        // Solo al cambiar de país destacado, no en cada cuadro del giro.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCountry?.id]);

    const countrySegments = barSegments(
        countryItems.map((item) => ({ id: item.id, value: Math.max(0, countryValues[item.id] || 0) })),
        { top: TOP, height: BOTTOM - TOP, gap: SEGMENT_GAP }
    );
    const regionSegments = inward
        ? barSegments(IED_ITEMS.map((item) => ({ id: item.id, value: regionValues[item.id] })), { top: TOP, height: BOTTOM - TOP, gap: 2 })
        : [];
    const regionSegment = Object.fromEntries(regionSegments.map((segment) => [segment.id, segment]));
    const itemById = Object.fromEntries(countryItems.map((item) => [item.id, item]));
    const isoToItem = Object.fromEntries(countryItems.filter((item) => item.place?.iso).map((item) => [item.place.iso, item.id]));

    // Columna de países: izquierda si la inversión llega a Chile, derecha si sale.
    const countryColumnX = inward ? BAR_X : BAR_X + COLUMN + COLUMN_GAP;
    const otherColumnX = inward ? BAR_X + COLUMN + COLUMN_GAP : BAR_X;

    const state = (id) => (activeId === id ? ' is-active' : '');
    const handlers = (id) => ({
        onMouseEnter: () => onHover(id),
        onMouseLeave: () => onHover(null),
        onClick: () => onSelect(id)
    });
    const globeHandlers = (id) => ({
        onMouseEnter: () => onHover(id),
        onMouseLeave: () => onHover(null),
        onClick: () => {
            if (!wasDrag()) onSelect(id);
        }
    });

    const regionLabelYs = spreadLabels(
        chile.groups.map((group) => (chile.spans[group.id].y0 + chile.spans[group.id].y1) / 2),
        LABEL_GAP, TOP + 4, BOTTOM - 4
    );
    const countryLabels = countrySegments.filter((segment) => segmentHeight(segment) >= MIN_LABEL_SEGMENT);

    return (
        <div className="ied-chart" onMouseLeave={() => onHover(null)}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={inward
                ? `Inversión extranjera directa en Chile por país de origen y por región, ${year}`
                : `Inversión directa de Chile en el exterior por país de destino, ${year}`}
            >
                <defs>
                    <pattern id="ied-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="6" height="6" className="ied-hatch-bg" />
                        <line x1="0" y1="0" x2="0" y2="6" className="ied-hatch-line" />
                    </pattern>
                </defs>

                <g key={direction} className={`ied-layers${activeId ? ' has-active' : ''}`}>
                    {/* Cintas de los países: van detrás del globo, así salen de su borde */}
                    {countrySegments.map((segment) => {
                        const item = itemById[segment.id];
                        if (!item.place || segmentHeight(segment) <= 0) return null;
                        const point = globePoint(globe.projection, globe.center, item.place.at, layout.globeX);
                        const half = Math.min(4, Math.max(0.8, segmentHeight(segment) * 0.15));
                        const target = [point.y - half, point.y + half];
                        const d = inward
                            ? ribbonPath(point.x, target, countryColumnX, [segment.y0, segment.y1])
                            : ribbonPath(countryColumnX + COLUMN, [segment.y0, segment.y1], point.x, target);
                        return (
                            <path key={segment.id} className={`ied-ribbon is-country${point.back ? ' is-back' : ''}${state(segment.id)}`} d={d} {...handlers(segment.id)} />
                        );
                    })}
                    {/* Globo (se arrastra para girarlo) */}
                    <g className="ied-globe" {...dragHandlers}>
                        <circle className="ied-globe-sphere" cx={layout.globeX} cy={MIDDLE} r={GLOBE_RADIUS} />
                        <path className="ied-globe-graticule" d={globe.graticule} />
                        {globe.countries.map((country) => {
                            const itemId = isoToItem[country.id];
                            return (
                                <path
                                    key={country.id || country.d.slice(0, 12)}
                                    className={`ied-globe-country${itemId ? ` has-data${state(itemId)}` : ''}`}
                                    d={country.d}
                                    {...(itemId ? globeHandlers(itemId) : {})}
                                />
                            );
                        })}
                    </g>

                    {countrySegments.map((segment) => {
                        const item = itemById[segment.id];
                        if (!item.place) return null;
                        const point = globePoint(globe.projection, globe.center, item.place.at, layout.globeX);
                        return point.back ? null : (
                            <circle key={segment.id} className={`ied-globe-dot${state(segment.id)}`} cx={point.x} cy={point.y} r={activeId === segment.id ? 4 : 2.4} {...globeHandlers(segment.id)} />
                        );
                    })}

                    {/* Cintas hacia las regiones (o desde todo Chile, en el otro sentido) */}
                    {inward
                        ? chile.groups.map((group) => {
                            const segment = regionSegment[group.id];
                            const span = chile.spans[group.id];
                            return (
                                <path
                                    key={group.id}
                                    className={`ied-ribbon${state(group.id)}`}
                                    d={ribbonPath(BAR_RIGHT, [segment.y0, segment.y1], chile.bounds[group.id].x0 + 6, ribbonTarget(segment, span))}
                                    {...handlers(group.id)}
                                />
                            );
                        })
                        : (
                            <path
                                className="ied-ribbon is-chile"
                                d={ribbonPath(chile.east - 8, [chile.top + 40, chile.bottom - 40], BAR_X, [TOP, BOTTOM])}
                                onClick={onReset}
                            />
                        )}

                    {/* Barra: países a un lado; regiones (o Chile completo) al otro */}
                    <text className="ied-bar-title" x={BAR_X + COLUMN} y={TOP - 12} textAnchor="end" onClick={onReset}>
                        {inward ? 'Países' : 'Chile'}
                    </text>
                    <text className="ied-bar-title" x={BAR_RIGHT - COLUMN} y={TOP - 12} textAnchor="start" onClick={onReset}>
                        {inward ? 'Regiones' : 'Países'}
                    </text>
                    {countrySegments.map((segment) => {
                        const item = itemById[segment.id];
                        return (
                            <rect
                                key={segment.id}
                                className={`ied-segment${item.place ? '' : ' is-unassigned'}${state(segment.id)}`}
                                x={countryColumnX}
                                y={segment.y0}
                                width={COLUMN}
                                height={segmentHeight(segment)}
                                rx={1.5}
                                tabIndex={0}
                                role="button"
                                aria-label={`${item.label}: ${formatNumber(countryValues[segment.id], 0)} millones de dólares`}
                                onFocus={() => onHover(segment.id)}
                                onBlur={() => onHover(null)}
                                {...handlers(segment.id)}
                            />
                        );
                    })}
                    {inward
                        ? regionSegments.map((segment) => (
                            <rect
                                key={segment.id}
                                className={`ied-segment${segment.id === IED_UNASSIGNED.id ? ' is-unassigned' : ''}${state(segment.id)}`}
                                x={otherColumnX}
                                y={segment.y0}
                                width={COLUMN}
                                height={segmentHeight(segment)}
                                rx={1.5}
                                tabIndex={0}
                                role="button"
                                aria-label={`${IED_ITEMS.find((item) => item.id === segment.id).label}: ${formatNumber(regionValues[segment.id], 0)} millones de dólares`}
                                onFocus={() => onHover(segment.id)}
                                onBlur={() => onHover(null)}
                                {...handlers(segment.id)}
                            />
                        ))
                        : <rect className="ied-segment is-chile" x={otherColumnX} y={TOP} width={COLUMN} height={BOTTOM - TOP} rx={1.5} onClick={onReset} />}

                    {/* Mapa de Chile (encima de las cintas, que llegan a su costa) */}
                    {chile.regions.map((region) => (
                        <path
                            key={region.key}
                            className={`ied-region${inward ? state(region.groupId) : ' is-source'}`}
                            d={region.d}
                            {...(inward && region.groupId ? handlers(region.groupId) : { onClick: onReset })}
                        />
                    ))}

                    {/* Etiquetas */}
                    <g className="ied-labels">
                        {countryLabels.map((segment) => (
                            <g key={segment.id} className={`ied-label is-halo${state(segment.id)}`} {...handlers(segment.id)}>
                                <text
                                    x={inward ? countryColumnX - 8 : countryColumnX + COLUMN + 8}
                                    y={(segment.y0 + segment.y1) / 2}
                                    dy="0.35em"
                                    textAnchor={inward ? 'end' : 'start'}
                                >
                                    <tspan className="ied-label-name">{itemById[segment.id].label}</tspan>
                                    <tspan className="ied-label-value" dx="6">{formatNumber(countryValues[segment.id], 0)}</tspan>
                                </text>
                            </g>
                        ))}
                        {inward ? chile.groups.map((group, index) => {
                            const span = chile.spans[group.id];
                            const labelX = chile.east + 22;
                            const y = regionLabelYs[index];
                            return (
                                <g key={group.id} className={`ied-label${state(group.id)}`} {...handlers(group.id)}>
                                    <path className="ied-leader" d={`M${chile.bounds[group.id].x1 + 3},${(span.y0 + span.y1) / 2} L${labelX - 6},${y}`} />
                                    <text x={labelX} y={y} dy="0.35em">
                                        <tspan className="ied-label-name">{group.short}</tspan>
                                        <tspan className="ied-label-value" dx="6">{formatNumber(regionValues[group.id], 0)}</tspan>
                                    </text>
                                </g>
                            );
                        }) : (
                            <text className="ied-chile-note" x={layout.chileX} y={BOTTOM + 22} textAnchor="middle">
                                Sin desglose por región
                            </text>
                        )}
                    </g>
                </g>
            </svg>
        </div>
    );
};

export default memo(IedFlowChart);
