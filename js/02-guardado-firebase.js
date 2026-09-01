    // -------------------------------------------------------------
    // CONFIGURACIÓN
    // -------------------------------------------------------------
    const DIAS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
    const PABS = ['PAB 1', 'PAB 2'];
    const FILAS_INICIALES = 5;

    // =============================================================
    // ⏱️ GUARDADO AUTOMÁTICO CADA 10 MINUTOS
    // =============================================================
    let autoSaveInterval = null;
    let autoSaveTimeout = null;
    let isAutoSaving = false;

    // Configuración
    const AUTO_SAVE_INTERVAL = 10 * 60 * 1000; // 10 minutos en milisegundos
    // 🐢→🐇 Antes eran 60 segundos completos de inactividad — y ese
    // temporizador es GLOBAL (una sola cuenta regresiva para toda la
    // tabla, ver triggerAutoSave() más abajo), así que cualquier edición
    // en OTRA fila lo reiniciaba: si el usuario seguía trabajando, sus
    // cambios podían tardar varios minutos en siquiera guardarse (no ya en
    // sincronizarse) — de ahí que a otros usuarios les llegara "muy
    // lento". 2 segundos sigue agrupando las pulsaciones de una misma
    // palabra/campo en un solo guardado, sin esperar a que la persona
    // termine de trabajar en toda la tabla.
    const DEBOUNCE_DELAY = 2000;

