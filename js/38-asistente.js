// =============================================================
// 🤖 ASISTENTE (pestaña "🤖 Asistente" dentro del panel del Avatar)
// =============================================================
// Motor de REGLAS local: no usa ninguna IA externa, no tiene costo y no
// envía datos fuera de la app (solo lee Firebase con los mismos permisos
// del usuario conectado). Entiende la pregunta por patrones:
//   1. Extrae "entidades": fechas (hoy, mañana, el jueves, septiembre,
//      15/10...), especialidad, pabellón, jornada, médico, RUT/nombre,
//      estado de la cirugía, estatus de Lista de Espera, prioridad, GES.
//   2. Decide la intención (consulta de datos, navegación, duda de uso...).
//   3. Responde con datos EN VIVO (Tabla Quirúrgica, Libro de Quirófano,
//      Pacientes Diferidos, Lista de Espera) respetando
//      usuarioTieneAccesoSeccion() -- nunca muestra datos de una sección a
//      la que el usuario no tiene acceso.
//   4. Si es una duda de uso: base de conocimiento propia de la app
//      (ASIS_KB, escrita a partir de las funciones reales, no solo del
//      manual) y, como respaldo, búsqueda de texto completo en el Manual.
// Recuerda el contexto de la última consulta de datos, así "¿y mañana?" o
// "¿y de traumatología?" reutilizan la consulta anterior cambiando solo eso.
//
// El Avatar le da "vida": se inclina mientras piensa y se mueve mientras
// habla, leyendo la respuesta en voz alta con la síntesis de voz del propio
// navegador (Web Speech API, gratis y local). Se puede silenciar (🔊/🔇,
// se recuerda por usuario).
// =============================================================

let asisHistorial = [];           // [{rol:'usuario'|'asistente', html, acciones, sugerencias}]
let asisContexto = null;          // { intencion, ctx } de la última consulta de datos
let asisAccionesRegistro = new Map();
let asisSiguienteIdAccion = 1;
let asisCache = {};               // { clave: { ts, data } }
let asisProcesando = false;
const ASIS_MAX_HISTORIAL = 60;
const ASIS_MAX_ITEMS_LISTA = 15;

