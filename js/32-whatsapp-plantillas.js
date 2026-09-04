// =============================================================
// 💬 WHATSAPP — PLANTILLAS + ENVÍO POR "CLICK TO CHAT" (wa.me)
// =============================================================
// No hay forma gratuita de mandar WhatsApp automáticamente desde el
// navegador sin backend ni cuenta de negocio verificada en Meta — la única
// opción sin servidor es abrir un enlace https://wa.me/<numero>?text=... que
// deja el mensaje YA ESCRITO en WhatsApp (app o web); la persona igual tiene
// que apretar "Enviar" ahí. Por eso el check de "enviado" en la tabla se
// confirma a mano después de volver de WhatsApp — la app no tiene forma de
// saber si el mensaje realmente salió.
//
// Las plantillas (título + mensaje con variables) se administran desde el
// Panel de Administrador (solo superadministrador), mismo patrón que
// "Médicos por Especialidad" en js/12-admin-desplegables.js.
// =============================================================

const WHATSAPP_PLANTILLAS_DB_PATH = 'configuracion/whatsappPlantillas';

let whatsappPlantillasCache = [];

// Referencia directa a la pestaña/ventana de WhatsApp Web ya abierta por
// este mismo botón. window.open(url, 'nombreFijo') en teoría reutiliza una
// pestaña con ese mismo nombre — pero algunos sitios (WhatsApp entre ellos)
// mandan cabeceras de aislamiento (Cross-Origin-Opener-Policy) que "cortan"
// esa relación por nombre apenas cargan, así que el navegador ya no la
// encuentra en el siguiente clic y abre una pestaña nueva igual. Guardar la
// referencia del objeto window acá (no solo el nombre) y navegarla
// directamente con .location.href es más confiable.
let whatsappWebWindowRef = null;

async function cargarWhatsappPlantillasCache() {
    try {
        const snapshot = await database.ref(WHATSAPP_PLANTILLAS_DB_PATH).once('value');
        const data = snapshot.val() || {};
        whatsappPlantillasCache = Object.keys(data).map(id => ({ id, ...data[id] }));
    } catch (error) {
        console.error('❌ Error al cargar plantillas de WhatsApp:', error);
        whatsappPlantillasCache = [];
    }
}

// -------------------------------------------------------------
// 🔤 VARIABLES DISPONIBLES EN EL TEXTO DE LA PLANTILLA
// -------------------------------------------------------------
const WHATSAPP_VARIABLES_DISPONIBLES = [
    { clave: '{nombre}', desc: 'Nombre del paciente' },
    { clave: '{fecha}', desc: 'Fecha de la cirugía' },
    { clave: '{hora}', desc: 'Hora de entrada' },
    { clave: '{especialidad}', desc: 'Especialidad' },
    { clave: '{cirujano}', desc: 'Cirujano' },
    { clave: '{pabellon}', desc: 'Pabellón' },
    { clave: '{indicaciones_anestesiologo}', desc: 'Indicaciones del anestesiólogo (campo "Indicaciones Anestesiólogo" en la ficha de Lista de Espera; vacío si el paciente no tiene ficha o el campo está vacío)' }
];

// `pacienteLE` es el registro de Lista de Espera ya encontrado (o null) por
// buscarPacienteListaEsperaParaFila() — se reutiliza el mismo, no se vuelve
// a buscar acá.
function construirMensajeWhatsApp(mensajePlantilla, fila, pabName, pacienteLE) {
    return (mensajePlantilla || '')
        .replace(/\{nombre\}/g, fila['Nombre_Paciente'] || '')
        .replace(/\{fecha\}/g, fila['FECHA'] || '')
        .replace(/\{hora\}/g, fila['Hora_de_entrada'] || '')
        .replace(/\{especialidad\}/g, fila['Especialidad'] || '')
        .replace(/\{cirujano\}/g, fila['Cirujano'] || '')
        .replace(/\{pabellon\}/g, pabName || '')
        .replace(/\{indicaciones_anestesiologo\}/g, (pacienteLE && pacienteLE.indicacionesAnest) || '');
}

// -------------------------------------------------------------
// 📞 BUSCAR TELÉFONO DEL PACIENTE EN LISTA DE ESPERA
// -------------------------------------------------------------
// La Tabla Quirúrgica no guarda teléfono propio. Se busca primero por el
// vínculo directo (fila['LE_PacienteKey'], si la fila vino de "Cargar a la
// Tabla" — ver js/31), y si no hay vínculo, por coincidencia de RUT contra
// el array `patients` (ya cargado en memoria por el módulo de Lista de
// Espera — js/23/js/30 — no requiere una lectura nueva a Firebase).
function limpiarRutParaComparar(rut) {
    return (rut || '').toString().replace(/[.\-]/g, '').toUpperCase().trim();
}

