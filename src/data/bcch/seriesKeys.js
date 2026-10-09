// Nombres de las series dentro de public/data/bcch_series.json.
// Son las mismas claves que define python/bcch_shared.py: si se agrega una serie allá,
// se referencia aquí por su clave (nunca por el código del Banco Central).

export const SERIES = {
    // Cuentas nacionales (trimestral, miles de millones de pesos)
    pibNominal: 'pib_total',
    pibReal: 'pib_real',
    consumo: 'consumo_privado',
    gasto: 'gasto_gob_nominal',
    fbkf: 'inversion',
    existencias: 'existencias',
    exportaciones: 'exportaciones',
    importaciones: 'importaciones',

    // Actividad (mensual, índice 2018=100)
    imacec: 'imacec',
    imacecBienes: 'imacec_bienes',
    imacecMineria: 'imacec_mineria',
    imacecIndustria: 'imacec_industria',
    imacecRestoBienes: 'imacec_resto_bienes',
    imacecComercio: 'imacec_comercio',
    imacecServicios: 'imacec_servicios',
    imacecNoMinero: 'imacec_no_minero',

    // Precios (mensual, índices)
    ipcGeneral: 'ipc_general',
    ipcCore: 'ipc_core',
    ipcVolatile: 'ipc_volatile',

    // Mercados (diario)
    dolar: 'dolar',
    cobre: 'cobre',
    cny: 'tc_cny',
    eur: 'tc_eur',
    ars: 'tc_ars',
    jpy: 'tc_jpy',
    tcr: 'tcr',
    tcr5: 'tcr_5',

    // Mercado laboral y población
    desempleo: 'desempleo',
    pobTotal: 'pob_total',
    pobHombres: 'pob_hombres',
    pobMujeres: 'pob_mujeres'
};

export const PIB_ACTIVITIES = ['bienes', 'mineria', 'industria', 'resto', 'comercio', 'servicios'];

// Series regionales: la clave se arma con el id de la región (ver shared/constants/regions.js).
export const regionalKey = {
    pib: (regionId) => `pib_reg_${regionId}`,
    pibActivity: (regionId, activity) => `pib_reg_${regionId}_${activity}`,
    population: (regionId) => `pob_reg_${regionId}`,
    populationWomen: (regionId) => `pob_reg_${regionId}_m`,
    populationMen: (regionId) => `pob_reg_${regionId}_h`,
    laborForce: (regionId) => `labor_ftr_reg_${regionId}`,
    employed: (regionId) => `labor_ocu_reg_${regionId}`,
    unemploymentRate: (regionId) => `labor_des_reg_${regionId}`
};
