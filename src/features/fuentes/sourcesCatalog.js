import { REGION_IDS } from '../../shared/constants/regions';
import { PIB_ACTIVITIES, SERIES, iedKey, regionalKey } from '../../data/bcch/seriesKeys';
import { US_SERIES } from '../../data/mercados/client';

// De dónde sale cada dato del sitio, agrupado por institución (un botón por institución).
// Lo que se escribe aquí es fijo (qué es, dónde se usa, cada cuánto se publica, enlace); las fechas
// de último dato y de revisión se leen de los JSON en sourcesView.js.
//
// Cada fila dice de qué archivo sale (`dataset`) y cómo se lee su último dato:
//   bcch       -> `keys(año actual)`: claves de bcch_series.json; `period`: D, M, T o A.
//   dipres     -> finanzas_publicas.json (last_period).
//   iedPaises  -> ied_paises.json (último año).
//   ipom, weo  -> proyecciones.json (última edición).
//   us         -> mercados_eeuu.json: `keys()` y `source` (treasury, nyfed o fred), para la revisión.
// `projection: true` marca series que traen proyecciones a futuro (población del INE).

const BDE_URL = 'https://si3.bcentral.cl/siete';
const regional = (build) => REGION_IDS.map((id) => build(id));

export const SOURCE_GROUPS = [
    {
        id: 'bcch',
        label: 'Banco Central',
        name: 'Banco Central de Chile',
        description: 'Casi todas las series se descargan de la API de la Base de Datos Estadísticos (BDE). '
            + 'La IED por país y las proyecciones del IPoM salen de archivos Excel que publica el Banco Central.',
        rows: [
            {
                id: 'imacec',
                label: 'IMACEC y sus componentes',
                section: 'indicadores',
                frequency: 'Mensual',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'M',
                keys: () => [SERIES.imacec, SERIES.imacecNoMinero]
            },
            {
                id: 'ipc',
                label: 'IPC (general, subyacente y volátil)',
                note: 'Elaborado por el INE',
                section: 'indicadores',
                frequency: 'Mensual',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'M',
                keys: () => [SERIES.ipcGeneral]
            },
            {
                id: 'monedas',
                label: 'Dólar observado y otras monedas',
                section: 'indicadores',
                frequency: 'Diaria',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'D',
                keys: () => [SERIES.dolar]
            },
            {
                id: 'tcr',
                label: 'Tipo de cambio real',
                section: 'indicadores',
                frequency: 'Mensual',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'M',
                keys: () => [SERIES.tcr]
            },
            {
                id: 'cobre',
                label: 'Precio del cobre',
                section: 'indicadores',
                frequency: 'Diaria',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'D',
                keys: () => [SERIES.cobre]
            },
            {
                id: 'desempleo',
                label: 'Tasa de desempleo',
                note: 'Elaborada por el INE',
                section: 'indicadores',
                frequency: 'Mensual',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'M',
                keys: () => [SERIES.desempleo]
            },
            {
                id: 'tpm',
                label: 'Tasa de política monetaria',
                section: 'mercados',
                frequency: 'Diaria',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'D',
                keys: () => [SERIES.tpm]
            },
            {
                id: 'bonos',
                label: 'Tasas de los bonos del Banco Central',
                note: 'En pesos (BCP) a 2, 5 y 10 años y en UF a 5 y 10 años, mercado secundario',
                section: 'mercados',
                frequency: 'Diaria',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'D',
                keys: () => [SERIES.bcp2, SERIES.bcp5, SERIES.bcp10, SERIES.bcu5, SERIES.bcu10]
            },
            {
                id: 'wti',
                label: 'Precio del petróleo WTI',
                section: 'mercados',
                frequency: 'Diaria',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'D',
                keys: () => [SERIES.wti]
            },
            {
                id: 'cuentas',
                label: 'PIB y componentes del gasto',
                section: 'pib',
                frequency: 'Trimestral',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'T',
                keys: () => [SERIES.pibNominal, SERIES.pibReal]
            },
            {
                id: 'pib-regional',
                label: 'PIB regional y por actividad',
                section: 'regiones',
                frequency: 'Trimestral',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'T',
                keys: () => [
                    ...regional(regionalKey.pib),
                    ...PIB_ACTIVITIES.flatMap((activity) => regional((id) => regionalKey.pibActivity(id, activity)))
                ]
            },
            {
                id: 'empleo-regional',
                label: 'Empleo y desocupación por región',
                note: 'Elaborado por el INE',
                section: 'regiones',
                frequency: 'Mensual',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'M',
                keys: () => [
                    ...regional(regionalKey.laborForce),
                    ...regional(regionalKey.employed),
                    ...regional(regionalKey.unemploymentRate)
                ]
            },
            {
                id: 'poblacion',
                label: 'Población nacional y regional',
                note: 'Proyecciones de población del INE',
                section: 'regiones',
                frequency: 'Anual',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'A',
                projection: true,
                keys: () => [SERIES.pobTotal, ...regional(regionalKey.population)]
            },
            {
                id: 'ied-region',
                label: 'Inversión extranjera directa por región (stock)',
                section: 'ied',
                frequency: 'Anual',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'A',
                keys: () => [iedKey.total]
            },
            {
                id: 'eee',
                label: 'Encuesta de Expectativas Económicas (crecimiento del PIB)',
                section: 'proyecciones',
                frequency: 'Mensual',
                url: BDE_URL,
                dataset: 'bcch',
                period: 'M',
                // Una serie por año proyectado: la encuesta más reciente pregunta por este año y el siguiente.
                keys: (year) => [`eee_pib_${year}`, `eee_pib_${year + 1}`]
            },
            {
                id: 'ied-pais',
                label: 'Inversión extranjera directa por país y sector',
                note: 'Excel "IED por país, sector y región"',
                section: 'ied',
                frequency: 'Anual',
                url: 'https://si3.bcentral.cl/estadisticas/Principal1/excel/SE/BDP/Excel/Anual/IED_pais_sector_region.xlsx',
                dataset: 'iedPaises'
            },
            {
                id: 'ipom',
                label: 'Proyecciones del IPoM',
                note: 'Excel "Proyecciones IPoM"',
                section: 'proyecciones',
                frequency: 'Cuatro informes al año',
                url: 'https://www.bcentral.cl/web/banco-central/areas/politica-monetaria/informe-de-politica-monetaria',
                dataset: 'ipom'
            }
        ]
    },
    {
        id: 'dipres',
        label: 'DIPRES',
        name: 'Dirección de Presupuestos',
        description: 'Informe de ejecución presupuestaria del Gobierno Central, que la DIPRES publica cada trimestre.',
        rows: [
            {
                id: 'ejecucion',
                label: 'Ingresos, gastos y balance del Gobierno Central Total',
                note: 'Estado de operaciones (montos mensuales)',
                section: 'fiscal',
                frequency: 'Trimestral',
                url: 'https://www.dipres.gob.cl/598/w3-propertyvalue-15492.html',
                dataset: 'dipres'
            }
        ]
    },
    {
        id: 'eeuu',
        label: 'EE.UU.',
        name: 'Fuentes oficiales de EE.UU.',
        description: 'Tasas y precios de mercado de EE.UU. para compararlos con los de Chile, descargados de cada fuente original.',
        rows: [
            {
                id: 'tesoro',
                label: 'Bonos del Tesoro y bonos indexados a la inflación (TIPS)',
                note: 'Nominales a 1, 2, 3, 5 y 10 años; reales a 5 y 10 años',
                section: 'mercados',
                frequency: 'Diaria',
                url: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates',
                dataset: 'us',
                source: 'treasury',
                keys: () => [...['1', '2', '3', '5', '10'].map(US_SERIES.treasury), ...['5', '10'].map(US_SERIES.tips)]
            },
            {
                id: 'fed',
                label: 'Tasa de fondos federales (efectiva y rango meta)',
                note: 'Fed de Nueva York',
                section: 'mercados',
                frequency: 'Diaria',
                url: 'https://www.newyorkfed.org/markets/reference-rates/effr',
                dataset: 'us',
                source: 'nyfed',
                keys: () => [US_SERIES.effr]
            },
            {
                id: 'fred',
                label: 'Índice amplio del dólar y VIX',
                note: 'Reserva Federal y Cboe, vía FRED (Fed de St. Louis)',
                section: 'mercados',
                frequency: 'Diaria',
                url: 'https://fred.stlouisfed.org',
                dataset: 'us',
                source: 'fred',
                keys: () => [US_SERIES.dollarIndex, US_SERIES.vix]
            }
        ]
    },
    {
        id: 'fmi',
        label: 'FMI',
        name: 'Fondo Monetario Internacional',
        description: 'Proyecciones de crecimiento de Chile del World Economic Outlook, descargadas de la API del FMI.',
        rows: [
            {
                id: 'weo',
                label: 'World Economic Outlook (crecimiento del PIB de Chile)',
                section: 'proyecciones',
                frequency: 'Abril y octubre',
                url: 'https://www.imf.org/en/Publications/WEO',
                dataset: 'weo'
            }
        ]
    }
];