function buscarPacienteListaEsperaParaFila(fila) {
    if (typeof patients === 'undefined' || !Array.isArray(patients)) return null;

    if (fila['LE_PacienteKey']) {
        const porVinculo = patients.find(p => p.firebaseKey === fila['LE_PacienteKey']);
        if (porVinculo) return porVinculo;
    }

    const rutFila = limpiarRutParaComparar(fila['RUT']);
    if (!rutFila) return null;

    return patients.find(p => limpiarRutParaComparar(p.rut) === rutFila) || null;
}

// -------------------------------------------------------------
// 🪟 MODAL 1: resolver el teléfono (buscado o pedido a mano)
// -------------------------------------------------------------
async function mostrarModalWhatsApp(rowKey) {
    // 🔘 Red de seguridad además de ocultar el botón 💬 (ver js/07-render-tabla-dia.js).
    if (!usuarioTieneAccesoSeccion('registro_whatsapp')) return;

    const parts = rowKey.split('-').map(Number);
    if (parts.length !== 4) return;
    const [s, d, p, f] = parts;
    const semana = semanas[s];
    const day = semana && semana[d];
    const pabName = PABS[p];
    const rows = day && pabName && day.pabs[pabName];
    const fila = rows && rows[f];
    if (!fila) return;

    if (!whatsappPlantillasCache.length) {
        showModal({
            title: 'ℹ️ Sin plantillas',
            message: 'Todavía no hay plantillas de WhatsApp creadas.<br>Un superadministrador puede agregarlas desde el Panel de Administrador → "💬 Plantillas de WhatsApp".',
            icon: 'ℹ️',
            confirmText: 'Aceptar'
        });
        return;
    }

    const pacienteLE = buscarPacienteListaEsperaParaFila(fila);
    const numerosGuardados = leObtenerContactosPaciente(pacienteLE);

    let telefono;
    if (numerosGuardados.length === 0) {
        telefono = await pedirTelefonoManual(fila, pacienteLE);
        if (!telefono) return; // canceló
    } else if (numerosGuardados.length === 1) {
        telefono = numerosGuardados[0];
    } else {
        telefono = await pedirNumeroWhatsApp(numerosGuardados, fila, pacienteLE);
        if (!telefono) return; // canceló
    }

    await mostrarModalElegirPlantilla(rowKey, fila, pabName, telefono, pacienteLE);
}

