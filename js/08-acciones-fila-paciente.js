
    // =============================================================
// 🖨️ IMPRIMIR DÍA
// =============================================================
function imprimirDia(dayKey) {
    const [semanaIdx, diaIdx] = dayKey.split('-').map(Number);
    const semanaData = semanas[semanaIdx];
    if (!semanaData) return;
    const dayData = semanaData[diaIdx];
    if (!dayData) return;

    const diaNombre = DIAS[diaIdx];
    const semanaNum = semanaIdx + 1;

    function filaTieneDatos(fila) {
        const campos = [
            'FECHA', 'Especialidad', 'Nombre_Paciente', 'RUT', 'Edad', 'FICHA',
            'Diagnostico', 'Intervencion_propuesta', 'Condicion_LE'
        ];
        return campos.some(campo => {
            const val = fila[campo] || '';
            return val !== '' && val !== 'Seleccione';
        });
    }

    let contenidoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Registro Quirúrgico - ${diaNombre} Semana ${semanaNum}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    padding: 20px; 
                    background: white;
                    color: #1e293b;
                }
                @page { 
                    size: landscape;
                    margin: 15mm;
                }
                .membrete {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 15px 20px;
                    background: linear-gradient(135deg, #0b2a4f 0%, #1a6d8a 100%);
                    border-radius: 10px;
                    margin-bottom: 20px;
                    color: white;
                }
                .membrete .logo {
                    flex-shrink: 0;
                }
                .membrete .logo img {
                    height: 70px;
                    width: auto;
                    background: rgba(255,255,255,0.9);
                    padding: 4px;
                    border-radius: 6px;
                }
                .membrete .info {
                    flex: 1;
                }
                .membrete .info h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }
                .membrete .info .sub {
                    font-size: 0.9rem;
                    opacity: 0.85;
                }
                .membrete .info .fecha-dia {
                    font-size: 1rem;
                    font-weight: 600;
                    margin-top: 4px;
                }
                .titulo-pabellon {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #0b2a4f;
                    margin: 16px 0 8px 0;
                    padding: 6px 14px;
                    background: #e8f4fd;
                    border-radius: 6px;
                    display: inline-block;
                }
                .tabla-print {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.7rem;
                    margin-bottom: 16px;
                    table-layout: fixed;
                }
                .tabla-print th {
                    background: #1e293b;
                    color: white;
                    padding: 6px 4px;
                    text-align: center;
                    font-weight: 600;
                    font-size: 0.6rem;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    border: 1px solid #1e293b;
                }
                .tabla-print td {
                    padding: 4px 4px;
                    border: 1px solid #d1d9e6;
                    text-align: center;
                    font-size: 0.65rem;
                    vertical-align: middle;
                    word-wrap: break-word;
                }
                .tabla-print tr:nth-child(even) td {
                    background: #f8fafc;
                }
                .tabla-print .sin-datos {
                    text-align: center;
                    padding: 20px;
                    color: #94a3b8;
                    font-style: italic;
                }

                /* Anchos fijos — PAB 1 y PAB 2 idénticos */
                .tabla-print th:nth-child(1),  .tabla-print td:nth-child(1)  { width: 3%; }
                .tabla-print th:nth-child(2),  .tabla-print td:nth-child(2)  { width: 7%; }
                .tabla-print th:nth-child(3),  .tabla-print td:nth-child(3)  { width: 11%; }
                .tabla-print th:nth-child(4),  .tabla-print td:nth-child(4)  { width: 14%; }
                .tabla-print th:nth-child(5),  .tabla-print td:nth-child(5)  { width: 9%; }
                .tabla-print th:nth-child(6),  .tabla-print td:nth-child(6)  { width: 5%; }
                .tabla-print th:nth-child(7),  .tabla-print td:nth-child(7)  { width: 6%; }
                .tabla-print th:nth-child(8),  .tabla-print td:nth-child(8)  { width: 16%; }
                .tabla-print th:nth-child(9),  .tabla-print td:nth-child(9)  { width: 18%; }
                .tabla-print th:nth-child(10), .tabla-print td:nth-child(10) { width: 11%; }

                .footer-print {
                    margin-top: 20px;
                    padding-top: 12px;
                    border-top: 2px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.65rem;
                    color: #64748b;
                }
                .footer-print .left { text-align: left; }
                .footer-print .right { text-align: right; }

                @media print {
                    .no-print { display: none; }
                    body { padding: 0; }
                    .membrete { 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .tabla-print th {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .tabla-print tr:nth-child(even) td {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="membrete">
                <div class="logo">
                    <img src="logo.png" alt="Hospital de Illapel">
                </div>
                <div class="info">
                    <h1>📋 Tabla Quirúrgica · Registro</h1>
                    <div class="sub">Hospital Dr. Humberto Elorza Cortés · Illapel, Chile</div>
                    <div class="fecha-dia">${diaNombre} · Semana ${semanaNum}</div>
                </div>
            </div>
    `;

    PABS.forEach((pab, pIdx) => {
        const rows = dayData.pabs[pab] || [];
        const rowsConDatos = rows.filter(fila => filaTieneDatos(fila));

        contenidoHTML += `
            <div class="titulo-pabellon">🏥 ${pab}</div>
            <table class="tabla-print">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>FECHA</th>
                        <th>Especialidad</th>
                        <th>Nombre Paciente</th>
                        <th>RUT</th>
                        <th>Edad</th>
                        <th>FICHA</th>
                        <th>Diagnóstico</th>
                        <th>Intervención Propuesta</th>
                        <th>Condición LE</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (rowsConDatos.length === 0) {
            contenidoHTML += `
                <tr>
                    <td colspan="10" class="sin-datos">No hay registros en este pabellón</td>
                </tr>
            `;
        } else {
            rowsConDatos.forEach((fila, idx) => {
                contenidoHTML += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${fila.FECHA || ''}</td>
                        <td>${fila.Especialidad || ''}</td>
                        <td><strong>${fila.Nombre_Paciente || ''}</strong></td>
                        <td>${fila.RUT || ''}</td>
                        <td>${fila.Edad || ''}</td>
                        <td>${fila.FICHA || ''}</td>
                        <td>${fila.Diagnostico || ''}</td>
                        <td>${fila.Intervencion_propuesta || ''}</td>
                        <td>${fila.Condicion_LE || ''}</td>
                    </tr>
                `;
            });
        }

        contenidoHTML += `
                </tbody>
            </table>
        `;
    });

    const fechaActual = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL');
    contenidoHTML += `
            <div class="footer-print">
                <div class="left">
                    © Dr. Danilo A. Nava La C. · Jéfe del Proceso Quirúrgico
                </div>
                <div class="right">
                    Impreso: ${fechaActual} · Pabellón 1 y 2
                </div>
            </div>
        </body>
        </html>
    `;

    const ventana = window.open('', '_blank', 'width=1100,height=800,scrollbars=yes');
    if (ventana) {
        ventana.document.write(contenidoHTML);
        ventana.document.close();
        ventana.focus();
        let yaImpreso = false;
        ventana.addEventListener('load', function() {
            if (!yaImpreso) {
                yaImpreso = true;
                ventana.print();
            }
        });
        setTimeout(function() {
            if (!yaImpreso) {
                yaImpreso = true;
                ventana.print();
            }
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

    // =============================================================
    // FUNCIONES DE MANIPULACIÓN
    // =============================================================
    function agregarFila(pabKey) {
        const parts = pabKey.split('-').map(Number);
        if (parts.length !== 3) return;
        const [s, d, p] = parts;
        const semana = semanas[s];
        if (!semana) return;
        const day = semana[d];
        if (!day) return;
        const pabName = PABS[p];
        if (!pabName) return;
        const rows = day.pabs[pabName];
        if (!rows) return;

        const newRow = crearFilaVacia();
        // 🆔 Clave única generada por Firebase (no pisa nada, no hace red
        // todavía — solo reserva un ID) en vez de depender de la posición
        // en este arreglo LOCAL. Antes, si dos usuarios agregaban fila casi
        // al mismo tiempo, ambos calculaban la misma "próxima fila" (ej.
        // la 6ª) y el guardado de Firebase quedaba en la misma clave — el
        // segundo en guardar borraba por completo los datos del primero.
        // Con un _pushId propio desde el momento en que se crea, dos altas
        // simultáneas ya no pueden competir por el mismo lugar (ver
        // guardarDiaEnFirebaseOptimizadoConModal/guardarPabellonEnFirebaseOptimizadoConModal
        // en js/02, que usan _pushId para la clave de guardado cuando existe).
        newRow._pushId = database.ref('registros_quirurgicos').push().key;
        // 📍 La clave nueva (fila_{pushId}) ya no codifica semana/día/pabellón
        // como sí hacía la clave por posición — viaja con la fila para que
        // iniciarSincronizacionTiempoReal()/cargarDatosDesdeFirebase() (js/03)
        // sepan dónde colocarla en los navegadores de los demás usuarios.
        newRow._ubicacion = pabKey;
        rows.push(newRow);
        renderWeekView();
    }

    async function eliminarFila(rowKey) {
        const confirmed = await showModal({
            title: '⚠️ Eliminar fila',
            message: '¿Estás seguro de que deseas eliminar esta fila?<br><strong>Esta acción no se puede deshacer.</strong>',
            icon: '🗑️',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (!confirmed) return;

        const parts = rowKey.split('-').map(Number);
        if (parts.length !== 4) return;
        const [s, d, p, f] = parts;
        if (isNaN(s) || isNaN(d) || isNaN(p) || isNaN(f)) return;

        const semana = semanas[s];
        if (!semana) return;
        const day = semana[d];
        if (!day) return;
        const pabName = PABS[p];
        if (!pabName) return;
        const rows = day.pabs[pabName];
        if (!rows || !rows[f]) return;

        // 🩺 Si esta fila estaba vinculada a un paciente de Lista de Espera,
        // se pierde su lugar en la Tabla sin quedar registrado en ninguna
        // otra parte (a diferencia de Reubicar/Diferir, que trasladan el
        // vínculo) — hay que avisarle a Lista de Espera antes de perder la
        // referencia, para que no se quede mostrando "Programado en Tabla"
        // para siempre ni oculte el botón "Cargar a la Tabla".
        const filaAEliminar = rows[f];
        if (filaAEliminar && filaAEliminar['LE_PacienteKey'] && typeof leActualizarEstatusPaciente === 'function') {
            await leActualizarEstatusPaciente(
                filaAEliminar['LE_PacienteKey'],
                'En Lista de Espera',
                'Fila eliminada de la Tabla Quirúrgica',
                'Sin ubicación en la tabla'
            );
        }

        const docId = obtenerDocIdDeFila(filaAEliminar, rowKey);
        if (docId) {
            try {
                await database.ref('registros_quirurgicos/' + docId).remove();
                console.log(`✅ Fila ${docId} eliminada de Firebase`);
            } catch (error) {
                console.error('❌ Error al eliminar fila de Firebase:', error);
            }
        }

        rows.splice(f, 1);
        renderWeekView();
    }

     // =============================================================
    // FUNCION LIMPIAR PABELLON
    // =============================================================

    async function limpiarPabellon(pabKey) {
    const confirmed = await showModal({
        title: '⚠️ Limpiar pabellón',
        message: '¿Estás seguro de que deseas limpiar todas las filas de este pabellón?<br><strong>Los datos se perderán.</strong>',
        icon: '🗑️',
        confirmText: 'Limpiar',
        cancelText: 'Cancelar',
        type: 'danger'
    });

    if (!confirmed) return;

    const parts = pabKey.split('-').map(Number);
    if (parts.length !== 3) return;
    const [s, d, p] = parts;
    const semana = semanas[s];
    if (!semana) return;
    const day = semana[d];
    if (!day) return;
    const pabName = PABS[p];
    if (!pabName) return;
    const rows = day.pabs[pabName];
    if (!rows) return;

    // 🩺 Avisar a Lista de Espera antes de perder los vínculos (ver
    // leResetearVinculosAntesDeLimpiar() en js/31).
    await leResetearVinculosAntesDeLimpiar(rows);

    // ✅ 1. Limpiar los datos en memoria
    rows.forEach(row => {
        COLS.forEach(col => {
            if (col === 'FECHA') {
                row[col] = '';
            } else if (col === 'ESTADO_DE_IQx') {
                row[col] = 'Seleccione';
            } else if (col === 'Tipo_Actividad') {
                row[col] = '';
            } else if (col === 'Tipo_Actividad_2') {
                row[col] = '';
            } else if (col === 'Tipo_Actividad_3') {
                row[col] = '';
            } else if (col === 'DESTINO') {
                row[col] = 'Seleccione';
            } else if (col === 'Jornada') {
                row[col] = 'Seleccione';
            } else if (col === 'Especialidad') {
                row[col] = 'Seleccione';
            } else {
                row[col] = '';
            }
        });
        row['Ya_Diferido'] = false;
        row['Ya_Reubicado'] = false;
        row['LE_PacienteKey'] = '';
        row['WhatsApp_Enviado'] = false;
        row['WhatsApp_UltimoEnvio'] = null;
    });

    // ✅ 2. UNA SOLA LLAMADA A FIREBASE
    const updates = {};
    for (let fIdx = 0; fIdx < rows.length; fIdx++) {
        const rowKey = `${s}-${d}-${p}-${fIdx}`;
        const docId = obtenerDocIdDeFila(rows[fIdx], rowKey);
        if (docId && currentUser) {
            updates[`registros_quirurgicos/${docId}`] = {
                ...rows[fIdx],
                metadata: {
                    ultimo_editor: currentUserEmail,
                    ultima_modificacion: firebase.database.ServerValue.TIMESTAMP,
                    estado: 'temporal'
                }
            };
        }
    }

    try {
        await database.ref().update(updates);
        console.log(`✅ Pabellón ${pabName} limpiado (${rows.length} filas)`);
    } catch (error) {
        console.error('❌ Error al limpiar pabellón:', error);
    }

    renderWeekView();
}


     // =============================================================
    // FUNCION LIMPIAR DIA
    // =============================================================
    async function limpiarDia(dayKey) {
    const confirmed = await showModal({
        title: '⚠️ Limpiar día',
        message: '¿Estás seguro de que deseas limpiar todas las filas de este día?<br><strong>Los datos se perderán.</strong>',
        icon: '🗑️',
        confirmText: 'Limpiar',
        cancelText: 'Cancelar',
        type: 'danger'
    });

    if (!confirmed) return;

    const parts = dayKey.split('-').map(Number);
    if (parts.length !== 2) return;
    const [s, d] = parts;
    const semana = semanas[s];
    if (!semana) return;
    const day = semana[d];
    if (!day) return;

    // 🩺 Avisar a Lista de Espera antes de perder los vínculos, de TODAS
    // las filas de TODOS los pabellones de este día (ver
    // leResetearVinculosAntesDeLimpiar() en js/31).
    const todasLasFilasDelDia = [];
    PABS.forEach((pab) => {
        const rows = day.pabs[pab];
        if (rows) todasLasFilasDelDia.push(...rows);
    });
    await leResetearVinculosAntesDeLimpiar(todasLasFilasDelDia);

    // ✅ 1. Limpiar los datos en memoria
    PABS.forEach((pab) => {
        const rows = day.pabs[pab];
        if (!rows) return;
        rows.forEach(row => {
            COLS.forEach(col => {
                if (col === 'FECHA') {
                    row[col] = '';
                } else if (col === 'ESTADO_DE_IQx') {
                    row[col] = 'Seleccione';
                } else if (col === 'Tipo_Actividad') {
                    row[col] = '';
                } else if (col === 'Tipo_Actividad_2') {
                    row[col] = '';
                } else if (col === 'Tipo_Actividad_3') {
                    row[col] = '';
                } else if (col === 'DESTINO') {
                    row[col] = 'Seleccione';
                } else if (col === 'Jornada') {
                    row[col] = 'Seleccione';
                } else if (col === 'Especialidad') {
                    row[col] = 'Seleccione';
                } else {
                    row[col] = '';
                }
            });
            row['Ya_Diferido'] = false;
            row['Ya_Reubicado'] = false;
            row['LE_PacienteKey'] = '';
            row['WhatsApp_Enviado'] = false;
            row['WhatsApp_UltimoEnvio'] = null;
        });
    });

    // ✅ 2. UNA SOLA LLAMADA A FIREBASE PARA TODAS LAS FILAS
    const updates = {};
    for (let pIdx = 0; pIdx < PABS.length; pIdx++) {
        const pabName = PABS[pIdx];
        const rows = day.pabs[pabName] || [];
        for (let fIdx = 0; fIdx < rows.length; fIdx++) {
            const rowKey = `${s}-${d}-${pIdx}-${fIdx}`;
            const docId = obtenerDocIdDeFila(rows[fIdx], rowKey);
            if (docId && currentUser) {
                updates[`registros_quirurgicos/${docId}`] = {
                    ...rows[fIdx],
                    metadata: {
                        ultimo_editor: currentUserEmail,
                        ultima_modificacion: firebase.database.ServerValue.TIMESTAMP,
                        estado: 'temporal'
                    }
                };
            }
        }
    }

    try {
        await database.ref().update(updates);
        console.log(`✅ Día ${DIAS[d]} limpiado`);
    } catch (error) {
        console.error('❌ Error al limpiar día:', error);
    }

    renderWeekView();
}

    // =============================================================
    // 📤 DIFERIR FILA A PACIENTES DIFERIDOS
    // =============================================================
    async function diferirFila(rowKey) {
        if (!currentUser) {
            showModal({
                title: '⛔ No autenticado',
                message: 'Debes iniciar sesión para diferir un paciente.',
                icon: '⛔',
                confirmText: 'Aceptar'
            });
            return;
        }

        const claveIngresada = await showModalClave();
        if (!claveIngresada) return;

        if (claveIngresada !== '1234') {
            showModal({
                title: '❌ Clave incorrecta',
                message: 'La clave ingresada no es correcta. Intenta nuevamente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
            return;
        }

        const parts = rowKey.split('-').map(Number);
        if (parts.length !== 4) {
            showModal({
                title: '❌ Error',
                message: 'Clave de fila inválida.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
            return;
        }

        const [semanaIdx, diaIdx, pabIdx, filaIdx] = parts;
        const semana = semanas[semanaIdx];
        if (!semana) return;
        const day = semana[diaIdx];
        if (!day) return;
        const pabName = PABS[pabIdx];
        if (!pabName) return;
        const rows = day.pabs[pabName];
        if (!rows || !rows[filaIdx]) return;

        const fila = rows[filaIdx];
        const esSuspendido = fila['ESTADO_DE_IQx'] === 'SUSPENDIDO' || fila['ESTADO_DE_IQx'] === 'CONDICIONAL (NO OPERADO)';

        const camposACopiar = [
            'FECHA', 'T_Qx', 'Jornada', 'Cirujano', 'Especialidad',
            'Anestesista', 'Nombre_Paciente', 'RUT', 'Edad', 'FICHA',
            'Diagnostico', 'Intervencion_propuesta', 'Condicion_LE',
            // 🩺 Vínculo con Lista de Espera (ver js/31-le-bridge-cargar-a-tabla.js):
            // viaja con el paciente hacia "Pacientes Diferidos" para que, si
            // más adelante se Reintegra, la sincronización de estatus siga
            // funcionando desde la fila nueva.
            'LE_PacienteKey'
        ];

        const tieneDatos = camposACopiar.some(campo => {
            const valor = fila[campo] || '';
            return valor !== '' && valor !== 'Seleccione';
        });

        if (!tieneDatos) {
            showModal({
                title: 'ℹ️ Fila vacía',
                message: 'No hay datos para diferir en esta fila.',
                icon: 'ℹ️',
                confirmText: 'Aceptar'
            });
            return;
        }

        const mensajeConfirmacion = esSuspendido ?
            `¿Estás seguro de diferir al paciente <strong>${fila.Nombre_Paciente || 'sin nombre'}</strong>?<br><br>📌 Se copiarán los datos a "Pacientes Diferidos".<br>📌 <strong>⚠️ El estado (${fila['ESTADO_DE_IQx']}) hace que NO se elimine de la tabla</strong> — permanece en esta fila.<br>📌 Después de diferir, los botones ⏩ y 🔄 de esta fila quedarán bloqueados (para evitar que el paciente quede duplicado).` :
            `¿Estás seguro de diferir al paciente <strong>${fila.Nombre_Paciente || 'sin nombre'}</strong>?<br><br>📌 Se copiarán los datos a "Pacientes Diferidos".<br>📌 La fila actual se limpiará.`;

        const confirmado = await showModal({
            title: '📤 Diferir Paciente',
            message: mensajeConfirmacion,
            icon: '📤',
            confirmText: '✅ Diferir',
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (!confirmado) return;

        try {
            const datosDiferidos = {};
            camposACopiar.forEach(campo => {
                datosDiferidos[campo] = fila[campo] || '';
            });
            datosDiferidos['ESTADO_DE_IQx'] = fila['ESTADO_DE_IQx'] || '';
            datosDiferidos['Motivo'] = fila['Motivo'] || '';

            datosDiferidos.metadata = {
                diferido_por: currentUserEmail,
                fecha_diferido: firebase.database.ServerValue.TIMESTAMP,
                origen: rowKey,
                estado: 'pendiente'
            };

            const newRef = database.ref('pacientes_diferidos').push();
            await newRef.set(datosDiferidos);
            console.log(`✅ Paciente diferido guardado en Firebase`);

            // 🩺 Si esta fila estaba vinculada a Lista de Espera y NO es el
            // caso SUSPENDIDO/CONDICIONAL (ese ya quedó sincronizado por el
            // listener de ESTADO_DE_IQx antes de llegar acá, con el estatus
            // SUSPENDIDO/CONDICIONAL correcto — no lo pisamos), se fija un
            // estatus explícito de "En Lista de Diferidos", porque el
            // paciente ya no está físicamente en la tabla.
            if (!esSuspendido && datosDiferidos['LE_PacienteKey'] && typeof leActualizarEstatusPaciente === 'function') {
                await leActualizarEstatusPaciente(
                    datosDiferidos['LE_PacienteKey'],
                    'En Lista de Diferidos',
                    'Diferido desde la Tabla Quirúrgica',
                    'Pendiente de reubicar en la Tabla Quirúrgica'
                );
            }

            if (!esSuspendido) {
                camposACopiar.forEach(campo => {
                    fila[campo] = '';
                });
                fila['ESTADO_DE_IQx'] = 'Seleccione';
                fila['Motivo'] = '';
                // Por si la fila había quedado marcada como ya diferida/reubicada
                // en un ciclo SUSPENDIDO/CONDICIONAL anterior sobre esta misma fila.
                fila['Ya_Diferido'] = false;
                fila['Ya_Reubicado'] = false;
                // 🩺 El vínculo con Lista de Espera ya viajó a datosDiferidos
                // (arriba, vía camposACopiar) — esta fila origen se limpia
                // para reutilizarse, así que pierde su propia copia del
                // vínculo (queda activo en "Pacientes Diferidos" hasta que
                // se Reintegre en otra fila).
                fila['LE_PacienteKey'] = '';
                fila['WhatsApp_Enviado'] = false;
                fila['WhatsApp_UltimoEnvio'] = null;

                const rowKeyOriginal = `${semanaIdx}-${diaIdx}-${pabIdx}-${filaIdx}`;
                const docId = obtenerDocIdDeFila(fila, rowKeyOriginal);
                if (docId) {
                    const filaVacia = {};
                    COLS.forEach(col => {
                        if (col === 'ESTADO_DE_IQx') {
                            filaVacia[col] = 'Seleccione';
                        } else if (col === 'DESTINO') {
                            filaVacia[col] = 'Seleccione';
                        } else if (col === 'Jornada') {
                            filaVacia[col] = 'Seleccione';
                        } else if (col === 'Especialidad') {
                            filaVacia[col] = 'Seleccione';
                        } else {
                            filaVacia[col] = '';
                        }
                    });
                    filaVacia['Color'] = fila['Color'] || '';
                    filaVacia['Ya_Diferido'] = false;
                    filaVacia['Ya_Reubicado'] = false;
                    filaVacia['LE_PacienteKey'] = '';
                    filaVacia['WhatsApp_Enviado'] = false;
                    filaVacia['WhatsApp_UltimoEnvio'] = null;
                    await database.ref('registros_quirurgicos/' + docId).update(filaVacia);
                    console.log(`✅ Fila ${docId} limpiada en Firebase`);
                }
            } else {
                const rowKeyOriginal = `${semanaIdx}-${diaIdx}-${pabIdx}-${filaIdx}`;
                const docId = obtenerDocIdDeFila(fila, rowKeyOriginal);
                if (docId) {
                    // Se bloquean AMBOS botones (no solo Diferir): evita que
                    // el paciente termine duplicado si además se reubica esta
                    // misma fila después de haber sido diferida.
                    fila['Ya_Diferido'] = true;
                    fila['Ya_Reubicado'] = true;
                    // 🩺 El vínculo con Lista de Espera ya viajó a
                    // datosDiferidos — esta fila origen queda preservada
                    // pero inerte (bloqueada), así que también pierde su
                    // propia copia del vínculo (evita que dos copias del
                    // mismo paciente empujen estatus distintos a la vez).
                    fila['LE_PacienteKey'] = '';
                    await guardarFilaEnFirebase(rowKeyOriginal, fila);
                    console.log(`✅ Fila ${docId} actualizada en Firebase (SUSPENDIDO - no se elimina, Diferir y Reubicar bloqueados)`);
                }
            }

            renderWeekView();

            const mensajeExito = esSuspendido ?
                `El paciente <strong>${datosDiferidos.Nombre_Paciente || 'sin nombre'}</strong> ha sido diferido correctamente.<br><br>📌 Por su estado (${datosDiferidos.ESTADO_DE_IQx}), permanece en esta fila de la tabla.<br>📌 Los botones Diferir y Reubicar de esta fila quedan bloqueados.<br>📌 Puedes verlo en la sección "Pacientes Diferidos".` :
                `El paciente <strong>${datosDiferidos.Nombre_Paciente || 'sin nombre'}</strong> ha sido diferido correctamente.<br><br>📌 Puedes verlo en la sección "Pacientes Diferidos".`;

            showModal({
                title: '✅ Paciente Diferido',
                message: mensajeExito,
                icon: '✅',
                confirmText: 'Aceptar'
            });

        } catch (error) {
            console.error('❌ Error al diferir paciente:', error);
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al diferir el paciente.<br>Intenta nuevamente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
    }

    function showModalClave() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box" style="max-width: 380px;">
                    <span class="modal-icon">🔐</span>
                    <div class="modal-title">Ingresar Clave</div>
                    <div class="modal-message">
                        Ingresa la clave para diferir este paciente:
                    </div>
                    <input type="password" id="claveInput" placeholder="Ingresa la clave" 
                           style="width:100%; padding:12px 16px; border:2px solid #e2e8f0; border-radius:12px; font-size:1rem; margin-bottom:20px; box-sizing:border-box; background:#f8fafc; text-align:center; letter-spacing:4px; font-size:1.2rem;">
                    <div id="claveError" style="color:#dc2626; font-size:0.9rem; margin-bottom:12px; min-height:24px;"></div>
                    <div class="modal-actions">
                        <button class="modal-btn modal-btn-cancel" id="claveCancelar">Cancelar</button>
                        <button class="modal-btn modal-btn-success" id="claveConfirmar">✅ Verificar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const input = overlay.querySelector('#claveInput');
            const errorDiv = overlay.querySelector('#claveError');
            const confirmarBtn = overlay.querySelector('#claveConfirmar');
            const cancelarBtn = overlay.querySelector('#claveCancelar');

            let isResolved = false;

            function cerrar(result) {
                if (isResolved) return;
                isResolved = true;
                const box = overlay.querySelector('.modal-box');
                box.classList.add('closing');
                overlay.classList.add('closing');
                setTimeout(() => {
                    overlay.remove();
                    resolve(result);
                }, 300);
            }

            function verificarClave() {
                const clave = input.value.trim();
                if (!clave) {
                    errorDiv.textContent = '❌ Ingresa la clave';
                    return;
                }
                cerrar(clave);
            }

            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    verificarClave();
                }
                if (e.key === 'Escape') {
                    cerrar(null);
                }
            });

            confirmarBtn.addEventListener('click', verificarClave);
            cancelarBtn.addEventListener('click', function() {
                cerrar(null);
            });

            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    cerrar(null);
                }
            });

            setTimeout(() => input.focus(), 100);
        });
    }

    // =============================================================
    // 🔄 REUBICAR PACIENTE EN LA TABLA
    // =============================================================
    async function mostrarModalReubicar(rowKeyOrigen) {
        const parts = rowKeyOrigen.split('-').map(Number);
        if (parts.length !== 4) {
            showModal({
                title: '❌ Error',
                message: 'Clave de fila inválida.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
            return;
        }

        const [semanaIdx, diaIdx, pabIdx, filaIdx] = parts;
        const semana = semanas[semanaIdx];
        if (!semana) return;
        const day = semana[diaIdx];
        if (!day) return;
        const pabName = PABS[pabIdx];
        if (!pabName) return;
        const rows = day.pabs[pabName];
        if (!rows || !rows[filaIdx]) return;

        const fila = rows[filaIdx];

        const camposACopiar = [
            'FECHA', 'T_Qx', 'Jornada', 'Cirujano', 'Especialidad',
            'Anestesista', 'Nombre_Paciente', 'RUT', 'Edad', 'FICHA',
            'Diagnostico', 'Intervencion_propuesta', 'Condicion_LE'
        ];

        const tieneDatos = camposACopiar.some(campo => {
            const valor = fila[campo] || '';
            return valor !== '' && valor !== 'Seleccione';
        });

        if (!tieneDatos) {
            showModal({
                title: 'ℹ️ Fila vacía',
                message: 'No hay datos para reubicar en esta fila.',
                icon: 'ℹ️',
                confirmText: 'Aceptar'
            });
            return;
        }

        const nombrePaciente = fila.Nombre_Paciente || 'sin nombre';

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width: 500px;">
                <span class="modal-icon">🔄</span>
                <div class="modal-title">Reubicar Paciente</div>
                <div class="modal-message">
                    Reubicar a <strong>${nombrePaciente}</strong>
                    <br><br>
                    Selecciona el destino en la tabla quirúrgica:
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
                    <div>
                        <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Semana</label>
                        <select id="reubicarSemana" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                            ${semanas.map((_, idx) => `<option value="${idx}">Semana ${idx + 1}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Día</label>
                        <select id="reubicarDia" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                            ${DIAS.map((dia, idx) => `<option value="${idx}">${dia}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Pabellón</label>
                        <select id="reubicarPab" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                            ${PABS.map((pab, idx) => `<option value="${idx}">${pab}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Fila</label>
                        <select id="reubicarFila" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                            ${Array.from({length: 10}, (_, i) => `<option value="${i}">Fila ${i + 1}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div id="reubicarError" style="color:#dc2626; font-size:0.9rem; margin-bottom:12px; min-height:24px;"></div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="reubicarCancelar">Cancelar</button>
                    <button class="modal-btn modal-btn-success" id="reubicarConfirmar">✅ Reubicar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const semanaSelect = overlay.querySelector('#reubicarSemana');
        const diaSelect = overlay.querySelector('#reubicarDia');
        const pabSelect = overlay.querySelector('#reubicarPab');
        const filaSelect = overlay.querySelector('#reubicarFila');
        const errorDiv = overlay.querySelector('#reubicarError');
        const confirmarBtn = overlay.querySelector('#reubicarConfirmar');
        const cancelarBtn = overlay.querySelector('#reubicarCancelar');

        let isResolved = false;

        function cerrar() {
            if (isResolved) return;
            isResolved = true;
            const box = overlay.querySelector('.modal-box');
            box.classList.add('closing');
            overlay.classList.add('closing');
            setTimeout(() => overlay.remove(), 300);
        }

        confirmarBtn.addEventListener('click', async function() {
            console.log('🔄 Confirmar reubicación - INICIO');
            const semanaDestino = parseInt(semanaSelect.value);
            const diaDestino = parseInt(diaSelect.value);
            const pabDestino = parseInt(pabSelect.value);
            const filaDestino = parseInt(filaSelect.value);
            console.log('🔄 Destino:', semanaDestino, diaDestino, pabDestino, filaDestino);

            const semana = semanas[semanaDestino];
            if (!semana) {
                errorDiv.textContent = '❌ Semana inválida';
                return;
            }
            const day = semana[diaDestino];
            if (!day) {
                errorDiv.textContent = '❌ Día inválido';
                return;
            }
            const pabNameDestino = PABS[pabDestino];
            if (!pabNameDestino) {
                errorDiv.textContent = '❌ Pabellón inválido';
                return;
            }
            const rowsDestino = day.pabs[pabNameDestino];
            if (!rowsDestino || filaDestino >= rowsDestino.length) {
                errorDiv.textContent = '❌ La fila destino no existe. Agrega más filas primero.';
                return;
            }

            if (semanaDestino === semanaIdx && diaDestino === diaIdx && pabDestino === pabIdx && filaDestino === filaIdx) {
                errorDiv.textContent = '❌ No puedes reubicar en la misma fila.';
                return;
            }

            cerrar();
            await reubicarPaciente(rowKeyOrigen, semanaDestino, diaDestino, pabDestino, filaDestino);
        });

        cancelarBtn.addEventListener('click', cerrar);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) cerrar();
        });
    }

    async function reubicarPaciente(rowKeyOrigen, semanaDestino, diaDestino, pabDestino, filaDestino) {
    try {
        console.log('🔄 reubicarPaciente - INICIO');
        console.log('🔄 rowKeyOrigen:', rowKeyOrigen);
        console.log('🔄 Destino:', semanaDestino, diaDestino, pabDestino, filaDestino);

        const parts = rowKeyOrigen.split('-').map(Number);
        const [semanaIdx, diaIdx, pabIdx, filaIdx] = parts;

        const semanaOrigen = semanas[semanaIdx];
        const dayOrigen = semanaOrigen[diaIdx];
        const pabNameOrigen = PABS[pabIdx];
        const rowsOrigen = dayOrigen.pabs[pabNameOrigen];
        const filaOrigen = rowsOrigen[filaIdx];

        // Guardar el Color antes de limpiar
        const colorOriginal = filaOrigen['Color'] || '';

        // Verificar si es SUSPENDIDO
        const esSuspendido = filaOrigen['ESTADO_DE_IQx'] === 'SUSPENDIDO' || filaOrigen['ESTADO_DE_IQx'] === 'CONDICIONAL (NO OPERADO)';

        const semana = semanas[semanaDestino];
        const day = semana[diaDestino];
        const pabNameDestino = PABS[pabDestino];
        const rowsDestino = day.pabs[pabNameDestino];
        const filaDestinoData = rowsDestino[filaDestino];

        // Verificar si la fila destino tiene datos
        const tieneDatos = CAMPOS_A_COPIAR.some(campo => {
            const valor = filaDestinoData[campo] || '';
            return valor !== '' && valor !== 'Seleccione';
        });

        if (tieneDatos) {
            const confirmarSobrescritura = await showModal({
                title: '⚠️ Fila ocupada',
                message: 'La fila destino ya tiene datos.<br><br>¿Deseas sobrescribirla?',
                icon: '⚠️',
                confirmText: '✅ Sobrescribir',
                cancelText: 'Cancelar',
                type: 'danger'
            });

            if (!confirmarSobrescritura) return;
        }

        // Copiar solo los campos indicados
        CAMPOS_A_COPIAR.forEach(campo => {
            filaDestinoData[campo] = filaOrigen[campo] || '';
        });

        // También copiar el Color
        filaDestinoData['Color'] = colorOriginal;

        console.log('✅ Datos copiados a destino');

        // Guardar fila destino en Firebase
        const rowKeyDestino = `${semanaDestino}-${diaDestino}-${pabDestino}-${filaDestino}`;
        await guardarFilaEnFirebase(rowKeyDestino, filaDestinoData);

        // 🩺 Si la fila origen estaba vinculada a un paciente de Lista de
        // Espera (CAMPOS_A_COPIAR incluye LE_PacienteKey, así que ya viajó
        // a filaDestinoData más arriba), el vínculo "se muda" con el
        // paciente: se sincroniza el estatus/ubicación en Lista de Espera
        // contra la fila NUEVA (ver js/31-le-bridge-cargar-a-tabla.js). Esto
        // cubre el caso "estaba SUSPENDIDO/CONDICIONAL y lo reubiqué": el
        // estatus vuelve a "Programado en Tabla" con la ubicación nueva,
        // porque filaDestinoData no copia ESTADO_DE_IQx (no está en
        // CAMPOS_A_COPIAR), así que parte en blanco en el destino.
        if (filaDestinoData['LE_PacienteKey'] && typeof leSincronizarEstatusDesdeFila === 'function') {
            const ubicacionDestino = `Semana ${semanaDestino + 1} - ${DIAS[diaDestino]} - ${pabNameDestino} - Fila ${filaDestino + 1}`;
            await leSincronizarEstatusDesdeFila(filaDestinoData, ubicacionDestino);
        }

        // Si NO es SUSPENDIDO → limpiar TODA la fila origen
        if (!esSuspendido) {
            console.log('🧹 Limpiando fila origen completa (no SUSPENDIDO)');

            // Limpiar TODOS los campos en memoria
            COLS.forEach(col => {
                if (col === 'ESTADO_DE_IQx' || col === 'DESTINO' || col === 'Jornada' || col === 'Especialidad') {
                    filaOrigen[col] = 'Seleccione';
                } else if (col === 'Color') {
                    filaOrigen[col] = colorOriginal;
                } else {
                    filaOrigen[col] = '';
                }
            });
            // Por si la fila había quedado marcada como ya diferida/reubicada
            // en un ciclo SUSPENDIDO/CONDICIONAL anterior sobre esta misma fila.
            filaOrigen['Ya_Diferido'] = false;
            filaOrigen['Ya_Reubicado'] = false;
            filaOrigen['LE_PacienteKey'] = '';
            filaOrigen['WhatsApp_Enviado'] = false;
            filaOrigen['WhatsApp_UltimoEnvio'] = null;

            // Eliminar el nodo completo de Firebase
            const rowKeyOrigenClean = `${semanaIdx}-${diaIdx}-${pabIdx}-${filaIdx}`;
            const docId = obtenerDocIdDeFila(filaOrigen, rowKeyOrigenClean);
            if (docId) {
                await database.ref('registros_quirurgicos/' + docId).set(null);
                console.log(`✅ Fila origen ${docId} eliminada de Firebase`);
            }
        } else {
            // Si es SUSPENDIDO → preservar fila origen. Se bloquean AMBOS
            // botones (no solo Reubicar): evita que el paciente termine
            // duplicado si además se difiere esta misma fila después de
            // haber sido reubicada.
            console.log('🛑 Paciente SUSPENDIDO - preservando fila origen (Diferir y Reubicar bloqueados)');
            const rowKeyOrigenClean = `${semanaIdx}-${diaIdx}-${pabIdx}-${filaIdx}`;
            filaOrigen['Ya_Diferido'] = true;
            filaOrigen['Ya_Reubicado'] = true;
            // 🩺 El vínculo con Lista de Espera se mudó al destino (arriba);
            // esta fila origen queda inerte (bloqueada) y ya no debe seguir
            // empujando cambios de estatus.
            filaOrigen['LE_PacienteKey'] = '';
            await guardarFilaEnFirebase(rowKeyOrigenClean, filaOrigen);
        }

        console.log('🔄 Renderizando tabla...');
        renderWeekView(false);

        showModal({
            title: '✅ Paciente reubicado',
            message: `El paciente <strong>${filaDestinoData.Nombre_Paciente || 'sin nombre'}</strong> ha sido reubicado a:<br><br>📅 Semana ${semanaDestino + 1} - ${DIAS[diaDestino]}<br>🏥 ${pabNameDestino} - Fila ${filaDestino + 1}` +
                (esSuspendido ? `<br><br>⚠️ Por su estado (${filaOrigen['ESTADO_DE_IQx']}), la fila original NO se eliminó — los botones ⏩ y 🔄 de esa fila quedan bloqueados.` : ''),
            icon: '✅',
            confirmText: 'Aceptar'
        });

        console.log('🔄 reubicarPaciente - FIN');

    } catch (error) {
        console.error('❌ Error al reubicar paciente:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al reubicar el paciente.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}