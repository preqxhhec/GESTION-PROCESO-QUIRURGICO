// =============================================================
// 🩺 LISTA DE ESPERA — MÓDULO 8: NAVEGACIÓN INTERNA + INICIALIZACIÓN
// =============================================================
// Este archivo NO tiene equivalente directo en "LISTA DE ESPERA APP/
// script.js": allá la navegación entre secciones la resolvía un sidebar
// propio (showSection(), ligado a su propio login). Acá esa función la
// cumple js/15-navegacion-y-autenticacion.js (cambiarSeccion('listaEspera')
// muestra/oculta #listaEsperaContent igual que hace con diferidosContent,
// libroContent, etc.) — este archivo solo resuelve la sub-navegación
// INTERNA del módulo (Dashboard / Nuevo Paciente / Lista de Pacientes /
// Histórico RDLL), más el punto de entrada que carga los datos la primera
// vez que un usuario con acceso inicia sesión.
//
// Se agregó una 5ª pestaña "⚙️ Administrar Listas" (visible solo para
// esSuperAdministrador()) porque ese panel vivía dentro de "Gestión de
// Usuarios" en la app original, sección que no se portó — ver comentario
// al inicio de js/29-le-admin-listas.js.
// =============================================================

let leModuloInicializado = false;
let leSeccionActiva = 'dashboard';

const LE_TABS = [
    { key: 'dashboard', label: '🏠 Dashboard' },
    { key: 'nuevoPaciente', label: '➕ Nuevo Paciente' },
    { key: 'listaPacientes', label: '📋 Lista de Pacientes' },
    { key: 'historicoRdll', label: '📜 Histórico RDLL' }
];

// Llamada UNA vez desde js/15 (onAuthStateChanged), igual que ya hace con
// cargarDesplegablesCache()/cargarMedicosPorEspecialidadCache(), guardada
// detrás de usuarioTieneAccesoSeccion('listaEspera'). Carga la taxonomía
// administrable y abre el listener en tiempo real de patients/{key}.
async function leInicializarModulo() {
    if (leModuloInicializado) return;
    leModuloInicializado = true;
    await leCargarConfiguracionFiltros();
    leCargarPacientes();
}

// Listener en tiempo real (igual que loadPatients() del original): cada vez
// que patients/ cambia en Firebase, se reconstruye el array local y se
// refresca la sub-sección que esté abierta en ese momento.
function leCargarPacientes() {
    database.ref('patients').on('value', (snapshot) => {
        patients = [];
        snapshot.forEach((child) => {
            patients.push({ firebaseKey: child.key, ...child.val() });
        });

        sortActive = true;
        currentSortColumn = 'fechaIndQx';
        currentSortOrder = 'desc';

        leVerificarActualizacionAutomaticaPorPlazo();
        leRefrescarVistaActual();
    });
}