// =============================================================
// 🔤 TEXTO: normalización y coincidencias
// =============================================================
function asisNorm(texto) {
    return (texto || '').toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[¿?¡!,;:()"'«»*_]/g, ' ')
        .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
        .replace(/(?<![\dk])-|-(?![\dk])/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function asisTokens(t) {
    return t ? t.split(' ').filter(Boolean) : [];
}

// ¿Aparece "stem" en el texto? Una palabra suelta coincide como PREFIJO de
// alguna palabra ("program" ↔ "programados"); una frase coincide si cada
// una de sus palabras es prefijo de palabras CONSECUTIVAS del texto.
function asisTiene(t, stem) {
    const tokens = asisTokens(t);
    const partes = stem.split(' ');
    if (partes.length === 1) return tokens.some(tok => tok.startsWith(stem));
    for (let i = 0; i + partes.length <= tokens.length; i++) {
        if (partes.every((p, j) => tokens[i + j].startsWith(p))) return true;
    }
    return false;
}

function asisTieneAlguno(t, stems) {
    return stems.some(s => asisTiene(t, s));
}

// Todas las palabras buscadas son prefijo de alguna palabra del valor
// ("perez jua" ↔ "JUAN PEREZ SOTO").
function asisCoincideTokens(valor, tokens) {
    if (!tokens || tokens.length === 0) return false;
    const palabras = asisTokens(asisNorm(valor));
    if (palabras.length === 0) return false;
    return tokens.every(tok => palabras.some(p => p.startsWith(tok)));
}

const ASIS_STOPWORDS = new Set(('a al algo alguna algun alguno algunos ante antes aqui asi aun cada como con contra cual cuales cuando de del desde donde dos el ella ellas ellos en entre era es esa esas ese eso esos esta estan estas este esto estos fue fueron ha han hay la las le les lo los mas me mi mis muy ni no nos o otra otro para pero poco por porque que quien quienes se ser si sin sobre son su sus tambien tan tanto te tiene tienen todo todos tu tus un una uno unos y ya yo dame dime muestrame mostrar ver favor porfa porfavor puedes podrias quiero necesito saber hola oye me podrias decir ' +
    'paciente pacientes cual cuanto cuantos cuantas esta estan hay hoy ahora').split(' '));

function asisEsc(texto) {
    return typeof escaparHtml === 'function' ? escaparHtml(texto) : String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function asisRutLimpio(valor) {
    return (valor || '').toString().replace(/[^0-9kK]/g, '').toUpperCase();
}

function asisRutBonito(valor) {
    const limpio = asisRutLimpio(valor);
    if (!limpio) return '';
    if (typeof formatearRut === 'function') {
        try { return formatearRut(limpio); } catch (e) { /* se usa el limpio */ }
    }
    return limpio;
}

function asisPuede(seccion) {
    return typeof usuarioTieneAccesoSeccion === 'function' ? usuarioTieneAccesoSeccion(seccion) : true;
}

function asisFmtNum(n, decimales = 1) {
    return Number(n || 0).toLocaleString('es-CL', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

function asisPlural(n, singular, plural) {
    return `${n} ${n === 1 ? singular : (plural || singular + 's')}`;
}

// =============================================================
// 📅 FECHAS
// =============================================================
const ASIS_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ASIS_DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const ASIS_DIAS_SEMANA_BONITO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function asisPad(n) { return String(n).padStart(2, '0'); }
function asisFmt(d) { return `${d.getFullYear()}-${asisPad(d.getMonth() + 1)}-${asisPad(d.getDate())}`; }
function asisHoy() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function asisSumarDias(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; }
function asisParseFecha(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}
function asisFechaCorta(str) {
    const d = asisParseFecha(str);
    if (!d) return str || '';
    return `${ASIS_DIAS_SEMANA_BONITO[d.getDay()].slice(0, 3)} ${asisPad(d.getDate())}/${asisPad(d.getMonth() + 1)}`;
}
function asisFechaLarga(d) {
    return `${ASIS_DIAS_SEMANA_BONITO[d.getDay()]} ${d.getDate()} de ${ASIS_MESES[d.getMonth()]}`;
}
function asisLunesDe(d) {
    const dow = (d.getDay() + 6) % 7;
    return asisSumarDias(d, -dow);
}
function asisFechaValida(y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const f = new Date(y, m - 1, d);
    if (f.getMonth() !== m - 1) return null;
    return f;
}
function asisFechaDesdeValor(valor) {
    if (typeof normalizarFechaComparable === 'function') return normalizarFechaComparable(valor) || '';
    const s = (valor || '').toString();
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

function asisExtraerFechasExplicitas(t) {
    const hoy = asisHoy();
    const fechas = [];
    const sinRut = t.replace(/\b\d{1,2}\.?\d{3}\.?\d{3}\s*-?\s*[0-9k]\b/g, ' ');
    let m;
    const reIso = /\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/g;
    while ((m = reIso.exec(sinRut))) {
        const f = asisFechaValida(+m[1], +m[2], +m[3]);
        if (f) fechas.push(f);
    }
    const sinIso = sinRut.replace(reIso, ' ');
    const reNum = /\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/g;
    while ((m = reNum.exec(sinIso))) {
        let y = m[3] ? +m[3] : hoy.getFullYear();
        if (y < 100) y += 2000;
        const f = asisFechaValida(y, +m[2], +m[1]);
        if (f) fechas.push(f);
    }
    const reTexto = new RegExp(`\\b(\\d{1,2}) de (${ASIS_MESES.join('|')}|setiembre)(?: (?:de |del )?(20\\d\\d))?\\b`, 'g');
    while ((m = reTexto.exec(sinIso))) {
        const mesIdx = m[2] === 'setiembre' ? 8 : ASIS_MESES.indexOf(m[2]);
        const f = asisFechaValida(m[3] ? +m[3] : hoy.getFullYear(), mesIdx + 1, +m[1]);
        if (f) fechas.push(f);
    }
    fechas.sort((a, b) => a - b);
    return fechas;
}

// Devuelve { desde, hasta, etiqueta } ("YYYY-MM-DD") o null si la pregunta
// no menciona ningún período.
function asisExtraerRango(t) {
    const hoy = asisHoy();
    const r = (desde, hasta, etiqueta) => ({ desde: asisFmt(desde), hasta: asisFmt(hasta), etiqueta });

    const explicitas = asisExtraerFechasExplicitas(t);
    if (explicitas.length >= 2) {
        const a = explicitas[0], b = explicitas[explicitas.length - 1];
        return r(a, b, `del ${asisFechaLarga(a)} al ${asisFechaLarga(b)}`);
    }
    if (explicitas.length === 1) return r(explicitas[0], explicitas[0], `el ${asisFechaLarga(explicitas[0])}`);

    let m = t.match(/\b(?:ultimos|pasados) (\d{1,3}) dias\b/);
    if (m) return r(asisSumarDias(hoy, -(+m[1]) + 1), hoy, `en los últimos ${m[1]} días`);
    m = t.match(/\bproximos (\d{1,3}) dias\b/);
    if (m) return r(hoy, asisSumarDias(hoy, +m[1] - 1), `en los próximos ${m[1]} días`);

    if (/\bpasado manana\b/.test(t)) { const d = asisSumarDias(hoy, 2); return r(d, d, `pasado mañana (${asisFechaLarga(d)})`); }
    if (/\b(anteayer|antes de ayer)\b/.test(t)) { const d = asisSumarDias(hoy, -2); return r(d, d, `anteayer (${asisFechaLarga(d)})`); }
    if (/\bayer\b/.test(t)) { const d = asisSumarDias(hoy, -1); return r(d, d, `ayer (${asisFechaLarga(d)})`); }
    if (/\besta (manana|tarde|noche)\b/.test(t)) return r(hoy, hoy, `hoy (${asisFechaLarga(hoy)})`);
    // "mañana" = día siguiente, salvo "en/por/de LA mañana" (= jornada AM);
    // "la tabla de mañana" y "mañana en la mañana" siguen siendo el día
    // siguiente.
    if (/\bmanana\b/.test(t.replace(/\b(en|por|de) la manana\b|\besta manana\b/g, ' '))) {
        const d = asisSumarDias(hoy, 1);
        return r(d, d, `mañana (${asisFechaLarga(d)})`);
    }
    if (/\b(hoy|el dia de hoy)\b/.test(t)) return r(hoy, hoy, `hoy (${asisFechaLarga(hoy)})`);

    if (/\b(semana pasada|ultima semana|semana anterior)\b/.test(t)) {
        const l = asisSumarDias(asisLunesDe(hoy), -7);
        return r(l, asisSumarDias(l, 6), 'la semana pasada');
    }
    if (/\b(proxima semana|semana que viene|siguiente semana|semana siguiente)\b/.test(t)) {
        const l = asisSumarDias(asisLunesDe(hoy), 7);
        return r(l, asisSumarDias(l, 6), 'la próxima semana');
    }
    if (/\b(esta semana|semana actual|en la semana)\b/.test(t)) {
        const l = asisLunesDe(hoy);
        return r(l, asisSumarDias(l, 6), 'esta semana');
    }

    if (/\b(mes pasado|ultimo mes|mes anterior)\b/.test(t)) {
        const a = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        return r(a, new Date(hoy.getFullYear(), hoy.getMonth(), 0), `el mes pasado (${ASIS_MESES[a.getMonth()]})`);
    }
    if (/\b(proximo mes|mes que viene|siguiente mes)\b/.test(t)) {
        const a = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
        return r(a, new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0), `el próximo mes (${ASIS_MESES[a.getMonth()]})`);
    }
    if (/\b(este mes|mes actual|en el mes|del mes)\b/.test(t)) {
        return r(new Date(hoy.getFullYear(), hoy.getMonth(), 1), new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0), `este mes (${ASIS_MESES[hoy.getMonth()]})`);
    }

    const reMes = new RegExp(`\\b(${ASIS_MESES.join('|')}|setiembre)\\b(?: (?:de |del )?(20\\d\\d))?`);
    m = t.match(reMes);
    if (m) {
        const mesIdx = m[1] === 'setiembre' ? 8 : ASIS_MESES.indexOf(m[1]);
        const anio = m[2] ? +m[2] : hoy.getFullYear();
        return r(new Date(anio, mesIdx, 1), new Date(anio, mesIdx + 1, 0), `en ${ASIS_MESES[mesIdx]} ${anio}`);
    }

    if (/\b(ano pasado|el ano anterior)\b/.test(t)) {
        const y = hoy.getFullYear() - 1;
        return r(new Date(y, 0, 1), new Date(y, 11, 31), `el año ${y}`);
    }
    m = t.match(/\b(?:en el|del|el|ano|en) (20\d\d)\b/);
    if (m) { const y = +m[1]; return r(new Date(y, 0, 1), new Date(y, 11, 31), `el año ${y}`); }
    if (/\b(este ano|ano actual|en el ano|del ano|en lo que va del ano)\b/.test(t)) {
        return r(new Date(hoy.getFullYear(), 0, 1), new Date(hoy.getFullYear(), 11, 31), `este año (${hoy.getFullYear()})`);
    }

    m = t.match(/\b(?:(el|este|proximo|el proximo) )?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)( pasado)?\b/);
    if (m) {
        const idx = ASIS_DIAS_SEMANA.indexOf(m[2]);
        let diff = (idx - hoy.getDay() + 7) % 7;
        if (m[3]) diff = diff === 0 ? -7 : diff - 7;
        else if (m[1] && m[1].includes('proximo') && diff === 0) diff = 7;
        const d = asisSumarDias(hoy, diff);
        return r(d, d, `el ${asisFechaLarga(d)}`);
    }
    return null;
}

// =============================================================
// 🏷️ ENTIDADES
// =============================================================
const ASIS_FAMILIAS_ESPECIALIDAD = [
    { etiqueta: 'ODONTOPEDIATRÍA', re: /\b(odonto\w*|dental)\b/, dato: v => v.includes('odonto') },
    { etiqueta: 'TRAUMATOLOGÍA', re: /\btrauma\w*\b/, dato: v => v.includes('traumat') },
    { etiqueta: 'GINECOLOGÍA', re: /\b(gine\w*|obstetric\w*)\b/, dato: v => v.includes('ginec') || v.includes('obstet') },
    { etiqueta: 'OFTALMOLOGÍA', re: /\b(oftalmo\w*|oftlamo\w*|oft)\b/, dato: v => v.includes('oftal') || v.includes('oftla') },
    { etiqueta: 'ORL', re: /\b(orl|otorrino\w*)\b/, dato: v => /\borl\b/.test(v) || v.includes('otorrino') },
    { etiqueta: 'MAXILOFACIAL', re: /\bmaxilo\w*\b/, dato: v => v.includes('maxilo') },
    { etiqueta: 'UROLOGÍA', re: /\buro(logia|logica|logo|logos)?\b/, dato: v => v.includes('urolog') },
    { etiqueta: 'CIRUGÍA INFANTIL', re: /\b(cirugia infantil|infantil|cirugia pediatrica|pediatric\w*)\b/, dato: v => v.includes('infantil') || (v.includes('pediatr') && !v.includes('odonto')) },
    { etiqueta: 'CIRUGÍA GENERAL / ADULTO', re: /\bcirugia (general|adulto|de adulto)\b/, dato: v => v.includes('cirugia general') || v.includes('cirugia adulto') }
];

function asisDetectarEspecialidad(t) {
    for (const fam of ASIS_FAMILIAS_ESPECIALIDAD) {
        if (fam.re.test(t)) return { etiqueta: fam.etiqueta, coincide: valor => fam.dato(asisNorm(valor)) };
    }
    // Cualquier otra especialidad cargada en los desplegables/listas que
    // aparezca tal cual en la pregunta.
    const candidatas = new Set();
    try { (desplegablesCache.Especialidad || []).forEach(e => candidatas.add(e)); } catch (e) { /* sin caché */ }
    try { (especialidadesLista || []).forEach(e => candidatas.add(e)); } catch (e) { /* sin lista */ }
    for (const cand of candidatas) {
        const n = asisNorm(cand);
        if (n.length >= 4 && n !== 'seleccione' && asisTiene(t, n)) {
            return { etiqueta: cand, coincide: valor => asisNorm(valor) === n };
        }
    }
    return null;
}

function asisDetectarPabellon(t) {
    const m = t.match(/\b(?:pabellon|pab)\s*(1|2|uno|dos)\b/);
    if (!m) return null;
    return (m[1] === '1' || m[1] === 'uno') ? 'PAB 1' : 'PAB 2';
}

function asisDetectarJornada(t) {
    let m = t.match(/\b(?:jornada|bloque|turno)\s*(am|pm)\b/);
    if (m) return m[1].toUpperCase();
    if (/\b(en|por|de) la manana\b|\besta manana\b/.test(t)) return 'AM';
    if (/\b(en|por|de) la tarde\b|\besta tarde\b/.test(t)) return 'PM';
    m = t.match(/\b(am|pm)\b/);
    return m ? m[1].toUpperCase() : null;
}

function asisDetectarRut(original) {
    const m = (original || '').match(/\b(\d{1,2}\.?\d{3}\.?\d{3})\s*-?\s*([0-9kK])\b/);
    return m ? asisRutLimpio(m[1] + m[2]) : null;
}

function asisListaMedicosConocidos() {
    const set = new Set();
    const agregar = v => { if (v && !/^(otro|seleccione)$/i.test(String(v).trim())) set.add(String(v)); };
    try { Object.values(medicosPorEspecialidadCache || {}).forEach(arr => (arr || []).forEach(agregar)); } catch (e) { /* sin caché */ }
    try { Object.values(medicosPorEspecialidad || {}).forEach(arr => (arr || []).forEach(agregar)); } catch (e) { /* sin lista */ }
    asisFilasTabla().forEach(x => agregar(x.fila.Cirujano));
    asisPacientesLESinc().forEach(p => agregar(p.medicoTratante));
    return Array.from(set);
}

const ASIS_PALABRAS_NO_NOMBRE = new Set(('manana hoy ayer lunes martes miercoles jueves viernes sabado domingo semana mes ano esta este proximo pasado en el la de del los las y con para que opera opero operan cirugias cirugia pacientes paciente tiene tuvo hizo hace cuantos cuantas quienes pabellon jornada am pm ' +
    // Vocabulario de la app: nunca es parte de un nombre de paciente
    // ("¿cómo va la tabla?" no debe buscar a un paciente llamado "tabla").
    'tabla tablas lista listas espera libro estadistica estadisticas indice indices suspension suspensiones suspendidos ocupacion rendimiento ambulatorizacion seccion boton menu manual chat avatar asistente sistema app aplicacion usuario usuarios estado estados estatus programable programables programados programado diferidos diferido urgencia urgencias operados operado llamados llamadas llamada dashboard reporte registro registros datos dato informacion cosas todo todos general resumen ' +
    ASIS_MESES.join(' ')).split(' '));

function asisDetectarMedico(t) {
    const m = t.match(/\b(?:dr|dra|doctor|doctora|cirujano|cirujana|medico|medica|tratante)\s+([a-z]+(?:\s+[a-z]+){0,3})/);
    if (!m) return null;
    const crudos = m[1].split(' ').filter(tok => tok.length >= 3 && !ASIS_PALABRAS_NO_NOMBRE.has(tok));
    if (crudos.length === 0) return null;
    const conocidos = asisListaMedicosConocidos();
    const tokens = [];
    for (const tok of crudos) {
        const prueba = [...tokens, tok];
        if (conocidos.length === 0 || conocidos.some(c => asisCoincideTokens(c, prueba))) tokens.push(tok);
        else break;
    }
    if (tokens.length === 0) return null;
    const nombres = conocidos.filter(c => asisCoincideTokens(c, tokens));
    return { tokens, etiqueta: nombres.length === 1 ? nombres[0] : tokens.join(' ').toUpperCase() };
}

const ASIS_ESTADOS_IQX = [
    { re: /\bcondicional\w* (no operad|sin operar)/, etiqueta: 'CONDICIONAL (NO OPERADO)', coincide: v => v === 'CONDICIONAL (NO OPERADO)' },
    { re: /\b(operad\w* condicional\w*|condicional\w* operad)/, etiqueta: 'OPERADO (CONDICIONAL)', coincide: v => v === 'OPERADO (CONDICIONAL)' },
    { re: /\bsuspen(did|sion|der)\w*/, etiqueta: 'SUSPENDIDO', coincide: v => v === 'SUSPENDIDO' },
    { re: /\burgencias?\b/, etiqueta: 'URGENCIA', coincide: v => v === 'URGENCIA' },
    { re: /\b(perianalgesia|partos?)\b/, etiqueta: 'PERIANALGESIA (PARTO)', coincide: v => v.startsWith('PERIANALGESIA') },
    { re: /\bagregad\w*/, etiqueta: 'OPERADO (AGREGADO)', coincide: v => v === 'OPERADO (AGREGADO)' },
    { re: /\bpad\b/, etiqueta: 'OPERADO (PAD)', coincide: v => v === 'OPERADO (PAD)' },
    { re: /\b(sin estado|sin resultado|pendientes? de resultado)\b/, etiqueta: 'sin estado aún', coincide: v => !v || v === 'SELECCIONE' },
    { re: /\boperad\w*|\bse (operaron|opero|realizaron|hicieron)\b|\brealizad\w*/, etiqueta: 'OPERADO (cualquier tipo)', coincide: v => v.startsWith('OPERADO') }
];

function asisDetectarEstadoIqx(t) {
    for (const e of ASIS_ESTADOS_IQX) {
        if (e.re.test(t)) return { etiqueta: e.etiqueta, coincide: valor => e.coincide((valor || '').toString().trim().toUpperCase()) };
    }
    return null;
}

const ASIS_ESTATUS_LE_DEFECTO = ['PROGRAMABLE', 'NO PROGRAMABLE', 'PENDIENTE EPA', 'ACTUALIZAR', 'PROGRAMADO EN TABLA',
    'EN LISTA DE DIFERIDOS', 'EGRESO', 'RECHAZO', 'OPERADO', 'TRASLADO INTERNO', 'REALIZADA EN EXTRASISTEMA',
    'SUSPENDIDO', 'URGENCIA', 'CONDICIONAL (NO OPERADO)'];

function asisDetectarEstatusLE(t) {
    const candidatas = new Set(ASIS_ESTATUS_LE_DEFECTO);
    try { (estatusTablaLista || []).forEach(e => e && candidatas.add(String(e).toUpperCase())); } catch (e) { /* sin lista */ }
    const ordenadas = Array.from(candidatas).sort((a, b) => b.length - a.length);
    for (const est of ordenadas) {
        const n = asisNorm(est);
        if (n && asisTiene(t, n)) return est;
    }
    if (/\bepa\b/.test(t) && /\bpendiente/.test(t)) return 'PENDIENTE EPA';
    return null;
}

function asisDetectarPrioridad(t) {
    const m = t.match(/\b(?:prioridad\s*|p)([123])\b/);
    return m ? m[1] : null;
}

function asisDetectarGes(t) {
    if (/\b(no ges|sin ges|ges no|no son ges)\b/.test(t)) return 'NO';
    if (/\bges\b/.test(t)) return 'SI';
    return null;
}

function asisDetectarN(t) {
    const m = t.match(/\b(?:top|primeros?|primeras?|ultimos?|los|las)\s+(\d{1,3})\b/);
    if (!m) return null;
    const n = +m[1];
    return n >= 1 && n <= 100 ? n : null;
}

const ASIS_RE_BUSCAR = /\b(?:busca(?:r|me)?(?: a(?:l)?)?|buscar a(?:l)?|encuentra(?:me)?(?: a(?:l)?)?|donde (?:esta|quedo|se encuentra|anda|aparece)|en que (?:estado|estatus|parte|situacion)? ?(?:esta|va|quedo|anda)|estatus (?:de|del)|estado (?:de|del)|informacion (?:de|del|sobre)|datos (?:de|del)|ficha (?:de|del)|que (?:paso|pasa|sabes) (?:con|de)|cuando (?:se )?opera(?:n)?(?: a)?|quien es|historial (?:de|del)|como va(?: el| la)?)\s+(.+)$/;

function asisDetectarNombre(t) {
    const m = t.match(ASIS_RE_BUSCAR);
    if (!m) return null;
    const tokens = asisTokens(m[1].replace(/\b\d[\d.k-]*\b/g, ' '))
        .filter(tok => tok.length >= 2 && !ASIS_STOPWORDS.has(tok) && !ASIS_PALABRAS_NO_NOMBRE.has(tok))
        .slice(0, 4);
    if (tokens.length === 0 || !tokens.some(tok => tok.length >= 3)) return null;
    return tokens;
}

function asisEsComoHacer(t) {
    return /^(que es|que son|que significa|que significan|que quiere decir|para que (sirve|sirven|es)|que hace|que hacen|donde (esta|estan|encuentro|veo|aparece|aparecen|se ve|se encuentra)|se puede|puedo|es posible|explica|explicame|cual es la diferencia|que diferencia|por que (no|se|aparece|desaparece|me|esta|estan|sale))\b/.test(t)
        || /\bcomo (se |lo |la |le |puedo |hago |hacer |debo |funciona|uso |usar |cambio |agrego |agregar |elimino |eliminar |borro |borrar |creo |crear |doy |activo |desactivo |veo |ver |busco |buscar |filtro |exporto |exportar |imprimo |imprimir |cargo |cargar |registro |registrar |difiero |diferir |reubico |reubicar |reintegro |reintegrar |envio |enviar |recupero |recuperar |configuro |asigno |quito |pongo |saco |descargo |descargar |marco |marcar |edito |editar |modifico |ingreso |ingresar |programo |programar |cancelo |cierro |abro |accedo |entro |guardo |guardar |subo |calcula|se calcula|funcionan|mando |mandar |limpio |limpiar |silencio |muevo |mover |renombro |inicio |cambiar )/.test(t)
        || /\b(como se calcula|de donde sale|que formula|cual es la formula)\b/.test(t);
}

function asisAnalizar(original) {
    const t = asisNorm(original);
    const ctx = {
        original, t,
        rango: asisExtraerRango(t),
        esp: asisDetectarEspecialidad(t),
        pab: asisDetectarPabellon(t),
        jornada: asisDetectarJornada(t),
        rut: asisDetectarRut(original),
        medico: asisDetectarMedico(t),
        estadoIqx: asisDetectarEstadoIqx(t),
        estatusLE: asisDetectarEstatusLE(t),
        prioridad: asisDetectarPrioridad(t),
        ges: asisDetectarGes(t),
        n: asisDetectarN(t),
        nombreTokens: asisDetectarNombre(t),
        esComoHacer: asisEsComoHacer(t),
        esCuanto: /\b(cuant[oa]s?|numero de|cantidad de|total de|cuenta)\b/.test(t),
        esLista: /\b(quien(es)?|cuales|lista(do)?|detalle|nombres?|que pacientes|muestra(me)?|dime (los|las|quienes)|ver (los|las)|cuales son)\b/.test(t)
    };
    ctx.contextoLE = /\b(lista de espera|en espera|esperando|le|epa|programables?|prioridad|ges|folio|llamad\w*|llamar|ingres\w*|estatus|tratante|preoperatorio)\b/.test(t)
        || !!ctx.prioridad || !!ctx.ges;
    ctx.contextoTabla = /\b(tabla|programad\w*|pabellon|cupos?|filas?|jornada|operan|opera|operara|operaran|se opera\w*|agendad\w*|cirugias?|intervenciones|cirujano)\b/.test(t)
        || !!ctx.pab || !!ctx.jornada;
    ctx.contextoLibro = /\b(libro|registrad\w*|realizad\w*|se hicieron|se realizaron|se operaron|produccion|hubo)\b/.test(t);
    return ctx;
}

// =============================================================
// 💾 FUENTES DE DATOS (siempre lectura -- el asistente nunca escribe)
// =============================================================
async function asisLeerNodoCacheado(ruta, ttlMs) {
    const c = asisCache[ruta];
    if (c && (Date.now() - c.ts) < ttlMs) return c.data;
    const snap = await database.ref(ruta).once('value');
    const data = snap.val() || {};
    asisCache[ruta] = { ts: Date.now(), data };
    return data;
}

// Filas de la Tabla Quirúrgica en memoria (sincronizada en tiempo real por
// js/03) que tienen un paciente cargado.
function asisFilasTabla() {
    if (typeof semanas === 'undefined' || !Array.isArray(semanas)) return [];
    const out = [];
    semanas.forEach((semana, w) => (semana || []).forEach((diaObj, d) => {
        const pabs = (diaObj && diaObj.pabs) || {};
        Object.keys(pabs).forEach(pab => (pabs[pab] || []).forEach((fila, f) => {
            if (!fila) return;
            const tienePaciente = typeof filaTienePacienteCargado === 'function'
                ? filaTienePacienteCargado(fila)
                : !!(fila.Nombre_Paciente || fila.RUT);
            if (!tienePaciente) return;
            out.push({ origen: 'tabla', fila, semanaIdx: w, diaIdx: d, pab, filaIdx: f, fecha: asisFechaDesdeValor(fila.FECHA) });
        }));
    }));
    return out;
}

// Cada pestaña "Semana N" es una semana calendario (LUN..DOM) que se
// recicla mes a mes -- se deduce su lunes real a partir de las FECHA ya
// escritas en cualquiera de sus días (votación), así también se conoce la
// fecha de los días que todavía están vacíos.
function asisMapaSemanasTabla() {
    const votos = {};
    asisFilasTabla().forEach(x => {
        const d = asisParseFecha(x.fecha);
        if (!d) return;
        const lunes = asisFmt(asisSumarDias(d, -x.diaIdx));
        votos[x.semanaIdx] = votos[x.semanaIdx] || {};
        votos[x.semanaIdx][lunes] = (votos[x.semanaIdx][lunes] || 0) + 1;
    });
    const mapa = {};
    Object.keys(votos).forEach(w => {
        const ganador = Object.entries(votos[w]).sort((a, b) => b[1] - a[1])[0];
        if (ganador) mapa[w] = ganador[0];
    });
    return mapa; // { semanaIdx: 'YYYY-MM-DD' (lunes) }
}

function asisUbicarFechaEnTabla(fechaStr) {
    const mapa = asisMapaSemanasTabla();
    const objetivo = asisParseFecha(fechaStr);
    if (!objetivo) return null;
    for (const w of Object.keys(mapa)) {
        const lunes = asisParseFecha(mapa[w]);
        const diff = Math.round((objetivo - lunes) / 86400000);
        if (diff >= 0 && diff <= 6) return { semanaIdx: +w, diaIdx: diff };
    }
    return null;
}

async function asisRegistrosLibro() {
    const data = await asisLeerNodoCacheado('registros_definitivos', 120000);
    return Object.keys(data).map(id => {
        const fila = data[id] || {};
        return { origen: 'libro', id, fila, pab: (fila.metadata && fila.metadata.pabellon) || '', fecha: asisFechaDesdeValor(fila.FECHA) };
    });
}

async function asisRegistrosDiferidos() {
    const data = await asisLeerNodoCacheado('pacientes_diferidos', 60000);
    return Object.keys(data).map(id => {
        const fila = data[id] || {};
        const ts = fila.metadata && fila.metadata.fecha_diferido;
        return { origen: 'diferidos', id, fila, fechaDiferido: typeof ts === 'number' ? asisFmt(new Date(ts)) : '' };
    });
}

function asisPacientesLESinc() {
    try { if (Array.isArray(patients) && patients.length) return patients; } catch (e) { /* módulo no cargado */ }
    const c = asisCache['patients'];
    return c ? Object.keys(c.data).map(k => ({ firebaseKey: k, ...c.data[k] })) : [];
}

async function asisPacientesLE() {
    try { if (Array.isArray(patients) && patients.length) return patients; } catch (e) { /* módulo no cargado */ }
    const data = await asisLeerNodoCacheado('patients', 60000);
    return Object.keys(data).map(k => ({ firebaseKey: k, ...data[k] }));
}

function asisPacienteEnMemoria(key) {
    try { return Array.isArray(patients) && patients.some(p => p.firebaseKey === key); } catch (e) { return false; }
}

function asisDiasEspera(p, fuente) {
    const inicio = fuente === 'fechaEstatusProgram' ? p.fechaEstatusProgram : p.fechaIndQx;
    if (!inicio || typeof calculateWaitingDays !== 'function') return null;
    const fin = typeof obtenerFechaFinEsperaCongelada === 'function' ? obtenerFechaFinEsperaCongelada(p) : null;
    return calculateWaitingDays(inicio, fin);
}

function asisEsGestionable(p) {
    if (typeof esGestionable === 'function') return esGestionable(p);
    return !['EGRESO', 'RECHAZO', 'TRASLADO INTERNO', 'OPERADO', 'REALIZADA EN EXTRASISTEMA'].includes((p.estatusTabla || '').toUpperCase());
}

// =============================================================
// 🧩 RESPUESTAS: piezas reutilizables
// =============================================================
function asisRegistrarAccion(fn) {
    const id = 'a' + (asisSiguienteIdAccion++);
    asisAccionesRegistro.set(id, fn);
    return id;
}

function asisBotonInline(texto, fn, titulo) {
    const id = asisRegistrarAccion(fn);
    return `<button class="asis-btn-inline" data-asis-accion="${id}" title="${asisEsc(titulo || '')}">${texto}</button>`;
}

function asisSinAcceso(que) {
    return {
        html: `⛔ No tienes acceso a ${que}, así que no puedo mostrarte esos datos. Si lo necesitas, pídele al administrador que te habilite el permiso.`,
        voz: `No tienes acceso a ${que.replace(/<[^>]+>/g, '')}.`
    };
}

function asisDescribirFiltros(ctx, opciones = {}) {
    const partes = [];
    if (ctx.esp) partes.push(`de <b>${asisEsc(ctx.esp.etiqueta)}</b>`);
    if (ctx.pab && !opciones.sinPab) partes.push(`en <b>${ctx.pab}</b>`);
    if (ctx.jornada) partes.push(`jornada <b>${ctx.jornada}</b>`);
    if (ctx.medico) partes.push(`con <b>${asisEsc(ctx.medico.etiqueta)}</b>`);
    if (ctx.estadoIqx && !opciones.sinEstado && !opciones.conLE) partes.push(`en estado <b>${asisEsc(ctx.estadoIqx.etiqueta)}</b>`);
    if (ctx.estatusLE && opciones.conEstatusLE) partes.push(`en estatus <b>${asisEsc(ctx.estatusLE)}</b>`);
    if (ctx.prioridad && opciones.conLE) partes.push(`prioridad <b>P${ctx.prioridad}</b>`);
    if (ctx.ges && opciones.conLE) partes.push(ctx.ges === 'SI' ? '<b>GES</b>' : '<b>no GES</b>');
    return partes.join(' ');
}

function asisTextoPlano(html) {
    return (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

// Primera oración "hablable" de un texto: corta en el primer punto (no en
// ":", que suele anteceder a una lista) y, si igual queda larga, en una
// coma o espacio antes de ~220 caracteres.
function asisPrimeraOracion(html) {
    const plano = asisTextoPlano(html);
    let frase = plano.split(/(?<=\.)\s/)[0];
    if (frase.length > 220) {
        const corte = frase.slice(0, 220);
        const idx = Math.max(corte.lastIndexOf(','), corte.lastIndexOf(';'));
        frase = idx > 80 ? corte.slice(0, idx) : corte.replace(/\s\S*$/, '');
    }
    return frase.replace(/[:→]\s*$/, '').trim();
}

function asisContarPor(items, claveFn) {
    const conteo = {};
    items.forEach(it => {
        const k = (claveFn(it) || '').toString().trim() || '(sin dato)';
        conteo[k] = (conteo[k] || 0) + 1;
    });
    return Object.entries(conteo).sort((a, b) => b[1] - a[1]);
}

function asisChipsConteo(pares, max = 8) {
    const visibles = pares.slice(0, max);
    const resto = pares.length - visibles.length;
    return `<div class="asis-chips">${visibles.map(([k, v]) => `<span class="asis-chip-dato">${asisEsc(k)}: <b>${v}</b></span>`).join('')}${resto > 0 ? `<span class="asis-chip-dato">+${resto} más</span>` : ''}</div>`;
}

function asisListaHtml(items, renderItem, max = ASIS_MAX_ITEMS_LISTA) {
    const visibles = items.slice(0, max);
    const resto = items.length - visibles.length;
    return `<ul class="asis-lista">${visibles.map(renderItem).join('')}</ul>${resto > 0 ? `<div class="asis-nota">…y ${asisPlural(resto, 'más')}. Agrega un filtro (especialidad, pabellón, fecha) para acotar.</div>` : ''}`;
}

// =============================================================
// 🧭 ACCIONES (navegación -- nunca modifican datos)
// =============================================================
function asisCerrarPanel() {
    if (typeof cerrarPanelRecordatorios === 'function') cerrarPanelRecordatorios();
}

const ASIS_MENU_MODALES = { reunionTabla: 'navReunionTabla', analisisIa: 'navAnalisisIA', generadorPpt: 'navGeneradorPpt', vistaDividida: 'navVistaDividida' };

function asisIrSeccion(seccion, sub) {
    asisCerrarPanel();
    if (ASIS_MENU_MODALES[seccion]) {
        const btn = document.getElementById(ASIS_MENU_MODALES[seccion]);
        if (btn) btn.click();
        return;
    }
    if (typeof cambiarSeccion === 'function') cambiarSeccion(seccion);
    if (seccion === 'listaEspera' && sub && typeof leCambiarSubseccion === 'function') {
        setTimeout(() => leCambiarSubseccion(sub), 150);
    }
}

function asisIrTabla(semanaIdx, diaIdx) {
    asisCerrarPanel();
    if (typeof cambiarSeccion === 'function') cambiarSeccion('registro');
    setTimeout(() => {
        const tabs = document.querySelectorAll('#tabContainer .tab-btn');
        if (tabs[semanaIdx] && !tabs[semanaIdx].classList.contains('active')) tabs[semanaIdx].click();
        setTimeout(() => {
            const dias = document.querySelectorAll('.day-btn');
            if (dias[diaIdx] && !dias[diaIdx].classList.contains('active')) dias[diaIdx].click();
        }, 200);
    }, 150);
}

function asisAbrirManual(seccionId) {
    asisCerrarPanel();
    if (typeof cambiarSeccion === 'function') cambiarSeccion('manual');
    setTimeout(() => {
        const item = document.querySelector(`.manual-indice-item[data-seccion="${seccionId}"]`);
        if (item) item.click();
    }, 200);
}

function asisVerFicha(key) {
    asisCerrarPanel();
    if (typeof leShowPatientModal === 'function') leShowPatientModal(key);
}

function asisAccionesPaciente(p) {
    if (!asisPacienteEnMemoria(p.firebaseKey)) return '';
    let html = asisBotonInline('👁️', () => asisVerFicha(p.firebaseKey), 'Ver ficha');
    if (typeof abrirModalRegistroLlamada === 'function' && asisPuede('listaEspera_registrarLlamada')) {
        html += asisBotonInline('📞', () => { asisCerrarPanel(); abrirModalRegistroLlamada(p.firebaseKey); }, 'Registrar llamada');
    }
    return html;
}

// =============================================================
// 🩺 INTENCIONES DE DATOS
// =============================================================

// --- Tabla Quirúrgica + Libro de Quirófano (pacientes por fecha/filtros) ---
async function asisHandlerRegistros(ctx) {
    const puedeTabla = asisPuede('registro');
    const puedeLibro = asisPuede('libro');
    if (!puedeTabla && !puedeLibro) return asisSinAcceso('la Tabla Quirúrgica ni al Libro de Quirófano');

    const hoyStr = asisFmt(asisHoy());
    let rango = ctx.rango;
    if (!rango) {
        if (ctx.contextoLibro) {
            const h = asisHoy();
            rango = { desde: asisFmt(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: hoyStr, etiqueta: `este mes (${ASIS_MESES[h.getMonth()]})` };
        } else {
            const fechas = asisFilasTabla().map(x => x.fecha).filter(f => f && f >= hoyStr).sort();
            rango = { desde: hoyStr, hasta: fechas.length ? fechas[fechas.length - 1] : hoyStr, etiqueta: 'desde hoy en adelante (lo que está armado en la Tabla)' };
        }
    }

    const fuentes = [];
    if (puedeTabla) fuentes.push(...asisFilasTabla());
    if (puedeLibro && rango.desde <= hoyStr) fuentes.push(...await asisRegistrosLibro());

    const filtradas = fuentes.filter(x => x.fecha && x.fecha >= rango.desde && x.fecha <= rango.hasta
        && (!ctx.esp || ctx.esp.coincide(x.fila.Especialidad))
        && (!ctx.pab || x.pab === ctx.pab)
        && (!ctx.jornada || (x.fila.Jornada || '').toString().toUpperCase() === ctx.jornada)
        && (!ctx.medico || asisCoincideTokens(x.fila.Cirujano, ctx.medico.tokens))
        && (!ctx.estadoIqx || ctx.estadoIqx.coincide(x.fila.ESTADO_DE_IQx)));

    filtradas.sort((a, b) => (a.fecha + a.pab + (a.fila.Jornada || '')).localeCompare(b.fecha + b.pab + (b.fila.Jornada || '')));

    const filtros = asisDescribirFiltros(ctx);
    const n = filtradas.length;
    const avisoPermisos = !puedeTabla ? '<div class="asis-nota">ℹ️ Solo incluí el Libro de Quirófano (no tienes acceso a la Tabla Quirúrgica).</div>'
        : (!puedeLibro && rango.desde < hoyStr ? '<div class="asis-nota">ℹ️ Solo incluí la Tabla Quirúrgica (no tienes acceso al Libro de Quirófano, donde quedan los días ya registrados).</div>' : '');

    if (n === 0) {
        return {
            html: `No encontré pacientes ${filtros} ${asisEsc(rango.etiqueta)}.${avisoPermisos}`,
            voz: `No encontré pacientes ${asisTextoPlano(filtros)} ${rango.etiqueta}.`
        };
    }

    let html = `📋 <b>${asisPlural(n, 'paciente')}</b> ${filtros} ${asisEsc(rango.etiqueta)}.`;
    if (!ctx.estadoIqx) {
        const porEstado = asisContarPor(filtradas, x => {
            const e = (x.fila.ESTADO_DE_IQx || '').toString().trim();
            return (!e || e === 'Seleccione') ? 'Sin estado aún' : e;
        });
        if (porEstado.length > 1 || porEstado[0][0] !== 'Sin estado aún') html += asisChipsConteo(porEstado);
    }
    if (!ctx.esp && n > 2) html += asisChipsConteo(asisContarPor(filtradas, x => x.fila.Especialidad), 6);
    if (!ctx.pab && n > 2) html += asisChipsConteo(asisContarPor(filtradas, x => x.pab || 'Sin pabellón'), 3);

    if (ctx.estadoIqx && ctx.estadoIqx.etiqueta === 'SUSPENDIDO') {
        const causales = asisContarPor(filtradas, x => x.fila.Causal_de_suspension);
        html += `<div class="asis-sub">Principales causales:</div>${asisChipsConteo(causales, 5)}`;
    }

    if (ctx.esLista || n <= ASIS_MAX_ITEMS_LISTA || !ctx.esCuanto) {
        html += asisListaHtml(filtradas, x => {
            const f = x.fila;
            const estado = (f.ESTADO_DE_IQx && f.ESTADO_DE_IQx !== 'Seleccione') ? ` · <i>${asisEsc(f.ESTADO_DE_IQx)}</i>` : '';
            const ir = x.origen === 'tabla' ? asisBotonInline('↗', () => asisIrTabla(x.semanaIdx, x.diaIdx), 'Ver en la Tabla') : '<span title="Libro de Quirófano">📘</span>';
            return `<li>${ir} ${asisFechaCorta(x.fecha)} · ${asisEsc(x.pab || '')}${f.Jornada && f.Jornada !== 'Seleccione' ? ' ' + asisEsc(f.Jornada) : ''} — <b>${asisEsc(f.Nombre_Paciente || '(sin nombre)')}</b>${f.Especialidad && f.Especialidad !== 'Seleccione' ? ' · ' + asisEsc(f.Especialidad) : ''}${f.Cirujano && f.Cirujano !== 'Seleccione' ? ' · ' + asisEsc(f.Cirujano) : ''}${f.Intervencion_propuesta ? ' · ' + asisEsc(f.Intervencion_propuesta) : ''}${estado}</li>`;
        });
    }
    html += avisoPermisos;

    const acciones = [];
    const diasTabla = new Set(filtradas.filter(x => x.origen === 'tabla').map(x => x.semanaIdx + '-' + x.diaIdx));
    if (diasTabla.size === 1) {
        const [w, d] = Array.from(diasTabla)[0].split('-').map(Number);
        acciones.push({ texto: '📋 Abrir ese día en la Tabla', fn: () => asisIrTabla(w, d) });
    }
    return { html, acciones, voz: `${asisPlural(n, 'paciente')} ${asisTextoPlano(filtros)} ${rango.etiqueta}.` };
}

// --- Cupos libres en la Tabla ---
function asisHandlerCupos(ctx) {
    if (!asisPuede('registro')) return asisSinAcceso('la Tabla Quirúrgica');
    if (typeof semanas === 'undefined') return { html: 'La Tabla Quirúrgica todavía no terminó de cargar. Intenta de nuevo en unos segundos.' };
    const hoy = asisHoy();
    const rango = ctx.rango || { desde: asisFmt(hoy), hasta: asisFmt(asisSumarDias(hoy, 6)), etiqueta: 'en los próximos 7 días' };
    const desde = asisParseFecha(rango.desde);
    const hasta = asisParseFecha(rango.hasta);
    const filas = [];
    let totalLibres = 0;
    const acciones = [];
    for (let d = new Date(desde), i = 0; d <= hasta && i < 31; d = asisSumarDias(d, 1), i++) {
        const fecha = asisFmt(d);
        const ubic = asisUbicarFechaEnTabla(fecha);
        if (!ubic) { filas.push(`<li>${asisFechaCorta(fecha)}: <span class="asis-nota">no está armado en la Tabla actual</span></li>`); continue; }
        const diaObj = semanas[ubic.semanaIdx] && semanas[ubic.semanaIdx][ubic.diaIdx];
        if (!diaObj) continue;
        const partes = Object.keys(diaObj.pabs || {})
            .filter(pab => !ctx.pab || pab === ctx.pab)
            .map(pab => {
                const rows = diaObj.pabs[pab] || [];
                const ocupadas = rows.filter(f => typeof filaTienePacienteCargado === 'function' ? filaTienePacienteCargado(f) : (f.Nombre_Paciente || f.RUT)).length;
                const libres = rows.length - ocupadas;
                totalLibres += libres;
                return `${pab}: <b>${libres}</b> de ${rows.length} filas libres`;
            });
        const ir = asisBotonInline('↗', () => asisIrTabla(ubic.semanaIdx, ubic.diaIdx), 'Abrir ese día');
        filas.push(`<li>${ir} ${asisFechaCorta(fecha)} (Semana ${ubic.semanaIdx + 1}) — ${partes.join(' · ')}</li>`);
        if (rango.desde === rango.hasta) acciones.push({ texto: '📋 Abrir ese día en la Tabla', fn: () => asisIrTabla(ubic.semanaIdx, ubic.diaIdx) });
    }
    return {
        html: `🗓️ Filas libres ${ctx.pab ? 'en ' + ctx.pab + ' ' : ''}${asisEsc(rango.etiqueta)}:<ul class="asis-lista">${filas.join('')}</ul><div class="asis-nota">Cada pabellón empieza con 5 filas; se pueden sumar más con "➕ Agregar Fila".</div>`,
        acciones,
        voz: `Hay ${asisPlural(totalLibres, 'fila libre', 'filas libres')} ${rango.etiqueta}.`
    };
}

// --- Causales de suspensión ---
async function asisHandlerCausales(ctx) {
    const puedeTabla = asisPuede('registro');
    const puedeLibro = asisPuede('libro') || asisPuede('estadisticas');
    if (!puedeTabla && !puedeLibro) return asisSinAcceso('la Tabla Quirúrgica ni al Libro de Quirófano');
    const hoy = asisHoy();
    const rango = ctx.rango || { desde: asisFmt(new Date(hoy.getFullYear(), 0, 1)), hasta: asisFmt(hoy), etiqueta: `este año (${hoy.getFullYear()})` };
    const fuentes = [];
    if (puedeLibro) fuentes.push(...await asisRegistrosLibro());
    if (puedeTabla) fuentes.push(...asisFilasTabla());
    const susp = fuentes.filter(x => x.fecha >= rango.desde && x.fecha <= rango.hasta
        && (x.fila.ESTADO_DE_IQx || '').toUpperCase() === 'SUSPENDIDO'
        && (!ctx.esp || ctx.esp.coincide(x.fila.Especialidad)));
    if (susp.length === 0) return { html: `No hay suspensiones ${asisDescribirFiltros(ctx, { sinEstado: true })} ${asisEsc(rango.etiqueta)}.`, voz: 'No hay suspensiones en ese período.' };
    const causales = asisContarPor(susp, x => x.fila.Causal_de_suspension);
    const motivos = asisContarPor(susp, x => x.fila.Motivo);
    const top = causales[0];
    return {
        html: `⛔ <b>${asisPlural(susp.length, 'suspensión', 'suspensiones')}</b> ${asisDescribirFiltros(ctx, { sinEstado: true })} ${asisEsc(rango.etiqueta)}.<div class="asis-sub">Por causal:</div>${asisChipsConteo(causales, 8)}<div class="asis-sub">Por motivo:</div>${asisChipsConteo(motivos, 8)}`,
        acciones: asisPuede('estadisticas') ? [{ texto: '📊 Ver en Estadísticas', fn: () => asisIrSeccion('estadisticas') }] : [],
        voz: `Hubo ${asisPlural(susp.length, 'suspensión', 'suspensiones')} ${rango.etiqueta}. La causal más frecuente fue ${top[0]}, con ${top[1]}.`
    };
}

// --- KPIs de Estadísticas (índice de suspensión, ambulatorización, ocupación, rendimiento) ---
async function asisHandlerKpi(ctx) {
    if (!asisPuede('estadisticas') && !asisPuede('libro')) return asisSinAcceso('Estadísticas ni al Libro de Quirófano');
    if (typeof calcularKPIsEstadisticas !== 'function') return { html: 'El módulo de Estadísticas no está disponible en este momento.' };
    const hoy = asisHoy();
    const libro = await asisRegistrosLibro();
    // Mismo criterio que el filtro general de Estadísticas: el período por
    // defecto es el año en curso, cerrado en la última fecha con datos (no
    // en el 31 de diciembre) para no contar días sin información.
    const ultimaConDatos = libro.map(x => x.fecha).filter(Boolean).sort().pop() || asisFmt(hoy);
    const rango = ctx.rango || { desde: asisFmt(new Date(hoy.getFullYear(), 0, 1)), hasta: ultimaConDatos, etiqueta: `este año (${hoy.getFullYear()})` };
    const hastaEfectivo = rango.hasta > ultimaConDatos ? ultimaConDatos : rango.hasta;
    const regs = libro.filter(x => x.fecha >= rango.desde && x.fecha <= hastaEfectivo
        && (!ctx.esp || ctx.esp.coincide(x.fila.Especialidad))).map(x => x.fila);
    if (regs.length === 0) return { html: `No hay registros en el Libro de Quirófano ${asisDescribirFiltros(ctx)} ${asisEsc(rango.etiqueta)}.`, voz: 'No hay registros en ese período.' };

    const t = ctx.t;
    const pideSusp = /\bsuspen/.test(t);
    const pideAmb = /\bambulatori/.test(t);
    const pideOcup = /\bocupacion/.test(t);
    const pideRend = /\brendimiento/.test(t);
    const todos = !pideSusp && !pideAmb && !pideOcup && !pideRend;
    const k = calcularKPIsEstadisticas(regs);
    const filtros = asisDescribirFiltros(ctx, { sinEstado: true });
    const partes = [];
    const vozPartes = [];

    if (pideSusp || todos) {
        partes.push(`📉 <b>Índice de suspensión Cmay: ${asisFmtNum(k.indiceSuspension)}%</b> (${k.suspCmay} suspendidos Cmay de ${k.progCmay} programados Cmay). Sin reemplazos por urgencia: <b>${asisFmtNum(k.indiceSuspensionSinUrgencia)}%</b>.`);
        vozPartes.push(`El índice de suspensión es ${asisFmtNum(k.indiceSuspension)} por ciento`);
    }
    if (pideAmb || todos) {
        partes.push(`🚶 <b>Índice de ambulatorización: ${asisFmtNum(k.indiceAmbulatorizacion)}%</b> (pacientes Cmay programados operados con destino CMA).`);
        vozPartes.push(`la ambulatorización es ${asisFmtNum(k.indiceAmbulatorizacion)} por ciento`);
    }
    if (todos) {
        partes.push(`🏥 Operados: <b>${k.totalOperados}</b> · Suspendidos: <b>${k.totalSuspendidos}</b> · Urgencias: <b>${k.totalUrgencia}</b> · Agregados: <b>${k.totalAgregados}</b>.`);
    }
    if ((pideOcup || pideRend || todos) && typeof calcularKpisOcupacion === 'function' && typeof calcularDiasHabiles === 'function') {
        try {
            if (typeof obtenerFeriados === 'function') {
                const anios = [];
                for (let y = +rango.desde.slice(0, 4); y <= +hastaEfectivo.slice(0, 4); y++) anios.push(y);
                await obtenerFeriados(anios);
            }
            if (typeof cargarDisponibilidadPabellon === 'function' && typeof estadisticasDisponibilidadPabellon !== 'undefined'
                && Object.keys(estadisticasDisponibilidadPabellon || {}).length === 0) {
                await cargarDisponibilidadPabellon();
            }
            const ko = calcularKpisOcupacion(regs, calcularDiasHabiles(rango.desde, hastaEfectivo));
            if (pideOcup || todos) {
                partes.push(`🏨 <b>Ocupación de pabellón: ${asisFmtNum(ko.porcentajeOcupacion)}%</b> (${typeof estadisticasFormatearHoras === 'function' ? estadisticasFormatearHoras(ko.horasTrabajadas) : asisFmtNum(ko.horasTrabajadas)} h trabajadas de ${typeof estadisticasFormatearHoras === 'function' ? estadisticasFormatearHoras(ko.horasHabilitadas) : asisFmtNum(ko.horasHabilitadas)} h habilitadas, ${ko.diasHabiles} días hábiles).`);
                vozPartes.push(`la ocupación es ${asisFmtNum(ko.porcentajeOcupacion)} por ciento`);
            }
            if (pideRend || todos) {
                partes.push(`⚙️ <b>Rendimiento:</b> ${ko.rendimientoSoloProgCmay.toFixed(2)} casos/pabellón/día (solo Cmay programado) · ${ko.rendimientoTotalCx.toFixed(2)} (total Cx).`);
                vozPartes.push(`el rendimiento es ${ko.rendimientoTotalCx.toFixed(2)} casos por pabellón al día`);
            }
        } catch (e) {
            console.warn('⚠️ Asistente: no se pudo calcular ocupación/rendimiento', e);
        }
    }
    const nota = hastaEfectivo < rango.hasta ? `<div class="asis-nota">Calculado hasta el ${asisFechaCorta(hastaEfectivo)}, último día con datos registrados en el Libro.</div>` : '';
    return {
        html: `📊 ${filtros ? filtros + ', ' : ''}${asisEsc(rango.etiqueta)} (Libro de Quirófano, ${asisPlural(regs.length, 'registro')}):<div class="asis-bloques">${partes.map(p => `<div>${p}</div>`).join('')}</div>${nota}`,
        acciones: asisPuede('estadisticas') ? [{ texto: '📊 Abrir Estadísticas', fn: () => asisIrSeccion('estadisticas') }] : [],
        voz: vozPartes.length ? `${rango.etiqueta}: ${vozPartes.join(', ')}.` : ''
    };
}

// --- Tiempos por intervención ---
async function asisHandlerTiempos(ctx) {
    if (!asisPuede('estadisticas') && !asisPuede('libro')) return asisSinAcceso('Estadísticas ni al Libro de Quirófano');
    const m = ctx.t.match(/\b(?:dura(?:n)?|demora(?:n)?|tarda(?:n)?|duracion(?: de(?:l| la| una| un)?)?|tiempo (?:promedio|quirurgico|de cirugia)(?: de(?:l| la| una| un)?)?)\s+(?:una |un |la |el |las |los )?(.+)$/);
    const tokens = m ? asisTokens(m[1]).filter(tok => tok.length >= 3 && !ASIS_STOPWORDS.has(tok) && !ASIS_PALABRAS_NO_NOMBRE.has(tok)).slice(0, 4) : [];
    if (tokens.length === 0) {
        return { html: 'Dime qué intervención, por ejemplo: <i>"¿cuánto dura una colecistectomía?"</i>. También puedes verlo en Estadísticas → 🩺 Tiempos por Intervención.', voz: '¿Qué intervención quieres consultar?' };
    }
    const libro = await asisRegistrosLibro();
    const parsear = typeof parsearDuracionHoras === 'function' ? parsearDuracionHoras : (v => {
        const s = (v || '').toString().match(/^(\d{1,2}):(\d{2})/);
        return s ? +s[1] + (+s[2]) / 60 : 0;
    });
    const casos = libro.filter(x => asisCoincideTokens(x.fila['1ra_Intervencion_Qx_Realizada'], tokens) && (!ctx.esp || ctx.esp.coincide(x.fila.Especialidad)));
    const durs = casos.map(x => parsear(x.fila.T_QX)).filter(d => d > 0);
    if (durs.length === 0) return { html: `No encontré casos registrados con duración para "<b>${asisEsc(tokens.join(' '))}</b>" en el Libro de Quirófano.`, voz: 'No encontré casos con esa intervención.' };
    const fmtH = h => typeof estadisticasFormatearHoras === 'function' ? estadisticasFormatearHoras(h) : asisFmtNum(h, 2);
    const prom = durs.reduce((a, b) => a + b, 0) / durs.length;
    const nombres = asisContarPor(casos, x => x.fila['1ra_Intervencion_Qx_Realizada']);
    return {
        html: `⏱️ "<b>${asisEsc(tokens.join(' '))}</b>" (${asisPlural(durs.length, 'caso')} con T_QX registrado):<div class="asis-bloques"><div>Promedio: <b>${fmtH(prom)}</b> · Mínimo: <b>${fmtH(Math.min(...durs))}</b> · Máximo: <b>${fmtH(Math.max(...durs))}</b></div></div><div class="asis-sub">Intervenciones incluidas:</div>${asisChipsConteo(nombres, 6)}<div class="asis-nota">T_QX = hora de salida − hora de entrada (sin el tiempo de viraje).</div>`,
        voz: `Dura en promedio ${fmtH(prom).replace(':', ' horas con ')} minutos, según ${durs.length} casos.`
    };
}

// --- Lista de Espera: a quién llamar ---
async function asisHandlerLlamados(ctx) {
    if (!asisPuede('listaEspera')) return asisSinAcceso('Lista de Espera');
    const pacientes = await asisPacientesLE();
    const hoyStr = asisFmt(asisHoy());
    const hasta = ctx.rango ? ctx.rango.hasta : asisFmt(asisSumarDias(asisHoy(), 10));
    const etiqueta = ctx.rango ? ctx.rango.etiqueta : 'en los próximos 10 días';
    const conLlamado = pacientes.filter(p => p.fechaProximoLlamado && asisFechaDesdeValor(p.fechaProximoLlamado)
        && (!ctx.esp || ctx.esp.coincide(p.especialidad)));
    const atrasados = conLlamado.filter(p => asisFechaDesdeValor(p.fechaProximoLlamado) < hoyStr)
        .sort((a, b) => asisFechaDesdeValor(a.fechaProximoLlamado).localeCompare(asisFechaDesdeValor(b.fechaProximoLlamado)));
    const pendientes = conLlamado.filter(p => { const f = asisFechaDesdeValor(p.fechaProximoLlamado); return f >= hoyStr && f <= hasta; })
        .sort((a, b) => asisFechaDesdeValor(a.fechaProximoLlamado).localeCompare(asisFechaDesdeValor(b.fechaProximoLlamado)));
    const item = p => {
        const tel = typeof leObtenerContactosPaciente === 'function' ? leObtenerContactosPaciente(p).join(', ') : (p.nContacto || '');
        return `<li>${asisAccionesPaciente(p)} ${asisFechaCorta(asisFechaDesdeValor(p.fechaProximoLlamado))} — <b>${asisEsc(p.nombreApellido || '')}</b>${p.especialidad ? ' · ' + asisEsc(p.especialidad) : ''}${tel ? ' · 📞 ' + asisEsc(tel) : ''}</li>`;
    };
    if (atrasados.length === 0 && pendientes.length === 0) {
        return { html: `✅ No hay llamados programados pendientes ${asisDescribirFiltros(ctx)} ${asisEsc(etiqueta)}, ni atrasados.`, voz: 'No hay llamados pendientes.' };
    }
    let html = '';
    if (atrasados.length) html += `🔴 <b>${asisPlural(atrasados.length, 'llamado atrasado', 'llamados atrasados')}</b>:${asisListaHtml(atrasados, item)}`;
    if (pendientes.length) html += `📞 <b>${asisPlural(pendientes.length, 'llamado')}</b> ${asisDescribirFiltros(ctx)} ${asisEsc(etiqueta)}:${asisListaHtml(pendientes, item)}`;
    return {
        html: html + '<div class="asis-nota">Sale de "📅 Programar Próximo Llamado" al registrar una llamada. 👁️ abre la ficha, 📞 registra la llamada.</div>',
        acciones: [{ texto: '🏠 Abrir Dashboard de Lista de Espera', fn: () => asisIrSeccion('listaEspera', 'dashboard') }],
        voz: `Tienes ${asisPlural(pendientes.length, 'llamado')} ${etiqueta}${atrasados.length ? ` y ${asisPlural(atrasados.length, 'atrasado')}` : ''}.`
    };
}

// --- Lista de Espera: 6 meses a 1 año / ACTUALIZAR ---
async function asisHandlerPlazo(ctx) {
    if (!asisPuede('listaEspera')) return asisSinAcceso('Lista de Espera');
    const pacientes = await asisPacientesLE();
    let lista;
    if (typeof obtenerPacientesPlazoEsperaDashboard === 'function' && pacientes === asisPacientesLESinc() && asisPacientesLESinc().length) {
        lista = obtenerPacientesPlazoEsperaDashboard();
    } else {
        lista = pacientes.filter(asisEsGestionable)
            .filter(p => (p.estatusTabla || '').toUpperCase() !== 'ACTUALIZAR' && p.fechaEstatusProgram)
            .map(p => ({ ...p, _diasTranscurridos: calculateWaitingDays(p.fechaEstatusProgram) }))
            .filter(p => p._diasTranscurridos >= 182)
            .sort((a, b) => b._diasTranscurridos - a._diasTranscurridos);
    }
    if (ctx.esp) lista = lista.filter(p => ctx.esp.coincide(p.especialidad));
    const actualizar = pacientes.filter(p => (p.estatusTabla || '').toUpperCase() === 'ACTUALIZAR' && (!ctx.esp || ctx.esp.coincide(p.especialidad)));
    let html = `⏳ <b>${asisPlural(lista.length, 'paciente')}</b> ${asisDescribirFiltros(ctx)} con más de 6 meses (y menos de 1 año) desde su Fecha Estatus Programable.`;
    if (lista.length) html += asisListaHtml(lista, p => `<li>${asisAccionesPaciente(p)} <b>${asisEsc(p.nombreApellido || '')}</b> · ${asisEsc(p.especialidad || '')} · ${p._diasTranscurridos} días</li>`);
    html += `<div class="asis-sub">🔄 En estatus ACTUALIZAR: <b>${actualizar.length}</b></div><div class="asis-nota">Un paciente PROGRAMABLE pasa solo a ACTUALIZAR al cumplir 1 año, con constancia en su historial.</div>`;
    return { html, voz: `${asisPlural(lista.length, 'paciente lleva', 'pacientes llevan')} entre seis meses y un año, y ${actualizar.length} ${actualizar.length === 1 ? 'está' : 'están'} en actualizar.` };
}

// --- Lista de Espera: mayor tiempo de espera ---
function asisFuenteEspera(t) {
    return /\b(fecha (de )?estatus|desde (que )?(es|esta|quedo|paso a) programable|estatus programable)\b/.test(t) ? 'fechaEstatusProgram' : 'fechaIndQx';
}

function asisFiltrarLE(pacientes, ctx, { soloGestionables = true } = {}) {
    return pacientes.filter(p =>
        (ctx.estatusLE ? (p.estatusTabla || '').toString().trim().toUpperCase() === ctx.estatusLE : (!soloGestionables || asisEsGestionable(p)))
        && (!ctx.esp || ctx.esp.coincide(p.especialidad))
        && (!ctx.prioridad || (p.prioridad || '').toString().replace(/\D/g, '') === ctx.prioridad)
        && (!ctx.ges || (p.ges || '').toString().trim().toUpperCase() === ctx.ges)
        && (!ctx.medico || asisCoincideTokens(p.medicoTratante, ctx.medico.tokens)));
}

async function asisHandlerMayorEspera(ctx) {
    if (!asisPuede('listaEspera')) return asisSinAcceso('Lista de Espera');
    const fuente = asisFuenteEspera(ctx.t);
    const n = ctx.n || 10;
    const lista = asisFiltrarLE(await asisPacientesLE(), ctx)
        .map(p => ({ p, dias: asisDiasEspera(p, fuente) }))
        .filter(x => x.dias !== null)
        .sort((a, b) => b.dias - a.dias)
        .slice(0, n);
    if (lista.length === 0) return { html: `No encontré pacientes gestionables ${asisDescribirFiltros(ctx, { conLE: true, conEstatusLE: true })} con fecha para calcular la espera.` };
    const fuenteTxt = fuente === 'fechaEstatusProgram' ? 'Fecha Estatus Programable' : 'Fecha Indicación Qx';
    const primero = lista[0];
    return {
        html: `⚠️ Los ${lista.length} con mayor espera ${asisDescribirFiltros(ctx, { conLE: true, conEstatusLE: true })} (desde ${fuenteTxt}):${asisListaHtml(lista, x => `<li>${asisAccionesPaciente(x.p)} <b>${asisEsc(x.p.nombreApellido || '')}</b> · ${x.dias} días · ${asisEsc(x.p.especialidad || '')} · <i>${asisEsc(x.p.estatusTabla || '')}</i></li>`, 100)}`,
        voz: `El que más espera es ${primero.p.nombreApellido || 'un paciente'}, con ${primero.dias} días.`
    };
}

// --- Lista de Espera: mediana / percentiles ---
function asisPercentil(sorted, p) { return sorted.length ? sorted[Math.floor(p * (sorted.length - 1))] : 0; }

async function asisHandlerMediana(ctx) {
    if (!asisPuede('listaEspera')) return asisSinAcceso('Lista de Espera');
    const fuente = asisFuenteEspera(ctx.t);
    const pacientes = asisFiltrarLE(await asisPacientesLE(), ctx);
    const calc = lista => {
        const dias = lista.map(p => asisDiasEspera(p, fuente)).filter(d => d !== null).sort((a, b) => a - b);
        return { n: dias.length, mediana: typeof calcularMediana === 'function' ? calcularMediana(dias) : asisPercentil(dias, 0.5), prom: dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0, dias };
    };
    if (/\bpor especialidad\b|\bcada especialidad\b/.test(ctx.t)) {
        const grupos = {};
        pacientes.forEach(p => { const k = p.especialidad || '(sin especialidad)'; (grupos[k] = grupos[k] || []).push(p); });
        const filas = Object.keys(grupos).map(k => ({ k, ...calc(grupos[k]) })).filter(x => x.n > 0).sort((a, b) => b.mediana - a.mediana);
        return {
            html: `📊 Mediana de espera por especialidad (gestionables, desde ${fuente === 'fechaEstatusProgram' ? 'Fecha Estatus Programable' : 'Fecha Indicación Qx'}):<ul class="asis-lista">${filas.map(x => `<li><b>${asisEsc(x.k)}</b>: ${x.mediana} días (${x.n} pac.)</li>`).join('')}</ul>`,
            voz: filas.length ? `La mediana más alta es ${filas[0].k}, con ${filas[0].mediana} días.` : ''
        };
    }
    const r = calc(pacientes);
    if (r.n === 0) return { html: 'No hay pacientes con fecha para calcular la espera con esos filtros.' };
    return {
        html: `📊 Espera ${asisDescribirFiltros(ctx, { conLE: true, conEstatusLE: true })} (${asisPlural(r.n, 'paciente')}${ctx.estatusLE ? '' : ' gestionables'}, desde ${fuente === 'fechaEstatusProgram' ? 'Fecha Estatus Programable' : 'Fecha Indicación Qx'}):<div class="asis-bloques"><div>Mediana: <b>${r.mediana} días</b> · Promedio: <b>${r.prom} días</b></div><div>P25: ${asisPercentil(r.dias, 0.25)} · P50: ${asisPercentil(r.dias, 0.5)} · P75: ${asisPercentil(r.dias, 0.75)} · P90: ${asisPercentil(r.dias, 0.9)} · Máx: ${r.dias[r.dias.length - 1]} días</div></div>`,
        acciones: [{ texto: '🏠 Abrir Dashboard de Lista de Espera', fn: () => asisIrSeccion('listaEspera', 'dashboard') }],
        voz: `La mediana de espera es ${r.mediana} días, y el promedio ${r.prom} días.`
    };
}

// --- Lista de Espera: programables que aún no están en la Tabla ---
async function asisHandlerProgramablesSinTabla(ctx) {
    if (!asisPuede('listaEspera')) return asisSinAcceso('Lista de Espera');
    const lista = asisFiltrarLE(await asisPacientesLE(), { ...ctx, estatusLE: 'PROGRAMABLE' })
        .filter(p => typeof leYaEstaEnTabla !== 'function' || !leYaEstaEnTabla(p))
        .map(p => ({ p, dias: asisDiasEspera(p, 'fechaIndQx') || 0 }))
        .sort((a, b) => b.dias - a.dias);
    const puedeCargar = typeof leMostrarModalCargarATabla === 'function' && asisPuede('listaEspera_cargarATabla') && typeof currentUserSoloLecturaTabla !== 'undefined' && !currentUserSoloLecturaTabla;
    return {
        html: `✅ <b>${asisPlural(lista.length, 'paciente PROGRAMABLE', 'pacientes PROGRAMABLES')}</b> ${asisDescribirFiltros(ctx, { conLE: true })} que todavía no están cargados en la Tabla (de mayor a menor espera):${asisListaHtml(lista, x => `<li>${asisAccionesPaciente(x.p)}${puedeCargar && asisPacienteEnMemoria(x.p.firebaseKey) ? asisBotonInline('📋', () => { asisCerrarPanel(); leMostrarModalCargarATabla(x.p.firebaseKey); }, 'Cargar a la Tabla') : ''} <b>${asisEsc(x.p.nombreApellido || '')}</b> · ${asisEsc(x.p.especialidad || '')} · ${x.dias} días${x.p.prioridad ? ' · ' + asisEsc(x.p.prioridad) : ''}</li>`)}${puedeCargar ? '<div class="asis-nota">📋 abre "Cargar a la Tabla" para ese paciente.</div>' : ''}`,
        voz: `Hay ${asisPlural(lista.length, 'paciente programable', 'pacientes programables')} que aún no ${lista.length === 1 ? 'está' : 'están'} en la tabla.`
    };
}

// --- Lista de Espera: ingresos ---
async function asisHandlerIngresos(ctx) {
    if (!asisPuede('listaEspera')) return asisSinAcceso('Lista de Espera');
    const hoy = asisHoy();
    const rango = ctx.rango || { desde: asisFmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: asisFmt(hoy), etiqueta: `este mes (${ASIS_MESES[hoy.getMonth()]})` };
    const lista = asisFiltrarLE(await asisPacientesLE(), ctx, { soloGestionables: false })
        .filter(p => { const f = asisFechaDesdeValor(p.fechaIndQx); return f && f >= rango.desde && f <= rango.hasta; });
    let html = `🆕 <b>${asisPlural(lista.length, 'ingreso')}</b> a Lista de Espera ${asisDescribirFiltros(ctx, { conLE: true })} ${asisEsc(rango.etiqueta)} (por Fecha Indicación Qx).`;
    if (lista.length > 1 && !ctx.esp) html += asisChipsConteo(asisContarPor(lista, p => p.especialidad), 8);
    if (lista.length && (ctx.esLista || lista.length <= ASIS_MAX_ITEMS_LISTA)) {
        html += asisListaHtml(lista, p => `<li>${asisAccionesPaciente(p)} ${asisFechaCorta(asisFechaDesdeValor(p.fechaIndQx))} — <b>${asisEsc(p.nombreApellido || '')}</b> · ${asisEsc(p.especialidad || '')} · <i>${asisEsc(p.estatusTabla || '')}</i></li>`);
    }
    return { html, voz: `${asisPlural(lista.length, 'ingreso')} ${rango.etiqueta}.` };
}

// --- Lista de Espera: conteos y distribuciones ---
async function asisHandlerLEConteo(ctx) {
    if (!asisPuede('listaEspera')) return asisSinAcceso('Lista de Espera');
    const todos = await asisPacientesLE();
    let lista = asisFiltrarLE(todos, ctx);
    let etiquetaRango = '';
    // "operados en septiembre" (estatus OPERADO + Fecha de Cirugía en el período)
    if (ctx.rango && ctx.estatusLE === 'OPERADO') {
        lista = lista.filter(p => { const f = asisFechaDesdeValor(p.fechaCirugia); return f && f >= ctx.rango.desde && f <= ctx.rango.hasta; });
        etiquetaRango = ' ' + ctx.rango.etiqueta + ' (por Fecha de Cirugía)';
    }
    const filtros = asisDescribirFiltros(ctx, { conLE: true, conEstatusLE: true });
    const base = ctx.estatusLE ? '' : ' gestionables';
    let html = `🩺 <b>${asisPlural(lista.length, 'paciente')}</b>${base} en Lista de Espera ${filtros}${asisEsc(etiquetaRango)}.`;
    if (!ctx.estatusLE) html += `<div class="asis-nota">Total registrado (incluye cerrados: operados, egresos, rechazos…): ${todos.length}.</div>`;

    const porQue = ctx.t.match(/\bpor (especialidad|estatus|prioridad|medico|comuna|ges)\b/);
    const campo = porQue ? { especialidad: 'especialidad', estatus: 'estatusTabla', prioridad: 'prioridad', medico: 'medicoTratante', comuna: 'comuna', ges: 'ges' }[porQue[1]] : null;
    if (campo) {
        html += `<div class="asis-sub">Por ${porQue[1]}:</div>${asisChipsConteo(asisContarPor(lista, p => p[campo]), 20)}`;
    } else {
        if (!ctx.estatusLE && lista.length) html += `<div class="asis-sub">Por estatus:</div>${asisChipsConteo(asisContarPor(lista, p => p.estatusTabla), 8)}`;
        if (!ctx.esp && lista.length > 1) html += `<div class="asis-sub">Por especialidad:</div>${asisChipsConteo(asisContarPor(lista, p => p.especialidad), 8)}`;
        if (!ctx.prioridad && lista.length > 1) html += `<div class="asis-sub">Por prioridad:</div>${asisChipsConteo(asisContarPor(lista, p => p.prioridad), 4)}`;
    }
    if (lista.length && (ctx.esLista || lista.length <= 8)) {
        const ordenada = lista.map(p => ({ p, dias: asisDiasEspera(p, 'fechaIndQx') || 0 })).sort((a, b) => b.dias - a.dias);
        html += asisListaHtml(ordenada, x => `<li>${asisAccionesPaciente(x.p)} <b>${asisEsc(x.p.nombreApellido || '')}</b> · ${asisEsc(x.p.especialidad || '')} · <i>${asisEsc(x.p.estatusTabla || '')}</i> · ${x.dias} días</li>`);
    }
    return {
        html,
        acciones: [{ texto: '📋 Abrir Lista de Pacientes', fn: () => asisIrSeccion('listaEspera', 'listaPacientes') }],
        voz: `${asisPlural(lista.length, 'paciente')}${base} ${asisTextoPlano(filtros)}${etiquetaRango}.`
    };
}

// --- Pacientes Diferidos ---
async function asisHandlerDiferidos(ctx) {
    if (!asisPuede('diferidos')) return asisSinAcceso('Pacientes Diferidos');
    let lista = await asisRegistrosDiferidos();
    lista = lista.filter(x => (!ctx.esp || ctx.esp.coincide(x.fila.Especialidad))
        && (!ctx.rango || (x.fechaDiferido >= ctx.rango.desde && x.fechaDiferido <= ctx.rango.hasta)));
    lista.sort((a, b) => (b.fechaDiferido || '').localeCompare(a.fechaDiferido || ''));
    let html = `📤 <b>${asisPlural(lista.length, 'paciente diferido', 'pacientes diferidos')}</b> ${asisDescribirFiltros(ctx)} ${ctx.rango ? asisEsc(ctx.rango.etiqueta) : ''}.`;
    if (lista.length > 1 && !ctx.esp) html += asisChipsConteo(asisContarPor(lista, x => x.fila.Especialidad), 8);
    if (lista.length && (ctx.esLista || lista.length <= ASIS_MAX_ITEMS_LISTA || !ctx.esCuanto)) {
        html += asisListaHtml(lista, x => `<li>${x.fechaDiferido ? asisFechaCorta(x.fechaDiferido) + ' — ' : ''}<b>${asisEsc(x.fila.Nombre_Paciente || '(sin nombre)')}</b>${x.fila.Especialidad ? ' · ' + asisEsc(x.fila.Especialidad) : ''}${x.fila.Motivo ? ' · ' + asisEsc(x.fila.Motivo) : ''}</li>`);
    }
    return {
        html,
        acciones: [{ texto: '📤 Abrir Pacientes Diferidos', fn: () => asisIrSeccion('diferidos') }],
        voz: `Hay ${asisPlural(lista.length, 'paciente diferido', 'pacientes diferidos')}.`
    };
}

// --- Buscar un paciente en todos los módulos ---
async function asisHandlerBuscarPaciente(ctx) {
    const coincide = (rut, nombre) => ctx.rut ? asisRutLimpio(rut) === ctx.rut : asisCoincideTokens(nombre, ctx.nombreTokens);
    const quien = ctx.rut ? `RUT ${asisRutBonito(ctx.rut)}` : `"${ctx.nombreTokens.join(' ')}"`;
    const bloques = [];
    const resumenVoz = [];
    let total = 0;

    if (asisPuede('listaEspera')) {
        const le = (await asisPacientesLE()).filter(p => coincide(p.rut, p.nombreApellido));
        total += le.length;
        if (le.length) {
            resumenVoz.push(`${le.length} en lista de espera`);
            bloques.push(`<div class="asis-sub">🩺 Lista de Espera (${le.length}):</div>` + asisListaHtml(le, p => {
                const dias = asisDiasEspera(p, 'fechaIndQx');
                return `<li>${asisAccionesPaciente(p)} <b>${asisEsc(p.nombreApellido || '')}</b> · ${asisEsc(asisRutBonito(p.rut))} · ${asisEsc(p.especialidad || '')} · estatus <b>${asisEsc(p.estatusTabla || '—')}</b>${dias !== null ? ` · ${dias} días de espera` : ''}${p.prioridad ? ' · ' + asisEsc(p.prioridad) : ''}${p.fechaProximoLlamado ? ' · próximo llamado ' + asisFechaCorta(asisFechaDesdeValor(p.fechaProximoLlamado)) : ''}</li>`;
            }, 8));
        }
    }
    if (asisPuede('registro')) {
        const tabla = asisFilasTabla().filter(x => coincide(x.fila.RUT, x.fila.Nombre_Paciente));
        total += tabla.length;
        if (tabla.length) {
            resumenVoz.push(`${tabla.length} en la tabla quirúrgica`);
            bloques.push(`<div class="asis-sub">📋 Tabla Quirúrgica (${tabla.length}):</div>` + asisListaHtml(tabla, x => `<li>${asisBotonInline('↗', () => asisIrTabla(x.semanaIdx, x.diaIdx), 'Ver en la Tabla')} <b>${asisEsc(x.fila.Nombre_Paciente || '')}</b> · ${x.fecha ? asisFechaCorta(x.fecha) : 'sin fecha'} · Semana ${x.semanaIdx + 1} ${['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'][x.diaIdx] || ''} · ${asisEsc(x.pab)}${x.fila.Jornada && x.fila.Jornada !== 'Seleccione' ? ' ' + asisEsc(x.fila.Jornada) : ''}${x.fila.ESTADO_DE_IQx && x.fila.ESTADO_DE_IQx !== 'Seleccione' ? ' · <i>' + asisEsc(x.fila.ESTADO_DE_IQx) + '</i>' : ''}</li>`, 8));
        }
    }
    if (asisPuede('diferidos')) {
        const dif = (await asisRegistrosDiferidos()).filter(x => coincide(x.fila.RUT, x.fila.Nombre_Paciente));
        total += dif.length;
        if (dif.length) {
            resumenVoz.push(`${dif.length} en diferidos`);
            bloques.push(`<div class="asis-sub">📤 Pacientes Diferidos (${dif.length}):</div>` + asisListaHtml(dif, x => `<li><b>${asisEsc(x.fila.Nombre_Paciente || '')}</b>${x.fechaDiferido ? ' · diferido el ' + asisFechaCorta(x.fechaDiferido) : ''}${x.fila.Motivo ? ' · ' + asisEsc(x.fila.Motivo) : ''}</li>`, 5));
        }
    }
    if (asisPuede('libro')) {
        const lib = (await asisRegistrosLibro()).filter(x => coincide(x.fila.RUT, x.fila.Nombre_Paciente))
            .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        total += lib.length;
        if (lib.length) {
            resumenVoz.push(`${lib.length} en el libro de quirófano`);
            bloques.push(`<div class="asis-sub">📘 Libro de Quirófano (${lib.length}, más recientes primero):</div>` + asisListaHtml(lib, x => `<li>${asisFechaCorta(x.fecha)} · <b>${asisEsc(x.fila.Nombre_Paciente || '')}</b> · ${asisEsc(x.fila.ESTADO_DE_IQx || '')}${x.fila['1ra_Intervencion_Qx_Realizada'] ? ' · ' + asisEsc(x.fila['1ra_Intervencion_Qx_Realizada']) : ''}</li>`, 5));
        }
    }
    if (total === 0) {
        return { html: `🔎 No encontré a ${asisEsc(quien)} en las secciones a las que tienes acceso. Revisa la escritura o prueba con el RUT.`, voz: 'No encontré a ese paciente.' };
    }
    return { html: `🔎 Resultados para ${asisEsc(quien)}:${bloques.join('')}`, voz: `Encontré ${resumenVoz.join(', ')}.` };
}

// --- Generales ---
async function asisHandlerConectados() {
    const data = await asisLeerNodoCacheado('usuarios', 20000);
    const online = Object.keys(data).filter(uid => data[uid] && data[uid].sesionActiva)
        .map(uid => ({ uid, email: data[uid].email || uid }))
        .sort((a, b) => a.email.localeCompare(b.email));
    return {
        html: `🟢 <b>${asisPlural(online.length, 'usuario conectado', 'usuarios conectados')}</b> ahora:${asisListaHtml(online, u => `<li>${asisEsc(u.email)}${currentUser && u.uid === currentUser.uid ? ' <i>(tú)</i>' : ''}</li>`, 30)}<div class="asis-nota">Puedes escribirles desde la pestaña 💬 Chat.</div>`,
        acciones: [{ texto: '💬 Ir al Chat', fn: () => { if (typeof cambiarTabPanel === 'function') cambiarTabPanel('chat'); } }],
        voz: `Hay ${asisPlural(online.length, 'usuario conectado', 'usuarios conectados')}.`
    };
}

function asisHandlerMiUsuario() {
    const rol = typeof currentUserRol !== 'undefined' ? currentUserRol : '';
    const rolTxt = { superadministrador: '👑 Superadministrador', administrador: 'Administrador', usuario: 'Usuario' }[rol] || rol || 'Usuario';
    const secciones = [];
    const sinAcceso = [];
    const todas = [...(typeof SECCIONES_APP !== 'undefined' ? SECCIONES_APP : []), ...(typeof ACCESOS_ADICIONALES_APP !== 'undefined' ? ACCESOS_ADICIONALES_APP : [])];
    todas.forEach(s => (asisPuede(s.key) ? secciones : sinAcceso).push(s.label));
    if (asisPuede('admin')) secciones.push('⚙️ Panel de Administración');
    const soloLectura = typeof currentUserSoloLecturaTabla !== 'undefined' && currentUserSoloLecturaTabla;
    return {
        html: `👤 <b>${asisEsc(currentUserEmail || '')}</b> · rol <b>${asisEsc(rolTxt)}</b>${soloLectura ? ' · Tabla Quirúrgica en <b>solo lectura</b>' : ''}.<div class="asis-sub">Tienes acceso a:</div>${asisChipsConteo(secciones.map(s => [s, '✓']), 20).replace(/: <b>✓<\/b>/g, '')}${sinAcceso.length ? `<div class="asis-sub">Sin acceso:</div>${asisChipsConteo(sinAcceso.map(s => [s, '✗']), 20).replace(/: <b>✗<\/b>/g, '')}` : ''}`,
        voz: `Tu rol es ${rolTxt.replace(/[^\wáéíóúñ ]/gi, '')}.`
    };
}

function asisHandlerFechaHora() {
    const ahora = new Date();
    const semanaIso = (() => {
        const d = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
        const dia = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dia);
        const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d - inicio) / 86400000 + 1) / 7);
    })();
    const hora = `${asisPad(ahora.getHours())}:${asisPad(ahora.getMinutes())}`;
    return { html: `📅 Hoy es <b>${asisFechaLarga(asisHoy())} de ${ahora.getFullYear()}</b>, son las <b>${hora}</b> (semana ${semanaIso} del año).`, voz: `Hoy es ${asisFechaLarga(asisHoy())}, son las ${hora}.` };
}

// --- Navegación ("llévame a...") ---
const ASIS_DESTINOS = [
    { re: /\b(lista de pacientes)\b/, seccion: 'listaEspera', sub: 'listaPacientes', nombre: 'Lista de Espera → Lista de Pacientes' },
    { re: /\b(nuevo paciente|ingresar (un )?paciente|alta de paciente)\b/, seccion: 'listaEspera', sub: 'nuevoPaciente', nombre: 'Lista de Espera → Nuevo Paciente' },
    { re: /\b(historico|rdll)\b/, seccion: 'listaEspera', sub: 'historicoRdll', nombre: 'Lista de Espera → Histórico RDLL' },
    { re: /\b(dashboard)\b/, seccion: 'listaEspera', sub: 'dashboard', nombre: 'Dashboard de Lista de Espera' },
    { re: /\b(lista de espera)\b/, seccion: 'listaEspera', nombre: 'Lista de Espera' },
    { re: /\bdiferidos?\b/, seccion: 'diferidos', nombre: 'Pacientes Diferidos' },
    { re: /\blibro\b/, seccion: 'libro', nombre: 'Libro de Quirófano' },
    { re: /\b(tabla )?oftalmolog\w*\b/, seccion: 'oftalmologia', nombre: 'Tabla Oftalmología' },
    { re: /\bestadisticas?\b/, seccion: 'estadisticas', nombre: 'Estadísticas' },
    { re: /\b(administrador|administracion|panel de admin\w*|admin)\b/, seccion: 'admin', nombre: 'Panel de Administración' },
    { re: /\bmanual\b/, seccion: 'manual', nombre: 'Manual de Usuario' },
    { re: /\breunion de tabla\b/, seccion: 'reunionTabla', nombre: 'Reunión de Tabla' },
    { re: /\banalisis ia\b/, seccion: 'analisisIa', nombre: 'Análisis IA' },
    { re: /\bgenerador( de)? ppt\b/, seccion: 'generadorPpt', nombre: 'Generador de PPT' },
    { re: /\bvista dividida\b/, seccion: 'vistaDividida', nombre: 'Vista Dividida' },
    { re: /\b(tabla( quirurgica)?|registro)\b/, seccion: 'registro', nombre: 'Tabla Quirúrgica' }
];

function asisDetectarNavegacion(ctx) {
    if (!/^(ir|ve|vamos|llevame|lleva me|abre|abrir|abreme|quiero ir|quiero ver la seccion|entra|entrar|navega|navegar|anda)\b/.test(ctx.t)) return null;
    const semana = ctx.t.match(/\bsemana (\d)\b/);
    const diaNombre = ctx.t.match(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
    if (semana || (ctx.rango && ctx.rango.desde === ctx.rango.hasta && /\b(tabla|dia)\b/.test(ctx.t) && !ASIS_DESTINOS.slice(0, -1).some(d => d.re.test(ctx.t)))) {
        return { tipo: 'tablaDia', semana: semana ? +semana[1] - 1 : null, diaIdx: diaNombre ? (ASIS_DIAS_SEMANA.indexOf(diaNombre[1]) + 6) % 7 : null };
    }
    const destino = ASIS_DESTINOS.find(d => d.re.test(ctx.t));
    return destino ? { tipo: 'seccion', destino } : null;
}

function asisHandlerNavegar(nav, ctx) {
    if (nav.tipo === 'seccion') {
        const d = nav.destino;
        const clavePermiso = d.seccion;
        if (!asisPuede(clavePermiso)) return asisSinAcceso(d.nombre);
        asisIrSeccion(d.seccion, d.sub);
        return { html: `🧭 Listo, te llevé a <b>${asisEsc(d.nombre)}</b>.`, voz: `Te llevé a ${d.nombre}.` };
    }
    if (!asisPuede('registro')) return asisSinAcceso('la Tabla Quirúrgica');
    let w = nav.semana;
    let d = nav.diaIdx;
    if (ctx.rango && ctx.rango.desde === ctx.rango.hasta && w === null) {
        const ubic = asisUbicarFechaEnTabla(ctx.rango.desde);
        if (ubic) { w = ubic.semanaIdx; d = ubic.diaIdx; }
        else return { html: `No encontré ${asisEsc(ctx.rango.etiqueta)} en la Tabla actual (puede que esa semana aún no esté armada).` };
    }
    if (w === null) w = typeof currentWeek !== 'undefined' ? currentWeek : 0;
    if (d === null) d = 0;
    asisIrTabla(w, d);
    return { html: `🧭 Listo, te llevé a la Tabla Quirúrgica: <b>Semana ${w + 1}, ${['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'][d]}</b>.`, voz: `Te llevé a la semana ${w + 1}.` };
}

// =============================================================
// 📚 BASE DE CONOCIMIENTO DE LA APP (dudas de uso)
// Escrita a partir de las funciones reales de la app (no solo del manual).
// Cada entrada calza si TODOS sus grupos tienen al menos una palabra
// presente en la pregunta (las palabras son prefijos, sin tildes).
// =============================================================
const ASIS_KB = [
    // ---------- Tabla Quirúrgica ----------
    { grupos: [['agreg', 'ingres', 'anot', 'registr', 'pon', 'escrib', 'program', 'agend', 'inscrib', 'meter', 'met'], ['paciente', 'cirugia', 'fila'], ['tabla', 'pabellon']],
      html: 'Para programar un paciente en la <b>Tabla Quirúrgica</b>: elige la <b>Semana</b> (pestañas Semana 1–5), el <b>día</b> (LUN–DOM) y el <b>pabellón</b> (PAB 1 / PAB 2), y completa una fila vacía. La <b>FECHA</b> es obligatoria si la fila tiene datos. Se guarda sola a los 2 segundos sin escribir (y cada 10 minutos).<br>Si el paciente ya está en Lista de Espera, es mejor usar <b>📋 Cargar a la Tabla</b> desde Lista de Pacientes: copia sus datos y deja el vínculo que actualiza su estatus solo.',
      acciones: [['📋 Ir a la Tabla', 'seccion', 'registro']] },
    { grupos: [['guard'], ['tabla', 'dato', 'fila', 'cambio', 'pabellon', 'dia', 'automatic', 'se guard', 'no se guard']],
      html: 'La Tabla <b>se guarda sola</b>: 2 segundos después de dejar de escribir, y además cada 10 minutos. Los botones <b>💾 Guardar Día</b> / <b>💾 Guardar Pabellón</b> fuerzan un guardado inmediato. Si una fila tiene paciente pero no tiene <b>FECHA</b>, te aparece una alerta para completarla. Si no se guarda, revisa tu conexión a Internet.' },
    { grupos: [['agreg', 'mas', 'nueva', 'sumar', 'anadir', 'aumentar'], ['fila']],
      html: 'Usa <b>➕ Agregar Fila</b> debajo del pabellón. Cada pabellón empieza con 5 filas y puedes sumar las que necesites (cada fila nueva tiene su propia clave, así dos personas agregando a la vez no se pisan).' },
    { grupos: [['elimin', 'borr', 'quit', 'sac'], ['fila']],
      html: 'Cada fila tiene un botón <b>🗑️ Eliminar</b> (última columna) que la borra. Para vaciar muchas filas a la vez están <b>🗑️ Limpiar Pabellón</b> y <b>🗑️ Limpiar Día</b>. Si la fila venía de Lista de Espera, el paciente vuelve a su estatus anterior (o conserva OPERADO si ya tenía ese resultado).' },
    { grupos: [['limpi'], ['dia', 'pabellon', 'tabla']],
      html: '<b>🗑️ Limpiar Día</b> borra todas las filas del día y <b>🗑️ Limpiar Pabellón</b> solo las del pabellón actual. Pide confirmación. Los pacientes vinculados a Lista de Espera vuelven a su estatus previo (o conservan OPERADO). Es una acción manual que se puede restringir por permisos.' },
    { grupos: [['difer', 'difier', 'difir', 'poster', 'aplaz']], excluir: ['cuant', 'quien', 'lista de diferid'],
      html: '<b>⏩ Diferir</b> (en la fila) saca al paciente de la Tabla y lo manda a <b>📤 Pacientes Diferidos</b>, desde donde se puede <b>↩️ Reintegrar</b> a cualquier semana/día/pabellón/fila. Necesita FECHA cargada. Se deshabilita si la fila ya tiene un ESTADO elegido, salvo <b>SUSPENDIDO</b> y <b>CONDICIONAL (NO OPERADO)</b>: en esos casos se puede diferir y el paciente queda visible también en su fila original (después del primer uso, Diferir/Reubicar se bloquean para no duplicarlo).',
      acciones: [['📤 Ir a Diferidos', 'seccion', 'diferidos']] },
    { grupos: [['reubic', 'mover', 'muevo', 'cambiar de fila', 'cambiar de dia', 'cambiar de lugar', 'trasladar']],
      html: '<b>🔄 Reubicar</b> (en la fila) mueve al paciente a otra semana/día/pabellón/fila sin pasar por Diferidos. Igual que Diferir: requiere FECHA, y solo está habilitado con el ESTADO vacío o en SUSPENDIDO/CONDICIONAL (NO OPERADO). Si estaba vinculado a Lista de Espera, el vínculo se mueve con él.' },
    { grupos: [['reintegr', 'devolver', 'volver a la tabla', 'regres']],
      html: 'En <b>📤 Pacientes Diferidos</b>, el botón <b>↩️ Reintegrar</b> te pide Semana, Día, Pabellón y Fila de destino y devuelve al paciente a la Tabla. Si la fila destino tiene datos, te pregunta si quieres sobrescribirla.',
      acciones: [['📤 Ir a Diferidos', 'seccion', 'diferidos']] },
    { grupos: [['registrar dia', 'registro del dia', 'archiv', 'pasar al libro', 'cerrar el dia', 'cerrar dia']],
      html: '<b>📋 Registrar Día</b> (solo administradores) archiva todas las filas del día en el <b>📘 Libro de Quirófano</b> (registro definitivo, con quién y cuándo lo registró) y limpia ese día de la Tabla para reutilizarlo. Los pacientes vinculados a Lista de Espera conservan OPERADO o vuelven a su estatus previo.' },
    { grupos: [['estado', 'estados'], ['iqx', 'cirugia', 'operado', 'significa', 'opciones', 'tipos']],
      html: 'Estados de <b>ESTADO_DE_IQx</b>: OPERADO (PROGRAMADO), OPERADO (AGREGADO), OPERADO (CONDICIONAL), OPERADO (PAD), <b>SUSPENDIDO</b>, URGENCIA, <b>CONDICIONAL (NO OPERADO)</b> y PERIANALGESIA (PARTO). Al elegir un estado, Diferir/Reubicar se bloquean, salvo SUSPENDIDO y CONDICIONAL (NO OPERADO). Si la fila viene de Lista de Espera, su estatus allá se actualiza solo según el estado que pongas.' },
    { grupos: [['cmay', 'cmen', 'proc', 'tipo de actividad', 'tipo actividad', 'cirugia mayor', 'cirugia menor']],
      html: '<b>Tipo_Actividad</b> se completa solo al elegir la intervención realizada: <b>Cmay</b> = cirugía mayor, <b>Cmen</b> = cirugía menor, <b>Proc</b> = procedimiento. Cada fila admite hasta 3 intervenciones (1ra, 2da, 3ra), cada una con su tipo. En Estadísticas, "Programados Cmay" cuenta <b>pacientes</b> (una fila cuenta una vez aunque tenga Cmay en varias intervenciones), mientras que la producción REM y el rendimiento cuentan <b>intervenciones</b>.' },
    { grupos: [['color'], ['fila', 'marc', 'pint']],
      html: 'Haz clic en el círculo <b>🎨</b> de la fila y elige un color de la paleta para destacarla (por ejemplo, urgencias o casos especiales). Se guarda junto con la fila.' },
    { grupos: [['imprim', 'impresion']],
      html: 'Para imprimir: en la <b>Tabla Quirúrgica</b>, <b>🖨️ Imprimir Día</b> (abre una ventana lista para imprimir o guardar como PDF); en el <b>Libro de Quirófano</b>, "Ver Tabla Quirúrgica por fecha" tiene su propio botón imprimir; en <b>Lista de Espera</b>, 🖨️ Imprimir Lista y 🖨️ Imprimir Registro de Llamadas (Lista de Pacientes), la ficha de cada paciente y 🖨️ Imprimir Dashboard Completo; la <b>Tabla Oftalmología</b> se imprime con membrete; y el <b>Manual</b> y <b>Análisis IA</b> se pueden guardar en PDF.' },
    { grupos: [['presentacion', 'ppt', 'power', 'diapositiv', 'lamina'], ['tabla', 'semana']],
      html: 'Arriba de cada semana: <b>📅 Semanas (N) ▾</b> para elegir qué semanas incluir, <b>🎥 Presentación</b> (pantalla completa, una lámina por día con PAB 1 y PAB 2; flechas ← → y Esc) y <b>⬇️ Descargar PPT</b> (.pptx). No aparecen en modo solo lectura.' },
    { grupos: [['whatsapp', 'wsp', 'wasap', 'mensaje al paciente']],
      html: 'En la fila, el botón <b>💬</b> abre WhatsApp con el mensaje ya escrito a partir de una plantilla (nombre, fecha, hora, especialidad, cirujano, pabellón, indicaciones del anestesista). El teléfono se toma de la ficha de Lista de Espera (vínculo o RUT) o se te pide. Tú aprietas "Enviar" en WhatsApp y vuelves a confirmar <b>"✅ Sí, se envió"</b> (queda ✅ en la fila y en el historial del paciente). Las plantillas las administra el superadministrador.' },
    { grupos: [['oftalmolog', 'dilatacion', 'membrana', 'ojo']], excluir: ['cuant', 'quien'],
      html: '<b>👁️ Tabla Oftalmología</b>: en la Tabla hay un botón por día que abre un modal con los pacientes de Oftalmología de ese día para completar <b>Ojo, Dilatación Pupilar, Membrana y Observaciones</b>, con guardado automático e impresión con membrete. Lo guardado se consulta y filtra en la sección del menú <b>👁️ Tabla Oftalmología</b> (se identifica por FECHA + RUT, así no se mezcla cuando la Tabla se recicla).',
      acciones: [['👁️ Ir a Tabla Oftalmología', 'seccion', 'oftalmologia']] },
    { grupos: [['solo lectura']],
      html: 'En <b>solo lectura</b> puedes navegar semanas y días e Imprimir Día, pero no editar, guardar, agregar/eliminar filas, limpiar, diferir, reubicar, cambiar colores ni usar Presentación/PPT. Lo activa o desactiva un administrador desde 🔐 Permisos.' },
    { grupos: [['otra persona', 'otro usuario', 'alguien'], ['editando', 'escribiendo', 'misma fila', 'pis']],
      html: 'Si otra persona está editando una fila, aparece un <b>aviso</b> sobre esa fila. Además, mientras tú tienes algo sin guardar en una fila, la app protege esa fila de los cambios remotos para que no te pisen; el resto de la tabla sigue sincronizándose en tiempo real.' },
    { grupos: [['t qx', 'tqx', 'tiempo quirurgico', 'hora de entrada', 'hora de salida']], excluir: ['promedio', 'dura'],
      html: '<b>T_QX</b> se calcula solo con Hora_de_entrada y Hora_de_salida. <b>T_Qx</b> (programado) es el tiempo estimado que se escribe al programar. Para Ocupación de pabellón se usa T_QX + 20 minutos de viraje por cirugía.' },
    { grupos: [['cirujano', 'medico'], ['lista', 'desplegable', 'aparece', 'no sale', 'especialidad', 'agreg']],
      html: 'El desplegable <b>Cirujano</b> muestra los médicos de la <b>Especialidad</b> elegida en esa misma fila (si cambias la especialidad, el cirujano se reinicia). La lista de médicos por especialidad la administra el superadministrador en Administrador → 📋 Tabla Quirúrgica → 👨‍⚕️ Médicos por Especialidad.' },
    { grupos: [['semana'], ['recicl', 'reutiliz', 'mes', '1 a 5', 'cinco', 'pestan']],
      html: 'La Tabla tiene 5 pestañas (Semana 1–5) que se <b>reutilizan</b> mes a mes: cada casilla vale por su FECHA real, no por su posición. Por eso la FECHA es obligatoria, y los días ya realizados se pasan al Libro con 📋 Registrar Día.' },
    { grupos: [['rut'], ['valid', 'rojo', 'verde', 'formato', 'invalido']],
      html: 'El RUT se valida mientras escribes (dígito verificador módulo 11): <b>verde</b> = válido, <b>rojo</b> = inválido. Se guarda sin puntos ni guion.' },
    { grupos: [['fecha'], ['obligatori', 'falta', 'sin fecha', 'alerta', 'no me deja']],
      html: 'Una fila con datos de paciente <b>necesita FECHA</b> para guardarse definitivamente, diferirse, reubicarse o registrarse. Si falta, la app te avisa (el guardado automático igual guarda lo demás).' },
    // ---------- Diferidos / Libro ----------
    { grupos: [['diferidos'], ['que es', 'que son', 'para que', 'sirve', 'seccion']],
      html: '<b>📤 Pacientes Diferidos</b> guarda a los pacientes sacados de la Tabla con ⏩ Diferir (no se presentó, falta de pabellón, rechazo, etc.). Puedes filtrarlos por nombre/RUT y especialidad, <b>↩️ Reintegrarlos</b> a la Tabla o <b>🗑️ Eliminarlos</b> (permanente).',
      acciones: [['📤 Ir a Diferidos', 'seccion', 'diferidos']] },
    { grupos: [['libro']], excluir: ['cuant', 'quien'],
      html: 'El <b>📘 Libro de Quirófano</b> es el registro definitivo de lo realizado (se llena con 📋 Registrar Día). Tiene filtros por fecha, pabellón, jornada, especialidad, estado, cirujano, nombre, RUT e intervención (el cuadro de filtros se puede plegar), orden por columna (clic en el encabezado), paginación, <b>👁️ Ver Detalle</b> (editar/eliminar solo administradores) y <b>📊 Exportar a Excel</b>, que exporta <b>todo lo filtrado</b>, no solo la página visible. Incluye "Ver Tabla Quirúrgica por fecha" para consultar e imprimir un día.',
      acciones: [['📘 Ir al Libro', 'seccion', 'libro']] },
    { grupos: [['export', 'excel', 'descarg', 'bajar']], excluir: ['lista de espera', 'pacientes en espera', 'llamad'],
      html: 'Exportaciones: <b>Libro de Quirófano → 📊 Exportar a Excel</b> (todo lo filtrado). <b>Lista de Espera → Lista de Pacientes</b>: 📥 CSV, 📊 Excel, 🖨️ Imprimir Lista y 📞 Registro de Llamadas (descargar/imprimir), siempre sobre lo filtrado. <b>Estadísticas</b> y <b>Dashboard</b> de Lista de Espera: Presentación y ⬇️ PPT. <b>Análisis IA</b>: Texto/PDF, Word y PPT. Algunas exportaciones pueden estar restringidas por permisos.' },
    // ---------- Estadísticas ----------
    { grupos: [['estadistic']], excluir: ['indice', 'cuant'],
      html: '<b>📊 Estadísticas</b> se calcula sobre el Libro de Quirófano, en páginas: Programación/Suspensiones (con gráfico mensual de Programados Cmay e índices), REM (Cmay), Producción por Especialidad, Proceso Ambulatorio, Ocupación y Rendimiento (con desglose mensual y bloques inhabilitados), Tiempos por Intervención, Perianalgesia, Cumplimiento de Metas y Horarios de Entrada/Salida AM/PM. Tiene filtro de fecha general (por defecto, el año en curso hasta la última fecha con datos) y Presentación/PPT.',
      acciones: [['📊 Ir a Estadísticas', 'seccion', 'estadisticas']] },
    { grupos: [['indice de suspension', 'indice suspension', 'tasa de suspension', 'suspension'], ['calcul', 'formula', 'como', 'que es', 'significa', 'sale']],
      html: '<b>Índice de suspensión Cmay</b> = Suspendidos Cmay ÷ Programados Cmay × 100. <b>Programados Cmay</b> = filas OPERADO (PROGRAMADO) + SUSPENDIDO que tienen "Cmay" en alguna de sus 3 actividades (cada paciente cuenta una vez). El índice <b>sin urgencia</b> saca del numerador las suspensiones por "reemplazo por urgencia". El gráfico mensual muestra cada mes y el promedio de los meses con datos.' },
    { grupos: [['ambulatori'], ['calcul', 'formula', 'como', 'que es', 'significa']],
      html: '<b>Índice de ambulatorización</b> = pacientes Cmay programados operados con <b>DESTINO = CMA</b> ÷ pacientes Cmay programados operados × 100. Se ve en Estadísticas → Proceso Ambulatorio (general, ranking por especialidad y desglose mensual).' },
    { grupos: [['ocupacion', 'rendimiento', 'horas habilitadas', 'horas trabajadas'], ['calcul', 'formula', 'como', 'que es', 'significa', 'diferencia']],
      html: '<b>Ocupación</b> = Horas trabajadas ÷ Horas habilitadas. Horas trabajadas = T_QX + 20 min de viraje de cada cirugía en horario hábil (08:00–17:00, sin suspendidas). Horas habilitadas = días hábiles × 2 pabellones × 2 bloques (AM/PM) × 4 h, descontando los bloques marcados <b>inhabilitados</b>. <b>Rendimiento</b> = casos ÷ (días hábiles × 2 pabellones), en dos versiones: solo Cmay programado y total Cx (Cmay+Cmen+Proc). Ojo: deshabilitar bloques baja las horas habilitadas y puede inflar el % de ocupación; por eso el desglose mensual muestra qué bloques se inhabilitaron.' },
    { grupos: [['disponibilidad', 'inhabilit', 'habilit'], ['pabellon', 'bloque', 'dia']],
      html: 'En Estadísticas → Ocupación y Rendimiento, la tabla <b>🗓️ Disponibilidad de Pabellón por Día</b> permite a un administrador marcar cada bloque (PAB 1/PAB 2, AM/PM) como Habilitado o Inhabilitado. Esos bloques se descuentan de las horas habilitadas y se listan con fecha en el desglose mensual.' },
    { grupos: [['filtro', 'rango'], ['estadistic', 'fecha general']],
      html: 'El <b>filtro de fecha general</b> de Estadísticas aplica a casi todas las páginas. Por defecto va desde el 1 de enero hasta la <b>última fecha con datos</b> (no hasta el 31 de diciembre, para no contar días sin información). Los bloques anuales (gráficos mes a mes, Producción por Especialidad, Ambulatorio mensual, Perianalgesia, Metas) tienen su propio selector de Año.' },
    { grupos: [['promedio', 'acumulad', 'total del ano', 'total ano'], ['mensual', 'mes a mes', 'grafico', 'meses']],
      html: 'En los gráficos mes a mes, el punto final de <b>Pac. Programados Cmay</b> es el <b>total del año</b>; el de los índices, ocupación y rendimiento es el <b>promedio</b> de los meses. Solo cuentan los meses que tienen al menos un registro cargado (un mes futuro sin datos no baja el promedio; un mes con actividad pero en cero sí cuenta).' },
    { grupos: [['meta', 'metas'], ['produccion', 'cumplimiento', 'como', 'edit', 'cambi', 'que es']],
      html: '<b>🎯 Cumplimiento de Metas</b> (Estadísticas) compara la producción general/Cmay (en intervenciones y en pacientes) y el % de ambulatorización contra metas anuales, con gauges de avance. Solo un administrador puede editar las metas.' },
    { grupos: [['horario', 'atraso', 'hora de inicio', 'puntualidad'], ['entrada', 'salida', 'am', 'pm', 'bloque', 'inicio', 'cierre']],
      html: '<b>Horarios de Entrada/Salida AM/PM</b>: por cada día, el inicio real del bloque es la entrada más temprana y el cierre la salida más tardía; luego se promedian. El atraso se mide contra 08:00 (AM) y 14:00 (PM), en general, por pabellón y por especialidad. Es independiente de Ocupación (que usa T_QX, no las horas de entrada/salida).' },
    { grupos: [['perianalgesia', 'parto']], excluir: ['cuant'],
      html: '<b>🤰 Perianalgesia (Parto)</b> en Estadísticas: casos por mes del año elegido; al hacer clic en un mes se abre un calendario con el detalle por día.' },
    { grupos: [['tiempo por intervencion', 'tiempos por intervencion', 'duracion de', 'cuanto dura']],
      html: 'En Estadísticas → <b>🩺 Tiempos por Intervención</b> buscas una o más intervenciones (1ra Intervención Realizada) y ves duración promedio, mínima, máxima y N° de casos. También puedes preguntarme: <i>"¿cuánto dura una colecistectomía?"</i>.' },
    { grupos: [['analisis ia', 'informe ejecutivo', 'analisis']], excluir: ['cuant'],
      html: '<b>🧠 Análisis IA</b> (menú 🍔) genera un informe ejecutivo con reglas internas sobre tus datos (no envía nada a servicios externos): productividad, ocupación, tiempos muertos, horarios AM/PM, conclusiones, recomendaciones, plan de mejora y metas sugeridas. Eliges rango de fechas y bloques de Estadísticas, ves la vista previa y descargas en Texto/PDF, Word o PPT.',
      acciones: [['🧠 Abrir Análisis IA', 'seccion', 'analisisIa']] },
    { grupos: [['reunion de tabla', 'reunion']],
      html: '<b>🤝 Reunión de Tabla</b> (menú 🍔) arma una sola presentación con láminas de Estadísticas (rango de fechas) + Tabla Quirúrgica (semanas elegidas), en pantalla completa o .pptx.',
      acciones: [['🤝 Abrir Reunión de Tabla', 'seccion', 'reunionTabla']] },
    { grupos: [['generador', 'ppt combinado', 'combinar']],
      html: '<b>🗂️ Generador de PPT</b> (menú 🍔) combina en un solo .pptx las secciones que marques: Tabla Quirúrgica (semanas), Estadísticas (rango), Análisis IA (rango y bloques) y Dashboard de Lista de Espera.',
      acciones: [['🗂️ Abrir Generador de PPT', 'seccion', 'generadorPpt']] },
    { grupos: [['vista dividida', 'dos secciones', 'dos pantallas', 'lado a lado', 'pantalla dividida']],
      html: '<b>📑 Vista Dividida</b> (menú 🍔) muestra dos secciones distintas al mismo tiempo, una al lado de la otra (por ejemplo, Lista de Espera y Tabla Quirúrgica). Para volver a una sola, usa "Salir de Vista Dividida" o elige una sección normal del menú. Requiere su propio permiso.',
      acciones: [['📑 Abrir Vista Dividida', 'seccion', 'vistaDividida']] },
    // ---------- Lista de Espera ----------
    { grupos: [['lista de espera']], excluir: ['cuant', 'quien', 'cuales'],
      html: '<b>🩺 Lista de Espera</b> gestiona a cada paciente desde la indicación quirúrgica hasta que se opera. Pestañas: <b>🏠 Dashboard</b> (indicadores, medianas, percentiles, prioridad/GES, pacientes para llamar, 6 meses–1 año), <b>➕ Nuevo Paciente</b>, <b>📋 Lista de Pacientes</b> (filtros, exportar, ficha 👁️, cargar a la tabla), <b>📜 Histórico RDLL</b> y <b>⚙️ Administrar Listas</b> (superadministrador).',
      acciones: [['🩺 Ir a Lista de Espera', 'seccion', 'listaEspera']] },
    { grupos: [['nuevo paciente', 'ingres', 'agreg', 'registr', 'crear'], ['lista de espera', 'paciente nuevo', 'ficha', 'en espera']],
      html: 'En Lista de Espera → <b>➕ Nuevo Paciente</b> completa identificación (nombre, RUT validado, fecha de nacimiento → edad), contacto (puedes agregar <b>varios teléfonos con "+"</b>), especialidad, médico tratante, diagnóstico, lateralidad, intervención, GES, prioridad, exámenes (TACO/ASA/EKG/RX/ECO), estatus EPA, anestesiólogo e indicaciones, fechas (Ind. Qx, EPA, Estatus Programable, Cirugía, Próximo Llamado), folio y observaciones. El estatus que elijas queda guardado y cada cambio posterior queda en el <b>historial</b> de la ficha.',
      acciones: [['➕ Ir a Nuevo Paciente', 'seccionSub', 'listaEspera|nuevoPaciente']] },
    { grupos: [['estatus'], ['significa', 'que es', 'que son', 'opciones', 'tipos', 'cuales', 'programable', 'gestionable']],
      html: 'Estatus de Lista de Espera: <b>PROGRAMABLE</b> (listo para programar), <b>NO PROGRAMABLE</b>, <b>PENDIENTE EPA</b>, <b>ACTUALIZAR</b> (cumplió 1 año sin actualizarse), y los que pone el vínculo con la Tabla: <b>PROGRAMADO EN TABLA</b>, SUSPENDIDO, CONDICIONAL (NO OPERADO), URGENCIA, EN LISTA DE DIFERIDOS. Los <b>cerrados (no gestionables)</b> son EGRESO, RECHAZO, OPERADO, TRASLADO INTERNO y REALIZADA EN EXTRASISTEMA.' },
    { grupos: [['actualizar'], ['estatus', 'automatic', 'por que', 'paso', 'que es', 'significa', 'cambi']],
      html: 'Un paciente en <b>PROGRAMABLE</b> pasa <b>automáticamente a ACTUALIZAR</b> al cumplir 1 año (contado desde su Fecha EPA), con una entrada en su historial dejando constancia. Lo revisa cualquier usuario con Lista de Espera abierta. Los pacientes en ACTUALIZAR ya no aparecen en el widget "6 meses – 1 año" del Dashboard.' },
    { grupos: [['tiempo de espera', 'dias de espera', 'espera'], ['calcul', 'como', 'desde', 'congel', 'cuenta']],
      html: 'Los días de espera se cuentan desde la <b>Fecha Indicación Qx</b> (o desde la <b>Fecha Estatus Programable</b>, según lo elijas en el Dashboard/Lista). Para OPERADO, RECHAZO y EGRESO el conteo se <b>congela</b>: OPERADO en la Fecha de Cirugía, RECHAZO en la primera llamada "RECHAZA" con motivo válido, EGRESO en la fecha del cambio a EGRESO.' },
    { grupos: [['percentil', 'mediana', 'p25', 'p50', 'p75', 'p90']], excluir: ['cuant', 'cual es la mediana de'],
      html: 'El Dashboard muestra la <b>mediana</b> de espera y los <b>percentiles 25/50/75/90</b> más "Mayor Espera", en rangos excluyentes (cada paciente cae en uno solo). En Lista de Pacientes puedes filtrar por percentil. También puedes preguntarme: <i>"¿cuál es la mediana de espera de traumatología?"</i>.' },
    { grupos: [['filtr', 'duplicad', 'multi especialidad', 'multiespecialidad', 'sin folio', 'no gestionables', 'sin fecha prog']], excluir: ['libro', 'estadistic', 'diferid'],
      html: 'Lista de Pacientes tiene filtros por búsqueda general, especialidad, médico, estatus, estatus EPA, prioridad, GES, comuna, percentil y rango de Fecha Ind. Qx, más botones: <b>Duplicados (RUT+Esp)</b>, <b>🔀 Multi-Especialidad</b>, <b>Sin Folio</b>, <b>📅 Sin Fecha Prog</b>, <b>🚫 Ocultar No Gestionables</b> y <b>🗓️ Operado Sin Fecha Cirugía</b>. Los filtros se recuerdan y el panel se puede plegar.',
      acciones: [['📋 Ir a Lista de Pacientes', 'seccionSub', 'listaEspera|listaPacientes']] },
    { grupos: [['llamad', 'llamar'], ['registr', 'como', 'anot', 'guard', 'motivo', 'respuesta']],
      html: 'Desde la ficha del paciente (👁️) o el Dashboard, <b>📞 Registrar Llamada</b>: fecha y hora, receptor (nombre, RUT, parentesco), <b>motivo</b> (hora de exámenes, hora de anestesia, actualización de información/continuidad del proceso, fecha cirugía, suspendido), <b>respuesta</b> (acepta, rechaza, posterga, no responde, entregará información, egreso, realizada en extrasistema), observaciones y <b>📅 Próximo Llamado</b> (aparece en "Pacientes para Llamar").' },
    { grupos: [['pacientes para llamar', 'llamados pendientes', 'proximo llamado', 'para llamar']], excluir: ['cuant', 'quien', 'hoy', 'manana', 'semana'],
      html: 'En el Dashboard, <b>📞 Pacientes para Llamar</b> lista a quienes tienen "Próximo Llamado" dentro de los próximos 10 días o atrasado, coloreados según cuánto falta. También puedes preguntarme: <i>"¿a quién hay que llamar hoy?"</i>.' },
    { grupos: [['cargar a la tabla', 'carg', 'pasar a la tabla', 'enviar a la tabla', 'mandar a la tabla', 'subir a la tabla'], ['tabla']],
      html: 'En Lista de Espera → Lista de Pacientes, botón <b>📋 Cargar a la Tabla</b>: eliges Semana, Día, Pabellón y Fila. Copia nombre, RUT, edad, diagnóstico, intervención, especialidad y cirujano (no el anestesista). Si el paciente <b>no está en PROGRAMABLE</b> te pide confirmar antes. El botón no aparece si el paciente no es gestionable o ya está en la Tabla. Desde ahí, su estatus se actualiza solo según lo que pase en la Tabla (operado, suspendido, diferido, reubicado…), con historial.',
      acciones: [['📋 Ir a Lista de Pacientes', 'seccionSub', 'listaEspera|listaPacientes']] },
    { grupos: [['rdll', 'historico']],
      html: '<b>📜 Histórico RDLL</b> (Registro Diario de Lista de Espera) es una colección aparte de registros de llamadas históricos: ver detalle, editar, eliminar, importar desde Excel y exportar. Es distinto del historial de llamadas de cada ficha.',
      acciones: [['📜 Ir a Histórico RDLL', 'seccionSub', 'listaEspera|historicoRdll']] },
    { grupos: [['administrar listas', 'comunas', 'anestesiolog', 'estatus epa'], ['agreg', 'edit', 'elimin', 'administr', 'cambi', 'lista']],
      html: '<b>⚙️ Administrar Listas</b> (Lista de Espera, solo superadministrador) gestiona especialidades y médicos por especialidad, estatus tabla, estatus EPA, anestesiólogos y comunas.' },
    { grupos: [['edit', 'modific', 'cambi', 'elimin', 'borr'], ['ficha', 'paciente de la lista', 'datos del paciente']],
      html: 'Abre la ficha con <b>👁️ Ver</b> (Lista de Pacientes o Dashboard): ahí puedes editarla, ver su historial de cambios y llamadas, registrar llamadas o eliminar al paciente, según tus permisos.' },
    // ---------- Avatar / Chat / Asistente ----------
    { grupos: [['avatar']], excluir: ['admin', 'asign'],
      html: 'El <b>Avatar</b> reproduce mensajes en video asignados por el superadministrador (la primera vez del día solo; después con clic). Puedes <b>arrastrarlo</b> a cualquier parte, silenciarlo con 🔇 mientras habla y abrir su panel con <b>📝</b>: Recordatorios, 💬 Chat y 🤖 Asistente (yo). Cada usuario lo puede activar/desactivar en sus permisos.' },
    { grupos: [['recordatorio']],
      html: 'En el panel del Avatar → <b>📝 Recordatorios</b>: "Tuyos" (los agregas y borras tú) y "De Administración" (🌐 para todos o 👤 para ti, los pone el superadministrador). Un recordatorio nuevo de administración muestra el aviso del Avatar y la insignia roja.' },
    { grupos: [['chat', 'mensaje', 'escribir a', 'grupo', 'conversacion']], excluir: ['whatsapp', 'wsp', 'paciente'],
      html: 'En el panel del Avatar → <b>💬 Chat</b>: "+ Nuevo mensaje" para escribirle a una persona o a varias (grupo, con nombre opcional y ✏️ para renombrarlo). Ves quién está <b>● en línea</b>, la hora y fecha de cada mensaje, <b>✓ Enviado / ✓✓ Visto</b>, emoticones 😊 y puedes eliminar la conversación 🗑️. Al llegar un mensaje suena un beep; el aviso en video del Avatar solo aparece si el chat está cerrado.',
      acciones: [['💬 Abrir el Chat', 'tabPanel', 'chat']] },
    { grupos: [['asistente', 'agente', 'que puedes', 'como funcionas']],
      html: 'Soy el <b>asistente</b> de la app: respondo dudas de uso y consulto datos en vivo de la Tabla Quirúrgica, Libro, Diferidos y Lista de Espera (según tus permisos), con un motor de reglas local, sin IA externa ni costo. Leo mis respuestas en voz alta (puedes silenciarme con 🔊). Escribe "ayuda" para ver ejemplos.' },
    // ---------- Administración ----------
    { grupos: [['administrador', 'panel de admin', 'administracion']], excluir: ['rol'],
      html: 'El <b>⚙️ Panel de Administración</b> es solo para el superadministrador y está en pestañas: <b>👥 Usuarios</b>, <b>📋 Tabla Quirúrgica</b> (desplegables, médicos por especialidad, plantillas de WhatsApp, 🔄 forzar recarga), <b>🗣️ Avatar</b> (mensajes en video, recordatorios) y <b>🔎 Lista de Espera</b> (vínculos fantasma, reporte de actividad por usuario).',
      acciones: [['⚙️ Ir al Panel de Administración', 'seccion', 'admin']] },
    { grupos: [['cre', 'agreg', 'nuevo'], ['usuario', 'cuenta']],
      html: 'Administrador → 👥 Usuarios → <b>+ Crear Usuario</b>: correo, contraseña y rol (Usuario / Administrador / 👑 Superadministrador). Si es Usuario, marcas las secciones y botones a los que tendrá acceso y si la Tabla será de solo lectura.' },
    { grupos: [['rol', 'roles', 'superadmin', 'administrador y usuario']],
      html: 'Roles: <b>Usuario</b> (acceso según sus permisos), <b>Administrador</b> (todo, salvo el Panel de Administración; puede Registrar Día, editar el Libro, metas y disponibilidad de pabellón) y <b>👑 Superadministrador</b> (todo, incluido el Panel). Nadie puede cambiar su propio rol.' },
    { grupos: [['permiso', 'acceso'], ['dar', 'quitar', 'cambiar', 'edit', 'configur', 'restring', 'como', 'boton']],
      html: 'Administrador → 👥 Usuarios → <b>🔐 Permisos</b>: secciones (Tabla, Diferidos, Libro, Oftalmología, Estadísticas, Manual, Lista de Espera), accesos extra (Reunión de Tabla, Análisis IA, Generador de PPT, Vista Dividida), <b>botones dentro de cada sección</b> (guardar, limpiar, diferir, exportar, registrar llamada, cargar a la tabla…), solo lectura en la Tabla y el Avatar. Se aplican al volver a iniciar sesión o recargar.' },
    { grupos: [['bloque', 'desbloque', 'activ'], ['usuario', 'cuenta']],
      html: 'En Administrador → 👥 Usuarios, <b>Bloquear/Activar</b>: un usuario bloqueado no puede iniciar sesión aunque su contraseña sea correcta.' },
    { grupos: [['bitacora', 'inicios de sesion', 'ultimo ingreso', 'quien entro']],
      html: 'En Administrador → 👥 Usuarios, <b>🕐 Bitácora</b> muestra los últimos inicios de sesión de cada usuario (fecha, hora y dispositivo). Para ver qué hizo alguien en Lista de Espera, usa Administrador → 🔎 Lista de Espera → <b>📊 Reporte de Actividad por Usuario</b>.' },
    { grupos: [['reporte de actividad', 'actividad de', 'que hizo', 'interacciones']],
      html: 'Administrador → 🔎 Lista de Espera → <b>📊 Reporte de Actividad por Usuario</b>: eliges usuario y fechas (o Hoy / Esta Semana / Este Mes) y ves sus interacciones agrupadas: ingresos nuevos, registros modificados, llamados, cargas a la tabla, WhatsApp, correcciones de estatus, con detalle.',
      acciones: [['⚙️ Ir al Panel de Administración', 'seccion', 'admin']] },
    { grupos: [['vinculo', 'vinculos', 'fantasma']],
      html: 'Administrador → 🔎 Lista de Espera → <b>🔎 Vínculos Fantasma</b> revisa toda la Tabla buscando filas cuyo vínculo con Lista de Espera apunta a un paciente que ya no corresponde (RUT distinto o paciente eliminado). <b>🧹 Limpiar</b> borra solo ese vínculo viejo, sin tocar la fila ni el estatus del paciente. Muestra la hora de la última verificación.' },
    { grupos: [['forzar recarga', 'recargar a todos', 'actualizar a todos', 'recarga forzada']],
      html: 'Administrador → 📋 Tabla Quirúrgica → 🔄 Sistema → <b>Forzar recarga a todos los equipos</b>: todas las sesiones abiertas recargan la app solas (útil después de una actualización).' },
    { grupos: [['desplegable', 'opciones de', 'jornada', 'destino', 'anestesista'], ['agreg', 'elimin', 'edit', 'cambi', 'administr', 'nueva opcion']],
      html: 'Administrador → 📋 Tabla Quirúrgica → <b>Gestión de Desplegables Fijos</b>: agregas (+) o quitas (✕) opciones de Jornada, ESTADO DE IQx, DESTINO, Especialidad y Anestesista. Eliminar una opción puede afectar registros existentes.' },
    { grupos: [['plantilla'], ['whatsapp', 'mensaje', 'agreg', 'edit']],
      html: 'Administrador → 📋 Tabla Quirúrgica → <b>💬 Plantillas de WhatsApp</b>: agrega, edita o elimina plantillas. Variables: {nombre}, {fecha}, {hora}, {especialidad}, {cirujano}, {pabellon}, {indicaciones_anestesiologo} (con llaves, tal cual).' },
    // ---------- Cuenta / acceso / problemas ----------
    { grupos: [['contrasena', 'clave', 'password'], ['olvid', 'recuper', 'cambi', 'no recuerdo', 'restablec']],
      html: 'En la pantalla de inicio escribe tu correo y haz clic en <b>"¿Olvidaste tu contraseña?"</b>: te llega un correo para elegir una nueva.' },
    { grupos: [['otro equipo', 'otra pestana', 'sesion activa', 'otro computador', 'otra sesion', 'sesion abierta']],
      html: 'Cada cuenta puede tener <b>una sola sesión activa</b>. Si inicias en otro equipo, te avisa y puedes elegir <b>"🔓 Cerrar esa sesión y continuar aquí"</b> (la otra se cierra sola). Si quedó pegada por un corte, ese mismo botón la libera; el superadministrador también puede liberarla.' },
    { grupos: [['inactiv', 'se cerro', 'se me cerr', 'me cerr', 'cerro sola', 'cierra sola', 'se cierra', 'me saco', 'me saca', 'me bota', 'me boto', 'expuls']],
      html: 'Por seguridad, la sesión se <b>cierra sola tras 30 minutos sin actividad</b> (a los 25 minutos aparece un aviso para seguir conectado), y también al cerrar la pestaña. También se cierra si alguien abre tu cuenta en otro equipo.' },
    { grupos: [['cerrar sesion', 'cerrar la sesion', 'cierro sesion', 'cierro la sesion', 'salir de la app', 'como salgo']],
      html: 'Haz clic en <b>🚪 Cerrar Sesión</b> (arriba a la derecha) y confirma.' },
    { grupos: [['no veo', 'no aparece', 'desaparec', 'no tengo', 'no me sale', 'no puedo entrar', 'no puedo ver'], ['seccion', 'menu', 'boton', 'opcion', 'estadistic', 'libro', 'lista de espera', 'diferid', 'tabla', 'oftalmolog', 'administr', 'analisis', 'reunion', 'generador', 'vista dividida', 'manual', 'export', 'guardar', 'limpiar']],
      html: 'Si no ves una sección o un botón, lo más probable es que tu cuenta no tenga ese <b>permiso</b> (las secciones y los botones se habilitan por separado). Pídele al administrador que lo habilite en 🔐 Permisos. Puedes preguntarme <i>"¿qué permisos tengo?"</i>.' },
    { grupos: [['celular', 'telefono movil', 'tablet', 'movil', 'girar', 'horizontal']],
      html: 'La app funciona en celular y tablet. La Tabla Quirúrgica y el Libro piden <b>girar la pantalla a horizontal</b> por la cantidad de columnas; el resto se adapta en vertical.' },
    { grupos: [['tiempo real', 'sincroniz', 'ven lo mismo', 'actualiza solo']],
      html: 'Sí: todos los usuarios conectados ven los mismos datos <b>en tiempo real</b> (Tabla, Lista de Espera, chat). Si algo no se actualiza, recarga con F5.' },
    { grupos: [['recuper', 'deshacer'], ['borr', 'elimin', 'perd']],
      html: 'Lo eliminado no se puede recuperar desde la app. Lo que ya estaba en el <b>Libro de Quirófano</b> sigue ahí, y en Lista de Espera el <b>historial</b> de la ficha conserva los cambios.' },
    { grupos: [['no carga', 'se pega', 'lento', 'error', 'no funciona', 'pegad', 'congel']],
      html: 'Prueba recargar la página con <b>F5</b> (o Ctrl+F5) y revisa tu conexión. Si persiste, avisa al administrador: puede forzar la recarga de todos los equipos desde el Panel de Administración.' },
    { grupos: [['manual']], excluir: ['ir al', 'abre', 'llevame'],
      html: 'El <b>📖 Manual de Usuario</b> está en el menú 🍔 y se puede descargar completo en PDF. Yo también busco en él cuando no tengo la respuesta a mano.',
      acciones: [['📖 Abrir el Manual', 'seccion', 'manual']] }
];

function asisBuscarKB(t) {
    let mejor = null;
    ASIS_KB.forEach((entrada, idx) => {
        if (entrada.excluir && asisTieneAlguno(t, entrada.excluir)) return;
        if (!entrada.grupos.every(g => asisTieneAlguno(t, g))) return;
        const hits = entrada.grupos.reduce((acc, g) => acc + g.filter(s => asisTiene(t, s)).length, 0);
        const puntaje = entrada.grupos.length * 10 + hits;
        if (!mejor || puntaje > mejor.puntaje) mejor = { entrada, puntaje, idx };
    });
    return mejor;
}

function asisRespuestaKB(entrada) {
    const acciones = (entrada.acciones || []).map(([texto, tipo, valor]) => ({
        texto,
        fn: () => {
            if (tipo === 'seccion') asisIrSeccion(valor);
            else if (tipo === 'seccionSub') { const [s, sub] = valor.split('|'); asisIrSeccion(s, sub); }
            else if (tipo === 'tabPanel' && typeof cambiarTabPanel === 'function') cambiarTabPanel(valor);
        }
    }));
    return { html: '💡 ' + entrada.html, acciones, voz: asisPrimeraOracion(entrada.html) };
}

// --- Búsqueda de texto completo en el Manual (respaldo) ---
let asisIndiceManual = null;
const ASIS_SINONIMOS = {
    borrar: 'eliminar', quitar: 'eliminar', sacar: 'eliminar', mover: 'reubicar', trasladar: 'reubicar',
    aplazar: 'diferir', postergar: 'diferir', clave: 'contrasena', password: 'contrasena', bajar: 'exportar',
    descargar: 'exportar', archivar: 'registrar', celular: 'movil', wsp: 'whatsapp', wasap: 'whatsapp',
    pasar: 'cargar', subir: 'cargar', ingresar: 'registrar', crear: 'agregar', anadir: 'agregar'
};

function asisConstruirIndiceManual() {
    if (asisIndiceManual) return asisIndiceManual;
    asisIndiceManual = [];
    if (typeof construirManualContenidos === 'function' && (typeof MANUAL_CONTENIDOS === 'undefined' || Object.keys(MANUAL_CONTENIDOS).length === 0)) {
        try { construirManualContenidos(); } catch (e) { return asisIndiceManual; }
    }
    if (typeof MANUAL_CONTENIDOS === 'undefined' || typeof MANUAL_SECCIONES === 'undefined') return asisIndiceManual;
    MANUAL_SECCIONES.forEach(sec => {
        const html = MANUAL_CONTENIDOS[sec.id] || '';
        const trozos = html.split(/(?=<h[123][\s>])/i);
        trozos.forEach(trozo => {
            const tm = trozo.match(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/i);
            const titulo = tm ? asisTextoPlano(tm[1]) : sec.titulo;
            const texto = asisTextoPlano(trozo.replace(/<h[123][^>]*>[\s\S]*?<\/h[123]>/i, ''));
            if (texto.length < 20) return;
            asisIndiceManual.push({ seccionId: sec.id, seccionTitulo: sec.titulo, titulo, texto, tokensTitulo: asisTokens(asisNorm(titulo)), tokens: asisTokens(asisNorm(texto)) });
        });
    });
    return asisIndiceManual;
}

function asisBuscarManual(t) {
    const indice = asisConstruirIndiceManual();
    if (!indice.length) return null;
    const consulta = asisTokens(t)
        .filter(tok => tok.length >= 4 && !ASIS_STOPWORDS.has(tok))
        .map(tok => ASIS_SINONIMOS[tok] || tok)
        .map(tok => tok.length > 5 ? tok.replace(/(es|s)$/, '').slice(0, Math.max(5, tok.length - 2)) : tok);
    if (consulta.length === 0) return null;
    let mejor = null;
    indice.forEach(ch => {
        let puntaje = 0;
        consulta.forEach(q => {
            if (ch.tokensTitulo.some(w => w.startsWith(q))) puntaje += 3;
            const enTexto = ch.tokens.filter(w => w.startsWith(q)).length;
            if (enTexto) puntaje += 1 + Math.min(enTexto, 3) * 0.3;
        });
        if (!mejor || puntaje > mejor.puntaje) mejor = { ch, puntaje };
    });
    if (!mejor || mejor.puntaje < Math.max(3, consulta.length * 1.2)) return null;
    const ch = mejor.ch;
    const extracto = ch.texto.length > 520 ? ch.texto.slice(0, 520).replace(/\s\S*$/, '') + '…' : ch.texto;
    return {
        html: `📖 Del Manual — <b>${asisEsc(ch.titulo)}</b>:<div class="asis-bloques"><div>${asisEsc(extracto)}</div></div>`,
        acciones: asisPuede('manual') ? [{ texto: `📖 Abrir "${ch.seccionTitulo}" en el Manual`, fn: () => asisAbrirManual(ch.seccionId) }] : [],
        voz: asisPrimeraOracion(extracto)
    };
}

// =============================================================
// 🧠 MOTOR: decide qué responder
// =============================================================
const ASIS_INTENCIONES = {
    registros: asisHandlerRegistros,
    cupos: asisHandlerCupos,
    causales: asisHandlerCausales,
    kpi: asisHandlerKpi,
    tiempos: asisHandlerTiempos,
    llamados: asisHandlerLlamados,
    plazo: asisHandlerPlazo,
    mayorEspera: asisHandlerMayorEspera,
    mediana: asisHandlerMediana,
    programablesSinTabla: asisHandlerProgramablesSinTabla,
    ingresos: asisHandlerIngresos,
    leConteo: asisHandlerLEConteo,
    diferidos: asisHandlerDiferidos,
    buscar: asisHandlerBuscarPaciente
};

function asisDetectarIntencionDatos(ctx) {
    const t = ctx.t;
    if (/\b(indice|tasa|porcentaje|indicador\w*|kpi)\b/.test(t) && /\b(suspension\w*|ambulatoriz\w*|ocupacion|rendimiento|indicador\w*|kpi)\b/.test(t)) return 'kpi';
    if (/\b(ocupacion|rendimiento)\b/.test(t) && !ctx.esComoHacer) return 'kpi';
    if (/\bambulatoriz\w*/.test(t) && !ctx.esComoHacer) return 'kpi';
    if (/\b(cuanto (dura|demora|tarda)\w*|duracion (de|del|promedio)|tiempo (promedio|quirurgico promedio) de)\b/.test(t)) return 'tiempos';
    if (/\bsuspen\w*/.test(t) && /\b(causa\w*|causal\w*|motivo\w*|razon\w*|por que)\b/.test(t)) return 'causales';
    if (/\b(cupos?|filas? (libres?|vacias?|disponibles?)|espacios? (libres?|disponibles?)|hay (lugar|espacio|cupo)|disponibilidad (en|de) (la )?tabla)\b/.test(t)) return 'cupos';
    if (/\b(llamar|llamad[oa]s?)\b/.test(t)) return 'llamados';
    if (/\bprogramables?\b/.test(t) && /\b(sin (cargar|programar|tabla)|no (estan|esta|han sido) (en|cargad\w*|programad\w*)|listos?|pendientes? de (cargar|programar)|para cargar|faltan|aun no)\b/.test(t)) return 'programablesSinTabla';
    if (/\b(6 meses|seis meses|un ano de espera|1 ano de espera|por vencer|vencid\w*|cumpl\w* (un|1) ano)\b/.test(t) || (/\bactualizar\b/.test(t) && ctx.contextoLE && !ctx.esCuanto)) return 'plazo';
    if (/\b(mayor (tiempo de )?espera|mas (tiempo|dias|antiguo\w*)|lleva(n)? mas|esperan? mas|mas esperan?|mas esperando|mas atrasad\w*|mas demorad\w*)\b/.test(t)) return 'mayorEspera';
    if (/\btop\b/.test(t) && ctx.contextoLE) return 'mayorEspera';
    if (/\b(mediana|percentil\w*|p(25|50|75|90)|tiempo (promedio|medio) de espera|promedio de espera|cuanto (se )?espera(n)?|tiempo de espera)\b/.test(t)) return 'mediana';
    if (/\bdiferid\w*/.test(t) && !/\ben lista de diferidos\b/.test(t)) return 'diferidos';
    if (/\b(ingres\w*|nuevos? pacientes?|pacientes? nuevos?)\b/.test(t) && (ctx.contextoLE || ctx.rango)) return 'ingresos';
    if (ctx.rut) return 'buscar';
    if (ctx.nombreTokens && !/\b(boton|opcion|seccion|menu|pestana|funcion|filtro)\b/.test(t)) return 'buscar';
    if (ctx.contextoLE && !ctx.contextoTabla) return 'leConteo';
    if (ctx.estatusLE && !ctx.rango && !ctx.contextoTabla && !ctx.estadoIqx) return 'leConteo';
    if (ctx.contextoLE && ctx.estatusLE && !ctx.rango) return 'leConteo';
    if (ctx.rango || ctx.pab || ctx.jornada || ctx.medico || ctx.contextoTabla || ctx.contextoLibro || (ctx.estadoIqx && !ctx.contextoLE)) return 'registros';
    if (ctx.esp && (ctx.esCuanto || ctx.esLista)) return 'registros';
    return null;
}

function asisFusionarContexto(previo, nuevo) {
    const r = { ...previo, t: nuevo.t, original: nuevo.original, esCuanto: nuevo.esCuanto || previo.esCuanto, esLista: nuevo.esLista || previo.esLista };
    ['rango', 'esp', 'pab', 'jornada', 'medico', 'estadoIqx', 'estatusLE', 'prioridad', 'ges', 'n', 'rut', 'nombreTokens'].forEach(k => {
        if (nuevo[k]) r[k] = nuevo[k];
    });
    return r;
}

const ASIS_SUGERENCIAS_BASE = [
    { texto: '¿Quiénes se operan mañana?', permiso: 'registro' },
    { texto: '¿Hay cupos libres esta semana?', permiso: 'registro' },
    { texto: '¿A quién hay que llamar hoy?', permiso: 'listaEspera' },
    { texto: '¿Quién lleva más tiempo en lista de espera?', permiso: 'listaEspera' },
    { texto: '¿Cuántos pacientes programables hay?', permiso: 'listaEspera' },
    { texto: '¿Cuál es el índice de suspensión este mes?', permiso: 'estadisticas' },
    { texto: '¿Cuántas cirugías se hicieron el mes pasado?', permiso: 'libro' },
    { texto: '¿Cómo cargo un paciente a la tabla?', permiso: null },
    { texto: '¿Quiénes están conectados?', permiso: null }
];

function asisSugerencias(max = 6) {
    return ASIS_SUGERENCIAS_BASE.filter(s => !s.permiso || asisPuede(s.permiso)).slice(0, max).map(s => s.texto);
}

function asisRespuestaAyuda() {
    const bloques = [];
    if (asisPuede('registro') || asisPuede('libro')) bloques.push('<b>📋 Tabla y Libro:</b> "¿quiénes se operan el jueves?", "¿qué opera el Dr. X mañana?", "pacientes de traumatología en pabellón 2 esta semana", "¿cuántos suspendidos hubo en septiembre?", "¿hay cupos libres el viernes?"');
    if (asisPuede('estadisticas') || asisPuede('libro')) bloques.push('<b>📊 Indicadores:</b> "índice de suspensión de este año", "¿cuál fue la ocupación el mes pasado?", "causas de suspensión de ginecología", "¿cuánto dura una colecistectomía?"');
    if (asisPuede('listaEspera')) bloques.push('<b>🩺 Lista de Espera:</b> "¿cuántos pacientes programables hay?", "¿quién lleva más tiempo esperando en ORL?", "¿a quién hay que llamar esta semana?", "mediana de espera por especialidad", "programables que aún no están en la tabla", "¿cuántos P1 GES hay?"');
    bloques.push('<b>🔎 Pacientes:</b> "busca a Juan Pérez" o escribe un RUT.');
    bloques.push('<b>🧭 Navegar:</b> "llévame a lista de espera", "abre la tabla del jueves", "ir a estadísticas".');
    bloques.push('<b>💡 Dudas de uso:</b> "¿cómo difiero un paciente?", "¿qué es ACTUALIZAR?", "¿cómo se calcula la ocupación?", "¿por qué no veo Estadísticas?"');
    bloques.push('<b>👤 Otros:</b> "¿qué permisos tengo?", "¿quiénes están conectados?", "¿qué día es hoy?". Después de una consulta puedes seguir con "¿y mañana?" o "¿y de urología?".');
    return {
        html: `🤖 Puedo ayudarte con:<div class="asis-bloques">${bloques.map(b => `<div>${b}</div>`).join('')}</div>`,
        sugerencias: asisSugerencias(),
        voz: 'Puedo consultar la tabla, el libro, la lista de espera y responder dudas sobre cómo usar la aplicación.'
    };
}

async function asisResponder(original) {
    const ctx = asisAnalizar(original);
    const t = ctx.t;
    if (!t) return { html: 'Escríbeme una pregunta 🙂', sugerencias: asisSugerencias() };

    // 1. Sociales / generales
    if (/^(hola|buen(os|as)? (dias|tardes|noches)|buenas|hey|saludos|que tal|ola)\b/.test(t) && asisTokens(t).length <= 5) {
        const nombre = (currentUserEmail || '').split('@')[0];
        return { html: `¡Hola${nombre ? ' ' + asisEsc(nombre) : ''}! 👋 Soy el asistente de la app. Pregúntame por pacientes, la tabla, la lista de espera, indicadores o cómo usar cualquier función.`, sugerencias: asisSugerencias(), voz: `Hola${nombre ? ' ' + nombre : ''}. ¿En qué te ayudo?` };
    }
    if (/^(gracias|muchas gracias|mil gracias|te pasaste|excelente|genial|perfecto|ok gracias|vale gracias|buenisimo)\b/.test(t)) {
        return { html: '¡De nada! 😊 Aquí estoy si necesitas algo más.', voz: 'De nada.' };
    }
    if (/^(chao|adios|hasta luego|nos vemos|bye)\b/.test(t)) return { html: '¡Hasta luego! 👋', voz: 'Hasta luego.' };
    if (/\b(que (puedes|sabes) hacer|en que me (ayudas|puedes ayudar)|que preguntas|ejemplos|^ayuda$|^help$|como te uso|que te puedo preguntar)\b/.test(t)) return asisRespuestaAyuda();
    if (/\b(quien eres|que eres|como te llamas|eres una ia|eres un robot)\b/.test(t)) return asisRespuestaKB(ASIS_KB.find(e => e.grupos[0].includes('asistente')));
    if (/\b(que (dia|fecha) es( hoy)?|que hora es|fecha de hoy|hora actual)\b/.test(t)) return asisHandlerFechaHora();
    if (/\b(quien soy|mi (usuario|rol|cuenta|correo)|que (permisos|accesos?) tengo|mis permisos|a que (secciones )?tengo acceso|cual es mi rol)\b/.test(t)) return asisHandlerMiUsuario();
    if (/\b(quien(es)? (esta|estan) (conectad\w*|en linea|online)|usuarios? (conectad\w*|en linea)|^conectados$|quien mas esta)\b/.test(t)) return await asisHandlerConectados();

    // 2. Navegación explícita
    const nav = asisDetectarNavegacion(ctx);
    if (nav) return asisHandlerNavegar(nav, ctx);

    // 3. Duda de uso con buena coincidencia en la base de conocimiento
    const kb = asisBuscarKB(t);
    if (ctx.esComoHacer && kb && kb.puntaje >= 10) return asisRespuestaKB(kb.entrada);

    // 4. Consulta de datos
    let intencion = asisDetectarIntencionDatos(ctx);
    let ctxFinal = ctx;

    // 5. Seguimiento ("¿y mañana?", "¿y de traumatología?", "de urología")
    const esSeguimiento = /^(y|tambien|e|ahora|y ahora|y para|y de|y en|y el|y la|y los|y las|y con|y si)\b/.test(t)
        || (asisTokens(t).length <= 3 && !ctx.esCuanto && !ctx.esLista);
    const tieneDatoNuevo = ctx.rango || ctx.esp || ctx.pab || ctx.jornada || ctx.medico || ctx.estadoIqx || ctx.estatusLE || ctx.prioridad || ctx.ges;
    // Solo se hereda si la pregunta nueva no trae una intención propia y
    // explícita: o no se detectó ninguna, o es la misma de antes, o es una
    // de las "genéricas" que se infieren solo por tener una fecha/filtro.
    const intencionGenerica = (intencion === 'registros' && !ctx.contextoTabla && !ctx.contextoLibro)
        || (intencion === 'leConteo' && !ctx.contextoLE);
    if (asisContexto && esSeguimiento && tieneDatoNuevo && (!intencion || intencion === asisContexto.intencion || intencionGenerica)) {
        intencion = asisContexto.intencion;
        ctxFinal = asisFusionarContexto(asisContexto.ctx, ctx);
    }

    if (intencion && ASIS_INTENCIONES[intencion]) {
        try {
            const r = await ASIS_INTENCIONES[intencion](ctxFinal);
            if (intencion !== 'buscar') asisContexto = { intencion, ctx: ctxFinal };
            return r;
        } catch (error) {
            console.error('❌ Asistente: error en consulta', intencion, error);
            return { html: `❌ No pude completar la consulta (${asisEsc(error.message || 'error')}). Revisa tu conexión e intenta de nuevo.` };
        }
    }

    // 6. Base de conocimiento (sin marcador de "cómo")
    if (kb && kb.puntaje >= 10) return asisRespuestaKB(kb.entrada);

    // 7. ¿Es un nombre de paciente suelto? (antes que el Manual: "ana soto"
    // no debe terminar en "Análisis IA" por parecido de letras)
    const tokensNombre = asisTokens(t).filter(tok => tok.length >= 3 && !ASIS_STOPWORDS.has(tok) && !ASIS_PALABRAS_NO_NOMBRE.has(tok));
    if (tokensNombre.length >= 1 && tokensNombre.length <= 4) {
        const enLE = asisPuede('listaEspera') && asisPacientesLESinc().some(p => asisCoincideTokens(p.nombreApellido, tokensNombre));
        const enTabla = asisPuede('registro') && asisFilasTabla().some(x => asisCoincideTokens(x.fila.Nombre_Paciente, tokensNombre));
        if (enLE || enTabla) return await asisHandlerBuscarPaciente({ ...ctx, nombreTokens: tokensNombre });
    }

    // 8. Búsqueda en el Manual
    const manual = asisBuscarManual(t);
    if (manual) return manual;

    // 9. No entendí
    return {
        html: '🤔 No estoy seguro de haber entendido. Prueba con una de estas preguntas o escribe <b>ayuda</b> para ver todo lo que puedo hacer:',
        sugerencias: asisSugerencias(),
        voz: 'No estoy seguro de haber entendido. Prueba con otra pregunta.'
    };
}

// =============================================================
// 🗣️ VOZ + ANIMACIÓN DEL AVATAR
// =============================================================
let asisVoz = null;
let asisHablandoAhora = false;
let asisTimerReaccion = null;

function asisVozActivada() {
    try { return localStorage.getItem('asis_voz_' + (currentUser ? currentUser.uid : '')) !== 'off'; } catch (e) { return true; }
}

function asisGuardarVozActivada(activa) {
    try { localStorage.setItem('asis_voz_' + (currentUser ? currentUser.uid : ''), activa ? 'on' : 'off'); } catch (e) { /* sin localStorage */ }
}

function asisElegirVoz() {
    if (!('speechSynthesis' in window)) return null;
    const voces = window.speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang));
    if (voces.length === 0) return null;
    // El Avatar es un hombre: se prefiere una voz masculina en español
    // (latinoamericana primero), y si no hay, cualquier voz en español.
    const masculina = /pablo|raul|jorge|alvaro|enrique|diego|carlos|juan|andres|gonzalo|lorenzo|tomas|male|hombre|masculin/i;
    const regiones = ['es-cl', 'es-419', 'es-us', 'es-mx', 'es-ar', 'es-co', 'es-es'];
    const porRegion = lista => regiones.map(r => lista.find(v => v.lang.replace('_', '-').toLowerCase() === r)).find(Boolean);
    return porRegion(voces.filter(v => masculina.test(v.name))) || voces.find(v => masculina.test(v.name)) || porRegion(voces) || voces[0];
}

if ('speechSynthesis' in window) {
    asisVoz = asisElegirVoz();
    window.speechSynthesis.addEventListener && window.speechSynthesis.addEventListener('voiceschanged', () => { asisVoz = asisElegirVoz(); });
}

function asisLimpiarParaVoz(texto) {
    return (texto || '')
        .replace(/[\p{Extended_Pictographic}‍️]/gu, '')
        .replace(/\bPAB (\d)\b/g, 'pabellón $1')
        .replace(/\bDra?\.\s?/g, m => m.startsWith('Dra') ? 'doctora ' : 'doctor ')
        .replace(/\bP([123])\b/g, 'prioridad $1')
        .replace(/\bCmay\b/g, 'cirugía mayor').replace(/\bCmen\b/g, 'cirugía menor')
        .replace(/\bORL\b/g, 'otorrino').replace(/\bGES\b/g, 'ges').replace(/\bEPA\b/g, 'e pe a')
        .replace(/%/g, ' por ciento').replace(/\s+/g, ' ').trim()
        .slice(0, 400);
}

function asisCanvasAvatar() {
    return document.getElementById('avatarCanvasWidget');
}

function asisAnimarAvatar(estado) {
    const c = asisCanvasAvatar();
    if (!c) return;
    c.classList.remove('asis-hablando', 'asis-pensando', 'asis-reaccion');
    if (estado) c.classList.add('asis-' + estado);
}

function asisPulsoPalabra() {
    const c = asisCanvasAvatar();
    if (!c) return;
    c.style.filter = 'drop-shadow(0 8px 14px rgba(11,42,79,0.35)) brightness(1.07)';
    setTimeout(() => { if (c) c.style.filter = ''; }, 110);
}

function asisActualizarIndicadorVoz() {
    const el = document.getElementById('asisIndicadorVoz');
    if (el) el.style.display = asisHablandoAhora ? 'inline-flex' : 'none';
}

function asisDetenerVoz() {
    if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* nada que detener */ }
    }
    asisHablandoAhora = false;
    asisAnimarAvatar(null);
    asisActualizarIndicadorVoz();
}

