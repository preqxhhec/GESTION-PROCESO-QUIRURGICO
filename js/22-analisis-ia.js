// =============================================================
// 🧠 ANÁLISIS IA · INFORME EJECUTIVO
// No es una sección nueva: desde el menú hamburguesa abre un modal para
// elegir un rango de fechas (aplica tanto al Libro de Quirófano como a los
// bloques de Estadísticas elegidos) y con eso arma un informe ejecutivo —
// productividad, ocupación de pabellón, tiempos muertos, horarios de
// entrada/salida AM/PM, promedios — con conclusiones, recomendaciones, plan
// de mejora y metas sugeridas. El "motor de IA" es un motor de
// reglas/umbrales local (sin llamadas a APIs externas): calcula los KPIs
// reales reutilizando las funciones ya existentes de js/18-estadisticas.js y
// redacta el informe con lógica de umbrales. Todas las láminas incluyen el
// período analizado. Ofrece vista previa y descarga en texto (formato
// profesional, imprimible/PDF) y en PPT.
// =============================================================

const ANALISIS_IA_BLOQUES_ESTADISTICAS = [
    { pagina: 0, label: '📊 Programación / Suspensiones' },
    { pagina: 1, label: '🏥 REM (Cmay) / Especialidades Quirúrgicas' },
    { pagina: 2, label: '📈 Producción por Especialidad (Cmay)' },
    { pagina: 3, label: '🚶 Proceso Ambulatorio' },
    { pagina: 4, label: '🏨 Ocupación y Rendimiento Pabellón' },
    { pagina: 6, label: '🤰 Perianalgesia (Parto) por Mes' },
    { pagina: 7, label: '🎯 Cumplimiento de Metas' }
];

let analisisIaBloquesSeleccionados = new Set(ANALISIS_IA_BLOQUES_ESTADISTICAS.map(b => b.pagina));
let analisisIaFechaInicio = '';
let analisisIaFechaFin = '';
let analisisIaUltimoInforme = null;

const ANALISIS_IA_ESTILOS_INFORME = `
    .ia-informe h2 { font-size:1.05rem; color:#0b2a4f; border-bottom:2px solid #e2e8f0; padding-bottom:6px; margin:22px 0 8px; }
    .ia-informe .ia-seccion:first-child h2, .ia-informe .ia-resumen h2 { margin-top:0; }
    .ia-informe p { font-size:0.92rem; line-height:1.6; color:#1e293b; margin:0 0 10px; }
    .ia-informe ul { margin:0 0 10px 18px; padding:0; font-size:0.88rem; line-height:1.7; color:#1e293b; }
    .ia-informe li { margin-bottom:4px; }
    .ia-periodo { font-size:0.72rem; font-weight:600; color:#0e7c7c; background:#e7f7f7; display:inline-block; padding:3px 10px; border-radius:20px; margin-bottom:10px; }
    .ia-imagenes { display:flex; flex-direction:column; gap:16px; margin-top:10px; }
    .ia-imagenes figure { margin:0; width:100%; }
    .ia-imagenes img { width:100%; height:auto; border-radius:8px; border:1px solid #e2e8f0; }
    .ia-imagenes figcaption { font-size:0.72rem; color:#64748b; text-align:center; margin-top:4px; }
    .ia-tabla { width:100%; border-collapse:collapse; font-size:0.85rem; margin-top:6px; }
    .ia-tabla th, .ia-tabla td { border:1px solid #d1d9e6; padding:7px 10px; text-align:left; }
    .ia-tabla th { background:#0b2a4f; color:white; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.3px; }
    .ia-tabla tr:nth-child(even) td { background:#f8fafc; }
`;

// -------------------------------------------------------------
// 🪟 MODAL: elegir rango de fechas (único, para Libro + Estadísticas) y
// los bloques de Estadísticas a incluir.
// -------------------------------------------------------------
function abrirModalAnalisisIA() {
    document.getElementById('analisisIaOverlay')?.remove();

    if (!analisisIaFechaInicio && !analisisIaFechaFin) {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        analisisIaFechaInicio = inicioMes.toISOString().slice(0, 10);
        analisisIaFechaFin = hoy.toISOString().slice(0, 10);
    }

    const overlay = document.createElement('div');
    overlay.id = 'analisisIaOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width:560px; text-align:left;">
            <span class="modal-icon" style="text-align:center; display:block;">🧠</span>
            <div class="modal-title" style="text-align:center;">Análisis IA · Informe Ejecutivo</div>
            <div class="modal-message" style="text-align:center; margin-bottom:16px;">
                Elige el rango de fechas a analizar — se aplica tanto a los pacientes del Libro de Quirófano (productividad, ocupación, tiempos muertos, horarios AM/PM) como a los bloques de Estadísticas que elijas incluir.
            </div>

            <div style="margin-bottom:22px;">
                <span style="font-size:0.8rem; font-weight:700; color:#0b2a4f; display:block; margin-bottom:6px;">📅 Rango de fechas a analizar</span>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <input type="date" id="analisisIaFechaInicio" value="${analisisIaFechaInicio}" style="padding:6px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.85rem;">
                    <span style="font-size:0.8rem; color:#94a3b8;">a</span>
                    <input type="date" id="analisisIaFechaFin" value="${analisisIaFechaFin}" style="padding:6px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.85rem;">
                </div>
            </div>

            <div style="margin-bottom:22px;">
                <span style="font-size:0.8rem; font-weight:700; color:#0b2a4f; display:block; margin-bottom:6px;">📊 Bloques de Estadísticas a incluir (opcional)</span>
                <div id="analisisIaBloquesLista" style="display:flex; flex-direction:column; gap:4px; max-height:180px; overflow-y:auto; border:1px solid #d1d9e6; border-radius:10px; padding:8px;"></div>
            </div>

            <div class="modal-actions">
                <button class="modal-btn modal-btn-cancel" id="analisisIaCancelar">Cancelar</button>
                <button class="modal-btn" id="analisisIaGenerar" style="background:#0b2a4f; color:white; box-shadow:0 4px 12px rgba(11,42,79,0.35);">👁️ Generar Vista Previa</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    renderAnalisisIaBloquesLista();

    document.getElementById('analisisIaFechaInicio').addEventListener('change', function() {
        analisisIaFechaInicio = this.value || '';
    });
    document.getElementById('analisisIaFechaFin').addEventListener('change', function() {
        analisisIaFechaFin = this.value || '';
    });

    document.getElementById('analisisIaCancelar').addEventListener('click', cerrarModalAnalisisIA);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) cerrarModalAnalisisIA();
    });
    document.getElementById('analisisIaGenerar').addEventListener('click', generarAnalisisIA);
}

function renderAnalisisIaBloquesLista() {
    const cont = document.getElementById('analisisIaBloquesLista');
    if (!cont) return;

    let html = `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:4px 2px; border-bottom:1px solid #e2e8f0; margin-bottom:4px; cursor:pointer; font-weight:600;">
        <input type="checkbox" id="analisisIaChkTodos" ${analisisIaBloquesSeleccionados.size === ANALISIS_IA_BLOQUES_ESTADISTICAS.length ? 'checked' : ''}> Todos
    </label>`;
    ANALISIS_IA_BLOQUES_ESTADISTICAS.forEach(b => {
        html += `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:3px 2px; cursor:pointer;">
            <input type="checkbox" class="analisisIaChkBloque" data-pagina="${b.pagina}" ${analisisIaBloquesSeleccionados.has(b.pagina) ? 'checked' : ''}> ${b.label}
        </label>`;
    });
    cont.innerHTML = html;

    document.getElementById('analisisIaChkTodos').addEventListener('change', function() {
        analisisIaBloquesSeleccionados = this.checked ? new Set(ANALISIS_IA_BLOQUES_ESTADISTICAS.map(b => b.pagina)) : new Set();
        renderAnalisisIaBloquesLista();
    });
    cont.querySelectorAll('.analisisIaChkBloque').forEach(chk => {
        chk.addEventListener('change', function() {
            const pagina = parseInt(this.dataset.pagina, 10);
            if (this.checked) analisisIaBloquesSeleccionados.add(pagina);
            else analisisIaBloquesSeleccionados.delete(pagina);
            renderAnalisisIaBloquesLista();
        });
    });
}

function cerrarModalAnalisisIA() {
    document.getElementById('analisisIaOverlay')?.remove();
}

// -------------------------------------------------------------
// 🧮 HELPERS DE FORMATO
// -------------------------------------------------------------
function formatearFechaLegibleAnalisisIA(fechaISO) {
    if (!fechaISO) return '';
    const [y, m, d] = fechaISO.split('-');
    return `${d}/${m}/${y}`;
}

