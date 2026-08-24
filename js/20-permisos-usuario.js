// =============================================================
// 🔐 PERMISOS DE USUARIO: acceso por sección + solo lectura en Tabla Quirúrgica
// Los administradores siempre tienen acceso total, sin excepción — esto no
// es configurable. Lo que se restringe es lo que puede ver/hacer un usuario
// con rol "usuario". Datos guardados en usuarios/{uid}.secciones (objeto de
// booleanos) y usuarios/{uid}.soloLecturaTabla (boolean).
// =============================================================

const SECCIONES_APP = [
    { key: 'registro', label: '📋 Tabla Quirúrgica' },
    { key: 'diferidos', label: '📤 Pacientes Diferidos' },
    { key: 'libro', label: '📘 Libro de Quirófano' },
    { key: 'estadisticas', label: '📊 Estadísticas' },
    { key: 'manual', label: '📖 Manual de Usuario' },
    { key: 'listaEspera', label: '🩺 Lista de Espera' }
];

// "Reunión de Tabla" y "Análisis IA" no son secciones navegables (abren un
// modal, no cambian de pantalla) — van fuera de SECCIONES_APP para no
// afectar obtenerPrimeraSeccionAccesible()/mostrarSinAccesoSecciones(), pero
// se controlan con el mismo mecanismo (usuarios/{uid}.secciones), cada una
// con su propio checkbox e independiente de si el usuario tiene o no acceso
// a Estadísticas.
const ACCESOS_ADICIONALES_APP = [
    { key: 'reunionTabla', label: '🤝 Reunión de Tabla' },
    { key: 'analisisIa', label: '🧠 Análisis IA' }
];

let currentUserSecciones = null;
let currentUserSoloLecturaTabla = false;

// Los administradores nunca están restringidos, EXCEPTO en "admin": el
// panel Administrador es exclusivo del superadministrador — un
// administrador normal ahora tiene acceso a todo lo demás, pero no a este
// panel. "admin" no es una sección configurable — solo el rol determina el
// acceso a ella. Para el resto, `currentUserSecciones === null` es el caso
// de compatibilidad (usuarios creados antes de este sistema, sin el
// campo): acceso total por defecto.
function usuarioTieneAccesoSeccion(seccion) {
    if (seccion === 'admin') return esSuperAdministrador();
    if (esAdministrador()) return true;
    if (!currentUserSecciones) return true;
    return currentUserSecciones[seccion] !== false;
}

function obtenerPrimeraSeccionAccesible() {
    if (esAdministrador()) return 'registro';
    const encontrada = SECCIONES_APP.find(s => usuarioTieneAccesoSeccion(s.key));
    return encontrada ? encontrada.key : null;
}

function aplicarPermisosNavegacion() {
    const botonesPorSeccion = {
        registro: 'navRegistro', diferidos: 'navDiferidos', libro: 'navLibro',
        estadisticas: 'navEstadisticas', manual: 'navManual', listaEspera: 'navListaEspera'
    };
    const navReunionTabla = document.getElementById('navReunionTabla');
    const navAnalisisIA = document.getElementById('navAnalisisIA');
    if (esAdministrador()) {
        Object.values(botonesPorSeccion).forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = '';
        });
        if (navReunionTabla) navReunionTabla.style.display = '';
        if (navAnalisisIA) navAnalisisIA.style.display = '';
        return;
    }
    SECCIONES_APP.forEach(sec => {
        const btn = document.getElementById(botonesPorSeccion[sec.key]);
        if (btn) btn.style.display = usuarioTieneAccesoSeccion(sec.key) ? '' : 'none';
    });
    // Independientes entre sí y de Estadísticas: cada uno tiene su propio
    // checkbox en "Editar Permisos" (ver ACCESOS_ADICIONALES_APP).
    if (navReunionTabla) navReunionTabla.style.display = usuarioTieneAccesoSeccion('reunionTabla') ? '' : 'none';
    if (navAnalisisIA) navAnalisisIA.style.display = usuarioTieneAccesoSeccion('analisisIa') ? '' : 'none';
}

