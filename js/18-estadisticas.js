// =============================================================
// 📊 ESTADÍSTICAS · PARTE 1: ANÁLISIS DE PROGRAMACIÓN / SUSPENSIONES
// Datos tomados desde el Registro Definitivo (Firebase: registros_definitivos)
// =============================================================

let estadisticasRegistros = [];
let estadisticasFiltroFechaInicio = '';
let estadisticasFiltroFechaFin = '';

// Por defecto ambos (tabla de causales y gráfico de especialidad) se filtran
// a Tipo de Actividad = "Cmay"; el usuario puede cambiarlo desde sus propios filtros.
function estadisticasFiltroChart2PorDefecto() {
    return { tipoActividad: 'Cmay', causal: '', motivo: '' };
}
function estadisticasFiltrosColumnaCausalesPorDefecto() {
    return {
        Causal_de_suspension: new Set(),
        Motivo: new Set(),
        Tipo_Actividad: new Set(['Cmay']),
        Observaciones: new Set()
    };
}

let estadisticasFiltroChart2 = estadisticasFiltroChart2PorDefecto();
let estadisticasFiltrosColumnaCausales = estadisticasFiltrosColumnaCausalesPorDefecto();

let estadisticasChartEspecialidad = null;
let estadisticasChartIndices = null;

// =============================================================
// 📊 ESTADÍSTICAS · PARTE 2: REM (Cmay) / ESPECIALIDADES QUIRÚRGICAS
// Acá NO se cuentan pacientes sino "cirugías": cada intervención
// realizada (1ra/2da/3ra) de una fila cuenta por separado según su
// propio Tipo de Actividad (Cmay/Cmen/Proc).
// =============================================================
let estadisticasRemFiltroEspecialidades = new Set(); // vacío = todas
let estadisticasRemFiltroDestino = '';
let estadisticasRemFiltroAnio = null; // solo para el gráfico de producción anualizada

let estadisticasChartRemDistribucion = null;
let estadisticasChartRemAnual = null;

// Total_Cmay/Cmen/Proc (y sus derivados) solo cuentan intervenciones
// realmente operadas de forma electiva: se excluyen Suspendido, Urgencia
// (que se desglosa aparte), Condicional (No Operado) y Perianalgesia (Parto).
const REM_ESTADOS_EXCLUIDOS_GENERAL = [
    'SUSPENDIDO', 'URGENCIA', 'CONDICIONAL (NO OPERADO)', 'PERIANALGESIA (PARTO)'
];

// =============================================================
// 📈 COMPORTAMIENTO DE PRODUCCIÓN POR ESPECIALIDAD (Cmay)
// Un mini-gráfico de línea por especialidad, con 2 series: pacientes
// Cmay (filas) vs. tipos de actividad Cmay (cada intervención cuenta
// por separado). Muestra comportamiento ANUAL (enero hasta el último mes
// con datos) — no se rige por el filtro de fecha general (que puede ser
// más angosto que un mes), tiene su propio selector de Año.
// =============================================================
let estadisticasChartsProdEsp = [];
let estadisticasProdEspAnio = null;

// =============================================================
// 🚶 PROCESO AMBULATORIO
// El KPI general y el ranking usan el filtro de fecha general. El
// desglose mensual por especialidad, en cambio, muestra comportamiento
// ANUAL (mismo criterio que Producción por Especialidad) con su propio
// selector de Año, independiente del filtro general.
// =============================================================
let estadisticasChartsAmb = [];
let estadisticasChartAmbRanking = null;
let estadisticasAmbAnio = null;

// =============================================================
// 🏨 OCUPACIÓN Y RENDIMIENTO PABELLÓN
// Horario hábil: 08:00–17:00 (9h corridas - 1h colación = 8h/pabellón/día).
// AM y PM son bloques contables de 4h cada uno. N° de pabellones = 2.
// =============================================================
let estadisticasFeriadosCache = new Set();
let estadisticasDisponibilidadPabellon = {};
let estadisticasChartsGaugeOcup = {};

// =============================================================
// 📑 PAGINACIÓN / PRESENTACIÓN / EXPORTAR A PPT
// =============================================================
const ESTADISTICAS_PAGINAS = [
    { titulo: '📊 Análisis de Programación / Suspensiones' },
    { titulo: '🏥 REM (Cmay) / Especialidades Quirúrgicas' },
    { titulo: '📈 Comportamiento de Producción por Especialidad (Cmay)' },
    { titulo: '🚶 Proceso Ambulatorio' },
    { titulo: '🏨 Ocupación y Rendimiento Pabellón' },
    { titulo: '🩺 Tiempos por Intervención' },
    { titulo: '🤰 Perianalgesia (Parto) por Mes' },
    { titulo: '🎯 Cumplimiento de Metas' },
    { titulo: '⏱️ Horarios de Entrada/Salida AM/PM' }
];

// Láminas compartidas por el modo Presentación (en la app) Y por el export a
// PPT — no es 1 a 1 con ESTADISTICAS_PAGINAS: la Parte 1 y Proceso
// Ambulatorio se dividen en 2 láminas cada una, Tiempos por Intervención no
// se incluye, la tabla de Causales oculta su columna de Observaciones, y
// algunas usan un layout más ancho (gridAncho) — todo esto vía la clase
// 'pptx-modo-captura' (ver styles.css), aplicada solo durante la captura.
const ESTADISTICAS_LAMINAS = [
    { titulo: '📊 Programación / Suspensiones — Resumen', pagina: 0, elementoId: 'estadisticasPagina0Principal' },
    { titulo: '📋 Causales de Suspensión', pagina: 0, elementoId: 'estadisticasPagina0Causales', ocultarObservaciones: true },
    { titulo: '🏥 REM (Cmay) / Especialidades Quirúrgicas', pagina: 1, elementoId: 'estadisticasPagina_1' },
    { titulo: '📈 Comportamiento de Producción por Especialidad (Cmay)', pagina: 2, elementoId: 'estadisticasPagina_2', gridAncho: true, soloGraficos: true },
    { titulo: '🚶 Índice de Ambulatorización por Especialidad', pagina: 3, elementoId: 'estadisticasAmbRankingWrap' },
    { titulo: '🚶 Proceso Ambulatorio — Desglose por Especialidad', pagina: 3, elementoId: 'estadisticasAmbDesgloseWrap', gridAncho: true, soloGraficos: true },
    { titulo: '🏨 Ocupación y Rendimiento Pabellón', pagina: 4, elementoId: 'estadisticasPagina_4', ocultarDisponibilidad: true },
    { titulo: '🤰 Perianalgesia (Parto) por Mes', pagina: 6, elementoId: 'estadisticasPagina_6' },
    { titulo: '🎯 Cumplimiento de Metas', pagina: 7, elementoId: 'estadisticasPagina_7', gridMetas: true },
    { titulo: '⏱️ Horarios de Entrada/Salida AM/PM', pagina: 8, elementoId: 'estadisticasPagina_8' }
];

function laminaNecesitaModoCaptura(lamina) {
    return !!(lamina.gridAncho || lamina.gridMetas || lamina.ocultarDisponibilidad || lamina.ocultarObservaciones);
}

// Vuelve a dibujar los 2 gráficos de la Parte 1 (Programación/Suspensiones)
// con los datos actuales — usado antes de capturar esa página.
function redibujarGraficosPagina0() {
    const registrosFiltrados = filtrarRegistrosPorFechaEstadisticas(
        estadisticasRegistros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin
    );
    const kpis = calcularKPIsEstadisticas(registrosFiltrados);
    dibujarChartEspecialidad(registrosFiltrados);
    dibujarChartIndicesSuspension(kpis);
}

// Antes de capturar cada página (Presentación o PPT) se vuelve a renderizar
// por completo para que los gráficos se creen leyendo el tamaño real del
// contenedor ya visible — más confiable que chart.resize() tras varios
// ciclos de display:none/block.
const ESTADISTICAS_REDIBUJAR_POR_PAGINA = {
    0: redibujarGraficosPagina0,
    1: renderEstadisticasRem,
    2: renderEstadisticasProdEsp,
    3: renderEstadisticasAmb,
    4: renderEstadisticasOcup,
    6: renderEstadisticasPerianalgesia,
    7: renderEstadisticasMetas
};

// -------------------------------------------------------------
// 🧩 PAGINACIÓN de las láminas "grilla por especialidad" (Producción por
// Especialidad y Desglose Ambulatorio): en vez de apretar todas las
// especialidades en una sola lámina, se muestran de a
// ESTADISTICAS_ESPECIALIDADES_POR_LAMINA (2 columnas x 2 filas) usando el
// máximo espacio de la lámina — si hay más, se generan láminas adicionales
// automáticamente. Mapea elementoId -> id del grid con las tarjetas.
// -------------------------------------------------------------
const ESTADISTICAS_LAMINAS_PAGINABLES_POR_ESPECIALIDAD = {
    estadisticasPagina_2: 'estadisticasProdEspGrid',
    estadisticasAmbDesgloseWrap: 'estadisticasAmbGrid'
};
// 2 por lámina (una al lado de la otra) para que cada gráfico quede tan
// grande como cuando queda uno solo en la lámina — antes eran 4 (2x2) y se
// veían chicos comparados con una lámina de una sola especialidad.
const ESTADISTICAS_ESPECIALIDADES_POR_LAMINA = 2;

// Oculta todas las tarjetas del grid salvo las que pertenecen al chunk
// indicado (chunkIndex, 0-based), para que html2canvas capture solo esas.
function estadisticasAplicarChunkGrid(gridId, chunkIndex, chunkSize) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    Array.from(grid.children).forEach((child, idx) => {
        child.style.display = (Math.floor(idx / chunkSize) === chunkIndex) ? '' : 'none';
    });
}

function estadisticasRestaurarChunkGrid(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    Array.from(grid.children).forEach(child => { child.style.display = ''; });
}

// Expande ESTADISTICAS_LAMINAS: las láminas paginables se convierten en N
// láminas según cuántas tarjetas de especialidad haya REALMENTE en este
// momento (según año/filtro seleccionado), en vez de una sola lámina fija.
// Debe llamarse antes de iniciar una tanda de capturas (Presentación o PPT).
function estadisticasResolverLaminas() {
    const resultado = [];
    ESTADISTICAS_LAMINAS.forEach(l => {
        const gridId = ESTADISTICAS_LAMINAS_PAGINABLES_POR_ESPECIALIDAD[l.elementoId];
        if (!gridId) {
            resultado.push({ ...l, gridId: null, chunkIndex: null });
            return;
        }

        const paginaAnterior = estadisticasPaginaActual;
        mostrarPaginaEstadisticas(l.pagina);
        const redibujar = ESTADISTICAS_REDIBUJAR_POR_PAGINA[l.pagina];
        if (redibujar) redibujar();
        const grid = document.getElementById(gridId);
        const total = grid ? grid.children.length : 0;
        mostrarPaginaEstadisticas(paginaAnterior);

        const numLaminas = Math.max(1, Math.ceil(total / ESTADISTICAS_ESPECIALIDADES_POR_LAMINA));
        for (let i = 0; i < numLaminas; i++) {
            resultado.push({
                ...l,
                titulo: numLaminas > 1 ? `${l.titulo} (${i + 1}/${numLaminas})` : l.titulo,
                gridId,
                chunkIndex: i
            });
        }
    });
    return resultado;
}

let estadisticasPaginaActual = 0;
let estadisticasCapturasCache = {}; // { elementoId(+variante): { dataUrl, width, height } }
let estadisticasPresentandoIndice = 0;
let estadisticasPresentacionSolicitudId = 0;
let estadisticasManejadorTecladoPresentacion = null;
let estadisticasLogoDataUrl = null;

// Convierte favicon.png (el logo del hospital, ya usado en el header de la
// app) a un data URL, para poder insertarlo en las diapositivas del PPT y
// en el modo Presentación sin depender de rutas de archivo relativas.
function obtenerLogoDataUrl() {
    if (estadisticasLogoDataUrl) return Promise.resolve(estadisticasLogoDataUrl);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                estadisticasLogoDataUrl = {
                    dataUrl: canvas.toDataURL('image/png'),
                    width: img.naturalWidth,
                    height: img.naturalHeight
                };
            } catch (error) {
                console.error('❌ No se pudo preparar el logo para la presentación:', error);
                estadisticasLogoDataUrl = null;
            }
            resolve(estadisticasLogoDataUrl);
        };
        img.onerror = function() { resolve(null); };
        img.src = 'favicon.png';
    });
}

// =============================================================
// 🩺 TIEMPOS POR INTERVENCIÓN
// Buscador sobre "1ra Intervención Realizada": promedio/mínimo/máximo
// de duración (T_QX) y N° de casos usados para el cálculo.
// =============================================================
let estadisticasIntervTexto = '';
let estadisticasIntervSeleccionadas = new Set();
let estadisticasIntervListenerGlobalRegistrado = false;
let estadisticasIntervReabrirDropdown = false;

// =============================================================
// 🤰 PERIANALGESIA (PARTO) — CASOS POR MES EN EL AÑO
// Gráfico fijo (solo se puede elegir el año).
// =============================================================
let estadisticasPerianalgesiaAnio = null;
let estadisticasChartPerianalgesia = null;

// =============================================================
// 🎯 CUMPLIMIENTO DE METAS
// Metas editables (solo administrador) con año propio cada una,
// guardadas en Firebase (metas_produccion).
// =============================================================
let estadisticasMetas = {
    produccionGeneral: { meta: 0, anio: null },
    produccionCmay: { meta: 0, anio: null },
    produccionGeneralPacientes: { meta: 0, anio: null },
    produccionCmayPacientes: { meta: 0, anio: null },
    ambulatorizacion: { meta: 0, anio: null }
};
let estadisticasMetaEditando = null; // null | una de las claves de estadisticasMetas

const OCUP_HORA_INICIO_HABIL = '08:00';
const OCUP_HORA_FIN_HABIL = '17:00';
const OCUP_HORAS_POR_BLOQUE = 4;
// Tiempo de viraje/aseo entre cirugías: se suma a la duración real de cada
// caso, tanto para Horas Trabajadas/Urgencia en horario hábil como inhábil.
const OCUP_MINUTOS_VIRAJE_POR_CIRUGIA = 20;
const OCUP_PABELLONES = ['pabellon1', 'pabellon2'];

// =============================================================
// 🏷️ PLUGIN GLOBAL: valores siempre visibles sobre cada barra
// (no solo al pasar el cursor / tooltip). Se registra una sola vez
// y aplica automáticamente a todos los Chart.js de esta sección.
// =============================================================
if (typeof Chart !== 'undefined') {
    // Sin esto, la captura de páginas para Presentación/PPT toma el screenshot
    // ~30ms después de crear los charts, mientras la animación de entrada
    // (~1000ms por defecto) apenas empezó: barras casi sin altura y gauges
    // como manchas irregulares en vez de arcos, sin relación con el valor real.
    Chart.defaults.animation = false;

    Chart.register({
        id: 'estadisticasValueLabels',
        afterDatasetsDraw(chart) {
            if (chart.config.type === 'doughnut') return; // los gauges usan estadisticasGaugeCenterText
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if (!meta || meta.hidden) return;
                const horizontal = chart.options && chart.options.indexAxis === 'y';
                meta.data.forEach((bar, index) => {
                    if (!bar) return;
                    const valorCrudo = dataset.data[index];
                    let etiqueta = dataset.labelsTexto ? dataset.labelsTexto[index] : valorCrudo;
                    if (etiqueta === undefined || etiqueta === null) return;
                    if (typeof etiqueta === 'number') {
                        etiqueta = Number.isInteger(etiqueta) ? String(etiqueta) : etiqueta.toFixed(1);
                    }
                    ctx.save();
                    ctx.fillStyle = '#1e293b';
                    ctx.font = 'bold 12px sans-serif';
                    if (horizontal) {
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(etiqueta, bar.x + 8, bar.y);
                    } else {
                        ctx.textAlign = 'center';
                        ctx.fillText(etiqueta, bar.x, Math.max(14, bar.y - 8));
                    }
                    ctx.restore();
                });
            });
        }
    });

    // Texto centrado para los gauges (doughnut semicircular) de Ocupación Pabellón.
    Chart.register({
        id: 'estadisticasGaugeCenterText',
        afterDraw(chart) {
            if (chart.config.type !== 'doughnut' || !chart.options.esGauge) return;
            const texto = chart.options.gaugeTexto;
            if (!texto) return;
            const { ctx, chartArea } = chart;
            const x = (chartArea.left + chartArea.right) / 2;
            const y = chartArea.bottom - 2;
            ctx.save();
            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.fillText(texto, x, y);
            ctx.restore();
        }
    });
}

const ESTADISTICAS_ESTADO = {
    PROGRAMADO: 'OPERADO (PROGRAMADO)',
    AGREGADO: 'OPERADO (AGREGADO)',
    CONDICIONAL_OP: 'OPERADO (CONDICIONAL)',
    SUSPENDIDO: 'SUSPENDIDO',
    URGENCIA: 'URGENCIA',
    CONDICIONAL_NO_OP: 'CONDICIONAL (NO OPERADO)'
};

// =============================================================
// 🔧 HELPERS DE NEGOCIO
// =============================================================
function filaEsCmay(item) {
    return item.Tipo_Actividad === 'Cmay' || item.Tipo_Actividad_2 === 'Cmay' || item.Tipo_Actividad_3 === 'Cmay';
}

function motivoEsReemplazoUrgencia(motivo) {
    if (!motivo) return false;
    // Los registros históricos usan indistintamente "Reemplazo por urgencia"
    // (texto del listado de causales) y "Reemplazado por urgencia" (texto
    // real que quedó guardado en varios registros existentes). Se comprueba
    // con ambas raíces para no dejar casos sin excluir del numerador.
    const m = motivo.toLowerCase();
    return (m.includes('reemplazo') || m.includes('reemplazado')) && m.includes('urgencia');
}

function estadisticasDivide(numerador, denominador) {
    return denominador > 0 ? (numerador / denominador) * 100 : 0;
}

