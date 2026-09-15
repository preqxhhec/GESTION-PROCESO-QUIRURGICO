// =============================================================
// 🩺➡️📋 LISTA DE ESPERA — MÓDULO 9: "CARGAR A LA TABLA"
// =============================================================
// Lleva un paciente de patients/{key} (Lista de Espera) a una fila de la
// Tabla Quirúrgica, pidiendo la ubicación (semana/día/pabellón/fila) con el
// mismo modal/flujo que ya usa mostrarModalReintegrar()/reintegrarPaciente()
// para "Pacientes Diferidos" (js/09-diferidos-libro-admin.js) — pero:
//   - lee de patients/{key} en vez de pacientes_diferidos/{key}
//   - usa su PROPIA tabla de mapeo de campos (CAMPOS_CARGAR_A_TABLA_DESDE_LE),
//     no CAMPOS_A_COPIAR (esa sigue sirviendo solo a Diferir/Reubicar)
//   - NO borra el registro origen: en vez de eso actualiza estatusTabla y
//     agrega una entrada al historial del paciente (Lista de Espera sigue
//     su seguimiento clínico más allá del día de la cirugía)
// =============================================================

// Traducción entre la taxonomía de Especialidad de Lista de Espera (sin
// tildes, ej. "CIRUGIA GENERAL") y la de Tabla Quirúrgica (con tildes, ej.
// "CIRUGÍA ADULTO"). Un valor sin traducción conocida pasa igual, sin
// perderse (mismo criterio de "preservar en vez de ocultar" que ya usa
// generarOptionsConPreservado() en js/07-render-tabla-dia.js).
const LE_TRADUCCION_ESPECIALIDAD = {
    'CIRUGIA GENERAL': 'CIRUGÍA ADULTO',
    'CIRUGIA INFANTIL': 'CIRUGÍA INFANTIL',
    'GINECOLOGIA': 'GINECOLOGÍA',
    'MAXILOFACIAL': 'MAXILOFACIAL',
    'OFTALMOLOGIA': 'OFTALMOLOGÍA',
    'ORL': 'ORL',
    'TRAUMATOLOGIA': 'TRAUMATOLOGÍA',
    'UROLOGIA': 'UROLOGÍA'
};

function leTraducirEspecialidad(valor) {
    if (!valor) return '';
    const clave = valor.toString().trim().toUpperCase();
    return LE_TRADUCCION_ESPECIALIDAD[clave] || valor;
}

// Mapeo de campos: clave = columna de la Tabla Quirúrgica, valor = función
// que calcula el valor a partir del registro de Lista de Espera.
const CAMPOS_CARGAR_A_TABLA_DESDE_LE = {
    'Nombre_Paciente': (p) => p.nombreApellido || '',
    'RUT': (p) => p.rut || '',
    'Edad': (p) => p.edad || '',
    'Diagnostico': (p) => p.diagnostico || '',
    'Intervencion_propuesta': (p) => p.intervencion || '',
    'Especialidad': (p) => leTraducirEspecialidad(p.especialidad),
    'Cirujano': (p) => p.medicoTratante || '',
    // FICHA: Lista de Espera no tiene un campo equivalente directo — queda vacío.
    'FICHA': () => '',
    // Rastro de origen — deja claro en la tabla que esta fila vino del bridge.
    'Condicion_LE': () => 'Ingresado desde Lista de Espera'
    // Anestesista: deliberadamente NO se copia (decisión ya confirmada con
    // el usuario) — se asigna aparte al momento de programar en la tabla.
};

