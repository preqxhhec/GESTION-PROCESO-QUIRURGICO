// =============================================================
// 🩺 LISTA DE ESPERA — MÓDULO 7: ADMINISTRAR LISTAS (TAXONOMÍA)
// =============================================================
// Portado desde "LISTA DE ESPERA APP/script.js": CRUD de
// configuracion/filtrosDinamicos (especialidades + médicos por
// especialidad, estatus tabla, estatus EPA, anestesiólogos, comunas), más
// dos utilidades de mantenimiento masivo (formatear todos los RUT,
// re-aplicar folio "NO APLICA" donde GES=SI).
//
// La app original tenía este panel DENTRO de "Gestión de Usuarios" (la
// sección completa que no se portó — ver js/11-admin-usuarios.js, que ya
// cubre gestión de usuarios para toda la app integrada). Como esa sección
// desaparece, este panel necesitaba un punto de entrada nuevo: se agregó
// como una 5ª pestaña interna "⚙️ Administrar Listas" en la sub-navegación
// de js/30, visible SOLO para superadministrador — mismo criterio que el
// resto del panel Administrador de esta app integrada (exclusivo de
// esSuperAdministrador(), ver js/09 cargarAdmin()).
//
// `currentUserRole === 'admin'` → esSuperAdministrador() en TODO este
// archivo (a diferencia de js/25 y js/27, que usan esAdministrador() para
// acciones de "puede editar/gestionar" — este es el CRUD de taxonomía,
// que el plan de integración pide dejar exclusivo del superadministrador).
// `db.` → `database.`.
// =============================================================

function leRenderAdminListasHTML() {
    if (!esSuperAdministrador()) {
        return `
            <div style="text-align:center; padding:40px; color:#dc2626;">
                <p style="font-size:3rem; margin-bottom:10px;">⛔</p>
                <p style="font-size:1.2rem; font-weight:600;">Acceso denegado</p>
                <p style="color:#64748b;">Solo el superadministrador puede administrar la taxonomía de Lista de Espera.</p>
            </div>
        `;
    }

    return `
        <h2 style="margin-bottom:16px;">⚙️ Administrar Opciones de Filtros</h2>
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:20px;">
            <div style="background:#f8fafc; padding:20px; border-radius:12px;">
                <h4 style="color:#1e40af; margin-bottom:15px;">🏥 Especialidades y Médicos</h4>
                <div class="form-group">
                    <label>Especialidad</label>
                    <select id="adminEspSelect" onchange="adminCargarMedicos()" style="width:100%; padding:10px;"><option value="">Seleccionar Especialidad</option></select>
                </div>
                <div style="display:flex; gap:10px; margin:15px 0;">
                    <input type="text" id="adminNuevaEspecialidad" placeholder="Nueva Especialidad" style="flex:1; padding:8px;">
                    <button onclick="adminAgregarEspecialidad()" class="btn-primary" style="padding:8px 16px;">➕ Agregar</button>
                    <button onclick="adminEditarEspecialidad()" class="btn-secondary" style="background:#f59e0b; padding:8px 16px;">✏️ Editar</button>
                </div>
                <hr style="margin:15px 0;">
                <div class="form-group">
                    <label>Médicos de la especialidad seleccionada</label>
                    <select id="adminMedicosList" size="5" style="width:100%; padding:8px; min-height:150px;"></select>
                </div>
                <div style="display:flex; gap:10px; margin:10px 0;">
                    <input type="text" id="adminNuevoMedico" placeholder="Nombre del Médico" style="flex:1; padding:8px;">
                    <button onclick="adminAgregarMedico()" class="btn-primary" style="padding:8px 16px;">➕ Agregar</button>
                    <button onclick="adminEditarMedico()" class="btn-secondary" style="background:#f59e0b; padding:8px 16px;">✏️ Editar</button>
                </div>
                <button onclick="adminEliminarMedico()" class="btn-danger" style="width:100%; padding:8px;">🗑️ Eliminar Médico Seleccionado</button>
            </div>

            <div style="background:#f8fafc; padding:20px; border-radius:12px;">
                <h4 style="color:#1e40af; margin-bottom:15px;">📋 Estatus Tabla</h4>
                <div class="form-group"><label>Lista de Estatus</label><select id="adminEstatusList" size="8" style="width:100%; padding:8px; min-height:200px;"></select></div>
                <div style="display:flex; gap:10px; margin:15px 0;">
                    <input type="text" id="adminNuevoEstatus" placeholder="Nuevo Estatus" style="flex:1; padding:8px;">
                    <button onclick="adminAgregarEstatus()" class="btn-primary" style="padding:8px 16px;">➕ Agregar</button>
                    <button onclick="adminEditarEstatus()" class="btn-secondary" style="background:#f59e0b; padding:8px 16px;">✏️ Editar</button>
                </div>
                <button onclick="adminEliminarEstatus()" class="btn-danger" style="width:100%; padding:8px;">🗑️ Eliminar Estatus Seleccionado</button>
            </div>

            <div style="background:#f8fafc; padding:20px; border-radius:12px;">
                <h4 style="color:#1e40af; margin-bottom:15px;">🔬 Estatus EPA</h4>
                <div class="form-group"><label>Lista de Estatus EPA</label><select id="adminEpaList" size="5" style="width:100%; padding:8px; min-height:120px;"></select></div>
                <div style="display:flex; gap:10px; margin:15px 0;">
                    <input type="text" id="adminNuevoEpa" placeholder="Nuevo Estatus EPA" style="flex:1; padding:8px;">
                    <button onclick="adminAgregarEpa()" class="btn-primary" style="padding:8px 16px;">➕ Agregar</button>
                    <button onclick="adminEditarEpa()" class="btn-secondary" style="background:#f59e0b; padding:8px 16px;">✏️ Editar</button>
                </div>
                <button onclick="adminEliminarEpa()" class="btn-danger" style="width:100%; padding:8px;">🗑️ Eliminar Estatus EPA</button>
            </div>

            <div style="background:#f8fafc; padding:20px; border-radius:12px;">
                <h4 style="color:#1e40af; margin-bottom:15px;">💉 Anestesiólogos</h4>
                <div class="form-group"><label>Lista de Anestesiólogos</label><select id="adminAnestesiologosList" size="5" style="width:100%; padding:8px; min-height:120px;"></select></div>
                <div style="display:flex; gap:10px; margin:15px 0;">
                    <input type="text" id="adminNuevoAnestesiologo" placeholder="Nombre del Anestesiólogo" style="flex:1; padding:8px;">
                    <button onclick="adminAgregarAnestesiologo()" class="btn-primary" style="padding:8px 16px;">➕ Agregar</button>
                    <button onclick="adminEditarAnestesiologo()" class="btn-secondary" style="background:#f59e0b; padding:8px 16px;">✏️ Editar</button>
                </div>
                <button onclick="adminEliminarAnestesiologo()" class="btn-danger" style="width:100%; padding:8px;">🗑️ Eliminar Anestesiólogo</button>
            </div>

            <div style="background:#f8fafc; padding:20px; border-radius:12px;">
                <h4 style="color:#1e40af; margin-bottom:15px;">🏠 Comunas</h4>
                <div class="form-group"><label>Lista de Comunas</label><select id="adminComunasList" size="5" style="width:100%; padding:8px; min-height:120px;"></select></div>
                <div style="display:flex; gap:10px; margin:15px 0;">
                    <input type="text" id="adminNuevaComuna" placeholder="Nueva Comuna" style="flex:1; padding:8px;">
                    <button onclick="adminAgregarComuna()" class="btn-primary" style="padding:8px 16px;">➕ Agregar</button>
                    <button onclick="adminEditarComuna()" class="btn-secondary" style="background:#f59e0b; padding:8px 16px;">✏️ Editar</button>
                </div>
                <button onclick="adminEliminarComuna()" class="btn-danger" style="width:100%; padding:8px;">🗑️ Eliminar Comuna</button>
            </div>

            <div style="background:#f8fafc; padding:20px; border-radius:12px; display:flex; flex-direction:column; gap:12px; align-items:center; justify-content:center;">
                <button onclick="adminRestablecerDefault()" class="btn-secondary" style="background:#f59e0b; padding:12px 24px;">🔄 Restablecer valores por defecto</button>
                <button onclick="formatearTodosLosRUT()" class="btn-secondary" style="background:#2563eb; padding:12px 24px;">🧮 Formatear todos los RUT existentes</button>
                <button onclick="actualizarFolioEnRegistrosExistentes()" class="btn-secondary" style="background:#64748b; padding:12px 24px;">📄 Poner Folio "NO APLICA" donde GES=SI</button>
            </div>
        </div>
    `;
}