function filtrarRegistrosPorFechaEstadisticas(registros, fechaInicio, fechaFin) {
    if (!fechaInicio && !fechaFin) return registros;
    return registros.filter(r => {
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm) return false;
        if (fechaInicio && fechaNorm < fechaInicio) return false;
        if (fechaFin && fechaNorm > fechaFin) return false;
        return true;
    });
}

function calcularKPIsEstadisticas(registros) {
    const programado = registros.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.PROGRAMADO);
    const suspendido = registros.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.SUSPENDIDO);
    const agregado = registros.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.AGREGADO);
    const condicionalOp = registros.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.CONDICIONAL_OP);
    const condicionalNoOp = registros.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.CONDICIONAL_NO_OP);
    const urgencia = registros.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.URGENCIA);

    const totalProgramados = programado.length + suspendido.length;
    const progCmay = programado.concat(suspendido).filter(filaEsCmay).length;
    const totalAgregados = agregado.length;
    const totalCondOperados = condicionalOp.length;
    const totalCondNoOperados = condicionalNoOp.length;
    const totalUrgencia = urgencia.length;
    const totalOperados = programado.length + totalAgregados + totalCondOperados + totalUrgencia;
    const totalSuspendidos = suspendido.length;
    const suspCmay = suspendido.filter(filaEsCmay).length;

    const indiceSuspension = estadisticasDivide(suspCmay, progCmay);

    const suspCmaySinUrgencia = suspendido.filter(r => filaEsCmay(r) && !motivoEsReemplazoUrgencia(r.Motivo)).length;
    const indiceSuspensionSinUrgencia = estadisticasDivide(suspCmaySinUrgencia, progCmay);

    const programadoCmayOperado = programado.filter(filaEsCmay).length;
    const programadoCmayOperadoDestinoCMA = programado.filter(r => filaEsCmay(r) && r.DESTINO === 'CMA').length;
    const indiceAmbulatorizacion = estadisticasDivide(programadoCmayOperadoDestinoCMA, programadoCmayOperado);

    return {
        totalProgramados, progCmay, totalAgregados, totalCondOperados, totalCondNoOperados,
        totalUrgencia, totalOperados, totalSuspendidos, suspCmay, indiceSuspension,
        suspCmaySinUrgencia, indiceSuspensionSinUrgencia, indiceAmbulatorizacion,
        registrosSuspendidos: suspendido
    };
}

// =============================================================
// 📥 CARGA DE DATOS DESDE FIREBASE
// =============================================================
async function cargarEstadisticas() {
    if (!currentUser) {
        estadisticasContent.innerHTML = `
            <div style="text-align:center; padding:40px; color:#64748b;">
                <p>🔐 Inicia sesión para ver las Estadísticas.</p>
            </div>
        `;
        return;
    }

    estadisticasContent.innerHTML = `
        <div style="text-align:center; padding:40px; color:#64748b;">
            <p>⏳ Cargando estadísticas...</p>
        </div>
    `;

    try {
        const snapshot = await database.ref('registros_definitivos').once('value');
        const data = snapshot.val();

        const registros = [];
        if (data) {
            Object.keys(data).forEach(key => {
                registros.push({ id: key, ...data[key] });
            });
        }

        estadisticasRegistros = registros;
        estadisticasFiltroChart2 = estadisticasFiltroChart2PorDefecto();
        estadisticasFiltrosColumnaCausales = estadisticasFiltrosColumnaCausalesPorDefecto();

        estadisticasRemFiltroEspecialidades = new Set();
        estadisticasRemFiltroDestino = '';
        const anioReciente = estadisticasObtenerAnioMasReciente(registros);
        estadisticasRemFiltroAnio = anioReciente;

        // Filtro de fecha general: aplica a toda la sección de Estadísticas
        // (excepto los selectores de Año que necesitan el año completo:
        // Producción Anualizada dentro de REM, Perianalgesia y Metas).
        // Por defecto, el año más reciente con datos.
        estadisticasFiltroFechaInicio = `${anioReciente}-01-01`;
        estadisticasFiltroFechaFin = `${anioReciente}-12-31`;

        const hoy = new Date();
        await obtenerFeriados([hoy.getFullYear()]);
        await cargarDisponibilidadPabellon();

        estadisticasIntervTexto = '';
        estadisticasIntervSeleccionadas = new Set();
        estadisticasPerianalgesiaAnio = anioReciente;
        estadisticasProdEspAnio = anioReciente;
        estadisticasAmbAnio = anioReciente;

        const metasGuardadas = await cargarMetasProduccion();
        estadisticasMetas.produccionGeneral = metasGuardadas.produccionGeneral || { meta: 0, anio: anioReciente };
        estadisticasMetas.produccionCmay = metasGuardadas.produccionCmay || { meta: 0, anio: anioReciente };
        estadisticasMetas.produccionGeneralPacientes = metasGuardadas.produccionGeneralPacientes || { meta: 0, anio: anioReciente };
        estadisticasMetas.produccionCmayPacientes = metasGuardadas.produccionCmayPacientes || { meta: 0, anio: anioReciente };
        estadisticasMetas.ambulatorizacion = metasGuardadas.ambulatorizacion || { meta: 0, anio: anioReciente };
        estadisticasMetaEditando = null;

        renderEstadisticas();

    } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
        estadisticasContent.innerHTML = `
            <div style="text-align:center; padding:40px; color:#dc2626;">
                <p>❌ Hubo un problema al cargar las estadísticas.</p>
            </div>
        `;
    }
}

// =============================================================
// 🖼️ RENDER PRINCIPAL
// =============================================================
function renderEstadisticas() {
    const registrosFiltrados = filtrarRegistrosPorFechaEstadisticas(
        estadisticasRegistros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin
    );
    const kpis = calcularKPIsEstadisticas(registrosFiltrados);

    estadisticasCapturasCache = {};

    estadisticasContent.innerHTML = `
        <div style="margin-top:16px;">
            <span style="font-size:0.8rem; font-weight:700; color:#0b2a4f; display:block; margin-bottom:6px;">📅 Filtro de fecha general (aplica a toda la sección de Estadísticas)</span>
            ${renderFiltroFechaGlobalEstadisticas()}
        </div>

        ${renderNavegacionPaginasEstadisticas()}

        <div class="estadisticas-pagina" id="estadisticasPagina_0">
        <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:16px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; color:#0b2a4f;">
                📊 Análisis de Programación / Suspensiones
            </div>

            <div id="estadisticasPagina0Principal">
                <div id="estadisticasKpiGrid" style="margin-top:16px;">
                    ${renderKpiGridEstadisticas(kpis)}
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:20px;">
                    <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px;">
                        <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:8px;">🏥 Distribución de suspendidos por especialidad</div>
                        <div id="estadisticasChart1FiltrosContainer">
                            ${renderFiltrosChartEspecialidad(registrosFiltrados)}
                        </div>
                        <div style="position:relative; height:320px; margin-top:10px;">
                            <canvas id="chartSuspensionEspecialidad"></canvas>
                        </div>
                    </div>

                    <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px;">
                        <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:8px;">📉 Índice de suspensión Cmay</div>
                        <div style="position:relative; height:320px; margin-top:10px;">
                            <canvas id="chartIndicesSuspension"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div id="estadisticasPagina0Causales" style="margin-top:20px;">
                <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:8px;">📋 Causales de Suspensión</div>
                <div id="estadisticasTablaCausalesContainer">
                    ${renderTablaCausalesSuspension(kpis.registrosSuspendidos)}
                </div>
            </div>
        </div>
        </div>

        <div class="estadisticas-pagina" id="estadisticasPagina_1">
        <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:20px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; color:#0b2a4f;">
                🏥 REM (Cmay) / Especialidades Quirúrgicas
            </div>
            <div id="estadisticasRemContainer"></div>
        </div>
        </div>

        <div class="estadisticas-pagina" id="estadisticasPagina_2">
        <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:20px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; color:#0b2a4f;">
                📈 Comportamiento de Producción por Especialidad (Cmay)
            </div>
            <div id="estadisticasProdEspContainer"></div>
        </div>
        </div>

        <div class="estadisticas-pagina" id="estadisticasPagina_3">
        <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:20px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; color:#0b2a4f;">
                🚶 Proceso Ambulatorio
            </div>
            <div id="estadisticasAmbContainer"></div>
        </div>
        </div>

        <div class="estadisticas-pagina" id="estadisticasPagina_4">
        <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:20px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; color:#0b2a4f;">
                🏨 Ocupación y Rendimiento Pabellón
            </div>
            <div id="estadisticasOcupContainer"></div>
        </div>
        </div>

        <div class="estadisticas-pagina" id="estadisticasPagina_5">
        <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:20px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; color:#0b2a4f;">
                🩺 Tiempos por Intervención
            </div>
            <div id="estadisticasIntervContainer"></div>
        </div>
        </div>

        <div class="estadisticas-pagina" id="estadisticasPagina_6">
        <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:20px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; color:#0b2a4f;">
                🤰 Perianalgesia (Parto) por Mes
            </div>
            <div id="estadisticasPerianalgesiaContainer"></div>
        </div>
        </div>

        <div class="estadisticas-pagina" id="estadisticasPagina_7">
        <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:20px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; color:#0b2a4f;">
                🎯 Cumplimiento de Metas
            </div>
            <div id="estadisticasMetasContainer"></div>
        </div>
        </div>

        <div class="estadisticas-pagina" id="estadisticasPagina_8">
        <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:20px;">
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; color:#0b2a4f;">
                ⏱️ Horarios de Entrada/Salida AM/PM
            </div>
            <div id="estadisticasHorariosContainer"></div>
        </div>
        </div>
    `;

    inicializarFiltroFechaGlobalEstadisticas();
    inicializarTablaCausalesSuspension(kpis.registrosSuspendidos);
    inicializarFiltrosChartEspecialidad(registrosFiltrados);
    dibujarChartEspecialidad(registrosFiltrados);
    dibujarChartIndicesSuspension(kpis);

    renderEstadisticasRem();
    renderEstadisticasProdEsp();
    renderEstadisticasAmb();
    renderEstadisticasOcup();
    renderEstadisticasIntervenciones();
    renderEstadisticasPerianalgesia();
    renderEstadisticasMetas();
    renderEstadisticasHorarios();

    inicializarNavegacionPaginasEstadisticas();
    mostrarPaginaEstadisticas(estadisticasPaginaActual);
}

// =============================================================
// 📅 FILTRO GLOBAL DE FECHA
// =============================================================
function renderFiltroFechaGlobalEstadisticas() {
    return `
        <div style="background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; padding:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span style="font-size:0.8rem; font-weight:600; color:#64748b;">📅 Rango de Fechas</span>
            <input type="date" id="estadisticasFechaInicio" value="${estadisticasFiltroFechaInicio}" style="padding:5px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem;">
            <span style="font-size:0.75rem; color:#94a3b8;">a</span>
            <input type="date" id="estadisticasFechaFin" value="${estadisticasFiltroFechaFin}" style="padding:5px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem;">
            <button id="estadisticasLimpiarFecha" style="background:#e2e8f0; border:none; padding:6px 14px; border-radius:30px; font-size:0.7rem; font-weight:500; cursor:pointer; color:#475569;">🗑️ Limpiar</button>
        </div>
    `;
}

function inicializarFiltroFechaGlobalEstadisticas() {
    document.getElementById('estadisticasFechaInicio')?.addEventListener('change', function() {
        estadisticasFiltroFechaInicio = this.value || '';
        renderEstadisticas();
    });
    document.getElementById('estadisticasFechaFin')?.addEventListener('change', function() {
        estadisticasFiltroFechaFin = this.value || '';
        renderEstadisticas();
    });
    document.getElementById('estadisticasLimpiarFecha')?.addEventListener('click', function() {
        estadisticasFiltroFechaInicio = '';
        estadisticasFiltroFechaFin = '';
        renderEstadisticas();
    });
}

// =============================================================
// 🧮 GRID DE TARJETAS KPI
// =============================================================
function renderKpiCardEstadisticas(icono, etiqueta, valor, colores) {
    return `
        <div style="background:${colores.fondo}; border-radius:16px; padding:16px; text-align:center; border:1px solid ${colores.borde};">
            <div style="font-size:0.75rem; font-weight:600; color:${colores.texto}; margin-bottom:6px;">${icono} ${etiqueta}</div>
            <div style="font-size:1.9rem; font-weight:800; color:${colores.valor};">${valor}</div>
        </div>
    `;
}

function renderKpiGridEstadisticas(kpis) {
    const azul = { fondo: '#eef4ff', borde: '#c7d9f7', texto: '#1d4c8f', valor: '#0b2a4f' };
    const verde = { fondo: '#eafaf1', borde: '#bfe8cf', texto: '#166a3f', valor: '#0f8a4c' };
    const ambar = { fondo: '#fff8e6', borde: '#f5dfa0', texto: '#8a6300', valor: '#b8860b' };
    const rojo = { fondo: '#fdecec', borde: '#f5c2c2', texto: '#8a1f1f', valor: '#c0392b' };
    const teal = { fondo: '#e7f7f7', borde: '#bfe6e6', texto: '#0f5f5f', valor: '#0e7c7c' };
    const naranjo = { fondo: '#fff1e6', borde: '#f7d3ad', texto: '#8a4b00', valor: '#d2691e' };

    const fmtPct = (v) => v.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

    return `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
            ${renderKpiCardEstadisticas('📋', 'Total Pac. Programados', kpis.totalProgramados, azul)}
            ${renderKpiCardEstadisticas('📋', 'Pac. Programados Cmay', kpis.progCmay, azul)}
            ${renderKpiCardEstadisticas('➕', 'Total Pac. Agregados', kpis.totalAgregados, verde)}
            ${renderKpiCardEstadisticas('✅', 'Total Pac. Cond. Operados', kpis.totalCondOperados, verde)}
            ${renderKpiCardEstadisticas('⏸️', 'Total Pac. Cond. No Operados', kpis.totalCondNoOperados, ambar)}
            ${renderKpiCardEstadisticas('🚨', 'Total Pac. Urgencia', kpis.totalUrgencia, naranjo)}
            ${renderKpiCardEstadisticas('🏥', 'Total Pac. Operados', kpis.totalOperados, verde)}
            ${renderKpiCardEstadisticas('⛔', 'Total Pac. Suspendidos', kpis.totalSuspendidos, rojo)}
            ${renderKpiCardEstadisticas('⛔', 'Total Pac. Suspendidos Cmay', kpis.suspCmay, rojo)}
            ${renderKpiCardEstadisticas('📉', 'Índice de Suspensión', fmtPct(kpis.indiceSuspension), teal)}
            ${renderKpiCardEstadisticas('🚶', 'Índice de Ambulatorización', fmtPct(kpis.indiceAmbulatorizacion), teal)}
        </div>
    `;
}

// =============================================================
// 📋 TABLA DE CAUSALES DE SUSPENSIÓN (con filtros por columna)
// =============================================================
function agruparCausalesSuspension(registrosSuspendidos) {
    const grupos = {};
    registrosSuspendidos.forEach(r => {
        const causal = r.Causal_de_suspension || 'Sin causal';
        const motivo = r.Motivo || 'Sin motivo';
        const tipoActividad = r.Tipo_Actividad || r.Tipo_Actividad_2 || r.Tipo_Actividad_3 || 'Sin tipo';
        const clave = causal + '|' + motivo + '|' + tipoActividad;

        if (!grupos[clave]) {
            grupos[clave] = {
                causal, motivo, tipoActividad,
                cantidad: 0,
                observaciones: new Set()
            };
        }
        grupos[clave].cantidad++;
        if (r.Observaciones && r.Observaciones.trim() !== '') {
            grupos[clave].observaciones.add(r.Observaciones.trim());
        }
    });

    return Object.values(grupos).map(g => ({
        causal: g.causal,
        motivo: g.motivo,
        tipoActividad: g.tipoActividad,
        cantidad: g.cantidad,
        observaciones: Array.from(g.observaciones).join('; ')
    }));
}

function aplicarFiltrosColumnaCausales(filas) {
    return filas.filter(f => {
        if (estadisticasFiltrosColumnaCausales.Causal_de_suspension.size > 0 &&
            !estadisticasFiltrosColumnaCausales.Causal_de_suspension.has(f.causal)) return false;
        if (estadisticasFiltrosColumnaCausales.Motivo.size > 0 &&
            !estadisticasFiltrosColumnaCausales.Motivo.has(f.motivo)) return false;
        if (estadisticasFiltrosColumnaCausales.Tipo_Actividad.size > 0 &&
            !estadisticasFiltrosColumnaCausales.Tipo_Actividad.has(f.tipoActividad)) return false;
        if (estadisticasFiltrosColumnaCausales.Observaciones.size > 0 &&
            !estadisticasFiltrosColumnaCausales.Observaciones.has(f.observaciones)) return false;
        return true;
    });
}

