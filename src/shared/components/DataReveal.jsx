import { useEffect, useRef, useState } from 'react';
import { AsciiReveal } from 'ascii-reveal';
import '../../styles/dataReveal.css';

// Efecto de carga de las secciones de Datos (ascii-reveal, estilo dither): mientras `loading` es
// verdadero se ve un brillo de caracteres; cuando llegan los datos, el contenido se decodifica en su
// lugar. Cada vez que cambia algo de `replayOn` (pestaña, rango, período...) se vuelve a decodificar,
// partiendo desde donde se hizo clic.
//
// Dentro del contenido se pueden marcar elementos:
// - data-ascii="surface": tarjetas y paneles (aparecen con un marco de puntos).
// - data-ascii="skip": se dejan quietos, por ejemplo las barras de botones.
const DataReveal = ({ loading = false, replayOn = [], className = '', children }) => {
    const reveal = useRef(null);
    const origin = useRef('center');

    // El efecto parte dos cuadros después de dibujar los datos: si arranca en el mismo cuadro pesado
    // de los gráficos, la librería lo salta (protección para equipos lentos).
    const [settled, setSettled] = useState(false);
    useEffect(() => {
        if (loading) {
            setSettled(false);
            return undefined;
        }
        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => setSettled(true));
        });
        return () => cancelAnimationFrame(frame);
    }, [loading]);

    // Cada cambio vuelve a decodificar el contenido (no al cargar: de eso se encarga `loading`).
    const replayKey = JSON.stringify(replayOn);
    const lastKey = useRef(replayKey);
    useEffect(() => {
        if (replayKey === lastKey.current) return;
        lastKey.current = replayKey;
        if (settled) reveal.current?.reveal({ origin: origin.current });
    }, [replayKey, settled]);

    const rememberClick = (event) => {
        if (event.clientX) origin.current = { x: event.clientX, y: event.clientY };
    };

    return (
        <AsciiReveal
            ref={reveal}
            preset="dither"
            loading={!settled}
            lazy={false}
            className={`data-reveal ${className}`.trim()}
            onClickCapture={rememberClick}
        >
            {children}
        </AsciiReveal>
    );
};

export default DataReveal;