// =============================================================
// 🔄 CAMBIO AUTOMÁTICO A "ACTUALIZAR" AL CUMPLIR 1 AÑO
// =============================================================
// Esta app no tiene backend propio (sin Cloud Functions), así que no hay
// un lugar central que "revise" a todos los pacientes por su cuenta — el
// único momento en que se puede chequear esto es cuando alguien con acceso
// a Lista de Espera tiene la app abierta y llega este listener (arriba).
// Por eso se ejecuta acá, en cada snapshot de patients/, no solo cuando se
// mira el Dashboard: cualquier usuario conectado dispara la revisión.
//
// Usa una transaction() (no un update() directo) sobre el estatus: si dos
// o más usuarios están conectados a la vez y ambos detectan al mismo
// paciente vencido en el mismo instante, solo UNO gana la carrera y hace
// el cambio de verdad — evita duplicar la entrada de historial una vez por
// cada cliente conectado.
function leVerificarActualizacionAutomaticaPorPlazo() {
    const UMBRAL_1_ANIO_DIAS = 365;

    patients.forEach(paciente => {
        if (!esGestionable(paciente)) return;
        if (!paciente.fechaEstatusProgram) return;

        const estatusActual = (paciente.estatusTabla || '').toString().trim().toUpperCase();
        if (estatusActual === 'ACTUALIZAR') return;

        const dias = calculateWaitingDays(paciente.fechaEstatusProgram);
        if (dias < UMBRAL_1_ANIO_DIAS) return;

        const estatusAnterior = paciente.estatusTabla || '(sin estatus)';
        database.ref('patients/' + paciente.firebaseKey + '/estatusTabla').transaction(
            (valorActual) => {
                const actualNormalizado = (valorActual || '').toString().trim().toUpperCase();
                if (actualNormalizado === 'ACTUALIZAR') return; // otro cliente ya lo cambió, abortar
                return 'ACTUALIZAR';
            },
            (error, committed) => {
                if (error) {
                    console.error('❌ Error al actualizar estatus automático a ACTUALIZAR:', error);
                    return;
                }
                if (!committed) return; // otro cliente conectado ganó la carrera
                database.ref('patients/' + paciente.firebaseKey + '/historial').push({
                    fecha: new Date().toISOString(),
                    usuario: 'Sistema (automático)',
                    accion: 'Estatus actualizado automáticamente',
                    descripcion: 'Cumplió 1 año desde la Fecha Estatus Programable sin actualizarse — estatus cambiado automáticamente a ACTUALIZAR.',
                    cambios: [`Estatus: ${estatusAnterior} → ACTUALIZAR`]
                }).catch(() => {});
            }
        );
    });
}

function leRefrescarVistaActual() {
    if (leSeccionActiva === 'dashboard' && document.getElementById('totalPatients')) {
        updateDashboard();
        actualizarTablaLlamadosPendientes();
        actualizarTablaPlazoEsperaDashboard();
        leCargarEspecialidadesEnFiltroDashboard();
    } else if (leSeccionActiva === 'listaPacientes' && document.getElementById('tableBody')) {
        leMakeTableSortable();
        leFilterPatients();
    }
    // nuevoPaciente / historicoRdll / adminListas no dependen de este
    // listener para su propio render.
}

// Construye el contenedor (.le-scope + sub-nav) dentro de
// #listaEsperaContent. Se llama cada vez que cambiarSeccion('listaEspera')
// entra a la sección (js/15) — mismo patrón que cargarPacientesDiferidos()/
// cargarLibroQuirofano() en js/09: reconstruye el HTML de cero cada vez.
function leMostrarSeccionListaEspera() {
    const container = document.getElementById('listaEsperaContent');
    if (!container) return;

    container.className = 'le-scope';
    container.innerHTML = `
        <div class="le-subnav" id="leSubnav"></div>
        <div id="leSubseccionContent"></div>
    `;

    leRenderSubnavBotones();
    leCambiarSubseccion('dashboard');
}

function leRenderSubnavBotones() {
    const nav = document.getElementById('leSubnav');
    if (!nav) return;

    const tabs = [...LE_TABS];
    if (esSuperAdministrador()) tabs.push({ key: 'adminListas', label: '⚙️ Administrar Listas' });

    nav.innerHTML = tabs.map(t =>
        `<button data-le-tab="${t.key}" onclick="leCambiarSubseccion('${t.key}')">${t.label}</button>`
    ).join('');
}

function leCambiarSubseccion(tab) {
    leSeccionActiva = tab;

    document.querySelectorAll('#leSubnav button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.leTab === tab);
    });

    const content = document.getElementById('leSubseccionContent');
    if (!content) return;

    switch (tab) {
        case 'dashboard':
            leInicializarSeccionDashboard(content);
            break;
        case 'nuevoPaciente':
            leInicializarSeccionNuevoPaciente(content);
            break;
        case 'listaPacientes':
            leInicializarSeccionListaPacientes(content);
            break;
        case 'historicoRdll':
            leInicializarSeccionHistoricoRdll(content);
            break;
        case 'adminListas':
            leInicializarSeccionAdminListas(content);
            break;
        default:
            leInicializarSeccionDashboard(content);
    }
}