function leInicializarSeccionAdminListas(container) {
    container.innerHTML = leRenderAdminListasHTML();
    if (!esSuperAdministrador()) return;
    leCargarDatosEnPanelAdmin();
}

// =============================================================
// 🔄 CARGA / GUARDADO DE LA CONFIGURACIÓN (configuracion/filtrosDinamicos)
// =============================================================

async function leCargarConfiguracionFiltros() {
    try {
        const snapshot = await database.ref(LE_CONFIG_DB_PATH).once('value');
        const data = snapshot.val();

        if (data) {
            if (data.especialidades) especialidadesLista = data.especialidades;
            if (data.medicosPorEspecialidad) medicosPorEspecialidad = data.medicosPorEspecialidad;
            if (data.estatusTabla) estatusTablaLista = data.estatusTabla;
            if (data.estatusEpa) estatusEpaLista = data.estatusEpa;
            if (data.anestesiologos) anestesiologosLista = data.anestesiologos;
            if (data.comunas) comunasLista = data.comunas;
        }

        if (especialidadesLista.length === 0) especialidadesLista = Object.keys(LE_ESPECIALISTAS_DEFECTO);
        if (Object.keys(medicosPorEspecialidad).length === 0) medicosPorEspecialidad = JSON.parse(JSON.stringify(LE_ESPECIALISTAS_DEFECTO));
        if (estatusTablaLista.length === 0) estatusTablaLista = ['PROGRAMABLE', 'PENDIENTE EPA', 'NO PROGRAMABLE', 'ACTUALIZAR', 'CARTA CERTIFICADA', 'OPERADO', 'EGRESO', 'TRASLADO INTERNO', 'RECHAZO', 'REALIZADA EN EXTRASISTEMA', 'EXCEPTUADO TRANSITORIO', 'EXCEPTUADO POR RECHAZO', 'EXCEPTUADO INUBICABLE'];

        // 🩺 "Programado en Tabla" lo pone el sistema solo, con esta
        // capitalización EXACTA (ver leCargarPacienteATabla() en js/31) —
        // nunca pasa por adminAgregarEstatus(), que fuerza MAYÚSCULAS. Si no
        // está acá tal cual, el filtro "Estatus Tabla" de Lista de Pacientes
        // nunca encuentra a esos pacientes aunque sí tengan ese estatus. Se
        // agrega siempre (no solo cuando la lista estaba vacía) para que una
        // lista ya personalizada por el hospital también lo tenga.
        //
        // "En Lista de Espera" YA NO se agrega acá: era un estatus inventado
        // que el sistema escribía al perder una fila sin resultado — pero
        // ningún paciente en esta colección deja de estar "en lista de
        // espera" por definición, así que no es un estatus real. Ahora ese
        // caso devuelve al paciente a su estatus previo a entrar en la tabla
        // (normalmente "PROGRAMABLE", ya incluido arriba) — ver
        // leCalcularEstatusAlPerderFila() en js/31.
        if (!estatusTablaLista.includes('Programado en Tabla')) estatusTablaLista.push('Programado en Tabla');
        if (estatusEpaLista.length === 0) estatusEpaLista = ['PENDIENTE', 'AGENDADO', 'REALIZADO', 'NO APLICA'];
        if (anestesiologosLista.length === 0) anestesiologosLista = ['DR. DANILO NAVA', 'DR. PEDRO GOLES', 'DRA. MARIANGEL YANES', 'DRA. RAQUEL VALERO', 'DRA. MARINELA RICCOBONO', 'DR. ROBERTO OROZCO', 'DR. DANIEL RIQUELME', 'DR. ANGEL MONTIEL'];
        if (comunasLista.length === 0) comunasLista = ['ILLAPEL', 'CANELA', 'LOS VILOS', 'SALAMANCA'];

        especialistas = medicosPorEspecialidad;
    } catch (error) {
        console.error("Error cargando configuración de Lista de Espera:", error);
    }
}

