// =============================================================
// 🩺 LISTA DE ESPERA — MÓDULO 1: ESTADO COMPARTIDO Y UTILIDADES
// =============================================================
// Portado desde "LISTA DE ESPERA APP/script.js". Este archivo hace para el
// módulo Lista de Espera lo mismo que js/01-utilidades-globales.js hace
// para el resto de la app: declara el estado compartido (variables `let`
// que leen/escriben los demás archivos js/24 a js/30) y las funciones de
// utilidad genéricas (RUT, fechas, mediana/percentiles).
//
// NO se portó de la app original de Lista de Espera:
//   - su propio firebaseConfig / firebase.initializeApp() / const auth /
//     const db — esta app integrada ya tiene "database" y "auth" como
//     globales (ver firebase-config.js), compartidos con Tabla Quirúrgica.
//     Todo `db.` de acá en adelante pasa a ser `database.`.
//   - su propio `let currentUser` — currentUser/currentUserEmail ya existen
//     como globales de Tabla Quirúrgica (js/01), poblados por el único
//     onAuthStateChanged de js/15. Este módulo solo los LEE.
//   - `let currentUserRole` — no existe reemplazo por variable: cada uso se
//     convirtió en una llamada a esAdministrador() / esSuperAdministrador()
//     (js/15), igual que el resto del panel admin de esta app integrada.
//
// RUT: la app de Lista de Espera declaraba su PROPIA formatRut()/
// validarRutChileno() (además de un validarRut() de juguete que solo medía
// el largo del string). js/01-utilidades-globales.js YA trae formatearRut()/
// validarRut() con el mismo algoritmo (mismo enmascarado con puntos+guión,
// mismo cálculo de dígito verificador módulo 11) — comparados lado a lado
// hacen exactamente lo mismo para el mismo input. Se decidió NO duplicar esa
// lógica: formatRut()/validarRutChileno() de acá son alias delgados sobre
// formatearRut()/validarRut(), así el centenar de sitios del código portado
// que ya llaman a "formatRut(...)"/"validarRutChileno(...)" no hay que
// tocarlos uno por uno. El validarRut() de juguete de la app original
// NO se portó (habría sobrescrito silenciosamente al validarRut() real).
// =============================================================

function formatRut(rut) {
    return formatearRut(rut);
}

function validarRutChileno(rut) {
    return validarRut(rut);
}

// Validación de RUT "en vivo" sobre un <input>: colorea el borde y muestra
// un mensajito de ✅/❌ al perder el foco. Se usa en varios formularios
// portados (Nuevo Paciente, Registrar Llamada, RDLL). Clona el input para
// deshacerse de listeners previos (evita duplicados si el formulario se
// vuelve a renderizar) y devuelve el input clonado.
function setupRutValidationLimpio(inputElement) {
    if (!inputElement) return null;

    const cleanInput = inputElement.cloneNode(true);
    inputElement.parentNode.replaceChild(cleanInput, inputElement);

    function limpiarMensajes() {
        const parent = cleanInput.parentNode;
        const mensajes = parent.querySelectorAll('.rut-msg');
        mensajes.forEach(msg => msg.remove());
        cleanInput.style.borderColor = '';
        cleanInput.style.backgroundColor = '';
    }

    cleanInput.addEventListener('blur', function () {
        const rut = this.value;
        const rutLimpio = rut ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';

        limpiarMensajes();

        if (rut && !validarRutChileno(rutLimpio)) {
            this.style.borderColor = '#ef4444';
            this.style.backgroundColor = '#fee2e2';
            const msg = document.createElement('small');
            msg.className = 'rut-msg';
            msg.style.cssText = 'color:#ef4444; display:block; margin-top:4px;';
            msg.textContent = '❌ RUT inválido. Verifica el formato.';
            this.parentNode.appendChild(msg);
        } else if (rut && validarRutChileno(rutLimpio)) {
            this.value = formatRut(rutLimpio);
            this.style.borderColor = '#10b981';
            this.style.backgroundColor = '#ecfdf5';
            const msg = document.createElement('small');
            msg.className = 'rut-msg';
            msg.style.cssText = 'color:#10b981; display:block; margin-top:4px;';
            msg.textContent = '✅ RUT válido';
            this.parentNode.appendChild(msg);
        }
    });

    cleanInput.addEventListener('input', limpiarMensajes);

    return cleanInput;
}