function asisHablar(texto) {
    if (typeof avatarReproduciendo !== 'undefined' && avatarReproduciendo) return;
    const limpio = asisLimpiarParaVoz(texto);
    const puedeHablar = limpio && asisVozActivada() && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    if (!puedeHablar) {
        // Sin voz igual "reacciona": un pequeño movimiento al responder.
        asisAnimarAvatar('reaccion');
        clearTimeout(asisTimerReaccion);
        asisTimerReaccion = setTimeout(() => asisAnimarAvatar(null), 1400);
        return;
    }
    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(limpio);
        u.lang = (asisVoz && asisVoz.lang) || 'es-CL';
        if (asisVoz) u.voice = asisVoz;
        u.rate = 1.05;
        u.pitch = 1;
        u.onstart = () => { asisHablandoAhora = true; asisAnimarAvatar('hablando'); asisActualizarIndicadorVoz(); };
        u.onboundary = (e) => { if (!e.name || e.name === 'word') asisPulsoPalabra(); };
        u.onend = u.onerror = () => { asisHablandoAhora = false; asisAnimarAvatar(null); asisActualizarIndicadorVoz(); };
        window.speechSynthesis.speak(u);
    } catch (e) {
        asisHablandoAhora = false;
        asisAnimarAvatar(null);
    }
}