function renderTablaCausalesSuspension(registrosSuspendidos) {
    const filasCompletas = agruparCausalesSuspension(registrosSuspendidos);
    const filas = aplicarFiltrosColumnaCausales(filasCompletas);
    const totalCantidad = filas.reduce((acc, f) => acc + f.cantidad, 0);

    const columnas = [
        { campo: 'causal', claveFiltro: 'Causal_de_suspension', label: 'Causal de Suspensión' },
        { campo: 'motivo', claveFiltro: 'Motivo', label: 'Motivo' },
        { campo: 'tipoActividad', claveFiltro: 'Tipo_Actividad', label: 'Tipo de Actividad' }
    ];

    let html = `
        <div class="stats-table-wrap">
            <table style="width:100%;">
                <thead>
                    <tr>
                        ${columnas.map(c => `
                            <th style="position:relative;">
                                <span>${c.label}</span>
                                ${renderBotonFiltroColumna(c.claveFiltro)}
                            </th>
                        `).join('')}
                        <th>Cantidad</th>
                        <th style="position:relative;">
                            <span>Observaciones</span>
                            ${renderBotonFiltroColumna('Observaciones')}
                        </th>
                    </tr>
                </thead>
                <tbody id="estadisticasCausalesTbody">
    `;

    if (filas.length === 0) {
        html += `<tr><td colspan="5" style="text-align:center; padding:24px; color:#94a3b8;">No hay casos suspendidos que coincidan con los filtros.</td></tr>`;
    } else {
        filas.forEach(f => {
            html += `
                <tr>
                    <td>${f.causal}</td>
                    <td>${f.motivo}</td>
                    <td>${f.tipoActividad}</td>
                    <td style="text-align:center; font-weight:700;">${f.cantidad}</td>
                    <td style="white-space:normal; word-break:break-word;">${f.observaciones || '—'}</td>
                </tr>
            `;
        });
        html += `
            <tr style="font-weight:700; background:#f1f5f9;">
                <td colspan="3">Total</td>
                <td style="text-align:center;">${totalCantidad}</td>
                <td></td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

// -------------------------------------------------------------
// 🔽 Componente de filtro de columna (multi-selección tipo Excel)
// -------------------------------------------------------------
function renderBotonFiltroColumna(claveFiltro) {
    const activo = estadisticasFiltrosColumnaCausales[claveFiltro].size > 0;
    return `
        <button class="btn-col-filter" data-clave="${claveFiltro}" title="Filtrar" style="background:transparent; border:none; cursor:pointer; margin-left:6px; font-size:0.75rem; color:${activo ? '#2563eb' : '#94a3b8'};">🔽</button>
    `;
}

function obtenerValoresUnicosOrdenados(valoresCrudos) {
    return Array.from(new Set(valoresCrudos.filter(v => v !== undefined && v !== null && v !== ''))).sort();
}

function inicializarTablaCausalesSuspension(registrosSuspendidos) {
    document.querySelectorAll('#estadisticasTablaCausalesContainer .btn-col-filter').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const clave = this.dataset.clave;
            const filasCompletas = agruparCausalesSuspension(registrosSuspendidos);

            let valoresCrudos = [];
            if (clave === 'Causal_de_suspension') valoresCrudos = filasCompletas.map(f => f.causal);
            else if (clave === 'Motivo') valoresCrudos = filasCompletas.map(f => f.motivo);
            else if (clave === 'Tipo_Actividad') valoresCrudos = filasCompletas.map(f => f.tipoActividad);
            else if (clave === 'Observaciones') valoresCrudos = filasCompletas.map(f => f.observaciones).filter(v => v && v !== '');

            const valoresUnicos = obtenerValoresUnicosOrdenados(valoresCrudos);
            abrirPanelFiltroColumna(this, clave, valoresUnicos, registrosSuspendidos);
        });
    });
}

function abrirPanelFiltroColumna(botonRef, claveFiltro, valoresUnicos, registrosSuspendidos) {
    document.getElementById('estadisticasColFilterPanel')?.remove();

    const seleccionActual = estadisticasFiltrosColumnaCausales[claveFiltro];
    const rect = botonRef.getBoundingClientRect();

    const panel = document.createElement('div');
    panel.id = 'estadisticasColFilterPanel';
    panel.style.cssText = `
        position:fixed; top:${rect.bottom + 4}px; left:${Math.max(8, rect.left - 200)}px;
        width:260px; max-height:320px; background:white; border:1px solid #d1d9e6; border-radius:8px;
        box-shadow:0 8px 24px rgba(0,0,0,0.18); z-index:10001; padding:10px; display:flex; flex-direction:column; gap:8px;
    `;

    panel.innerHTML = `
        <input type="text" id="estadisticasColFilterSearch" placeholder="🔎 Buscar..." style="width:100%; padding:5px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.8rem; box-sizing:border-box;">
        <div style="display:flex; gap:6px;">
            <button id="estadisticasColFilterAll" style="flex:1; font-size:0.7rem; padding:4px; border:1px solid #d1d9e6; background:#f8fafc; border-radius:4px; cursor:pointer;">Seleccionar todo</button>
            <button id="estadisticasColFilterNone" style="flex:1; font-size:0.7rem; padding:4px; border:1px solid #d1d9e6; background:#f8fafc; border-radius:4px; cursor:pointer;">Limpiar</button>
        </div>
        <div id="estadisticasColFilterOptions" style="overflow-y:auto; max-height:200px; display:flex; flex-direction:column; gap:4px;">
            ${valoresUnicos.map(v => `
                <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; color:#334155; cursor:pointer;">
                    <input type="checkbox" class="estadisticasColFilterCheckbox" value="${v.replace(/"/g, '&quot;')}" ${seleccionActual.size === 0 || seleccionActual.has(v) ? 'checked' : ''}>
                    <span style="word-break:break-word;">${v}</span>
                </label>
            `).join('')}
        </div>
    `;

    document.body.appendChild(panel);

    function aplicarSeleccion() {
        const checkboxes = panel.querySelectorAll('.estadisticasColFilterCheckbox');
        const marcados = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (marcados.length === checkboxes.length) {
            estadisticasFiltrosColumnaCausales[claveFiltro] = new Set();
        } else {
            estadisticasFiltrosColumnaCausales[claveFiltro] = new Set(marcados);
        }
        const tbody = document.getElementById('estadisticasCausalesTbody');
        if (tbody) {
            const containerHTML = renderTablaCausalesSuspension(registrosSuspendidos);
            document.getElementById('estadisticasTablaCausalesContainer').innerHTML = containerHTML;
            inicializarTablaCausalesSuspension(registrosSuspendidos);
        }
    }

    panel.querySelectorAll('.estadisticasColFilterCheckbox').forEach(cb => {
        cb.addEventListener('change', aplicarSeleccion);
    });

    panel.querySelector('#estadisticasColFilterAll').addEventListener('click', function() {
        panel.querySelectorAll('.estadisticasColFilterCheckbox').forEach(cb => cb.checked = true);
        aplicarSeleccion();
    });

    panel.querySelector('#estadisticasColFilterNone').addEventListener('click', function() {
        panel.querySelectorAll('.estadisticasColFilterCheckbox').forEach(cb => cb.checked = false);
        aplicarSeleccion();
    });

    panel.querySelector('#estadisticasColFilterSearch').addEventListener('input', function() {
        const filtro = this.value.toLowerCase().trim();
        panel.querySelectorAll('#estadisticasColFilterOptions label').forEach(label => {
            const texto = label.textContent.toLowerCase();
            label.style.display = texto.includes(filtro) ? 'flex' : 'none';
        });
    });

    setTimeout(() => {
        document.addEventListener('click', cerrarPanelSiEsFueraDelClick);
    }, 0);

    function cerrarPanelSiEsFueraDelClick(e) {
        if (!panel.contains(e.target)) {
            panel.remove();
            document.removeEventListener('click', cerrarPanelSiEsFueraDelClick);
        }
    }
}

// =============================================================
// 🏥 GRÁFICO 1: DISTRIBUCIÓN DE SUSPENDIDOS POR ESPECIALIDAD
// =============================================================
function obtenerCasosSuspendidosParaChart(registrosFiltrados) {
    let casos = registrosFiltrados.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.SUSPENDIDO);

    if (estadisticasFiltroChart2.tipoActividad) {
        casos = casos.filter(r =>
            r.Tipo_Actividad === estadisticasFiltroChart2.tipoActividad ||
            r.Tipo_Actividad_2 === estadisticasFiltroChart2.tipoActividad ||
            r.Tipo_Actividad_3 === estadisticasFiltroChart2.tipoActividad
        );
    }
    if (estadisticasFiltroChart2.causal) {
        casos = casos.filter(r => r.Causal_de_suspension === estadisticasFiltroChart2.causal);
    }
    if (estadisticasFiltroChart2.motivo) {
        casos = casos.filter(r => r.Motivo === estadisticasFiltroChart2.motivo);
    }
    return casos;
}

function renderFiltrosChartEspecialidad(registrosFiltrados) {
    const suspendidos = registrosFiltrados.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.SUSPENDIDO);

    const tiposActividad = obtenerValoresUnicosOrdenados(
        suspendidos.flatMap(r => [r.Tipo_Actividad, r.Tipo_Actividad_2, r.Tipo_Actividad_3])
    );
    const causales = obtenerValoresUnicosOrdenados(suspendidos.map(r => r.Causal_de_suspension));

    let motivos = [];
    if (estadisticasFiltroChart2.causal) {
        motivos = obtenerValoresUnicosOrdenados(
            suspendidos.filter(r => r.Causal_de_suspension === estadisticasFiltroChart2.causal).map(r => r.Motivo)
        );
    } else {
        motivos = obtenerValoresUnicosOrdenados(suspendidos.map(r => r.Motivo));
    }

    const opt = (valores, seleccionado) => {
        let opts = `<option value="">Todas</option>`;
        valores.forEach(v => {
            opts += `<option value="${v}" ${v === seleccionado ? 'selected' : ''}>${v}</option>`;
        });
        return opts;
    };

    return `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px;">
            <div>
                <label style="font-size:0.7rem; font-weight:600; color:#64748b; display:block; margin-bottom:3px;">Tipo de Actividad</label>
                <select id="estadisticasChart1FiltroTipo" class="filtro-select" style="width:100%; padding:5px 6px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem; background:white;">
                    ${opt(tiposActividad, estadisticasFiltroChart2.tipoActividad)}
                </select>
            </div>
            <div>
                <label style="font-size:0.7rem; font-weight:600; color:#64748b; display:block; margin-bottom:3px;">Causal de Suspensión</label>
                <select id="estadisticasChart1FiltroCausal" class="filtro-select" style="width:100%; padding:5px 6px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem; background:white;">
                    ${opt(causales, estadisticasFiltroChart2.causal)}
                </select>
            </div>
            <div>
                <label style="font-size:0.7rem; font-weight:600; color:#64748b; display:block; margin-bottom:3px;">Motivo</label>
                <select id="estadisticasChart1FiltroMotivo" class="filtro-select" style="width:100%; padding:5px 6px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem; background:white;">
                    ${opt(motivos, estadisticasFiltroChart2.motivo)}
                </select>
            </div>
        </div>
    `;
}

function inicializarFiltrosChartEspecialidad(registrosFiltrados) {
    document.getElementById('estadisticasChart1FiltroTipo')?.addEventListener('change', function() {
        estadisticasFiltroChart2.tipoActividad = this.value || '';
        dibujarChartEspecialidad(registrosFiltrados);
    });
    document.getElementById('estadisticasChart1FiltroCausal')?.addEventListener('change', function() {
        estadisticasFiltroChart2.causal = this.value || '';
        estadisticasFiltroChart2.motivo = '';
        document.getElementById('estadisticasChart1FiltrosContainer').innerHTML = renderFiltrosChartEspecialidad(registrosFiltrados);
        inicializarFiltrosChartEspecialidad(registrosFiltrados);
        dibujarChartEspecialidad(registrosFiltrados);
    });
    document.getElementById('estadisticasChart1FiltroMotivo')?.addEventListener('change', function() {
        estadisticasFiltroChart2.motivo = this.value || '';
        dibujarChartEspecialidad(registrosFiltrados);
    });
}

function dibujarChartEspecialidad(registrosFiltrados) {
    const canvas = document.getElementById('chartSuspensionEspecialidad');
    if (!canvas || typeof Chart === 'undefined') return;

    const casos = obtenerCasosSuspendidosParaChart(registrosFiltrados);
    const conteoPorEspecialidad = {};
    casos.forEach(c => {
        const esp = c.Especialidad || 'Sin especialidad';
        conteoPorEspecialidad[esp] = (conteoPorEspecialidad[esp] || 0) + 1;
    });

    const labels = Object.keys(conteoPorEspecialidad).sort();
    const valores = labels.map(l => conteoPorEspecialidad[l]);

    if (estadisticasChartEspecialidad) {
        estadisticasChartEspecialidad.destroy();
    }

    estadisticasChartEspecialidad = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Casos suspendidos',
                data: valores,
                backgroundColor: '#1a6d8a',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 22 } },
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

// =============================================================
// 📉 GRÁFICO 2: ÍNDICE DE SUSPENSIÓN (3 COLUMNAS)
// =============================================================
function dibujarChartIndicesSuspension(kpis) {
    const canvas = document.getElementById('chartIndicesSuspension');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = ['N° Susp. Cmay', 'Índice Suspensión (%)', 'Índice Suspensión sin Urgencia (%)'];
    const valores = [kpis.suspCmay, kpis.indiceSuspension, kpis.indiceSuspensionSinUrgencia];
    const textos = [
        String(kpis.suspCmay),
        valores[1].toFixed(1) + '%',
        valores[2].toFixed(1) + '%'
    ];

    if (estadisticasChartIndices) {
        estadisticasChartIndices.destroy();
    }

    estadisticasChartIndices = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                labelsTexto: textos,
                backgroundColor: ['#c0392b', '#0e7c7c', '#1a6d8a'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 22 } },
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// =============================================================
// 🏥 PARTE 2: REM (Cmay) / ESPECIALIDADES QUIRÚRGICAS
// =============================================================
function estadisticasObtenerAnioMasReciente(registros) {
    let anioMax = null;
    registros.forEach(r => {
        const f = normalizarFechaComparable(r.FECHA);
        if (!f) return;
        const anio = parseInt(f.slice(0, 4), 10);
        if (!isNaN(anio) && (anioMax === null || anio > anioMax)) anioMax = anio;
    });
    return anioMax || new Date().getFullYear();
}

// Cuenta, entre las 3 intervenciones (Tipo_Actividad/2/3) de cada fila,
// cuántas son Cmay/Cmen/Proc — cada intervención cuenta por separado.
function contarTiposActividadRem(registros) {
    let cmay = 0, cmen = 0, proc = 0;
    registros.forEach(r => {
        [r.Tipo_Actividad, r.Tipo_Actividad_2, r.Tipo_Actividad_3].forEach(tipo => {
            if (tipo === 'Cmay') cmay++;
            else if (tipo === 'Cmen') cmen++;
            else if (tipo === 'Proc') proc++;
        });
    });
    return { cmay, cmen, proc, total: cmay + cmen + proc };
}

function contarCmayPorEdadRem(registros) {
    let mayores = 0, menores = 0;
    registros.forEach(r => {
        const edad = parseInt(r.Edad, 10);
        if (isNaN(edad)) return;
        [r.Tipo_Actividad, r.Tipo_Actividad_2, r.Tipo_Actividad_3].forEach(tipo => {
            if (tipo !== 'Cmay') return;
            if (edad >= 15) mayores++; else menores++;
        });
    });
    return { mayores, menores };
}

function filtrarRegistrosRem(registros) {
    let out = filtrarRegistrosPorFechaEstadisticas(registros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin);
    if (estadisticasRemFiltroEspecialidades.size > 0) {
        out = out.filter(r => estadisticasRemFiltroEspecialidades.has(r.Especialidad));
    }
    if (estadisticasRemFiltroDestino) {
        out = out.filter(r => r.DESTINO === estadisticasRemFiltroDestino);
    }
    return out;
}

function calcularKpisRem(registrosFiltrados) {
    const registrosGeneral = registrosFiltrados.filter(r => !REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx));
    const totales = contarTiposActividadRem(registrosGeneral);
    const edad = contarCmayPorEdadRem(registrosGeneral);

    const registrosUrgencia = registrosFiltrados.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.URGENCIA);
    const urgencia = contarTiposActividadRem(registrosUrgencia);

    return { totales, edad, urgencia };
}

// -------------------------------------------------------------
// 🖼️ Render
// -------------------------------------------------------------
function renderEstadisticasRem() {
    const container = document.getElementById('estadisticasRemContainer');
    if (!container) return;

    const registrosBaseFiltro = filtrarRegistrosRem(estadisticasRegistros);
    const kpis = calcularKpisRem(registrosBaseFiltro);

    const registrosParaAnual = estadisticasRegistros.filter(r => {
        if (estadisticasRemFiltroEspecialidades.size > 0 && !estadisticasRemFiltroEspecialidades.has(r.Especialidad)) return false;
        if (estadisticasRemFiltroDestino && r.DESTINO !== estadisticasRemFiltroDestino) return false;
        return true;
    });

    container.innerHTML = `
        <div id="estadisticasRemFiltrosContainer">
            ${renderFiltrosRem(estadisticasRegistros)}
        </div>
        <div id="estadisticasRemKpiContainer">
            ${renderKpiGridRem(kpis)}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:20px;">
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px;">
                <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:8px;">📊 Distribución % (Cmay / Cmen / Proc)</div>
                <div style="position:relative; height:280px; margin-top:10px;">
                    <canvas id="chartRemDistribucion"></canvas>
                </div>
            </div>
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px;">
                <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:8px;">📈 Producción General Anualizada ${estadisticasRemFiltroAnio || ''}</div>
                <div style="position:relative; height:280px; margin-top:10px;">
                    <canvas id="chartRemAnual"></canvas>
                </div>
            </div>
        </div>
    `;

    inicializarFiltrosRem();
    dibujarChartRemDistribucion(kpis.totales);
    dibujarChartRemAnual(registrosParaAnual);
}

function estiloBotonEspRem(activo) {
    return `padding:6px 14px; border-radius:20px; border:1px solid ${activo ? '#0b2a4f' : '#d1d9e6'}; background:${activo ? '#0b2a4f' : 'white'}; color:${activo ? 'white' : '#334155'}; font-size:0.75rem; cursor:pointer; font-weight:600;`;
}

function renderFiltrosRem(registros) {
    const especialidades = obtenerValoresUnicosOrdenados(registros.map(r => r.Especialidad));
    const destinos = obtenerValoresUnicosOrdenados(registros.map(r => r.DESTINO));
    const anios = obtenerValoresUnicosOrdenados(
        registros.map(r => {
            const f = normalizarFechaComparable(r.FECHA);
            return f ? f.slice(0, 4) : '';
        })
    );

    return `
        <div style="background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; padding:12px; margin-bottom:16px;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
                <span style="font-size:0.8rem; font-weight:600; color:#64748b;">🏥 Destino</span>
                <select id="estadisticasRemFiltroDestino" style="padding:5px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem;">
                    <option value="">Todas</option>
                    ${destinos.map(d => `<option value="${d}" ${d === estadisticasRemFiltroDestino ? 'selected' : ''}>${d}</option>`).join('')}
                </select>

                <span style="font-size:0.8rem; font-weight:600; color:#64748b; margin-left:10px;">📈 Año (Prod. Anualizada)</span>
                <select id="estadisticasRemFiltroAnio" style="padding:5px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem;">
                    ${anios.map(a => `<option value="${a}" ${String(estadisticasRemFiltroAnio) === a ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
            </div>
            <div>
                <div style="font-size:0.75rem; font-weight:600; color:#64748b; margin-bottom:6px;">Especialidad</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                    <button class="estadisticasRemEspBtn" data-esp="__todas__" style="${estiloBotonEspRem(estadisticasRemFiltroEspecialidades.size === 0)}">Seleccionar todo</button>
                    ${especialidades.map(esp => `
                        <button class="estadisticasRemEspBtn" data-esp="${esp}" style="${estiloBotonEspRem(estadisticasRemFiltroEspecialidades.has(esp))}">${esp}</button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function inicializarFiltrosRem() {
    document.getElementById('estadisticasRemFiltroDestino')?.addEventListener('change', function() {
        estadisticasRemFiltroDestino = this.value || '';
        renderEstadisticasRem();
    });
    document.getElementById('estadisticasRemFiltroAnio')?.addEventListener('change', function() {
        estadisticasRemFiltroAnio = parseInt(this.value, 10);
        renderEstadisticasRem();
    });
    document.querySelectorAll('.estadisticasRemEspBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            const esp = this.dataset.esp;
            if (esp === '__todas__') {
                estadisticasRemFiltroEspecialidades = new Set();
            } else if (estadisticasRemFiltroEspecialidades.has(esp)) {
                estadisticasRemFiltroEspecialidades.delete(esp);
            } else {
                estadisticasRemFiltroEspecialidades.add(esp);
            }
            renderEstadisticasRem();
        });
    });
}

function renderKpiGridRem(kpis) {
    const azul = { fondo: '#eef4ff', borde: '#c7d9f7', texto: '#1d4c8f', valor: '#0b2a4f' };
    const teal = { fondo: '#e7f7f7', borde: '#bfe6e6', texto: '#0f5f5f', valor: '#0e7c7c' };

    return `
        <div style="display:grid; grid-template-columns:2fr 1fr; gap:16px;">
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px;">
                <div style="font-weight:700; font-size:0.9rem; color:#1e293b; margin-bottom:10px;">TOTAL CX</div>
                <div class="stats-table-wrap" style="max-height:none; overflow-x:hidden;">
                    <table style="width:100%; min-width:0; table-layout:fixed;">
                        <thead><tr><th>Cmay</th><th>Cmen</th><th>Proc</th></tr></thead>
                        <tbody>
                            <tr>
                                <td style="text-align:center; font-weight:700;">${kpis.totales.cmay}</td>
                                <td style="text-align:center; font-weight:700;">${kpis.totales.cmen}</td>
                                <td style="text-align:center; font-weight:700;">${kpis.totales.proc}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            ${renderKpiCardEstadisticas('🏥', 'TOTAL CX', kpis.totales.total, azul)}
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:12px; margin-top:12px;">
            ${renderKpiCardEstadisticas('👤', 'Cmay ≥15 años', kpis.edad.mayores, teal)}
            ${renderKpiCardEstadisticas('🧒', 'Cmay <15 años', kpis.edad.menores, teal)}
        </div>

        <div style="margin-top:16px;">
            <div style="font-weight:700; font-size:0.9rem; color:#1e293b; margin-bottom:8px;">🚨 Desglose de Urgencias (Cmay / Cmen / Proc)</div>
            <div class="stats-table-wrap" style="max-height:none; overflow-x:hidden;">
                <table style="width:100%; min-width:0; table-layout:fixed;">
                    <thead><tr><th>Cmay</th><th>Cmen</th><th>Proc</th><th>Total</th></tr></thead>
                    <tbody>
                        <tr>
                            <td style="text-align:center; font-weight:700;">${kpis.urgencia.cmay}</td>
                            <td style="text-align:center; font-weight:700;">${kpis.urgencia.cmen}</td>
                            <td style="text-align:center; font-weight:700;">${kpis.urgencia.proc}</td>
                            <td style="text-align:center; font-weight:700; background:#fff1e6;">${kpis.urgencia.total}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// 📊 Gráfico: Distribución % (Cmay/Cmen/Proc) — barras horizontales
// -------------------------------------------------------------
function dibujarChartRemDistribucion(totales) {
    const canvas = document.getElementById('chartRemDistribucion');
    if (!canvas || typeof Chart === 'undefined') return;

    const pct = (v) => estadisticasDivide(v, totales.total);
    const labels = ['Cmay', 'Cmen', 'Proc'];
    const valores = [pct(totales.cmay), pct(totales.cmen), pct(totales.proc)];
    const textos = valores.map(v => v.toFixed(1) + '%');

    if (estadisticasChartRemDistribucion) {
        estadisticasChartRemDistribucion.destroy();
    }

    estadisticasChartRemDistribucion = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                labelsTexto: textos,
                backgroundColor: ['#1a6d8a', '#0e7c7c', '#d2691e'],
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 45 } },
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } }
            }
        }
    });
}

// -------------------------------------------------------------
// 📈 Gráfico: Producción General Anualizada (línea, por mes)
// -------------------------------------------------------------
function dibujarChartRemAnual(registrosParaAnual) {
    const canvas = document.getElementById('chartRemAnual');
    if (!canvas || typeof Chart === 'undefined') return;

    const anio = estadisticasRemFiltroAnio;
    const meses = Array.from({ length: 12 }, () => ({ cmay: 0, cmen: 0, proc: 0 }));

    registrosParaAnual.forEach(r => {
        if (REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx)) return;
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm) return;
        const [y, m] = fechaNorm.split('-');
        if (parseInt(y, 10) !== anio) return;
        const idx = parseInt(m, 10) - 1;
        if (idx < 0 || idx > 11) return;

        [r.Tipo_Actividad, r.Tipo_Actividad_2, r.Tipo_Actividad_3].forEach(tipo => {
            if (tipo === 'Cmay') meses[idx].cmay++;
            else if (tipo === 'Cmen') meses[idx].cmen++;
            else if (tipo === 'Proc') meses[idx].proc++;
        });
    });

    const labelsMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    if (estadisticasChartRemAnual) {
        estadisticasChartRemAnual.destroy();
    }

    estadisticasChartRemAnual = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labelsMeses,
            datasets: [
                { label: 'Cmay', data: meses.map(m => m.cmay), borderColor: '#1a6d8a', backgroundColor: '#1a6d8a', tension: 0.3 },
                { label: 'Cmen', data: meses.map(m => m.cmen), borderColor: '#0e7c7c', backgroundColor: '#0e7c7c', tension: 0.3 },
                { label: 'Proc', data: meses.map(m => m.proc), borderColor: '#d2691e', backgroundColor: '#d2691e', tension: 0.3 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 18 } },
            plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

// =============================================================
// 📈 COMPORTAMIENTO DE PRODUCCIÓN POR ESPECIALIDAD (Cmay)
// =============================================================
const ESTADISTICAS_NOMBRES_MES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// -------------------------------------------------------------
// 🎨 Resaltado de mes actual / previo / posterior (según fecha del
// sistema), reutilizado por todas las tablas mensuales por especialidad.
// -------------------------------------------------------------
function estadisticasDesplazarMesKey(key, delta) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(y, (m - 1) + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function estadisticasObtenerMesActualKey() {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

const ESTADISTICAS_COLORES_MES = {
    previo: { fondo: '#fef3c7', texto: '#92400e', icono: '🟡' },
    actual: { fondo: '#dcfce7', texto: '#166534', icono: '🟢' },
    posterior: { fondo: '#dbeafe', texto: '#1e3a8a', icono: '🔵' }
};

function estadisticasClasificarMes(bucketKey) {
    const mesActual = estadisticasObtenerMesActualKey();
    if (bucketKey === mesActual) return 'actual';
    if (bucketKey === estadisticasDesplazarMesKey(mesActual, -1)) return 'previo';
    if (bucketKey === estadisticasDesplazarMesKey(mesActual, 1)) return 'posterior';
    return null;
}

function estadisticasEstiloFilaMes(bucketKey) {
    const clase = estadisticasClasificarMes(bucketKey);
    if (!clase) return { estilo: '', icono: '', clase: '' };
    const c = ESTADISTICAS_COLORES_MES[clase];
    return { estilo: `background:${c.fondo}; color:${c.texto}; font-weight:700;`, icono: ' ' + c.icono, clase };
}

// Centra el scroll vertical de cada tabla mensual (dentro del contenedor
// indicado) en la fila del mes actual (o previo/posterior si no hay actual
// en el rango), para no obligar a desplazarse manualmente para verla.
function estadisticasCentrarScrollMesActual(containerSelector) {
    document.querySelectorAll(`${containerSelector} .stats-table-wrap`).forEach(wrap => {
        const fila = wrap.querySelector('tr[data-mes-clase="actual"]')
            || wrap.querySelector('tr[data-mes-clase="previo"]')
            || wrap.querySelector('tr[data-mes-clase="posterior"]');
        if (!fila) return;
        const objetivo = fila.offsetTop - (wrap.clientHeight / 2) + (fila.clientHeight / 2);
        wrap.scrollTop = Math.max(0, objetivo);
    });
}

function renderLeyendaMeses() {
    const p = ESTADISTICAS_COLORES_MES.previo;
    const a = ESTADISTICAS_COLORES_MES.actual;
    const s = ESTADISTICAS_COLORES_MES.posterior;
    return `
        <span><span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:${p.fondo}; border:1px solid ${p.texto}; margin-right:4px;"></span>Mes previo</span>
        <span><span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:${a.fondo}; border:1px solid ${a.texto}; margin-right:4px;"></span>Mes actual</span>
        <span><span style="display:inline-block; width:10px; height:10px; border-radius:3px; background:${s.fondo}; border:1px solid ${s.texto}; margin-right:4px;"></span>Mes posterior</span>
    `;
}

// Devuelve el rango [1 de enero, último día del último mes CON DATOS] de
// ese año — así los gráficos "comportamiento anual" no muestran meses
// futuros vacíos (ej: si hoy hay datos hasta julio, no dibuja agosto-dic).
// Si el año no tiene ningún registro, devuelve un rango de 1 solo día.
function calcularRangoAnioConDatos(anio) {
    let ultimoMes = 0;
    estadisticasRegistros.forEach(r => {
        const f = normalizarFechaComparable(r.FECHA);
        if (!f) return;
        const [y, m] = f.split('-').map(Number);
        if (y === anio && m > ultimoMes) ultimoMes = m;
    });
    if (ultimoMes === 0) {
        return { inicio: `${anio}-01-01`, fin: `${anio}-01-01` };
    }
    const ultimoDia = new Date(anio, ultimoMes, 0).getDate();
    return {
        inicio: `${anio}-01-01`,
        fin: `${anio}-${String(ultimoMes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
    };
}

// Genera un bucket por cada mes entre fechaInicio y fechaFin (yyyy-mm-dd), inclusive.
function generarBucketsMensuales(fechaInicio, fechaFin) {
    const buckets = [];
    if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) return buckets;

    const [yInicio, mInicio] = fechaInicio.split('-').map(Number);
    const [yFin, mFin] = fechaFin.split('-').map(Number);
    const mismoAnio = yInicio === yFin;

    let y = yInicio;
    let m = mInicio;
    let guard = 0;
    while ((y < yFin || (y === yFin && m <= mFin)) && guard < 240) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const label = mismoAnio ? ESTADISTICAS_NOMBRES_MES[m - 1] : `${ESTADISTICAS_NOMBRES_MES[m - 1].slice(0, 3)} ${y}`;
        buckets.push({ key, label });
        m++;
        if (m > 12) { m = 1; y++; }
        guard++;
    }
    return buckets;
}