// =============================================================
// 📋 ESTADO COMPARTIDO DEL MÓDULO
// =============================================================

// Especialistas "semilla": valores por defecto usados solo si Firebase
// todavía no tiene nada guardado en configuracion/filtrosDinamicos (primera
// vez que se usa el módulo contra una base de datos nueva/vacía). Una vez
// que hay datos guardados, especialidadesLista/medicosPorEspecialidad los
// reemplazan (ver leCargarConfiguracionFiltros() en js/29).
const LE_ESPECIALISTAS_DEFECTO = {
    "CIRUGIA GENERAL": ["DR. ANTONIO PAUSIN MUÑOZ", "DR. JUAN VAILATI LOPEZ", "DR. HENDER RINCON OLAVEZ", "DR. ALEXIS ORDAZ GONZALEZ", "DRA. FATIMA TINOCO HURTADO", "OTRO"],
    "CIRUGIA INFANTIL": ["DRA. LORENA ANGEL GALLARDO", "DRA. MARIA JARA VALDIVIA", "OTRO"],
    "GINECOLOGIA": ["DR. MIGUEL MOYA GONZALEZ", "DRA. JESSIE NEUMANN RUIZ", "DRA. ALIANY LEZAMA GUERRA", "DRA. AMANDA POBLETE REQUENA", "DRA. CELSA PEREZ SCOTT", "DR. MIGUEL CARRILLO AGUIRRE", "DRA. MARIA DURAN MONASTERIO", "OTRO"],
    "MAXILOFACIAL": ["DR. JAVIER VENEGAS RIQUELME", "DR. HECTOR REYES RODRIGUEZ", "DR. SEBASTIAN GUTIERREZ ZUÑIGA", "DRA. LORENA SAAVEDRA BARRAZA", "OTRO"],
    "OFTALMOLOGIA": ["DRA. MARIA SEQUERA LAMPER", "DRA. NAIRIM SANDOVAL NAVEDA", "OTRO"],
    "ORL": ["DR. ORLANDO DAWAHRE ACEVEDO", "DRA. MADELEIN MACHADO DELGADO", "OTRO"],
    "TRAUMATOLOGIA": ["DR. JESUS SAYEGLE CHAMI", "DRA. DOUGMAI CAMACARO HERNANDEZ", "OTRO"],
    "UROLOGIA": ["DR. LUIS HERNANDEZ VARGAS", "OTRO"]
};

// Rutas en Firebase (mismas formas de datos que la app original — la
// migración de datos a la base de datos nueva, cuando ocurra, conserva
// estos mismos nombres de colección).
const LE_CONFIG_DB_PATH = 'configuracion/filtrosDinamicos';
const LE_RDLL_DB_PATH = 'rdll_historico';

// Estatus que se consideran "cerrados" (el paciente ya no se gestiona
// activamente en la lista de espera). Centralizado acá porque el original
// repetía este mismo array literal en más de 8 lugares distintos.
const LE_ESTADOS_NO_GESTIONABLES = ["EGRESO", "RECHAZO", "TRASLADO INTERNO", "OPERADO"];

function esGestionable(paciente) {
    if (!paciente || !paciente.estatusTabla) return true;
    const estatus = paciente.estatusTabla.toString().trim().toUpperCase();
    return !LE_ESTADOS_NO_GESTIONABLES.includes(estatus);
}

// 🩺 Estatus que indican que el paciente YA tiene una fila activa en la
// Tabla Quirúrgica (los produce leActualizarEstatusPaciente()/
// leSincronizarEstatusDesdeFila() en js/31-le-bridge-cargar-a-tabla.js).
// Mientras el paciente esté en alguno de estos estatus, el botón "Cargar a
// la Tabla" se oculta — ya tiene una fila vinculada, cargarlo de nuevo
// crearía un segundo vínculo sobre una fila distinta y desincronizaría el
// estatus. Para volver a habilitarlo hay que reubicarlo/diferirlo desde la
// Tabla (lo que además mueve el vínculo, no lo duplica).
const LE_ESTADOS_YA_EN_TABLA = ["PROGRAMADO EN TABLA", "SUSPENDIDO", "CONDICIONAL (NO OPERADO)", "URGENCIA", "EN LISTA DE DIFERIDOS", "OPERADO"];

