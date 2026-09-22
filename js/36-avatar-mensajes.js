// =============================================================
// 🗣️ AVATAR DE RECORDATORIOS (mensajes en video fijos)
// =============================================================
// Mensajes en VIDEO ya grabados (con su propio audio) -- no hay texto
// generado ni voz sintetizada. El superadministrador solo decide A QUIÉN se
// le muestra cada uno (ver cargarAsignacionesAvatar()/guardarAsignacionAvatar()
// más abajo, con su tarjeta en el Panel de Administración -- js/09), nunca
// agrega mensajes nuevos desde la interfaz: para eso hay que subir el archivo
// de video a la carpeta avatar/ y agregarlo a AVATAR_MENSAJES_DISPONIBLES.
//
// El fondo blanco del video/foto se recorta EN VIVO con un canvas (mismo
// mecanismo probado en el prototipo de diseño): flood-fill desde los 4
// bordes del cuadro sobre una copia chica (rápido) -- solo se borra el
// blanco CONECTADO al borde (el fondo real), nunca el blanco de ojos/dientes
// (rodeado de piel/labios, nunca toca el borde). El resultado se usa como
// máscara de transparencia sobre la imagen a tamaño completo. Así se ve solo
// el personaje flotando, sin cuadro ni círculo alrededor.
//
// Se muestra solo si currentUserAvatarActivo es true (permiso por usuario,
// ver js/20) y si hay al menos un mensaje asignado a este usuario. Habla
// solo (automático) la primera vez que se inicia sesión en el día
// (localStorage, por uid) -- después de eso, solo con clic en el avatar.
// =============================================================

const AVATAR_FOTO_REPOSO = 'avatar/avatar-reposo.jpg';
const AVATAR_MENSAJES_DISPONIBLES = [
    { id: 'prequirurgico', titulo: 'Usuarios Prequirúrgico', archivo: 'avatar/mensaje-prequirurgico.mp4' },
    { id: 'pabellon', titulo: 'Usuarios Pabellón', archivo: 'avatar/mensaje-pabellon.mp4' }
];

// 📌 Precarga de la foto de reposo desde que se carga este archivo (antes
// de que exista sesión siquiera) -- así, para cuando construirWidgetAvatar()
// la necesita (después de esperar la lectura de Firebase), lo más probable
// es que ya esté descargada y el avatar aparezca de inmediato en vez de
// quedar como un recuadro transparente unos segundos mientras carga.
const avatarImgReposoPrecarga = new Image();
avatarImgReposoPrecarga.src = AVATAR_FOTO_REPOSO;

// 📐 Tamaño del avatar: normal en reposo, el DOBLE mientras habla o
// mientras el panel de recordatorios está abierto (ver
// avatarActualizarTamano()).
const AVATAR_TAMANO_REPOSO = { w: 130, h: 170 };
const AVATAR_TAMANO_GRANDE = { w: 260, h: 340 };

let avatarCanvasEl = null;
let avatarCtx = null;
let avatarVideoEl = null;
let avatarImgReposo = null;
let avatarMaskCanvas = null;
let avatarMaskCtx = null;
let avatarRafId = null;
let avatarReproduciendo = false;
let avatarColaMensajes = [];
let avatarIndiceCola = 0;

// 📝 Recordatorios de TEXTO (independientes de los mensajes en video): se
// muestran en un panel al hacer clic en el ícono 📝 del widget, nunca se
// leen en voz alta. "Tuyos" los agrega/elimina el propio usuario; "De
// Administración" (🌐 para todos / 👤 asignado a él) los pone el
// superadministrador desde el Panel de Administración — ver
// cargarRecordatoriosTextoAdmin() más abajo.
let avatarRecordatoriosTexto = { personales: [], deAdmin: [] };
let avatarPanelRecordatoriosAbierto = false;
let avatarEscuchandoRecordatoriosTexto = false;

// =============================================================
// 🚀 INICIO (se llama una vez por sesión, justo después del login — js/15)
// =============================================================
async function inicializarAvatarMensajes() {
    if (!currentUser || !currentUserAvatarActivo) return;

    const mensajesVideo = await obtenerMensajesAvatarParaUsuario();
    avatarColaMensajes = mensajesVideo;

    // 👀 Recordatorios de texto: escucha en vivo (no una lectura única) para
    // que un cambio del administrador (o uno propio hecho desde otro
    // equipo) se refleje solo, sin esperar a que el usuario recargue la
    // página — arma el widget si hace falta apenas llega el primer dato.
    escucharRecordatoriosTexto();

    if (mensajesVideo.length === 0) return;
    construirWidgetAvatar();

    const claveHoy = 'avatar_ultimo_dia_' + currentUser.uid;
    const hoy = new Date().toISOString().slice(0, 10);
    let yaHabloHoy = false;
    try { yaHabloHoy = localStorage.getItem(claveHoy) === hoy; } catch (e) { /* localStorage bloqueado: se ignora, simplemente no recuerda entre sesiones */ }

    if (!yaHabloHoy) {
        setTimeout(() => {
            reproducirColaAvatar();
            try { localStorage.setItem(claveHoy, hoy); } catch (e) { /* idem */ }
        }, 1500);
    }
}

async function obtenerMensajesAvatarParaUsuario() {
    try {
        const snapshot = await database.ref('avatarMensajes').once('value');
        const data = snapshot.val() || {};
        return AVATAR_MENSAJES_DISPONIBLES.filter(m => {
            const asignacion = data[m.id];
            if (!asignacion) return false;
            if (asignacion.paraTodos) return true;
            return !!(asignacion.usuarios && asignacion.usuarios[currentUser.uid]);
        });
    } catch (error) {
        console.error('❌ Error al cargar mensajes del avatar:', error);
        return [];
    }
}