function asisInyectarEstilos() {
    if (document.getElementById('asisEstilos')) return;
    const style = document.createElement('style');
    style.id = 'asisEstilos';
    style.textContent = `
        @keyframes asisHablar { 0%,100% { transform: translateY(0) rotate(0deg) scale(1); } 25% { transform: translateY(-4px) rotate(-0.8deg) scale(1.012); } 50% { transform: translateY(-1px) rotate(0.5deg) scale(1.004); } 75% { transform: translateY(-3px) rotate(0.8deg) scale(1.01); } }
        @keyframes asisPensar { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-3deg) translateY(-2px); } }
        @keyframes asisReaccion { 0% { transform: scale(1); } 30% { transform: scale(1.04) translateY(-5px); } 60% { transform: scale(0.99) translateY(0); } 100% { transform: scale(1); } }
        #avatarCanvasWidget.asis-hablando { animation: asisHablar 0.6s ease-in-out infinite; transform-origin: 50% 100%; }
        #avatarCanvasWidget.asis-pensando { animation: asisPensar 1.1s ease-in-out infinite; transform-origin: 50% 100%; }
        #avatarCanvasWidget.asis-reaccion { animation: asisReaccion 0.7s ease-out 2; transform-origin: 50% 100%; }
        @keyframes asisPunto { 0%,80%,100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        .asis-typing span { display:inline-block; width:6px; height:6px; margin:0 2px; border-radius:50%; background:#64748b; animation: asisPunto 1.2s infinite ease-in-out; }
        .asis-typing span:nth-child(2) { animation-delay: 0.15s; } .asis-typing span:nth-child(3) { animation-delay: 0.3s; }
        .asis-burbuja { max-width:88%; border-radius:10px; padding:7px 10px; font-size:0.76rem; line-height:1.45; word-break:break-word; }
        .asis-burbuja-usuario { background:#1e3a8a; color:white; align-self:flex-end; }
        .asis-burbuja-asistente { background:white; color:#1e293b; border:1px solid #e2e8f0; align-self:flex-start; }
        .asis-lista { margin:6px 0 2px; padding-left:16px; }
        .asis-lista li { margin-bottom:3px; }
        .asis-nota { font-size:0.68rem; color:#64748b; margin-top:5px; }
        .asis-sub { font-size:0.7rem; font-weight:700; color:#475569; margin-top:6px; }
        .asis-bloques > div { margin-top:5px; }
        .asis-chips { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
        .asis-chip-dato { background:#f1f5f9; border-radius:10px; padding:2px 7px; font-size:0.68rem; color:#334155; }
        .asis-btn-inline { background:#eff6ff; border:1px solid #bfdbfe; color:#1e40af; border-radius:6px; padding:0 4px; font-size:0.7rem; cursor:pointer; line-height:1.4; margin-right:1px; }
        .asis-btn-inline:hover { background:#dbeafe; }
        .asis-acciones { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
        .asis-btn-accion { background:#1e40af; color:white; border:none; border-radius:14px; padding:4px 10px; font-size:0.7rem; font-weight:600; cursor:pointer; }
        .asis-sugerencias { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
        .asis-sugerencia { background:#f8fafc; border:1px solid #cbd5e1; color:#1e3a8a; border-radius:14px; padding:4px 9px; font-size:0.7rem; cursor:pointer; text-align:left; }
        .asis-sugerencia:hover { background:#eff6ff; }
    `;
    document.head.appendChild(style);
}