function leYaEstaEnTabla(paciente) {
    if (!paciente || !paciente.estatusTabla) return false;
    const estatus = paciente.estatusTabla.toString().trim().toUpperCase();
    return LE_ESTADOS_YA_EN_TABLA.includes(estatus);
}

// Datos de pacientes (patients/{key} en Firebase) y estado de navegación
// del formulario/modal — compartidos por js/24 (alta) y js/25 (lista/modal).
let patients = [];
let currentPatientKey = null;
let currentModalPatient = null;

// Taxonomía administrable (configuracion/filtrosDinamicos) — poblada por
// leCargarConfiguracionFiltros() en js/29, leída por los selects de js/24 y
// los filtros de js/25.
let especialistas = JSON.parse(JSON.stringify(LE_ESPECIALISTAS_DEFECTO));
let especialidadesLista = [];
let medicosPorEspecialidad = {};
let estatusTablaLista = [];
let estatusEpaLista = [];
let anestesiologosLista = [];
let comunasLista = [];

// Estado de filtros/orden de la Lista de Pacientes (js/25).
let currentSortColumn = null;
let currentSortOrder = 'asc';
let sortActive = false;
let soloSinFolio = false;
let mostrarDuplicados = false;
let mostrarMultiEspecialidad = false;
let soloSinProgramacion = false;
let ocultarNoGestionables = false;
let filtroPercentil = '';
let percentilesGlobales = { p25: 0, p50: 0, p75: 0, p90: 0 };

// Fuente de fecha usada para calcular "días de espera": son independientes
// entre Dashboard (radios) y Lista de Pacientes (select).
let fuentePercentilDashboard = 'fechaIndQx';
let fuentePercentilLista = 'fechaIndQx';

// =============================================================
// ⏳ MODAL DE "PROCESANDO..." (equivalente al #loadingModal estático que
// tenía la app original en su index.html; acá se crea perezosamente la
// primera vez que se necesita, igual que el resto de los modales de este
// módulo — ver comentario sobre .le-scope.modal en style-lista-espera.css).
// =============================================================