function iaFmtPct(v) {
    return (v || 0).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

function crearHallazgoAnalisisIA(severidad, texto, recomendacion, meta) {
    return { severidad, texto, recomendacion: recomendacion || null, meta: meta || null };
}

// -------------------------------------------------------------
// 🔁 COMPARACIÓN CON PERÍODO ANTERIOR EQUIVALENTE
// Dado el rango analizado, calcula el rango de la misma duración
// inmediatamente anterior (ej. si se analiza el 01–29 feb, el período
// anterior es el 02–31 ene: mismos 29 días). Sirve para responder "¿mejoró
// o empeoró respecto a lo anterior?" en vez de mostrar solo el número suelto.
// -------------------------------------------------------------
function calcularPeriodoAnteriorEquivalente(fechaInicio, fechaFin) {
    const [yI, mI, dI] = fechaInicio.split('-').map(Number);
    const [yF, mF, dF] = fechaFin.split('-').map(Number);
    const inicio = new Date(yI, mI - 1, dI);
    const fin = new Date(yF, mF - 1, dF);
    const diasRango = Math.round((fin - inicio) / 86400000) + 1;

    const finAnterior = new Date(inicio);
    finAnterior.setDate(finAnterior.getDate() - 1);
    const inicioAnterior = new Date(finAnterior);
    inicioAnterior.setDate(inicioAnterior.getDate() - (diasRango - 1));

    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { inicio: fmt(inicioAnterior), fin: fmt(finAnterior), dias: diasRango };
}

// Arma una frase de comparación lista para insertar dentro de un bullet
// (sin punto final). tipo: 'pct' (compara en puntos porcentuales, ej.
// índices) o 'num'/'horas' (compara en variación %, ej. conteos y horas).
function compararConPeriodoAnterior(actual, anterior, tipo, decimales) {
    if (anterior === null || anterior === undefined) {
        return 'sin datos del período anterior equivalente para comparar';
    }
    const formatear = (v) => {
        if (tipo === 'pct') return iaFmtPct(v);
        if (tipo === 'horas') return estadisticasFormatearHoras(v);
        return decimales ? v.toFixed(decimales) : Math.round(v).toLocaleString('es-CL');
    };
    if (tipo === 'pct') {
        const delta = actual - anterior;
        if (Math.abs(delta) < 0.5) return `se mantuvo estable respecto al período anterior (${formatear(anterior)})`;
        const flecha = delta > 0 ? '⬆️ subió' : '⬇️ bajó';
        return `${flecha} ${Math.abs(delta).toFixed(1)} punto(s) porcentuales respecto al período anterior (de ${formatear(anterior)} a ${formatear(actual)})`;
    }
    if (anterior === 0) {
        return actual > 0
            ? `sin actividad comparable en el período anterior equivalente (este período: ${formatear(actual)})`
            : 'sin actividad registrada en ninguno de los dos períodos';
    }
    const deltaPct = ((actual - anterior) / anterior) * 100;
    if (Math.abs(deltaPct) < 3) return `se mantuvo estable respecto al período anterior (${formatear(anterior)})`;
    const flecha = deltaPct > 0 ? '⬆️ subió' : '⬇️ bajó';
    return `${flecha} ${Math.abs(deltaPct).toFixed(0)}% respecto al período anterior (de ${formatear(anterior)} a ${formatear(actual)})`;
}

// -------------------------------------------------------------
// 📈 TENDENCIA dentro de una serie mensual (pendiente de regresión lineal,
// más robusta que comparar solo el primer y el último mes cuando hay ruido
// mes a mes).
// -------------------------------------------------------------
function describirTendenciaSerie(valores, labels, unidad) {
    if (!valores || valores.length < 2) return null;
    const n = valores.length;
    const promedio = valores.reduce((a, b) => a + b, 0) / n;
    const xMean = (n - 1) / 2;
    let num = 0, den = 0;
    valores.forEach((v, i) => { num += (i - xMean) * (v - promedio); den += (i - xMean) ** 2; });
    const pendiente = den !== 0 ? num / den : 0;
    const cambioEstimado = pendiente * (n - 1);
    const umbral = Math.max(1, promedio * 0.08);

    let direccion;
    if (Math.abs(cambioEstimado) < umbral) direccion = 'se mantuvo relativamente estable';
    else if (cambioEstimado > 0) direccion = 'mostró una tendencia creciente';
    else direccion = 'mostró una tendencia decreciente';

    const primero = Math.round(valores[0]);
    const ultimo = Math.round(valores[n - 1]);
    return `La serie mensual ${direccion} a lo largo del periodo: partió en ${primero} ${unidad} en ${labels[0]} y cerró en ${ultimo} ${unidad} en ${labels[n - 1]} (promedio mensual: ${promedio.toFixed(1)} ${unidad}).`;
}

function iaMinutosDesdeHora(horaStr) {
    if (!horaStr) return null;
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + m;
}

function iaFormatearMinutos(mins) {
    if (mins === null || mins === undefined || isNaN(mins)) return null;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// -------------------------------------------------------------
// 📘 LIBRO DE QUIRÓFANO — cálculos propios (productividad, horarios AM/PM)
// Bloques asumidos: AM 08:00–13:00, PM 14:00–17:00 (según la sesión
// definida en el registro). Se calcula entrada Y salida promedio, y —
// cuando el dato de pabellón está disponible — desglosado por pabellón,
// además del análisis general.
// -------------------------------------------------------------
const ANALISIS_IA_BLOQUE_AM = { inicio: '08:00', fin: '13:00', etiqueta: 'AM (08:00–13:00)' };
const ANALISIS_IA_BLOQUE_PM = { inicio: '14:00', fin: '17:00', etiqueta: 'PM (14:00–17:00)' };

function iaRegistroEnBloqueHorario(registro, bloque) {
    const hn = normalizarValorHora(registro.Hora_de_entrada);
    if (!hn) return false;
    return hn >= bloque.inicio && hn < bloque.fin;
}

function calcularPromedioBloqueHorario(registros, bloque) {
    const relevantes = registros.filter(r => r.ESTADO_DE_IQx !== ESTADISTICAS_ESTADO.SUSPENDIDO && iaRegistroEnBloqueHorario(r, bloque));

    // El promedio NO es "promediar la hora de entrada de cada cirugía" —
    // eso mezclaría la 1ra, 2da y 3ra cirugía del bloque en un solo número
    // sin sentido. Lo correcto: por cada día hábil, la hora de INICIO real
    // del bloque es la entrada MÁS TEMPRANA entre sus cirugías, y la hora
    // de CIERRE real del bloque es la salida MÁS TARDÍA — sin techo: si el
    // último caso del bloque sale después del límite del bloque (ej. una
    // cirugía PM que entra antes de las 17:00 pero termina después), ese
    // atraso se cuantifica igual. Luego se promedian esos inicios/cierres
    // diarios a lo largo de todos los días hábiles del rango.
    const porDia = {};
    relevantes.forEach(r => {
        const fecha = normalizarFechaComparable(r.FECHA);
        if (!fecha) return;
        const entradaMin = iaMinutosDesdeHora(normalizarValorHora(r.Hora_de_entrada));
        const salidaMin = iaMinutosDesdeHora(normalizarValorHora(r.Hora_de_salida));
        if (!porDia[fecha]) porDia[fecha] = { entradaMasTemprana: null, salidaMasTardia: null };
        if (entradaMin !== null && (porDia[fecha].entradaMasTemprana === null || entradaMin < porDia[fecha].entradaMasTemprana)) {
            porDia[fecha].entradaMasTemprana = entradaMin;
        }
        if (salidaMin !== null && (porDia[fecha].salidaMasTardia === null || salidaMin > porDia[fecha].salidaMasTardia)) {
            porDia[fecha].salidaMasTardia = salidaMin;
        }
    });

    const dias = Object.keys(porDia);
    const entradasDiarias = dias.map(f => porDia[f].entradaMasTemprana).filter(v => v !== null);
    const salidasDiarias = dias.map(f => porDia[f].salidaMasTardia).filter(v => v !== null);
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const entradaProm = avg(entradasDiarias);
    const salidaProm = avg(salidasDiarias);
    const metaInicioMin = iaMinutosDesdeHora(bloque.inicio);

    return {
        casos: relevantes.length,
        dias: dias.length,
        entradaPromMin: entradaProm,
        salidaPromMin: salidaProm,
        entradaPromTxt: iaFormatearMinutos(entradaProm),
        salidaPromTxt: iaFormatearMinutos(salidaProm),
        atrasoMin: entradaProm !== null ? entradaProm - metaInicioMin : null
    };
}

// Siempre calcula el análisis General (todos los registros); si hay
// registros con pabellón identificado, agrega además el desglose por cada
// pabellón que tenga datos — cubre los 3 casos: todo diferenciado, nada
// diferenciado (solo general) y mixto (general + los pabellones con dato).
function calcularAnalisisHorariosLibro(registros) {
    const ambitos = [{ clave: 'General', registros }];
    const pab1 = registros.filter(r => r.metadata && r.metadata.pabellon === 'PAB 1');
    const pab2 = registros.filter(r => r.metadata && r.metadata.pabellon === 'PAB 2');
    if (pab1.length) ambitos.push({ clave: 'PAB 1', registros: pab1 });
    if (pab2.length) ambitos.push({ clave: 'PAB 2', registros: pab2 });

    return ambitos.map(a => ({
        clave: a.clave,
        am: calcularPromedioBloqueHorario(a.registros, ANALISIS_IA_BLOQUE_AM),
        pm: calcularPromedioBloqueHorario(a.registros, ANALISIS_IA_BLOQUE_PM)
    }));
}

// Filas de tabla [clave, bloque, días/casos, entrada, salida, atraso] a
// partir de una lista de {clave, am, pm} — reusado tanto para el desglose
// por pabellón como por especialidad (misma forma de dato).
function construirFilasTablaHorarios(items) {
    const filas = [];
    items.forEach(item => {
        [[ANALISIS_IA_BLOQUE_AM.etiqueta, item.am], [ANALISIS_IA_BLOQUE_PM.etiqueta, item.pm]].forEach(([etiquetaBloque, datos]) => {
            if (datos.casos === 0) return;
            filas.push([
                item.clave, etiquetaBloque, `${datos.dias} día(s) / ${datos.casos} caso(s)`,
                datos.entradaPromTxt || 's/d', datos.salidaPromTxt || 's/d',
                datos.atrasoMin !== null ? (datos.atrasoMin > 0 ? `+${Math.round(datos.atrasoMin)} min` : 'a tiempo') : 's/d'
            ]);
        });
    });
    return filas;
}

// Comportamiento de cada especialidad — SOLO cirugías electivas (mismo
// criterio que "producción" en REM: excluye Suspendido, Urgencia,
// Condicional No Operado y Perianalgesia, ver REM_ESTADOS_EXCLUIDOS_GENERAL)
// — producción, ocupación de pabellón y horarios de bloque AM/PM.
function calcularComportamientoPorEspecialidad(registros) {
    const electivas = registros.filter(r => !REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx));
    const horasTotalesElectivas = electivas.reduce((acc, r) => acc + duracionConVirajeHoras(r), 0);

    const porEspecialidad = {};
    electivas.forEach(r => {
        const esp = r.Especialidad || 'Sin especialidad';
        if (!porEspecialidad[esp]) porEspecialidad[esp] = [];
        porEspecialidad[esp].push(r);
    });

    return Object.keys(porEspecialidad).sort().map(esp => {
        const regs = porEspecialidad[esp];
        const horas = regs.reduce((acc, r) => acc + duracionConVirajeHoras(r), 0);
        return {
            especialidad: esp,
            produccion: regs.length,
            horas,
            pctDelTotal: estadisticasDivide(horas, horasTotalesElectivas),
            am: calcularPromedioBloqueHorario(regs, ANALISIS_IA_BLOQUE_AM),
            pm: calcularPromedioBloqueHorario(regs, ANALISIS_IA_BLOQUE_PM)
        };
    }).sort((a, b) => b.produccion - a.produccion);
}

function calcularProductividadLibro(registros) {
    const total = registros.length;

    const porEstado = {};
    registros.forEach(r => {
        const st = r.ESTADO_DE_IQx || 'Sin estado';
        porEstado[st] = (porEstado[st] || 0) + 1;
    });

    const porPabellon = { 'PAB 1': 0, 'PAB 2': 0, 'Sin Pabellón': 0 };
    registros.forEach(r => {
        const pab = r.metadata && r.metadata.pabellon;
        if (pab === 'PAB 1' || pab === 'PAB 2') porPabellon[pab]++;
        else porPabellon['Sin Pabellón']++;
    });

    const duraciones = registros.map(r => parsearDuracionHoras(r.T_QX)).filter(v => v > 0);
    const promedioDuracionHoras = duraciones.length ? duraciones.reduce((a, b) => a + b, 0) / duraciones.length : 0;

    const fechasUnicas = new Set(registros.map(r => normalizarFechaComparable(r.FECHA)).filter(Boolean));
    const casosPorDiaPromedio = fechasUnicas.size ? total / fechasUnicas.size : 0;

    return { total, porEstado, porPabellon, promedioDuracionHoras, diasConDatos: fechasUnicas.size, casosPorDiaPromedio };
}

function agruparCasosPorFechaAnalisisIA(registros) {
    const porFecha = {};
    registros.forEach(r => {
        const f = normalizarFechaComparable(r.FECHA);
        if (!f) return;
        porFecha[f] = (porFecha[f] || 0) + 1;
    });
    return porFecha;
}

// Productividad mensual del periodo filtrado (reusa generarBucketsMensuales
// de js/18-estadisticas.js) — un bucket por mes entre fechaInicio y fechaFin.
function construirSerieProductividadMensualAnalisisIA(registros, fechaInicio, fechaFin) {
    const buckets = generarBucketsMensuales(fechaInicio, fechaFin);
    const porClave = {};
    buckets.forEach(b => { porClave[b.key] = 0; });
    registros.forEach(r => {
        const f = normalizarFechaComparable(r.FECHA);
        if (!f) return;
        const key = f.slice(0, 7);
        if (porClave[key] !== undefined) porClave[key]++;
    });
    return { labels: buckets.map(b => b.label), valores: buckets.map(b => porClave[b.key]) };
}

// -------------------------------------------------------------
// 📊 GRÁFICOS NUEVOS (creados solo para este informe, capturados con
// html2canvas igual que el resto de la app — ver js/18/js/19).
// -------------------------------------------------------------
async function capturarChartNuevoAnalisisIA(chartConfig, anchoPx, altoPx) {
    if (typeof Chart === 'undefined' || typeof html2canvas === 'undefined') return null;

    const contenedor = document.createElement('div');
    contenedor.style.cssText = `position:fixed; left:-99999px; top:0; z-index:-1; width:${anchoPx}px; height:${altoPx}px; background:#ffffff; padding:16px; box-sizing:border-box;`;
    const canvas = document.createElement('canvas');
    canvas.width = anchoPx - 32;
    canvas.height = altoPx - 32;
    contenedor.appendChild(canvas);
    document.body.appendChild(contenedor);

    const chart = new Chart(canvas.getContext('2d'), chartConfig);
    await new Promise(resolve => setTimeout(resolve, 60));

    let captura = null;
    try {
        const lienzo = await html2canvas(contenedor, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
        captura = { dataUrl: lienzo.toDataURL('image/png'), width: lienzo.width, height: lienzo.height };
    } finally {
        chart.destroy();
        document.body.removeChild(contenedor);
    }
    return captura;
}

// Entrada y salida promedio de los bloques AM/PM (ámbito General) vs. los
// límites de cada bloque.
function configChartHorariosAnalisisIA(general) {
    return {
        type: 'bar',
        data: {
            labels: ['AM Entrada', 'AM Salida', 'PM Entrada', 'PM Salida'],
            datasets: [
                {
                    label: 'Promedio real',
                    data: [
                        general.am.entradaPromMin !== null ? general.am.entradaPromMin / 60 : 0,
                        general.am.salidaPromMin !== null ? general.am.salidaPromMin / 60 : 0,
                        general.pm.entradaPromMin !== null ? general.pm.entradaPromMin / 60 : 0,
                        general.pm.salidaPromMin !== null ? general.pm.salidaPromMin / 60 : 0
                    ],
                    labelsTexto: [
                        general.am.entradaPromTxt || 's/d', general.am.salidaPromTxt || 's/d',
                        general.pm.entradaPromTxt || 's/d', general.pm.salidaPromTxt || 's/d'
                    ],
                    backgroundColor: '#1a6d8a', borderRadius: 4
                },
                {
                    label: 'Límite de bloque',
                    data: [8, 13, 14, 17],
                    labelsTexto: ['08:00', '13:00', '14:00', '17:00'],
                    backgroundColor: '#94a3b8', borderRadius: 4
                }
            ]
        },
        options: {
            responsive: false, maintainAspectRatio: false,
            layout: { padding: { top: 24 } },
            plugins: { legend: { display: true, position: 'top' } },
            scales: { y: { min: 6, max: 18, ticks: { callback: v => estadisticasFormatearHoras(v) } } }
        }
    };
}

function configChartUsoTiempoAnalisisIA(horasTrabajadas, tiemposMuertos) {
    const muertos = Math.max(0, tiemposMuertos);
    return {
        type: 'doughnut',
        data: {
            labels: [
                `Horas Trabajadas (${estadisticasFormatearHoras(horasTrabajadas)})`,
                `Tiempo Muerto (${estadisticasFormatearHoras(muertos)})`
            ],
            datasets: [{ data: [horasTrabajadas, muertos], backgroundColor: ['#0e7c7c', '#c0392b'] }]
        },
        options: {
            responsive: false, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 13 } } } }
        }
    };
}