// -------------------------------------------------------------
// 🪟 MODAL 0 (solo si hay 2+ números guardados): elegir a cuál enviar
// -------------------------------------------------------------
function pedirNumeroWhatsApp(numeros, fila, pacienteLE) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width: 420px;">
                <span class="modal-icon">📱</span>
                <div class="modal-title">Elegir número</div>
                <div class="modal-message" style="margin-bottom:12px;">
                    <strong>${(pacienteLE && pacienteLE.nombreApellido) || fila['Nombre_Paciente'] || 'Este paciente'}</strong> tiene más de un número guardado. ¿A cuál enviar el mensaje?
                </div>
                <div id="whatsappListaNumeros" style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px;">
                    ${numeros.map((num, i) => `
                        <button class="whatsapp-numero-btn" data-idx="${i}" style="text-align:left; padding:10px 14px; border:2px solid #e2e8f0; border-radius:10px; background:#f8fafc; cursor:pointer; font-size:0.9rem; font-weight:600; color:#1e293b;">
                            📞 ${num}
                        </button>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="whatsappNumeroCancelar">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        function cerrar(valor) {
            overlay.remove();
            resolve(valor);
        }

        overlay.querySelectorAll('.whatsapp-numero-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                cerrar(numeros[parseInt(this.dataset.idx, 10)]);
            });
        });
        overlay.querySelector('#whatsappNumeroCancelar').addEventListener('click', () => cerrar(null));
        overlay.addEventListener('click', function(e) { if (e.target === overlay) cerrar(null); });
    });
}

function pedirTelefonoManual(fila, pacienteLE) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width: 420px;">
                <span class="modal-icon">📞</span>
                <div class="modal-title">Ingresar teléfono</div>
                <div class="modal-message">
                    ${pacienteLE
                        ? `Encontré a <strong>${pacienteLE.nombreApellido || fila['Nombre_Paciente'] || 'este paciente'}</strong> en Lista de Espera, pero no tiene teléfono guardado.`
                        : `No encontré a <strong>${fila['Nombre_Paciente'] || 'este paciente'}</strong> en Lista de Espera. Ingresa el número al que se enviará el mensaje.`}
                </div>
                <input type="tel" id="whatsappTelefonoManual" placeholder="Ej: +56 9 1234 5678" style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.95rem; margin-bottom:10px; box-sizing:border-box;">
                ${pacienteLE ? `
                <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem; color:#475569; margin-bottom:16px;">
                    <input type="checkbox" id="whatsappGuardarEnLE" checked>
                    Guardar este número en la ficha de Lista de Espera
                </label>` : '<div style="margin-bottom:16px;"></div>'}
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="whatsappTelCancelar">Cancelar</button>
                    <button class="modal-btn modal-btn-success" id="whatsappTelConfirmar">✅ Continuar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = overlay.querySelector('#whatsappTelefonoManual');
        setTimeout(() => input.focus(), 100);

        function cerrar(valor) {
            overlay.remove();
            resolve(valor);
        }

        overlay.querySelector('#whatsappTelConfirmar').addEventListener('click', async function() {
            const valor = input.value.trim();
            if (!valor) {
                input.style.borderColor = '#ef4444';
                return;
            }
            const chkGuardar = overlay.querySelector('#whatsappGuardarEnLE');
            if (pacienteLE && chkGuardar && chkGuardar.checked) {
                try {
                    // Este modal solo se abre cuando el paciente no tenía
                    // NINGÚN número guardado (ver mostrarModalWhatsApp), así
                    // que "contactos" también parte vacío — se deja como el
                    // primer y único número, igual que nContacto.
                    await database.ref('patients/' + pacienteLE.firebaseKey).update({ nContacto: valor, contactos: [valor] });
                } catch (error) {
                    console.error('❌ Error al guardar teléfono en Lista de Espera:', error);
                }
            }
            cerrar(valor);
        });
        overlay.querySelector('#whatsappTelCancelar').addEventListener('click', () => cerrar(null));
        overlay.addEventListener('click', function(e) { if (e.target === overlay) cerrar(null); });
    });
}

// -------------------------------------------------------------
// 🪟 MODAL 2: elegir plantilla (muestra solo los TÍTULOS)
// -------------------------------------------------------------
async function mostrarModalElegirPlantilla(rowKey, fila, pabName, telefono, pacienteLE) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width: 460px;">
            <span class="modal-icon">💬</span>
            <div class="modal-title">Elegir mensaje para ${fila['Nombre_Paciente'] || 'el paciente'}</div>
            <div class="modal-message" style="margin-bottom:12px;">Selecciona qué plantilla quieres enviar:</div>
            <div id="whatsappListaPlantillas" style="display:flex; flex-direction:column; gap:6px; max-height:260px; overflow-y:auto; margin-bottom:16px;">
                ${whatsappPlantillasCache.map(pl => `
                    <button class="whatsapp-plantilla-btn" data-id="${pl.id}" style="text-align:left; padding:10px 14px; border:2px solid #e2e8f0; border-radius:10px; background:#f8fafc; cursor:pointer; font-size:0.88rem; font-weight:600; color:#1e293b;">
                        ${pl.titulo}
                    </button>
                `).join('')}
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-cancel" id="whatsappPlantillaCancelar">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    function cerrar() { overlay.remove(); }

    overlay.querySelectorAll('.whatsapp-plantilla-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const plantilla = whatsappPlantillasCache.find(pl => pl.id === this.dataset.id);
            if (!plantilla) return;
            cerrar();
            await abrirWhatsAppYConfirmar(rowKey, fila, pabName, telefono, plantilla, pacienteLE);
        });
    });

    overlay.querySelector('#whatsappPlantillaCancelar').addEventListener('click', cerrar);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) cerrar(); });
}

// -------------------------------------------------------------
// ✅ ABRIR WHATSAPP WEB Y CONFIRMAR ENVÍO
// -------------------------------------------------------------
// https://web.whatsapp.com/send?phone=...&text=... en vez de wa.me: en
// computadores de escritorio (el caso de uso acá) abre WhatsApp Web
// directo con el chat y el mensaje listos, sin la página intermedia de
// wa.me ("Continuar al chat"). El teléfono va solo con dígitos (código de
// país incluido, sin "+" ni espacios).
//
// WhatsApp Web no permite tener la sesión abierta en 2 pestañas al mismo
// tiempo (la pestaña más nueva le "roba" la sesión a la anterior, que queda
// mostrando "usado en otro lugar"). Por eso window.open() acá usa un
// NOMBRE DE VENTANA FIJO ('whatsappWebTab') en vez de '_blank': si ya hay
// una pestaña abierta con ese mismo nombre (la que abrió este mismo botón
// antes), el navegador la REUTILIZA y solo la navega al nuevo chat, en vez
// de abrir una pestaña nueva — así nunca hay dos pestañas de WhatsApp Web
// compitiendo por la sesión.
async function abrirWhatsAppYConfirmar(rowKey, fila, pabName, telefono, plantilla, pacienteLE) {
    const mensaje = construirMensajeWhatsApp(plantilla.mensaje, fila, pabName, pacienteLE);
    const telefonoLimpio = telefono.toString().replace(/[^0-9]/g, '');
    const url = `https://web.whatsapp.com/send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}`;

    // Si ya tenemos una pestaña abierta por nosotros (y sigue abierta), la
    // navegamos directo en vez de abrir una nueva. Si eso falla (el sitio
    // bloqueó la navegación cruzada por su política de aislamiento) o no
    // hay ninguna pestaña todavía, se abre una nueva y se guarda su
    // referencia para el próximo envío.
    let reutilizada = false;
    if (whatsappWebWindowRef && !whatsappWebWindowRef.closed) {
        try {
            whatsappWebWindowRef.location.href = url;
            whatsappWebWindowRef.focus();
            reutilizada = true;
        } catch (error) {
            console.warn('⚠️ No se pudo reutilizar la pestaña de WhatsApp Web, se abrirá una nueva:', error);
        }
    }
    if (!reutilizada) {
        whatsappWebWindowRef = window.open(url, 'whatsappWebTab');
    }

    const confirmado = await showModal({
        title: '✅ ¿Se envió el mensaje?',
        message: 'Se abrió WhatsApp con el mensaje listo.<br><br>Una vez que lo hayas enviado ahí, confirma acá para marcar esta fila como contactada.',
        icon: '💬',
        confirmText: '✅ Sí, se envió',
        cancelText: 'Todavía no',
        type: 'success'
    });

    if (!confirmado) return;

    fila['WhatsApp_Enviado'] = true;
    fila['WhatsApp_UltimoEnvio'] = {
        plantillaTitulo: plantilla.titulo,
        fecha: new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL'),
        usuario: currentUserEmail || 'Sistema'
    };

    try {
        await guardarFilaEnFirebase(rowKey, fila);
    } catch (error) {
        console.error('❌ Error al guardar el estado de envío de WhatsApp:', error);
    }

    // 🩺 Si el paciente está en Lista de Espera, además del ✅ en la fila
    // de la Tabla (tooltip del botón 💬), queda una entrada en SU historial
    // — visible desde la ficha del paciente en Lista de Espera, igual que
    // "Cargado a la Tabla" o "Actualizado desde la Tabla".
    if (pacienteLE && pacienteLE.firebaseKey) {
        try {
            await database.ref('patients/' + pacienteLE.firebaseKey + '/historial').push({
                fecha: new Date().toISOString(),
                usuario: currentUserEmail || 'Sistema',
                accion: 'WhatsApp enviado',
                descripcion: `Se envió el mensaje "${plantilla.titulo}" por WhatsApp desde la Tabla Quirúrgica.`,
                cambios: null
            });
        } catch (error) {
            console.error('❌ Error al registrar el envío de WhatsApp en el historial de Lista de Espera:', error);
        }
    }

    renderWeekView();
}

// =============================================================
// ⚙️ PANEL DE ADMINISTRADOR — GESTIÓN DE PLANTILLAS (solo superadmin)
// =============================================================
// Edición IN-LINE dentro de la misma tarjeta (no en un modal aparte, que
// quedaba muy chico para mensajes largos como el de indicaciones
// preoperatorias) — waPlantillaEditandoId guarda cuál tarjeta está en modo
// edición ahora mismo; null = ninguna.
let waPlantillaEditandoId = null;

async function cargarPlantillasWhatsAppAdmin() {
    const contenedor = document.getElementById('whatsappPlantillasLista');
    if (!contenedor) return;

    try {
        const snapshot = await database.ref(WHATSAPP_PLANTILLAS_DB_PATH).once('value');
        const data = snapshot.val() || {};
        whatsappPlantillasCache = Object.keys(data).map(id => ({ id, ...data[id] }));
        waPlantillaEditandoId = null;
        renderizarListaPlantillasWhatsApp();
    } catch (error) {
        console.error('❌ Error al cargar plantillas de WhatsApp:', error);
        contenedor.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">Error al cargar plantillas.</p>`;
    }
}

// Redibuja la lista a partir de whatsappPlantillasCache (ya en memoria, sin
// volver a leer Firebase) — se usa al entrar/salir de modo edición, para
// que sea instantáneo.
function renderizarListaPlantillasWhatsApp() {
    const contenedor = document.getElementById('whatsappPlantillasLista');
    if (!contenedor) return;

    let html = `
        <div style="font-size:0.72rem; color:#64748b; margin-bottom:10px;">
            Variables disponibles en el mensaje: ${WHATSAPP_VARIABLES_DISPONIBLES.map(v => `<code style="background:#f1f5f9; padding:1px 5px; border-radius:4px;">${v.clave}</code>`).join(' ')}
        </div>
    `;

    if (!whatsappPlantillasCache.length) {
        html += `<p style="color:#94a3b8; text-align:center; padding:12px;">Todavía no hay plantillas creadas.</p>`;
    } else {
        whatsappPlantillasCache.forEach(pl => {
            if (pl.id === waPlantillaEditandoId) {
                html += `
                    <div style="background:white; border-radius:8px; border:2px solid #0b2a4f; padding:12px; margin-bottom:8px;">
                        <input type="text" class="wa-editar-titulo" data-id="${pl.id}" value="${(pl.titulo || '').replace(/"/g, '&quot;')}" style="width:100%; padding:8px 10px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.85rem; font-weight:700; margin-bottom:8px; box-sizing:border-box;">
                        <textarea class="wa-editar-mensaje" data-id="${pl.id}" rows="12" style="width:100%; padding:8px 10px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.82rem; margin-bottom:10px; box-sizing:border-box; font-family:inherit; resize:vertical;">${pl.mensaje || ''}</textarea>
                        <div style="display:flex; gap:6px; justify-content:flex-end;">
                            <button class="btn-cancelar-editar-wa" data-id="${pl.id}" style="background:#f1f5f9; color:#334155; border:1px solid #d1d9e6; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:0.75rem;">Cancelar</button>
                            <button class="btn-guardar-editar-wa" data-id="${pl.id}" style="background:#0b2a4f; color:white; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:600;">✅ Guardar</button>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; padding:10px 12px; margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                            <strong style="font-size:0.85rem;">${pl.titulo}</strong>
                            <div style="display:flex; gap:4px; flex-shrink:0;">
                                <button class="btn-editar-plantilla-wa" data-id="${pl.id}" style="background:#0b2a4f; color:white; border:none; padding:3px 10px; border-radius:4px; cursor:pointer; font-size:0.7rem;">✏️ Editar</button>
                                <button class="btn-eliminar-plantilla-wa" data-id="${pl.id}" style="background:#ef4444; color:white; border:none; padding:3px 10px; border-radius:4px; cursor:pointer; font-size:0.7rem;">🗑️</button>
                            </div>
                        </div>
                        <div style="font-size:0.78rem; color:#475569; margin-top:6px; white-space:pre-wrap;">${pl.mensaje}</div>
                    </div>
                `;
            }
        });
    }

    html += `
        <div style="border-top:1px solid #e2e8f0; padding-top:12px; margin-top:8px;">
            <input type="text" id="waNuevaPlantillaTitulo" placeholder="Título (ej: Recordatorio de cirugía)" style="width:100%; padding:6px 10px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem; margin-bottom:6px; box-sizing:border-box;">
            <textarea id="waNuevaPlantillaMensaje" placeholder="Mensaje... (puedes usar {nombre}, {fecha}, {hora}, {especialidad}, {cirujano}, {pabellon}, {indicaciones_anestesiologo})" rows="3" style="width:100%; padding:6px 10px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem; margin-bottom:8px; box-sizing:border-box; font-family:inherit;"></textarea>
            <button id="waBtnAgregarPlantilla" style="background:#1e293b; color:white; border:none; padding:6px 16px; border-radius:20px; cursor:pointer; font-size:0.75rem;">+ Agregar Plantilla</button>
        </div>
    `;

    contenedor.innerHTML = html;

    contenedor.querySelectorAll('.btn-editar-plantilla-wa').forEach(btn => {
        btn.addEventListener('click', function() {
            waPlantillaEditandoId = this.dataset.id;
            renderizarListaPlantillasWhatsApp();
        });
    });
    contenedor.querySelectorAll('.btn-cancelar-editar-wa').forEach(btn => {
        btn.addEventListener('click', function() {
            waPlantillaEditandoId = null;
            renderizarListaPlantillasWhatsApp();
        });
    });
    contenedor.querySelectorAll('.btn-guardar-editar-wa').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            const titulo = contenedor.querySelector(`.wa-editar-titulo[data-id="${id}"]`).value.trim();
            const mensaje = contenedor.querySelector(`.wa-editar-mensaje[data-id="${id}"]`).value.trim();
            if (!titulo || !mensaje) {
                showModal({ title: '⚠️ Faltan datos', message: 'Completa el título y el mensaje.', icon: '⚠️', confirmText: 'Aceptar' });
                return;
            }
            await editarPlantillaWhatsApp(id, titulo, mensaje);
        });
    });
    contenedor.querySelectorAll('.btn-eliminar-plantilla-wa').forEach(btn => {
        btn.addEventListener('click', function() { eliminarPlantillaWhatsApp(this.dataset.id); });
    });
    contenedor.querySelector('#waBtnAgregarPlantilla').addEventListener('click', async function() {
        const titulo = document.getElementById('waNuevaPlantillaTitulo').value.trim();
        const mensaje = document.getElementById('waNuevaPlantillaMensaje').value.trim();
        if (!titulo || !mensaje) {
            showModal({ title: '⚠️ Faltan datos', message: 'Completa el título y el mensaje.', icon: '⚠️', confirmText: 'Aceptar' });
            return;
        }
        await agregarPlantillaWhatsApp(titulo, mensaje);
    });
}

