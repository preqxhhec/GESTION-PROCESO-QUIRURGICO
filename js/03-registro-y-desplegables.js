
    const COLS_INTERVENCION = [
        '1ra_Intervencion_Qx_Realizada',
        '2da_Intervencion_Qx_Realizada',
        '3ra_Intervencion_Realizada'
    ];

    const COL_CLASSES = {
        'Color': 'col-color',
        'FECHA': 'col-fecha',
        'T_Qx': 'col-hora',
        'RUT': 'col-rut',
        'Edad': 'col-edad',
        'FICHA': 'col-ficha',
        'Nombre_Paciente': 'col-nombre',
        'ESTADO_DE_IQx': 'col-estado',
        'DESTINO': 'col-destino',
        'Hora_de_entrada': 'col-hora',
        'Hora_de_salida': 'col-hora',
        'T_QX': 'col-hora',
        'T_Retraso': 'col-hora',
        '1ra_Intervencion_Qx_Realizada': 'col-intervencion',
        '2da_Intervencion_Qx_Realizada': 'col-intervencion',
        '3ra_Intervencion_Realizada': 'col-intervencion'
    };


// =============================================================
// 📋 COLUMNAS A COPIAR EN REUBICAR Y REINTEGRAR
// =============================================================
const CAMPOS_A_COPIAR = [
    'Especialidad',
    'Anestesista',
    'Nombre_Paciente',
    'RUT',
    'Edad',
    'FICHA',
    'Diagnostico',
    'Intervencion_propuesta',
    'Condicion_LE',
    // 🩺 Vínculo con Lista de Espera (patients/{key} en Firebase, ver
    // js/31-le-bridge-cargar-a-tabla.js). Va acá para que Reubicar/
    // Reintegrar lo trasladen junto con el resto de los datos de la fila;
    // en filas que nunca vinieron de Lista de Espera simplemente viaja
    // vacío, sin efecto.
    'LE_PacienteKey'
];

// =============================================================
// 📋 CACHÉ DE DESPLEGABLES PARA MEJORAR RENDIMIENTO
// =============================================================
let desplegablesCache = {};

async function cargarDesplegablesCache() {
    const keys = ['Jornada', 'ESTADO_DE_IQx', 'DESTINO', 'Especialidad', 'Anestesista'];
    for (const key of keys) {
        try {
            const snapshot = await database.ref('desplegables/' + key).once('value');
            const data = snapshot.val();
            desplegablesCache[key] = (data && Array.isArray(data) && data.length > 0) 
                ? data 
                : DESPLEGABLES_CONFIG[key]?.opciones || ['Seleccione'];
        } catch (error) {
            console.error('❌ Error cargando desplegable ' + key + ':', error);
            desplegablesCache[key] = DESPLEGABLES_CONFIG[key]?.opciones || ['Seleccione'];
        }
    }
    console.log('✅ Desplegables cacheados:', Object.keys(desplegablesCache));
}

function obtenerOpcionesCache(key) {
    return desplegablesCache[key] || ['Seleccione'];
}



    function getFirebaseKey(rowKey) {
        const parts = rowKey.split('-');
        if (parts.length === 4) {
            const [semana, dia, pab, fila] = parts.map(Number);
            return `semana_${semana + 1}_dia_${dia}_pab_${pab}_fila_${fila}`;
        }
        return null;
    }

    async function guardarFilaEnFirebase(rowKey, datos) {
    if (!currentUser) {
        console.warn('⚠️ No hay usuario autenticado');
        return false;
    }
    const docId = getFirebaseKey(rowKey);
    if (!docId) {
        console.warn('⚠️ Clave inválida:', rowKey);
        return false;
    }
    try {
        
        const datosLimpios = { ...datos };
        if (datosLimpios.RUT !== undefined && datosLimpios.RUT !== null && datosLimpios.RUT !== '') {
            const rutStr = String(datosLimpios.RUT);
            datosLimpios.RUT = rutStr.replace(/[.\-]/g, '');
        }
        
                
        const dataToSave = {
            ...datosLimpios,
            metadata: {
                ultimo_editor: currentUserEmail,
                ultima_modificacion: firebase.database.ServerValue.TIMESTAMP,
                estado: 'temporal'
            }
        };
        await database.ref('registros_quirurgicos/' + docId).update(dataToSave);
        console.log(`✅ Fila ${docId} guardada en Firebase`);
        return true;
    } catch (error) {
        console.error('❌ Error al guardar fila:', error);
        return false;
    }
}