// registrosGeneral: ya excluye Suspendido/Urgencia/Condicional(No Operado)/Perianalgesia(Parto).
function calcularProduccionPorEspecialidad(registrosGeneral, fechaInicio, fechaFin) {
    const buckets = generarBucketsMensuales(fechaInicio, fechaFin);
    const indicePorClave = {};
    buckets.forEach((b, i) => { indicePorClave[b.key] = i; });

    const porEspecialidad = {};

    registrosGeneral.forEach(r => {
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm) return;
        if (fechaNorm < fechaInicio || fechaNorm > fechaFin) return;

        const idx = indicePorClave[fechaNorm.slice(0, 7)];
        if (idx === undefined) return;

        const esp = r.Especialidad || 'Sin especialidad';
        if (!porEspecialidad[esp]) {
            porEspecialidad[esp] = {
                pacientesCmay: new Array(buckets.length).fill(0),
                actividadesCmay: new Array(buckets.length).fill(0)
            };
        }

        if (filaEsCmay(r)) {
            porEspecialidad[esp].pacientesCmay[idx]++;
        }
        [r.Tipo_Actividad, r.Tipo_Actividad_2, r.Tipo_Actividad_3].forEach(tipo => {
            if (tipo === 'Cmay') porEspecialidad[esp].actividadesCmay[idx]++;
        });
    });

    return { buckets, porEspecialidad };
}

