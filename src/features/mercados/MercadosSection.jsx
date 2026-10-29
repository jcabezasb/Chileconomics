import { useEffect, useRef, useState } from 'react';
import { AsciiReveal } from 'ascii-reveal';
import { Segmented } from '../../shared/components/controls';
import { formatNumber } from '../../shared/utils/format';
import { CurveChart, Sparkline, TimeChart } from './MercadosCharts';
import { COUNTRY_COLOR, formatDay, formatPoints, formatRate } from './mercadosFormat';
import { RANGES, REAL_TENORS, SPREAD_TENORS, lastPoint } from './mercadosView';
import useMercadosView from './useMercadosView';
import '../../styles/mercados.css';

const VIEWS = [
    { id: 'tasas', label: 'Tasas' },
    { id: 'reales', label: 'Tasas reales e inflación' },
    { id: 'mercados', label: 'Monedas y materias primas' }
];
const tenorOptions = (tenors) => tenors.map((tenor) => ({ id: tenor, label: `${tenor} años` }));
const BOTH = [{ key: 'chile', label: 'Chile', color: COUNTRY_COLOR.chile }, { key: 'us', label: 'EE.UU.', color: COUNTRY_COLOR.us }];

const Legend = ({ labels = ['Chile', 'EE.UU.'] }) => (
    <div className="mk-legend">
        <span><i style={{ background: COUNTRY_COLOR.chile }} aria-hidden="true" />{labels[0]}</span>
        <span><i style={{ background: COUNTRY_COLOR.us }} aria-hidden="true" />{labels[1]}</span>
    </div>
);

// Tarjeta con un dato de cada país (Chile | EE.UU.) y una línea de detalle.
const PairTile = ({ title, chile, us, detail }) => (
    <div className="mk-tile" data-ascii="surface">
        <span className="mk-tile-title">{title}</span>
        <div className="mk-pair">
            <div><small><i style={{ background: COUNTRY_COLOR.chile }} aria-hidden="true" />Chile</small>{formatRate(chile)}</div>
            <div><small><i style={{ background: COUNTRY_COLOR.us }} aria-hidden="true" />EE.UU.</small>{formatRate(us)}</div>
        </div>
        <span className="mk-tile-detail">{detail}</span>
    </div>
);