// 👀 Escucha en vivo los 3 orígenes de recordatorios de texto (los propios,
// los globales y los asignados a este usuario) y recombina cada vez que
// CUALQUIERA de los 3 cambia -- así un recordatorio que agrega/quita el
// superadministrador (u otra sesión del propio usuario) se refleja solo,
// sin recargar la página. Si el widget todavía no existía (ej. el usuario
// no tenía ningún mensaje en video asignado), se arma apenas llega el
// primer dato que sí aplica.
function escucharRecordatoriosTexto() {
    if (avatarEscuchandoRecordatoriosTexto || !currentUser) return;
    avatarEscuchandoRecordatoriosTexto = true;

    let ultimoPersonales = {};
    let ultimoGlobales = {};
    let ultimoAsignados = {};

    function recombinarYActualizar() {
        const personales = Object.keys(ultimoPersonales).map(id => ({ id, texto: ultimoPersonales[id].texto || '' }));
        const deAdmin = [
            ...Object.keys(ultimoGlobales).map(id => ({ id, texto: ultimoGlobales[id].texto || '', tipo: 'global' })),
            ...Object.keys(ultimoAsignados).map(id => ({ id, texto: ultimoAsignados[id].texto || '', tipo: 'asignado' }))
        ];
        avatarRecordatoriosTexto = { personales, deAdmin };

        if (!document.getElementById('avatarRecordatorioWidget') && (personales.length > 0 || deAdmin.length > 0)) {
            construirWidgetAvatar();
        }
        actualizarBadgeRecordatorios();
        if (avatarPanelRecordatoriosAbierto) renderPanelRecordatorios();
    }

    database.ref('recordatoriosTexto/personales/' + currentUser.uid).on('value', (snap) => {
        ultimoPersonales = snap.val() || {};
        recombinarYActualizar();
    });
    database.ref('recordatoriosTexto/globales').on('value', (snap) => {
        ultimoGlobales = snap.val() || {};
        recombinarYActualizar();
    });
    database.ref('recordatoriosTexto/asignados/' + currentUser.uid).on('value', (snap) => {
        ultimoAsignados = snap.val() || {};
        recombinarYActualizar();
    });
}

function detenerEscuchaRecordatoriosTexto() {
    if (currentUser) {
        database.ref('recordatoriosTexto/personales/' + currentUser.uid).off();
        database.ref('recordatoriosTexto/globales').off();
        database.ref('recordatoriosTexto/asignados/' + currentUser.uid).off();
    }
    avatarEscuchandoRecordatoriosTexto = false;
}

// Evita que texto libre escrito por un usuario (recordatorio propio) rompa
// el HTML del panel si trae &, <, > o comillas.
function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto == null ? '' : String(texto);
    return div.innerHTML;
}

// =============================================================
// 🧱 WIDGET FLOTANTE
// =============================================================
function construirWidgetAvatar() {
    if (document.getElementById('avatarRecordatorioWidget')) return;

    const wrap = document.createElement('div');
    wrap.id = 'avatarRecordatorioWidget';
    wrap.title = 'Recordatorios (arrástralo para moverlo)';
    wrap.style.cssText = 'position:fixed; right:18px; bottom:18px; z-index:9998; display:flex; flex-direction:column; align-items:center; cursor:pointer; touch-action:none;';
    wrap.innerHTML = `
        <div style="position:relative;">
            <canvas id="avatarCanvasWidget" style="max-width:130px; max-height:170px; display:block; filter: drop-shadow(0 8px 14px rgba(11,42,79,0.35)); transition: max-width 0.25s ease, max-height 0.25s ease;"></canvas>
            <div id="avatarIndicador" style="position:absolute; bottom:6px; right:6px; width:14px; height:14px; border-radius:50%; background:#22c55e; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.25);"></div>
            <button id="avatarBtnSilenciar" style="display:none; position:absolute; top:-4px; right:-4px; width:28px; height:28px; border-radius:50%; background:#dc2626; border:2px solid white; color:white; font-size:12px; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 3px 8px rgba(0,0,0,0.25);" aria-label="Silenciar">🔇</button>
            <button id="avatarBtnRecordatorios" style="position:absolute; bottom:2px; left:-8px; width:30px; height:30px; border-radius:50%; background:#1e40af; border:2px solid white; color:white; font-size:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 3px 8px rgba(0,0,0,0.25);" aria-label="Ver recordatorios">
                📝
                <span id="avatarBadgeRecordatorios" style="display:none; position:absolute; top:-5px; right:-5px; min-width:16px; height:16px; padding:0 3px; border-radius:8px; background:#dc2626; color:white; font-size:9px; font-weight:700; line-height:16px; text-align:center; border:1px solid white;"></span>
            </button>
            <div id="avatarPanelRecordatorios" style="display:none; position:absolute; right:100%; bottom:20px; margin-right:14px; width:270px; max-height:360px; overflow-y:auto; background:white; border-radius:14px; box-shadow:0 14px 30px rgba(11,42,79,0.25); padding:14px; cursor:default;">
                <div style="position:absolute; right:-7px; bottom:36px; width:14px; height:14px; background:white; transform:rotate(45deg);"></div>
            </div>
        </div>
    `;
    document.body.appendChild(wrap);

    avatarCanvasEl = document.getElementById('avatarCanvasWidget');
    avatarCtx = avatarCanvasEl.getContext('2d');

    avatarVideoEl = document.createElement('video');
    // NO silenciado: el video trae su propio audio grabado (el mensaje en
    // sí) — solo la parte visual se dibuja en el canvas de al lado.
    avatarVideoEl.playsInline = true;
    avatarVideoEl.style.cssText = 'position:absolute; width:1px; height:1px; opacity:0; pointer-events:none;';
    avatarVideoEl.addEventListener('ended', avatarSiguienteEnCola);
    document.body.appendChild(avatarVideoEl);

    // Reutiliza la precarga de arriba (probablemente ya lista) en vez de
    // arrancar una descarga nueva desde cero.
    avatarImgReposo = avatarImgReposoPrecarga;
    const dibujarFotoReposo = () => {
        avatarCanvasEl.width = avatarImgReposo.naturalWidth;
        avatarCanvasEl.height = avatarImgReposo.naturalHeight;
        dibujarAvatarConTransparencia(avatarImgReposo);
    };
    if (avatarImgReposo.complete && avatarImgReposo.naturalWidth > 0) {
        dibujarFotoReposo();
    } else {
        avatarImgReposo.addEventListener('load', dibujarFotoReposo, { once: true });
    }

    wrap.addEventListener('click', () => {
        if (avatarUltimoFueArrastre) return;
        if (!avatarReproduciendo) reproducirColaAvatar();
    });

    document.getElementById('avatarBtnSilenciar').addEventListener('click', (e) => {
        e.stopPropagation();
        detenerAvatar();
    });

    document.getElementById('avatarBtnRecordatorios').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanelRecordatorios();
    });

    document.getElementById('avatarPanelRecordatorios').addEventListener('click', (e) => {
        e.stopPropagation();
    });

    aplicarPosicionGuardadaAvatar(wrap);
    habilitarArrastreAvatar(wrap);
}