// =============================================================
// 🖼️ INTERFAZ (pestaña del panel del Avatar -- ver js/36)
// =============================================================
function renderTabAsistente(cuerpo) {
    asisInyectarEstilos();
    const vozOn = asisVozActivada();
    cuerpo.innerHTML = `
        <div style="display:flex; flex-direction:column; height:360px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; flex-shrink:0;">
                <div style="flex-grow:1; min-width:0;">
                    <div style="font-weight:700; color:#0b2a4f; font-size:0.82rem;">🤖 Asistente</div>
                    <div style="font-size:0.66rem; color:#94a3b8;">Datos en vivo y dudas de uso · sin IA externa</div>
                </div>
                <span id="asisIndicadorVoz" style="display:none; align-items:center; gap:3px; font-size:0.66rem; color:#1e40af; cursor:pointer;" title="Detener">🔊 hablando… ⏹</span>
                <span id="asisBtnVoz" title="${vozOn ? 'Silenciar voz' : 'Activar voz'}" style="cursor:pointer; font-size:0.95rem;">${vozOn ? '🔊' : '🔇'}</span>
                <span id="asisBtnLimpiar" title="Nueva conversación" style="cursor:pointer; font-size:0.85rem;">🗑️</span>
            </div>
            <div id="asisMensajes" style="flex-grow:1; overflow-y:auto; background:#f8fafc; border-radius:8px; padding:8px; margin-bottom:8px; display:flex; flex-direction:column; gap:6px;"></div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
                <input type="text" id="asisInput" placeholder="Pregúntame algo..." autocomplete="off" style="flex-grow:1; min-width:0; border:1px solid #dbe3ee; border-radius:8px; padding:7px 9px; font-size:0.78rem; box-sizing:border-box;">
                <button id="asisBtnEnviar" style="background:#1e40af; color:white; border:none; border-radius:8px; padding:0 12px; font-size:1rem; cursor:pointer; flex-shrink:0;">➤</button>
            </div>
        </div>
    `;

    const input = document.getElementById('asisInput');
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') asisEnviarDesdeInput();
    });
    document.getElementById('asisBtnEnviar').addEventListener('click', e => { e.stopPropagation(); asisEnviarDesdeInput(); });
    document.getElementById('asisBtnVoz').addEventListener('click', e => {
        e.stopPropagation();
        const activar = !asisVozActivada();
        asisGuardarVozActivada(activar);
        if (!activar) asisDetenerVoz();
        const btn = document.getElementById('asisBtnVoz');
        btn.textContent = activar ? '🔊' : '🔇';
        btn.title = activar ? 'Silenciar voz' : 'Activar voz';
    });
    document.getElementById('asisIndicadorVoz').addEventListener('click', e => { e.stopPropagation(); asisDetenerVoz(); });
    document.getElementById('asisBtnLimpiar').addEventListener('click', e => {
        e.stopPropagation();
        asisDetenerVoz();
        asisHistorial = [];
        asisContexto = null;
        asisAccionesRegistro.clear();
        asisRenderMensajes();
    });
    document.getElementById('asisMensajes').addEventListener('click', e => {
        e.stopPropagation();
        const btnAccion = e.target.closest('[data-asis-accion]');
        if (btnAccion) {
            const fn = asisAccionesRegistro.get(btnAccion.dataset.asisAccion);
            if (fn) fn();
            return;
        }
        const sug = e.target.closest('[data-asis-sugerencia]');
        if (sug) asisEnviar(sug.dataset.asisSugerencia);
    });

    asisRenderMensajes();
    asisActualizarIndicadorVoz();
    setTimeout(() => { const i = document.getElementById('asisInput'); if (i) i.focus(); }, 50);
}