const RatesView = ({ view }) => {
    const { rates, charts, spreadTenor, setSpreadTenor } = view;
    const { tpm, effr, fedLow, fedHigh, curves } = rates;
    const tenYears = { chile: curves.chile.find((p) => p.tenor === '10'), us: curves.us.find((p) => p.tenor === '10') };
    return (
        <>
            <div className="mk-tiles">
                <div className="mk-tile" data-ascii="surface">
                    <span className="mk-tile-title"><i style={{ background: COUNTRY_COLOR.chile }} aria-hidden="true" />Tasa de política · Chile</span>
                    <span className="mk-tile-value">{formatRate(tpm?.value)}</span>
                    <span className="mk-tile-detail">Banco Central, {formatDay(tpm?.date)}</span>
                </div>
                <div className="mk-tile" data-ascii="surface">
                    <span className="mk-tile-title"><i style={{ background: COUNTRY_COLOR.us }} aria-hidden="true" />Tasa de política · EE.UU.</span>
                    <span className="mk-tile-value">{fedLow && fedHigh ? `${formatNumber(fedLow.value, 2)}–${formatRate(fedHigh.value)}` : '–'}</span>
                    <span className="mk-tile-detail">Rango de la Fed · efectiva {formatRate(effr?.value)}</span>
                </div>
                <div className="mk-tile" data-ascii="surface">
                    <span className="mk-tile-title">Diferencial de política</span>
                    <span className="mk-tile-value">{tpm && effr ? formatPoints(tpm.value - effr.value) : '–'}</span>
                    <span className="mk-tile-detail">Chile menos la tasa efectiva de la Fed</span>
                </div>
                <PairTile
                    title="Bono a 10 años"
                    chile={tenYears.chile?.value}
                    us={tenYears.us?.value}
                    detail={tenYears.chile && tenYears.us ? `Diferencial ${formatPoints(tenYears.chile.value - tenYears.us.value)} · ${formatDay(curves.date)}` : ''}
                />
            </div>
            <div className="mk-grid">
                <div className="mk-panel" data-ascii="surface">
                    <div className="mk-panel-head"><h3>Curvas de rendimiento</h3><Legend /></div>
                    <p className="mk-panel-sub">Porcentaje anual al {formatDay(curves.date)}</p>
                    {curves.date ? <CurveChart curves={curves} /> : <p className="mk-empty">Sin datos de bonos.</p>}
                    <p className="mk-note">
                        Cada curva une solo los plazos que publica cada país. Chile: bonos del Banco Central en pesos (BCP);
                        no hay a 1 ni 3 años. EE.UU.: bonos del Tesoro.
                    </p>
                </div>
                <div className="mk-panel" data-ascii="surface">
                    <div className="mk-panel-head"><h3>Tasas de política monetaria</h3><Legend labels={['Banco Central', 'Fed (efectiva)']} /></div>
                    <p className="mk-panel-sub">Porcentaje anual</p>
                    <TimeChart rows={charts.policy} lines={BOTH} step />
                </div>
            </div>
            <div className="mk-panel" data-ascii="surface">
                <div className="mk-panel-head">
                    <h3>Diferencial de tasas: Chile − EE.UU.</h3>
                    <Segmented ariaLabel="Plazo del diferencial" options={tenorOptions(SPREAD_TENORS)} value={spreadTenor} onChange={setSpreadTenor} />
                </div>
                <p className="mk-panel-sub">Puntos porcentuales. Sobre cero, los bonos chilenos pagan más que los de EE.UU. al mismo plazo.</p>
                <TimeChart rows={charts.spread} lines={[{ key: 'spread', label: `Diferencial ${spreadTenor} años`, color: COUNTRY_COLOR.spread }]} unit="pp" zero height={200} />
            </div>
        </>
    );
};

const RealView = ({ view }) => {
    const { real, charts, realTenor, setRealTenor } = view;
    const r = real[realTenor];
    const realChile = lastPoint(r.chile);
    const realUs = lastPoint(r.us);
    return (
        <>
            <div className="mk-subbar">
                <span>Plazo</span>
                <Segmented ariaLabel="Plazo" options={tenorOptions(REAL_TENORS)} value={realTenor} onChange={setRealTenor} />
            </div>
            <div className="mk-tiles is-two">
                <PairTile
                    title={`Tasa real a ${realTenor} años`}
                    chile={realChile?.value}
                    us={realUs?.value}
                    detail={realChile && realUs ? `Diferencial ${formatPoints(realChile.value - realUs.value)} · ${formatDay(realChile.date)}` : ''}
                />
                <PairTile
                    title={`Compensación inflacionaria a ${realTenor} años`}
                    chile={lastPoint(r.breakevenChile)?.value}
                    us={lastPoint(r.breakevenUs)?.value}
                    detail={`Chile al ${formatDay(lastPoint(r.breakevenChile)?.date)}`}
                />
            </div>
            <div className="mk-grid">
                <div className="mk-panel" data-ascii="surface">
                    <div className="mk-panel-head"><h3>Tasa real a {realTenor} años</h3><Legend labels={['Chile (UF)', 'EE.UU. (TIPS)']} /></div>
                    <p className="mk-panel-sub">Porcentaje anual sobre la inflación</p>
                    <TimeChart rows={charts.real} lines={BOTH} zero />
                </div>
                <div className="mk-panel" data-ascii="surface">
                    <div className="mk-panel-head"><h3>Compensación inflacionaria a {realTenor} años</h3><Legend /></div>
                    <p className="mk-panel-sub">Tasa nominal menos tasa real: la inflación que descuenta el mercado (%)</p>
                    <TimeChart rows={charts.breakeven} lines={BOTH} />
                </div>
            </div>
            <p className="mk-note">
                Chile: bonos del Banco Central en UF (BCU/BTU) y en pesos (BCP). EE.UU.: bonos del Tesoro nominales e indexados a la
                inflación (TIPS). La compensación incluye primas por riesgo y liquidez: no es solo la inflación esperada.
            </p>
        </>
    );
};