function mostrarSinAccesoSecciones() {
    if (!weekContent) return;
    weekContent.style.display = 'block';
    weekContent.innerHTML = `
        <div style="text-align:center; padding:60px 20px; color:#64748b;">
            <p style="font-size:3rem; margin-bottom:10px;">🔒</p>
            <p style="font-size:1.2rem; font-weight:600; color:#1e293b;">No tienes acceso a ninguna sección</p>
            <p>Contacta al administrador para que te asigne permisos.</p>
        </div>
    `;
    ['diferidosContent', 'libroContent', 'estadisticasContent', 'adminContent', 'manualContent', 'listaEsperaContent'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const tabContainer = document.getElementById('tabContainer');
    if (tabContainer) tabContainer.style.display = 'none';
    const daysGrid = document.querySelector('.days-grid');
    if (daysGrid) daysGrid.style.display = 'none';
}

// -------------------------------------------------------------
// 👁️ SOLO LECTURA EN TABLA QUIRÚRGICA
// Deshabilita todo lo que sea escritura dentro de cada día (formularios,
// botones de guardar/agregar/eliminar/diferir/reubicar/registrar/limpiar),
// deja navegar semanas/días e Imprimir Día, y oculta Presentación/PPT.
// -------------------------------------------------------------
function aplicarSoloLecturaTabla() {
    if (esAdministrador() || !currentUserSoloLecturaTabla) return;

    document.querySelectorAll('.day-table-container').forEach(cont => {
        cont.querySelectorAll('input, textarea, select, button').forEach(el => {
            if (el.dataset.action === 'printDay') return;
            el.disabled = true;
        });
    });

    document.getElementById('btnElegirSemanasTabla')?.style.setProperty('display', 'none');
    document.getElementById('btnPresentacionTabla')?.style.setProperty('display', 'none');
    document.getElementById('btnDescargarPptTabla')?.style.setProperty('display', 'none');
}

// -------------------------------------------------------------
// 🧰 UI DE PERMISOS — reutilizada en "Crear Usuario" y "Editar Permisos"
// -------------------------------------------------------------
function renderCheckboxesPermisos(seccionesActuales, soloLecturaActual) {
    let html = `<div id="permisosSeccionesWrap">
        <label style="font-size:0.8rem; font-weight:600; color:#475569; display:block; margin-top:12px; margin-bottom:6px;">Secciones a las que puede acceder</label>
        <div style="display:flex; flex-direction:column; gap:6px; background:#f8fafc; border-radius:8px; padding:10px;">`;

    SECCIONES_APP.forEach(sec => {
        const marcado = !seccionesActuales || seccionesActuales[sec.key] !== false;
        html += `<label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
            <input type="checkbox" class="chk-permiso-seccion" data-seccion="${sec.key}" ${marcado ? 'checked' : ''}> ${sec.label}
        </label>`;
    });

    html += `</div>
        <label style="font-size:0.8rem; font-weight:600; color:#475569; display:block; margin-top:12px; margin-bottom:6px;">Accesos adicionales (informes combinados desde el menú)</label>
        <div style="display:flex; flex-direction:column; gap:6px; background:#f8fafc; border-radius:8px; padding:10px;">`;

    ACCESOS_ADICIONALES_APP.forEach(acc => {
        const marcado = !seccionesActuales || seccionesActuales[acc.key] !== false;
        html += `<label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
            <input type="checkbox" class="chk-permiso-seccion" data-seccion="${acc.key}" ${marcado ? 'checked' : ''}> ${acc.label}
        </label>`;
    });

    html += `</div>
        <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; margin-top:10px; cursor:pointer;">
            <input type="checkbox" id="permSoloLecturaTabla" ${soloLecturaActual ? 'checked' : ''}>
            🔒 Solo lectura en Tabla Quirúrgica (puede navegar semanas/días e imprimir, pero no editar ni guardar nada)
        </label>
    </div>`;

    return html;
}

function leerPermisosDesdeFormulario() {
    const secciones = {};
    document.querySelectorAll('.chk-permiso-seccion').forEach(chk => {
        secciones[chk.dataset.seccion] = chk.checked;
    });
    const soloLecturaTabla = document.getElementById('permSoloLecturaTabla')?.checked || false;
    return { secciones, soloLecturaTabla };
}