async function agregarPlantillaWhatsApp(titulo, mensaje) {
    if (!currentUser || !esSuperAdministrador()) {
        showModal({ title: '⛔ Acceso denegado', message: 'Solo el superadministrador puede modificar las plantillas de WhatsApp.', icon: '⛔', confirmText: 'Aceptar' });
        return;
    }
    try {
        const ref = database.ref(WHATSAPP_PLANTILLAS_DB_PATH).push();
        await ref.set({ titulo, mensaje });
        cargarPlantillasWhatsAppAdmin();
    } catch (error) {
        console.error('❌ Error al agregar plantilla:', error);
        showModal({ title: '❌ Error', message: 'Hubo un problema al agregar la plantilla.', icon: '❌', confirmText: 'Aceptar' });
    }
}

async function editarPlantillaWhatsApp(id, titulo, mensaje) {
    if (!currentUser || !esSuperAdministrador()) {
        showModal({ title: '⛔ Acceso denegado', message: 'Solo el superadministrador puede modificar las plantillas de WhatsApp.', icon: '⛔', confirmText: 'Aceptar' });
        return;
    }
    try {
        await database.ref(WHATSAPP_PLANTILLAS_DB_PATH + '/' + id).update({ titulo, mensaje });
        cargarPlantillasWhatsAppAdmin();
    } catch (error) {
        console.error('❌ Error al editar plantilla:', error);
        showModal({ title: '❌ Error', message: 'Hubo un problema al editar la plantilla.', icon: '❌', confirmText: 'Aceptar' });
    }
}

async function eliminarPlantillaWhatsApp(id) {
    if (!currentUser || !esSuperAdministrador()) {
        showModal({ title: '⛔ Acceso denegado', message: 'Solo el superadministrador puede modificar las plantillas de WhatsApp.', icon: '⛔', confirmText: 'Aceptar' });
        return;
    }
    const plantilla = whatsappPlantillasCache.find(pl => pl.id === id);
    const confirmado = await showModal({
        title: '🗑️ Eliminar plantilla',
        message: `¿Eliminar la plantilla <strong>${plantilla ? plantilla.titulo : ''}</strong>?`,
        icon: '🗑️',
        confirmText: '✅ Eliminar',
        cancelText: 'Cancelar',
        type: 'danger'
    });
    if (!confirmado) return;

    try {
        await database.ref(WHATSAPP_PLANTILLAS_DB_PATH + '/' + id).remove();
        cargarPlantillasWhatsAppAdmin();
    } catch (error) {
        console.error('❌ Error al eliminar plantilla:', error);
        showModal({ title: '❌ Error', message: 'Hubo un problema al eliminar la plantilla.', icon: '❌', confirmText: 'Aceptar' });
    }
}