function renderEstadisticasProdEsp() {
    const container = document.getElementById('estadisticasProdEspContainer');
    if (!container) return;

    const registrosGeneral = estadisticasRegistros.filter(r => !REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx));
    const rangoAnio = calcularRangoAnioConDatos(estadisticasProdEspAnio);
    const { buckets, porEspecialidad } = calcularProduccionPorEspecialidad(
        registrosGeneral, rangoAnio.inicio, rangoAnio.fin
    );
    const especialidades = Object.keys(porEspecialidad).sort();
    const aniosDisponibles = obtenerValoresUnicosOrdenados(
        estadisticasRegistros.map(r => {
            const f = normalizarFechaComparable(r.FECHA);
            return f ? f.slice(0, 4) : '';
        })
    );

    container.innerHTML = `
        <div style="background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; padding:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
            <span style="font-size:0.8rem; font-weight:600; color:#64748b;">📅 Año</span>
            <select id="estadisticasProdEspFiltroAnio" style="padding:5px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem;">
                ${aniosDisponibles.map(a => `<option value="${a}" ${String(estadisticasProdEspAnio) === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
        </div>
        <div style="display:flex; gap:14px; align-items:center; margin-bottom:12px; font-size:0.75rem; color:#64748b; flex-wrap:wrap;">
            <span><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#1a6d8a; margin-right:4px;"></span>Pacientes Cmay</span>
            <span><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#d2691e; margin-right:4px;"></span>Tipos de Actividad Cmay</span>
            ${renderLeyendaMeses()}
        </div>
        <div id="estadisticasProdEspGrid" style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:16px;">
            ${especialidades.length === 0 ? `
                <p style="grid-column:1 / -1; text-align:center; color:#94a3b8; padding:24px;">No hay datos Cmay en el año seleccionado.</p>
            ` : especialidades.map((esp, idx) => `
                <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:12px;">
                    <div style="font-weight:700; font-size:0.8rem; color:#1e293b; margin-bottom:6px; text-transform:uppercase;">${esp}</div>
                    <div class="stats-grafico-especialidad" style="position:relative; height:200px;">
                        <canvas id="chartProdEsp_${idx}"></canvas>
                    </div>
                    <div class="stats-tabla-especialidad stats-table-wrap" style="max-height:170px; margin-top:10px; overflow-x:hidden; width:100%; box-sizing:border-box;">
                        <table style="width:100%; min-width:0; table-layout:fixed; font-size:0.75rem;">
                            <colgroup>
                                <col style="width:40%;">
                                <col style="width:30%;">
                                <col style="width:30%;">
                            </colgroup>
                            <thead>
                                <tr><th>Mes</th><th>Pac. Cmay</th><th>Act. Cmay</th></tr>
                            </thead>
                            <tbody>
                                ${buckets.map((b, i) => {
                                    const { estilo, icono, clase } = estadisticasEstiloFilaMes(b.key);
                                    return `
                                    <tr style="${estilo}" data-mes-clase="${clase}">
                                        <td style="white-space:normal; word-break:break-word; ${estilo}">${b.label}${icono}</td>
                                        <td style="text-align:center; ${estilo}">${porEspecialidad[esp].pacientesCmay[i]}</td>
                                        <td style="text-align:center; ${estilo}">${porEspecialidad[esp].actividadesCmay[i]}</td>
                                    </tr>
                                `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('estadisticasProdEspFiltroAnio')?.addEventListener('change', function() {
        estadisticasProdEspAnio = parseInt(this.value, 10);
        renderEstadisticasProdEsp();
    });

    dibujarChartsProdEsp(buckets, porEspecialidad, especialidades);
    estadisticasCentrarScrollMesActual('#estadisticasProdEspGrid');
}

function dibujarChartsProdEsp(buckets, porEspecialidad, especialidades) {
    estadisticasChartsProdEsp.forEach(c => c.destroy());
    estadisticasChartsProdEsp = [];

    if (typeof Chart === 'undefined') return;

    const labels = buckets.map(b => b.label);

    especialidades.forEach((esp, idx) => {
        const canvas = document.getElementById(`chartProdEsp_${idx}`);
        if (!canvas) return;

        const datos = porEspecialidad[esp];
        const chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Pacientes Cmay', data: datos.pacientesCmay, borderColor: '#1a6d8a', backgroundColor: '#1a6d8a', tension: 0.3 },
                    { label: 'Tipos de Actividad Cmay', data: datos.actividadesCmay, borderColor: '#d2691e', backgroundColor: '#d2691e', tension: 0.3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 18 } },
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
        estadisticasChartsProdEsp.push(chart);
    });
}

// =============================================================
// 🚶 PROCESO AMBULATORIO
// =============================================================
// Índice de Ambulatorización = CMA / Programados Cmay realmente operados
// (misma fórmula que el KPI de la Parte 1, ver calcularKPIsEstadisticas).
function calcularAmbulatorizacion(registros) {
    const programadoCmay = registros.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.PROGRAMADO && filaEsCmay(r));
    const cma = programadoCmay.filter(r => r.DESTINO === 'CMA');
    return {
        denominador: programadoCmay.length,
        numerador: cma.length,
        indice: estadisticasDivide(cma.length, programadoCmay.length)
    };
}

function calcularAmbulatorizacionPorEspecialidad(registros, fechaInicio, fechaFin) {
    const buckets = generarBucketsMensuales(fechaInicio, fechaFin);
    const indicePorClave = {};
    buckets.forEach((b, i) => { indicePorClave[b.key] = i; });

    const porEspecialidad = {};

    registros.forEach(r => {
        if (r.ESTADO_DE_IQx !== ESTADISTICAS_ESTADO.PROGRAMADO || !filaEsCmay(r)) return;

        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm) return;
        if (fechaNorm < fechaInicio || fechaNorm > fechaFin) return;

        const idx = indicePorClave[fechaNorm.slice(0, 7)];
        if (idx === undefined) return;

        const esp = r.Especialidad || 'Sin especialidad';
        if (!porEspecialidad[esp]) {
            porEspecialidad[esp] = {
                denominador: new Array(buckets.length).fill(0),
                numerador: new Array(buckets.length).fill(0)
            };
        }

        porEspecialidad[esp].denominador[idx]++;
        if (r.DESTINO === 'CMA') porEspecialidad[esp].numerador[idx]++;
    });

    return { buckets, porEspecialidad };
}

function renderEstadisticasAmb() {
    const container = document.getElementById('estadisticasAmbContainer');
    if (!container) return;

    const registrosFiltrados = filtrarRegistrosPorFechaEstadisticas(
        estadisticasRegistros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin
    );
    const general = calcularAmbulatorizacion(registrosFiltrados);

    // Ranking: sigue el filtro de fecha general.
    const { porEspecialidad: porEspecialidadRanking } = calcularAmbulatorizacionPorEspecialidad(
        estadisticasRegistros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin
    );
    const especialidadesRanking = Object.keys(porEspecialidadRanking).sort();

    // Desglose mensual: comportamiento ANUAL (enero al último mes con datos),
    // con su propio selector de Año, independiente del filtro general.
    const rangoAnio = calcularRangoAnioConDatos(estadisticasAmbAnio);
    const { buckets, porEspecialidad } = calcularAmbulatorizacionPorEspecialidad(
        estadisticasRegistros, rangoAnio.inicio, rangoAnio.fin
    );
    const especialidades = Object.keys(porEspecialidad).sort();
    const aniosDisponibles = obtenerValoresUnicosOrdenados(
        estadisticasRegistros.map(r => {
            const f = normalizarFechaComparable(r.FECHA);
            return f ? f.slice(0, 4) : '';
        })
    );

    const teal = { fondo: '#e7f7f7', borde: '#bfe6e6', texto: '#0f5f5f', valor: '#0e7c7c' };
    const fmtPct = (v) => v.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

    container.innerHTML = `
        <div id="estadisticasAmbRankingWrap" style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px; margin-bottom:20px;">
            <div style="max-width:260px; margin-bottom:16px;">
                ${renderKpiCardEstadisticas('🚶', 'Índice de Ambulatorización General', fmtPct(general.indice), teal)}
            </div>
            <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:8px;">📊 Índice de Ambulatorización por Especialidad (Ranking)</div>
            <div style="position:relative; height:${Math.max(160, especialidadesRanking.length * 34)}px;">
                <canvas id="chartAmbRanking"></canvas>
            </div>
        </div>

        <div id="estadisticasAmbDesgloseWrap">
        <div style="background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; padding:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
            <span style="font-size:0.8rem; font-weight:600; color:#64748b;">📅 Año</span>
            <select id="estadisticasAmbFiltroAnio" style="padding:5px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem;">
                ${aniosDisponibles.map(a => `<option value="${a}" ${String(estadisticasAmbAnio) === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
        </div>
        <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:8px;">📈 Desglose Mensual por Especialidad</div>
        <div style="display:flex; gap:14px; align-items:center; margin-bottom:12px; font-size:0.75rem; color:#64748b; flex-wrap:wrap;">
            <span><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#0e7c7c; margin-right:4px;"></span>Índice de Ambulatorización %</span>
            ${renderLeyendaMeses()}
        </div>

        <div id="estadisticasAmbGrid" style="display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:16px;">
            ${especialidades.length === 0 ? `
                <p style="grid-column:1 / -1; text-align:center; color:#94a3b8; padding:24px;">No hay datos de programados Cmay en el año seleccionado.</p>
            ` : especialidades.map((esp, idx) => `
                <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:12px;">
                    <div style="font-weight:700; font-size:0.8rem; color:#1e293b; margin-bottom:6px; text-transform:uppercase;">${esp}</div>
                    <div class="stats-grafico-especialidad" style="position:relative; height:200px;">
                        <canvas id="chartAmbEsp_${idx}"></canvas>
                    </div>
                    <div class="stats-tabla-especialidad stats-table-wrap" style="max-height:170px; margin-top:10px; overflow-x:hidden; width:100%; box-sizing:border-box;">
                        <table style="width:100%; min-width:0; table-layout:fixed; font-size:0.75rem;">
                            <colgroup>
                                <col style="width:34%;">
                                <col style="width:22%;">
                                <col style="width:22%;">
                                <col style="width:22%;">
                            </colgroup>
                            <thead>
                                <tr><th>Mes</th><th>Prog. Cmay</th><th>CMA</th><th>Índice %</th></tr>
                            </thead>
                            <tbody>
                                ${buckets.map((b, i) => {
                                    const { estilo, icono, clase } = estadisticasEstiloFilaMes(b.key);
                                    const den = porEspecialidad[esp].denominador[i];
                                    const num = porEspecialidad[esp].numerador[i];
                                    const idx2 = estadisticasDivide(num, den);
                                    return `
                                    <tr style="${estilo}" data-mes-clase="${clase}">
                                        <td style="white-space:normal; word-break:break-word; ${estilo}">${b.label}${icono}</td>
                                        <td style="text-align:center; ${estilo}">${den}</td>
                                        <td style="text-align:center; ${estilo}">${num}</td>
                                        <td style="text-align:center; ${estilo}">${idx2.toFixed(1)}%</td>
                                    </tr>
                                `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('')}
        </div>
        </div>
    `;

    document.getElementById('estadisticasAmbFiltroAnio')?.addEventListener('change', function() {
        estadisticasAmbAnio = parseInt(this.value, 10);
        renderEstadisticasAmb();
    });

    dibujarChartAmbRanking(porEspecialidadRanking);
    dibujarChartsAmb(buckets, porEspecialidad, especialidades);
    estadisticasCentrarScrollMesActual('#estadisticasAmbGrid');
}

// Ranking de todas las especialidades por índice de ambulatorización,
// de mayor a menor, sumando los meses del rango de fechas seleccionado.
function dibujarChartAmbRanking(porEspecialidad) {
    const canvas = document.getElementById('chartAmbRanking');
    if (!canvas || typeof Chart === 'undefined') return;

    const ranking = Object.keys(porEspecialidad).map(esp => {
        const denominador = porEspecialidad[esp].denominador.reduce((a, b) => a + b, 0);
        const numerador = porEspecialidad[esp].numerador.reduce((a, b) => a + b, 0);
        return { esp, indice: estadisticasDivide(numerador, denominador) };
    }).sort((a, b) => b.indice - a.indice);

    const labels = ranking.map(r => r.esp);
    const valores = ranking.map(r => r.indice);
    const textos = valores.map(v => v.toFixed(1) + '%');

    if (estadisticasChartAmbRanking) {
        estadisticasChartAmbRanking.destroy();
    }

    estadisticasChartAmbRanking = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                labelsTexto: textos,
                backgroundColor: '#0e7c7c',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 45 } },
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } }
            }
        }
    });
}

function dibujarChartsAmb(buckets, porEspecialidad, especialidades) {
    estadisticasChartsAmb.forEach(c => c.destroy());
    estadisticasChartsAmb = [];

    if (typeof Chart === 'undefined') return;

    const labels = buckets.map(b => b.label);

    especialidades.forEach((esp, idx) => {
        const canvas = document.getElementById(`chartAmbEsp_${idx}`);
        if (!canvas) return;

        const datos = porEspecialidad[esp];
        const indices = datos.denominador.map((den, i) => estadisticasDivide(datos.numerador[i], den));

        const chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Índice de Ambulatorización %',
                        data: indices,
                        labelsTexto: indices.map(v => v.toFixed(1) + '%'),
                        borderColor: '#0e7c7c',
                        backgroundColor: '#0e7c7c',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 18 } },
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } }
                }
            }
        });
        estadisticasChartsAmb.push(chart);
    });
}

// =============================================================
// 🏨 OCUPACIÓN Y RENDIMIENTO PABELLÓN
// =============================================================

// -------------------------------------------------------------
// 📅 Feriados (API pública Nager.Holidays, con caché en localStorage)
// -------------------------------------------------------------
async function obtenerFeriados(anios) {
    for (const anio of anios) {
        const cacheKey = `feriados_cl_${anio}`;
        let fechas = null;

        try {
            const cacheado = localStorage.getItem(cacheKey);
            if (cacheado) fechas = JSON.parse(cacheado);
        } catch (e) {
            fechas = null;
        }

        if (!fechas) {
            try {
                const resp = await fetch(`https://date.nager.at/api/v3/publicholidays/${anio}/CL`);
                if (resp.ok) {
                    const data = await resp.json();
                    fechas = data.map(h => h.date);
                    localStorage.setItem(cacheKey, JSON.stringify(fechas));
                }
            } catch (error) {
                console.warn(`⚠️ No se pudo obtener feriados ${anio} desde Nager.Holidays:`, error);
            }
        }

        if (fechas) {
            fechas.forEach(f => estadisticasFeriadosCache.add(f));
        }
    }
}

function estadisticasAniosEnRango(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return [new Date().getFullYear()];
    const anioInicio = parseInt(fechaInicio.slice(0, 4), 10);
    const anioFin = parseInt(fechaFin.slice(0, 4), 10);
    const anios = [];
    for (let a = anioInicio; a <= anioFin; a++) anios.push(a);
    return anios;
}

// -------------------------------------------------------------
// 📆 Días hábiles (lunes a viernes, sin feriados)
// -------------------------------------------------------------
function esDiaHabil(fechaStr) {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const diaSemana = new Date(y, m - 1, d).getDay(); // 0=domingo, 6=sábado
    if (diaSemana === 0 || diaSemana === 6) return false;
    if (estadisticasFeriadosCache.has(fechaStr)) return false;
    return true;
}

function calcularDiasHabiles(fechaInicio, fechaFin) {
    const dias = [];
    if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) return dias;

    const [yIni, mIni, dIni] = fechaInicio.split('-').map(Number);
    const [yFin, mFin, dFin] = fechaFin.split('-').map(Number);
    const actual = new Date(yIni, mIni - 1, dIni);
    const fin = new Date(yFin, mFin - 1, dFin);

    let guard = 0;
    while (actual <= fin && guard < 3660) {
        const fechaStr = `${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, '0')}-${String(actual.getDate()).padStart(2, '0')}`;
        if (esDiaHabil(fechaStr)) dias.push(fechaStr);
        actual.setDate(actual.getDate() + 1);
        guard++;
    }
    return dias;
}

// -------------------------------------------------------------
// ⏱️ Horario hábil / inhábil de un registro
// Hábil: día lunes-viernes no feriado, con Hora_de_entrada entre 08:00 y 17:00.
// Inhábil: TODO el día si es sábado, domingo o feriado (sin importar la hora),
// o bien un día hábil pero con Hora_de_entrada antes de 08:00 o después de 17:00.
// -------------------------------------------------------------
function clasificarHorarioRegistro(registro) {
    const fechaNorm = normalizarFechaComparable(registro.FECHA);
    if (!fechaNorm) return null;

    if (!esDiaHabil(fechaNorm)) return 'inhabil';

    const horaNorm = normalizarValorHora(registro.Hora_de_entrada);
    if (!horaNorm) return null;

    if (horaNorm >= OCUP_HORA_INICIO_HABIL && horaNorm <= OCUP_HORA_FIN_HABIL) return 'habil';
    return 'inhabil';
}

function parsearDuracionHoras(valor) {
    const normalizada = normalizarValorHora(valor);
    if (!normalizada) return 0;
    const [h, m] = normalizada.split(':').map(Number);
    return h + (m / 60);
}

// Duración real de la cirugía + el tiempo de viraje/aseo del pabellón
// (se suma por cada caso, ya que también ocupa/trabaja el pabellón).
function duracionConVirajeHoras(registro) {
    return parsearDuracionHoras(registro.T_QX) + (OCUP_MINUTOS_VIRAJE_POR_CIRUGIA / 60);
}

// -------------------------------------------------------------
// 🏥 Disponibilidad de pabellón (Firebase: disponibilidad_pabellon)
// -------------------------------------------------------------
async function cargarDisponibilidadPabellon() {
    try {
        const snapshot = await database.ref('disponibilidad_pabellon').once('value');
        estadisticasDisponibilidadPabellon = snapshot.val() || {};
    } catch (error) {
        console.error('❌ Error al cargar disponibilidad de pabellón:', error);
        estadisticasDisponibilidadPabellon = {};
    }
}

function estaHabilitado(fecha, pabellon, bloque) {
    const registro = estadisticasDisponibilidadPabellon[fecha];
    if (!registro || !registro[pabellon] || registro[pabellon][bloque] === undefined) return true;
    return registro[pabellon][bloque] === true;
}

function calcularHorasHabilitadas(diasHabiles) {
    let horas = 0;
    diasHabiles.forEach(fecha => {
        OCUP_PABELLONES.forEach(pab => {
            ['AM', 'PM'].forEach(bloque => {
                if (estaHabilitado(fecha, pab, bloque)) horas += OCUP_HORAS_POR_BLOQUE;
            });
        });
    });
    return horas;
}

// -------------------------------------------------------------
// 🧮 KPIs de Ocupación y Rendimiento
// -------------------------------------------------------------
function calcularKpisOcupacion(registrosFiltrados, diasHabiles) {
    const horasHabilitadas = calcularHorasHabilitadas(diasHabiles);

    const registrosHabil = registrosFiltrados.filter(r =>
        r.ESTADO_DE_IQx !== ESTADISTICAS_ESTADO.SUSPENDIDO && clasificarHorarioRegistro(r) === 'habil'
    );

    const horasTrabajadas = registrosHabil.reduce((acc, r) => acc + duracionConVirajeHoras(r), 0);
    const urgenciasHabil = registrosHabil.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.URGENCIA);
    const horasUrgencia = urgenciasHabil.reduce((acc, r) => acc + duracionConVirajeHoras(r), 0);

    const porcentajeOcupacion = estadisticasDivide(horasTrabajadas, horasHabilitadas);
    const porcentajeUrgencia = estadisticasDivide(horasUrgencia, horasTrabajadas);

    const denominadorRendimiento = diasHabiles.length * OCUP_PABELLONES.length;

    const contarTipos = (registros, tipos) => registros.reduce((acc, r) =>
        acc + [r.Tipo_Actividad, r.Tipo_Actividad_2, r.Tipo_Actividad_3].filter(t => tipos.includes(t)).length, 0);

    const cmayProgramado = contarTipos(
        registrosHabil.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.PROGRAMADO),
        ['Cmay']
    );
    const totalCxOperado = contarTipos(
        registrosHabil.filter(r => !REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx)),
        ['Cmay', 'Cmen', 'Proc']
    );

    const rendimientoSoloProgCmay = denominadorRendimiento > 0 ? cmayProgramado / denominadorRendimiento : 0;
    const rendimientoTotalCx = denominadorRendimiento > 0 ? totalCxOperado / denominadorRendimiento : 0;

    return {
        diasHabiles: diasHabiles.length,
        horasHabilitadas, horasTrabajadas, horasUrgencia,
        porcentajeOcupacion, porcentajeUrgencia,
        rendimientoSoloProgCmay, rendimientoTotalCx
    };
}

// Mismo criterio que calcularKpisOcupacion, pero para los casos que
// ocurrieron FUERA del horario hábil (antes de 08:00 o después de 17:00).
function calcularKpisHorarioInhabil(registrosFiltrados) {
    const registrosInhabil = registrosFiltrados.filter(r =>
        r.ESTADO_DE_IQx !== ESTADISTICAS_ESTADO.SUSPENDIDO && clasificarHorarioRegistro(r) === 'inhabil'
    );

    const horasTrabajadas = registrosInhabil.reduce((acc, r) => acc + duracionConVirajeHoras(r), 0);
    const registrosUrgencia = registrosInhabil.filter(r => r.ESTADO_DE_IQx === ESTADISTICAS_ESTADO.URGENCIA);
    const horasUrgencia = registrosUrgencia.reduce((acc, r) => acc + duracionConVirajeHoras(r), 0);

    return {
        totalCirugias: registrosInhabil.length,
        totalUrgencias: registrosUrgencia.length,
        horasTrabajadas,
        horasUrgencia
    };
}