function asisRenderMensajes(conEscribiendo) {
    const cont = document.getElementById('asisMensajes');
    if (!cont) return;
    let html = '';
    if (asisHistorial.length === 0) {
        const nombre = (currentUserEmail || '').split('@')[0];
        html += `<div class="asis-burbuja asis-burbuja-asistente">👋 ¡Hola${nombre ? ' ' + asisEsc(nombre) : ''}! Soy tu asistente. Puedo consultar la Tabla, el Libro, Diferidos y la Lista de Espera en vivo, llevarte a cualquier sección y explicarte cómo usar la app. Prueba:<div class="asis-sugerencias">${asisSugerencias().map(s => `<button class="asis-sugerencia" data-asis-sugerencia="${asisEsc(s)}">${asisEsc(s)}</button>`).join('')}</div></div>`;
    }
    asisHistorial.forEach(m => {
        if (m.rol === 'usuario') {
            html += `<div class="asis-burbuja asis-burbuja-usuario">${asisEsc(m.texto)}</div>`;
        } else {
            const acciones = (m.acciones || []).map(a => `<button class="asis-btn-accion" data-asis-accion="${a.id}">${asisEsc(a.texto)}</button>`).join('');
            const sugerencias = (m.sugerencias || []).map(s => `<button class="asis-sugerencia" data-asis-sugerencia="${asisEsc(s)}">${asisEsc(s)}</button>`).join('');
            html += `<div class="asis-burbuja asis-burbuja-asistente">${m.html}${acciones ? `<div class="asis-acciones">${acciones}</div>` : ''}${sugerencias ? `<div class="asis-sugerencias">${sugerencias}</div>` : ''}</div>`;
        }
    });
    if (conEscribiendo) html += `<div class="asis-burbuja asis-burbuja-asistente asis-typing"><span></span><span></span><span></span></div>`;
    cont.innerHTML = html;
    cont.scrollTop = cont.scrollHeight;
}