// -------------------------------------------------------------
// 🪟 MODAL: elegir Semana / Día / Pabellón / Fila destino
// -------------------------------------------------------------
function leMostrarModalCargarATabla(key) {
    const paciente = patients.find(p => p.firebaseKey === key);
    if (!paciente) {
        showModal({
            title: '❌ Error',
            message: 'No se encontraron datos del paciente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
        return;
    }

    const nombrePaciente = paciente.nombreApellido || 'sin nombre';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width: 500px;">
            <span class="modal-icon">📋</span>
            <div class="modal-title">Cargar a la Tabla</div>
            <div class="modal-message">
                Cargar a <strong>${nombrePaciente}</strong> desde Lista de Espera
                <br><br>
                Selecciona el destino en la tabla quirúrgica:
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
                <div>
                    <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Semana</label>
                    <select id="cargarTablaSemana" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                        ${semanas.map((_, idx) => `<option value="${idx}">Semana ${idx + 1}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Día</label>
                    <select id="cargarTablaDia" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                        ${DIAS.map((dia, idx) => `<option value="${idx}">${dia}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Pabellón</label>
                    <select id="cargarTablaPab" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                        ${PABS.map((pab, idx) => `<option value="${idx}">${pab}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Fila</label>
                    <select id="cargarTablaFila" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                        ${Array.from({ length: 10 }, (_, i) => `<option value="${i}">Fila ${i + 1}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="cargarTablaError" style="color:#dc2626; font-size:0.9rem; margin-bottom:12px; min-height:24px;"></div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-cancel" id="cargarTablaCancelar">Cancelar</button>
                <button class="modal-btn modal-btn-success" id="cargarTablaConfirmar">✅ Cargar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const semanaSelect = overlay.querySelector('#cargarTablaSemana');
    const diaSelect = overlay.querySelector('#cargarTablaDia');
    const pabSelect = overlay.querySelector('#cargarTablaPab');
    const filaSelect = overlay.querySelector('#cargarTablaFila');
    const errorDiv = overlay.querySelector('#cargarTablaError');
    const confirmarBtn = overlay.querySelector('#cargarTablaConfirmar');
    const cancelarBtn = overlay.querySelector('#cargarTablaCancelar');

    let isResolved = false;
    function cerrar() {
        if (isResolved) return;
        isResolved = true;
        const box = overlay.querySelector('.modal-box');
        box.classList.add('closing');
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 300);
    }

    confirmarBtn.addEventListener('click', async function () {
        const semanaIdx = parseInt(semanaSelect.value);
        const diaIdx = parseInt(diaSelect.value);
        const pabIdx = parseInt(pabSelect.value);
        const filaIdx = parseInt(filaSelect.value);

        const semana = semanas[semanaIdx];
        if (!semana) {
            errorDiv.textContent = '❌ Semana inválida';
            return;
        }
        const day = semana[diaIdx];
        if (!day) {
            errorDiv.textContent = '❌ Día inválido';
            return;
        }
        const pabName = PABS[pabIdx];
        if (!pabName) {
            errorDiv.textContent = '❌ Pabellón inválido';
            return;
        }
        const rows = day.pabs[pabName];
        if (!rows || filaIdx >= rows.length) {
            errorDiv.textContent = '❌ La fila no existe. Agrega más filas primero.';
            return;
        }

        cerrar();
        await leCargarPacienteATabla(key, semanaIdx, diaIdx, pabIdx, filaIdx, paciente);
    });

    cancelarBtn.addEventListener('click', cerrar);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) cerrar();
    });
}

// -------------------------------------------------------------
// ✅ EJECUTAR: copiar a la fila + marcar el origen (sin borrarlo)
// -------------------------------------------------------------
async function leCargarPacienteATabla(key, semanaIdx, diaIdx, pabIdx, filaIdx, paciente) {
    try {
        const semana = semanas[semanaIdx];
        const day = semana[diaIdx];
        const pabName = PABS[pabIdx];
        const rows = day.pabs[pabName];
        const filaDestino = rows[filaIdx];

        const tieneDatos = CAMPOS_A_COPIAR.some(campo => {
            const valor = filaDestino[campo] || '';
            return valor !== '' && valor !== 'Seleccione';
        });

        if (tieneDatos) {
            const confirmarSobrescritura = await showModal({
                title: '⚠️ Fila ocupada',
                message: 'La fila seleccionada ya tiene datos.<br><br>¿Deseas sobrescribirla?',
                icon: '⚠️',
                confirmText: '✅ Sobrescribir',
                cancelText: 'Cancelar',
                type: 'danger'
            });
            if (!confirmarSobrescritura) return;
        }

        Object.keys(CAMPOS_CARGAR_A_TABLA_DESDE_LE).forEach(campo => {
            filaDestino[campo] = CAMPOS_CARGAR_A_TABLA_DESDE_LE[campo](paciente);
        });

        // 🩺 Vínculo con Lista de Espera: queda guardado en la fila (viaja
        // con ella si después se Reubica — ver CAMPOS_A_COPIAR en js/03, y
        // el listener de ESTADO_DE_IQx en js/02) para poder sincronizar el
        // estatus de este paciente en tiempo real desde la Tabla.
        filaDestino['LE_PacienteKey'] = key;
        // 🩺 Estatus real que tenía ANTES de entrar a la tabla (normalmente
        // "PROGRAMABLE") — se necesita para poder devolvérselo tal cual si
        // más adelante se pierde la fila sin resultado (ver
        // leCalcularEstatusAlPerderFila() más abajo). Nunca puede ser vacío:
        // si por algo raro no tenía estatus previo, PROGRAMABLE es el valor
        // por defecto real de la taxonomía (ver estatusTablaLista en
        // js/29-le-admin-listas.js), no un valor inventado como
        // "En Lista de Espera" — todo paciente en esta colección está, por
        // definición, en la lista de espera; eso no es un estatus.
        filaDestino['LE_EstatusAnterior'] = paciente.estatusTabla || 'PROGRAMABLE';

        const rowKey = `${semanaIdx}-${diaIdx}-${pabIdx}-${filaIdx}`;
        await guardarFilaEnFirebase(rowKey, filaDestino);

        // No se borra el registro origen: se marca su estatus y se deja
        // rastro en su historial — mismo formato de historial que ya usa
        // js/24-le-alta-paciente.js (fecha ISO, usuario, accion, descripcion,
        // cambios como lista de strings).
        const detalle = `Semana ${semanaIdx + 1} - ${DIAS[diaIdx]} - ${pabName} - Fila ${filaIdx + 1}`;
        const estatusAnterior = paciente.estatusTabla || '(sin estatus)';

        await database.ref('patients/' + key).update({ estatusTabla: 'Programado en Tabla' });
        await database.ref('patients/' + key + '/historial').push({
            fecha: new Date().toISOString(),
            usuario: currentUserEmail || 'Sistema',
            accion: 'Cargado a la Tabla',
            descripcion: `Cargado a la Tabla Quirúrgica: ${detalle}`,
            cambios: [`Estatus: ${estatusAnterior} → Programado en Tabla`, `Ubicación en la tabla: ${detalle}`]
        });

        renderWeekView();

        showModal({
            title: '✅ Paciente cargado a la Tabla',
            message: `<strong>${paciente.nombreApellido || 'sin nombre'}</strong> fue cargado a:<br><br>📅 Semana ${semanaIdx + 1} - ${DIAS[diaIdx]}<br>🏥 ${pabName} - Fila ${filaIdx + 1}<br><br>Sigue apareciendo en Lista de Espera, con estatus "Programado en Tabla".`,
            icon: '✅',
            confirmText: 'Aceptar'
        });

    } catch (error) {
        console.error('❌ Error al cargar paciente a la tabla:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al cargar el paciente a la tabla.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}

// -------------------------------------------------------------
// 🔄 SINCRONIZACIÓN EN TIEMPO REAL: Tabla → Lista de Espera
// -------------------------------------------------------------
// Una vez que una fila queda vinculada a un paciente (fila['LE_PacienteKey'],
// asignado en leCargarPacienteATabla() de arriba, y trasladado por
// CAMPOS_A_COPIAR cuando la fila se Reubica — ver js/03), dos lugares
// llaman a leSincronizarEstatusDesdeFila():
//   1. El listener de ESTADO_DE_IQx en js/02 (asignarEventosDelegados) —
//      cubre ediciones manuales del estado (SUSPENDIDO, OPERADO, etc.).
//   2. reubicarPaciente() en js/08 — cubre el caso "estaba SUSPENDIDO/
//      CONDICIONAL y se reubicó a otra fila": como ESTADO_DE_IQx no viaja
//      en CAMPOS_A_COPIAR, la fila destino parte en blanco, así que el
//      estatus en Lista de Espera vuelve a "Programado en Tabla" con la
//      ubicación nueva — exactamente el comportamiento pedido.
//
// Nota: esta sincronización solo cubre Reubicar. Si una fila vinculada se
// Difiere hacia Pacientes Diferidos, el vínculo se corta ahí (ver js/08,
// diferirFila) — extenderlo a ese flujo queda como una mejora futura.
// -------------------------------------------------------------

// Traduce el ESTADO_DE_IQx de la fila al estatusTabla que le corresponde en
// Lista de Espera. Los estados "OPERADO (...)" y "PERIANALGESIA (PARTO)"
// cierran el caso (coincide con LE_ESTADOS_NO_GESTIONABLES en js/23, que ya
// trata "OPERADO" como no gestionable). SUSPENDIDO/CONDICIONAL (NO OPERADO)/
// URGENCIA se reflejan tal cual, porque siguen requiriendo seguimiento (el
// paciente puede volver a reubicarse). Vacío/"Seleccione" es el estado
// recién llegado a la tabla, sin resultado todavía.
function leCalcularEstatusDesdeEstado(estadoIQx) {
    const estado = (estadoIQx || '').toString().trim();
    if (!estado || estado === 'Seleccione') return 'Programado en Tabla';
    if (estado.indexOf('OPERADO') === 0) return 'OPERADO';
    if (estado === 'PERIANALGESIA (PARTO)') return 'OPERADO';
    return estado;
}

// Función base: escribe el nuevo estatusTabla + una entrada de historial en
// patients/{key}, si de verdad cambió. La usan tanto
// leSincronizarEstatusDesdeFila() (deriva el estatus del ESTADO_DE_IQx de la
// fila) como diferirFila() en js/08 (que necesita fijar un estatus explícito
// — "En Lista de Diferidos" — que no sale de ningún ESTADO_DE_IQx).
async function leActualizarEstatusPaciente(key, nuevoEstatus, detalleAccion, ubicacionTexto) {
    if (!key) return;
    try {
        const snap = await database.ref('patients/' + key).once('value');
        const paciente = snap.val();
        if (!paciente) return; // el paciente pudo haber sido borrado en Lista de Espera

        const estatusAnterior = paciente.estatusTabla || '(sin estatus)';
        if (estatusAnterior === nuevoEstatus) return; // sin cambio real, no ensuciar el historial

        await database.ref('patients/' + key).update({ estatusTabla: nuevoEstatus });
        await database.ref('patients/' + key + '/historial').push({
            fecha: new Date().toISOString(),
            usuario: currentUserEmail || 'Sistema',
            accion: 'Actualizado desde la Tabla',
            descripcion: `${detalleAccion}: ${estatusAnterior} → ${nuevoEstatus}`,
            cambios: [`Estatus: ${estatusAnterior} → ${nuevoEstatus}`, `Ubicación/detalle: ${ubicacionTexto}`]
        });

        // Si el paciente tiene abierto el modal de detalle en Lista de
        // Espera en este momento, refrescarlo para que se vea el cambio.
        if (typeof currentModalPatient !== 'undefined' && currentModalPatient && currentModalPatient.firebaseKey === key) {
            currentModalPatient.estatusTabla = nuevoEstatus;
        }
    } catch (error) {
        console.error('❌ Error al sincronizar estatus con Lista de Espera:', error);
    }
}

async function leSincronizarEstatusDesdeFila(fila, ubicacionTexto) {
    const key = fila && fila['LE_PacienteKey'];
    if (!key) return;
    const nuevoEstatus = leCalcularEstatusDesdeEstado(fila['ESTADO_DE_IQx']);
    await leActualizarEstatusPaciente(key, nuevoEstatus, 'Estatus actualizado automáticamente desde la Tabla Quirúrgica', ubicacionTexto);
}

// Calcula a qué estatus debe volver un paciente cuando su fila se pierde
// SIN trasladar el vínculo a otro lado (Eliminar Fila en js/08, Limpiar
// Pabellón/Día/Registrar Día más abajo) — a diferencia de Reubicar/Diferir,
// que sí trasladan el vínculo (y con él, LE_EstatusAnterior — ver
// CAMPOS_A_COPIAR en js/03).
//
// - Si la fila ya cerró con un resultado FINAL (OPERADO o
//   "PERIANALGESIA (PARTO)", que leCalcularEstatusDesdeEstado() mapea a
//   'OPERADO'), ese resultado se preserva SIEMPRE: el paciente de verdad
//   fue operado, perder la fila (o archivarla en Libro de Quirófano vía
//   Registrar Día) no debe borrar eso. "OPERADO" no está en
//   LE_ESTADOS_YA_EN_TABLA por accidente (ver js/23) — justamente bloquea
//   "Cargar a la Tabla" para siempre, evitando duplicar a un paciente ya
//   operado.
// - En cualquier otro caso (nunca se definió resultado, o quedó
//   SUSPENDIDO/CONDICIONAL/URGENCIA sin haberse diferido/reubicado antes de
//   perder la fila) vuelve al estatus que tenía ANTES de entrar a la tabla,
//   guardado en LE_EstatusAnterior por leCargarPacienteATabla() (normalmente
//   "PROGRAMABLE"). NUNCA "En Lista de Espera" — ese no es un estatus real
//   de la taxonomía (ver estatusTablaLista en js/29): todo paciente en esta
//   colección está, por definición, en la lista de espera.
function leCalcularEstatusAlPerderFila(fila) {
    const estatusCalculado = leCalcularEstatusDesdeEstado(fila['ESTADO_DE_IQx']);
    if (estatusCalculado === 'OPERADO') return 'OPERADO';
    return fila['LE_EstatusAnterior'] || 'PROGRAMABLE';
}

// Se llama ANTES de limpiar/vaciar un grupo de filas (Limpiar Pabellón,
// Limpiar Día, Registrar Día) — a diferencia de Reubicar/Diferir, estas
// acciones no trasladan el vínculo a ningún otro lugar: el paciente
// simplemente deja de tener fila en la Tabla. Sin esto, Lista de Espera se
// quedaría mostrando "Programado en Tabla" (u otro estatus viejo) para
// siempre, y el botón "Cargar a la Tabla" no volvería a aparecer.
async function leResetearVinculosAntesDeLimpiar(rows) {
    if (!rows || typeof leActualizarEstatusPaciente !== 'function') return;
    for (const row of rows) {
        if (row && row['LE_PacienteKey']) {
            const nuevoEstatus = leCalcularEstatusAlPerderFila(row);
            const esResultadoFinal = nuevoEstatus === 'OPERADO';
            await leActualizarEstatusPaciente(
                row['LE_PacienteKey'],
                nuevoEstatus,
                'Fila limpiada/eliminada de la Tabla Quirúrgica',
                esResultadoFinal
                    ? `Resultado ya registrado (${(row['ESTADO_DE_IQx'] || '').toString().trim()}), sin ubicación en la tabla`
                    : 'Sin ubicación en la tabla — vuelve a su estatus previo a entrar en la tabla'
            );
        }
    }
}