async function leGuardarConfiguracionFiltros() {
    if (!esSuperAdministrador()) return;
    await database.ref(LE_CONFIG_DB_PATH).set({
        especialidades: especialidadesLista,
        medicosPorEspecialidad: medicosPorEspecialidad,
        estatusTabla: estatusTablaLista,
        estatusEpa: estatusEpaLista,
        anestesiologos: anestesiologosLista,
        comunas: comunasLista,
        ultimaModificacion: firebase.database.ServerValue.TIMESTAMP,
        modificadoPor: currentUserEmail || 'Sistema'
    });
}

// Refresca todos los <select> de la app que dependen de la taxonomía
// (formulario Nuevo Paciente en js/24, filtros de Lista de Pacientes y de
// Dashboard en js/25 y js/26) — se llama después de cada cambio en este
// panel.
function leRefrescarTodosLosSelectsFiltros() {
    if (document.getElementById('especialidad')) leCargarDesplegablesFormularioPaciente();
    if (document.getElementById('filterEspecialidad')) leCargarFiltrosListaPacientes();
    if (document.getElementById('dashboardFilterEspecialidad')) leCargarEspecialidadesEnFiltroDashboard();
}

// =============================================================
// 🧱 PANEL ADMIN: CARGA DE LISTAS EN LOS <select>
// =============================================================

function leCargarDatosEnPanelAdmin() {
    if (!esSuperAdministrador()) return;

    const adminEspSelect = document.getElementById('adminEspSelect');
    if (adminEspSelect) {
        adminEspSelect.innerHTML = '<option value="">Seleccionar Especialidad</option>' +
            especialidadesLista.map(esp => `<option value="${esp}">${esp}</option>`).join('');
    }
    adminCargarMedicos();

    const adminEstatusList = document.getElementById('adminEstatusList');
    if (adminEstatusList) adminEstatusList.innerHTML = estatusTablaLista.map(e => `<option value="${e}">${e}</option>`).join('');

    const adminEpaList = document.getElementById('adminEpaList');
    if (adminEpaList) adminEpaList.innerHTML = estatusEpaLista.map(e => `<option value="${e}">${e}</option>`).join('');

    const adminAnestList = document.getElementById('adminAnestesiologosList');
    if (adminAnestList) adminAnestList.innerHTML = anestesiologosLista.map(a => `<option value="${a}">${a}</option>`).join('');

    const adminComunasList = document.getElementById('adminComunasList');
    if (adminComunasList) adminComunasList.innerHTML = comunasLista.map(c => `<option value="${c}">${c}</option>`).join('');
}

function adminCargarMedicos() {
    const espSelect = document.getElementById('adminEspSelect');
    const esp = espSelect ? espSelect.value : '';
    const adminMedicosList = document.getElementById('adminMedicosList');
    if (!adminMedicosList) return;

    if (!esp) {
        adminMedicosList.innerHTML = '<option value="">-- Selecciona una especialidad primero --</option>';
        return;
    }

    const medicos = medicosPorEspecialidad[esp] || [];
    adminMedicosList.innerHTML = medicos.length === 0
        ? '<option value="">-- No hay médicos registrados --</option>'
        : medicos.map(m => `<option value="${m}">${m}</option>`).join('');
}

// =============================================================
// ➕ ✏️ 🗑️ CRUD ESPECIALIDADES
// =============================================================