function configChartProductividadMensualAnalisisIA(serie) {
    return {
        type: 'bar',
        data: { labels: serie.labels, datasets: [{ label: 'Casos', data: serie.valores, backgroundColor: '#1a6d8a', borderRadius: 4 }] },
        options: {
            responsive: false, maintainAspectRatio: false,
            layout: { padding: { top: 20 } },
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    };
}

// -------------------------------------------------------------
// 📘 SECCIÓN: Libro de Quirófano — Productividad y Ocupación
// -------------------------------------------------------------
async function analizarLibroQuirofano(fechaInicio, fechaFin, hallazgos, periodoAnterior) {
    const registros = filtrarRegistrosPorFechaEstadisticas(estadisticasRegistros, fechaInicio, fechaFin);
    const diasHabiles = calcularDiasHabiles(fechaInicio, fechaFin);
    const kpisOcup = calcularKpisOcupacion(registros, diasHabiles);
    const kpisInhabil = calcularKpisHorarioInhabil(registros);
    const analisisHorarios = calcularAnalisisHorariosLibro(registros);
    const productividad = calcularProductividadLibro(registros);
    const comportamientoEsp = calcularComportamientoPorEspecialidad(registros);

    const tiemposMuertos = Math.max(0, kpisOcup.horasHabilitadas - kpisOcup.horasTrabajadas);
    const pctTiempoMuerto = estadisticasDivide(tiemposMuertos, kpisOcup.horasHabilitadas);

    // Mismos cálculos, aplicados al período anterior equivalente (misma
    // cantidad de días, inmediatamente antes) — es lo que permite comparar
    // en vez de solo mostrar el número suelto del período actual.
    let anterior = null;
    if (periodoAnterior) {
        const registrosAnt = filtrarRegistrosPorFechaEstadisticas(estadisticasRegistros, periodoAnterior.inicio, periodoAnterior.fin);
        const diasHabilesAnt = calcularDiasHabiles(periodoAnterior.inicio, periodoAnterior.fin);
        const kpisOcupAnt = calcularKpisOcupacion(registrosAnt, diasHabilesAnt);
        const productividadAnt = calcularProductividadLibro(registrosAnt);
        anterior = {
            rangoTxt: `${formatearFechaLegibleAnalisisIA(periodoAnterior.inicio)}–${formatearFechaLegibleAnalisisIA(periodoAnterior.fin)}`,
            total: productividadAnt.total,
            casosPorDiaPromedio: productividadAnt.casosPorDiaPromedio,
            porcentajeOcupacion: kpisOcupAnt.porcentajeOcupacion,
            promedioDuracionHoras: productividadAnt.promedioDuracionHoras,
            tiemposMuertos: Math.max(0, kpisOcupAnt.horasHabilitadas - kpisOcupAnt.horasTrabajadas)
        };
    }

    const bullets = [];
    bullets.push(`Entre el ${formatearFechaLegibleAnalisisIA(fechaInicio)} y el ${formatearFechaLegibleAnalisisIA(fechaFin)} se registraron ${productividad.total} intervenciones en el Libro de Quirófano, distribuidas en ${productividad.diasConDatos} día(s) con actividad de un total de ${diasHabiles.length} día(s) hábil(es) en el periodo — es decir, hubo actividad quirúrgica en ${estadisticasDivide(productividad.diasConDatos, diasHabiles.length || 1).toFixed(0)}% de los días hábiles disponibles.${anterior ? ` Frente al período anterior equivalente (${anterior.rangoTxt}, ${anterior.total} intervenciones), el total ${compararConPeriodoAnterior(productividad.total, anterior.total, 'num')}.` : ''}`);
    bullets.push(`Distribución por pabellón: PAB 1 concentró ${productividad.porPabellon['PAB 1']} caso(s) y PAB 2 concentró ${productividad.porPabellon['PAB 2']} caso(s)${productividad.porPabellon['Sin Pabellón'] ? `; ${productividad.porPabellon['Sin Pabellón']} caso(s) no tienen pabellón asignado en el registro` : ''}. Esta distribución permite ver si la carga quirúrgica está equilibrada entre ambos pabellones o concentrada en uno de ellos.`);
    bullets.push(`Productividad: ${productividad.casosPorDiaPromedio.toFixed(1)} casos por día en promedio, considerando solo los días en que efectivamente hubo registros (no se diluye el promedio con días sin actividad, como fines de semana o feriados).${anterior ? ` Esto ${compararConPeriodoAnterior(productividad.casosPorDiaPromedio, anterior.casosPorDiaPromedio, 'num', 1)} respecto al período anterior.` : ''}`);
    bullets.push(`Ocupación de pabellón: ${iaFmtPct(kpisOcup.porcentajeOcupacion)} — de las ${estadisticasFormatearHoras(kpisOcup.horasHabilitadas)} de pabellón disponibles en horario hábil (08:00–17:00) durante el periodo, se trabajaron efectivamente ${estadisticasFormatearHoras(kpisOcup.horasTrabajadas)} (incluye el tiempo de viraje/aseo entre cirugías). Este indicador resume qué tan aprovechada está la capacidad instalada de pabellón.${anterior ? ` La ocupación ${compararConPeriodoAnterior(kpisOcup.porcentajeOcupacion, anterior.porcentajeOcupacion, 'pct')}.` : ''}`);
    bullets.push(`Tiempo muerto de pabellón: ${estadisticasFormatearHoras(tiemposMuertos)} (${iaFmtPct(pctTiempoMuerto)} del tiempo habilitado) — corresponde al tiempo de pabellón disponible que NO se utilizó, ya sea por bloques sin pacientes programados, suspensiones o baja programación en ciertos días.${productividad.promedioDuracionHoras > 0 ? ` En términos concretos, ese tiempo perdido equivale aproximadamente a ${Math.floor(tiemposMuertos / productividad.promedioDuracionHoras)} cirugía(s) adicional(es) que podrían haberse realizado con la duración promedio del periodo, de haberse aprovechado por completo.` : ''}${anterior ? ` El tiempo muerto ${compararConPeriodoAnterior(tiemposMuertos, anterior.tiemposMuertos, 'horas')}.` : ''}`);
    bullets.push(`Duración promedio de intervención (T. Qx): ${estadisticasFormatearHoras(productividad.promedioDuracionHoras)}, considerando todas las intervenciones con duración registrada en el periodo.${anterior ? ` La duración promedio ${compararConPeriodoAnterior(productividad.promedioDuracionHoras, anterior.promedioDuracionHoras, 'horas')} — un cambio sostenido en este número impacta directamente cuántos pacientes caben en cada bloque de pabellón.` : ''}`);
    bullets.push(`Cirugías realizadas en horario inhábil (fuera de 08:00–17:00): ${kpisInhabil.totalCirugias} caso(s), equivalentes a ${estadisticasFormatearHoras(kpisInhabil.horasTrabajadas)} de pabellón, de las cuales ${kpisInhabil.totalUrgencias} fueron urgencias — el resto son cirugías electivas que se extendieron fuera del horario hábil. Cada cirugía electiva fuera de horario implica costo de horas extraordinarias de personal y mayor riesgo de fatiga del equipo quirúrgico.`);

    const generalHorarios = analisisHorarios[0];
    if (generalHorarios.am.casos > 0) {
        bullets.push(`Bloque AM (límite 08:00–13:00): el inicio real del bloque (la cirugía más temprana del día) promedió ${generalHorarios.am.entradaPromTxt || 's/d'} y el cierre real (la salida más tardía del día, sin techo — si la última cirugía se extendió después de las 13:00, ese atraso se cuenta) promedió ${generalHorarios.am.salidaPromTxt || 's/d'}, calculado sobre ${generalHorarios.am.dias} día(s) hábil(es) con actividad AM (${generalHorarios.am.casos} caso(s) en total). Este promedio se calcula por día — no promediando la hora de entrada de cada cirugía por separado — para reflejar cuándo realmente abre y cierra el bloque cada jornada.`);
    }
    if (generalHorarios.pm.casos > 0) {
        bullets.push(`Bloque PM (límite 14:00–17:00): el inicio real del bloque promedió ${generalHorarios.pm.entradaPromTxt || 's/d'} y el cierre real (incluyendo el tiempo posterior a las 17:00 cuando la última cirugía se extiende más allá del límite) promedió ${generalHorarios.pm.salidaPromTxt || 's/d'}, calculado sobre ${generalHorarios.pm.dias} día(s) hábil(es) con actividad PM (${generalHorarios.pm.casos} caso(s) en total).`);
    }
    if (analisisHorarios.length > 1) {
        const pabConDatos = analisisHorarios.slice(1).map(a => a.clave).join(', ');
        bullets.push(`Se cuenta con dato de pabellón para ${pabConDatos}: además del análisis general de arriba, la tabla adjunta desglosa estos mismos horarios de entrada/salida por bloque para cada pabellón que tiene el dato — útil para comparar puntualidad y cierre entre PAB 1 y PAB 2 por separado.`);
    } else {
        bullets.push('Los registros del periodo no tienen pabellón diferenciado, por lo que el análisis de horarios es general (no fue posible desglosar por PAB 1 / PAB 2 en este rango).');
    }

    // Comportamiento por especialidad — solo cirugías electivas (excluye
    // suspendidas, urgencias, condicional no operado y perianalgesia).
    if (comportamientoEsp.length > 0) {
        const topProduccion = comportamientoEsp[0];
        const topOcupacion = [...comportamientoEsp].sort((a, b) => b.horas - a.horas)[0];
        bullets.push(`Comportamiento por especialidad (solo cirugías electivas — se excluyen suspendidas, urgencias y condicional no operado): se identificaron ${comportamientoEsp.length} especialidad(es) con producción electiva en el periodo. ${topProduccion.especialidad} lidera en producción con ${topProduccion.produccion} cirugía(s) electiva(s); ${topOcupacion.especialidad} es la que más tiempo de pabellón ocupó, con ${estadisticasFormatearHoras(topOcupacion.horas)} (${iaFmtPct(topOcupacion.pctDelTotal)} del tiempo electivo total trabajado). El detalle completo de producción, ocupación y horarios de bloque AM/PM por cada especialidad se incluye en las tablas adjuntas.`);
    }

    // Hallazgo concreto (no solo la sugerencia de "revisar"): día de menor y
    // mayor actividad dentro del periodo analizado.
    const porFecha = agruparCasosPorFechaAnalisisIA(registros);
    const fechasConDatos = Object.keys(porFecha);
    if (fechasConDatos.length > 1) {
        let fechaMin = fechasConDatos[0];
        let fechaMax = fechasConDatos[0];
        fechasConDatos.forEach(f => {
            if (porFecha[f] < porFecha[fechaMin]) fechaMin = f;
            if (porFecha[f] > porFecha[fechaMax]) fechaMax = f;
        });
        bullets.push(`Día con menor actividad registrada: ${formatearFechaLegibleAnalisisIA(fechaMin)} (${porFecha[fechaMin]} caso(s)). Día con mayor actividad: ${formatearFechaLegibleAnalisisIA(fechaMax)} (${porFecha[fechaMax]} caso(s)).`);
    }

    if (kpisOcup.horasHabilitadas > 0) {
        if (kpisOcup.porcentajeOcupacion < 60) {
            hallazgos.push(crearHallazgoAnalisisIA('alerta',
                `La ocupación de pabellón (${iaFmtPct(kpisOcup.porcentajeOcupacion)}) está muy por debajo del nivel esperado (≥80%).`,
                'Revisar la programación quirúrgica y los criterios de asignación de bloques AM/PM para reducir el tiempo de pabellón sin uso.',
                { metrica: 'Ocupación de pabellón', actual: iaFmtPct(kpisOcup.porcentajeOcupacion), metaSugerida: `${Math.min(85, Math.round(kpisOcup.porcentajeOcupacion + 15))}% en 3 meses` }
            ));
        } else if (kpisOcup.porcentajeOcupacion < 80) {
            hallazgos.push(crearHallazgoAnalisisIA('atencion',
                `La ocupación de pabellón (${iaFmtPct(kpisOcup.porcentajeOcupacion)}) es aceptable pero tiene margen de mejora respecto a la meta de 80%.`,
                'Reforzar la programación en los bloques identificados con menor actividad (ver detalle de días en este informe).',
                { metrica: 'Ocupación de pabellón', actual: iaFmtPct(kpisOcup.porcentajeOcupacion), metaSugerida: '80% en 3 meses' }
            ));
        } else {
            hallazgos.push(crearHallazgoAnalisisIA('positivo', `La ocupación de pabellón (${iaFmtPct(kpisOcup.porcentajeOcupacion)}) alcanza un buen nivel de uso.`, null, null));
        }
    }

    if (generalHorarios.am.atrasoMin !== null && generalHorarios.am.atrasoMin > 15) {
        hallazgos.push(crearHallazgoAnalisisIA('alerta',
            `El inicio del bloque AM presenta un atraso promedio de ${Math.round(generalHorarios.am.atrasoMin)} minutos respecto al límite (08:00).`,
            'Reforzar la puntualidad de ingreso del equipo quirúrgico y la preparación previa del paciente/pabellón para la primera cirugía del bloque AM.',
            { metrica: 'Atraso inicio AM', actual: `${Math.round(generalHorarios.am.atrasoMin)} min`, metaSugerida: '≤10 min en 2 meses' }
        ));
    }
    if (generalHorarios.pm.atrasoMin !== null && generalHorarios.pm.atrasoMin > 15) {
        hallazgos.push(crearHallazgoAnalisisIA('alerta',
            `El inicio del bloque PM presenta un atraso promedio de ${Math.round(generalHorarios.pm.atrasoMin)} minutos respecto al límite (14:00).`,
            'Optimizar el tiempo de aseo/viraje del pabellón durante la colación (13:00–14:00) y anticipar el ingreso del paciente del bloque PM.',
            { metrica: 'Atraso inicio PM', actual: `${Math.round(generalHorarios.pm.atrasoMin)} min`, metaSugerida: '≤10 min en 2 meses' }
        ));
    }
    if (kpisOcup.horasHabilitadas > 0 && pctTiempoMuerto > 25) {
        hallazgos.push(crearHallazgoAnalisisIA('alerta',
            `El tiempo muerto de pabellón (${iaFmtPct(pctTiempoMuerto)} del tiempo habilitado) es elevado.`,
            'Analizar las causas de los bloques sin actividad (suspensiones tardías, falta de pacientes programados, atrasos) y ajustar la programación, priorizando el/los día(s) de menor actividad detectados en este informe.',
            { metrica: 'Tiempo muerto', actual: iaFmtPct(pctTiempoMuerto), metaSugerida: `${Math.max(10, Math.round(pctTiempoMuerto - 10))}% en 3 meses` }
        ));
    }

    if (comportamientoEsp.length > 1) {
        const menosOcupada = [...comportamientoEsp].sort((a, b) => a.horas - b.horas)[0];
        if (menosOcupada.pctDelTotal < 5) {
            hallazgos.push(crearHallazgoAnalisisIA('atencion',
                `La especialidad ${menosOcupada.especialidad} tuvo muy baja producción/ocupación electiva en el periodo (${menosOcupada.produccion} caso(s), ${iaFmtPct(menosOcupada.pctDelTotal)} del tiempo electivo trabajado).`,
                `Revisar con ${menosOcupada.especialidad} la disponibilidad de cupos/bloques asignados y si hay demanda de pacientes en espera que no se está programando.`,
                null
            ));
        }
    }

    // Tabla de horarios por bloque (general + por pabellón cuando hay dato).
    // Entrada Prom. = promedio de la hora MÁS TEMPRANA del bloque por día;
    // Salida Prom. = promedio de la hora MÁS TARDÍA del bloque por día (sin
    // techo — si el último caso se extiende más allá del límite, se cuenta).
    const tablas = [];
    const filasHorariosPabellon = construirFilasTablaHorarios(analisisHorarios);
    if (filasHorariosPabellon.length) {
        tablas.push({
            titulo: 'Horarios de Entrada/Salida por Bloque' + (analisisHorarios.length > 1 ? ' y Pabellón' : ''),
            headers: ['Ámbito', 'Bloque', 'Días / Casos', 'Entrada Prom.', 'Salida Prom.', 'Atraso vs. Límite'],
            filas: filasHorariosPabellon
        });
    }

    // Producción y ocupación por especialidad (solo cirugías electivas).
    if (comportamientoEsp.length) {
        tablas.push({
            titulo: 'Producción y Ocupación por Especialidad (Solo Cirugías Electivas)',
            headers: ['Especialidad', 'Producción (casos)', 'Horas de Pabellón', '% del Tiempo Electivo Trabajado'],
            filas: comportamientoEsp.map(e => [
                e.especialidad, String(e.produccion), estadisticasFormatearHoras(e.horas), iaFmtPct(e.pctDelTotal)
            ])
        });

        const filasHorariosEsp = construirFilasTablaHorarios(comportamientoEsp.map(e => ({ clave: e.especialidad, am: e.am, pm: e.pm })));
        if (filasHorariosEsp.length) {
            tablas.push({
                titulo: 'Horarios de Bloque AM/PM por Especialidad (Solo Cirugías Electivas)',
                headers: ['Especialidad', 'Bloque', 'Días / Casos', 'Entrada Prom.', 'Salida Prom.', 'Atraso vs. Límite'],
                filas: filasHorariosEsp
            });
        }
    }

    const imagenes = [];
    const chartHorarios = await capturarChartNuevoAnalisisIA(configChartHorariosAnalisisIA(generalHorarios), 820, 460);
    if (chartHorarios) imagenes.push({ titulo: 'Hora de Entrada/Salida Promedio AM/PM vs Límite de Bloque', ...chartHorarios });
    const chartUso = await capturarChartNuevoAnalisisIA(configChartUsoTiempoAnalisisIA(kpisOcup.horasTrabajadas, tiemposMuertos), 620, 460);
    if (chartUso) imagenes.push({ titulo: 'Uso del Tiempo de Pabellón', ...chartUso });
    const serieProductividad = construirSerieProductividadMensualAnalisisIA(registros, fechaInicio, fechaFin);
    if (serieProductividad.labels.length > 1) {
        const chartProductividad = await capturarChartNuevoAnalisisIA(configChartProductividadMensualAnalisisIA(serieProductividad), 900, 420);
        if (chartProductividad) imagenes.push({ titulo: 'Productividad Mensual (casos por mes) del Periodo Filtrado', ...chartProductividad });
        const textoTendencia = describirTendenciaSerie(serieProductividad.valores, serieProductividad.labels, 'caso(s)');
        if (textoTendencia) bullets.push(textoTendencia);
    }

    return { titulo: '📘 Libro de Quirófano — Productividad y Ocupación', bullets, tablas, imagenes };
}

// -------------------------------------------------------------
// 📊 SECCIONES: bloques de Estadísticas
// -------------------------------------------------------------
// Año transcurrido a la fecha (0–100%): sirve para juzgar si el % de una
// meta anual va "a buen ritmo" o "atrasada" — no basta con mirar el % de
// cumplimiento solo, hay que compararlo contra cuánto del año ya pasó.
function calcularRitmoEsperadoAnio(anio) {
    const hoy = new Date();
    if (anio < hoy.getFullYear()) return 100;
    if (anio > hoy.getFullYear()) return 0;
    const inicioAnio = new Date(anio, 0, 1);
    const finAnio = new Date(anio, 11, 31);
    const diasTranscurridos = Math.floor((hoy - inicioAnio) / 86400000) + 1;
    const diasTotales = Math.floor((finAnio - inicioAnio) / 86400000) + 1;
    return Math.min(100, (diasTranscurridos / diasTotales) * 100);
}

// Serie mensual de intervenciones Cmay electivas (excluye lo mismo que
// REM_ESTADOS_EXCLUIDOS_GENERAL) — usada para describir la tendencia de
// producción en el bloque "Producción por Especialidad".
function construirSerieCmayMensualAnalisisIA(registros, fechaInicio, fechaFin) {
    const buckets = generarBucketsMensuales(fechaInicio, fechaFin);
    const porClave = {};
    buckets.forEach(b => { porClave[b.key] = 0; });
    registros.forEach(r => {
        if (REM_ESTADOS_EXCLUIDOS_GENERAL.includes(r.ESTADO_DE_IQx)) return;
        const f = normalizarFechaComparable(r.FECHA);
        if (!f || porClave[f.slice(0, 7)] === undefined) return;
        porClave[f.slice(0, 7)] += [r.Tipo_Actividad, r.Tipo_Actividad_2, r.Tipo_Actividad_3].filter(t => t === 'Cmay').length;
    });
    return { labels: buckets.map(b => b.label), valores: buckets.map(b => porClave[b.key]) };
}

function analizarBloqueEstadisticas(pagina, hallazgos, periodoAnterior) {
    const registrosFiltrados = filtrarRegistrosPorFechaEstadisticas(estadisticasRegistros, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin);
    // Registros del período anterior equivalente, con las MISMAS fechas de
    // Estadísticas usadas por este bloque (no las de Libro de Quirófano, que
    // pueden diferir si el usuario cambió el rango después de generar esa
    // sección) — se recalculan aquí para no arrastrar estado entre bloques.
    const registrosAnt = periodoAnterior ? filtrarRegistrosPorFechaEstadisticas(estadisticasRegistros, periodoAnterior.inicio, periodoAnterior.fin) : null;

    if (pagina === 0) {
        const kpis = calcularKPIsEstadisticas(registrosFiltrados);
        const kpisAnt = registrosAnt ? calcularKPIsEstadisticas(registrosAnt) : null;
        const bullets = [
            `Se programaron ${kpis.totalProgramados} pacientes en el periodo (${kpis.progCmay} de ellos Cmay), de los cuales ${kpis.totalSuspendidos} terminaron suspendidos (${kpis.suspCmay} Cmay) — es decir, no se concretó la cirugía en la fecha programada.${kpisAnt ? ` Los pacientes programados ${compararConPeriodoAnterior(kpis.totalProgramados, kpisAnt.totalProgramados, 'num')} y las suspensiones ${compararConPeriodoAnterior(kpis.totalSuspendidos, kpisAnt.totalSuspendidos, 'num')} frente al período anterior equivalente.` : ''}`,
            `El índice de suspensión Cmay del periodo es ${iaFmtPct(kpis.indiceSuspension)} (${iaFmtPct(kpis.indiceSuspensionSinUrgencia)} si se excluyen los reemplazos por urgencia, que no son evitables por gestión de programación). Este indicador mide qué proporción de lo programado no llegó a operarse.${kpisAnt ? ` El índice ${compararConPeriodoAnterior(kpis.indiceSuspension, kpisAnt.indiceSuspension, 'pct')} — cada punto porcentual representa aproximadamente ${Math.round(kpis.progCmay / 100)} paciente(s) Cmay reprogramado(s), con el consiguiente tiempo de pabellón perdido y demora adicional en la lista de espera.` : ''}`,
            `Total de pacientes efectivamente operados: ${kpis.totalOperados}, sumando programados que se concretaron, agregados (${kpis.totalAgregados}), condicionales operados (${kpis.totalCondOperados}) y urgencias (${kpis.totalUrgencia}).${kpisAnt ? ` Este total ${compararConPeriodoAnterior(kpis.totalOperados, kpisAnt.totalOperados, 'num')}.` : ''}`,
            `Índice de ambulatorización (Cmay programado → destino CMA): ${iaFmtPct(kpis.indiceAmbulatorizacion)} — refleja qué porcentaje de la cirugía mayor programada se resolvió por vía ambulatoria en vez de con hospitalización.${kpisAnt ? ` ${compararConPeriodoAnterior(kpis.indiceAmbulatorizacion, kpisAnt.indiceAmbulatorizacion, 'pct')} — subir este índice reduce directamente los días-cama de hospitalización usados.` : ''}`
        ];
        if (kpis.progCmay > 0 && kpis.indiceSuspension > 10) {
            hallazgos.push(crearHallazgoAnalisisIA('alerta',
                `El índice de suspensión Cmay (${iaFmtPct(kpis.indiceSuspension)}) supera el umbral de referencia (10%).`,
                'Reforzar la evaluación preoperatoria y la confirmación de pacientes con 48-72h de anticipación para reducir suspensiones evitables.',
                { metrica: 'Índice de suspensión Cmay', actual: iaFmtPct(kpis.indiceSuspension), metaSugerida: '≤8% en 3 meses' }
            ));
        }
        return { titulo: '📊 Programación / Suspensiones', bullets };
    }

    if (pagina === 1) {
        const kpisRem = calcularKpisRem(filtrarRegistrosRem(estadisticasRegistros));
        let kpisRemAnt = null;
        if (periodoAnterior) {
            // filtrarRegistrosRem() lee el filtro global de fechas en vez de
            // recibirlas por parámetro — se cambia temporalmente al período
            // anterior solo para este cálculo y se restaura enseguida.
            const inicioPrevio = estadisticasFiltroFechaInicio;
            const finPrevio = estadisticasFiltroFechaFin;
            estadisticasFiltroFechaInicio = periodoAnterior.inicio;
            estadisticasFiltroFechaFin = periodoAnterior.fin;
            try {
                kpisRemAnt = calcularKpisRem(filtrarRegistrosRem(estadisticasRegistros));
            } finally {
                estadisticasFiltroFechaInicio = inicioPrevio;
                estadisticasFiltroFechaFin = finPrevio;
            }
        }
        const bullets = [
            `Producción total (REM): ${kpisRem.totales.total} intervenciones registradas (Cmay: ${kpisRem.totales.cmay}, Cmen: ${kpisRem.totales.cmen}, Proc: ${kpisRem.totales.proc}) — cada fila puede aportar hasta 3 intervenciones (1ra, 2da, 3ra), por eso este total puede superar el número de pacientes. Este total NO incluye las intervenciones de urgencia, que se excluyen de la producción general y se contabilizan aparte.${kpisRemAnt ? ` La producción total ${compararConPeriodoAnterior(kpisRem.totales.total, kpisRemAnt.totales.total, 'num')} respecto al período anterior equivalente.` : ''}`,
            `Por separado, se registraron ${kpisRem.urgencia.total} intervenciones de urgencia (Cmay: ${kpisRem.urgencia.cmay}, Cmen: ${kpisRem.urgencia.cmen}, Proc: ${kpisRem.urgencia.proc}) — al no ser programables con anticipación, no se suman a la producción general de arriba, pero sí reflejan carga real de pabellón.${kpisRemAnt ? ` Las urgencias ${compararConPeriodoAnterior(kpisRem.urgencia.total, kpisRemAnt.urgencia.total, 'num')} — un alza sostenida de urgencias suele presionar tanto la disponibilidad de pabellón como el descanso del equipo de guardia.` : ''}`,
            `Distribución etaria de Cmay (dentro de la producción general, sin urgencias): ${kpisRem.edad.mayores} intervenciones en pacientes ≥15 años y ${kpisRem.edad.menores} en <15 años, siguiendo el criterio de clasificación REM adulto/pediátrico.`
        ];
        return { titulo: '🏥 REM (Cmay) / Especialidades Quirúrgicas', bullets };
    }

    if (pagina === 2) {
        const bullets = ['Se adjunta la evolución mensual de producción por especialidad (pacientes Cmay operados vs. intervenciones Cmay registradas), mostrada de a 2 especialidades por lámina en tamaño grande — si hay más de 2, se generan láminas adicionales.'];
        const serieCmay = construirSerieCmayMensualAnalisisIA(registrosFiltrados, estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin);
        const textoTendencia = describirTendenciaSerie(serieCmay.valores, serieCmay.labels, 'intervención(es) Cmay');
        if (textoTendencia) bullets.push(`Tendencia agregada de todas las especialidades: ${textoTendencia.charAt(0).toLowerCase()}${textoTendencia.slice(1)}`);
        return { titulo: '📈 Producción por Especialidad (Cmay)', bullets };
    }

    if (pagina === 3) {
        const amb = calcularAmbulatorizacion(registrosFiltrados);
        const ambAnt = registrosAnt ? calcularAmbulatorizacion(registrosAnt) : null;
        const bullets = [
            `Índice de ambulatorización global del periodo: ${iaFmtPct(amb.indice)} (${amb.numerador} de ${amb.denominador} pacientes Cmay programados terminaron con destino CMA en vez de hospitalización).${ambAnt ? ` El índice ${compararConPeriodoAnterior(amb.indice, ambAnt.indice, 'pct')} respecto al período anterior equivalente.` : ''}`,
            'Se adjunta el ranking por especialidad (quién ambulatoriza más y quién menos) y el desglose mensual del proceso ambulatorio, mostrado de a 2 especialidades por lámina en tamaño grande.'
        ];
        if (amb.denominador > 0 && amb.indice < 30) {
            hallazgos.push(crearHallazgoAnalisisIA('atencion',
                `El índice de ambulatorización (${iaFmtPct(amb.indice)}) tiene espacio para crecer.`,
                'Revisar con cada especialidad qué intervenciones Cmay programadas podrían resolverse por vía ambulatoria (CMA).',
                { metrica: 'Índice de ambulatorización', actual: iaFmtPct(amb.indice), metaSugerida: `${Math.min(60, Math.round(amb.indice + 10))}% en 6 meses` }
            ));
        }
        return { titulo: '🚶 Proceso Ambulatorio', bullets };
    }

    if (pagina === 4) {
        const diasHabiles = calcularDiasHabiles(estadisticasFiltroFechaInicio, estadisticasFiltroFechaFin);
        const kpis = calcularKpisOcupacion(registrosFiltrados, diasHabiles);
        let kpisAnt = null;
        if (periodoAnterior && registrosAnt) {
            const diasHabilesAnt = calcularDiasHabiles(periodoAnterior.inicio, periodoAnterior.fin);
            kpisAnt = calcularKpisOcupacion(registrosAnt, diasHabilesAnt);
        }
        const bullets = [
            `Ocupación de pabellón (bloque de Estadísticas, rango ${formatearFechaLegibleAnalisisIA(estadisticasFiltroFechaInicio)} – ${formatearFechaLegibleAnalisisIA(estadisticasFiltroFechaFin)}): ${iaFmtPct(kpis.porcentajeOcupacion)} (${estadisticasFormatearHoras(kpis.horasTrabajadas)} trabajadas de ${estadisticasFormatearHoras(kpis.horasHabilitadas)} habilitadas, sobre ${kpis.diasHabiles} días hábiles).${kpisAnt ? ` La ocupación ${compararConPeriodoAnterior(kpis.porcentajeOcupacion, kpisAnt.porcentajeOcupacion, 'pct')}.` : ''}${kpis.porcentajeOcupacion > 100 ? ' Un valor sobre 100% indica que se trabajó más de lo formalmente habilitado en el período (típicamente por urgencias atendidas en bloques marcados como no disponibles) — no es un error de cálculo, sino actividad real por encima de la capacidad planificada.' : ''}`,
            `Rendimiento por pabellón: ${kpis.rendimientoSoloProgCmay.toFixed(2)} casos/pabellón/día considerando solo Cmay programado, y ${kpis.rendimientoTotalCx.toFixed(2)} casos/pabellón/día si se cuenta toda la actividad (Cmay + Cmen + Proc). La brecha entre ambos números muestra cuánta producción viene de intervenciones menores/procedimientos.${kpisAnt ? ` El rendimiento total ${compararConPeriodoAnterior(kpis.rendimientoTotalCx, kpisAnt.rendimientoTotalCx, 'num', 2)} respecto al período anterior.` : ''}`,
            `Horas trabajadas en horario de urgencia: ${estadisticasFormatearHoras(kpis.horasUrgencia)}, equivalentes al ${iaFmtPct(kpis.porcentajeUrgencia)} del tiempo total trabajado.${kpisAnt ? ` Las horas de urgencia ${compararConPeriodoAnterior(kpis.horasUrgencia, kpisAnt.horasUrgencia, 'horas')}.` : ''}`
        ];
        return { titulo: '🏨 Ocupación y Rendimiento Pabellón', bullets };
    }

    if (pagina === 6) {
        const anio = estadisticasPerianalgesiaAnio || new Date().getFullYear();
        const meses = calcularPerianalgesiaPorMes(estadisticasRegistros, anio);
        const total = meses.reduce((a, b) => a + b, 0);
        const maxIdx = meses.indexOf(Math.max(...meses));
        const mesesAnt = calcularPerianalgesiaPorMes(estadisticasRegistros, anio - 1);
        const totalAnt = mesesAnt.reduce((a, b) => a + b, 0);
        const bullets = [
            `Total de perianalgesias (parto) registradas en ${anio}: ${total}. Este bloque muestra comportamiento anual completo (no se rige por el rango de fechas elegido para este informe, ya que sigue su propio selector de año dentro de Estadísticas). Comparado con ${anio - 1} (${totalAnt} caso(s)), el volumen ${compararConPeriodoAnterior(total, totalAnt, 'num')}.`,
            total > 0 ? `El mes con mayor volumen fue ${ESTADISTICAS_NOMBRES_MES[maxIdx]}, con ${meses[maxIdx]} caso(s) — útil como referencia de estacionalidad para la dotación de matronería/anestesia.` : 'Sin casos registrados en el año.'
        ];
        return { titulo: '🤰 Perianalgesia (Parto) por Mes', bullets };
    }

    if (pagina === 7) {
        const bullets = [];
        const metasCfg = [
            { key: 'produccionGeneral', label: 'Producción General (Intervenciones)', fn: calcularProduccionGeneralAnio, esPct: false },
            { key: 'produccionCmay', label: 'Producción Cmay (Intervenciones)', fn: calcularProduccionCmayAnio, esPct: false },
            { key: 'produccionGeneralPacientes', label: 'Producción General (Pacientes)', fn: calcularProduccionGeneralPacientesAnio, esPct: false },
            { key: 'produccionCmayPacientes', label: 'Producción Cmay (Pacientes)', fn: calcularProduccionCmayPacientesAnio, esPct: false },
            { key: 'ambulatorizacion', label: '% Ambulatorización', fn: calcularAmbulatorizacionAnio, esPct: true }
        ];
        metasCfg.forEach(m => {
            const cfg = estadisticasMetas[m.key];
            if (!cfg || !cfg.meta || !cfg.anio) return;
            const actual = m.fn(cfg.anio);
            const pctCumplido = cfg.meta > 0 ? (actual / cfg.meta) * 100 : 0;
            const actualTxt = m.esPct ? iaFmtPct(actual) : actual;
            const metaTxt = m.esPct ? `${cfg.meta}%` : cfg.meta;
            const ritmoEsperado = calcularRitmoEsperadoAnio(cfg.anio);
            const brecha = pctCumplido - ritmoEsperado;
            const ritmoTxt = Math.abs(brecha) <= 3
                ? 'alineado con el ritmo esperado para la fecha'
                : (brecha > 0 ? `adelantado ${brecha.toFixed(0)} punto(s) respecto al ritmo esperado` : `atrasado ${Math.abs(brecha).toFixed(0)} punto(s) respecto al ritmo esperado`);
            bullets.push(`${m.label} (${cfg.anio}): ${actualTxt} de meta ${metaTxt} → ${iaFmtPct(pctCumplido)} cumplido. Ya transcurrió ${iaFmtPct(ritmoEsperado)} del año ${cfg.anio}, por lo que el ritmo actual va ${ritmoTxt} para llegar a la meta a fin de año.`);
            if (pctCumplido < 80) {
                hallazgos.push(crearHallazgoAnalisisIA('atencion',
                    `La meta "${m.label}" (${cfg.anio}) lleva un ${iaFmtPct(pctCumplido)} de cumplimiento (ritmo ${ritmoTxt}).`,
                    `Evaluar el ritmo de producción restante del año para la meta de ${m.label} y reforzar las acciones necesarias para acercarse al objetivo.`,
                    null
                ));
            }
        });
        if (bullets.length === 0) bullets.push('No hay metas configuradas con año y valor definidos.');
        return { titulo: '🎯 Cumplimiento de Metas', bullets };
    }

    return { titulo: '', bullets: [] };
}

// -------------------------------------------------------------
// ✅ SÍNTESIS: resumen ejecutivo, conclusiones, recomendaciones, plan y metas
// -------------------------------------------------------------
function construirResumenEjecutivoAnalisisIA(fuentes, hallazgos) {
    const nAlertas = hallazgos.filter(h => h.severidad === 'alerta').length;
    const nAtencion = hallazgos.filter(h => h.severidad === 'atencion').length;

    let texto = 'Este informe ejecutivo fue generado automáticamente por el módulo de Análisis IA de la Tabla Quirúrgica, ';
    texto += `a partir de ${fuentes.join(' y ')}. `;
    if (nAlertas > 0) {
        texto += `Se identificaron ${nAlertas} punto(s) crítico(s) que requieren atención prioritaria`;
        texto += nAtencion > 0 ? ` y ${nAtencion} punto(s) de atención adicionales. ` : '. ';
    } else if (nAtencion > 0) {
        texto += `Se identificaron ${nAtencion} punto(s) de atención con margen de mejora. `;
    } else {
        texto += 'Los indicadores analizados se encuentran dentro de rangos adecuados. ';
    }
    texto += 'El detalle, las conclusiones, recomendaciones y el plan de mejora se presentan a continuación.';
    return texto;
}

function sintetizarInformeAnalisisIA(hallazgos) {
    const alertas = hallazgos.filter(h => h.severidad === 'alerta');
    const atenciones = hallazgos.filter(h => h.severidad === 'atencion');
    const positivos = hallazgos.filter(h => h.severidad === 'positivo');

    const conclusiones = [];
    if (positivos.length) conclusiones.push(...positivos.map(h => `✅ ${h.texto}`));
    if (atenciones.length) conclusiones.push(...atenciones.map(h => `🟡 ${h.texto}`));
    if (alertas.length) conclusiones.push(...alertas.map(h => `🔴 ${h.texto}`));
    if (!alertas.length && !atenciones.length && !positivos.length) {
        conclusiones.push('No se identificaron desviaciones relevantes respecto a los umbrales de referencia utilizados en este análisis.');
    }

    const recomendaciones = [...alertas, ...atenciones]
        .filter(h => h.recomendacion)
        .map(h => h.recomendacion);
    if (recomendaciones.length === 0) {
        recomendaciones.push('Mantener el monitoreo periódico de los indicadores para sostener el desempeño actual.');
    }

    const planDeMejora = [];
    if (alertas.length) {
        planDeMejora.push({ plazo: 'Corto plazo (0–1 mes)', accion: `Abordar los ${alertas.length} punto(s) crítico(s) identificados en este informe (ver Conclusiones).` });
    }
    if (atenciones.length) {
        planDeMejora.push({ plazo: 'Mediano plazo (1–3 meses)', accion: `Trabajar los ${atenciones.length} punto(s) de atención identificados para acercarlos a las metas de referencia.` });
    }
    planDeMejora.push({ plazo: 'Seguimiento continuo', accion: 'Generar este informe periódicamente (mensual o trimestral) para monitorear la evolución de los indicadores.' });

    const metas = hallazgos.filter(h => h.meta).map(h => h.meta);

    return { conclusiones, recomendaciones, planDeMejora, metas };
}

// -------------------------------------------------------------
// 🧾 CUERPO HTML COMPARTIDO (vista previa + informe imprimible)
// Todas las secciones — incluidas las de cierre — muestran el período
// analizado.
// -------------------------------------------------------------
function construirCuerpoInformeHtmlAnalisisIA(informe) {
    const periodoBadge = `<div class="ia-periodo">📅 ${informe.periodoTexto}</div>`;
    let html = `<div class="ia-resumen"><h2>Resumen Ejecutivo</h2>${periodoBadge}<p>${informe.resumenEjecutivo}</p></div>`;

    informe.secciones.forEach(sec => {
        html += `<div class="ia-seccion"><h2>${sec.titulo}</h2>${periodoBadge}`;
        if (sec.bullets && sec.bullets.length) {
            html += `<ul>${sec.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
        }
        if (sec.tablas && sec.tablas.length) {
            sec.tablas.forEach(t => {
                html += `<div style="font-weight:700; font-size:0.85rem; color:#1e293b; margin:10px 0 4px;">${t.titulo}</div>`;
                html += `<table class="ia-tabla"><thead><tr>${t.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
                html += t.filas.map(fila => `<tr>${fila.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
                html += `</tbody></table>`;
            });
        }
        if (sec.imagenes && sec.imagenes.length) {
            html += `<div class="ia-imagenes">`;
            sec.imagenes.forEach(img => {
                // width/height explícitos (además del width:100% de la vista
                // previa/PDF vía CSS): Word no siempre respeta height:auto en
                // su conversor de HTML y puede dejar el gráfico estirado —
                // con un tamaño de referencia y el alto calculado según la
                // proporción real de la imagen, se ve correcto también ahí.
                const anchoRef = 650;
                const altoRef = img.width && img.height ? Math.round(anchoRef * (img.height / img.width)) : null;
                html += `<figure><img src="${img.dataUrl}" alt="${img.titulo}" width="${anchoRef}"${altoRef ? ` height="${altoRef}"` : ''}><figcaption>${img.titulo}</figcaption></figure>`;
            });
            html += `</div>`;
        }
        html += `</div>`;
    });

    html += `<div class="ia-seccion"><h2>✅ Conclusiones Finales</h2>${periodoBadge}<ul>${informe.conclusiones.map(c => `<li>${c}</li>`).join('')}</ul></div>`;
    html += `<div class="ia-seccion"><h2>💡 Recomendaciones</h2>${periodoBadge}<ul>${informe.recomendaciones.map(r => `<li>${r}</li>`).join('')}</ul></div>`;
    html += `<div class="ia-seccion"><h2>🗓️ Plan de Mejora</h2>${periodoBadge}<table class="ia-tabla"><thead><tr><th>Plazo</th><th>Acción</th></tr></thead><tbody>`;
    html += informe.planDeMejora.map(p => `<tr><td>${p.plazo}</td><td>${p.accion}</td></tr>`).join('');
    html += `</tbody></table></div>`;

    if (informe.metas.length) {
        html += `<div class="ia-seccion"><h2>🎯 Metas Sugeridas</h2>${periodoBadge}<table class="ia-tabla"><thead><tr><th>Métrica</th><th>Valor actual</th><th>Meta sugerida</th></tr></thead><tbody>`;
        html += informe.metas.map(m => `<tr><td>${m.metrica}</td><td>${m.actual}</td><td>${m.metaSugerida}</td></tr>`).join('');
        html += `</tbody></table><p style="font-size:0.75rem; color:#64748b; margin-top:6px;">* Metas sugeridas automáticamente en base a los datos analizados; deben ser validadas por la jefatura del proceso quirúrgico.</p></div>`;
    }

    return html;
}

// -------------------------------------------------------------
// 🚀 ORQUESTADOR: genera el informe completo y abre la vista previa
// -------------------------------------------------------------
async function generarAnalisisIA() {
    if (!analisisIaFechaInicio || !analisisIaFechaFin) {
        showModal({
            title: '⚠️ Falta el rango de fechas',
            message: 'Selecciona un rango de fechas para el análisis — se aplica tanto al Libro de Quirófano como a los bloques de Estadísticas.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
        return;
    }

    cerrarModalAnalisisIA();

    document.getElementById('analisisIaEsperaOverlay')?.remove();
    const overlayEspera = document.createElement('div');
    overlayEspera.id = 'analisisIaEsperaOverlay';
    overlayEspera.style.cssText = 'position:fixed; inset:0; background:#0b2a4f; z-index:5500; display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; text-align:center; padding:20px; box-sizing:border-box;';
    overlayEspera.textContent = '⏳ Preparando el análisis...';
    document.body.appendChild(overlayEspera);

    let displayEstadisticasOriginal = null;
    let fechaInicioOriginalEstadisticas = null;
    let fechaFinOriginalEstadisticas = null;

    try {
        if (!estadisticasRegistros || estadisticasRegistros.length === 0) {
            overlayEspera.textContent = '⏳ Cargando datos...';
            await cargarEstadisticas();
        }

        const anios = new Set();
        estadisticasAniosEnRango(analisisIaFechaInicio, analisisIaFechaFin).forEach(a => anios.add(a));
        anios.add(estadisticasPerianalgesiaAnio || new Date().getFullYear());
        Object.values(estadisticasMetas).forEach(m => { if (m && m.anio) anios.add(m.anio); });
        await obtenerFeriados(Array.from(anios));

        const hallazgos = [];
        const secciones = [];

        // Período inmediatamente anterior, de la misma duración — permite
        // que cada bloque compare "este período vs. el anterior" en vez de
        // mostrar solo el número suelto del rango elegido.
        const periodoAnterior = calcularPeriodoAnteriorEquivalente(analisisIaFechaInicio, analisisIaFechaFin);

        // El rango elegido gobierna tanto el Libro de Quirófano (siempre se
        // analiza) como los bloques de Estadísticas (opcionales).
        overlayEspera.textContent = '⏳ Analizando Libro de Quirófano...';
        const seccionLibro = await analizarLibroQuirofano(analisisIaFechaInicio, analisisIaFechaFin, hallazgos, periodoAnterior);
        secciones.push(seccionLibro);

        if (analisisIaBloquesSeleccionados.size > 0) {
            fechaInicioOriginalEstadisticas = estadisticasFiltroFechaInicio;
            fechaFinOriginalEstadisticas = estadisticasFiltroFechaFin;
            displayEstadisticasOriginal = estadisticasContent.style.display;

            estadisticasFiltroFechaInicio = analisisIaFechaInicio;
            estadisticasFiltroFechaFin = analisisIaFechaFin;
            // html2canvas no puede fotografiar contenido con display:none, así
            // que la sección debe quedar visible mientras dura la captura (el
            // overlay de espera, arriba en z-index, la tapa por completo).
            estadisticasContent.style.display = 'block';
            renderEstadisticas();

            const laminasResueltas = estadisticasResolverLaminas();
            const bloquesOrdenados = ANALISIS_IA_BLOQUES_ESTADISTICAS.filter(b => analisisIaBloquesSeleccionados.has(b.pagina));
            for (const bloque of bloquesOrdenados) {
                overlayEspera.textContent = `⏳ Analizando ${bloque.label}...`;
                const narrativa = analizarBloqueEstadisticas(bloque.pagina, hallazgos, periodoAnterior);
                const laminas = laminasResueltas.filter(l => l.pagina === bloque.pagina);
                const imagenes = [];
                for (const l of laminas) {
                    const captura = await capturarElementoComoImagen(l.pagina, l.elementoId, { modoCaptura: laminaNecesitaModoCaptura(l), gridId: l.gridId, chunkIndex: l.chunkIndex });
                    imagenes.push({ titulo: l.titulo, dataUrl: captura.dataUrl, width: captura.width, height: captura.height });
                }
                secciones.push({ titulo: narrativa.titulo, bullets: narrativa.bullets, imagenes });
            }

            estadisticasFiltroFechaInicio = fechaInicioOriginalEstadisticas;
            estadisticasFiltroFechaFin = fechaFinOriginalEstadisticas;
            estadisticasContent.style.display = displayEstadisticasOriginal;
            renderEstadisticas();
        }

        const periodoTexto = `Periodo analizado: ${formatearFechaLegibleAnalisisIA(analisisIaFechaInicio)} – ${formatearFechaLegibleAnalisisIA(analisisIaFechaFin)}`;
        const fuentes = [
            `el Libro de Quirófano${analisisIaBloquesSeleccionados.size > 0 ? ` y ${analisisIaBloquesSeleccionados.size} bloque(s) de Estadísticas` : ''} (${formatearFechaLegibleAnalisisIA(analisisIaFechaInicio)} – ${formatearFechaLegibleAnalisisIA(analisisIaFechaFin)})`
        ];

        const resumenEjecutivo = construirResumenEjecutivoAnalisisIA(fuentes, hallazgos);
        const sintesis = sintetizarInformeAnalisisIA(hallazgos);
        const logoDataUrl = await obtenerLogoDataUrl();

        analisisIaUltimoInforme = {
            generadoEn: new Date().toLocaleString('es-CL'),
            rango: { inicio: analisisIaFechaInicio, fin: analisisIaFechaFin },
            periodoTexto,
            logoDataUrl,
            resumenEjecutivo,
            secciones,
            conclusiones: sintesis.conclusiones,
            recomendaciones: sintesis.recomendaciones,
            planDeMejora: sintesis.planDeMejora,
            metas: sintesis.metas
        };

        overlayEspera.remove();
        abrirVistaPreviaAnalisisIA();

    } catch (error) {
        console.error('❌ Error al generar el Análisis IA:', error);
        if (fechaInicioOriginalEstadisticas !== null) {
            estadisticasFiltroFechaInicio = fechaInicioOriginalEstadisticas;
            estadisticasFiltroFechaFin = fechaFinOriginalEstadisticas;
        }
        if (displayEstadisticasOriginal !== null) estadisticasContent.style.display = displayEstadisticasOriginal;
        overlayEspera.remove();
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al generar el Análisis IA.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}

// -------------------------------------------------------------
// 👁️ VISTA PREVIA
// -------------------------------------------------------------
function abrirVistaPreviaAnalisisIA() {
    const informe = analisisIaUltimoInforme;
    if (!informe) return;

    document.getElementById('analisisIaPreviaOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'analisisIaPreviaOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.alignItems = 'flex-start';
    overlay.innerHTML = `
        <style>${ANALISIS_IA_ESTILOS_INFORME}</style>
        <div style="background:white; border-radius:20px; max-width:960px; width:100%; margin:24px auto; max-height:calc(100vh - 48px); display:flex; flex-direction:column; box-shadow:0 30px 80px rgba(0,0,0,0.4);">
            <div style="display:flex; align-items:center; gap:14px; padding:20px 28px; border-bottom:1px solid #e2e8f0; flex-shrink:0;">
                ${informe.logoDataUrl ? `<img src="${informe.logoDataUrl.dataUrl}" style="height:44px; width:auto;">` : ''}
                <div style="flex:1; min-width:0;">
                    <div style="font-size:1.15rem; font-weight:700; color:#0b2a4f;">🧠 Informe Ejecutivo — Análisis IA</div>
                    <div style="font-size:0.78rem; color:#64748b;">Generado el ${informe.generadoEn} · ${informe.periodoTexto} · Hospital Dr. Humberto Elorza Cortés</div>
                </div>
                <button id="analisisIaPreviaCerrar" style="background:#f1f5f9; border:1px solid #d1d9e6; color:#334155; padding:7px 16px; border-radius:20px; cursor:pointer; font-size:0.8rem; font-weight:600; flex-shrink:0;">✕ Cerrar</button>
            </div>
            <div class="ia-informe" style="overflow-y:auto; padding:24px 28px; flex:1;">
                ${construirCuerpoInformeHtmlAnalisisIA(informe)}
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end; padding:16px 28px; border-top:1px solid #e2e8f0; flex-shrink:0; flex-wrap:wrap;">
                <button id="analisisIaDescargarTexto" class="modal-btn" style="background:#0b2a4f; color:white; min-width:auto; padding:10px 22px;">📄 Descargar Informe (Texto / PDF)</button>
                <button id="analisisIaDescargarWord" class="modal-btn" style="background:#1d4ed8; color:white; min-width:auto; padding:10px 22px;">📝 Descargar Word</button>
                <button id="analisisIaDescargarPpt" class="modal-btn" style="background:#c0392b; color:white; min-width:auto; padding:10px 22px;">⬇️ Descargar PPT</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#analisisIaPreviaCerrar').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector('#analisisIaDescargarTexto').addEventListener('click', descargarInformeTextoAnalisisIA);
    overlay.querySelector('#analisisIaDescargarWord').addEventListener('click', descargarInformeWordAnalisisIA);
    overlay.querySelector('#analisisIaDescargarPpt').addEventListener('click', descargarPptAnalisisIA);
}

// -------------------------------------------------------------
// 🧾 CUERPO COMPARTIDO (membrete + informe + pie) — versión imprimible/PDF
// (usa flexbox, que los navegadores soportan bien).
// -------------------------------------------------------------
function construirCuerpoDocumentoAnalisisIA(informe, fechaImpresion) {
    return `
        <div class="membrete">
            ${informe.logoDataUrl ? `<img src="${informe.logoDataUrl.dataUrl}" alt="Hospital de Illapel">` : ''}
            <div>
                <h1>🧠 Informe Ejecutivo · Análisis IA</h1>
                <div class="sub">Hospital Dr. Humberto Elorza Cortés · Illapel, Chile</div>
                <div class="meta">Generado el ${informe.generadoEn} · ${informe.periodoTexto}</div>
            </div>
        </div>
        <div class="ia-informe">
            ${construirCuerpoInformeHtmlAnalisisIA(informe)}
        </div>
        <div class="footer-print">
            <div>© Dr. Danilo A. Nava La C. · Jéfe del Proceso Quirúrgico</div>
            <div>Emitido: ${fechaImpresion} · Informe generado automáticamente por el módulo de Análisis IA</div>
        </div>
    `;
}

// -------------------------------------------------------------
// 🧾 CUERPO PARA WORD — el conversor de HTML de Word no soporta flexbox
// (por eso el membrete/pie con display:flex salía desarmado y el logo sin
// proporción). Se arma con <table> — el layout que Word sí respeta bien —
// y con el logo en tamaño fijo. El cuerpo del informe (texto/tablas/
// gráficos) es EXACTAMENTE el mismo que en el PDF, vía
// construirCuerpoInformeHtmlAnalisisIA().
// -------------------------------------------------------------
function construirCuerpoDocumentoWordAnalisisIA(informe, fechaEmision) {
    const celdaLogo = informe.logoDataUrl
        ? `<td width="76" valign="middle" style="padding:14px 8px 14px 18px;"><img src="${informe.logoDataUrl.dataUrl}" width="60" height="60" alt="Hospital de Illapel" style="background-color:#ffffff;"></td>`
        : '';
    return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0b2a4f; margin-bottom:20px;">
            <tr>
                ${celdaLogo}
                <td valign="middle" style="padding:14px 18px;">
                    <div style="font-size:18pt; font-weight:bold; color:#ffffff;">🧠 Informe Ejecutivo · Análisis IA</div>
                    <div style="font-size:10pt; color:#cbd5e1;">Hospital Dr. Humberto Elorza Cortés · Illapel, Chile</div>
                    <div style="font-size:10pt; color:#cbd5e1; margin-top:4px;">Generado el ${informe.generadoEn} · ${informe.periodoTexto}</div>
                </td>
            </tr>
        </table>
        <div class="ia-informe">
            ${construirCuerpoInformeHtmlAnalisisIA(informe)}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px; border-top:2px solid #e2e8f0;">
            <tr>
                <td style="padding-top:12px; font-size:9pt; color:#64748b;">© Dr. Danilo A. Nava La C. · Jéfe del Proceso Quirúrgico</td>
                <td style="padding-top:12px; font-size:9pt; color:#64748b; text-align:right;">Emitido: ${fechaEmision} · Informe generado automáticamente por el módulo de Análisis IA</td>
            </tr>
        </table>
    `;
}

// -------------------------------------------------------------
// 📄 DESCARGA: informe en texto, formato profesional (imprimible / PDF)
// -------------------------------------------------------------
function descargarInformeTextoAnalisisIA() {
    const informe = analisisIaUltimoInforme;
    if (!informe) return;

    const fechaImpresion = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Informe Ejecutivo - Análisis IA</title>
            <style>
                * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
                html, body { width:100%; max-width:100%; }
                body { font-family:'Segoe UI', Arial, sans-serif; padding:30px; background:white; color:#1e293b; }
                @page { size:A4 portrait; margin:15mm; }
                img, table { max-width:100%; }
                .membrete { display:flex; align-items:center; gap:20px; padding:16px 22px; background:linear-gradient(135deg, #0b2a4f 0%, #1a6d8a 100%); border-radius:10px; margin-bottom:20px; color:white; }
                .membrete img { height:60px; width:auto; background:rgba(255,255,255,0.9); padding:4px; border-radius:6px; }
                .membrete h1 { font-size:1.4rem; font-weight:700; }
                .membrete .sub { font-size:0.85rem; opacity:0.85; }
                .membrete .meta { font-size:0.85rem; margin-top:4px; }
                .footer-print { margin-top:26px; padding-top:12px; border-top:2px solid #e2e8f0; display:flex; justify-content:space-between; font-size:0.7rem; color:#64748b; }
                .ia-seccion, .ia-resumen { page-break-inside:avoid; }
                ${ANALISIS_IA_ESTILOS_INFORME}
                @media print {
                    .no-print { display:none; }
                    body { padding:0; }
                }
            </style>
        </head>
        <body>
            ${construirCuerpoDocumentoAnalisisIA(informe, fechaImpresion)}
        </body>
        </html>
    `;

    const ventana = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
    if (ventana) {
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();
        let yaImpreso = false;
        ventana.addEventListener('load', function() {
            if (!yaImpreso) { yaImpreso = true; ventana.print(); }
        });
        setTimeout(function() {
            if (!yaImpreso) { yaImpreso = true; ventana.print(); }
        }, 2000);
    } else {
        showModal({
            title: '⚠️ Error',
            message: 'No se pudo abrir la ventana de impresión.<br>Verifica que los pop-ups estén habilitados.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
    }
}

// -------------------------------------------------------------
// 📝 DESCARGA: informe en formato Word (.doc)
// No hay librería de generación de .docx en la app (ni backend para
// generarlo). Word SÍ abre HTML disfrazado de .doc, pero su conversor no
// soporta imágenes embebidas como data:URI — quedarían como ícono roto. La
// forma confiable de que los gráficos se vean en Word es empaquetar el
// documento como MHTML (multipart/related): el HTML referencia cada imagen
// por cid:, y cada imagen va en su propia parte MIME en base64. Reusa
// construirCuerpoDocumentoAnalisisIA() (el mismo contenido/texto/gráficos
// que la versión imprimible/PDF) y solo reemplaza las imágenes por cid:.
// -------------------------------------------------------------
function iaExtraerImagenesAMht(html) {
    const partes = [];
    let contador = 0;
    const htmlConCid = html.replace(/src="(data:[^"]+)"/g, function(match, dataUrl) {
        contador++;
        const cid = `imagenIA${contador}`;
        partes.push({ cid, dataUrl });
        return `src="cid:${cid}"`;
    });
    return { htmlConCid, partes };
}

function iaConstruirParteMimeImagen(cid, dataUrl) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return '';
    const mimeType = match[1];
    const base64Ajustado = match[2].replace(/(.{76})/g, '$1\r\n');
    return `Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <${cid}>\r\nContent-Location: ${cid}\r\n\r\n${base64Ajustado}\r\n`;
}

function descargarInformeWordAnalisisIA() {
    const informe = analisisIaUltimoInforme;
    if (!informe) return;

    const fechaEmision = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL');

    const htmlCompleto = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <title>Informe Ejecutivo - Análisis IA</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                body { font-family:'Segoe UI', Calibri, Arial, sans-serif; color:#1e293b; }
                ${ANALISIS_IA_ESTILOS_INFORME}
            </style>
        </head>
        <body>
            ${construirCuerpoDocumentoWordAnalisisIA(informe, fechaEmision)}
        </body>
        </html>
    `;

    const { htmlConCid, partes } = iaExtraerImagenesAMht(htmlCompleto);
    const boundary = '----=_NextPart_AnalisisIA_' + Date.now();

    let mht = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${boundary}"; type="text/html"\r\n\r\n`;
    mht += `--${boundary}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Location: informe.html\r\n\r\n${htmlConCid}\r\n\r\n`;
    partes.forEach(p => {
        mht += `--${boundary}\r\n${iaConstruirParteMimeImagen(p.cid, p.dataUrl)}\r\n`;
    });
    mht += `--${boundary}--\r\n`;

    const blob = new Blob([mht], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `Informe_Ejecutivo_Analisis_IA_Hospital_Illapel_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// ⬇️ DESCARGA: PPT — toda diapositiva (incluida portada y cierre) incluye
// el período analizado.
// -------------------------------------------------------------
async function descargarPptAnalisisIA() {
    const informe = analisisIaUltimoInforme;
    if (!informe) return;

    try {
        if (typeof PptxGenJS === 'undefined') throw new Error('PptxGenJS no está disponible');

        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'ANALISIS_IA', width: 13.33, height: 7.5 });
        pptx.layout = 'ANALISIS_IA';

        const portada = pptx.addSlide();
        portada.background = { color: '0B2A4F' };
        if (informe.logoDataUrl) {
            const cajaLogo = ajustarImagenAlaCaja(informe.logoDataUrl.width, informe.logoDataUrl.height, 5.66, 1.2, 2, 1.4);
            portada.addImage({ data: informe.logoDataUrl.dataUrl, ...cajaLogo });
        }
        portada.addText('Informe Ejecutivo', { x: 0.5, y: 3.0, w: 12.33, h: 0.7, fontSize: 32, bold: true, color: 'FFFFFF', align: 'center' });
        portada.addText('Análisis IA · Tabla Quirúrgica', { x: 0.5, y: 3.7, w: 12.33, h: 0.5, fontSize: 18, color: 'CBD5E1', align: 'center' });
        portada.addText(`Hospital Dr. Humberto Elorza Cortés · Illapel, Chile\nGenerado el ${informe.generadoEn}\n${informe.periodoTexto}`, { x: 0.5, y: 4.3, w: 12.33, h: 0.9, fontSize: 12, color: '94A3B8', align: 'center' });

        function slideTextoFinalAnalisisIA(titulo, items) {
            const s = pptx.addSlide();
            s.addText(titulo, { x: 0.4, y: 0.3, w: 12.5, h: 0.55, fontSize: 24, bold: true, color: '0B2A4F' });
            s.addText(informe.periodoTexto, { x: 0.4, y: 0.82, w: 12.5, h: 0.3, fontSize: 11, italic: true, color: '64748B' });
            s.addText(items.map(t => ({ text: t, options: { bullet: true, breakLine: true } })), { x: 0.4, y: 1.25, w: 12.5, h: 5.65, fontSize: 14, color: '1E293B' });
        }

        slideTextoFinalAnalisisIA('Resumen Ejecutivo', [informe.resumenEjecutivo]);

        informe.secciones.forEach(sec => {
            // El análisis (bullets) siempre va en su propia lámina de texto —
            // nunca superpuesto sobre un gráfico — porque el largo del texto
            // varía mucho entre secciones y superponerlo sobre la imagen
            // podía taparla (pasaba en Libro de Quirófano, que tiene el
            // análisis más extenso).
            if (sec.bullets && sec.bullets.length) {
                slideTextoFinalAnalisisIA(sec.titulo, sec.bullets);
            }

            if (sec.tablas && sec.tablas.length) {
                sec.tablas.forEach(t => {
                    const s = pptx.addSlide();
                    s.addText(t.titulo, { x: 0.4, y: 0.3, w: 12.5, h: 0.55, fontSize: 22, bold: true, color: '0B2A4F' });
                    s.addText(informe.periodoTexto, { x: 0.4, y: 0.82, w: 12.5, h: 0.3, fontSize: 11, italic: true, color: '64748B' });
                    const filasTabla = [t.headers.map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: '0B2A4F' } } }))]
                        .concat(t.filas.map(fila => fila.map(c => ({ text: String(c) }))));
                    // autoPage:true continúa la tabla en láminas adicionales si
                    // tiene más filas de las que caben (ej. muchas especialidades).
                    s.addTable(filasTabla, { x: 0.4, y: 1.3, w: 12.5, fontSize: 11, color: '1E293B', border: { type: 'solid', color: 'D1D9E6', pt: 1 }, autoPage: true });
                });
            }

            if (sec.imagenes && sec.imagenes.length) {
                sec.imagenes.forEach(img => {
                    const s = pptx.addSlide();
                    // El título de cada imagen ya viene específico (incluye
                    // la paginación "(1/2)" cuando corresponde) — más
                    // preciso que reutilizar el título genérico de la sección.
                    s.addText(img.titulo || sec.titulo, { x: 0.3, y: 0.15, w: 11.6, h: 0.45, fontSize: 20, bold: true, color: '0B2A4F' });
                    s.addText(informe.periodoTexto, { x: 0.3, y: 0.58, w: 11.6, h: 0.25, fontSize: 10, italic: true, color: '64748B' });
                    if (informe.logoDataUrl) {
                        const cajaLogoSlide = ajustarImagenAlaCaja(informe.logoDataUrl.width, informe.logoDataUrl.height, 12.33, 0.1, 0.7, 0.55);
                        s.addImage({ data: informe.logoDataUrl.dataUrl, ...cajaLogoSlide });
                    }
                    const cajaImagen = ajustarImagenAlaCaja(img.width, img.height, 0.3, 0.9, 12.7, 6.35);
                    s.addImage({ data: img.dataUrl, ...cajaImagen });
                });
            }
        });

        slideTextoFinalAnalisisIA('✅ Conclusiones Finales', informe.conclusiones);
        slideTextoFinalAnalisisIA('💡 Recomendaciones', informe.recomendaciones);
        slideTextoFinalAnalisisIA('🗓️ Plan de Mejora', informe.planDeMejora.map(p => `${p.plazo}: ${p.accion}`));
        if (informe.metas.length) {
            slideTextoFinalAnalisisIA('🎯 Metas Sugeridas', informe.metas.map(m => `${m.metrica}: actual ${m.actual} → meta sugerida ${m.metaSugerida}`));
        }

        const fechaStr = new Date().toISOString().slice(0, 10);
        await pptx.writeFile({ fileName: `Informe_Ejecutivo_Analisis_IA_Hospital_Illapel_${fechaStr}.pptx` });

    } catch (error) {
        console.error('❌ Error al generar PPT de Análisis IA:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al generar el PPT del informe.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}