function estadisticasFormatearHoras(horasDecimales) {
    const horas = Math.floor(horasDecimales);
    const mins = Math.round((horasDecimales - horas) * 60);
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// -------------------------------------------------------------
// 🖼️ Render
// -------------------------------------------------------------
async function renderEstadisticasOcup() {
    const container = document.getElementById('estadisticasOcupContainer');
    if (!container) return;

    await obtenerFeriados(estadisticasAniosEnRango(estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin));

    const registrosFiltrados = filtrarRegistrosPorFechaEstadisticas(
        estadisticasRegistros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin
    );
    const diasHabiles = calcularDiasHabiles(estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin);
    const kpis = calcularKpisOcupacion(registrosFiltrados, diasHabiles);
    const kpisInhabil = calcularKpisHorarioInhabil(registrosFiltrados);

    const esAdmin = esAdministrador();

    const azul = { fondo: '#eef4ff', borde: '#c7d9f7', texto: '#1d4c8f', valor: '#0b2a4f' };
    const rojo = { fondo: '#fdecec', borde: '#f5c2c2', texto: '#8a1f1f', valor: '#c0392b' };
    const teal = { fondo: '#e7f7f7', borde: '#bfe6e6', texto: '#0f5f5f', valor: '#0e7c7c' };
    const fmtPct = (v) => v.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

    container.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-bottom:20px;">
            ${renderKpiCardEstadisticas('📆', 'Días Hábiles', kpis.diasHabiles, azul)}
            ${renderKpiCardEstadisticas('🏨', 'Horas Habilitadas', estadisticasFormatearHoras(kpis.horasHabilitadas), azul)}
            ${renderKpiCardEstadisticas('⏱️', 'Horas Trabajadas', estadisticasFormatearHoras(kpis.horasTrabajadas), teal)}
            ${renderKpiCardEstadisticas('🚨', 'Horas Urgencia', estadisticasFormatearHoras(kpis.horasUrgencia), rojo)}
            ${renderKpiCardEstadisticas('📊', '% Urgencia / Trabajadas', fmtPct(kpis.porcentajeUrgencia), rojo)}
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:20px;">
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px; text-align:center;">
                <div style="font-weight:700; font-size:0.85rem; color:#1e293b; margin-bottom:6px;">% Ocupación Pabellón</div>
                <div style="position:relative; height:150px;">
                    <canvas id="gaugeOcupacion"></canvas>
                    <span style="position:absolute; left:6px; bottom:0; font-size:0.7rem; color:#94a3b8;">0</span>
                    <span style="position:absolute; right:6px; bottom:0; font-size:0.7rem; color:#94a3b8;">${Math.max(100, kpis.porcentajeOcupacion).toFixed(0)}</span>
                </div>
            </div>
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px; text-align:center;">
                <div style="font-weight:700; font-size:0.85rem; color:#1e293b; margin-bottom:6px;">Rendimiento PB (Solo Prog Cmay)</div>
                <div style="position:relative; height:150px;">
                    <canvas id="gaugeRendProg"></canvas>
                    <span style="position:absolute; left:6px; bottom:0; font-size:0.7rem; color:#94a3b8;">0</span>
                    <span style="position:absolute; right:6px; bottom:0; font-size:0.7rem; color:#94a3b8;">${Math.max(4, kpis.rendimientoSoloProgCmay).toFixed(1)}</span>
                </div>
            </div>
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px; text-align:center;">
                <div style="font-weight:700; font-size:0.85rem; color:#1e293b; margin-bottom:6px;">Rendimiento PB (Total CX)</div>
                <div style="position:relative; height:150px;">
                    <canvas id="gaugeRendTotal"></canvas>
                    <span style="position:absolute; left:6px; bottom:0; font-size:0.7rem; color:#94a3b8;">0</span>
                    <span style="position:absolute; right:6px; bottom:0; font-size:0.7rem; color:#94a3b8;">${Math.max(4, kpis.rendimientoTotalCx).toFixed(1)}</span>
                </div>
            </div>
        </div>

        <div style="margin-bottom:20px;">
            <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:8px;">⏰ Horario Inhábil (fuera de 08:00–17:00)</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px;">
                ${renderKpiCardEstadisticas('🔪', 'Cirugías Inhábil', kpisInhabil.totalCirugias, azul)}
                ${renderKpiCardEstadisticas('⏱️', 'Horas Trabajadas Inhábil', estadisticasFormatearHoras(kpisInhabil.horasTrabajadas), teal)}
                ${renderKpiCardEstadisticas('🚨', 'Urgencias Inhábil', kpisInhabil.totalUrgencias, rojo)}
                ${renderKpiCardEstadisticas('🚨', 'Horas Urgencia Inhábil', estadisticasFormatearHoras(kpisInhabil.horasUrgencia), rojo)}
            </div>
        </div>

        <div id="estadisticasOcupDisponibilidadWrap">
            <div style="font-weight:700; font-size:1rem; color:#1e293b; margin-bottom:8px;">🗓️ Disponibilidad de Pabellón por Día ${esAdmin ? '' : '(solo lectura — el administrador puede editar)'}</div>
            <div class="stats-table-wrap" style="max-height:320px;">
                <table style="width:100%; min-width:0; table-layout:fixed; font-size:0.75rem;">
                    <colgroup>
                        <col style="width:24%;"><col style="width:19%;"><col style="width:19%;"><col style="width:19%;"><col style="width:19%;">
                    </colgroup>
                    <thead>
                        <tr><th>Fecha</th><th>Pabellón 1 AM</th><th>Pabellón 1 PM</th><th>Pabellón 2 AM</th><th>Pabellón 2 PM</th></tr>
                    </thead>
                    <tbody>
                        ${diasHabiles.length === 0 ? `
                            <tr><td colspan="5" style="text-align:center; padding:16px; color:#94a3b8;">No hay días hábiles en el rango seleccionado.</td></tr>
                        ` : diasHabiles.map(fecha => `
                            <tr>
                                <td>${fecha}</td>
                                ${OCUP_PABELLONES.map(pab => ['AM', 'PM'].map(bloque => renderCeldaDisponibilidad(fecha, pab, bloque, esAdmin)).join('')).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (esAdmin) inicializarTogglesDisponibilidad();
    dibujarGaugesOcupacion(kpis);
}

function renderCeldaDisponibilidad(fecha, pabellon, bloque, esAdmin) {
    const habilitado = estaHabilitado(fecha, pabellon, bloque);
    const color = habilitado ? '#16a34a' : '#dc2626';
    const texto = habilitado ? 'Habilitado' : 'Inhabilitado';

    if (esAdmin) {
        return `
            <td style="text-align:center;">
                <button class="btn-toggle-disponibilidad" data-fecha="${fecha}" data-pabellon="${pabellon}" data-bloque="${bloque}" data-actual="${habilitado}"
                    style="background:${color}; color:white; border:none; border-radius:12px; padding:3px 8px; font-size:0.68rem; cursor:pointer; font-weight:600; white-space:nowrap;">
                    ${texto}
                </button>
            </td>
        `;
    }
    return `<td style="text-align:center; color:${color}; font-weight:600;">${texto}</td>`;
}

function inicializarTogglesDisponibilidad() {
    document.querySelectorAll('.btn-toggle-disponibilidad').forEach(btn => {
        btn.addEventListener('click', async function() {
            const fecha = this.dataset.fecha;
            const pabellon = this.dataset.pabellon;
            const bloque = this.dataset.bloque;
            const nuevo = this.dataset.actual !== 'true';

            if (!estadisticasDisponibilidadPabellon[fecha]) estadisticasDisponibilidadPabellon[fecha] = {};
            if (!estadisticasDisponibilidadPabellon[fecha][pabellon]) estadisticasDisponibilidadPabellon[fecha][pabellon] = {};
            estadisticasDisponibilidadPabellon[fecha][pabellon][bloque] = nuevo;

            try {
                await database.ref(`disponibilidad_pabellon/${fecha}/${pabellon}`).update({ [bloque]: nuevo });
            } catch (error) {
                console.error('❌ Error al guardar disponibilidad de pabellón:', error);
            }

            renderEstadisticasOcup();
        });
    });
}

// -------------------------------------------------------------
// 📊 Gauges (Chart.js doughnut semicircular)
// -------------------------------------------------------------
function crearGaugeChart(canvasId, valor, max, color, chartKey, textoCentro) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const valorClamp = Math.max(0, Math.min(valor, max));
    const resto = max - valorClamp;

    if (estadisticasChartsGaugeOcup[chartKey]) {
        estadisticasChartsGaugeOcup[chartKey].destroy();
    }

    estadisticasChartsGaugeOcup[chartKey] = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [valorClamp, resto],
                backgroundColor: [color, '#e2e8f0'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            rotation: -90,
            circumference: 180,
            cutout: '72%',
            esGauge: true,
            gaugeTexto: textoCentro,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}

function dibujarGaugesOcupacion(kpis) {
    crearGaugeChart('gaugeOcupacion', kpis.porcentajeOcupacion, Math.max(100, kpis.porcentajeOcupacion), '#1a6d8a', 'ocupacion', kpis.porcentajeOcupacion.toFixed(1));
    crearGaugeChart('gaugeRendProg', kpis.rendimientoSoloProgCmay, Math.max(4, kpis.rendimientoSoloProgCmay), '#0e7c7c', 'rendProg', kpis.rendimientoSoloProgCmay.toFixed(2));
    crearGaugeChart('gaugeRendTotal', kpis.rendimientoTotalCx, Math.max(4, kpis.rendimientoTotalCx), '#d2691e', 'rendTotal', kpis.rendimientoTotalCx.toFixed(2));
}

// =============================================================
// 🩺 TIEMPOS POR INTERVENCIÓN
// =============================================================
function obtenerListaIntervenciones() {
    const registrosFiltrados = filtrarRegistrosPorFechaEstadisticas(
        estadisticasRegistros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin
    );
    return obtenerValoresUnicosOrdenados(registrosFiltrados.map(r => r['1ra_Intervencion_Qx_Realizada']));
}

function calcularEstadisticasIntervencion(nombreIntervencion) {
    const registrosFiltrados = filtrarRegistrosPorFechaEstadisticas(
        estadisticasRegistros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin
    );
    const casos = registrosFiltrados.filter(r => (r['1ra_Intervencion_Qx_Realizada'] || '') === nombreIntervencion);
    const duraciones = casos.map(r => parsearDuracionHoras(r.T_QX)).filter(d => d > 0);

    if (duraciones.length === 0) {
        return { nCasos: 0, promedio: 0, minimo: 0, maximo: 0 };
    }

    const suma = duraciones.reduce((a, b) => a + b, 0);
    return {
        nCasos: duraciones.length,
        promedio: suma / duraciones.length,
        minimo: Math.min(...duraciones),
        maximo: Math.max(...duraciones)
    };
}

function renderEstadisticasIntervenciones() {
    const container = document.getElementById('estadisticasIntervContainer');
    if (!container) return;

    const listaCompleta = obtenerListaIntervenciones();
    const seleccionadas = Array.from(estadisticasIntervSeleccionadas).sort();

    container.innerHTML = `
        <div style="position:relative; max-width:520px;">
            <input type="text" id="estadisticasIntervBuscar" placeholder="🔎 Buscar intervención (1ra Intervención Realizada)..." value="${(estadisticasIntervTexto || '').replace(/"/g, '&quot;')}" autocomplete="off"
                style="width:100%; padding:9px 12px; border:1px solid #d1d9e6; border-radius:8px; font-size:0.85rem; box-sizing:border-box;">
            <div id="estadisticasIntervResultados" style="position:absolute; top:100%; left:0; right:0; max-height:260px; overflow-y:auto; background:white; border:1px solid #d1d9e6; border-radius:8px; box-shadow:0 8px 20px rgba(0,0,0,0.14); z-index:50; margin-top:4px; display:none;"></div>
        </div>

        ${seleccionadas.length > 0 ? `
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:10px;">
                ${seleccionadas.map(nombre => `
                    <span style="display:inline-flex; align-items:center; gap:6px; background:#eef4ff; border:1px solid #c7d9f7; color:#1d4c8f; padding:4px 6px 4px 10px; border-radius:16px; font-size:0.75rem; font-weight:600;">
                        ${nombre}
                        <button class="estadisticasIntervChipRemove" data-nombre="${nombre.replace(/"/g, '&quot;')}" title="Quitar" style="background:transparent; border:none; cursor:pointer; color:#1d4c8f; font-weight:700; font-size:0.9rem; padding:0 2px; line-height:1;">×</button>
                    </span>
                `).join('')}
                <button id="estadisticasIntervLimpiarTodo" style="background:#e2e8f0; border:none; padding:5px 12px; border-radius:16px; font-size:0.7rem; font-weight:500; cursor:pointer; color:#475569;">🗑️ Limpiar todo</button>
            </div>
        ` : ''}

        <div id="estadisticasIntervStats" style="margin-top:18px; display:flex; flex-direction:column; gap:14px;">
            ${seleccionadas.length === 0 ? `
                <p style="color:#94a3b8; padding:12px 0;">Busca y selecciona una o más intervenciones para ver su tiempo promedio, mínimo, máximo y N° de casos.</p>
            ` : seleccionadas.map(nombre => renderStatsIntervencionHtml(nombre, calcularEstadisticasIntervencion(nombre))).join('')}
        </div>
    `;

    inicializarBusquedaIntervenciones(listaCompleta);
}

function renderStatsIntervencionHtml(nombre, stats) {
    const azul = { fondo: '#eef4ff', borde: '#c7d9f7', texto: '#1d4c8f', valor: '#0b2a4f' };
    const verde = { fondo: '#eafaf1', borde: '#bfe8cf', texto: '#166a3f', valor: '#0f8a4c' };
    const rojo = { fondo: '#fdecec', borde: '#f5c2c2', texto: '#8a1f1f', valor: '#c0392b' };
    const teal = { fondo: '#e7f7f7', borde: '#bfe6e6', texto: '#0f5f5f', valor: '#0e7c7c' };

    if (stats.nCasos === 0) {
        return `
            <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:14px;">
                <div style="font-weight:700; font-size:0.95rem; color:#1e293b; margin-bottom:6px;">${nombre}</div>
                <p style="color:#94a3b8; margin:0;">No hay casos con duración registrada (T_QX) para esta intervención.</p>
            </div>
        `;
    }

    return `
        <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:14px;">
            <div style="font-weight:700; font-size:0.95rem; color:#1e293b; margin-bottom:10px;">${nombre}</div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px;">
                ${renderKpiCardEstadisticas('🔢', 'N° de Casos', stats.nCasos, azul)}
                ${renderKpiCardEstadisticas('⏱️', 'Tiempo Promedio', estadisticasFormatearHoras(stats.promedio), teal)}
                ${renderKpiCardEstadisticas('⬇️', 'Tiempo Mínimo', estadisticasFormatearHoras(stats.minimo), verde)}
                ${renderKpiCardEstadisticas('⬆️', 'Tiempo Máximo', estadisticasFormatearHoras(stats.maximo), rojo)}
            </div>
        </div>
    `;
}

function inicializarBusquedaIntervenciones(listaCompleta) {
    const input = document.getElementById('estadisticasIntervBuscar');
    const resultados = document.getElementById('estadisticasIntervResultados');
    if (!input || !resultados) return;

    function mostrarResultados(filtro) {
        const texto = filtro.toLowerCase().trim();
        const coincidencias = texto === '' ? [] : listaCompleta.filter(n => n.toLowerCase().includes(texto)).slice(0, 50);

        if (coincidencias.length === 0) {
            resultados.style.display = 'none';
            resultados.innerHTML = '';
            return;
        }

        resultados.innerHTML = coincidencias.map(nombre => {
            const seleccionado = estadisticasIntervSeleccionadas.has(nombre);
            return `
                <div class="estadisticasIntervItem" data-nombre="${nombre.replace(/"/g, '&quot;')}" style="padding:8px 12px; cursor:pointer; font-size:0.82rem; border-bottom:1px solid #f0f0f0; display:flex; align-items:center; gap:8px; ${seleccionado ? 'background:#eef4ff;' : ''}">
                    <span style="width:14px; flex-shrink:0;">${seleccionado ? '✅' : ''}</span>
                    <span>${nombre}</span>
                </div>
            `;
        }).join('');
        resultados.style.display = 'block';

        resultados.querySelectorAll('.estadisticasIntervItem').forEach(item => {
            item.addEventListener('mouseenter', () => { if (!estadisticasIntervSeleccionadas.has(item.dataset.nombre)) item.style.background = '#f8fafc'; });
            item.addEventListener('mouseleave', () => { if (!estadisticasIntervSeleccionadas.has(item.dataset.nombre)) item.style.background = 'transparent'; });
            item.addEventListener('click', () => {
                const nombre = item.dataset.nombre;
                if (estadisticasIntervSeleccionadas.has(nombre)) {
                    estadisticasIntervSeleccionadas.delete(nombre);
                } else {
                    estadisticasIntervSeleccionadas.add(nombre);
                }
                estadisticasIntervReabrirDropdown = true;
                renderEstadisticasIntervenciones();
            });
        });
    }

    input.addEventListener('input', function() {
        estadisticasIntervTexto = this.value;
        mostrarResultados(this.value);
    });

    input.addEventListener('focus', function() {
        if (this.value.trim() !== '') mostrarResultados(this.value);
    });

    document.querySelectorAll('.estadisticasIntervChipRemove').forEach(btn => {
        btn.addEventListener('click', function() {
            estadisticasIntervSeleccionadas.delete(this.dataset.nombre);
            renderEstadisticasIntervenciones();
        });
    });

    document.getElementById('estadisticasIntervLimpiarTodo')?.addEventListener('click', function() {
        estadisticasIntervSeleccionadas.clear();
        estadisticasIntervTexto = '';
        renderEstadisticasIntervenciones();
    });

    // Si venimos de marcar/desmarcar un ítem, reabrir el dropdown con el
    // mismo texto de búsqueda para poder seguir eligiendo sin fricción.
    if (estadisticasIntervReabrirDropdown && input.value.trim() !== '') {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        mostrarResultados(input.value);
    }
    estadisticasIntervReabrirDropdown = false;

    if (!estadisticasIntervListenerGlobalRegistrado) {
        estadisticasIntervListenerGlobalRegistrado = true;
        document.addEventListener('click', function(e) {
            const inputActual = document.getElementById('estadisticasIntervBuscar');
            const resultadosActual = document.getElementById('estadisticasIntervResultados');
            if (!inputActual || !resultadosActual) return;
            if (!inputActual.contains(e.target) && !resultadosActual.contains(e.target)) {
                resultadosActual.style.display = 'none';
            }
        });
    }
}

// =============================================================
// 🤰 PERIANALGESIA (PARTO) — CASOS POR MES EN EL AÑO
// =============================================================
function calcularPerianalgesiaPorMes(registros, anio) {
    const meses = new Array(12).fill(0);
    registros.forEach(r => {
        if (r.ESTADO_DE_IQx !== 'PERIANALGESIA (PARTO)') return;
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm) return;
        const [y, m] = fechaNorm.split('-');
        if (parseInt(y, 10) !== anio) return;
        const idx = parseInt(m, 10) - 1;
        if (idx >= 0 && idx <= 11) meses[idx]++;
    });
    return meses;
}

function renderEstadisticasPerianalgesia() {
    const container = document.getElementById('estadisticasPerianalgesiaContainer');
    if (!container) return;

    const meses = calcularPerianalgesiaPorMes(estadisticasRegistros, estadisticasPerianalgesiaAnio);
    const totalAnio = meses.reduce((a, b) => a + b, 0);
    const anios = obtenerValoresUnicosOrdenados(
        estadisticasRegistros.map(r => {
            const f = normalizarFechaComparable(r.FECHA);
            return f ? f.slice(0, 4) : '';
        })
    );

    container.innerHTML = `
        <div style="background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; padding:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
            <span style="font-size:0.8rem; font-weight:600; color:#64748b;">📅 Año</span>
            <select id="estadisticasPerianalgesiaFiltroAnio" style="padding:5px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem;">
                ${anios.map(a => `<option value="${a}" ${String(estadisticasPerianalgesiaAnio) === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
            <span style="font-size:0.8rem; color:#64748b; margin-left:8px;">Total del año: <strong>${totalAnio}</strong></span>
        </div>

        <div style="display:grid; grid-template-columns:2fr 1fr; gap:16px;">
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px;">
                <div style="position:relative; height:280px;">
                    <canvas id="chartPerianalgesia"></canvas>
                </div>
            </div>
            <div class="stats-table-wrap" style="max-height:none;">
                <table style="width:100%; min-width:0; table-layout:fixed; font-size:0.8rem;">
                    <colgroup><col style="width:60%;"><col style="width:40%;"></colgroup>
                    <thead><tr><th>Mes</th><th>N° Casos</th></tr></thead>
                    <tbody>
                        ${ESTADISTICAS_NOMBRES_MES.map((nombreMes, i) => `
                            <tr>
                                <td>${nombreMes}</td>
                                <td style="text-align:center; font-weight:700;">${meses[i]}</td>
                            </tr>
                        `).join('')}
                        <tr style="font-weight:700; background:#f1f5f9;">
                            <td>Total</td>
                            <td style="text-align:center;">${totalAnio}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    inicializarFiltroPerianalgesia();
    dibujarChartPerianalgesia(meses);
}

function inicializarFiltroPerianalgesia() {
    document.getElementById('estadisticasPerianalgesiaFiltroAnio')?.addEventListener('change', function() {
        estadisticasPerianalgesiaAnio = parseInt(this.value, 10);
        renderEstadisticasPerianalgesia();
    });
}

function dibujarChartPerianalgesia(meses) {
    const canvas = document.getElementById('chartPerianalgesia');
    if (!canvas || typeof Chart === 'undefined') return;

    if (estadisticasChartPerianalgesia) {
        estadisticasChartPerianalgesia.destroy();
    }

    estadisticasChartPerianalgesia = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ESTADISTICAS_NOMBRES_MES.map(m => m.slice(0, 3)),
            datasets: [{
                label: 'Perianalgesia (Parto)',
                data: meses,
                backgroundColor: '#d2691e',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 22 } },
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            },
            onHover: (evt, elements) => {
                evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            },
            onClick: (evt, elements) => {
                if (!elements || elements.length === 0) return;
                mostrarModalCalendarioPerianalgesia(estadisticasPerianalgesiaAnio, elements[0].index);
            }
        }
    });
}

// -------------------------------------------------------------
// 📅 Modal: distribución diaria de un mes (clic en la barra)
// -------------------------------------------------------------
function calcularDistribucionDiariaPerianalgesia(registros, anio, mes) {
    const conteoPorDia = {};
    registros.forEach(r => {
        if (r.ESTADO_DE_IQx !== 'PERIANALGESIA (PARTO)') return;
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm) return;
        const [y, m, d] = fechaNorm.split('-').map(Number);
        if (y !== anio || m !== mes) return;
        conteoPorDia[d] = (conteoPorDia[d] || 0) + 1;
    });
    return conteoPorDia;
}

function mostrarModalCalendarioPerianalgesia(anio, mesIndex0) {
    const mes = mesIndex0 + 1;
    const conteoPorDia = calcularDistribucionDiariaPerianalgesia(estadisticasRegistros, anio, mes);
    const totalMes = Object.values(conteoPorDia).reduce((a, b) => a + b, 0);

    const primerDiaSemana = new Date(anio, mes - 1, 1).getDay(); // 0=domingo
    const offsetLunes = (primerDiaSemana + 6) % 7; // 0=lunes
    const diasEnMes = new Date(anio, mes, 0).getDate();

    let celdas = '';
    for (let i = 0; i < offsetLunes; i++) {
        celdas += `<div></div>`;
    }
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const count = conteoPorDia[dia] || 0;
        const activo = count > 0;
        celdas += `
            <div style="aspect-ratio:1; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:${activo ? '#fde8d5' : '#f8fafc'}; border:1px solid ${activo ? '#f0b27a' : '#e2e8f0'};">
                <span style="font-size:0.65rem; color:#94a3b8;">${dia}</span>
                ${activo ? `<span style="font-weight:800; font-size:1.05rem; color:#d2691e;">${count}</span>` : ''}
            </div>
        `;
    }

    document.getElementById('modalCalendarioPerianalgesia')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalCalendarioPerianalgesia';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width:520px;">
            <span class="modal-icon">🤰</span>
            <div class="modal-title">${ESTADISTICAS_NOMBRES_MES[mesIndex0]} ${anio} — ${totalMes} caso${totalMes === 1 ? '' : 's'}</div>
            <div class="modal-message" style="text-align:left;">
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; margin-bottom:8px; font-size:0.7rem; font-weight:700; color:#64748b; text-align:center;">
                    <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px;">
                    ${celdas}
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-cancel" id="cerrarModalCalendarioPerianalgesia">✅ Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#cerrarModalCalendarioPerianalgesia').addEventListener('click', function() {
        overlay.remove();
    });
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
}

// =============================================================
// 🎯 CUMPLIMIENTO DE METAS
// =============================================================
async function cargarMetasProduccion() {
    try {
        const snapshot = await database.ref('metas_produccion').once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error('❌ Error al cargar metas de producción:', error);
        return {};
    }
}

// Intervenciones (slots de Tipo_Actividad/2/3, cada una cuenta por separado),
// sin incluir Suspendido/Urgencia/Condicional (No Operado)/Perianalgesia
// (Parto), y solo en horario hábil.
function calcularProduccionGeneralAnio(anio) {
    const registrosDelAnio = estadisticasRegistros.filter(r => {
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm || parseInt(fechaNorm.slice(0, 4), 10) !== anio) return false;
        if (REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx)) return false;
        return clasificarHorarioRegistro(r) === 'habil';
    });
    return contarTiposActividadRem(registrosDelAnio).total;
}

// Igual que la anterior, pero solo cuenta las intervenciones que sean Cmay.
function calcularProduccionCmayAnio(anio) {
    const registrosDelAnio = estadisticasRegistros.filter(r => {
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm || parseInt(fechaNorm.slice(0, 4), 10) !== anio) return false;
        if (REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx)) return false;
        return clasificarHorarioRegistro(r) === 'habil';
    });
    return contarTiposActividadRem(registrosDelAnio).cmay;
}

// Igual que calcularProduccionGeneralAnio, pero cuenta pacientes (filas),
// no intervenciones.
function calcularProduccionGeneralPacientesAnio(anio) {
    return estadisticasRegistros.filter(r => {
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm || parseInt(fechaNorm.slice(0, 4), 10) !== anio) return false;
        if (REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx)) return false;
        return clasificarHorarioRegistro(r) === 'habil';
    }).length;
}

// Igual que calcularProduccionCmayAnio, pero cuenta pacientes (filas) cuya
// 1ra intervención fue Cmay, no cada intervención por separado.
function calcularProduccionCmayPacientesAnio(anio) {
    return estadisticasRegistros.filter(r => {
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        if (!fechaNorm || parseInt(fechaNorm.slice(0, 4), 10) !== anio) return false;
        if (REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx)) return false;
        if (clasificarHorarioRegistro(r) !== 'habil') return false;
        return r.Tipo_Actividad === 'Cmay';
    }).length;
}

// Misma fórmula del Índice de Ambulatorización ya usado en Parte 1 / Proceso
// Ambulatorio (calcularAmbulatorizacion), aplicada al año completo.
function calcularAmbulatorizacionAnio(anio) {
    const registrosAnio = estadisticasRegistros.filter(r => {
        const fechaNorm = normalizarFechaComparable(r.FECHA);
        return fechaNorm && parseInt(fechaNorm.slice(0, 4), 10) === anio;
    });
    return calcularAmbulatorizacion(registrosAnio).indice;
}

async function renderEstadisticasMetas() {
    const container = document.getElementById('estadisticasMetasContainer');
    if (!container) return;

    const aniosNecesarios = [...new Set([
        estadisticasMetas.produccionGeneral.anio,
        estadisticasMetas.produccionCmay.anio,
        estadisticasMetas.produccionGeneralPacientes.anio,
        estadisticasMetas.produccionCmayPacientes.anio,
        estadisticasMetas.ambulatorizacion.anio
    ].filter(a => a))];
    await obtenerFeriados(aniosNecesarios);

    const actualGeneral = calcularProduccionGeneralAnio(estadisticasMetas.produccionGeneral.anio);
    const actualCmay = calcularProduccionCmayAnio(estadisticasMetas.produccionCmay.anio);
    const actualGeneralPacientes = calcularProduccionGeneralPacientesAnio(estadisticasMetas.produccionGeneralPacientes.anio);
    const actualCmayPacientes = calcularProduccionCmayPacientesAnio(estadisticasMetas.produccionCmayPacientes.anio);
    const actualAmbulatorizacion = calcularAmbulatorizacionAnio(estadisticasMetas.ambulatorizacion.anio);

    const esAdmin = esAdministrador();

    container.innerHTML = `
        <div id="estadisticasMetasGrid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
            ${renderTarjetaMeta('produccionGeneral', '🏥 Meta de Producción General (Intervenciones)', estadisticasMetas.produccionGeneral, actualGeneral, esAdmin, false, '#facc15')}
            ${renderTarjetaMeta('produccionCmay', '🔪 Meta de Producción Cmay (Intervenciones)', estadisticasMetas.produccionCmay, actualCmay, esAdmin, false, '#3b82f6')}
            ${renderTarjetaMeta('produccionGeneralPacientes', '🏥 Meta de Producción General (Pacientes)', estadisticasMetas.produccionGeneralPacientes, actualGeneralPacientes, esAdmin, false, '#a3e635')}
            ${renderTarjetaMeta('produccionCmayPacientes', '🔪 Meta de Producción Cmay (Pacientes)', estadisticasMetas.produccionCmayPacientes, actualCmayPacientes, esAdmin, false, '#60a5fa')}
            ${renderTarjetaMeta('ambulatorizacion', '🚶 Meta % Ambulatorización', estadisticasMetas.ambulatorizacion, actualAmbulatorizacion, esAdmin, true, '#f97316')}
        </div>
    `;

    inicializarMetas();
    dibujarGaugesMetas({
        produccionGeneral: actualGeneral,
        produccionCmay: actualCmay,
        produccionGeneralPacientes: actualGeneralPacientes,
        produccionCmayPacientes: actualCmayPacientes,
        ambulatorizacion: actualAmbulatorizacion
    });
}

// =============================================================
// ⏱️ HORARIOS DE ENTRADA/SALIDA AM/PM (por bloque, pabellón y especialidad)
// Reutiliza los cálculos ya construidos para el Análisis IA (js/22-analisis-ia.js)
// — calcularAnalisisHorariosLibro() / calcularComportamientoPorEspecialidad() /
// construirFilasTablaHorarios() — para no duplicar esa lógica ("entrada más
// temprana / salida más tardía por día", exclusión de suspendidas, etc.).
// A diferencia del informe de Análisis IA (que es un snapshot puntual con su
// propio rango de fechas), esta página usa el filtro de fecha global de
// Estadísticas y se recalcula sola al cambiarlo, como el resto del dashboard.
// =============================================================
function construirTablaEstadisticasGenerica(titulo, headers, filas, colspanVacio) {
    let html = `<div style="font-weight:700; font-size:1rem; color:#1e293b; margin:18px 0 8px 0;">${titulo}</div>`;
    html += `<div class="stats-table-wrap"><table style="width:100%;"><thead><tr>`;
    headers.forEach(h => { html += `<th>${h}</th>`; });
    html += `</tr></thead><tbody>`;
    if (filas.length === 0) {
        html += `<tr><td colspan="${colspanVacio}" style="text-align:center; padding:24px; color:#94a3b8;">Sin datos suficientes en el rango seleccionado.</td></tr>`;
    } else {
        filas.forEach(fila => {
            html += `<tr>${fila.map(c => `<td>${c}</td>`).join('')}</tr>`;
        });
    }
    html += `</tbody></table></div>`;
    return html;
}

function renderEstadisticasHorarios() {
    const container = document.getElementById('estadisticasHorariosContainer');
    if (!container) return;

    const registrosFiltrados = filtrarRegistrosPorFechaEstadisticas(
        estadisticasRegistros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin
    );

    const analisisHorarios = calcularAnalisisHorariosLibro(registrosFiltrados);
    const comportamientoEsp = calcularComportamientoPorEspecialidad(registrosFiltrados);

    let html = construirTablaEstadisticasGenerica(
        'Horarios de Entrada/Salida por Bloque' + (analisisHorarios.length > 1 ? ' y Pabellón' : ''),
        ['Ámbito', 'Bloque', 'Días / Casos', 'Entrada Prom.', 'Salida Prom.', 'Atraso vs. Límite'],
        construirFilasTablaHorarios(analisisHorarios), 6
    );

    if (comportamientoEsp.length) {
        html += construirTablaEstadisticasGenerica(
            'Producción y Ocupación por Especialidad (Solo Cirugías Electivas)',
            ['Especialidad', 'Producción (casos)', 'Horas de Pabellón', '% del Tiempo Electivo Trabajado'],
            comportamientoEsp.map(e => [e.especialidad, String(e.produccion), estadisticasFormatearHoras(e.horas), iaFmtPct(e.pctDelTotal)]),
            4
        );

        html += construirTablaEstadisticasGenerica(
            'Horarios de Bloque AM/PM por Especialidad (Solo Cirugías Electivas)',
            ['Especialidad', 'Bloque', 'Días / Casos', 'Entrada Prom.', 'Salida Prom.', 'Atraso vs. Límite'],
            construirFilasTablaHorarios(comportamientoEsp.map(e => ({ clave: e.especialidad, am: e.am, pm: e.pm }))), 6
        );
    } else {
        html += `<p style="color:#94a3b8; text-align:center; padding:20px;">No hay cirugías electivas en el rango seleccionado para desglosar por especialidad.</p>`;
    }

    container.innerHTML = html;
}

function renderTarjetaMeta(key, titulo, config, actual, esAdmin, esPorcentaje, color) {
    const meta = config.meta || 0;
    const pctCumplido = meta > 0 ? (actual / meta) * 100 : 0;
    const editando = estadisticasMetaEditando === key;

    const valorTexto = esPorcentaje ? `${actual.toFixed(1)}%` : actual;
    const metaTexto = esPorcentaje ? `${meta}%` : meta;

    return `
        <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;">
                <div style="font-weight:700; font-size:0.85rem; color:#1e293b;">${titulo} (${config.anio || '—'})</div>
                ${esAdmin ? `<button class="btn-editar-meta" data-key="${key}" style="background:transparent; border:none; cursor:pointer; font-size:0.9rem; flex-shrink:0;" title="Editar meta">✏️</button>` : ''}
            </div>

            ${editando ? `
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px; background:#f8fafc; border-radius:8px; padding:10px;">
                    <label style="font-size:0.75rem; color:#64748b;">Meta${esPorcentaje ? ' (%)' : ''}
                        <input type="number" id="metaInput_${key}" value="${meta}" min="0" style="width:90px; padding:4px 6px; border:1px solid #d1d9e6; border-radius:4px; margin-left:4px;">
                    </label>
                    <label style="font-size:0.75rem; color:#64748b;">Año
                        <input type="number" id="metaAnioInput_${key}" value="${config.anio || ''}" style="width:75px; padding:4px 6px; border:1px solid #d1d9e6; border-radius:4px; margin-left:4px;">
                    </label>
                    <button class="btn-guardar-meta" data-key="${key}" style="background:#16a34a; color:white; border:none; padding:5px 12px; border-radius:16px; font-size:0.75rem; cursor:pointer;">💾 Guardar</button>
                    <button class="btn-cancelar-meta" style="background:#e2e8f0; border:none; padding:5px 12px; border-radius:16px; font-size:0.75rem; cursor:pointer;">Cancelar</button>
                </div>
            ` : ''}

            <div style="position:relative; height:150px;">
                <canvas id="gaugeMeta_${key}"></canvas>
                <span style="position:absolute; left:6px; bottom:0; font-size:0.7rem; color:#94a3b8;">0</span>
                <span style="position:absolute; right:6px; bottom:0; font-size:0.7rem; color:#94a3b8;">${metaTexto}</span>
            </div>

            <div style="text-align:center; margin-top:8px; font-size:0.8rem; color:#64748b;">
                Actual: <strong style="color:#1e293b;">${valorTexto}</strong> · Meta: <strong style="color:#1e293b;">${metaTexto}</strong>
            </div>
            <div style="text-align:center; margin-top:4px; font-size:1.15rem; font-weight:800; color:${pctCumplido >= 100 ? '#16a34a' : '#0b2a4f'};">
                ${pctCumplido.toFixed(1)}% cumplido
            </div>
        </div>
    `;
}

function dibujarGaugesMetas(actuales) {
    const configs = [
        { key: 'produccionGeneral', color: '#facc15' },
        { key: 'produccionCmay', color: '#3b82f6' },
        { key: 'produccionGeneralPacientes', color: '#a3e635' },
        { key: 'produccionCmayPacientes', color: '#60a5fa' },
        { key: 'ambulatorizacion', color: '#f97316' }
    ];

    configs.forEach(({ key, color }) => {
        const meta = estadisticasMetas[key].meta || 0;
        const actual = actuales[key];
        const max = meta > 0 ? meta : Math.max(actual, 1);
        const texto = key === 'ambulatorizacion' ? actual.toFixed(1) : String(Math.round(actual));
        crearGaugeChart(`gaugeMeta_${key}`, actual, max, color, `meta_${key}`, texto);
    });
}

function inicializarMetas() {
    document.querySelectorAll('.btn-editar-meta').forEach(btn => {
        btn.addEventListener('click', function() {
            estadisticasMetaEditando = this.dataset.key;
            renderEstadisticasMetas();
        });
    });

    document.querySelectorAll('.btn-cancelar-meta').forEach(btn => {
        btn.addEventListener('click', function() {
            estadisticasMetaEditando = null;
            renderEstadisticasMetas();
        });
    });

    document.querySelectorAll('.btn-guardar-meta').forEach(btn => {
        btn.addEventListener('click', async function() {
            const key = this.dataset.key;
            const metaInput = document.getElementById(`metaInput_${key}`);
            const anioInput = document.getElementById(`metaAnioInput_${key}`);
            const meta = parseFloat(metaInput.value) || 0;
            const anio = parseInt(anioInput.value, 10) || new Date().getFullYear();

            estadisticasMetas[key] = { meta, anio };
            estadisticasMetaEditando = null;

            try {
                await database.ref(`metas_produccion/${key}`).set({ meta, anio });
            } catch (error) {
                console.error('❌ Error al guardar meta:', error);
            }

            await renderEstadisticasMetas();
        });
    });
}

// =============================================================
// 📑 PAGINACIÓN
// =============================================================
function renderNavegacionPaginasEstadisticas() {
    return `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; background:white; border-radius:16px; border:1px solid #e2e8f0; padding:12px 16px; margin-top:16px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <button id="estadisticasPagAnterior" style="background:#f1f5f9; border:1px solid #d1d9e6; padding:6px 14px; border-radius:20px; font-size:0.8rem; cursor:pointer; font-weight:600; color:#334155;">‹ Anterior</button>
                <select id="estadisticasPagSelector" style="padding:6px 10px; border:1px solid #d1d9e6; border-radius:8px; font-size:0.8rem; max-width:280px;">
                    ${ESTADISTICAS_PAGINAS.map((p, i) => `<option value="${i}">${p.titulo}</option>`).join('')}
                </select>
                <button id="estadisticasPagSiguiente" style="background:#f1f5f9; border:1px solid #d1d9e6; padding:6px 14px; border-radius:20px; font-size:0.8rem; cursor:pointer; font-weight:600; color:#334155;">Siguiente ›</button>
                <span id="estadisticasPagContador" style="font-size:0.78rem; color:#64748b;"></span>
            </div>
            <div style="display:flex; gap:8px;">
                ${usuarioTieneAccesoSeccion('estadisticas_presentacionPpt') ? `
                <button id="estadisticasBtnPresentacion" style="background:#0b2a4f; color:white; border:none; padding:7px 16px; border-radius:20px; font-size:0.8rem; cursor:pointer; font-weight:600;">🎥 Presentación</button>
                <button id="estadisticasBtnDescargarPpt" style="background:#c0392b; color:white; border:none; padding:7px 16px; border-radius:20px; font-size:0.8rem; cursor:pointer; font-weight:600;">⬇️ Descargar PPT</button>
                ` : ''}
            </div>
        </div>
    `;
}

function mostrarPaginaEstadisticas(indice) {
    estadisticasPaginaActual = Math.max(0, Math.min(indice, ESTADISTICAS_PAGINAS.length - 1));

    document.querySelectorAll('.estadisticas-pagina').forEach((el, i) => {
        el.style.display = i === estadisticasPaginaActual ? 'block' : 'none';
    });

    const selector = document.getElementById('estadisticasPagSelector');
    if (selector) selector.value = String(estadisticasPaginaActual);

    const contador = document.getElementById('estadisticasPagContador');
    if (contador) contador.textContent = `Página ${estadisticasPaginaActual + 1} de ${ESTADISTICAS_PAGINAS.length}`;
}

function inicializarNavegacionPaginasEstadisticas() {
    document.getElementById('estadisticasPagAnterior')?.addEventListener('click', function() {
        mostrarPaginaEstadisticas(estadisticasPaginaActual - 1);
    });
    document.getElementById('estadisticasPagSiguiente')?.addEventListener('click', function() {
        mostrarPaginaEstadisticas(estadisticasPaginaActual + 1);
    });
    document.getElementById('estadisticasPagSelector')?.addEventListener('change', function() {
        mostrarPaginaEstadisticas(parseInt(this.value, 10));
    });
    document.getElementById('estadisticasBtnPresentacion')?.addEventListener('click', abrirPresentacionEstadisticas);
    document.getElementById('estadisticasBtnDescargarPpt')?.addEventListener('click', descargarPresentacionPpt);
}

// =============================================================
// 📸 CAPTURA COMPARTIDA (Presentación + PPT)
// =============================================================
// Todas las capturas pasan por esta cola para que nunca se solapen dos
// capturas al mismo tiempo (evita que una oculte la página que la otra
// está fotografiando — causaba diapositivas en blanco al navegar rápido).
let estadisticasColaCapturas = Promise.resolve();

function encolarCaptura(tarea) {
    const resultado = estadisticasColaCapturas.then(tarea, tarea);
    estadisticasColaCapturas = resultado.catch(() => {});
    return resultado;
}

// paginaIndice: qué .estadisticas-pagina debe estar visible para que
// elementoId tenga layout correcto. elementoId: el elemento exacto a
// fotografiar (puede ser la página completa o una sub-sección).
// opciones.modoCaptura: agrega temporalmente la clase 'pptx-modo-captura'
// a <body> (ver styles.css) para usar un layout más ancho/compacto solo
// en la captura, sin afectar la vista interactiva normal.
// opciones.gridId + opciones.chunkIndex: para láminas paginadas por
// especialidad (ver estadisticasResolverLaminas) — oculta todas las
// tarjetas del grid salvo las del chunk indicado antes de capturar.
async function capturarElementoComoImagen(paginaIndice, elementoId, opciones = {}) {
    // El layout puede cambiar según modoCaptura (grillas más anchas, secciones
    // ocultas) y según qué chunk de especialidades esté visible, así que cada
    // variante necesita su propia entrada de caché.
    const claveCache = elementoId + (opciones.modoCaptura ? '__captura' : '') + (opciones.gridId && opciones.chunkIndex != null ? `__chunk${opciones.chunkIndex}` : '');

    if (estadisticasCapturasCache[claveCache]) return estadisticasCapturasCache[claveCache];

    if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas no está disponible');
    }

    return encolarCaptura(async () => {
        // Puede haberse resuelto mientras esperaba en la cola.
        if (estadisticasCapturasCache[claveCache]) return estadisticasCapturasCache[claveCache];

        const paginaAnterior = estadisticasPaginaActual;
        mostrarPaginaEstadisticas(paginaIndice);
        if (opciones.modoCaptura) document.body.classList.add('pptx-modo-captura');

        await new Promise(resolve => setTimeout(resolve, 80));

        // Al mostrar/ocultar páginas repetidamente (ahora pasa mucho más
        // seguido, con 9 láminas compartidas entre Presentación y PPT),
        // Chart.js puede quedar con el tamaño mal calculado de la última
        // vez que esa página estuvo oculta. Forzar resize() justo antes de
        // capturar corrige eso — incluye los gauges (Ocupación/Metas) y los
        // gráficos que además cambiaron de tamaño por el CSS de
        // 'pptx-modo-captura'. En vez de confiar en chart.resize() (poco
        // fiable tras varios ciclos de display:none/block), se vuelve a
        // renderizar la página completa — los gráficos se crean desde cero
        // leyendo el tamaño real y actual de su contenedor, ya visible.
        const redibujar = ESTADISTICAS_REDIBUJAR_POR_PAGINA[paginaIndice];
        if (redibujar) {
            await redibujar();
            await new Promise(resolve => setTimeout(resolve, 30));
        }

        if (opciones.gridId && opciones.chunkIndex != null) {
            estadisticasAplicarChunkGrid(opciones.gridId, opciones.chunkIndex, ESTADISTICAS_ESPECIALIDADES_POR_LAMINA);
            await new Promise(resolve => setTimeout(resolve, 30));
        }

        let captura;
        try {
            const elemento = document.getElementById(elementoId);
            if (!elemento) throw new Error(`No se encontró el elemento ${elementoId}`);
            const canvas = await html2canvas(elemento, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
            captura = {
                dataUrl: canvas.toDataURL('image/png'),
                width: canvas.width,
                height: canvas.height
            };
        } finally {
            if (opciones.gridId && opciones.chunkIndex != null) estadisticasRestaurarChunkGrid(opciones.gridId);
            if (opciones.modoCaptura) document.body.classList.remove('pptx-modo-captura');
            mostrarPaginaEstadisticas(paginaAnterior);
        }

        estadisticasCapturasCache[claveCache] = captura;
        return captura;
    });
}

// Calcula x/y/w/h (en pulgadas) para que una imagen de anchoPx×altoPx quepa
// completa dentro de la caja [cajaW x cajaH] (en pulgadas) sin deformarse,
// centrada dentro de esa caja empezando en (cajaX, cajaY).
function ajustarImagenAlaCaja(anchoPx, altoPx, cajaX, cajaY, cajaW, cajaH) {
    const ratioImagen = anchoPx / altoPx;
    const ratioCaja = cajaW / cajaH;
    let w, h;
    if (ratioImagen > ratioCaja) {
        w = cajaW;
        h = cajaW / ratioImagen;
    } else {
        h = cajaH;
        w = cajaH * ratioImagen;
    }
    const x = cajaX + (cajaW - w) / 2;
    const y = cajaY + (cajaH - h) / 2;
    return { x, y, w, h };
}

// =============================================================
// 🎥 MODO PRESENTACIÓN (pantalla completa)
// =============================================================
let estadisticasLaminasResueltas = ESTADISTICAS_LAMINAS;

function abrirPresentacionEstadisticas() {
    document.getElementById('estadisticasPresentacionOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'estadisticasPresentacionOverlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:#0b2a4f; z-index:5000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; box-sizing:border-box;';
    document.body.appendChild(overlay);

    // Fuerza a releer el filtro de fecha (y demás filtros) actuales de la
    // pantalla: sin esto, una lámina ya capturada antes con un filtro
    // distinto podía quedar cacheada y reaparecer "pegada" aunque el
    // usuario ya haya cambiado el rango de fechas.
    estadisticasCapturasCache = {};

    // Resuelve las láminas paginables (Producción/Ambulatorio por
    // especialidad) según los datos actuales, antes de empezar a navegar.
    estadisticasLaminasResueltas = estadisticasResolverLaminas();

    // Arranca en la lámina que corresponda a la página donde estaba el
    // usuario (puede no ser 1 a 1 — algunas páginas se dividen en varias
    // láminas o no tienen lámina, como Tiempos por Intervención); si no hay
    // coincidencia, arranca desde el principio.
    const laminaCoincidente = estadisticasLaminasResueltas.findIndex(l => l.pagina === estadisticasPaginaActual);
    estadisticasPresentandoIndice = laminaCoincidente >= 0 ? laminaCoincidente : 0;

    estadisticasManejadorTecladoPresentacion = function(e) {
        if (e.key === 'Escape') cerrarPresentacionEstadisticas();
        else if (e.key === 'ArrowRight') cambiarDiapositivaPresentacion(1);
        else if (e.key === 'ArrowLeft') cambiarDiapositivaPresentacion(-1);
    };
    document.addEventListener('keydown', estadisticasManejadorTecladoPresentacion);

    mostrarDiapositivaPresentacion(estadisticasPresentandoIndice);
}

async function mostrarDiapositivaPresentacion(indice) {
    const overlay = document.getElementById('estadisticasPresentacionOverlay');
    if (!overlay) return;
    estadisticasPresentandoIndice = Math.max(0, Math.min(indice, estadisticasLaminasResueltas.length - 1));
    const lamina = estadisticasLaminasResueltas[estadisticasPresentandoIndice];

    // Token de la solicitud vigente: si el usuario navega de nuevo antes de
    // que esta captura termine, la resolución de ESTA llamada debe ignorarse
    // (si no, podía "pisar" la diapositiva más reciente con una vieja).
    const solicitudId = ++estadisticasPresentacionSolicitudId;

    overlay.innerHTML = `
        <div style="color:white; text-align:center; font-size:1.1rem;">⏳ Generando diapositiva...</div>
    `;

    let captura;
    try {
        captura = await capturarElementoComoImagen(lamina.pagina, lamina.elementoId, { modoCaptura: laminaNecesitaModoCaptura(lamina), gridId: lamina.gridId, chunkIndex: lamina.chunkIndex });
    } catch (error) {
        console.error('❌ Error al generar diapositiva:', error);
        if (solicitudId !== estadisticasPresentacionSolicitudId) return;
        overlay.innerHTML = `<div style="color:white; text-align:center;">❌ No se pudo generar la diapositiva.<br><button id="estadisticasPresentacionCerrarError" style="margin-top:12px; background:white; color:#0b2a4f; border:none; padding:8px 18px; border-radius:20px; cursor:pointer;">Cerrar</button></div>`;
        overlay.querySelector('#estadisticasPresentacionCerrarError')?.addEventListener('click', cerrarPresentacionEstadisticas);
        return;
    }

    // Llegó una solicitud más nueva mientras se generaba esta captura, o el
    // overlay se cerró: no pintar un resultado obsoleto.
    if (solicitudId !== estadisticasPresentacionSolicitudId) return;
    if (!document.getElementById('estadisticasPresentacionOverlay')) return;

    const logoDataUrl = await obtenerLogoDataUrl();
    if (solicitudId !== estadisticasPresentacionSolicitudId) return;

    overlay.innerHTML = `
        <div style="width:100%; display:flex; justify-content:space-between; align-items:center; color:white; margin-bottom:12px; gap:12px;">
            <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                ${logoDataUrl ? `<img src="${logoDataUrl.dataUrl}" style="height:32px; width:auto; flex-shrink:0;">` : ''}
                <div style="font-weight:700; font-size:1rem;">${lamina.titulo}</div>
            </div>
            <button id="estadisticasPresentacionCerrar" style="background:transparent; border:1px solid white; color:white; padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.8rem; flex-shrink:0;">✕ Cerrar (Esc)</button>
        </div>
        <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            <img src="${captura.dataUrl}" style="max-width:100%; max-height:100%; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.4);">
        </div>
        <div style="margin-top:16px; display:flex; align-items:center; gap:20px;">
            <button id="estadisticasPresentacionAnterior" style="background:white; color:#0b2a4f; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.1rem; font-weight:700;">‹</button>
            <span style="color:white; font-size:0.85rem;">${estadisticasPresentandoIndice + 1} / ${estadisticasLaminasResueltas.length}</span>
            <button id="estadisticasPresentacionSiguiente" style="background:white; color:#0b2a4f; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.1rem; font-weight:700;">›</button>
        </div>
    `;

    overlay.style.flexDirection = 'column';
    overlay.querySelector('#estadisticasPresentacionCerrar').addEventListener('click', cerrarPresentacionEstadisticas);
    overlay.querySelector('#estadisticasPresentacionAnterior').addEventListener('click', () => cambiarDiapositivaPresentacion(-1));
    overlay.querySelector('#estadisticasPresentacionSiguiente').addEventListener('click', () => cambiarDiapositivaPresentacion(1));
}

function cambiarDiapositivaPresentacion(delta) {
    const nuevoIndice = estadisticasPresentandoIndice + delta;
    if (nuevoIndice < 0 || nuevoIndice >= estadisticasLaminasResueltas.length) return;
    mostrarDiapositivaPresentacion(nuevoIndice);
}

function cerrarPresentacionEstadisticas() {
    document.getElementById('estadisticasPresentacionOverlay')?.remove();
    if (estadisticasManejadorTecladoPresentacion) {
        document.removeEventListener('keydown', estadisticasManejadorTecladoPresentacion);
        estadisticasManejadorTecladoPresentacion = null;
    }
}

// =============================================================
// ⬇️ EXPORTAR A PPT
// =============================================================
async function descargarPresentacionPpt() {
    const boton = document.getElementById('estadisticasBtnDescargarPpt');
    if (boton) {
        boton.disabled = true;
        boton.textContent = '⏳ Generando...';
    }

    try {
        if (typeof PptxGenJS === 'undefined') {
            throw new Error('PptxGenJS no está disponible');
        }

        // Misma razón que en abrirPresentacionEstadisticas(): evita que una
        // lámina cacheada con un filtro de fecha anterior se cuele en el PPT.
        estadisticasCapturasCache = {};

        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'ESTADISTICAS', width: 13.33, height: 7.5 });
        pptx.layout = 'ESTADISTICAS';

        const logoDataUrl = await obtenerLogoDataUrl();

        const laminas = estadisticasResolverLaminas();
        for (const item of laminas) {
            const captura = await capturarElementoComoImagen(item.pagina, item.elementoId, { modoCaptura: laminaNecesitaModoCaptura(item), gridId: item.gridId, chunkIndex: item.chunkIndex });

            const slide = pptx.addSlide();
            slide.addText(item.titulo, {
                x: 0.3, y: 0.15, w: 11.6, h: 0.5, fontSize: 20, bold: true, color: '0B2A4F'
            });
            if (logoDataUrl) {
                const cajaLogo = ajustarImagenAlaCaja(logoDataUrl.width, logoDataUrl.height, 12.33, 0.1, 0.7, 0.55);
                slide.addImage({ data: logoDataUrl.dataUrl, ...cajaLogo });
            }
            const cajaImagen = ajustarImagenAlaCaja(captura.width, captura.height, 0.3, 0.75, 12.7, 6.5);
            slide.addImage({ data: captura.dataUrl, ...cajaImagen });
        }

        const fechaStr = new Date().toISOString().slice(0, 10);
        await pptx.writeFile({ fileName: `Estadisticas_Hospital_Illapel_${fechaStr}.pptx` });

    } catch (error) {
        console.error('❌ Error al generar PPT:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al generar la presentación PPT.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = '⬇️ Descargar PPT';
        }
    }
}