function asisEnviarDesdeInput() {
    const input = document.getElementById('asisInput');
    if (!input) return;
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    asisEnviar(texto);
}

async function asisEnviar(texto) {
    if (asisProcesando || !texto) return;
    asisProcesando = true;
    asisDetenerVoz();
    asisHistorial.push({ rol: 'usuario', texto });
    asisRenderMensajes(true);
    asisAnimarAvatar('pensando');

    let respuesta;
    const inicio = Date.now();
    try {
        respuesta = await asisResponder(texto);
    } catch (error) {
        console.error('❌ Asistente:', error);
        respuesta = { html: '❌ Algo salió mal al responder. Intenta de nuevo.' };
    }
    // Una pausa mínima para que el "pensando" del Avatar alcance a verse.
    const espera = 450 - (Date.now() - inicio);
    if (espera > 0) await new Promise(r => setTimeout(r, espera));

    const acciones = (respuesta.acciones || []).map(a => ({ texto: a.texto, id: asisRegistrarAccion(a.fn) }));
    asisHistorial.push({ rol: 'asistente', html: respuesta.html, acciones, sugerencias: respuesta.sugerencias || [] });
    if (asisHistorial.length > ASIS_MAX_HISTORIAL) asisHistorial = asisHistorial.slice(-ASIS_MAX_HISTORIAL);
    asisProcesando = false;
    asisAnimarAvatar(null);
    asisRenderMensajes();
    asisHablar(respuesta.voz || asisPrimeraOracion(respuesta.html));
    const input = document.getElementById('asisInput');
    if (input) input.focus();
}

// Se llama al cerrar sesión (limpiarWidgetAvatar, js/36): la conversación
// puede tener datos de pacientes, no debe sobrevivir al cambio de usuario.
function asisReiniciar() {
    asisDetenerVoz();
    asisHistorial = [];
    asisContexto = null;
    asisAccionesRegistro.clear();
    asisCache = {};
    asisProcesando = false;
}