// =============================================================
// ✋ ARRASTRAR EL WIDGET A CUALQUIER PARTE DE LA PANTALLA
// =============================================================
let avatarUltimoFueArrastre = false;

function aplicarPosicionGuardadaAvatar(wrap) {
    if (!currentUser) return;
    try {
        const guardada = localStorage.getItem('avatar_posicion_' + currentUser.uid);
        if (!guardada) return;
        const { left, top } = JSON.parse(guardada);
        if (typeof left !== 'number' || typeof top !== 'number') return;

        // Recorta por si la pantalla actual es más chica que donde se dejó
        // la última vez (ej. se guardó en un monitor grande y ahora se abre
        // en un notebook).
        const anchoAprox = 130, altoAprox = 170;
        const leftClamp = Math.min(Math.max(0, left), Math.max(0, window.innerWidth - anchoAprox));
        const topClamp = Math.min(Math.max(0, top), Math.max(0, window.innerHeight - altoAprox));

        wrap.style.left = leftClamp + 'px';
        wrap.style.top = topClamp + 'px';
        wrap.style.right = 'auto';
        wrap.style.bottom = 'auto';
    } catch (e) { /* localStorage bloqueado o dato corrupto: se ignora, queda en la esquina de siempre */ }
}

function guardarPosicionAvatar(wrap) {
    if (!currentUser) return;
    const rect = wrap.getBoundingClientRect();
    try {
        localStorage.setItem('avatar_posicion_' + currentUser.uid, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
    } catch (e) { /* localStorage bloqueado: no se guarda, pero el arrastre en sí sigue funcionando */ }
}

function habilitarArrastreAvatar(wrap) {
    let arrastrando = false;
    let movioSuficiente = false;
    let offsetX = 0, offsetY = 0;
    let inicioClientX = 0, inicioClientY = 0;

    wrap.addEventListener('pointerdown', (e) => {
        // Los botones (silenciar / recordatorios) y el panel abierto tienen
        // su propio clic — no deben iniciar un arrastre.
        if (e.target.closest('button') || e.target.closest('#avatarPanelRecordatorios')) return;

        arrastrando = true;
        movioSuficiente = false;
        inicioClientX = e.clientX;
        inicioClientY = e.clientY;
        const rect = wrap.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        wrap.setPointerCapture(e.pointerId);
    });

    wrap.addEventListener('pointermove', (e) => {
        if (!arrastrando) return;

        if (!movioSuficiente) {
            // Umbral chico para no confundir un clic normal (mano un poco
            // temblorosa) con la intención de arrastrar.
            const distancia = Math.hypot(e.clientX - inicioClientX, e.clientY - inicioClientY);
            if (distancia < 5) return;
            movioSuficiente = true;
            wrap.style.cursor = 'grabbing';
            if (avatarPanelRecordatoriosAbierto) cerrarPanelRecordatorios();
        }

        const anchoWidget = wrap.offsetWidth || 130;
        const altoWidget = wrap.offsetHeight || 170;
        let nuevoLeft = e.clientX - offsetX;
        let nuevoTop = e.clientY - offsetY;
        nuevoLeft = Math.min(Math.max(0, nuevoLeft), window.innerWidth - anchoWidget);
        nuevoTop = Math.min(Math.max(0, nuevoTop), window.innerHeight - altoWidget);

        wrap.style.left = nuevoLeft + 'px';
        wrap.style.top = nuevoTop + 'px';
        wrap.style.right = 'auto';
        wrap.style.bottom = 'auto';
    });

    wrap.addEventListener('pointerup', (e) => {
        if (!arrastrando) return;
        arrastrando = false;
        wrap.style.cursor = 'pointer';
        if (movioSuficiente) {
            guardarPosicionAvatar(wrap);
            // Evita que el "click" que el navegador dispara justo después de
            // soltar interprete el arrastre como un clic (que reproduciría
            // el video sin querer).
            avatarUltimoFueArrastre = true;
            setTimeout(() => { avatarUltimoFueArrastre = false; }, 50);
        }
    });
}

function limpiarWidgetAvatar() {
    detenerAvatar();
    cerrarPanelRecordatorios();
    detenerEscuchaRecordatoriosTexto();
    const wrap = document.getElementById('avatarRecordatorioWidget');
    if (wrap) wrap.remove();
    if (avatarVideoEl) { avatarVideoEl.remove(); avatarVideoEl = null; }
    avatarCanvasEl = null;
    avatarCtx = null;
    avatarImgReposo = null;
    avatarColaMensajes = [];
    avatarIndiceCola = 0;
    avatarRecordatoriosTexto = { personales: [], deAdmin: [] };
}

// =============================================================
// 📝 PANEL DE RECORDATORIOS DE TEXTO
// =============================================================
function actualizarBadgeRecordatorios() {
    const badge = document.getElementById('avatarBadgeRecordatorios');
    if (!badge) return;
    const total = avatarRecordatoriosTexto.personales.length + avatarRecordatoriosTexto.deAdmin.length;
    if (total > 0) {
        badge.textContent = total > 9 ? '9+' : String(total);
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function togglePanelRecordatorios() {
    if (avatarPanelRecordatoriosAbierto) {
        cerrarPanelRecordatorios();
    } else {
        abrirPanelRecordatorios();
    }
}

// 'izquierda' (por defecto, como si el avatar estuviera en la esquina
// derecha) o 'derecha' -- se recalcula cada vez que se abre, según de qué
// lado del avatar hay espacio en la pantalla en ese momento (el avatar se
// puede arrastrar a cualquier parte — ver habilitarArrastreAvatar()).
let avatarPanelLado = 'izquierda';
const AVATAR_PANEL_ANCHO_APROX = 270 + 14;

function abrirPanelRecordatorios() {
    const panel = document.getElementById('avatarPanelRecordatorios');
    const wrap = document.getElementById('avatarRecordatorioWidget');
    if (!panel || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    avatarPanelLado = rect.left >= AVATAR_PANEL_ANCHO_APROX ? 'izquierda' : 'derecha';

    if (avatarPanelLado === 'izquierda') {
        panel.style.right = '100%';
        panel.style.left = 'auto';
        panel.style.marginRight = '14px';
        panel.style.marginLeft = '0';
    } else {
        panel.style.left = '100%';
        panel.style.right = 'auto';
        panel.style.marginLeft = '14px';
        panel.style.marginRight = '0';
    }

    renderPanelRecordatorios();
    panel.style.display = 'block';
    avatarPanelRecordatoriosAbierto = true;
    avatarActualizarTamano();
    setTimeout(() => document.addEventListener('click', cerrarPanelRecordatoriosPorClicAfuera), 0);
}

function cerrarPanelRecordatorios() {
    const panel = document.getElementById('avatarPanelRecordatorios');
    if (panel) panel.style.display = 'none';
    avatarPanelRecordatoriosAbierto = false;
    avatarActualizarTamano();
    document.removeEventListener('click', cerrarPanelRecordatoriosPorClicAfuera);
}

function cerrarPanelRecordatoriosPorClicAfuera() {
    cerrarPanelRecordatorios();
}

function renderPanelRecordatorios() {
    const panel = document.getElementById('avatarPanelRecordatorios');
    if (!panel) return;

    const personales = avatarRecordatoriosTexto.personales;
    const deAdmin = avatarRecordatoriosTexto.deAdmin;

    const estiloPuntero = avatarPanelLado === 'izquierda'
        ? 'position:absolute; right:-7px; bottom:36px; width:14px; height:14px; background:white; transform:rotate(45deg);'
        : 'position:absolute; left:-7px; bottom:36px; width:14px; height:14px; background:white; transform:rotate(45deg);';

    let html = `
        <div style="${estiloPuntero}"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:700; color:#0b2a4f; font-size:0.88rem;">📝 Recordatorios</span>
            <span id="avatarCerrarRecordatorios" style="cursor:pointer; color:#94a3b8; font-size:1rem; line-height:1;">✕</span>
        </div>
        <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.03em; margin-bottom:6px;">📌 Tuyos</div>
    `;

    if (personales.length === 0) {
        html += `<div style="font-size:0.78rem; color:#94a3b8; margin-bottom:10px;">No tienes recordatorios propios.</div>`;
    } else {
        personales.forEach(r => {
            html += `
                <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border-radius:8px; padding:7px 10px; margin-bottom:6px;">
                    <span style="flex-grow:1; font-size:0.78rem; color:#1e293b; word-break:break-word;">${escaparHtml(r.texto)}</span>
                    <span class="avatar-eliminar-personal" data-id="${r.id}" style="cursor:pointer; color:#dc2626; font-size:0.85rem; flex-shrink:0;">🗑️</span>
                </div>
            `;
        });
    }

    html += `
        <div style="display:flex; gap:6px; margin-bottom:16px;">
            <input type="text" id="avatarInputNuevoRecordatorio" placeholder="Agregar recordatorio..." style="flex-grow:1; min-width:0; border:1px solid #dbe3ee; border-radius:8px; padding:7px 9px; font-size:0.78rem; box-sizing:border-box;">
            <button id="avatarBtnAgregarRecordatorio" style="background:#1e40af; color:white; border:none; border-radius:8px; padding:0 12px; font-size:1rem; cursor:pointer; flex-shrink:0;">＋</button>
        </div>
        <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.03em; margin-bottom:6px;">🏢 De Administración</div>
    `;

    if (deAdmin.length === 0) {
        html += `<div style="font-size:0.78rem; color:#94a3b8;">No hay recordatorios de administración.</div>`;
    } else {
        deAdmin.forEach(r => {
            const etiqueta = r.tipo === 'global' ? '🌐' : '👤';
            html += `
                <div style="display:flex; align-items:flex-start; gap:8px; background:#fef9e7; border:1px dashed #eab308; border-radius:8px; padding:7px 10px; margin-bottom:6px;">
                    <span style="font-size:0.85rem; flex-shrink:0;">${etiqueta}</span>
                    <span style="flex-grow:1; font-size:0.78rem; color:#7c5e00; word-break:break-word;">${escaparHtml(r.texto)}</span>
                </div>
            `;
        });
    }

    panel.innerHTML = html;

    document.getElementById('avatarCerrarRecordatorios')?.addEventListener('click', (e) => {
        e.stopPropagation();
        cerrarPanelRecordatorios();
    });
    document.getElementById('avatarBtnAgregarRecordatorio')?.addEventListener('click', (e) => {
        e.stopPropagation();
        agregarRecordatorioPersonalDesdeInput();
    });
    document.getElementById('avatarInputNuevoRecordatorio')?.addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('avatarInputNuevoRecordatorio')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
            agregarRecordatorioPersonalDesdeInput();
        }
    });
    panel.querySelectorAll('.avatar-eliminar-personal').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            eliminarRecordatorioPersonal(el.dataset.id);
        });
    });
}

