import { memo, useEffect, useMemo, useRef } from 'react';
import { geoContains, geoDistance, geoMercator, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import chileTopo from '../../assets/chile.json';
import { REGION_ID_BY_NAME } from '../../shared/constants/regions';
import { formatNumber } from '../../shared/utils/format';
import { IED_GROUPS, IED_ITEMS, IED_UNASSIGNED, iedGroupOfRegion } from './iedGroups';
import { barSegments, contiguousSpans, listSlots, ribbonPath, ribbonTarget, spreadLabels } from './iedLayout';
import { SECTOR_UNASSIGNED_ID } from './iedSectors';
import GlobeCanvas from './GlobeCanvas';
import { WORLD } from './globeData';
import useGlobeRotation from './useGlobeRotation';

const CHILE = feature(chileTopo, Object.values(chileTopo.objects)[0]).features;

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
// Lista de sectores (en lugar del mapa): dónde llegan las cintas y medida de los íconos.
const SECTOR_RIBBON = 160;
const SECTOR_ICON = 16;

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

// Punto del borde del globo donde nace la cinta de un país: a la altura del país, del lado de la
// barra (side = 1 si la barra está a la derecha, -1 si a la izquierda). Así la cinta "sale" del globo
// sin taparlo. Los países de la cara de atrás se marcan para dibujar su cinta más tenue.
const globeEdgePoint = (projection, center, at, cx, side) => {
    const [, y] = projection(at);
    const back = geoDistance(at, center) >= Math.PI / 2 - 0.05;
    const dy = Math.max(-GLOBE_RADIUS + 1, Math.min(GLOBE_RADIUS - 1, y - MIDDLE));
    return { x: cx + side * Math.sqrt(GLOBE_RADIUS ** 2 - dy ** 2), y: MIDDLE + dy, back };
};

// Punto del país sobre el globo (para el marcador), o null si está en la cara de atrás.
const globeDot = (projection, center, at) => (
    geoDistance(at, center) < Math.PI / 2 - 0.05 ? projection(at) : null
);

// breakdown: lado de Chile ('regiones', 'sectores' o null si no hay desglose: Chile completo).
const IedFlowChart = ({
    direction, breakdown, regionValues, countryItems, countryValues, sectorItems, year, activeId, onHover, onSelect, onReset
}) => {
    const layout = LAYOUT[direction];
    const inward = direction === 'inward';
    const bySector = breakdown === 'sectores' && sectorItems.length > 0;
    const byRegion = inward && !bySector;
    const { rotation, rotateTo, wasDrag, dragHandlers } = useGlobeRotation(layout.initialRotation);

    const svgRef = useRef(null);
    const lastPick = useRef(null);

    // País que más invierte (o mayor destino) en el año: el globo gira hasta él en cada año.
    const leader = useMemo(() => countryItems
        .filter((item) => item.place && Number.isFinite(item.value))
        .reduce((best, item) => (!best || item.value > best.value ? item : best), null), [countryItems]);
    useEffect(() => {
        if (leader) rotateTo(...leader.place.at, 900);
    }, [leader, year, direction, rotateTo]);

    const chile = useMemo(() => buildChile(layout.chileX), [layout.chileX]);

    // Proyección del globo para ubicar los países (el dibujo lo hace GlobeCanvas).
    const globe = useMemo(() => ({
        projection: geoOrthographic().scale(GLOBE_RADIUS).translate([layout.globeX, MIDDLE]).rotate(rotation),
        center: [-rotation[0], -rotation[1]]
    }), [layout.globeX, rotation]);

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
    const regionSegments = byRegion
        ? barSegments(IED_ITEMS.map((item) => ({ id: item.id, value: regionValues[item.id] })), { top: TOP, height: BOTTOM - TOP, gap: 2 })
        : [];
    const regionSegment = Object.fromEntries(regionSegments.map((segment) => [segment.id, segment]));
    const sectorSegments = bySector
        ? barSegments(sectorItems.map((item) => ({ id: item.id, value: Math.max(0, countryValues[item.id] || 0) })), { top: TOP, height: BOTTOM - TOP, gap: 2 })
        : [];
    const sectorSlots = listSlots(sectorSegments.length, TOP, BOTTOM);
    const sectorById = Object.fromEntries(sectorItems.map((item) => [item.id, item]));
    // La lista va donde estaba el mapa: a la izquierda de la barra (desde Chile) o a la derecha (hacia Chile).
    const sectorX = inward ? BAR_RIGHT + SECTOR_RIBBON : BAR_X - SECTOR_RIBBON;
    const itemById = Object.fromEntries(countryItems.map((item) => [item.id, item]));
    const { isoToItem, dataIsos, dataCountries } = useMemo(() => {
        const byIso = Object.fromEntries(countryItems.filter((item) => item.place?.iso).map((item) => [item.place.iso, item.id]));
        return {
            isoToItem: byIso,
            dataIsos: new Set(Object.keys(byIso)),
            dataCountries: WORLD.filter((country) => byIso[country.id])
        };
    }, [countryItems]);
    const activeIso = countryItems.find((item) => item.id === activeId)?.place?.iso || null;

    // País bajo el puntero en el globo: se pasa el punto de pantalla a longitud/latitud.
    const pickCountry = (event) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const local = point.matrixTransform(svg.getScreenCTM().inverse());
        const lonLat = globe.projection.invert([local.x, local.y]);
        if (!lonLat || geoDistance(lonLat, globe.center) > Math.PI / 2) return null;
        const hit = dataCountries.find((country) => geoContains(country.geo, lonLat));
        return hit ? isoToItem[hit.id] : null;
    };
    const globeEvents = {
        ...dragHandlers,
        onPointerMove: (event) => {
            dragHandlers.onPointerMove(event);
            if (event.buttons) return;
            const id = pickCountry(event);
            if (id !== lastPick.current) {
                lastPick.current = id;
                onHover(id);
            }
        },
        onPointerLeave: () => {
            lastPick.current = null;
            onHover(null);
        },
        onClick: (event) => {
            const id = pickCountry(event);
            if (id && !wasDrag()) onSelect(id);
        }
    };

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
            <GlobeCanvas
                cx={layout.globeX}
                cy={MIDDLE}
                radius={GLOBE_RADIUS}
                width={WIDTH}
                height={HEIGHT}
                rotation={rotation}
                dataIsos={dataIsos}
                activeIso={activeIso}
            />
            <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={inward
                ? `Inversión extranjera directa en Chile por país de origen y por ${bySector ? 'sector' : 'región'}, ${year}`
                : `Inversión directa de Chile en el exterior por país de destino${bySector ? ' y por sector' : ''}, ${year}`}
            >
                <defs>
                    <pattern id="ied-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="6" height="6" className="ied-hatch-bg" />
                        <line x1="0" y1="0" x2="0" y2="6" className="ied-hatch-line" />
                    </pattern>
                </defs>

                <g key={direction} className={`ied-layers${activeId ? ' has-active' : ''}`}>
                    {/* Cintas de los países: salen del borde del globo */}
                    {countrySegments.map((segment) => {
                        const item = itemById[segment.id];
                        if (!item.place || segmentHeight(segment) <= 0) return null;
                        const point = globeEdgePoint(globe.projection, globe.center, item.place.at, layout.globeX, inward ? 1 : -1);
                        const half = Math.min(4, Math.max(0.8, segmentHeight(segment) * 0.15));
                        const target = [point.y - half, point.y + half];
                        const d = inward
                            ? ribbonPath(point.x, target, countryColumnX, [segment.y0, segment.y1])
                            : ribbonPath(countryColumnX + COLUMN, [segment.y0, segment.y1], point.x, target);
                        return (
                            <path key={segment.id} className={`ied-ribbon is-country${point.back ? ' is-back' : ''}${state(segment.id)}`} d={d} {...handlers(segment.id)} />
                        );
                    })}

                    {/* Capa del globo para arrastrar y para detectar el país bajo el puntero */}
                    <circle className="ied-globe-hit" cx={layout.globeX} cy={MIDDLE} r={GLOBE_RADIUS} {...globeEvents} />
                    {leader ? (
                        <text className="ied-leader-caption" x={layout.globeX} y={TOP - 12} textAnchor="middle">
                            {inward ? 'Mayor inversionista' : 'Mayor destino'} en {year}: <tspan className="ied-leader-name">{leader.label}</tspan>
                        </text>
                    ) : null}

                    {countrySegments.map((segment) => {
                        const item = itemById[segment.id];
                        if (!item.place) return null;
                        const dot = globeDot(globe.projection, globe.center, item.place.at);
                        return !dot ? null : (
                            <circle
                                key={segment.id}
                                className={`ied-globe-dot${state(segment.id)}${leader?.id === segment.id ? ' is-leader' : ''}`}
                                cx={dot[0]}
                                cy={dot[1]}
                                r={activeId === segment.id || leader?.id === segment.id ? 4 : 2.4}
                                {...globeHandlers(segment.id)}
                            />
                        );
                    })}

                    {/* Cintas hacia los sectores, hacia las regiones o desde todo Chile */}
                    {bySector ? sectorSegments.map((segment, index) => {
                        const slot = sectorSlots[index];
                        const target = ribbonTarget(segment, slot);
                        const d = inward
                            ? ribbonPath(BAR_RIGHT, [segment.y0, segment.y1], sectorX, target)
                            : ribbonPath(sectorX, target, BAR_X, [segment.y0, segment.y1]);
                        const unassigned = segment.id === SECTOR_UNASSIGNED_ID;
                        return (
                            <path key={segment.id} className={`ied-ribbon is-sector${unassigned ? ' is-unassigned' : ''}${state(segment.id)}`} d={d} {...handlers(segment.id)} />
                        );
                    }) : byRegion
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

                    {/* Barra: países a un lado; regiones, sectores (o Chile completo) al otro */}
                    <text className="ied-bar-title" x={BAR_X + COLUMN} y={TOP - 12} textAnchor="end" onClick={onReset}>
                        {inward ? 'Países' : bySector ? 'Sectores' : 'Chile'}
                    </text>
                    <text className="ied-bar-title" x={BAR_RIGHT - COLUMN} y={TOP - 12} textAnchor="start" onClick={onReset}>
                        {!inward ? 'Países' : bySector ? 'Sectores' : 'Regiones'}
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
                    {bySector ? sectorSegments.map((segment) => (
                        <rect
                            key={segment.id}
                            className={`ied-segment${segment.id === SECTOR_UNASSIGNED_ID ? ' is-unassigned' : ''}${state(segment.id)}`}
                            x={otherColumnX}
                            y={segment.y0}
                            width={COLUMN}
                            height={segmentHeight(segment)}
                            rx={1.5}
                            tabIndex={0}
                            role="button"
                            aria-label={`${sectorById[segment.id].label}: ${formatNumber(countryValues[segment.id], 0)} millones de dólares`}
                            onFocus={() => onHover(segment.id)}
                            onBlur={() => onHover(null)}
                            {...handlers(segment.id)}
                        />
                    )) : byRegion
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

                    {/* Mapa de Chile (encima de las cintas, que llegan a su costa); no va con los sectores */}
                    {bySector ? null : chile.regions.map((region) => (
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
                        {bySector ? sectorSegments.map((segment, index) => {
                            const item = sectorById[segment.id];
                            const Icon = item.icon;
                            const y = sectorSlots[index].middle;
                            const iconX = inward ? sectorX + 8 : sectorX - 8 - SECTOR_ICON;
                            return (
                                <g key={segment.id} className={`ied-label ied-sector${state(segment.id)}`} {...handlers(segment.id)}>
                                    {Icon ? (
                                        <Icon className="ied-sector-icon" x={iconX} y={y - SECTOR_ICON / 2} width={SECTOR_ICON} height={SECTOR_ICON} strokeWidth={1.8} aria-hidden="true" />
                                    ) : (
                                        <rect className="ied-sector-hatch" x={iconX + 2} y={y - 6} width={12} height={12} rx={2} />
                                    )}
                                    <text
                                        x={inward ? iconX + SECTOR_ICON + 8 : iconX - 8}
                                        y={y}
                                        dy="0.35em"
                                        textAnchor={inward ? 'start' : 'end'}
                                    >
                                        <tspan className="ied-label-name">{item.short}</tspan>
                                        <tspan className="ied-label-value" dx="6">{formatNumber(countryValues[segment.id], 0)}</tspan>
                                    </text>
                                </g>
                            );
                        }) : inward ? chile.groups.map((group, index) => {
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
