// =============================================================
// 👁️ TABLA OFTALMOLOGÍA
// Dos piezas conectadas:
// 1) Botón por día (wiring en js/14-render-principal.js, data-action=
//    "tablaOftalmologia") que abre un modal con los pacientes de
//    Oftalmología de ese día, para completar Ojo/Dilatación
//    Pupilar/Membrana/Observaciones, guardar (con auto-guardado) e
//    imprimir con membrete.
// 2) Sección nueva del menú ("Tabla Oftalmología") que lista/filtra todo
//    lo guardado — mismo patrón que Libro de Quirófano (js/13): se lee
//    todo una vez y se filtra/pagina en memoria.
//
// Los registros viven en registros_oftalmologia/{rowKey} — la CLAVE es
// el mismo rowKey (semana-dia-pab-fila) de la fila de origen en la Tabla
// Quirúrgica, así que volver a guardar el mismo día para el mismo
// paciente ACTUALIZA en vez de duplicar (con .set(), no .push()).
// =============================================================

const OFTALMOLOGIA_OJO_OPCIONES = ['OD', 'OI'];
const OFTALMOLOGIA_DILATACION_OPCIONES = ['BUENA', 'MALA', 'REGULAR'];
const OFTALMOLOGIA_MEMBRANA_OPCIONES = ['SI', 'NO', 'NO APLICA'];