// =============================================================
// 💾 GUARDAR DÍA OPTIMIZADO (UNA SOLA LLAMADA A FIREBASE)
// =============================================================
// alertarFechaFaltante: además de mostrarModal (guardado manual, que SIEMPRE
// bloquea con alerta), el autoguardado periódico de 10 minutos también debe
// avisar — a diferencia del autoguardado por inactividad (60s después de
// cada cambio), que se queda en silencio para no interrumpir mientras el
// usuario está recién tipeando. Ver iniciarAutoSave() / triggerAutoSave().
async function guardarDiaEnFirebaseOptimizadoConModal(dayKey, mostrarModal = true, alertarFechaFaltante = false) {
    if (!currentUser) {
        console.warn('⚠️ No hay usuario autenticado');
        return;
    }

    if (isAutoSaving) {
        console.log('⏳ Ya hay un guardado en progreso...');
        return;
    }

    const [semanaIdx, diaIdx] = dayKey.split('-').map(Number);
    const dayData = semanas[semanaIdx]?.[diaIdx];
    if (!dayData) {
        console.warn('⚠️ Día no encontrado:', dayKey);
        return;
    }

    // 📅 FECHA obligatoria: solo bloquea el guardado EXPLÍCITO (mostrarModal)
    // — ahí no se guarda nada hasta corregirlo. El autoguardado (periódico de
    // 10 min o por inactividad) NUNCA se salta ni bloquea una fila por falta
    // de fecha — es la red de seguridad contra pérdida de datos mientras el
    // usuario todavía está tipeando, así que siempre persiste lo que haya.
    // El autoguardado periódico (alertarFechaFaltante) además muestra un
    // aviso no bloqueante, como recordatorio; el de inactividad no avisa,
    // para no interrumpir cada 60s mientras se está tipeando.
    if (mostrarModal || alertarFechaFaltante) {
        const filasParaRevisar = [];
        PABS.forEach(pab => (dayData.pabs[pab] || []).forEach(f => filasParaRevisar.push(f)));
        const faltantes = obtenerFilasSinFechaObligatoria(filasParaRevisar);
        if (faltantes.length > 0) {
            mostrarAlertaFechaFaltante(faltantes.length);
            if (mostrarModal) return;
        }
    }

    const updates = {};
    let filasConDatos = 0;
    let filasEliminadas = 0;

    // 🛟 El guardado manual (mostrarModal=true, botón "Guardar Día") guarda
    // TODO lo visible — es una acción explícita del usuario. El autoguardado
    // (mostrarModal=false, tanto el de 10 minutos como el de inactividad)
    // SOLO debe re-guardar filas que ESTA pestaña sabe que tiene editadas
    // sin guardar (filasConCambiosSinGuardar) — de lo contrario, una pestaña
    // con una copia local desactualizada de este día (ej. quedó abierta toda
    // la noche) reescribe esa copia vieja sobre Firebase cada vez que el
    // temporizador dispara, pisando lo que otros usuarios guardaron mientras
    // tanto.
    for (let pIdx = 0; pIdx < PABS.length; pIdx++) {
        const pabName = PABS[pIdx];
        const rows = dayData.pabs[pabName] || [];

        for (let fIdx = 0; fIdx < rows.length; fIdx++) {
            const rowKey = `${semanaIdx}-${diaIdx}-${pIdx}-${fIdx}`;
            if (!mostrarModal && !filasConCambiosSinGuardar.has(rowKey)) continue;

            const fila = rows[fIdx];
            // 🆔 Filas agregadas con "➕ Agregar Fila" (js/08) ya traen su
            // propia clave única de Firebase (_pushId) — se usa esa en vez
            // de la clave por posición, para que dos altas simultáneas de
            // distintos usuarios nunca compitan por el mismo lugar.
            const docId = obtenerDocIdDeFila(fila, rowKey);
            if (!docId) continue;

            const tieneDatos = Object.entries(fila).some(([campo, v]) =>
                campo !== '_pushId' && campo !== '_ubicacion' && v && v !== '' && v !== 'Seleccione'
            );

            if (tieneDatos) {
                filasConDatos++;

                // Limpiar RUT antes de guardar
                const filaLimpia = { ...fila };
                if (filaLimpia.RUT) {
                    filaLimpia.RUT = String(filaLimpia.RUT)
                        .replace(/[.\-]/g, '')
                        .replace(/[^0-9kK]/g, '')
                        .toUpperCase();
                }

                updates[`registros_quirurgicos/${docId}`] = {
                    ...filaLimpia,
                    metadata: {
                        ultimo_editor: currentUserEmail,
                        ultima_modificacion: firebase.database.ServerValue.TIMESTAMP,
                        estado: 'temporal'
                    }
                };
            } else {
                // Fila vacía → eliminar de Firebase
                updates[`registros_quirurgicos/${docId}`] = null;
                filasEliminadas++;
            }
        }
    }

    // Si no hay nada que guardar ni eliminar, salir
    if (filasConDatos === 0 && filasEliminadas === 0) {
        if (mostrarModal) {
            showModal({
                title: 'ℹ️ Sin datos',
                message: `No hay datos para guardar en el día ${DIAS[diaIdx]}.`,
                icon: 'ℹ️',
                confirmText: 'Aceptar'
            });
        }
        return;
    }

    isAutoSaving = true;
    
    let modalOverlay = null;
    if (mostrarModal) {
        modalOverlay = mostrarModalGuardando();
    }

    try {
        await database.ref().update(updates);
        // 🛟 Guardado confirmado en Firebase: las filas de ESTE día ya están
        // a salvo — el listener en tiempo real vuelve a poder actualizarlas
        // con normalidad (las de otros días, si las hubiera, no se tocan).
        for (const rk of [...filasConCambiosSinGuardar]) {
            if (rk.startsWith(`${semanaIdx}-${diaIdx}-`)) {
                filasConCambiosSinGuardar.delete(rk);
                limpiarEdicionEnCurso(rk);
            }
        }

        if (mostrarModal) {
            console.log(`✅ ${filasConDatos} filas guardadas, ${filasEliminadas} eliminadas en ${DIAS[diaIdx]}`);
        } else {
            console.log(`🕒 Auto-save: ${filasConDatos} guardadas, ${filasEliminadas} eliminadas en ${DIAS[diaIdx]}`);
        }

        if (modalOverlay) {
            cerrarModalGuardando(modalOverlay);
        }

        if (mostrarModal) {
            showModal({
                title: '💾 Guardado exitoso',
                message: `Se guardaron ${filasConDatos} filas del día ${DIAS[diaIdx]}.<br><br>📌 Datos sincronizados en tiempo real.`,
                icon: '💾',
                confirmText: 'Aceptar'
            });
        }
        
        isAutoSaving = false;
        
    } catch (error) {
        console.error('❌ Error al guardar día:', error);
        
        if (modalOverlay) {
            cerrarModalGuardando(modalOverlay);
        }
        
        if (mostrarModal) {
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al guardar los datos.<br>Intenta nuevamente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
        
        isAutoSaving = false;
    }
}

// =============================================================
// 💾 GUARDAR PABELLÓN OPTIMIZADO
// =============================================================
async function guardarPabellonEnFirebaseOptimizadoConModal(pabKey, mostrarModal = true) {
    if (!currentUser) {
        console.warn('⚠️ No hay usuario autenticado');
        return;
    }

    if (isAutoSaving) {
        console.log('⏳ Ya hay un guardado en progreso...');
        return;
    }

    const parts = pabKey.split('-').map(Number);
    if (parts.length !== 3) return;
    const [semanaIdx, diaIdx, pabIdx] = parts;

    const dayData = semanas[semanaIdx]?.[diaIdx];
    if (!dayData) return;

    const pabName = PABS[pabIdx];
    const rows = dayData.pabs[pabName] || [];

    // 📅 FECHA obligatoria antes de guardar el pabellón (ver
    // guardarDiaEnFirebaseOptimizadoConModal para el mismo criterio).
    const faltantes = obtenerFilasSinFechaObligatoria(rows);
    if (faltantes.length > 0) {
        if (mostrarModal) mostrarAlertaFechaFaltante(faltantes.length);
        return;
    }

    const updates = {};
    let filasConDatos = 0;
    let filasEliminadas = 0;

    for (let fIdx = 0; fIdx < rows.length; fIdx++) {
        const fila = rows[fIdx];
        const rowKey = `${semanaIdx}-${diaIdx}-${pabIdx}-${fIdx}`;
        // 🆔 Ver guardarDiaEnFirebaseOptimizadoConModal — misma lógica de
        // clave única para filas agregadas con "➕ Agregar Fila".
        const docId = obtenerDocIdDeFila(fila, rowKey);
        if (!docId) continue;

        const tieneDatos = Object.entries(fila).some(([campo, v]) =>
            campo !== '_pushId' && campo !== '_ubicacion' && v && v !== '' && v !== 'Seleccione'
        );

        if (tieneDatos) {
            filasConDatos++;

            // Limpiar RUT antes de guardar
            const filaLimpia = { ...fila };
            if (filaLimpia.RUT) {
                filaLimpia.RUT = String(filaLimpia.RUT)
                    .replace(/[.\-]/g, '')
                    .replace(/[^0-9kK]/g, '')
                    .toUpperCase();
            }

            updates[`registros_quirurgicos/${docId}`] = {
                ...filaLimpia,
                metadata: {
                    ultimo_editor: currentUserEmail,
                    ultima_modificacion: firebase.database.ServerValue.TIMESTAMP,
                    estado: 'temporal'
                }
            };
        } else {
            // Fila vacía → eliminar de Firebase
            updates[`registros_quirurgicos/${docId}`] = null;
            filasEliminadas++;
        }
    }

    if (filasConDatos === 0 && filasEliminadas === 0) {
        if (mostrarModal) {
            showModal({
                title: 'ℹ️ Sin datos',
                message: `No hay datos para guardar en ${pabName}.`,
                icon: 'ℹ️',
                confirmText: 'Aceptar'
            });
        }
        return;
    }

    isAutoSaving = true;
    let modalOverlay = null;
    if (mostrarModal) {
        modalOverlay = mostrarModalGuardando();
    }

    try {
        await database.ref().update(updates);

        // 🛟 Guardado confirmado en Firebase: las filas de ESTE pabellón ya
        // están a salvo — el listener en tiempo real vuelve a poder
        // actualizarlas con normalidad (las del otro pabellón, si las
        // hubiera, no se tocan).
        for (const rk of [...filasConCambiosSinGuardar]) {
            if (rk.startsWith(`${semanaIdx}-${diaIdx}-${pabIdx}-`)) {
                filasConCambiosSinGuardar.delete(rk);
                limpiarEdicionEnCurso(rk);
            }
        }

        if (mostrarModal) {
            console.log(`✅ ${filasConDatos} filas guardadas, ${filasEliminadas} eliminadas en ${pabName}`);
        } else {
            console.log(`🕒 Auto-save: ${filasConDatos} guardadas, ${filasEliminadas} eliminadas en ${pabName}`);
        }
        
        if (modalOverlay) {
            cerrarModalGuardando(modalOverlay);
        }

        if (mostrarModal) {
            showModal({
                title: '💾 Guardado exitoso',
                message: `Se guardaron ${filasConDatos} filas del ${pabName}.`,
                icon: '💾',
                confirmText: 'Aceptar'
            });
        }

        isAutoSaving = false;

    } catch (error) {
        console.error('❌ Error al guardar pabellón:', error);
        if (modalOverlay) {
            cerrarModalGuardando(modalOverlay);
        }
        if (mostrarModal) {
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al guardar los datos.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
        isAutoSaving = false;
    }
}

// =============================================================
// 🕒 DISPARADOR DE GUARDADO AUTOMÁTICO
// =============================================================
function triggerAutoSave(rowKey) {
    // 🛟 Esta fila tiene un cambio sin guardar desde ahora — ver el Set en
    // js/01 para el detalle de qué protege exactamente (solo esta fila, no
    // toda la tabla).
    if (rowKey && !filasConCambiosSinGuardar.has(rowKey)) {
        // 👥 Recién empieza a editarse esta fila (no en cada tecla) — avisa
        // a los demás por si alguien más la está editando también.
        marcarEdicionEnCurso(rowKey);
    }
    if (rowKey) filasConCambiosSinGuardar.add(rowKey);

    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        console.log('🔄 Auto-save reiniciado (nuevo cambio detectado)');
    } else {
        console.log('🔄 Auto-save iniciado (esperando inactividad)');
    }

    autoSaveTimeout = setTimeout(() => {
        if (!currentUser) {
            // No hay sesión — no hay dónde guardar. Se limpia el Set para no
            // seguir bloqueando el listener por filas que ya no se pueden
            // persistir.
            filasConCambiosSinGuardar.forEach(limpiarEdicionEnCurso);
            filasConCambiosSinGuardar.clear();
            return;
        }

        // 🛟 Guarda TODOS los días que tengan filas pendientes, no solo el
        // que está a la vista en este momento (currentWeek/currentDay). Si
        // el usuario editó el Lunes y cambió a ver el Martes antes de que
        // pasaran los 60s, antes el cambio del Lunes se perdía (nunca se
        // guardaba) y esa fila quedaba trabada sin sincronizar con los
        // demás usuarios para siempre — ver filasConCambiosSinGuardar en
        // js/01 y su uso en iniciarSincronizacionTiempoReal (js/03).
        const diasPendientes = new Set();
        filasConCambiosSinGuardar.forEach(rowKey => {
            const partes = rowKey.split('-');
            diasPendientes.add(`${partes[0]}-${partes[1]}`);
        });

        console.log(`🕒 Ejecutando auto-save (${diasPendientes.size} día(s) con cambios pendientes)`);

        // Las filas de cada día se quitan del Set DENTRO de
        // guardarDiaEnFirebaseOptimizadoConModal, justo cuando el guardado
        // en Firebase realmente termina bien. Uno por uno (no en paralelo):
        // guardarDiaEnFirebaseOptimizadoConModal usa la bandera global
        // isAutoSaving para no solaparse consigo misma — si se llamara para
        // varios días a la vez, todas menos la primera se saltarían
        // pensando que ya había un guardado en curso.
        (async () => {
            for (const dayKey of diasPendientes) {
                await guardarDiaEnFirebaseOptimizadoConModal(dayKey, false);
            }
            if (seccionActiva === 'registro') renderWeekView(true);
        })();
    }, DEBOUNCE_DELAY);
}

// =============================================================
// 👥 AVISO DE EDICIÓN SIMULTÁNEA (misma fila, dos usuarios a la vez)
// =============================================================
// NO es un bloqueo real — dos personas SÍ pueden seguir editando la misma
// fila al mismo tiempo, y el guardado sigue siendo "toda la fila", así que
// quien guarda último se queda con los cambios de la otra persona en esa
// fila (ver la conversación sobre este límite). Esto solo avisa para que
// se den cuenta y se coordinen. Ver iniciarEscuchaEdicionEnCurso() y
// aplicarAvisosEdicionEnCurso() en js/03, que leen esta marca y pintan el
// aviso sobre la fila en las pantallas de los demás usuarios.
// Cada usuario escribe en SU PROPIA clave dentro de edicion_en_curso/{docId}
// (no en el docId directamente) — con un solo valor por fila, el segundo
// usuario en escribir SOBRESCRIBÍA al primero: solo quedaba registrado el
// último, así que el otro nunca veía el aviso y, si el que quedó registrado
// guardaba (borrando esa única marca), el aviso desaparecía para todos
// aunque la otra persona siguiera editando. Con una clave por usuario,
// ambos quedan registrados a la vez y cada uno borra solo la suya al
// guardar, sin afectar la marca de la otra persona.
function marcarEdicionEnCurso(rowKey) {
    if (!currentUser || !currentUserEmail) return;
    // 🆔 obtenerFilaPorRowKey()/obtenerDocIdDeFila() (js/03) — para filas con
    // clave única (_pushId) usan esa en vez de la derivada de la posición.
    const docId = obtenerDocIdDeFila(obtenerFilaPorRowKey(rowKey), rowKey);
    if (!docId) return;
    const miClave = claveEdicionEnCurso(currentUserEmail);
    const ref = database.ref(`edicion_en_curso/${docId}/${miClave}`);
    ref.set({ usuario: currentUserEmail, ts: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
    // Si se cierra la pestaña o se corta la conexión sin guardar (y por lo
    // tanto sin pasar por limpiarEdicionEnCurso), esto evita que el aviso
    // quede pegado para siempre en las pantallas de los demás.
    ref.onDisconnect().remove().catch(() => {});
}

// Firebase no permite '.', '#', '$', '[' ni ']' en las claves — un correo
// como "juan.perez@hospital.cl" necesita reemplazarlos para poder usarse
// como clave. El correo real igual queda guardado en el VALOR (campo
// "usuario"), así que esto no necesita revertirse para mostrarlo.
function claveEdicionEnCurso(email) {
    return (email || 'anonimo').replace(/[.#$\[\]]/g, ',');
}

function limpiarEdicionEnCurso(rowKey) {
    if (!currentUserEmail) return;
    const docId = obtenerDocIdDeFila(obtenerFilaPorRowKey(rowKey), rowKey);
    if (!docId) return;
    const miClave = claveEdicionEnCurso(currentUserEmail);
    database.ref(`edicion_en_curso/${docId}/${miClave}`).remove().catch(() => {});
}

function verificarSiHayDatos(dayKey) {
    const [semanaIdx, diaIdx] = dayKey.split('-').map(Number);
    const dayData = semanas[semanaIdx]?.[diaIdx];
    if (!dayData) return false;

    for (const pab of PABS) {
        const rows = dayData.pabs[pab] || [];
        for (const fila of rows) {
            const tieneDatos = Object.values(fila).some(v => 
                v && v !== '' && v !== 'Seleccione'
            );
            if (tieneDatos) return true;
        }
    }
    return false;
}

// =============================================================
// 🎯 ASIGNAR EVENTOS DELEGADOS (INPUT, CHANGE, OBSERVACIONES)
// =============================================================
function asignarEventosDelegados() {
    // 1️⃣ EVENTOS DE INPUT EN TODOS LOS CAMPOS (incluye textareas de intervención)
    document.querySelectorAll('#weekContent input[data-col], #weekContent select[data-col], #weekContent textarea[data-col]').forEach(input => {
        // Evitar duplicar eventos
        if (input.dataset._listener) return;
        input.dataset._listener = 'true';

        // Función para guardar el valor
        function guardarValor(elemento) {
            const rowKey = elemento.dataset.rowkey;
            const col = elemento.dataset.col;
            let value = elemento.value;

            if (!rowKey || !col) return;

            // Si es textarea de intervención, obtener el valor limpio
            if (elemento.classList.contains('intervencion-input') || elemento.classList.contains('intervencion-textarea')) {
                value = elemento.value || '';
            }

            const parts = rowKey.split('-').map(Number);
            if (parts.length === 4) {
                const [s, d, p, f] = parts;
                const semana = semanas[s];
                if (semana) {
                    const day = semana[d];
                    if (day) {
                        const pabName = PABS[p];
                        if (pabName) {
                            const rows = day.pabs[pabName];
                            if (rows && rows[f]) {
                                rows[f][col] = value;
                            }
                        }
                    }
                }
            }
            triggerAutoSave(rowKey);
        }

        input.addEventListener('input', function() {
            guardarValor(this);
        });

        // Para selects, también escuchar change
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', function() {
                guardarValor(this);
            });
        }
    });

    // 2️⃣ EVENTOS ESPECIALES: FECHAS (formateo)
    document.querySelectorAll('#weekContent input[data-col="FECHA"]').forEach(input => {
        if (input.dataset._listenerFecha) return;
        input.dataset._listenerFecha = 'true';

        input.addEventListener('change', function() {
            if (this.value) {
                const [anio, mes, dia] = this.value.split('-');
                const fechaFormateada = `${dia}/${mes}/${anio}`;
                const rowKey = this.dataset.rowkey;
                if (rowKey) {
                    const parts = rowKey.split('-').map(Number);
                    if (parts.length === 4) {
                        const [s, d, p, f] = parts;
                        const semana = semanas[s];
                        if (semana) {
                            const day = semana[d];
                            if (day) {
                                const pabName = PABS[p];
                                if (pabName) {
                                    const rows = day.pabs[pabName];
                                    if (rows && rows[f]) {
                                        rows[f]['FECHA'] = fechaFormateada;
                                    }
                                }
                            }
                        }
                    }
                }
                triggerAutoSave(rowKey);
            }
        });
    });

   // 3️⃣ EVENTOS ESPECIALES: RUT (validación con ícono)
document.querySelectorAll('#weekContent input[data-col="RUT"]').forEach(input => {
    if (input.dataset._listenerRut) return;
    input.dataset._listenerRut = 'true';

    function actualizarIconoRut(inputElement) {
        const rowKey = inputElement.dataset.rowkey;
        const icon = document.querySelector(`.rut-validation-icon[data-rowkey="${rowKey}"]`);
        if (!icon) return;

        const valor = inputElement.value || '';
        const rutSinPuntos = valor.replace(/[.\-]/g, '');

        if (rutSinPuntos.length >= 8) {
            const valido = validarRut(valor);
            icon.textContent = valido ? '✅' : '❌';
            icon.style.color = valido ? '#10b981' : '#dc2626';
            icon.className = `rut-validation-icon ${valido ? 'valid' : 'invalid'}`;
            inputElement.style.borderColor = valido ? '#10b981' : '#dc2626';
            inputElement.style.backgroundColor = valido ? '#f0fdf4' : '#fef2f2';
        } else {
            icon.textContent = '';
            icon.style.color = '';
            icon.className = 'rut-validation-icon';
            inputElement.style.borderColor = '#d1d9e6';
            inputElement.style.backgroundColor = 'white';
        }
    }

    input.addEventListener('input', function() {
        let valor = this.value;
        let limpio = valor.replace(/[.\-]/g, '').replace(/[^0-9Kk]/g, '').toUpperCase();
        
        // Formatear siempre
        const formateado = formatearRut(limpio);
        this.value = formateado;
        
        // Guardar en memoria el valor formateado
        const rowKey = this.dataset.rowkey;
        if (rowKey) {
            const parts = rowKey.split('-').map(Number);
            if (parts.length === 4) {
                const [s, d, p, f] = parts;
                if (semanas[s]?.[d]?.pabs[PABS[p]]?.[f]) {
                    semanas[s][d].pabs[PABS[p]][f]['RUT'] = formateado;
                }
            }
        }

        actualizarIconoRut(this);
        triggerAutoSave(rowKey);
    });

    input.addEventListener('blur', function() {
        actualizarIconoRut(this);
    });

    // Validar al cargar si ya tiene valor
    if (input.value && input.value.replace(/[.\-]/g, '').length >= 8) {
        setTimeout(() => actualizarIconoRut(input), 50);
    }
});

    // 4️⃣ EVENTOS ESPECIALES: HORA DE ENTRADA Y SALIDA (cálculo automático de T_QX)
    document.querySelectorAll('#weekContent input[data-col="Hora_de_entrada"], #weekContent input[data-col="Hora_de_salida"]').forEach(input => {
        if (input.dataset._listenerHora) return;
        input.dataset._listenerHora = 'true';

        input.addEventListener('change', function() {
            const rowKey = this.dataset.rowkey;
            if (!rowKey) return;

            const tr = this.closest('tr');
            if (!tr) return;

            const entradaInput = tr.querySelector('input[data-col="Hora_de_entrada"]');
            const salidaInput = tr.querySelector('input[data-col="Hora_de_salida"]');
            const tqxInput = tr.querySelector('input[data-col="T_QX"]');

            if (entradaInput && salidaInput && tqxInput) {
                const entrada = entradaInput.value;
                const salida = salidaInput.value;
                if (entrada && salida) {
                    const duracion = calcularDuracion(entrada, salida);
                    tqxInput.value = duracion;

                    // Guardar en memoria
                    const parts = rowKey.split('-').map(Number);
                    if (parts.length === 4) {
                        const [s, d, p, f] = parts;
                        const semana = semanas[s];
                        if (semana) {
                            const day = semana[d];
                            if (day) {
                                const pabName = PABS[p];
                                if (pabName) {
                                    const rows = day.pabs[pabName];
                                    if (rows && rows[f]) {
                                        rows[f]['T_QX'] = duracion;
                                    }
                                }
                            }
                        }
                    }
                    triggerAutoSave(rowKey);
                }
            }
        });
    });

    // 5️⃣ OBSERVACIONES - autoajuste de altura
    document.querySelectorAll('#weekContent .observaciones-textarea').forEach(textarea => {
        if (textarea.dataset._listenerObs) return;
        textarea.dataset._listenerObs = 'true';

        function ajustarAltura(el) {
            el.style.height = 'auto';
            let nuevaAltura = el.scrollHeight;
            if (nuevaAltura < 30) nuevaAltura = 30;
            if (nuevaAltura > 80) nuevaAltura = 80;
            el.style.height = nuevaAltura + 'px';
        }

        textarea.addEventListener('input', function() {
            ajustarAltura(this);
            // También guardar el valor
            const rowKey = this.dataset.rowkey;
            const col = this.dataset.col;
            if (rowKey && col) {
                const parts = rowKey.split('-').map(Number);
                if (parts.length === 4) {
                    const [s, d, p, f] = parts;
                    const semana = semanas[s];
                    if (semana) {
                        const day = semana[d];
                        if (day) {
                            const pabName = PABS[p];
                            if (pabName) {
                                const rows = day.pabs[pabName];
                                if (rows && rows[f]) {
                                    rows[f][col] = this.value;
                                }
                            }
                        }
                    }
                }
                triggerAutoSave(rowKey);
            }
        });

        setTimeout(() => ajustarAltura(textarea), 100);
    });

    // 6️⃣ ESPECIAL: INTERVENCIONES - También escuchar cambios en los textareas generados por crearComboboxIntervenciones
    document.querySelectorAll('#weekContent .intervencion-textarea, #weekContent .intervencion-input').forEach(textarea => {
        // Si ya tiene listener, saltar
        if (textarea.dataset._listenerInterv) return;
        textarea.dataset._listenerInterv = 'true';

        textarea.addEventListener('input', function() {
            const rowKey = this.dataset.rowkey;
            const col = this.dataset.col;
            const value = this.value || '';

            if (!rowKey || !col) return;

            const parts = rowKey.split('-').map(Number);
            if (parts.length === 4) {
                const [s, d, p, f] = parts;
                const semana = semanas[s];
                if (semana) {
                    const day = semana[d];
                    if (day) {
                        const pabName = PABS[p];
                        if (pabName) {
                            const rows = day.pabs[pabName];
                            if (rows && rows[f]) {
                                rows[f][col] = value;

                                // También actualizar el Tipo_Actividad correspondiente
                                let tipoField = '';
                                if (col === '1ra_Intervencion_Qx_Realizada') tipoField = 'Tipo_Actividad';
                                else if (col === '2da_Intervencion_Qx_Realizada') tipoField = 'Tipo_Actividad_2';
                                else if (col === '3ra_Intervencion_Realizada') tipoField = 'Tipo_Actividad_3';

                                if (tipoField) {
                                    const tipo = obtenerTipoActividad(value);
                                    rows[f][tipoField] = tipo;

                                    // Actualizar el display en la UI
                                    const display = this.closest('td')?.querySelector('.edit-tipo-actividad-display');
                                    if (display) {
                                        display.textContent = tipo || 'Seleccione intervención';
                                    }
                                }
                            }
                        }
                    }
                }
            }
            triggerAutoSave(rowKey);
        });

        // También escuchar change (para cuando se selecciona del dropdown)
        textarea.addEventListener('change', function() {
            // Disparar el mismo evento
            this.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });

    // 7️⃣ EVENTOS ESPECIALES: ESPECIALIDAD (repoblar el <select> de Cirujano
    // de la misma fila, ya que la lista de médicos depende de la
    // especialidad elegida — ver obtenerMedicosPorEspecialidadCache() en
    // js/12). Al cambiar la especialidad se reinicia Cirujano a "Seleccione"
    // porque el médico anterior puede no pertenecer a la nueva lista.
    document.querySelectorAll('#weekContent select[data-col="Especialidad"]').forEach(select => {
        if (select.dataset._listenerEspecialidad) return;
        select.dataset._listenerEspecialidad = 'true';

        select.addEventListener('change', function() {
            const tr = this.closest('tr');
            const cirujanoSelect = tr?.querySelector('select[data-col="Cirujano"]');
            if (!cirujanoSelect) return;

            const opciones = obtenerMedicosPorEspecialidadCache(this.value);
            cirujanoSelect.innerHTML = generarOptions(['Seleccione', ...opciones], 'Seleccione');
            cirujanoSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    // 8️⃣ EVENTOS ESPECIALES: ESTADO_DE_IQx → sincronizar con Lista de
    // Espera. (El bloqueo/desbloqueo al instante de Diferir/Reubicar lo
    // resuelve el listener de ESTADO_DE_IQx en js/14-render-principal.js,
    // que ya existía para la lógica de Causal_de_suspension — ver el
    // comentario ahí sobre por qué se corrigió justo ese, y no se duplica
    // la misma actualización acá.)
    // Si la fila está vinculada a un paciente de Lista de Espera
    // (fila['LE_PacienteKey'], asignado por "Cargar a la Tabla" en
    // js/31-le-bridge-cargar-a-tabla.js), sincroniza en tiempo real el
    // estatusTabla de ese paciente allá.
    document.querySelectorAll('#weekContent select[data-col="ESTADO_DE_IQx"]').forEach(select => {
        if (select.dataset._listenerEstado) return;
        select.dataset._listenerEstado = 'true';

        select.addEventListener('change', function() {
            const rowKey = this.dataset.rowkey;
            if (!rowKey) return;
            const parts = rowKey.split('-').map(Number);
            if (parts.length !== 4) return;
            const [s, d, p, f] = parts;
            const semana = semanas[s];
            const day = semana && semana[d];
            const pabName = PABS[p];
            const fila = day && pabName && day.pabs[pabName] && day.pabs[pabName][f];
            if (!fila) return;

            if (fila['LE_PacienteKey'] && typeof leSincronizarEstatusDesdeFila === 'function') {
                const ubicacion = `Semana ${s + 1} - ${DIAS[d]} - ${pabName} - Fila ${f + 1}`;
                leSincronizarEstatusDesdeFila(fila, ubicacion);
            }
        });
    });

    console.log('✅ Eventos delegados asignados correctamente');
}



// =============================================================
// 🔄 VALIDAR TODOS LOS RUT AL CARGAR LA TABLA
// =============================================================
function validarTodosLosRut() {
    document.querySelectorAll('#weekContent input[data-col="RUT"]').forEach(input => {
        const rowKey = input.dataset.rowkey;
        const icon = document.querySelector(`.rut-validation-icon[data-rowkey="${rowKey}"]`);
        if (!icon) return;

        const valor = input.value || '';
        const rutSinPuntos = valor.replace(/[.\-]/g, '');
        
        // ✅ Si tiene al menos 8 dígitos (7-8 dígitos del cuerpo + DV)
        if (rutSinPuntos.length >= 8) {
            const valido = validarRut(valor);
            icon.textContent = valido ? '✅' : '❌';
            icon.style.color = valido ? '#10b981' : '#dc2626';
            icon.className = `rut-validation-icon ${valido ? 'valid' : 'invalid'}`;
            input.style.borderColor = valido ? '#10b981' : '#dc2626';
            input.style.backgroundColor = valido ? '#f0fdf4' : '#fef2f2';
        } else {
            icon.textContent = '';
            icon.style.color = '';
            icon.className = 'rut-validation-icon';
            input.style.borderColor = '#d1d9e6';
            input.style.backgroundColor = 'white';
        }
    });
}

// =============================================================
// ⏱️ INICIAR/DETENER GUARDADO AUTOMÁTICO
// =============================================================
function iniciarAutoSave() {
    detenerAutoSave();

    autoSaveInterval = setInterval(() => {
        if (seccionActiva === 'registro' && currentUser) {
            const dayKey = `${currentWeek}-${currentDay}`;
            if (!isAutoSaving) {
                console.log('🕒 Guardado automático programado (10 minutos)');
                guardarDiaEnFirebaseOptimizadoConModal(dayKey, false, true).then(() => {
    renderWeekView(true); // ← true = auto-save, mantener scroll
});
            }
        }
    }, AUTO_SAVE_INTERVAL);

    console.log(`✅ Guardado automático activado (cada ${AUTO_SAVE_INTERVAL / 60000} minutos)`);
}

function detenerAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
    }
    console.log('⏹️ Guardado automático detenido');
}






    // Nombres de columnas SIN ESPACIOS para Firebase

    const COLS = [
        'Color', 'FECHA', 'T_Qx', 'Jornada', 'Cirujano', 'Especialidad', 'Anestesista',
        'Nombre_Paciente', 'RUT', 'Edad', 'FICHA', 'Diagnostico',
        'Intervencion_propuesta', 'Condicion_LE', 'ESTADO_DE_IQx',
        '1ra_Intervencion_Qx_Realizada', 'Tipo_Actividad',
        '2da_Intervencion_Qx_Realizada', 'Tipo_Actividad_2',
        '3ra_Intervencion_Realizada', 'Tipo_Actividad_3',
        'Causal_de_suspension', 'Motivo', 'Observaciones',
        'T_Retraso', 'Hora_de_entrada', 'Hora_de_salida', 'T_QX', 'DESTINO'
    ];