import { memo, useMemo } from 'react';
import { ComposableMap, Geographies, useMapContext } from 'react-simple-maps';
import chileTopo from '../../assets/chile.json';
import { REGION_ID_BY_NAME } from '../../shared/constants/regions';
import { formatNumber } from '../../shared/utils/format';
import { IED_GROUPS, IED_ITEMS, IED_UNASSIGNED, iedGroupOfRegion } from './iedGroups';
import { barSegments, contiguousSpans, ribbonPath, ribbonTarget, spreadLabels } from './iedLayout';

// Medidas del SVG (en sus propias unidades; se escala al ancho disponible).
const WIDTH = 880;
const HEIGHT = 640;
const TOP = 34;
const BOTTOM = 606;
const BAR_X = 40;
const BAR_WIDTH = 28;
const BAR_GAP = 2;
const LABEL_GAP = 16;
// Mercator centrado bien al oeste para que Chile quede a la derecha y la barra a la izquierda.
const PROJECTION = { center: [-89.8, -39.3], scale: 660 };

// Borde (en píxeles) de las regiones de cada grupo: de ahí salen el tramo vertical y la etiqueta.
const groupBounds = (geographies, path) => {
    const bounds = {};
    geographies.forEach((geo) => {
        const groupId = iedGroupOfRegion(REGION_ID_BY_NAME[geo.properties.name]);
        if (!groupId) return;
        const [[x0, y0], [x1, y1]] = path.bounds(geo);
        const current = bounds[groupId];
        bounds[groupId] = current
            ? { x0: Math.min(current.x0, x0), y0: Math.min(current.y0, y0), x1: Math.max(current.x1, x1), y1: Math.max(current.y1, y1) }
            : { x0, y0, x1, y1 };
    });
    return bounds;
};

