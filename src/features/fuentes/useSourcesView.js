import { useEffect, useMemo, useState } from 'react';
import { loadBcchData } from '../../data/bcch/client';
import { loadFiscalData } from '../../data/dipres/client';
import { buildSourceGroups } from './sourcesView';

// Archivos que no tienen cliente propio (los leen sus secciones al montarse).
const loadJson = (url) => fetch(url)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

// Datos de la sección Fuentes: carga los cuatro archivos de public/data y arma los grupos con sus
// fechas. `group` es la institución elegida (un botón por institución).
const useSourcesView = () => {
    const [data, setData] = useState(null);
    const [group, setGroup] = useState('bcch');

    useEffect(() => {
        let isActive = true;
        Promise.all([
            loadBcchData(),
            loadFiscalData(),
            loadJson('/data/ied_paises.json'),
            loadJson('/data/proyecciones.json')
        ]).then(([bcch, fiscal, iedPaises, projections]) => {
            if (isActive) setData({ bcch, fiscal, iedPaises, projections });
        });
        return () => {
            isActive = false;
        };
    }, []);

    const groups = useMemo(() => buildSourceGroups(data), [data]);
    const current = groups.find((item) => item.id === group) || groups[0];

    return { loading: data === null, groups, current, group, setGroup };
};

export default useSourcesView;
