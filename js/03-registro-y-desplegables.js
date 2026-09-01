
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

    // 🆔 Para filas con clave única (_pushId, ver agregarFila() en js/08 y
    // el resto de guardarDiaEnFirebaseOptimizadoConModal/etc. en js/02), la
    // clave real de Firebase es "fila_{pushId}", no la derivada de la
    // posición — este helper la calcula a partir de la fila misma (si la
    // tiene) en vez de solo del rowKey posicional, para usarse en
    // Eliminar/Diferir/Reubicar/WhatsApp y el aviso de edición simultánea.
    function obtenerDocIdDeFila(fila, rowKey) {
        return (fila && fila._pushId) ? `fila_${fila._pushId}` : getFirebaseKey(rowKey);
    }

    // Ubica la fila real en `semanas` a partir de un rowKey "s-d-p-f" —
    // usado por marcarEdicionEnCurso()/limpiarEdicionEnCurso() (js/02), que
    // solo reciben el rowKey, no la fila, y necesitan saber si tiene
    // _pushId para calcular la clave de Firebase correcta.
    function obtenerFilaPorRowKey(rowKey) {
        const parts = (rowKey || '').split('-').map(Number);
        if (parts.length !== 4) return null;
        const [s, d, p, f] = parts;
        const pabName = PABS[p];
        return (semanas[s] && semanas[s][d] && pabName && semanas[s][d].pabs[pabName] && semanas[s][d].pabs[pabName][f]) || null;
    }

    async function guardarFilaEnFirebase(rowKey, datos) {
    if (!currentUser) {
        console.warn('⚠️ No hay usuario autenticado');
        return false;
    }
    const docId = obtenerDocIdDeFila(datos, rowKey);
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
                const docId = obtenerDocIdDeFila(fila, rowKey);
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
                const pabName = PABS[pabIdx];
                if (semanas[semanaIdx] &&
                    semanas[semanaIdx][diaIdx] &&
                    pabName &&
                    semanas[semanaIdx][diaIdx].pabs[pabName]) {
                    const rows = semanas[semanaIdx][diaIdx].pabs[pabName];
                    // 🛟 Una fila con índice más allá de las FILAS_INICIALES
                    // (agregada con "➕ Agregar Fila" por quien cargó estos
                    // datos por primera vez) antes se descartaba en silencio
                    // acá — crecer el arreglo local asegura que también
                    // aparezca en una carga inicial nueva.
                    while (rows.length <= filaIdx) {
                        rows.push(crearFilaVacia());
                    }
                    const filaData = data[key];
                    const filaLocal = rows[filaIdx];

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
            } else if (key.startsWith('fila_')) {
                // 🆔 Fila con clave única de Firebase (agregada con "➕
                // Agregar Fila" después de la corrección de colisiones —
                // ver agregarFila() en js/08). Esta clave ya no codifica
                // semana/día/pabellón, así que la ubicación viaja en el
                // propio dato (_ubicacion, formato "semana-dia-pab").
                const filaData = data[key];
                const pushId = key.slice('fila_'.length);
                const ubicacion = filaData && filaData._ubicacion;
                if (!ubicacion) return;
                const partesUbicacion = ubicacion.split('-').map(Number);
                if (partesUbicacion.length !== 3) return;
                const [semanaIdx, diaIdx, pabIdx] = partesUbicacion;
                const pabName = PABS[pabIdx];
                if (!semanas[semanaIdx] || !semanas[semanaIdx][diaIdx] || !pabName || !semanas[semanaIdx][diaIdx].pabs[pabName]) return;

                const rows = semanas[semanaIdx][diaIdx].pabs[pabName];
                // Si esta fila ya existe localmente (por _pushId) se edita
                // en su lugar; si es la primera vez que aparece (alta de
                // otro usuario, o de este mismo en otra pestaña) se agrega
                // al final del pabellón.
                let filaLocal = rows.find(f => f._pushId === pushId);
                if (!filaLocal) {
                    filaLocal = crearFilaVacia();
                    filaLocal._pushId = pushId;
                    filaLocal._ubicacion = ubicacion;
                    rows.push(filaLocal);
                }

                Object.keys(filaData).forEach(campo => {
                    if (campo !== 'metadata') {
                        if (campo === 'RUT' && filaData[campo] !== undefined && filaData[campo] !== null) {
                            filaLocal[campo] = formatearRut(filaData[campo]);
                        } else {
                            filaLocal[campo] = filaData[campo];
                        }
                    }
                });

                datosCargados++;
            }
        });
        console.log(`✅ Datos cargados: ${datosCargados} filas`);
        renderWeekView(false);
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
    }
}

    // 🗑️ Claves de registros_quirurgicos que este cliente vio la última vez
    // — permite detectar cuando una desaparece (fila eliminada por
    // eliminarFila(), reubicarPaciente(), "Registrar Día", o vaciada hasta
    // quedar sin datos) para limpiarla también acá en vivo. Antes el
    // listener solo procesaba lo que SÍ estaba presente en cada snapshot,
    // así que una eliminación remota nunca se reflejaba hasta recargar la
    // página.
    let clavesRegistrosQuirurgicosConocidas = new Set();

    function aplicarEliminacionRemota(clave) {
        const matchLegacy = clave.match(/semana_(\d+)_dia_(\d+)_pab_(\d+)_fila_(\d+)/);
        if (matchLegacy) {
            const [_, semana, dia, pab, fila] = matchLegacy.map(Number);
            const semanaIdx = semana - 1;
            const pabName = PABS[pab];
            if (!semanas[semanaIdx] || !semanas[semanaIdx][dia] || !pabName || !semanas[semanaIdx][dia].pabs[pabName]) return false;
            const rows = semanas[semanaIdx][dia].pabs[pabName];
            const rowKeyLocal = `${semanaIdx}-${dia}-${pab}-${fila}`;
            if (filasConCambiosSinGuardar.has(rowKeyLocal)) return false; // edición local en curso, no se pisa
            if (!rows[fila]) return false;
            if (rows[fila]._pushId) {
                // No debería pasar (una fila con _pushId se identifica con
                // la clave nueva, no con esta), pero por si acaso no se
                // toca — quitarla acá correría de lugar filas ajenas.
                return false;
            }
            // 🛟 Nunca se quita del arreglo: esta fila se identifica por su
            // POSICIÓN en Firebase, y removerla correría de lugar a las
            // siguientes (mismo motivo que eliminarFila() en js/08 ya no
            // hace splice() en filas sin _pushId).
            Object.assign(rows[fila], crearFilaVacia());
            rows[fila]['Ya_Diferido'] = false;
            rows[fila]['Ya_Reubicado'] = false;
            rows[fila]['WhatsApp_Enviado'] = false;
            rows[fila]['WhatsApp_UltimoEnvio'] = null;
            return true;
        } else if (clave.startsWith('fila_')) {
            const pushId = clave.slice('fila_'.length);
            for (const semana of semanas) {
                for (const dia of semana) {
                    for (const pabName of PABS) {
                        const rows = dia.pabs[pabName];
                        if (!rows) continue;
                        const idx = rows.findIndex(f => f._pushId === pushId);
                        if (idx === -1) continue;
                        const rowKeyLocal = `${semanas.indexOf(semana)}-${semana.indexOf(dia)}-${PABS.indexOf(pabName)}-${idx}`;
                        if (filasConCambiosSinGuardar.has(rowKeyLocal)) return false;
                        rows.splice(idx, 1);
                        return true;
                    }
                }
            }
        }
        return false;
    }

   function iniciarSincronizacionTiempoReal() {
    if (!currentUser) {
        console.warn('⚠️ No hay usuario autenticado');
        return;
    }
    console.log('🔄 Iniciando sincronización en tiempo real...');
    database.ref('registros_quirurgicos').on('value', function(snapshot) {
        const data = snapshot.val() || {};
        const clavesActuales = new Set(Object.keys(data));
        let eliminacionesAplicadas = 0;
        clavesRegistrosQuirurgicosConocidas.forEach(claveVieja => {
            if (!clavesActuales.has(claveVieja) && aplicarEliminacionRemota(claveVieja)) {
                eliminacionesAplicadas++;
            }
        });
        clavesRegistrosQuirurgicosConocidas = clavesActuales;

        if (!snapshot.val()) {
            console.log('ℹ️ No hay datos en Firebase');
            if (eliminacionesAplicadas > 0 && seccionActiva === 'registro') renderWeekView(true);
            return;
        }
        let datosActualizados = eliminacionesAplicadas;
        Object.keys(data).forEach(key => {
            const match = key.match(/semana_(\d+)_dia_(\d+)_pab_(\d+)_fila_(\d+)/);
            if (match) {
                const [_, semana, dia, pab, fila] = match.map(Number);
                const semanaIdx = semana - 1;
                const diaIdx = parseInt(dia);
                const pabIdx = parseInt(pab);
                const filaIdx = parseInt(fila);
                const pabName = PABS[pabIdx];
                if (semanas[semanaIdx] &&
                    semanas[semanaIdx][diaIdx] &&
                    pabName &&
                    semanas[semanaIdx][diaIdx].pabs[pabName]) {
                    const rows = semanas[semanaIdx][diaIdx].pabs[pabName];
                    // 🛟 Una fila agregada por OTRO usuario ("➕ Agregar Fila"
                    // es 100% local hasta que se guarda) puede tener un
                    // índice más allá de lo que este navegador tiene en
                    // memoria — antes se descartaba en silencio acá y esa
                    // fila quedaba invisible para siempre (ni con recarga de
                    // página aparecía, porque cargarDatosDesdeFirebase tenía
                    // el mismo problema). Crecer el arreglo local con filas
                    // vacías hasta alcanzar el índice que hace falta.
                    while (rows.length <= filaIdx) {
                        rows.push(crearFilaVacia());
                    }
                    const filaData = data[key];
                    const filaLocal = rows[filaIdx];
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
            } else if (key.startsWith('fila_')) {
                // 🆔 Fila con clave única de Firebase — ver el mismo bloque
                // en cargarDatosDesdeFirebase() para el detalle. Acá además
                // se respeta filasConCambiosSinGuardar, igual que las filas
                // con clave por posición.
                const filaData = data[key];
                const pushId = key.slice('fila_'.length);
                const ubicacion = filaData && filaData._ubicacion;
                if (!ubicacion) return;
                const partesUbicacion = ubicacion.split('-').map(Number);
                if (partesUbicacion.length !== 3) return;
                const [semanaIdx, diaIdx, pabIdx] = partesUbicacion;
                const pabName = PABS[pabIdx];
                if (!semanas[semanaIdx] || !semanas[semanaIdx][diaIdx] || !pabName || !semanas[semanaIdx][diaIdx].pabs[pabName]) return;

                const rows = semanas[semanaIdx][diaIdx].pabs[pabName];
                let filaLocal = rows.find(f => f._pushId === pushId);
                if (!filaLocal) {
                    filaLocal = crearFilaVacia();
                    filaLocal._pushId = pushId;
                    filaLocal._ubicacion = ubicacion;
                    rows.push(filaLocal);
                }

                const ultimoEditor = filaData.metadata?.ultimo_editor;
                const idxLocal = rows.indexOf(filaLocal);
                const rowKeyLocal = `${semanaIdx}-${diaIdx}-${pabIdx}-${idxLocal}`;
                if (!filasConCambiosSinGuardar.has(rowKeyLocal) && ultimoEditor !== currentUserEmail) {
                    Object.keys(filaData).forEach(campo => {
                        if (campo !== 'metadata') {
                            if (campo === 'RUT' && filaData[campo] !== undefined && filaData[campo] !== null) {
                                filaLocal[campo] = formatearRut(filaData[campo]);
                            } else {
                                filaLocal[campo] = filaData[campo];
                            }
                        }
                    });
                    datosActualizados++;
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
let intervaloRespaldoEdicionEnCurso = null;

// 🕐 Diferencia (ms) entre el reloj de ESTE equipo y la hora real del
// servidor de Firebase — si el reloj del equipo está mal puesto (aunque
// sea por unos minutos), comparar "ahora" contra el timestamp guardado en
// Firebase (que SÍ es la hora real del servidor) puede descartar avisos
// válidos por creerlos vencidos, sin ningún error visible. Se resta/suma
// este desfase antes de comparar, para no depender del reloj local.
let desfaseHorarioServidor = 0;

function iniciarEscuchaEdicionEnCurso() {
    database.ref('.info/serverTimeOffset').on('value', function(snap) {
        desfaseHorarioServidor = snap.val() || 0;
    });

    database.ref('edicion_en_curso').on('value', function(snapshot) {
        edicionEnCursoRemota = snapshot.val() || {};
        aplicarAvisosEdicionEnCurso();
    }, function(error) {
        console.error('❌ Error en sincronización de edición en curso:', error);
    });

    // 🛟 Red de seguridad: además del listener en tiempo real de arriba,
    // una lectura directa a Firebase cada 2 segundos que vuelve a aplicar
    // el aviso. Visto en producción: una sesión donde el dato llegaba
    // bien a una lectura manual (.once('value')) pero el listener en
    // tiempo real (.on('value')) no actualizaba la variable interna —
    // sin causa identificada todavía. Esta lectura periódica garantiza
    // que el aviso siempre se ponga al día en un máximo de 2 segundos,
    // sin depender de encontrar esa causa.
    if (intervaloRespaldoEdicionEnCurso) clearInterval(intervaloRespaldoEdicionEnCurso);
    intervaloRespaldoEdicionEnCurso = setInterval(async () => {
        try {
            const snapshot = await database.ref('edicion_en_curso').once('value');
            edicionEnCursoRemota = snapshot.val() || {};
            aplicarAvisosEdicionEnCurso();
        } catch (error) {
            console.error('❌ Error en la lectura de respaldo de edición en curso:', error);
        }
    }, 2000);
}

function detenerEscuchaEdicionEnCurso() {
    if (intervaloRespaldoEdicionEnCurso) {
        clearInterval(intervaloRespaldoEdicionEnCurso);
        intervaloRespaldoEdicionEnCurso = null;
    }
}

// Antigüedad máxima de una marca antes de ignorarla — red de seguridad por
// si algún caso raro (ej. el navegador se cierra de golpe sin alcanzar a
// disparar onDisconnect) deja una marca pegada más de la cuenta.
const EDICION_EN_CURSO_MAX_ANTIGUEDAD_MS = 5 * 60 * 1000;

function aplicarAvisosEdicionEnCurso() {
    // 🕐 Hora real del servidor, no la del equipo local — ver
    // desfaseHorarioServidor más arriba.
    const ahora = Date.now() + desfaseHorarioServidor;
    document.querySelectorAll('#weekContent tr[data-rowkey]').forEach(tr => {
        const rowKey = tr.dataset.rowkey;
        // 🆔 data-pushid lo agrega js/07 al renderizar la fila, si tiene
        // clave única — ver obtenerDocIdDeFila() más arriba.
        const docId = tr.dataset.pushid ? `fila_${tr.dataset.pushid}` : getFirebaseKey(rowKey);
        // edicionEnCursoRemota[docId] es un objeto con UNA clave por cada
        // usuario editando esa fila (ver marcarEdicionEnCurso() en js/02),
        // así que puede haber varias personas a la vez — se busca a la
        // primera que no sea uno mismo y no esté vencida.
        const editores = docId ? edicionEnCursoRemota[docId] : null;
        let otroUsuario = null;
        if (editores) {
            for (const clave in editores) {
                const info = editores[clave];
                if (info && info.usuario && info.usuario !== currentUserEmail &&
                    (!info.ts || (ahora - info.ts) < EDICION_EN_CURSO_MAX_ANTIGUEDAD_MS)) {
                    otroUsuario = info.usuario;
                    break;
                }
            }
        }

        tr.classList.toggle('fila-en-edicion-por-otro', !!otroUsuario);
        if (otroUsuario) {
            tr.title = `⚠️ ${otroUsuario} también está editando esta fila ahora mismo`;
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
    database.ref('.info/serverTimeOffset').off();
    detenerEscuchaEdicionEnCurso();

    // ✅ DETENER SINCRONIZACIÓN DE DESPLEGABLES
    const keysDesplegables = ['Jornada', 'ESTADO_DE_IQx', 'DESTINO', 'Especialidad', 'Anestesista'];
    keysDesplegables.forEach(key => {
        database.ref('desplegables/' + key).off();
    });
    database.ref('desplegables/medicos_por_especialidad').off();

    console.log('⏹️ Sincronización detenida');
}