// 🗓️ La CLAVE de guardado se arma con FECHA + RUT, NUNCA con la posición
// semana-dia-pabellón-fila: la Tabla Quirúrgica RECICLA sus casillas mes a
// mes (la misma "Semana 1 - LUN - PAB 1 - Fila 1" es un paciente distinto
// cada mes), así que una clave posicional mezclaría los datos de
// Oftalmología de un paciente viejo con los de uno nuevo que cae en la
// misma casilla al mes siguiente. FECHA sí es un dato real que cambia
// cada mes (lo llena quien arma la tabla) y RUT identifica al paciente —
// juntos sobreviven la reutilización de la tabla.
function construirClaveOftalmologia(fecha, rut) {
    const fechaLimpia = (fecha || '').toString().trim().replace(/\//g, '-') || 'sin-fecha';
    const rutLimpio = (rut || '').toString().trim().replace(/[.\s]/g, '').replace(/[#$\[\]/]/g, '') || 'sin-rut';
    return `${fechaLimpia}_${rutLimpio}`;
}

// -------------------------------------------------------------
// 🚪 ABRIR: junta las filas de Oftalmología del día y precarga lo ya
// guardado (si se había abierto/guardado antes para esa FECHA+RUT).
// -------------------------------------------------------------
async function abrirTablaOftalmologia(dayKey) {
    if (!usuarioTieneAccesoSeccion('registro_tablaOftalmologia')) return;

    const [semanaIdx, diaIdx] = dayKey.split('-').map(Number);
    const semanaData = semanas[semanaIdx];
    if (!semanaData) return;
    const dayData = semanaData[diaIdx];
    if (!dayData) return;

    // Si dos filas del mismo día terminan con la misma FECHA+RUT (mismo
    // paciente con dos procedimientos el mismo día) se desambiguan
    // agregando un sufijo _2, _3... para no pisarse entre sí.
    const clavesUsadas = new Map();
    const filasOftalmologia = [];
    PABS.forEach((pab, pabIdx) => {
        const rows = dayData.pabs[pab] || [];
        rows.forEach((fila, filaIdx) => {
            const especialidad = (fila.Especialidad || '').toString().trim().toUpperCase();
            if (especialidad === 'OFTALMOLOGÍA') {
                const rowKey = `${semanaIdx}-${diaIdx}-${pabIdx}-${filaIdx}`;
                let clave = construirClaveOftalmologia(fila.FECHA, fila.RUT);
                const usos = clavesUsadas.get(clave) || 0;
                clavesUsadas.set(clave, usos + 1);
                if (usos > 0) clave = `${clave}_${usos + 1}`;
                filasOftalmologia.push({ rowKey, clave, fila, datosGuardados: null });
            }
        });
    });

    if (filasOftalmologia.length === 0) {
        showModal({
            title: 'ℹ️ Sin pacientes de Oftalmología',
            message: 'No hay pacientes con especialidad Oftalmología registrados este día.',
            icon: 'ℹ️',
            confirmText: 'Aceptar'
        });
        return;
    }

    for (const item of filasOftalmologia) {
        try {
            const snap = await database.ref('registros_oftalmologia/' + item.clave).once('value');
            item.datosGuardados = snap.val() || null;
        } catch (error) {
            console.error('❌ Error al precargar registro de Oftalmología:', error);
        }
    }

    mostrarModalTablaOftalmologia(dayKey, filasOftalmologia);
}

// -------------------------------------------------------------
// 🪟 MODAL — no se cierra solo (sin click-afuera, sin Escape); solo por
// el botón "❌ Cerrar", que siempre pide confirmación.
// -------------------------------------------------------------
let oftalmologiaModalOverlay = null;
let oftalmologiaAutoguardadoTimeout = null;

function mostrarModalTablaOftalmologia(dayKey, filasOftalmologia) {
    if (oftalmologiaModalOverlay) oftalmologiaModalOverlay.remove();
    if (oftalmologiaAutoguardadoTimeout) {
        clearTimeout(oftalmologiaAutoguardadoTimeout);
        oftalmologiaAutoguardadoTimeout = null;
    }

    const [semanaIdx, diaIdx] = dayKey.split('-').map(Number);
    const diaNombre = DIAS[diaIdx];
    const semanaNum = semanaIdx + 1;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width: 1100px; width: 95%;">
            <span class="modal-icon">👁️</span>
            <div class="modal-title">Tabla Oftalmología · ${diaNombre} Semana ${semanaNum}</div>
            <div class="modal-message" style="margin-bottom:10px;">Completa Ojo, Dilatación Pupilar, Membrana y Observaciones para cada paciente. Los cambios se guardan solos a los 5 segundos de inactividad.</div>
            <div style="overflow-x:auto; max-height:55vh; overflow-y:auto; margin-bottom:12px; border:1px solid #e2e8f0; border-radius:8px;">
                <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
                    <thead>
                        <tr>
                            <th style="background:#1e293b; color:white; padding:6px; text-align:left; position:sticky; top:0;">Nombre</th>
                            <th style="background:#1e293b; color:white; padding:6px; position:sticky; top:0;">RUT</th>
                            <th style="background:#1e293b; color:white; padding:6px; position:sticky; top:0;">Edad</th>
                            <th style="background:#1e293b; color:white; padding:6px; text-align:left; position:sticky; top:0;">Diagnóstico</th>
                            <th style="background:#1e293b; color:white; padding:6px; position:sticky; top:0;">Ojo</th>
                            <th style="background:#1e293b; color:white; padding:6px; position:sticky; top:0;">Dilatación Pupilar</th>
                            <th style="background:#1e293b; color:white; padding:6px; position:sticky; top:0;">Membrana</th>
                            <th style="background:#1e293b; color:white; padding:6px; text-align:left; position:sticky; top:0;">Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasOftalmologia.map((item, i) => {
                            const g = item.datosGuardados || {};
                            return `
                            <tr data-row-idx="${i}" style="border-bottom:1px solid #e2e8f0;">
                                <td style="padding:6px; user-select:text;">${item.fila.Nombre_Paciente || ''}</td>
                                <td style="padding:6px; text-align:center; user-select:text;">${item.fila.RUT || ''}</td>
                                <td style="padding:6px; text-align:center; user-select:text;">${item.fila.Edad || ''}</td>
                                <td style="padding:6px; user-select:text;">${item.fila.Diagnostico || ''}</td>
                                <td style="padding:4px;">
                                    <select class="of-ojo" style="width:100%; padding:4px;">
                                        <option value="">-</option>
                                        ${OFTALMOLOGIA_OJO_OPCIONES.map(o => `<option value="${o}" ${g.Ojo === o ? 'selected' : ''}>${o}</option>`).join('')}
                                    </select>
                                </td>
                                <td style="padding:4px;">
                                    <select class="of-dilatacion" style="width:100%; padding:4px;">
                                        <option value="">-</option>
                                        ${OFTALMOLOGIA_DILATACION_OPCIONES.map(o => `<option value="${o}" ${g.DilatacionPupilar === o ? 'selected' : ''}>${o}</option>`).join('')}
                                    </select>
                                </td>
                                <td style="padding:4px;">
                                    <select class="of-membrana" style="width:100%; padding:4px;">
                                        <option value="">-</option>
                                        ${OFTALMOLOGIA_MEMBRANA_OPCIONES.map(o => `<option value="${o}" ${g.Membrana === o ? 'selected' : ''}>${o}</option>`).join('')}
                                    </select>
                                </td>
                                <td style="padding:4px;">
                                    <textarea class="of-observaciones" rows="2" style="width:100%; padding:4px; resize:vertical; font-family:inherit;">${g.Observaciones || ''}</textarea>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <span id="ofEstadoAutoguardado" style="font-size:0.75rem; color:#64748b;"></span>
                <div class="modal-actions" style="margin:0;">
                    <button class="modal-btn modal-btn-cancel" id="ofBtnCerrar">❌ Cerrar</button>
                    <button class="modal-btn" id="ofBtnImprimir" style="background:#0b2a4f; color:white;">🖨️ Imprimir</button>
                    <button class="modal-btn modal-btn-success" id="ofBtnGuardar">💾 Guardar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    oftalmologiaModalOverlay = overlay;

    // 🚫 A propósito NO se engancha ningún listener de click-afuera ni de
    // Escape — este modal solo se cierra con el botón "Cerrar" de abajo.

    function leerFilasDelFormulario() {
        return filasOftalmologia.map((item, i) => {
            const tr = overlay.querySelector(`tr[data-row-idx="${i}"]`);
            return {
                clave: item.clave,
                rowKey: item.rowKey,
                fila: item.fila,
                Ojo: tr.querySelector('.of-ojo').value,
                DilatacionPupilar: tr.querySelector('.of-dilatacion').value,
                Membrana: tr.querySelector('.of-membrana').value,
                Observaciones: tr.querySelector('.of-observaciones').value
            };
        });
    }

    async function guardarTodo(silencioso) {
        const filas = leerFilasDelFormulario();
        try {
            for (const item of filas) {
                await database.ref('registros_oftalmologia/' + item.clave).set({
                    FECHA: item.fila.FECHA || '',
                    Nombre_Paciente: item.fila.Nombre_Paciente || '',
                    RUT: item.fila.RUT || '',
                    Edad: item.fila.Edad || '',
                    Diagnostico: item.fila.Diagnostico || '',
                    Ojo: item.Ojo,
                    DilatacionPupilar: item.DilatacionPupilar,
                    Membrana: item.Membrana,
                    Observaciones: item.Observaciones,
                    metadata: {
                        rowKeyOrigen: item.rowKey,
                        semana: semanaNum,
                        dia: diaNombre,
                        registrado_por: currentUserEmail || 'Sistema',
                        fecha_registro: firebase.database.ServerValue.TIMESTAMP
                    }
                });
            }
            const estado = overlay.querySelector('#ofEstadoAutoguardado');
            if (estado) {
                const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                estado.textContent = `💾 Guardado ${hora}`;
            }
            if (!silencioso) {
                // showModal() borra TODOS los .modal-overlay al abrirse (ver
                // js/06) — se desmonta este modal mientras se muestra el
                // aviso y se vuelve a montar después, para que "Guardar" no
                // termine cerrando la Tabla Oftalmología de rebote.
                overlay.remove();
                await showModal({ title: '✅ Guardado', message: 'Los datos de Tabla Oftalmología se guardaron correctamente.', icon: '✅', confirmText: 'Aceptar' });
                document.body.appendChild(overlay);
            }
        } catch (error) {
            console.error('❌ Error al guardar Tabla Oftalmología:', error);
            if (!silencioso) {
                overlay.remove();
                await showModal({ title: '❌ Error', message: 'Hubo un problema al guardar. Intenta nuevamente.', icon: '❌', confirmText: 'Aceptar' });
                document.body.appendChild(overlay);
            }
        }
    }

    // ⏱️ Auto-guardado a los 5s de inactividad — mismo criterio que la
    // Tabla Quirúrgica (DEBOUNCE_DELAY en js/02-guardado-firebase.js).
    function reiniciarAutoguardado() {
        if (oftalmologiaAutoguardadoTimeout) clearTimeout(oftalmologiaAutoguardadoTimeout);
        oftalmologiaAutoguardadoTimeout = setTimeout(() => guardarTodo(true), 5000);
    }

    overlay.querySelectorAll('.of-ojo, .of-dilatacion, .of-membrana').forEach(el => {
        el.addEventListener('change', reiniciarAutoguardado);
    });
    overlay.querySelectorAll('.of-observaciones').forEach(el => {
        el.addEventListener('input', reiniciarAutoguardado);
    });

    overlay.querySelector('#ofBtnGuardar').addEventListener('click', () => guardarTodo(false));

    overlay.querySelector('#ofBtnImprimir').addEventListener('click', () => {
        imprimirTablaOftalmologia(dayKey, leerFilasDelFormulario());
    });

    overlay.querySelector('#ofBtnCerrar').addEventListener('click', async () => {
        // ⚠️ showModal() borra TODOS los .modal-overlay existentes al
        // abrirse (ver js/06-modales-y-color.js) — si no lo sacamos del DOM
        // antes, se pierde este modal apenas se abre la confirmación,
        // incluso si el usuario termina cancelando. Lo desmontamos y, si
        // cancela, lo volvemos a montar tal cual quedó (los <select>/
        // <textarea> conservan su valor porque es el mismo nodo).
        overlay.remove();
        const confirmado = await showModal({
            title: '⚠️ Cerrar Tabla Oftalmología',
            message: '¿Seguro que quieres cerrar?<br>Si hiciste cambios en los últimos 5 segundos, todavía no se guardaron y se perderán.',
            icon: '⚠️',
            confirmText: 'Sí, cerrar',
            cancelText: 'Cancelar',
            type: 'danger'
        });
        if (!confirmado) {
            document.body.appendChild(overlay);
            return;
        }
        if (oftalmologiaAutoguardadoTimeout) {
            clearTimeout(oftalmologiaAutoguardadoTimeout);
            oftalmologiaAutoguardadoTimeout = null;
        }
        oftalmologiaModalOverlay = null;
    });
}

// -------------------------------------------------------------
// 🖨️ IMPRIMIR — mismo esqueleto que imprimirDia() (js/08), membrete
// propio de Oftalmología.
// -------------------------------------------------------------
// construirDocumentoImpresionOftalmologia() y abrirVentanaImpresion() son
// compartidas por el modal de Pieza A (imprimirTablaOftalmologia) y por la
// vista "tabla de un día" de la sección de consulta
// (imprimirTablaOftalmologiaPorFecha).
function construirDocumentoImpresionOftalmologia(subtitulo, filasHTML) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Tabla Oftalmología - ${subtitulo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: white; color: #1e293b; }
                @page { size: landscape; margin: 15mm; }
                .membrete { display:flex; align-items:center; gap:20px; padding:15px 20px; background: linear-gradient(135deg, #0b2a4f 0%, #1a6d8a 100%); border-radius:10px; margin-bottom:20px; color:white; }
                .membrete .logo img { height:70px; width:auto; background:rgba(255,255,255,0.9); padding:4px; border-radius:6px; }
                .membrete .info { flex:1; }
                .membrete .info h1 { font-size:1.5rem; font-weight:700; letter-spacing:-0.5px; }
                .membrete .info .sub { font-size:0.9rem; opacity:0.85; }
                .membrete .info .fecha-dia { font-size:1rem; font-weight:600; margin-top:4px; }
                table { width:100%; border-collapse:collapse; font-size:0.75rem; }
                th { background:#1e293b; color:white; padding:6px 4px; text-align:center; font-weight:600; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.3px; border:1px solid #1e293b; }
                td { padding:5px 4px; border:1px solid #d1d9e6; text-align:center; vertical-align:middle; word-wrap:break-word; }
                tr:nth-child(even) td { background:#f8fafc; }
            </style>
        </head>
        <body>
            <div class="membrete">
                <div class="logo"><img src="logo.png" alt="Hospital de Illapel"></div>
                <div class="info">
                    <h1>👁️ Tabla Oftalmología</h1>
                    <div class="sub">Hospital Dr. Humberto Elorza Cortés · Illapel, Chile</div>
                    <div class="fecha-dia">${subtitulo}</div>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="text-align:left;">Nombre</th><th>RUT</th><th>Edad</th>
                        <th style="text-align:left;">Diagnóstico</th><th>Ojo</th>
                        <th>Dilatación Pupilar</th><th>Membrana</th>
                        <th style="text-align:left;">Observaciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasHTML}
                </tbody>
            </table>
        </body>
        </html>
    `;
}

function abrirVentanaImpresion(contenidoHTML) {
    const ventana = window.open('', '_blank', 'width=1100,height=800,scrollbars=yes');
    if (ventana) {
        ventana.document.write(contenidoHTML);
        ventana.document.close();
        ventana.focus();
        let yaImpreso = false;
        ventana.addEventListener('load', function() {
            if (!yaImpreso) { yaImpreso = true; ventana.print(); }
        });
        setTimeout(function() {
            if (!yaImpreso) { yaImpreso = true; ventana.print(); }
        }, 500);
    }
}

function imprimirTablaOftalmologia(dayKey, filas) {
    const [semanaIdx, diaIdx] = dayKey.split('-').map(Number);
    const diaNombre = DIAS[diaIdx];
    const semanaNum = semanaIdx + 1;

    function filaHTML(item) {
        return `
            <tr>
                <td style="text-align:left;">${item.fila.Nombre_Paciente || ''}</td>
                <td>${item.fila.RUT || ''}</td>
                <td>${item.fila.Edad || ''}</td>
                <td style="text-align:left;">${item.fila.Diagnostico || ''}</td>
                <td>${item.Ojo || ''}</td>
                <td>${item.DilatacionPupilar || ''}</td>
                <td>${item.Membrana || ''}</td>
                <td style="text-align:left;">${item.Observaciones || ''}</td>
            </tr>`;
    }

    // La FECHA real (la que llena quien arma la tabla, ver js/07) es la
    // que de verdad importa en el membrete impreso — "LUN · Semana 1" solo
    // tiene sentido dentro de la Tabla Quirúrgica en vivo, una vez
    // reciclada la casilla ya no dice nada del día calendario real en el
    // que se hizo esta atención.
    const fechaReal = (filas.find(item => item.fila.FECHA) || {}).fila?.FECHA || '';
    const subtitulo = fechaReal
        ? `${diaNombre} · Semana ${semanaNum} · ${fechaReal}`
        : `${diaNombre} · Semana ${semanaNum}`;

    const contenidoHTML = construirDocumentoImpresionOftalmologia(
        subtitulo,
        filas.map(filaHTML).join('')
    );
    abrirVentanaImpresion(contenidoHTML);
}

// 🖨️ Imprime la tabla filtrada de la vista "tabla de un día" en la
// sección de consulta (mismo formato de columnas, pero con datos ya
// planos — no vienen anidados bajo item.fila como en el modal de Pieza A).
function imprimirTablaOftalmologiaPorFecha(fechaLabel, registros) {
    function filaHTML(r) {
        return `
            <tr>
                <td style="text-align:left;">${r.Nombre_Paciente || ''}</td>
                <td>${r.RUT || ''}</td>
                <td>${r.Edad || ''}</td>
                <td style="text-align:left;">${r.Diagnostico || ''}</td>
                <td>${r.Ojo || ''}</td>
                <td>${r.DilatacionPupilar || ''}</td>
                <td>${r.Membrana || ''}</td>
                <td style="text-align:left;">${r.Observaciones || ''}</td>
            </tr>`;
    }

    const contenidoHTML = construirDocumentoImpresionOftalmologia(
        fechaLabel,
        registros.map(filaHTML).join('')
    );
    abrirVentanaImpresion(contenidoHTML);
}

// =============================================================
// 📋 SECCIÓN "TABLA OFTALMOLOGÍA" — lista/filtra todo lo guardado
// Mismo patrón que Libro de Quirófano (js/13-libro-quirofano-tabla.js):
// se lee todo una vez y se filtra/pagina en memoria (sin recargar
// Firebase en cada cambio de filtro).
// =============================================================

let oftalmologiaPaginaActual = 1;
const OFTALMOLOGIA_REGISTROS_POR_PAGINA = 15;

async function cargarTablaOftalmologia() {
    if (!currentUser) {
        oftalmologiaContent.innerHTML = `<div style="text-align:center; padding:40px; color:#64748b;"><p>🔐 Inicia sesión para ver Tabla Oftalmología.</p></div>`;
        return;
    }

    try {
        const snapshot = await database.ref('registros_oftalmologia').once('value');
        const data = snapshot.val();

        if (!data) {
            oftalmologiaContent.innerHTML = `
                <div style="text-align:center; padding:40px; color:#64748b;">
                    <p style="font-size:2rem; margin-bottom:10px;">👁️</p>
                    <p>No hay registros en Tabla Oftalmología.</p>
                </div>
            `;
            return;
        }

        const registros = [];
        Object.keys(data).forEach(key => registros.push({ id: key, ...data[key] }));
        registros.sort((a, b) => ((b.metadata && b.metadata.fecha_registro) || 0) - ((a.metadata && a.metadata.fecha_registro) || 0));

        oftalmologiaContent.innerHTML = `
            <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px;">👁️ Tabla Oftalmología (${registros.length} registros)</div>
            <div id="oftalmologiaFiltrosContainer"></div>
            <div id="oftalmologiaTablaContainer"></div>
        `;

        document.getElementById('oftalmologiaFiltrosContainer').innerHTML = generarPanelFiltrosOftalmologia();
        oftalmologiaPaginaActual = 1;
        document.getElementById('oftalmologiaTablaContainer').innerHTML = renderizarTablaOftalmologia(registros, {});
        inicializarFiltrosOftalmologia(registros);

    } catch (error) {
        console.error('❌ Error al cargar Tabla Oftalmología:', error);
        oftalmologiaContent.innerHTML = `<div style="text-align:center; padding:40px; color:#dc2626;"><p>❌ Error al cargar Tabla Oftalmología.</p></div>`;
    }
}

function generarPanelFiltrosOftalmologia() {
    return `
        <div style="background:#f8fafc; border-radius:12px; padding:12px; margin-bottom:14px;">
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; padding-bottom:12px; margin-bottom:12px; border-bottom:1px solid #e2e8f0;">
                <label style="font-size:0.85rem; font-weight:600; color:#1e293b;">📅 Ver tabla de un día:</label>
                <input type="date" id="ofFiltroFechaDia" style="padding:6px 10px; border:1px solid #d1d9e6; border-radius:20px; font-size:0.82rem;">
                <button id="ofBtnLimpiarFechaDia" style="display:none; background:#f1f5f9; border:1px solid #d1d9e6; padding:6px 14px; border-radius:20px; font-size:0.8rem; cursor:pointer;">✖️ Ver lista completa</button>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                <input type="text" id="ofFiltroNombre" placeholder="🔍 Nombre o RUT..." style="padding:7px 12px; border:1px solid #d1d9e6; border-radius:20px; font-size:0.82rem; flex:1; min-width:180px;">
                <select id="ofFiltroOjo" style="padding:7px 12px; border:1px solid #d1d9e6; border-radius:20px; font-size:0.82rem;">
                    <option value="">Todos los ojos</option>
                    ${OFTALMOLOGIA_OJO_OPCIONES.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>
                <select id="ofFiltroMembrana" style="padding:7px 12px; border:1px solid #d1d9e6; border-radius:20px; font-size:0.82rem;">
                    <option value="">Toda membrana</option>
                    ${OFTALMOLOGIA_MEMBRANA_OPCIONES.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>
                <input type="date" id="ofFiltroFechaDesde" style="padding:6px 10px; border:1px solid #d1d9e6; border-radius:20px; font-size:0.8rem;">
                <input type="date" id="ofFiltroFechaHasta" style="padding:6px 10px; border:1px solid #d1d9e6; border-radius:20px; font-size:0.8rem;">
                <button id="ofBtnLimpiarFiltros" style="background:#f1f5f9; border:1px solid #d1d9e6; padding:7px 14px; border-radius:20px; font-size:0.8rem; cursor:pointer;">Limpiar</button>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// 📅 VISTA "TABLA DE UN DÍA" — mismo formato de columnas que el modal de
// Pieza A (Nombre/RUT/Edad/Diagnóstico/Ojo/Dilatación Pupilar/Membrana/
// Observaciones), pero de solo lectura y dentro de la sección (no modal).
// Reemplaza a renderizarTablaOftalmologia() en el contenedor compartido
// mientras haya una fecha exacta seleccionada en "ofFiltroFechaDia".
// -------------------------------------------------------------
function renderizarTablaOftalmologiaPorDia(registros, fechaISO) {
    const delDia = registros.filter(r => normalizarFechaOftalmologia(r.FECHA) === fechaISO);
    const [anio, mes, dia] = fechaISO.split('-');
    const fechaLabel = `${dia}/${mes}/${anio}`;

    if (delDia.length === 0) {
        return `<div style="text-align:center; padding:30px; color:#94a3b8; font-style:italic;">No hay registros de Oftalmología guardados para el ${fechaLabel}.</div>`;
    }

    const html = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
            <div style="font-weight:600;">👁️ Tabla Oftalmología · ${fechaLabel} (${delDia.length} paciente${delDia.length === 1 ? '' : 's'})</div>
            <button id="ofBtnImprimirTablaDia" style="background:#0b2a4f; color:white; border:none; padding:6px 14px; border-radius:20px; font-size:0.8rem; cursor:pointer;">🖨️ Imprimir</button>
        </div>
        <div class="table-wrap" style="overflow-x:auto; border-radius:14px; background:white; border:1px solid #e9edf4;">
            <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
                <thead>
                    <tr>
                        <th style="background:#1e293b; color:white; padding:6px; text-align:left;">Nombre</th>
                        <th style="background:#1e293b; color:white; padding:6px;">RUT</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Edad</th>
                        <th style="background:#1e293b; color:white; padding:6px; text-align:left;">Diagnóstico</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Ojo</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Dilatación Pupilar</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Membrana</th>
                        <th style="background:#1e293b; color:white; padding:6px; text-align:left;">Observaciones</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${delDia.map(r => `
                        <tr>
                            <td style="padding:6px; border:1px solid #d1d9e6; user-select:text;">${r.Nombre_Paciente || ''}</td>
                            <td style="padding:6px; border:1px solid #d1d9e6; text-align:center; user-select:text;">${r.RUT || ''}</td>
                            <td style="padding:6px; border:1px solid #d1d9e6; text-align:center;">${r.Edad || ''}</td>
                            <td style="padding:6px; border:1px solid #d1d9e6;">${r.Diagnostico || ''}</td>
                            <td style="padding:6px; border:1px solid #d1d9e6; text-align:center;">${r.Ojo || ''}</td>
                            <td style="padding:6px; border:1px solid #d1d9e6; text-align:center;">${r.DilatacionPupilar || ''}</td>
                            <td style="padding:6px; border:1px solid #d1d9e6; text-align:center;">${r.Membrana || ''}</td>
                            <td style="padding:6px; border:1px solid #d1d9e6;">${r.Observaciones || ''}</td>
                            <td style="padding:6px; border:1px solid #d1d9e6; text-align:center;">
                                <button class="btn-ver-detalle-oftalmologia" data-key="${r.id}" style="background:#0b2a4f; color:white; border:none; padding:4px 10px; border-radius:14px; cursor:pointer; font-size:0.75rem;">👁️ Ver</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    setTimeout(() => {
        document.querySelectorAll('.btn-ver-detalle-oftalmologia').forEach(btn => {
            btn.addEventListener('click', function() {
                mostrarDetalleOftalmologia(this.dataset.key);
            });
        });
        document.getElementById('ofBtnImprimirTablaDia')?.addEventListener('click', function() {
            imprimirTablaOftalmologiaPorFecha(fechaLabel, delDia);
        });
    }, 50);

    return html;
}

// FECHA se guarda como DD/MM/YYYY (mismo formato que usa la Tabla, ver
// js/02-guardado-firebase.js) — se convierte a YYYY-MM-DD para poder
// comparar contra los <input type="date">.
function normalizarFechaOftalmologia(fechaDDMMYYYY) {
    if (!fechaDDMMYYYY) return null;
    const partes = fechaDDMMYYYY.split('/');
    if (partes.length !== 3) return null;
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

function renderizarTablaOftalmologia(registros, filtros) {
    const filtrados = registros.filter(r => {
        if (filtros.nombre) {
            const texto = `${r.Nombre_Paciente || ''} ${r.RUT || ''}`.toLowerCase();
            if (!texto.includes(filtros.nombre.toLowerCase())) return false;
        }
        if (filtros.ojo && r.Ojo !== filtros.ojo) return false;
        if (filtros.membrana && r.Membrana !== filtros.membrana) return false;
        if (filtros.fechaDesde || filtros.fechaHasta) {
            const fechaISO = normalizarFechaOftalmologia(r.FECHA);
            if (!fechaISO) return false;
            if (filtros.fechaDesde && fechaISO < filtros.fechaDesde) return false;
            if (filtros.fechaHasta && fechaISO > filtros.fechaHasta) return false;
        }
        return true;
    });

    if (filtrados.length === 0) {
        return `<div style="text-align:center; padding:30px; color:#94a3b8; font-style:italic;">No hay registros que coincidan con los filtros.</div>`;
    }

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / OFTALMOLOGIA_REGISTROS_POR_PAGINA));
    if (oftalmologiaPaginaActual > totalPaginas) oftalmologiaPaginaActual = totalPaginas;
    const inicio = (oftalmologiaPaginaActual - 1) * OFTALMOLOGIA_REGISTROS_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + OFTALMOLOGIA_REGISTROS_POR_PAGINA);

    const html = `
        <div class="table-wrap" style="overflow-x:auto; border-radius:14px; background:white; border:1px solid #e9edf4;">
            <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                <thead>
                    <tr>
                        <th style="background:#1e293b; color:white; padding:6px;">Fecha</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Nombre</th>
                        <th style="background:#1e293b; color:white; padding:6px;">RUT</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Edad</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Diagnóstico</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Ojo</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Dilatación</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Membrana</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Observaciones</th>
                        <th style="background:#1e293b; color:white; padding:6px;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${pagina.map(r => `
                        <tr>
                            <td style="padding:5px; border:1px solid #d1d9e6; text-align:center;">${r.FECHA || ''}</td>
                            <td style="padding:5px; border:1px solid #d1d9e6;">${r.Nombre_Paciente || ''}</td>
                            <td style="padding:5px; border:1px solid #d1d9e6; text-align:center;">${r.RUT || ''}</td>
                            <td style="padding:5px; border:1px solid #d1d9e6; text-align:center;">${r.Edad || ''}</td>
                            <td style="padding:5px; border:1px solid #d1d9e6;">${r.Diagnostico || ''}</td>
                            <td style="padding:5px; border:1px solid #d1d9e6; text-align:center;">${r.Ojo || ''}</td>
                            <td style="padding:5px; border:1px solid #d1d9e6; text-align:center;">${r.DilatacionPupilar || ''}</td>
                            <td style="padding:5px; border:1px solid #d1d9e6; text-align:center;">${r.Membrana || ''}</td>
                            <td style="padding:5px; border:1px solid #d1d9e6;">${r.Observaciones || ''}</td>
                            <td style="padding:5px; border:1px solid #d1d9e6; text-align:center;">
                                <button class="btn-ver-detalle-oftalmologia" data-key="${r.id}" style="background:#0b2a4f; color:white; border:none; padding:4px 10px; border-radius:14px; cursor:pointer; font-size:0.75rem;">👁️ Ver</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top:14px;">
            <button class="btn-pagina-oftalmologia" data-pagina="${oftalmologiaPaginaActual - 1}" ${oftalmologiaPaginaActual <= 1 ? 'disabled' : ''} style="background:#f1f5f9; border:1px solid #d1d9e6; padding:6px 14px; border-radius:16px; cursor:pointer;">‹ Anterior</button>
            <span style="font-size:0.85rem; color:#64748b;">Página ${oftalmologiaPaginaActual} de ${totalPaginas}</span>
            <button class="btn-pagina-oftalmologia" data-pagina="${oftalmologiaPaginaActual + 1}" ${oftalmologiaPaginaActual >= totalPaginas ? 'disabled' : ''} style="background:#f1f5f9; border:1px solid #d1d9e6; padding:6px 14px; border-radius:16px; cursor:pointer;">Siguiente ›</button>
        </div>
    `;

    setTimeout(() => {
        document.querySelectorAll('.btn-ver-detalle-oftalmologia').forEach(btn => {
            btn.addEventListener('click', function() {
                mostrarDetalleOftalmologia(this.dataset.key);
            });
        });
        document.querySelectorAll('.btn-pagina-oftalmologia').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.disabled) return;
                oftalmologiaPaginaActual = parseInt(this.dataset.pagina, 10);
                document.getElementById('oftalmologiaTablaContainer').innerHTML = renderizarTablaOftalmologia(registros, filtros);
            });
        });
    }, 50);

    return html;
}

function leerFiltrosOftalmologiaDelDOM() {
    return {
        nombre: (document.getElementById('ofFiltroNombre')?.value || '').trim(),
        ojo: document.getElementById('ofFiltroOjo')?.value || '',
        membrana: document.getElementById('ofFiltroMembrana')?.value || '',
        fechaDesde: document.getElementById('ofFiltroFechaDesde')?.value || '',
        fechaHasta: document.getElementById('ofFiltroFechaHasta')?.value || ''
    };
}

function inicializarFiltrosOftalmologia(registros) {
    let debounceTimeout = null;
    function aplicar() {
        oftalmologiaPaginaActual = 1;
        const filtros = leerFiltrosOftalmologiaDelDOM();
        document.getElementById('oftalmologiaTablaContainer').innerHTML = renderizarTablaOftalmologia(registros, filtros);
    }

    document.getElementById('ofFiltroNombre')?.addEventListener('input', function() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(aplicar, 300);
    });
    ['ofFiltroOjo', 'ofFiltroMembrana', 'ofFiltroFechaDesde', 'ofFiltroFechaHasta'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', aplicar);
    });

    document.getElementById('ofBtnLimpiarFiltros')?.addEventListener('click', function() {
        ['ofFiltroNombre', 'ofFiltroOjo', 'ofFiltroMembrana', 'ofFiltroFechaDesde', 'ofFiltroFechaHasta'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        aplicar();
    });

    // 📅 Ver tabla de un día: modo de vista aparte que reemplaza la lista
    // paginada por una tabla de solo lectura con el mismo formato de
    // columnas del modal de Pieza A, filtrada a esa fecha exacta.
    const inputFechaDia = document.getElementById('ofFiltroFechaDia');
    const btnLimpiarFechaDia = document.getElementById('ofBtnLimpiarFechaDia');
    inputFechaDia?.addEventListener('change', function() {
        if (this.value) {
            if (btnLimpiarFechaDia) btnLimpiarFechaDia.style.display = '';
            document.getElementById('oftalmologiaTablaContainer').innerHTML = renderizarTablaOftalmologiaPorDia(registros, this.value);
        } else {
            if (btnLimpiarFechaDia) btnLimpiarFechaDia.style.display = 'none';
            aplicar();
        }
    });
    btnLimpiarFechaDia?.addEventListener('click', function() {
        if (inputFechaDia) inputFechaDia.value = '';
        this.style.display = 'none';
        aplicar();
    });
}

// -------------------------------------------------------------
// 🗂️ MODAL DE DETALLE (ver + eliminar) — desde la sección de lista.
// -------------------------------------------------------------
async function mostrarDetalleOftalmologia(key) {
    let registro;
    try {
        const snap = await database.ref('registros_oftalmologia/' + key).once('value');
        registro = snap.val();
    } catch (error) {
        console.error('❌ Error al cargar detalle de Tabla Oftalmología:', error);
        return;
    }
    if (!registro) {
        showModal({ title: '❌ No encontrado', message: 'Este registro ya no existe (puede haber sido eliminado).', icon: '❌', confirmText: 'Aceptar' });
        return;
    }

    const puedeEliminar = usuarioTieneAccesoSeccion('oftalmologia_eliminar');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width: 480px;">
            <span class="modal-icon">👁️</span>
            <div class="modal-title">${registro.Nombre_Paciente || 'Paciente'}</div>
            <div class="modal-message" style="text-align:left; line-height:1.8;">
                <strong>Fecha:</strong> ${registro.FECHA || '-'}<br>
                <strong>RUT:</strong> ${registro.RUT || '-'}<br>
                <strong>Edad:</strong> ${registro.Edad || '-'}<br>
                <strong>Diagnóstico:</strong> ${registro.Diagnostico || '-'}<br>
                <strong>Ojo:</strong> ${registro.Ojo || '-'}<br>
                <strong>Dilatación Pupilar:</strong> ${registro.DilatacionPupilar || '-'}<br>
                <strong>Membrana:</strong> ${registro.Membrana || '-'}<br>
                <strong>Observaciones:</strong> ${registro.Observaciones || '-'}
            </div>
            <div class="modal-actions">
                ${puedeEliminar ? '<button class="modal-btn modal-btn-cancel" id="ofDetalleEliminar" style="background:#fee2e2; color:#dc2626;">🗑️ Eliminar</button>' : ''}
                <button class="modal-btn modal-btn-success" id="ofDetalleCerrar">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#ofDetalleCerrar').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    const btnEliminar = overlay.querySelector('#ofDetalleEliminar');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', async function() {
            const confirmado = await showModal({
                title: '🗑️ Eliminar registro',
                message: `¿Eliminar el registro de <strong>${registro.Nombre_Paciente || 'este paciente'}</strong>? Esta acción no se puede deshacer.`,
                icon: '⚠️',
                confirmText: 'Sí, eliminar',
                cancelText: 'Cancelar',
                type: 'danger'
            });
            if (!confirmado) return;
            try {
                await database.ref('registros_oftalmologia/' + key).remove();
                overlay.remove();
                cargarTablaOftalmologia();
            } catch (error) {
                console.error('❌ Error al eliminar registro de Oftalmología:', error);
                showModal({ title: '❌ Error', message: 'No se pudo eliminar el registro.', icon: '❌', confirmText: 'Aceptar' });
            }
        });
    }
}