const IedLayers = ({ geographies, values, activeId, onHover, onSelect, onReset }) => {
    const { path } = useMapContext();

    // La geometría del mapa no cambia con el año: se calcula una vez.
    const geometry = useMemo(() => {
        const bounds = groupBounds(geographies, path);
        const groups = IED_GROUPS.filter((group) => bounds[group.id]);
        const spans = contiguousSpans(groups.map((group) => ({ id: group.id, ...bounds[group.id] })));
        const labelX = Math.max(...groups.map((group) => bounds[group.id].x1)) + 22;
        return {
            bounds,
            spans: Object.fromEntries(spans.map((span) => [span.id, span])),
            labelX,
            regions: geographies.map((geo) => ({
                key: geo.rsmKey,
                d: path(geo),
                groupId: iedGroupOfRegion(REGION_ID_BY_NAME[geo.properties.name])
            }))
        };
    }, [geographies, path]);

    const segments = barSegments(
        IED_ITEMS.map((item) => ({ id: item.id, value: values[item.id] })),
        { top: TOP, height: BOTTOM - TOP, gap: BAR_GAP }
    );
    const segmentOf = Object.fromEntries(segments.map((segment) => [segment.id, segment]));
    const mapped = IED_GROUPS.filter((group) => geometry.spans[group.id]);
    const labelYs = spreadLabels(
        mapped.map((group) => (geometry.spans[group.id].y0 + geometry.spans[group.id].y1) / 2),
        LABEL_GAP,
        TOP + 4,
        BOTTOM - 4
    );
    const unassigned = segmentOf[IED_UNASSIGNED.id];

    const state = (id) => (activeId === id ? ' is-active' : '');
    const handlers = (id) => ({
        onMouseEnter: () => onHover(id),
        onMouseLeave: () => onHover(null),
        onClick: () => onSelect(id)
    });

    return (
        <g className={`ied-layers${activeId ? ' has-active' : ''}`}>
            <defs>
                <pattern id="ied-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="6" height="6" className="ied-hatch-bg" />
                    <line x1="0" y1="0" x2="0" y2="6" className="ied-hatch-line" />
                </pattern>
            </defs>

            {mapped.map((group) => {
                const segment = segmentOf[group.id];
                const span = geometry.spans[group.id];
                return (
                    <path
                        key={group.id}
                        className={`ied-ribbon${state(group.id)}`}
                        d={ribbonPath(BAR_X + BAR_WIDTH, [segment.y0, segment.y1], geometry.bounds[group.id].x0 + 6, ribbonTarget(segment, span))}
                        {...handlers(group.id)}
                    />
                );
            })}

            <text className="ied-bar-title" x={BAR_X + BAR_WIDTH / 2} y={TOP - 12} onClick={onReset}>Total</text>
            {segments.map((segment) => {
                const item = IED_ITEMS.find((entry) => entry.id === segment.id);
                const isUnassigned = segment.id === IED_UNASSIGNED.id;
                return (
                    <rect
                        key={segment.id}
                        className={`ied-segment${isUnassigned ? ' is-unassigned' : ''}${state(segment.id)}`}
                        x={BAR_X}
                        y={segment.y0}
                        width={BAR_WIDTH}
                        height={Math.max(0, segment.y1 - segment.y0)}
                        rx={2}
                        tabIndex={0}
                        role="button"
                        aria-label={`${item.label}: ${formatNumber(values[segment.id], 0)} millones de dólares`}
                        onFocus={() => onHover(segment.id)}
                        onBlur={() => onHover(null)}
                        {...handlers(segment.id)}
                    />
                );
            })}

            {geometry.regions.map((region) => (
                <path
                    key={region.key}
                    className={`ied-region${state(region.groupId)}`}
                    d={region.d}
                    {...(region.groupId ? handlers(region.groupId) : {})}
                />
            ))}

            <g className="ied-labels">
                {mapped.map((group, index) => {
                    const span = geometry.spans[group.id];
                    const y = labelYs[index];
                    return (
                        <g key={group.id} className={`ied-label${state(group.id)}`} {...handlers(group.id)}>
                            <path
                                className="ied-leader"
                                d={`M${geometry.bounds[group.id].x1 + 3},${(span.y0 + span.y1) / 2} L${geometry.labelX - 6},${y}`}
                            />
                            <text x={geometry.labelX} y={y} dy="0.35em">
                                <tspan className="ied-label-name">{group.short}</tspan>
                                <tspan className="ied-label-value" dx="6">{formatNumber(values[group.id], 0)}</tspan>
                            </text>
                        </g>
                    );
                })}
                {unassigned ? (
                    <g className={`ied-label is-side${state(IED_UNASSIGNED.id)}`} {...handlers(IED_UNASSIGNED.id)}>
                        <text x={BAR_X + BAR_WIDTH + 10} y={(unassigned.y0 + unassigned.y1) / 2} dy="-0.2em">
                            <tspan className="ied-label-name">{IED_UNASSIGNED.label}</tspan>
                            <tspan className="ied-label-value" x={BAR_X + BAR_WIDTH + 10} dy="1.25em">
                                {formatNumber(values[IED_UNASSIGNED.id], 0)}
                            </tspan>
                        </text>
                    </g>
                ) : null}
            </g>
        </g>
    );
};

// Barra con el stock total a la izquierda, cintas hacia cada grupo de regiones y el mapa de Chile.
// values: { [id]: millones de US$ } (ya animados); activeId: grupo destacado o null.
// Tocar "Total" vuelve a la vista de todo Chile (onReset).
const IedRibbonMap = ({ values, year, activeId, onHover, onSelect, onReset }) => (
    <div className="ied-chart" onMouseLeave={() => onHover(null)}>
        <ComposableMap
            projection="geoMercator"
            projectionConfig={PROJECTION}
            width={WIDTH}
            height={HEIGHT}
            role="img"
            aria-label={`Stock de inversión extranjera directa por región en ${year}`}
        >
            <Geographies geography={chileTopo}>
                {({ geographies }) => (
                    <IedLayers
                        geographies={geographies}
                        values={values}
                        activeId={activeId}
                        onHover={onHover}
                        onSelect={onSelect}
                        onReset={onReset}
                    />
                )}
            </Geographies>
        </ComposableMap>
    </div>
);

export default memo(IedRibbonMap);
