import React, { useState, useEffect, useRef } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

// URL for Chile TopoJSON (16 Regions)
import chileTopo from "../../assets/chile.json";

// URL for Chile TopoJSON (16 Regions)
const CHILE_TOPO_URL = chileTopo;

// Intensidad 0-1 en escala logarítmica: Antofagasta (~4 veces La Araucanía) no aplasta al resto.
const buildIntensity = (values) => {
    const numbers = Object.values(values || {}).filter((value) => Number.isFinite(value) && value > 0);
    if (!numbers.length) return () => null;
    const min = Math.log(Math.min(...numbers));
    const max = Math.log(Math.max(...numbers));
    return (value) => {
        if (!Number.isFinite(value) || value <= 0) return null;
        return max === min ? 1 : (Math.log(value) - min) / (max - min);
    };
};

const choroplethFill = (intensity) => (
    `color-mix(in srgb, var(--map-fill-selected) ${Math.round(12 + intensity * 88)}%, var(--map-fill))`
);

// choropleth: { values: { [regionId]: número }, getId: (nombreRegión) => regionId }
const MacroMap = ({ onRegionSelect, selectedRegion, choropleth }) => {
    const [isPulseActive, setIsPulseActive] = useState(false);
    const getIntensity = choropleth ? buildIntensity(choropleth.values) : null;
    const [hasPulsed, setHasPulsed] = useState(false);
    const containerRef = useRef(null);
    const pulseTimerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || hasPulsed) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting || hasPulsed) return;
                setIsPulseActive(true);
                setHasPulsed(true);
                if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
                pulseTimerRef.current = setTimeout(() => setIsPulseActive(false), 1300);
            },
            { threshold: 0.35 }
        );

        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
            if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
        };
    }, [hasPulsed]);

    // Custom projection config for Chile's long shape
    // Centers and zooms to fit Chile reasonably well
    const projectionConfig = {
        scale: 640,
        center: [-70, -38]
    };

    const mapDimensions = {
        width: 240,
        height: 620
    };

    return (
        <div className="macro-map-container" ref={containerRef}>
            <div className="macro-map-frame">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={projectionConfig}
                    width={mapDimensions.width} // Compact width
                    height={mapDimensions.height} // Proportional height
                    style={{ width: "100%", height: "100%" }}
                >
                    <ZoomableGroup
                        center={[-70, -38]}
                        zoom={1}
                        minZoom={1}
                        maxZoom={4}
                        translateExtent={[
                            [0, 0],
                            [mapDimensions.width, mapDimensions.height]
                        ]}
                    >
                        <Geographies geography={CHILE_TOPO_URL}>
                            {({ geographies }) =>
                                geographies.map((geo) => {
                                    const regionName = geo.properties.Region || geo.properties.name;
                                    const isSelected = selectedRegion === regionName;
                                    const intensity = getIntensity
                                        ? getIntensity(choropleth.values[choropleth.getId(regionName)])
                                        : null;
                                    if (intensity !== null) {
                                        const fill = choroplethFill(intensity);
                                        const stroke = isSelected ? 'var(--text-primary)' : 'var(--map-invert-stroke, var(--map-stroke))';
                                        const strokeWidth = isSelected ? 1.6 : 0.8;
                                        return (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                onClick={() => {
                                                    if (onRegionSelect) onRegionSelect(regionName);
                                                }}
                                                style={{
                                                    default: { fill, stroke, strokeWidth, outline: 'none', transition: 'fill 0.3s ease' },
                                                    hover: { fill, stroke: 'var(--text-primary)', strokeWidth: 1.2, outline: 'none', cursor: 'pointer' },
                                                    pressed: { fill, stroke: 'var(--text-primary)', strokeWidth: 1.6, outline: 'none' }
                                                }}
                                            />
                                        );
                                    }
                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            onMouseEnter={() => {
                                                if (isPulseActive) {
                                                    setIsPulseActive(false);
                                                    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
                                                }
                                            }}
                                            onClick={() => {
                                                if (onRegionSelect) onRegionSelect(regionName);
                                            }}
                                            style={{
                                                default: {
                                                    fill: isSelected ? "var(--map-invert-selected, var(--map-fill-selected))" : "var(--map-invert-fill, var(--map-fill))",
                                                    stroke: "var(--map-invert-stroke, var(--map-stroke))",
                                                    strokeWidth: 0.8,
                                                    outline: "none",
                                                    transition: "fill 0.2s ease, stroke 0.2s ease",
                                                    filter: isSelected ? "var(--map-hover-filter)" : "none",
                                                    animation: isPulseActive ? `neonPulse 1.2s ease-in-out` : 'none'
                                                },
                                                hover: {
                                                    fill: isSelected ? "var(--map-invert-selected, var(--map-fill-selected))" : "var(--map-invert-hover, var(--map-fill-hover))",
                                                    stroke: "var(--map-invert-stroke, var(--map-stroke))",
                                                    strokeWidth: 0.8,
                                                    outline: "none",
                                                    cursor: "pointer",
                                                    filter: "var(--map-hover-filter)" // Neon glow effect only in dark mode
                                                },
                                                pressed: {
                                                    fill: "var(--map-invert-selected, var(--map-fill-selected))",
                                                    outline: "none",
                                                    filter: "var(--map-hover-filter)"
                                                }
                                            }}
                                        />
                                    );
                                })
                            }
                        </Geographies>
                    </ZoomableGroup>
                </ComposableMap>
            </div>
        </div>
    );
};

export default React.memo(MacroMap);