// =============================================================
// 📋 REGISTRAR DEFINITIVO
// =============================================================


    async function registrarDefinitivo(dayKey) {
    if (!currentUser) {
        showModal({
            title: '⛔ No autenticado',
            message: 'Debes iniciar sesión para realizar esta acción.',
            icon: '⛔',
            confirmText: 'Aceptar'
        });
        return;
    }
    if (!esAdministrador()) {
        showModal({
            title: '⛔ Acceso denegado',
            message: 'Solo los administradores pueden registrar definitivamente.<br><br>Contacta al administrador del sistema.',
            icon: '⛔',
            confirmText: 'Aceptar'
        });
        return;
    }

    const [semanaIdx, diaIdx] = dayKey.split('-').map(Number);
    const semanaData = semanas[semanaIdx];
    const dayData = semanaData[diaIdx];
    const diaNombre = DIAS[diaIdx];
    let tieneDatos = false;
    let filasConDatos = [];

    PABS.forEach((pab, pabIdx) => {
        const rows = dayData.pabs[pab] || [];
        rows.forEach((fila, filaIdx) => {
            const hayDatos = Object.values(fila).some(v => v && v !== '' && v !== 'Seleccione');
            if (hayDatos) {
                tieneDatos = true;
                filasConDatos.push({
                    pabIdx,
                    filaIdx,
                    pab: pab,
                    data: { ...fila }
                });
            }
        });
    });

    if (!tieneDatos) {
        showModal({
            title: '📋 Día sin datos',
            message: `No hay datos para registrar en ${diaNombre}.<br>No es necesario registrar un día vacío.`,
            icon: 'ℹ️',
            confirmText: 'Aceptar'
        });
        return;
    }

    // 📅 FECHA obligatoria: un registro definitivo (archivado permanente) no
    // puede quedar sin fecha.
    const faltantes = obtenerFilasSinFechaObligatoria(filasConDatos.map(item => item.data));
    if (faltantes.length > 0) {
        mostrarAlertaFechaFaltante(faltantes.length);
        return;
    }

    const confirmed = await showModal({
        title: '📋 Registrar Día Definitivamente',
        message: `¿Estás seguro de registrar definitivamente el día <strong>${diaNombre}</strong>?<br><br>` +
            `📌 Los datos se archivarán permanentemente.<br>` +
            `📌 El día se limpiará automáticamente.<br>` +
            `📌 Los nuevos registros empezarán desde cero.<br><br>` +
            `<strong>Esta acción no se puede deshacer.</strong>`,
        icon: '⚠️',
        confirmText: '✅ Registrar y limpiar',
        cancelText: 'Cancelar',
        type: 'danger'
    });

    if (!confirmed) return;

    try {
        showModal({
            title: '⏳ Procesando...',
            message: 'Archivando datos y limpiando el día...',
            icon: '⏳',
            confirmText: 'Esperar'
        });

        let archivados = 0;
        const fechaRegistro = new Date().toISOString();
        const diaSemana = DIAS[diaIdx];
        const semanaNum = semanaIdx + 1;

        // ✅ 1. ARCHIVAR EN registros_definitivos
        for (const item of filasConDatos) {
            const { pabIdx, filaIdx, pab, data } = item;

            // Limpiar RUT antes de archivar (solo dígitos)
            const dataLimpia = { ...data };
            if (dataLimpia.RUT) {
                dataLimpia.RUT = String(dataLimpia.RUT)
                    .replace(/[.\-]/g, '')
                    .replace(/[^0-9kK]/g, '')
                    .toUpperCase();
            }

            const definitivoData = {
                ...dataLimpia,
                metadata: {
                    semana: semanaNum,
                    dia: diaSemana,
                    dia_idx: diaIdx,
                    pabellon: pab,
                    pabellon_idx: pabIdx,
                    fila: filaIdx + 1,
                    registrado_por: currentUserEmail,
                    fecha_registro: fechaRegistro,
                    estado: 'definitivo'
                }
            };
            const newRef = database.ref('registros_definitivos').push();
            await newRef.set(definitivoData);
            archivados++;
        }
        console.log(`✅ ${archivados} registros archivados en registros_definitivos`);

        // ✅ 2. ELIMINAR TODAS las filas de ese día en Firebase (más robusto)
        const updates = {};
        const filasAEliminar = [];

        PABS.forEach((pab, pabIdx) => {
            const rows = dayData.pabs[pab] || [];
            rows.forEach((fila, filaIdx) => {
                const rowKey = `${semanaIdx}-${diaIdx}-${pabIdx}-${filaIdx}`;
                const docId = getFirebaseKey(rowKey);
                if (docId) {
                    updates[`registros_quirurgicos/${docId}`] = null;
                    filasAEliminar.push(rowKey);
                }
            });
        });

        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
            console.log(`✅ ${filasAEliminar.length} filas eliminadas de registros_quirurgicos`);
        }

        // 🩺 Avisar a Lista de Espera antes de perder los vínculos de las
        // filas que se están archivando (mismo motivo que limpiarDia()/
        // limpiarPabellon() en js/08 — si no, un paciente cuyo ESTADO_DE_IQx
        // nunca se llegó a definir queda con un estatus viejo para siempre
        // en Lista de Espera, y "Cargar a la Tabla" no vuelve a aparecer).
        const todasLasFilasDelDiaRegistrar = [];
        PABS.forEach((pab) => {
            const rows = dayData.pabs[pab] || [];
            todasLasFilasDelDiaRegistrar.push(...rows);
        });
        await leResetearVinculosAntesDeLimpiar(todasLasFilasDelDiaRegistrar);

        // ✅ 3. LIMPIAR la tabla en memoria (todas las filas del día)
        PABS.forEach((pab, pabIdx) => {
            const rows = dayData.pabs[pab] || [];
            rows.forEach((fila) => {
                COLS.forEach(col => {
                    if (col === 'FECHA') {
                        fila[col] = '';
                    } else if (col === 'ESTADO_DE_IQx' || col === 'DESTINO' || col === 'Jornada' || col === 'Especialidad') {
                        fila[col] = 'Seleccione';
                    } else if (col === 'Tipo_Actividad' || col === 'Tipo_Actividad_2' || col === 'Tipo_Actividad_3') {
                        fila[col] = '';
                    } else {
                        fila[col] = '';
                    }
                });
                fila['Ya_Diferido'] = false;
                fila['Ya_Reubicado'] = false;
                // 🩺 Si esta fila venía de Lista de Espera, se corta el
                // vínculo al limpiar (ver js/31-le-bridge-cargar-a-tabla.js):
                // ya no debe seguir empujando cambios de estatus a un
                // paciente que ya no está en esta fila.
                fila['LE_PacienteKey'] = '';
                fila['WhatsApp_Enviado'] = false;
                fila['WhatsApp_UltimoEnvio'] = null;
            });
        });

        showModal({
            title: '✅ Registro completado',
            message: `El día <strong>${diaSemana}</strong> ha sido registrado definitivamente.<br><br>` +
                `📦 ${archivados} registros archivados.<br>` +
                `🧹 ${filasAEliminar.length} filas eliminadas de la tabla temporal.<br>` +
                `📝 El día está listo para nuevos registros.`,
            icon: '✅',
            confirmText: 'Aceptar'
        });

        renderWeekView();

    } catch (error) {
        console.error('❌ Error al registrar definitivo:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al registrar el día.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}

async function cargarDatosDesdeFirebase() {
    if (!currentUser) {
        console.warn('⚠️ No hay usuario autenticado');
        return;
    }
    console.log('📥 Cargando datos desde Firebase...');
    try {
        const snapshot = await database.ref('registros_quirurgicos').once('value');
        const data = snapshot.val();
        if (!data) {
            console.log('ℹ️ No hay datos en Firebase');
            return;
        }
        let datosCargados = 0;
        Object.keys(data).forEach(key => {
            const match = key.match(/semana_(\d+)_dia_(\d+)_pab_(\d+)_fila_(\d+)/);
            if (match) {
                const [_, semana, dia, pab, fila] = match.map(Number);
                const semanaIdx = semana - 1;
                const diaIdx = parseInt(dia);
                const pabIdx = parseInt(pab);
                const filaIdx = parseInt(fila);
                if (semanas[semanaIdx] &&
                    semanas[semanaIdx][diaIdx] &&
                    semanas[semanaIdx][diaIdx].pabs[PABS[pabIdx]] &&
                    semanas[semanaIdx][diaIdx].pabs[PABS[pabIdx]][filaIdx]) {
                    const filaData = data[key];
                    const filaLocal = semanas[semanaIdx][diaIdx].pabs[PABS[pabIdx]][filaIdx];
                    
                    Object.keys(filaData).forEach(campo => {
                        if (campo !== 'metadata') {
                            if (campo === 'RUT' && filaData[campo] !== undefined && filaData[campo] !== null) {
                                // Siempre limpiar + formatear
                                filaLocal[campo] = formatearRut(filaData[campo]);
                            } else {
                                filaLocal[campo] = filaData[campo];
                            }
                        }
                    });
                    
                    datosCargados++;
                }
            }
        });
        console.log(`✅ Datos cargados: ${datosCargados} filas`);
        renderWeekView(false);
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
    }
}

   function iniciarSincronizacionTiempoReal() {
    if (!currentUser) {
        console.warn('⚠️ No hay usuario autenticado');
        return;
    }
    console.log('🔄 Iniciando sincronización en tiempo real...');
    database.ref('registros_quirurgicos').on('value', function(snapshot) {
        const data = snapshot.val();
        if (!data) {
            console.log('ℹ️ No hay datos en Firebase');
            return;
        }
        let datosActualizados = 0;
        Object.keys(data).forEach(key => {
            const match = key.match(/semana_(\d+)_dia_(\d+)_pab_(\d+)_fila_(\d+)/);
            if (match) {
                const [_, semana, dia, pab, fila] = match.map(Number);
                const semanaIdx = semana - 1;
                const diaIdx = parseInt(dia);
                const pabIdx = parseInt(pab);
                const filaIdx = parseInt(fila);
                if (semanas[semanaIdx] &&
                    semanas[semanaIdx][diaIdx] &&
                    semanas[semanaIdx][diaIdx].pabs[PABS[pabIdx]] &&
                    semanas[semanaIdx][diaIdx].pabs[PABS[pabIdx]][filaIdx]) {
                    const filaData = data[key];
                    const filaLocal = semanas[semanaIdx][diaIdx].pabs[PABS[pabIdx]][filaIdx];
                    const ultimoEditor = filaData.metadata?.ultimo_editor;
                    const rowKeyLocal = `${semanaIdx}-${diaIdx}-${pabIdx}-${filaIdx}`;
                    // 🛟 Mientras ESTA fila en particular tenga una edición
                    // propia sin guardar, no se le aplican actualizaciones
                    // remotas — de lo contrario, el guardado de OTRO usuario
                    // en esta misma fila podía pisar una edición local
                    // todavía no guardada. A propósito NO se bloquea la
                    // tabla entera por esto: bloquear todo mientras cualquier
                    // OTRA fila tenía algo pendiente causaba una pérdida de
                    // datos distinta (ver filasConCambiosSinGuardar en js/01).
                    if (!filasConCambiosSinGuardar.has(rowKeyLocal) && ultimoEditor !== currentUserEmail) {
                        Object.keys(filaData).forEach(campo => {
                            if (campo !== 'metadata') {
                                if (campo === 'RUT' && filaData[campo] !== undefined && filaData[campo] !== null) {
                                    // Siempre limpiar + formatear
                                    filaLocal[campo] = formatearRut(filaData[campo]);
                                } else {
                                    filaLocal[campo] = filaData[campo];
                                }
                            }
                        });
                        datosActualizados++;
                    }
                }
            }
        });
        if (datosActualizados > 0) {
            console.log(`🔄 Datos actualizados en tiempo real: ${datosActualizados} filas`);
            if (seccionActiva === 'registro') {
                renderWeekView(true);
            }
        }
    }, function(error) {
        console.error('❌ Error en sincronización:', error);
    });

    iniciarEscuchaEdicionEnCurso();

    database.ref('pacientes_diferidos').on('value', function(snapshot) {
        if (seccionActiva === 'diferidos') {
            console.log('🔄 Actualizando lista de pacientes diferidos...');
            cargarPacientesDiferidos();
        }
    }, function(error) {
        console.error('❌ Error en sincronización de diferidos:', error);
    });

    database.ref('registros_definitivos').on('value', function(snapshot) {
        if (seccionActiva === 'libro') {
            console.log('🔄 Actualizando Libro de Quirófano...');
            cargarLibroQuirofano();
        }
    }, function(error) {
        console.error('❌ Error en sincronización de libro:', error);
    });

    // ✅ SINCRONIZACIÓN DE DESPLEGABLES EN TIEMPO REAL
    const keysDesplegables = ['Jornada', 'ESTADO_DE_IQx', 'DESTINO', 'Especialidad', 'Anestesista'];
    keysDesplegables.forEach(key => {
        database.ref('desplegables/' + key).on('value', function(snapshot) {
            const data = snapshot.val();
            if (data && Array.isArray(data) && data.length > 0) {
                desplegablesCache[key] = data;
                console.log(`🔄 Desplegable ${key} actualizado en tiempo real`);
                
                if (seccionActiva === 'registro') {
                    renderWeekView();
                }
            }
        }, function(error) {
            console.error(`❌ Error en sincronización de ${key}:`, error);
        });
    });

    // ✅ SINCRONIZACIÓN EN TIEMPO REAL DE MÉDICOS POR ESPECIALIDAD (Cirujano)
    database.ref('desplegables/medicos_por_especialidad').on('value', function(snapshot) {
        medicosPorEspecialidadCache = snapshot.val() || {};
        console.log('🔄 Médicos por especialidad actualizados en tiempo real');
        if (seccionActiva === 'registro') {
            renderWeekView();
        }
    }, function(error) {
        console.error('❌ Error en sincronización de médicos por especialidad:', error);
    });
}

// =============================================================
// 👥 AVISO DE EDICIÓN SIMULTÁNEA (misma fila, dos usuarios a la vez)
// =============================================================
// Ver marcarEdicionEnCurso()/limpiarEdicionEnCurso() en js/02 — escriben
// en edicion_en_curso/{docId} cuando alguien empieza a editar una fila y
// la limpian al guardar (o al desconectarse). Esto solo LEE esa colección
// y pinta un aviso visual sobre la fila en pantalla; no bloquea nada.
function iniciarEscuchaEdicionEnCurso() {
    database.ref('edicion_en_curso').on('value', function(snapshot) {
        edicionEnCursoRemota = snapshot.val() || {};
        aplicarAvisosEdicionEnCurso();
    }, function(error) {
        console.error('❌ Error en sincronización de edición en curso:', error);
    });
}

// Antigüedad máxima de una marca antes de ignorarla — red de seguridad por
// si algún caso raro (ej. el navegador se cierra de golpe sin alcanzar a
// disparar onDisconnect) deja una marca pegada más de la cuenta.
const EDICION_EN_CURSO_MAX_ANTIGUEDAD_MS = 5 * 60 * 1000;

function aplicarAvisosEdicionEnCurso() {
    const ahora = Date.now();
    document.querySelectorAll('#weekContent tr[data-rowkey]').forEach(tr => {
        const rowKey = tr.dataset.rowkey;
        const docId = getFirebaseKey(rowKey);
        const info = docId ? edicionEnCursoRemota[docId] : null;
        const esOtroUsuarioEditando = !!(info && info.usuario && info.usuario !== currentUserEmail &&
            (!info.ts || (ahora - info.ts) < EDICION_EN_CURSO_MAX_ANTIGUEDAD_MS));

        tr.classList.toggle('fila-en-edicion-por-otro', esOtroUsuarioEditando);
        if (esOtroUsuarioEditando) {
            tr.title = `⚠️ ${info.usuario} también está editando esta fila ahora mismo`;
        } else if (tr.title && tr.title.startsWith('⚠️')) {
            tr.removeAttribute('title');
        }
    });
}

    function detenerSincronizacionTiempoReal() {
    database.ref('registros_quirurgicos').off();
    database.ref('pacientes_diferidos').off();
    database.ref('registros_definitivos').off();
    database.ref('edicion_en_curso').off();

    // ✅ DETENER SINCRONIZACIÓN DE DESPLEGABLES
    const keysDesplegables = ['Jornada', 'ESTADO_DE_IQx', 'DESTINO', 'Especialidad', 'Anestesista'];
    keysDesplegables.forEach(key => {
        database.ref('desplegables/' + key).off();
    });
    database.ref('desplegables/medicos_por_especialidad').off();

    console.log('⏹️ Sincronización detenida');
}