// No hace falta releer/rerenderizar a mano tras escribir: el listener en
// vivo de escucharRecordatoriosTexto() sobre esta misma ruta se dispara
// solo apenas Firebase confirma el cambio, y ya se encarga de actualizar
// la insignia y (si está abierto) el panel.
async function agregarRecordatorioPersonalDesdeInput() {
    const input = document.getElementById('avatarInputNuevoRecordatorio');
    const texto = (input?.value || '').trim();
    if (!texto || !currentUser) return;

    try {
        await database.ref('recordatoriosTexto/personales/' + currentUser.uid).push({
            texto: texto,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        if (input) input.value = '';
    } catch (error) {
        console.error('❌ Error al agregar recordatorio:', error);
        showModal({ title: '❌ Error', message: 'Error al agregar el recordatorio: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    }
}

async function eliminarRecordatorioPersonal(id) {
    if (!currentUser) return;
    try {
        await database.ref('recordatoriosTexto/personales/' + currentUser.uid + '/' + id).remove();
    } catch (error) {
        console.error('❌ Error al eliminar recordatorio:', error);
        showModal({ title: '❌ Error', message: 'Error al eliminar el recordatorio: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    }
}

// =============================================================
// ▶️ REPRODUCCIÓN (en cola, si hay más de un mensaje asignado)
// =============================================================
function reproducirColaAvatar() {
    if (avatarColaMensajes.length === 0) return;
    avatarIndiceCola = 0;
    avatarReproducirActual();
}

// El doble de tamaño mientras habla O mientras el panel de recordatorios
// está abierto (cualquiera de los dos, incluso los dos a la vez).
function avatarActualizarTamano() {
    if (!avatarCanvasEl) return;
    const grande = avatarReproduciendo || avatarPanelRecordatoriosAbierto;
    const tam = grande ? AVATAR_TAMANO_GRANDE : AVATAR_TAMANO_REPOSO;
    avatarCanvasEl.style.maxWidth = tam.w + 'px';
    avatarCanvasEl.style.maxHeight = tam.h + 'px';
}

function avatarReproducirActual() {
    if (avatarIndiceCola >= avatarColaMensajes.length) {
        detenerAvatar();
        return;
    }
    const mensaje = avatarColaMensajes[avatarIndiceCola];
    avatarVideoEl.src = mensaje.archivo;
    avatarVideoEl.currentTime = 0;
    const promesa = avatarVideoEl.play();
    if (promesa && promesa.catch) promesa.catch(() => {});

    avatarReproduciendo = true;
    const btnSilenciar = document.getElementById('avatarBtnSilenciar');
    if (btnSilenciar) btnSilenciar.style.display = 'flex';
    avatarActualizarTamano();
    avatarLoopVideo();
}

function avatarSiguienteEnCola() {
    avatarIndiceCola++;
    avatarReproducirActual();
}

function detenerAvatar() {
    if (avatarVideoEl) avatarVideoEl.pause();
    if (avatarRafId) cancelAnimationFrame(avatarRafId);
    avatarRafId = null;
    avatarReproduciendo = false;

    const btnSilenciar = document.getElementById('avatarBtnSilenciar');
    if (btnSilenciar) btnSilenciar.style.display = 'none';

    avatarActualizarTamano();
    // El canvas se deja mostrando el último cuadro del video (ya dibujado
    // por avatarLoopVideo, recortado) en vez de volver a la foto de reposo
    // aparte — mismo tamaño/calidad que mientras hablaba, sin "salto"
    // visual al terminar. La foto solo se usa una vez, para el estado
    // inicial antes de que se reproduzca cualquier video por primera vez.
}

function avatarLoopVideo() {
    if (!avatarVideoEl || avatarVideoEl.paused || avatarVideoEl.ended || !avatarCanvasEl) return;
    if (avatarVideoEl.videoWidth && avatarVideoEl.videoHeight) {
        avatarCanvasEl.width = avatarVideoEl.videoWidth;
        avatarCanvasEl.height = avatarVideoEl.videoHeight;
    }
    dibujarAvatarConTransparencia(avatarVideoEl);
    avatarRafId = requestAnimationFrame(avatarLoopVideo);
}

// =============================================================
// 🎨 RECORTE DE FONDO (flood-fill desde los bordes)
// =============================================================
function dibujarAvatarConTransparencia(source) {
    const ctx = avatarCtx;
    const w = avatarCanvasEl.width;
    const h = avatarCanvasEl.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);

    try {
        const maskW = Math.min(160, w);
        const maskH = Math.max(1, Math.round(h * (maskW / w)));

        if (!avatarMaskCanvas) {
            avatarMaskCanvas = document.createElement('canvas');
            avatarMaskCtx = avatarMaskCanvas.getContext('2d');
        }
        avatarMaskCanvas.width = maskW;
        avatarMaskCanvas.height = maskH;
        avatarMaskCtx.drawImage(source, 0, 0, maskW, maskH);

        const muestra = avatarMaskCtx.getImageData(0, 0, maskW, maskH);
        const md = muestra.data;
        const n = maskW * maskH;
        const UMBRAL = 60; // suma de (255-r)+(255-g)+(255-b): mientras más bajo, más estricto (blanco más puro)

        const esBlanco = (idx) => {
            const i = idx * 4;
            return (255 - md[i]) + (255 - md[i + 1]) + (255 - md[i + 2]) < UMBRAL;
        };

        const esFondo = new Uint8Array(n);
        const visitado = new Uint8Array(n);
        const pila = [];
        for (let x = 0; x < maskW; x++) pila.push(x, (maskH - 1) * maskW + x);
        for (let y = 0; y < maskH; y++) pila.push(y * maskW, y * maskW + (maskW - 1));

        while (pila.length) {
            const idx = pila.pop();
            if (idx < 0 || idx >= n || visitado[idx]) continue;
            visitado[idx] = 1;
            if (!esBlanco(idx)) continue;
            esFondo[idx] = 1;
            const x = idx % maskW, y = (idx / maskW) | 0;
            if (x > 0) pila.push(idx - 1);
            if (x < maskW - 1) pila.push(idx + 1);
            if (y > 0) pila.push(idx - maskW);
            if (y < maskH - 1) pila.push(idx + maskW);
        }

        const mascara = avatarMaskCtx.createImageData(maskW, maskH);
        for (let idx = 0; idx < n; idx++) {
            const i = idx * 4;
            mascara.data[i] = mascara.data[i + 1] = mascara.data[i + 2] = 255;
            mascara.data[i + 3] = esFondo[idx] ? 0 : 255;
        }
        avatarMaskCtx.putImageData(mascara, 0, 0);

        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(avatarMaskCanvas, 0, 0, w, h);
        ctx.restore();
    } catch (error) {
        // Canvas "tainted" (problema de CORS del origen del archivo): se deja
        // la imagen completa, sin recorte -- mejor mostrarla entera que nada.
    }
}

// =============================================================
// 🔐 ADMIN — ASIGNAR CADA MENSAJE A "TODOS" O A USUARIOS ESPECÍFICOS
// (tarjeta "🗣️ Mensajes del Avatar" en el Panel de Administración — js/09)
// =============================================================
async function cargarAsignacionesAvatar() {
    const contenedor = document.getElementById('avatarAsignacionesLista');
    if (!contenedor) return;

    try {
        const [snapAsignaciones, snapUsuarios] = await Promise.all([
            database.ref('avatarMensajes').once('value'),
            database.ref('usuarios').once('value')
        ]);
        const asignaciones = snapAsignaciones.val() || {};
        const usuariosData = snapUsuarios.val() || {};
        const listaUsuarios = Object.keys(usuariosData)
            .map(uid => ({ uid, email: usuariosData[uid].email || uid }))
            .sort((a, b) => a.email.localeCompare(b.email));

        let html = '';
        AVATAR_MENSAJES_DISPONIBLES.forEach(m => {
            const asign = asignaciones[m.id] || { paraTodos: false, usuarios: {} };
            html += `
                <div style="border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:10px;">
                    <div style="font-weight:600; font-size:0.9rem; margin-bottom:8px;">🎬 ${m.titulo}</div>
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; margin-bottom:6px;">
                        <input type="radio" name="avatarModo_${m.id}" class="avatar-modo-radio" data-mensaje="${m.id}" value="todos" ${asign.paraTodos ? 'checked' : ''}>
                        Para todos los usuarios
                    </label>
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer; margin-bottom:6px;">
                        <input type="radio" name="avatarModo_${m.id}" class="avatar-modo-radio" data-mensaje="${m.id}" value="especificos" ${!asign.paraTodos ? 'checked' : ''}>
                        Solo usuarios específicos
                    </label>
                    <div class="avatar-usuarios-especificos" data-mensaje="${m.id}" style="display:${asign.paraTodos ? 'none' : 'flex'}; flex-direction:column; gap:4px; max-height:160px; overflow-y:auto; background:#f8fafc; border-radius:8px; padding:8px; margin:4px 0 10px 26px;">
                        ${listaUsuarios.map(u => `
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.8rem; cursor:pointer;">
                                <input type="checkbox" class="avatar-usuario-chk" data-mensaje="${m.id}" data-uid="${u.uid}" ${asign.usuarios && asign.usuarios[u.uid] ? 'checked' : ''}> ${u.email}
                            </label>
                        `).join('') || '<span style="color:#94a3b8; font-size:0.78rem;">No hay usuarios registrados.</span>'}
                    </div>
                    <button class="btn-sm avatar-guardar-btn" data-mensaje="${m.id}" style="background:#1e40af; color:white; border:none; padding:6px 16px; border-radius:20px; cursor:pointer; font-size:0.8rem;">💾 Guardar</button>
                </div>
            `;
        });
        contenedor.innerHTML = html;

        contenedor.querySelectorAll('.avatar-modo-radio').forEach(radio => {
            radio.addEventListener('change', function () {
                const mensajeId = this.dataset.mensaje;
                const wrapEspecificos = contenedor.querySelector(`.avatar-usuarios-especificos[data-mensaje="${mensajeId}"]`);
                if (wrapEspecificos) wrapEspecificos.style.display = this.value === 'especificos' ? 'flex' : 'none';
            });
        });

        contenedor.querySelectorAll('.avatar-guardar-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                guardarAsignacionAvatar(this.dataset.mensaje, contenedor);
            });
        });
    } catch (error) {
        console.error('❌ Error al cargar asignaciones del avatar:', error);
        contenedor.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">❌ Error al cargar.</p>`;
    }
}

async function guardarAsignacionAvatar(mensajeId, contenedor) {
    if (!esSuperAdministrador()) {
        showModal({ title: '⛔ Acceso denegado', message: 'Solo el superadministrador puede asignar mensajes del avatar.', icon: '⛔', confirmText: 'Aceptar' });
        return;
    }

    const radioTodos = contenedor.querySelector(`input[name="avatarModo_${mensajeId}"][value="todos"]`);
    const paraTodos = !!(radioTodos && radioTodos.checked);
    const datos = { paraTodos };

    if (paraTodos) {
        datos.usuarios = null;
    } else {
        const usuariosSeleccionados = {};
        contenedor.querySelectorAll(`.avatar-usuario-chk[data-mensaje="${mensajeId}"]:checked`).forEach(chk => {
            usuariosSeleccionados[chk.dataset.uid] = true;
        });
        datos.usuarios = Object.keys(usuariosSeleccionados).length > 0 ? usuariosSeleccionados : null;
    }

    try {
        await database.ref('avatarMensajes/' + mensajeId).set(datos);
        showModal({ title: '✅ Guardado', message: 'Asignación del mensaje guardada correctamente.', icon: '✅', confirmText: 'Aceptar' });
    } catch (error) {
        console.error('❌ Error al guardar asignación del avatar:', error);
        showModal({ title: '❌ Error', message: 'Error al guardar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    }
}

// =============================================================
// 🔐 ADMIN — RECORDATORIOS DE TEXTO (🌐 para todos / 👤 para un usuario)
// (tarjeta "📝 Recordatorios de Texto" en el Panel de Administración — js/09)
// =============================================================
async function cargarRecordatoriosTextoAdmin() {
    const contenedor = document.getElementById('recordatoriosTextoAdminLista');
    if (!contenedor) return;

    try {
        const [snapGlobales, snapAsignados, snapUsuarios] = await Promise.all([
            database.ref('recordatoriosTexto/globales').once('value'),
            database.ref('recordatoriosTexto/asignados').once('value'),
            database.ref('usuarios').once('value')
        ]);
        const globales = snapGlobales.val() || {};
        const asignadosPorUsuario = snapAsignados.val() || {};
        const usuariosData = snapUsuarios.val() || {};
        const listaUsuarios = Object.keys(usuariosData)
            .map(uid => ({ uid, email: usuariosData[uid].email || uid }))
            .sort((a, b) => a.email.localeCompare(b.email));

        let html = `
            <div style="margin-bottom:18px;">
                <div style="font-weight:600; font-size:0.85rem; margin-bottom:8px;">🌐 Para todos</div>
                <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px;">
        `;
        const idsGlobales = Object.keys(globales);
        if (idsGlobales.length === 0) {
            html += `<span style="color:#94a3b8; font-size:0.78rem;">Ninguno.</span>`;
        } else {
            idsGlobales.forEach(id => {
                html += `
                    <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border-radius:8px; padding:6px 10px;">
                        <span style="flex-grow:1; font-size:0.8rem;">${escaparHtml(globales[id].texto)}</span>
                        <button class="rec-texto-eliminar-global" data-id="${id}" style="background:transparent; border:none; color:#dc2626; cursor:pointer; font-size:0.9rem;">🗑️</button>
                    </div>
                `;
            });
        }
        html += `
                </div>
                <div style="display:flex; gap:6px;">
                    <input type="text" id="recTextoNuevoGlobal" placeholder="Nuevo recordatorio para todos..." style="flex-grow:1; border:1px solid #e2e8f0; border-radius:8px; padding:6px 10px; font-size:0.8rem; box-sizing:border-box;">
                    <button id="recTextoAgregarGlobal" style="background:#1e40af; color:white; border:none; border-radius:8px; padding:0 14px; cursor:pointer;">＋</button>
                </div>
            </div>

            <div>
                <div style="font-weight:600; font-size:0.85rem; margin-bottom:8px;">👤 Para un usuario específico</div>
                <div style="display:flex; gap:6px; margin-bottom:8px;">
                    <select id="recTextoUsuarioSelect" style="flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:6px 8px; font-size:0.8rem;">
                        ${listaUsuarios.map(u => `<option value="${u.uid}">${escaparHtml(u.email)}</option>`).join('')}
                    </select>
                </div>
                <div style="display:flex; gap:6px; margin-bottom:10px;">
                    <input type="text" id="recTextoNuevoAsignado" placeholder="Nuevo recordatorio para ese usuario..." style="flex-grow:1; border:1px solid #e2e8f0; border-radius:8px; padding:6px 10px; font-size:0.8rem; box-sizing:border-box;">
                    <button id="recTextoAgregarAsignado" style="background:#1e40af; color:white; border:none; border-radius:8px; padding:0 14px; cursor:pointer;">＋</button>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
        `;

        let hayAsignados = false;
        Object.keys(asignadosPorUsuario).forEach(uid => {
            const email = (usuariosData[uid] && usuariosData[uid].email) || uid;
            Object.keys(asignadosPorUsuario[uid] || {}).forEach(id => {
                hayAsignados = true;
                html += `
                    <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border-radius:8px; padding:6px 10px;">
                        <span style="flex-grow:1; font-size:0.8rem;"><strong>${escaparHtml(email)}:</strong> ${escaparHtml(asignadosPorUsuario[uid][id].texto)}</span>
                        <button class="rec-texto-eliminar-asignado" data-uid="${uid}" data-id="${id}" style="background:transparent; border:none; color:#dc2626; cursor:pointer; font-size:0.9rem;">🗑️</button>
                    </div>
                `;
            });
        });
        if (!hayAsignados) html += `<span style="color:#94a3b8; font-size:0.78rem;">Ninguno.</span>`;
        html += `</div></div>`;

        contenedor.innerHTML = html;

        document.getElementById('recTextoAgregarGlobal')?.addEventListener('click', agregarRecordatorioTextoGlobal);
        document.getElementById('recTextoAgregarAsignado')?.addEventListener('click', agregarRecordatorioTextoAsignado);
        contenedor.querySelectorAll('.rec-texto-eliminar-global').forEach(btn => {
            btn.addEventListener('click', function () { eliminarRecordatorioTextoGlobal(this.dataset.id); });
        });
        contenedor.querySelectorAll('.rec-texto-eliminar-asignado').forEach(btn => {
            btn.addEventListener('click', function () { eliminarRecordatorioTextoAsignado(this.dataset.uid, this.dataset.id); });
        });
    } catch (error) {
        console.error('❌ Error al cargar recordatorios de texto:', error);
        contenedor.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">❌ Error al cargar.</p>`;
    }
}

async function agregarRecordatorioTextoGlobal() {
    if (!esSuperAdministrador()) return;
    const input = document.getElementById('recTextoNuevoGlobal');
    const texto = (input?.value || '').trim();
    if (!texto) return;
    try {
        await database.ref('recordatoriosTexto/globales').push({
            texto: texto,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            creadoPor: currentUserEmail || 'Sistema'
        });
        cargarRecordatoriosTextoAdmin();
    } catch (error) {
        console.error('❌ Error al agregar recordatorio global:', error);
        showModal({ title: '❌ Error', message: 'Error al agregar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    }
}

async function eliminarRecordatorioTextoGlobal(id) {
    if (!esSuperAdministrador()) return;
    const confirmado = await showModal({
        title: '🗑️ Eliminar recordatorio',
        message: '¿Eliminar este recordatorio para todos?',
        icon: '🗑️', confirmText: 'Sí, eliminar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;
    try {
        await database.ref('recordatoriosTexto/globales/' + id).remove();
        cargarRecordatoriosTextoAdmin();
    } catch (error) {
        console.error('❌ Error al eliminar recordatorio global:', error);
        showModal({ title: '❌ Error', message: 'Error al eliminar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    }
}

async function agregarRecordatorioTextoAsignado() {
    if (!esSuperAdministrador()) return;
    const uid = document.getElementById('recTextoUsuarioSelect')?.value;
    const input = document.getElementById('recTextoNuevoAsignado');
    const texto = (input?.value || '').trim();
    if (!uid || !texto) return;
    try {
        await database.ref('recordatoriosTexto/asignados/' + uid).push({
            texto: texto,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            creadoPor: currentUserEmail || 'Sistema'
        });
        cargarRecordatoriosTextoAdmin();
    } catch (error) {
        console.error('❌ Error al agregar recordatorio asignado:', error);
        showModal({ title: '❌ Error', message: 'Error al agregar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    }
}

async function eliminarRecordatorioTextoAsignado(uid, id) {
    if (!esSuperAdministrador()) return;
    const confirmado = await showModal({
        title: '🗑️ Eliminar recordatorio',
        message: '¿Eliminar este recordatorio asignado?',
        icon: '🗑️', confirmText: 'Sí, eliminar', cancelText: 'Cancelar', type: 'danger'
    });
    if (!confirmado) return;
    try {
        await database.ref('recordatoriosTexto/asignados/' + uid + '/' + id).remove();
        cargarRecordatoriosTextoAdmin();
    } catch (error) {
        console.error('❌ Error al eliminar recordatorio asignado:', error);
        showModal({ title: '❌ Error', message: 'Error al eliminar: ' + error.message, icon: '❌', confirmText: 'Aceptar' });
    }
}