function leMostrarCargando() {
    let modal = document.getElementById('leLoadingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'leLoadingModal';
        modal.className = 'modal le-scope';
        modal.innerHTML = `
            <div class="modal-content" style="text-align:center; max-width:400px;">
                <h3>Procesando...</h3>
                <p>Por favor espera, esto puede tomar unos segundos.</p>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

function leOcultarCargando() {
    const modal = document.getElementById('leLoadingModal');
    if (modal) modal.style.display = 'none';
}

// =============================================================
// 📅 FECHAS / EDAD / DÍAS DE ESPERA
// =============================================================

function calculateAge(birthDate) {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function calculateWaitingDays(startDate) {
    if (!startDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start;
    if (typeof startDate === 'string' && startDate.includes('-')) {
        const [y, m, d] = startDate.split('-').map(Number);
        start = new Date(y, m - 1, d);
    } else {
        start = new Date(startDate);
    }
    start.setHours(0, 0, 0, 0);

    return Math.ceil((today - start) / (1000 * 60 * 60 * 24));
}

function getDiasEspera(patient, tipo = 'lista') {
    const fuente = tipo === 'dashboard' ? fuentePercentilDashboard : fuentePercentilLista;
    if (fuente === 'fechaEstatusProgram') {
        return calculateWaitingDays(patient.fechaEstatusProgram);
    }
    return calculateWaitingDays(patient.fechaIndQx);
}

// Formatea una fecha a DD/MM/AAAA. Soporta: fecha serial de Excel (número),
// ISO con hora (guardado por Firebase), YYYY-MM-DD (input type=date) y
// DD-MM-YYYY/DD/MM/YYYY (vienen así al migrar desde Excel).
function formatDate(dateString) {
    if (!dateString) return '-';

    if (typeof dateString === 'number') {
        const fecha = new Date((dateString - 25569) * 86400000);
        if (!isNaN(fecha.getTime())) {
            const dayStr = String(fecha.getDate()).padStart(2, '0');
            const monthStr = String(fecha.getMonth() + 1).padStart(2, '0');
            const yearStr = fecha.getFullYear();
            return `${dayStr}/${monthStr}/${yearStr}`;
        }
        return String(dateString);
    }

    if (typeof dateString !== 'string') {
        dateString = String(dateString);
    }

    if (dateString.includes('/') && dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        return dateString;
    }

    if (dateString.match(/^\d{2}-\d{2}-\d{4}/)) {
        const [day, month, year] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    let date;
    if (dateString.includes('T')) {
        date = new Date(dateString);
    } else if (dateString.includes('-') && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
    } else {
        date = new Date(dateString);
    }

    if (isNaN(date.getTime())) return dateString;

    const dayStr = String(date.getDate()).padStart(2, '0');
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const yearStr = date.getFullYear();

    return `${dayStr}/${monthStr}/${yearStr}`;
}

// =============================================================
// 📊 MEDIANA / PERCENTILES (usados por el Dashboard, js/26)
// =============================================================

function calcularMediana(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }
    return sorted[mid];
}

// Percentiles 25/50/75/90 con rangos EXCLUYENTES (cada paciente cae en
// exactamente uno de los 5 rangos: ≤P25, P25-P50, P50-P75, P75-P90, >P90).
function calcularEstadisticasEspera(diasEspera, totalPacientes) {
    if (diasEspera.length === 0) {
        return {
            p25: { valor: 0, min: 0, max: 0, pacientes: 0, porcentaje: 0 },
            p50: { valor: 0, min: 0, max: 0, pacientes: 0, porcentaje: 0 },
            p75: { valor: 0, min: 0, max: 0, pacientes: 0, porcentaje: 0 },
            p90: { valor: 0, min: 0, max: 0, pacientes: 0, porcentaje: 0 },
            resto: { min: 0, max: 0, pacientes: 0, porcentaje: 0 }
        };
    }

    const sorted = [...diasEspera].sort((a, b) => a - b);
    const n = sorted.length;

    const getPercentil = (p) => sorted[Math.floor(p * (n - 1))];

    const valorP25 = getPercentil(0.25);
    const valorP50 = getPercentil(0.50);
    const valorP75 = getPercentil(0.75);
    const valorP90 = getPercentil(0.90);

    const pacientesP25 = sorted.filter(d => d <= valorP25).length;
    const pacientesP50 = sorted.filter(d => d > valorP25 && d <= valorP50).length;
    const pacientesP75 = sorted.filter(d => d > valorP50 && d <= valorP75).length;
    const pacientesP90 = sorted.filter(d => d > valorP75 && d <= valorP90).length;
    const pacientesResto = sorted.filter(d => d > valorP90).length;

    return {
        p25: { valor: valorP25, min: 0, max: valorP25, pacientes: pacientesP25, porcentaje: ((pacientesP25 / totalPacientes) * 100).toFixed(1) },
        p50: { valor: valorP50, min: valorP25 + 1, max: valorP50, pacientes: pacientesP50, porcentaje: ((pacientesP50 / totalPacientes) * 100).toFixed(1) },
        p75: { valor: valorP75, min: valorP50 + 1, max: valorP75, pacientes: pacientesP75, porcentaje: ((pacientesP75 / totalPacientes) * 100).toFixed(1) },
        p90: { valor: valorP90, min: valorP75 + 1, max: valorP90, pacientes: pacientesP90, porcentaje: ((pacientesP90 / totalPacientes) * 100).toFixed(1) },
        resto: { min: valorP90 + 1, max: sorted[sorted.length - 1], pacientes: pacientesResto, porcentaje: ((pacientesResto / totalPacientes) * 100).toFixed(1) }
    };
}