async function adminAgregarEspecialidad() {
    if (!esSuperAdministrador()) return;
    const nuevaEsp = document.getElementById('adminNuevaEspecialidad').value.trim().toUpperCase();
    if (!nuevaEsp) {
        showModal({ title: '⚠️ Falta un dato', message: 'Ingresa el nombre de la especialidad.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (especialidadesLista.includes(nuevaEsp)) {
        showModal({ title: '⚠️ Ya existe', message: 'Esta especialidad ya existe.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }

    especialidadesLista.push(nuevaEsp);
    especialidadesLista.sort();
    medicosPorEspecialidad[nuevaEsp] = [];

    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    document.getElementById('adminNuevaEspecialidad').value = '';
    showModal({ title: '✅ Agregada', message: `Especialidad "${nuevaEsp}" agregada correctamente.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminEditarEspecialidad() {
    if (!esSuperAdministrador()) return;
    const espAntigua = document.getElementById('adminEspSelect').value;
    const espNueva = document.getElementById('adminNuevaEspecialidad').value.trim().toUpperCase();

    if (!espAntigua) {
        showModal({ title: '❌ Falta selección', message: 'Selecciona una especialidad para editar.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (!espNueva) {
        showModal({ title: '❌ Falta un dato', message: 'Ingresa el nuevo nombre de la especialidad.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (espAntigua === espNueva) {
        showModal({ title: '⚠️ Sin cambios', message: 'El nombre es el mismo. No se realizaron cambios.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (especialidadesLista.includes(espNueva)) {
        showModal({ title: '❌ Ya existe', message: 'Ya existe una especialidad con ese nombre.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }

    const confirmado = await showModal({
        title: '🔄 Cambiar especialidad',
        message: `¿Cambiar especialidad "${espAntigua}" → "${espNueva}"?<br><br>Esto actualizará TODOS los pacientes que tengan esta especialidad.`,
        icon: '🔄', confirmText: 'Sí, cambiar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    leMostrarCargando();
    try {
        const actualizados = await actualizarCampoEnPacientes('especialidad', espAntigua, espNueva);

        const index = especialidadesLista.indexOf(espAntigua);
        if (index !== -1) especialidadesLista[index] = espNueva;
        especialidadesLista.sort();

        medicosPorEspecialidad[espNueva] = medicosPorEspecialidad[espAntigua] || [];
        delete medicosPorEspecialidad[espAntigua];

        await leGuardarConfiguracionFiltros();
        leRefrescarTodosLosSelectsFiltros();
        leCargarDatosEnPanelAdmin();

        showModal({ title: '✅ Actualizada', message: `Especialidad actualizada.<br>📊 Pacientes afectados: ${actualizados}`, icon: '✅', confirmText: 'Aceptar' });
    } catch (error) {
        console.error(error);
        showModal({ title: '❌ Error', message: 'Error al editar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    } finally {
        leOcultarCargando();
        document.getElementById('adminNuevaEspecialidad').value = '';
    }
}

// =============================================================
// ➕ ✏️ 🗑️ CRUD MÉDICOS (por especialidad)
// =============================================================

async function adminAgregarMedico() {
    if (!esSuperAdministrador()) return;
    const esp = document.getElementById('adminEspSelect').value;
    const nuevoMedico = document.getElementById('adminNuevoMedico').value.trim().toUpperCase();

    if (!esp) {
        showModal({ title: '⚠️ Falta selección', message: 'Selecciona una especialidad primero.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (!nuevoMedico) {
        showModal({ title: '⚠️ Falta un dato', message: 'Ingresa el nombre del médico.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }

    if (!medicosPorEspecialidad[esp]) medicosPorEspecialidad[esp] = [];
    if (medicosPorEspecialidad[esp].includes(nuevoMedico)) {
        showModal({ title: '⚠️ Ya existe', message: 'Este médico ya existe en esta especialidad.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }

    medicosPorEspecialidad[esp].push(nuevoMedico);
    medicosPorEspecialidad[esp].sort();

    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    adminCargarMedicos();
    document.getElementById('adminNuevoMedico').value = '';
    showModal({ title: '✅ Agregado', message: `Médico "${nuevoMedico}" agregado a ${esp}.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminEditarMedico() {
    if (!esSuperAdministrador()) return;
    const esp = document.getElementById('adminEspSelect').value;
    const medicoAntiguo = document.getElementById('adminMedicosList')?.value;
    const medicoNuevo = document.getElementById('adminNuevoMedico').value.trim().toUpperCase();

    if (!esp) {
        showModal({ title: '❌ Falta selección', message: 'Selecciona una especialidad primero.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (!medicoAntiguo) {
        showModal({ title: '❌ Falta selección', message: 'Selecciona un médico para editar.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (!medicoNuevo) {
        showModal({ title: '❌ Falta un dato', message: 'Ingresa el nuevo nombre del médico.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (medicoAntiguo === medicoNuevo) {
        showModal({ title: '⚠️ Sin cambios', message: 'El nombre es el mismo. No se realizaron cambios.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if ((medicosPorEspecialidad[esp] || []).includes(medicoNuevo)) {
        showModal({ title: '❌ Ya existe', message: 'Ya existe un médico con ese nombre en esta especialidad.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }

    const confirmado = await showModal({
        title: '🔄 Cambiar médico',
        message: `¿Cambiar médico "${medicoAntiguo}" → "${medicoNuevo}"?<br><br>Esto actualizará TODOS los pacientes que tengan este médico.`,
        icon: '🔄', confirmText: 'Sí, cambiar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    leMostrarCargando();
    try {
        const actualizados = await actualizarCampoEnPacientes('medicoTratante', medicoAntiguo, medicoNuevo);

        const index = medicosPorEspecialidad[esp].indexOf(medicoAntiguo);
        if (index !== -1) medicosPorEspecialidad[esp][index] = medicoNuevo;
        medicosPorEspecialidad[esp].sort();

        await leGuardarConfiguracionFiltros();
        leRefrescarTodosLosSelectsFiltros();
        adminCargarMedicos();

        showModal({ title: '✅ Actualizado', message: `Médico actualizado.<br>📊 Pacientes afectados: ${actualizados}`, icon: '✅', confirmText: 'Aceptar' });
    } catch (error) {
        console.error(error);
        showModal({ title: '❌ Error', message: 'Error al editar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    } finally {
        leOcultarCargando();
        document.getElementById('adminNuevoMedico').value = '';
    }
}

async function adminEliminarMedico() {
    if (!esSuperAdministrador()) return;
    const esp = document.getElementById('adminEspSelect').value;
    const medicoSeleccionado = document.getElementById('adminMedicosList')?.value;

    if (!esp || !medicoSeleccionado) {
        showModal({ title: '⚠️ Falta selección', message: 'Selecciona un médico para eliminar.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    const confirmado = await showModal({
        title: '🗑️ Eliminar médico',
        message: `¿Eliminar al médico "${medicoSeleccionado}" de ${esp}?`,
        icon: '🗑️', confirmText: 'Sí, eliminar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    const index = medicosPorEspecialidad[esp].indexOf(medicoSeleccionado);
    if (index !== -1) medicosPorEspecialidad[esp].splice(index, 1);

    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    adminCargarMedicos();
    showModal({ title: '✅ Eliminado', message: `Médico "${medicoSeleccionado}" eliminado.`, icon: '✅', confirmText: 'Aceptar' });
}

// =============================================================
// ➕ ✏️ 🗑️ CRUD ESTATUS TABLA / EPA / ANESTESIÓLOGOS / COMUNAS
// (misma forma repetida 4 veces en el original — se mantiene así acá para
// no arriesgar una "generalización" que introduzca un bug nuevo).
// =============================================================

async function adminAgregarEstatus() {
    if (!esSuperAdministrador()) return;
    const nuevoEstatus = document.getElementById('adminNuevoEstatus').value.trim().toUpperCase();
    if (!nuevoEstatus) {
        showModal({ title: '⚠️ Falta un dato', message: 'Ingresa un nuevo estatus.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (estatusTablaLista.includes(nuevoEstatus)) {
        showModal({ title: '⚠️ Ya existe', message: 'Este estatus ya existe.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }

    estatusTablaLista.push(nuevoEstatus);
    estatusTablaLista.sort();
    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    document.getElementById('adminNuevoEstatus').value = '';
    showModal({ title: '✅ Agregado', message: `Estatus "${nuevoEstatus}" agregado correctamente.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminEditarEstatus() {
    if (!esSuperAdministrador()) return;
    const estatusAntiguo = document.getElementById('adminEstatusList')?.value;
    const estatusNuevo = document.getElementById('adminNuevoEstatus').value.trim().toUpperCase();

    if (!estatusAntiguo) {
        showModal({ title: '❌ Falta selección', message: 'Selecciona un estatus para editar.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (!estatusNuevo) {
        showModal({ title: '❌ Falta un dato', message: 'Ingresa el nuevo nombre del estatus.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (estatusAntiguo === estatusNuevo) {
        showModal({ title: '⚠️ Sin cambios', message: 'El nombre es el mismo. No se realizaron cambios.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (estatusTablaLista.includes(estatusNuevo)) {
        showModal({ title: '❌ Ya existe', message: 'Ya existe un estatus con ese nombre.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }

    const confirmado = await showModal({
        title: '🔄 Cambiar estatus',
        message: `¿Cambiar estatus "${estatusAntiguo}" → "${estatusNuevo}"?<br><br>Esto actualizará TODOS los pacientes con este estatus.`,
        icon: '🔄', confirmText: 'Sí, cambiar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    leMostrarCargando();
    try {
        const actualizados = await actualizarCampoEnPacientes('estatusTabla', estatusAntiguo, estatusNuevo);
        const index = estatusTablaLista.indexOf(estatusAntiguo);
        if (index !== -1) estatusTablaLista[index] = estatusNuevo;
        estatusTablaLista.sort();
        await leGuardarConfiguracionFiltros();
        leRefrescarTodosLosSelectsFiltros();
        leCargarDatosEnPanelAdmin();
        showModal({ title: '✅ Actualizado', message: `Estatus actualizado.<br>📊 Pacientes afectados: ${actualizados}`, icon: '✅', confirmText: 'Aceptar' });
    } catch (error) {
        console.error(error);
        showModal({ title: '❌ Error', message: 'Error al editar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    } finally {
        leOcultarCargando();
        document.getElementById('adminNuevoEstatus').value = '';
    }
}

async function adminEliminarEstatus() {
    if (!esSuperAdministrador()) return;
    const estatusSeleccionado = document.getElementById('adminEstatusList')?.value;
    if (!estatusSeleccionado) {
        showModal({ title: '⚠️ Falta selección', message: 'Selecciona un estatus para eliminar.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    const confirmado = await showModal({
        title: '🗑️ Eliminar estatus',
        message: `¿Eliminar el estatus "${estatusSeleccionado}"?`,
        icon: '🗑️', confirmText: 'Sí, eliminar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    const index = estatusTablaLista.indexOf(estatusSeleccionado);
    if (index !== -1) estatusTablaLista.splice(index, 1);

    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    showModal({ title: '✅ Eliminado', message: `Estatus "${estatusSeleccionado}" eliminado.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminAgregarEpa() {
    if (!esSuperAdministrador()) return;
    const nuevoEpa = document.getElementById('adminNuevoEpa').value.trim().toUpperCase();
    if (!nuevoEpa) {
        showModal({ title: '⚠️ Falta un dato', message: 'Ingresa un nuevo estatus EPA.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (estatusEpaLista.includes(nuevoEpa)) {
        showModal({ title: '⚠️ Ya existe', message: 'Este estatus EPA ya existe.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }

    estatusEpaLista.push(nuevoEpa);
    estatusEpaLista.sort();
    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    document.getElementById('adminNuevoEpa').value = '';
    showModal({ title: '✅ Agregado', message: `Estatus EPA "${nuevoEpa}" agregado.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminEditarEpa() {
    if (!esSuperAdministrador()) return;
    const epaAntiguo = document.getElementById('adminEpaList')?.value;
    const epaNuevo = document.getElementById('adminNuevoEpa').value.trim().toUpperCase();

    if (!epaAntiguo) {
        showModal({ title: '❌ Falta selección', message: 'Selecciona un estatus EPA para editar.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (!epaNuevo) {
        showModal({ title: '❌ Falta un dato', message: 'Ingresa el nuevo nombre del estatus EPA.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (epaAntiguo === epaNuevo) {
        showModal({ title: '⚠️ Sin cambios', message: 'El nombre es el mismo. No se realizaron cambios.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (estatusEpaLista.includes(epaNuevo)) {
        showModal({ title: '❌ Ya existe', message: 'Ya existe un estatus EPA con ese nombre.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }

    const confirmado = await showModal({
        title: '🔄 Cambiar estatus EPA',
        message: `¿Cambiar estatus EPA "${epaAntiguo}" → "${epaNuevo}"?<br><br>Esto actualizará TODOS los pacientes con este estatus EPA.`,
        icon: '🔄', confirmText: 'Sí, cambiar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    leMostrarCargando();
    try {
        const actualizados = await actualizarCampoEnPacientes('estatusEpa', epaAntiguo, epaNuevo);
        const index = estatusEpaLista.indexOf(epaAntiguo);
        if (index !== -1) estatusEpaLista[index] = epaNuevo;
        estatusEpaLista.sort();
        await leGuardarConfiguracionFiltros();
        leRefrescarTodosLosSelectsFiltros();
        leCargarDatosEnPanelAdmin();
        showModal({ title: '✅ Actualizado', message: `Estatus EPA actualizado.<br>📊 Pacientes afectados: ${actualizados}`, icon: '✅', confirmText: 'Aceptar' });
    } catch (error) {
        console.error(error);
        showModal({ title: '❌ Error', message: 'Error al editar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    } finally {
        leOcultarCargando();
        document.getElementById('adminNuevoEpa').value = '';
    }
}

async function adminEliminarEpa() {
    if (!esSuperAdministrador()) return;
    const epaSeleccionado = document.getElementById('adminEpaList')?.value;
    if (!epaSeleccionado) {
        showModal({ title: '⚠️ Falta selección', message: 'Selecciona un estatus EPA para eliminar.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    const confirmado = await showModal({
        title: '🗑️ Eliminar estatus EPA',
        message: `¿Eliminar "${epaSeleccionado}"?`,
        icon: '🗑️', confirmText: 'Sí, eliminar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    const index = estatusEpaLista.indexOf(epaSeleccionado);
    if (index !== -1) estatusEpaLista.splice(index, 1);

    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    showModal({ title: '✅ Eliminado', message: `Estatus EPA "${epaSeleccionado}" eliminado.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminAgregarAnestesiologo() {
    if (!esSuperAdministrador()) return;
    const nuevoAnest = document.getElementById('adminNuevoAnestesiologo').value.trim().toUpperCase();
    if (!nuevoAnest) {
        showModal({ title: '⚠️ Falta un dato', message: 'Ingresa un nuevo anestesiólogo.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (anestesiologosLista.includes(nuevoAnest)) {
        showModal({ title: '⚠️ Ya existe', message: 'Este anestesiólogo ya existe.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }

    anestesiologosLista.push(nuevoAnest);
    anestesiologosLista.sort();
    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    document.getElementById('adminNuevoAnestesiologo').value = '';
    showModal({ title: '✅ Agregado', message: `Anestesiólogo "${nuevoAnest}" agregado.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminEditarAnestesiologo() {
    if (!esSuperAdministrador()) return;
    const anestAntiguo = document.getElementById('adminAnestesiologosList')?.value;
    const anestNuevo = document.getElementById('adminNuevoAnestesiologo').value.trim().toUpperCase();

    if (!anestAntiguo) {
        showModal({ title: '❌ Falta selección', message: 'Selecciona un anestesiólogo para editar.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (!anestNuevo) {
        showModal({ title: '❌ Falta un dato', message: 'Ingresa el nuevo nombre del anestesiólogo.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (anestAntiguo === anestNuevo) {
        showModal({ title: '⚠️ Sin cambios', message: 'El nombre es el mismo. No se realizaron cambios.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (anestesiologosLista.includes(anestNuevo)) {
        showModal({ title: '❌ Ya existe', message: 'Ya existe un anestesiólogo con ese nombre.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }

    const confirmado = await showModal({
        title: '🔄 Cambiar anestesiólogo',
        message: `¿Cambiar anestesiólogo "${anestAntiguo}" → "${anestNuevo}"?<br><br>Esto actualizará TODOS los pacientes con este anestesiólogo.`,
        icon: '🔄', confirmText: 'Sí, cambiar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    leMostrarCargando();
    try {
        const actualizados = await actualizarCampoEnPacientes('anestesiologo', anestAntiguo, anestNuevo);
        const index = anestesiologosLista.indexOf(anestAntiguo);
        if (index !== -1) anestesiologosLista[index] = anestNuevo;
        anestesiologosLista.sort();
        await leGuardarConfiguracionFiltros();
        leRefrescarTodosLosSelectsFiltros();
        leCargarDatosEnPanelAdmin();
        showModal({ title: '✅ Actualizado', message: `Anestesiólogo actualizado.<br>📊 Pacientes afectados: ${actualizados}`, icon: '✅', confirmText: 'Aceptar' });
    } catch (error) {
        console.error(error);
        showModal({ title: '❌ Error', message: 'Error al editar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    } finally {
        leOcultarCargando();
        document.getElementById('adminNuevoAnestesiologo').value = '';
    }
}

async function adminEliminarAnestesiologo() {
    if (!esSuperAdministrador()) return;
    const anestSeleccionado = document.getElementById('adminAnestesiologosList')?.value;
    if (!anestSeleccionado) {
        showModal({ title: '⚠️ Falta selección', message: 'Selecciona un anestesiólogo para eliminar.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    const confirmado = await showModal({
        title: '🗑️ Eliminar anestesiólogo',
        message: `¿Eliminar "${anestSeleccionado}"?`,
        icon: '🗑️', confirmText: 'Sí, eliminar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    const index = anestesiologosLista.indexOf(anestSeleccionado);
    if (index !== -1) anestesiologosLista.splice(index, 1);

    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    showModal({ title: '✅ Eliminado', message: `Anestesiólogo "${anestSeleccionado}" eliminado.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminAgregarComuna() {
    if (!esSuperAdministrador()) return;
    const nuevaComuna = document.getElementById('adminNuevaComuna').value.trim().toUpperCase();
    if (!nuevaComuna) {
        showModal({ title: '⚠️ Falta un dato', message: 'Ingresa una nueva comuna.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (comunasLista.includes(nuevaComuna)) {
        showModal({ title: '⚠️ Ya existe', message: 'Esta comuna ya existe.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }

    comunasLista.push(nuevaComuna);
    comunasLista.sort();
    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    document.getElementById('adminNuevaComuna').value = '';
    showModal({ title: '✅ Agregada', message: `Comuna "${nuevaComuna}" agregada.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminEditarComuna() {
    if (!esSuperAdministrador()) return;
    const comunaAntigua = document.getElementById('adminComunasList')?.value;
    const comunaNueva = document.getElementById('adminNuevaComuna').value.trim().toUpperCase();

    if (!comunaAntigua) {
        showModal({ title: '❌ Falta selección', message: 'Selecciona una comuna para editar.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (!comunaNueva) {
        showModal({ title: '❌ Falta un dato', message: 'Ingresa el nuevo nombre de la comuna.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }
    if (comunaAntigua === comunaNueva) {
        showModal({ title: '⚠️ Sin cambios', message: 'El nombre es el mismo. No se realizaron cambios.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (comunasLista.includes(comunaNueva)) {
        showModal({ title: '❌ Ya existe', message: 'Ya existe una comuna con ese nombre.', icon: '❌', confirmText: 'Aceptar' });
        return;
    }

    const confirmado = await showModal({
        title: '🔄 Cambiar comuna',
        message: `¿Cambiar comuna "${comunaAntigua}" → "${comunaNueva}"?<br><br>Esto actualizará TODOS los pacientes con esta comuna.`,
        icon: '🔄', confirmText: 'Sí, cambiar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    leMostrarCargando();
    try {
        const actualizados = await actualizarCampoEnPacientes('comuna', comunaAntigua, comunaNueva);
        const index = comunasLista.indexOf(comunaAntigua);
        if (index !== -1) comunasLista[index] = comunaNueva;
        comunasLista.sort();
        await leGuardarConfiguracionFiltros();
        leRefrescarTodosLosSelectsFiltros();
        leCargarDatosEnPanelAdmin();
        showModal({ title: '✅ Actualizada', message: `Comuna actualizada.<br>📊 Pacientes afectados: ${actualizados}`, icon: '✅', confirmText: 'Aceptar' });
    } catch (error) {
        console.error(error);
        showModal({ title: '❌ Error', message: 'Error al editar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    } finally {
        leOcultarCargando();
        document.getElementById('adminNuevaComuna').value = '';
    }
}

async function adminEliminarComuna() {
    if (!esSuperAdministrador()) return;
    const comunaSeleccionada = document.getElementById('adminComunasList')?.value;
    if (!comunaSeleccionada) {
        showModal({ title: '⚠️ Falta selección', message: 'Selecciona una comuna para eliminar.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    const confirmado = await showModal({
        title: '🗑️ Eliminar comuna',
        message: `¿Eliminar "${comunaSeleccionada}"?`,
        icon: '🗑️', confirmText: 'Sí, eliminar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    const index = comunasLista.indexOf(comunaSeleccionada);
    if (index !== -1) comunasLista.splice(index, 1);

    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    showModal({ title: '✅ Eliminada', message: `Comuna "${comunaSeleccionada}" eliminada.`, icon: '✅', confirmText: 'Aceptar' });
}

async function adminRestablecerDefault() {
    if (!esSuperAdministrador()) return;
    const confirmado = await showModal({
        title: '⚠️ Restablecer valores por defecto',
        message: '¿Restablecer todos los valores por defecto?<br><br>Esto eliminará todas las especialidades, médicos, estatus, anestesiólogos y comunas que hayas agregado.',
        icon: '⚠️', confirmText: 'Sí, restablecer', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    especialidadesLista = Object.keys(LE_ESPECIALISTAS_DEFECTO);
    medicosPorEspecialidad = JSON.parse(JSON.stringify(LE_ESPECIALISTAS_DEFECTO));
    estatusTablaLista = ['PROGRAMABLE', 'PENDIENTE EPA', 'NO PROGRAMABLE', 'ACTUALIZAR', 'CARTA CERTIFICADA', 'OPERADO', 'EGRESO', 'TRASLADO INTERNO', 'RECHAZO', 'REALIZADA EN EXTRASISTEMA', 'EXCEPTUADO TRANSITORIO', 'EXCEPTUADO POR RECHAZO', 'EXCEPTUADO INUBICABLE'];
    estatusEpaLista = ['PENDIENTE', 'AGENDADO', 'REALIZADO', 'NO APLICA'];
    anestesiologosLista = ['DR. DANILO NAVA', 'DR. PEDRO GOLES', 'DRA. MARIANGEL YANES', 'DRA. RAQUEL VALERO', 'DRA. MARINELA RICCOBONO', 'DR. ROBERTO OROZCO', 'DR. DANIEL RIQUELME', 'DR. ANGEL MONTIEL'];
    comunasLista = ['ILLAPEL', 'CANELA', 'LOS VILOS', 'SALAMANCA'];

    await leGuardarConfiguracionFiltros();
    leRefrescarTodosLosSelectsFiltros();
    leCargarDatosEnPanelAdmin();
    showModal({ title: '✅ Restablecido', message: 'Valores restablecidos a los originales.', icon: '✅', confirmText: 'Aceptar' });
}

// =============================================================
// 🧮 UTILIDADES DE MANTENIMIENTO MASIVO
// =============================================================

// Aplica campo=valorNuevo a todos los patients/{key} donde campo=valorAntiguo.
// Usada por los "Editar" de arriba (especialidad/médico/estatus/EPA/
// anestesiólogo/comuna cambian de nombre y hay que propagarlo).
async function actualizarCampoEnPacientes(campo, valorAntiguo, valorNuevo) {
    if (valorAntiguo === valorNuevo) return 0;

    let actualizados = 0;
    const snapshot = await database.ref('patients').once('value');
    const updates = {};

    snapshot.forEach((child) => {
        const patient = child.val();
        if (patient[campo] === valorAntiguo) {
            updates[`patients/${child.key}/${campo}`] = valorNuevo;
            actualizados++;
        }
    });

    if (actualizados > 0) await database.ref().update(updates);
    return actualizados;
}

async function formatearTodosLosRUT() {
    if (!esSuperAdministrador()) return;
    const confirmado = await showModal({
        title: '⚠️ Formatear RUTs',
        message: '¿Quieres formatear TODOS los RUT existentes?<br><br>Esta acción es segura.',
        icon: '⚠️', confirmText: 'Sí, formatear', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    leMostrarCargando();
    let count = 0;

    database.ref('patients').once('value', (snapshot) => {
        const total = snapshot.numChildren();
        const updates = {};

        snapshot.forEach((child) => {
            const patient = child.val();
            if (patient.rut) {
                const rutFormateado = formatRut(patient.rut);
                if (rutFormateado !== patient.rut) {
                    updates[`patients/${child.key}/rut`] = rutFormateado;
                    count++;
                }
            }
        });

        const finalizar = () => {
            leOcultarCargando();
            showModal({ title: '✅ Proceso finalizado', message: `Registros procesados: ${total}<br>RUTs formateados: ${count}`, icon: '✅', confirmText: 'Aceptar' });
        };

        if (count > 0) database.ref().update(updates).then(finalizar).catch(finalizar);
        else finalizar();
    });
}

async function actualizarFolioEnRegistrosExistentes() {
    if (!esSuperAdministrador()) return;
    const confirmado = await showModal({
        title: '⚠️ Actualizar Folio en registros existentes',
        message: `¿Quieres actualizar TODOS los registros existentes?<br><br>Se cambiará el Folio a 'NO APLICA' en aquellos donde GES = 'SI'.<br><br>Esta acción es segura y solo se ejecuta una vez.`,
        icon: '⚠️', confirmText: 'Sí, actualizar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;

    leMostrarCargando();

    database.ref('patients').once('value').then((snapshot) => {
        const updates = {};
        let actualizados = 0;

        snapshot.forEach((child) => {
            const patient = child.val();
            if (patient.ges === 'SI' && patient.folio !== 'NO APLICA') {
                updates[`patients/${child.key}/folio`] = 'NO APLICA';
                actualizados++;
            }
        });

        const finalizar = () => {
            leOcultarCargando();
            showModal({ title: '✅ Proceso finalizado', message: `Registros actualizados: ${actualizados}`, icon: '✅', confirmText: 'Aceptar' });
        };

        if (actualizados > 0) database.ref().update(updates).then(finalizar).catch(finalizar);
        else finalizar();
    }).catch((error) => {
        console.error(error);
        leOcultarCargando();
        showModal({ title: '❌ Error', message: 'Error al actualizar registros: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    });
}