const MarketsView = ({ view }) => (
    <>
        <div className="mk-markets">
            {view.markets.map((item) => (
                <div key={item.id} className="mk-tile" data-ascii="surface">
                    <span className="mk-tile-title">{item.label}</span>
                    <span className="mk-tile-value">{item.last ? formatNumber(item.last.value, item.decimals) : '–'}</span>
                    <span className="mk-tile-detail">{item.unit}{item.last ? ` · ${formatDay(item.last.date)}` : ''}</span>
                    {Number.isFinite(item.change) ? (
                        <span className="mk-change">{item.change > 0 ? '▲ +' : '▼ '}{formatNumber(item.change, 1)}% en 12 meses</span>
                    ) : null}
                    <Sparkline points={item.spark} />
                    <span className="mk-source">Fuente: {item.source}</span>
                </div>
            ))}
        </div>
        <p className="mk-note">Último dato de cada serie, variación en 12 meses y los últimos dos años.</p>
    </>
);

// Mercados: tasas de Chile y EE.UU. comparadas en los mismos plazos, tasas reales e inflación, y los
// precios de mercado que más mueven a la economía chilena. El efecto de carga (ascii-reveal, estilo
// dither) decodifica el contenido al llegar los datos y al cambiar de pestaña, rango o plazo.
const MercadosSection = ({ sectionRef }) => {
    const view = useMercadosView();
    const { loading, rates, view: active, setView, range, setRange, spreadTenor, realTenor } = view;
    const reveal = useRef(null);
    const body = useRef(null);
    const origin = useRef('center');

    // El efecto parte dos cuadros después de dibujar los datos: si arranca en el mismo cuadro pesado
    // de los gráficos, la librería lo salta (protección para equipos lentos).
    const [settled, setSettled] = useState(false);
    useEffect(() => {
        if (loading) return undefined;
        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => setSettled(true));
        });
        return () => cancelAnimationFrame(frame);
    }, [loading]);

    // Cada cambio vuelve a decodificar el contenido, desde donde se hizo clic.
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        if (body.current) reveal.current?.reveal({ within: body.current, origin: origin.current });
    }, [active, range, spreadTenor, realTenor]);
    const rememberClick = (event) => {
        if (event.clientX) origin.current = { x: event.clientX, y: event.clientY };
    };

    return (
        <section className="mk-section reveal reveal-delay-1" ref={sectionRef}>
            <div className="regional-card mk-card">
                <div className="mk-header">
                    <h2 className="regional-title">Tasas y mercados</h2>
                    <p className="regional-subtitle">
                        Tasas de interés de Chile y EE.UU. comparadas en los mismos plazos, y los precios de mercado que más mueven a la
                        economía chilena.
                    </p>
                </div>
                <div className="mk-toolbar" onClickCapture={rememberClick}>
                    <Segmented ariaLabel="Vista" options={VIEWS} value={active} onChange={setView} />
                    {active !== 'mercados' ? <Segmented ariaLabel="Rango" options={RANGES} value={range} onChange={setRange} /> : null}
                </div>
                <AsciiReveal ref={reveal} preset="dither" loading={!settled} lazy={false}>
                    <div ref={body} onClickCapture={rememberClick}>
                        {loading ? <div className="mk-loading" /> : null}
                        {!loading && !rates ? <p className="mk-empty">Los datos de mercado aún no están disponibles.</p> : null}
                        {!loading && rates && active === 'tasas' ? <RatesView view={view} /> : null}
                        {!loading && rates && active === 'reales' ? <RealView view={view} /> : null}
                        {!loading && rates && active === 'mercados' ? <MarketsView view={view} /> : null}
                    </div>
                </AsciiReveal>
            </div>
        </section>
    );
};

export default MercadosSection;
