// =============================================================
// RENDERIZAR TABLA DE UN DÍA
// =============================================================
// ✅ Considera "vacío" tanto "" como el placeholder "Seleccione"
function esEstadoVacio(estado) {
    if (!estado) return true;
    const val = String(estado).trim().toLowerCase();
    return val === '' || val === 'seleccione';
}

// Genera las <option> de un <select> a partir de una lista de opciones.
// Global (no anidada en renderDayTable) porque también la usa el listener
// de js/02 que repuebla el select de Cirujano al cambiar la Especialidad.
function generarOptions(opciones, valorSeleccionado) {
    return opciones.map(opt =>
        `<option value="${opt}" ${opt === valorSeleccionado ? 'selected' : ''}>${opt}</option>`
    ).join('');
}

// Igual que generarOptions(), pero si el valor guardado no está en la lista
// (por ejemplo nombres cargados como texto libre antes de que este campo
// fuera un desplegable administrado) lo agrega igual como primera opción,
// para no ocultar ni perder datos ya guardados.
function generarOptionsConPreservado(opciones, valorSeleccionado) {
    let lista = opciones;
    if (valorSeleccionado && valorSeleccionado !== 'Seleccione' && !opciones.includes(valorSeleccionado)) {
        lista = [valorSeleccionado, ...opciones];
    }
    return generarOptions(lista, valorSeleccionado);
}

// Recalcula si Diferir/Reubicar deben estar bloqueados para UNA fila y
// actualiza esos dos botones al instante (mismo cálculo que hace
// renderDayTable() más abajo). Sin esto, cambiar el ESTADO_DE_IQx no movía
// los botones hasta el próximo redibujado completo de la tabla (recién con
// el autoguardado) — quedaban con el estado "viejo" mientras tanto. Se llama
// desde el listener de ESTADO_DE_IQx en js/02 (asignarEventosDelegados).
function actualizarBotonesDiferirReubicar(tr, fila) {
    if (!tr) return;
    const btnDiferir = tr.querySelector('.btn-diferir');
    const btnReubicar = tr.querySelector('.btn-reubicar');
    if (!btnDiferir || !btnReubicar) return;

    const estadoActual = fila['ESTADO_DE_IQx'] || '';
    const esCondicionEspecial = estadoActual === 'SUSPENDIDO' || estadoActual === 'CONDICIONAL (NO OPERADO)';
    const estadoSeleccionado = !esEstadoVacio(estadoActual);

    let bloqueado, diferirSufijo, reubicarSufijo;
    if (esCondicionEspecial) {
        const yaUsado = !!(fila['Ya_Diferido'] || fila['Ya_Reubicado']);
        bloqueado = yaUsado;
        diferirSufijo = yaUsado ? ' (bloqueado: esta fila ya fue diferida o reubicada)' : ' (el paciente permanece en esta fila al diferir)';
        reubicarSufijo = yaUsado ? ' (bloqueado: esta fila ya fue diferida o reubicada)' : ' (el paciente permanece en esta fila al reubicar)';
    } else {
        bloqueado = estadoSeleccionado;
        diferirSufijo = estadoSeleccionado ? ' (bloqueado: seleccione un ESTADO_DE_IQx vacío para habilitar)' : '';
        reubicarSufijo = diferirSufijo;
    }

    btnDiferir.disabled = bloqueado;
    btnDiferir.title = 'Diferir paciente' + diferirSufijo;
    btnDiferir.style.opacity = bloqueado ? '0.5' : '';
    btnDiferir.style.cursor = bloqueado ? 'not-allowed' : '';

    btnReubicar.disabled = bloqueado;
    btnReubicar.title = 'Reubicar paciente en otra fila' + reubicarSufijo;
    btnReubicar.style.opacity = bloqueado ? '0.5' : '';
    btnReubicar.style.cursor = bloqueado ? 'not-allowed' : '';
}

async function renderDayTable(dayData, semanaIdx, diaIdx) {
    const dia = dayData.dia;
    const dayKey = `${semanaIdx}-${diaIdx}`;

    let html = `<div class="day-table-container" data-daykey="${dayKey}">`;

    const mostrarRegistrar = esAdministrador() ?
        `<button class="btn-sm btn-registrar" data-action="registrarDay" data-daykey="${dayKey}">📋 Registrar Día</button>` : '';

    html += `<div class="day-title">
        <span>📋 ${dia}</span>
        <div class="btn-group">
            <button class="btn-sm btn-print" data-action="printDay" data-daykey="${dayKey}" style="background:#4f46e5; color:white; border:none; padding:6px 16px; border-radius:30px; font-size:0.7rem; font-weight:500; cursor:pointer;">🖨️ Imprimir Día</button>
            <button class="btn-sm btn-save" data-action="saveDay" data-daykey="${dayKey}">💾 Guardar Día</button>
            ${mostrarRegistrar}
            <button class="btn-sm btn-clear" data-action="clearDay" data-daykey="${dayKey}">🗑️ Limpiar Día</button>
        </div>
    </div>`;

    // ✅ OBTENER OPCIONES UNA SOLA VEZ (desde caché)
    const opcionesJornada = obtenerOpcionesCache('Jornada');
    const opcionesEstado = obtenerOpcionesCache('ESTADO_DE_IQx');
    const opcionesDestino = obtenerOpcionesCache('DESTINO');
    const opcionesEspecialidad = obtenerOpcionesCache('Especialidad');
    const opcionesAnestesista = obtenerOpcionesCache('Anestesista');

    // ✅ UN SOLO TABLE-WRAP PARA TODOS LOS PABELLONES
    html += `<div class="table-wrap" id="scrollContainer_${dayKey}">`;

    for (let pIdx = 0; pIdx < PABS.length; pIdx++) {
        const pab = PABS[pIdx];
        const rows = dayData.pabs[pab] || [];
        const pabKey = `${dayKey}-${pIdx}`;

        html += `<div class="pab-block" data-pabkey="${pabKey}">`;
        html += `<div class="pab-header">${pab} (${rows.length} filas)</div>`;
        
        // ✅ TABLA SIN table-wrap propio
        html += `<table>`;
        html += `<thead><tr>`;
        html += `<th class="col-color" style="min-width:35px; text-align:center;">Color</th>`;
        html += `<th style="min-width:35px; text-align:center;">Diferir</th>`;
        html += `<th style="min-width:35px; text-align:center;">Reubicar</th>`;
        html += `<th style="min-width:35px; text-align:center;">WhatsApp</th>`;

        for (const col of COLS) {
            if (col === 'Color') continue;
            const colClass = COL_CLASSES[col] || '';
            const isIntervencion = COLS_INTERVENCION.includes(col);
            html += `<th class="${colClass} ${isIntervencion ? 'col-intervencion' : ''}">${col}</th>`;
        }
        html += `<th style="min-width:45px; text-align:center;">Eliminar</th>`;
        html += `</tr></thead><tbody>`;

        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
            const fila = rows[rowIdx];
            const rowKey = `${pabKey}-${rowIdx}`;
            const colorVal = fila['Color'] || '';

            html += `<tr data-rowkey="${rowKey}">`;

            // 🎨 Columna de Color
            html += `<td class="small-cell col-color" style="text-align:center; vertical-align:middle;">`;
            html += `<div id="color-container-${rowKey}" data-rowkey="${rowKey}" data-color="${colorVal}"></div>`;
            html += `</td>`;

            // 📤 Columna de Diferir y 🔄 Columna de Reubicar
            // ✅ Regla general: ambos botones se bloquean si ESTADO_DE_IQx
            // tiene CUALQUIER condición seleccionada, y se habilitan solo
            // cuando está vacío ("Seleccione").
            // ⚠️ Excepción: SUSPENDIDO y CONDICIONAL (NO OPERADO) sí permiten
            // diferir/reubicar (el paciente permanece en la fila original,
            // ver diferirFila()/reubicarPaciente() en js/08). Pero apenas se
            // usa CUALQUIERA de los dos, se bloquean AMBOS para esa fila
            // (Ya_Diferido/Ya_Reubicado se marcan juntos) — evita que el
            // paciente termine duplicado (ej. diferido y reintegrado desde
            // Pacientes Diferidos, y ADEMÁS reubicado desde la fila original).
            const estadoActual = fila['ESTADO_DE_IQx'] || '';
            const esCondicionEspecial = estadoActual === 'SUSPENDIDO' || estadoActual === 'CONDICIONAL (NO OPERADO)';
            const estadoSeleccionado = !esEstadoVacio(estadoActual);

            let diferirBloqueado, reubicarBloqueado, diferirSufijo, reubicarSufijo;
            if (esCondicionEspecial) {
                const yaUsado = !!(fila['Ya_Diferido'] || fila['Ya_Reubicado']);
                diferirBloqueado = yaUsado;
                reubicarBloqueado = yaUsado;
                diferirSufijo = yaUsado ? ' (bloqueado: esta fila ya fue diferida o reubicada)' : ' (el paciente permanece en esta fila al diferir)';
                reubicarSufijo = yaUsado ? ' (bloqueado: esta fila ya fue diferida o reubicada)' : ' (el paciente permanece en esta fila al reubicar)';
            } else {
                diferirBloqueado = estadoSeleccionado;
                reubicarBloqueado = estadoSeleccionado;
                diferirSufijo = estadoSeleccionado ? ' (bloqueado: seleccione un ESTADO_DE_IQx vacío para habilitar)' : '';
                reubicarSufijo = diferirSufijo;
            }

            html += `<td class="small-cell col-diferir" style="text-align:center; vertical-align:middle; min-width:35px;">`;
            html += `<button class="btn-diferir" data-action="diferir" data-rowkey="${rowKey}" title="Diferir paciente${diferirSufijo}" ${diferirBloqueado ? 'disabled' : ''} style="${diferirBloqueado ? 'opacity:0.5; cursor:not-allowed;' : ''}">⏩</button>`;
            html += `</td>`;

            html += `<td class="small-cell col-reubicar" style="text-align:center; vertical-align:middle; min-width:35px;">`;
            html += `<button class="btn-reubicar" data-action="reubicar" data-rowkey="${rowKey}" title="Reubicar paciente en otra fila${reubicarSufijo}" ${reubicarBloqueado ? 'disabled' : ''} style="${reubicarBloqueado ? 'opacity:0.5; cursor:not-allowed;' : ''}">🔄</button>`;
            html += `</td>`;

            // 💬 Columna WhatsApp — ver js/32-whatsapp-plantillas.js. El
            // check ✅ es UN SOLO indicador por fila (no por plantilla): se
            // marca la primera vez que se confirma un envío, y el tooltip
            // muestra cuál plantilla fue la última y cuándo.
            {
                const yaEnviado = !!fila['WhatsApp_Enviado'];
                const meta = fila['WhatsApp_UltimoEnvio'] || null;
                // El título de la plantilla lo escribe un superadministrador
                // (js/32) y viaja sin escapar hasta acá — como termina
                // dentro de un atributo title="...", hay que escapar
                // comillas/ángulos para que no se pueda "romper" el
                // atributo e inyectar otros (ej. un onmouseover=...).
                const escaparAtributo = (s) => (s || '').toString()
                    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const tituloTooltip = yaEnviado && meta
                    ? `Enviar WhatsApp (último: "${escaparAtributo(meta.plantillaTitulo) || '—'}" el ${escaparAtributo(meta.fecha) || '—'})`
                    : 'Enviar WhatsApp';
                html += `<td class="small-cell col-whatsapp" style="text-align:center; vertical-align:middle; min-width:35px;">`;
                html += `<button class="btn-whatsapp" data-action="whatsapp" data-rowkey="${rowKey}" title="${tituloTooltip}" style="position:relative;">💬${yaEnviado ? '<span style="position:absolute; top:-4px; right:-4px; font-size:0.7rem;">✅</span>' : ''}</button>`;
                html += `</td>`;
            }

            for (const col of COLS) {
                if (col === 'Color') continue;

                let val = fila[col] || '';
                const colClass = COL_CLASSES[col] || '';
                const isIntervencion = COLS_INTERVENCION.includes(col);

                let inputHtml = '';
                if (col === 'Jornada') {
                    inputHtml = `<select data-col="${col}" data-rowkey="${rowKey}" class="input-auto">${generarOptions(opcionesJornada, val)}</select>`;

                } else if (col === 'ESTADO_DE_IQx') {
                    inputHtml = `<select data-col="${col}" data-rowkey="${rowKey}" class="input-auto">${generarOptions(opcionesEstado, val)}</select>`;

                } else if (col === 'DESTINO') {
                    inputHtml = `<select data-col="${col}" data-rowkey="${rowKey}" class="input-auto">${generarOptions(opcionesDestino, val)}</select>`;

                } else if (col === 'Especialidad') {
                    inputHtml = `<select data-col="${col}" data-rowkey="${rowKey}" class="input-auto">${generarOptionsConPreservado(opcionesEspecialidad, val)}</select>`;

                } else if (col === 'Cirujano') {
                    // Lista de médicos según la Especialidad actual de esta fila
                    // (ver obtenerMedicosPorEspecialidadCache() en js/12). Si la
                    // Especialidad cambia, js/02 (asignarEventosDelegados) repuebla
                    // este mismo <select>.
                    const opcionesCirujano = obtenerMedicosPorEspecialidadCache(fila['Especialidad']);
                    inputHtml = `<select data-col="${col}" data-rowkey="${rowKey}" class="input-auto">${generarOptionsConPreservado(['Seleccione', ...opcionesCirujano], val)}</select>`;

                } else if (col === 'Anestesista') {
                    inputHtml = `<select data-col="${col}" data-rowkey="${rowKey}" class="input-auto">${generarOptionsConPreservado(opcionesAnestesista, val)}</select>`;

                } else if (COLS_INTERVENCION.includes(col)) {
                    inputHtml = `
                        <textarea 
                            data-col="${col}" 
                            data-rowkey="${rowKey}" 
                            placeholder="Buscar intervención..." 
                            class="input-auto intervencion-input intervencion-textarea"
                            rows="1"
                            autocomplete="off">${val}</textarea>
                    `;

                } else if (col === 'Causal_de_suspension') {
                    const causalKeys = Object.keys(CAUSALES_SUSPENSION);
                    let opts = '<option value="">Seleccione causal</option>';
                    for (const key of causalKeys) {
                        const causal = CAUSALES_SUSPENSION[key];
                        opts += `<option value="${key}" ${key === val ? 'selected' : ''}>${causal.label}</option>`;
                    }
                    const estado = fila['ESTADO_DE_IQx'] || '';
                    const habilitado = estado === 'SUSPENDIDO' ? '' : 'disabled';
                    inputHtml = `<select data-col="${col}" data-rowkey="${rowKey}" class="input-auto causal-select" ${habilitado}>${opts}</select>`;

                } else if (col === 'Motivo') {
                    const causalKey = fila['Causal_de_suspension'] || '';
                    let motivos = [];
                    if (causalKey && CAUSALES_SUSPENSION[causalKey]) {
                        motivos = CAUSALES_SUSPENSION[causalKey].motivos || [];
                    }
                    let opts = '<option value="">Seleccione motivo</option>';
                    for (const m of motivos) {
                        opts += `<option value="${m}" ${m === val ? 'selected' : ''}>${m}</option>`;
                    }
                    const estado = fila['ESTADO_DE_IQx'] || '';
                    const habilitado = estado === 'SUSPENDIDO' && causalKey ? '' : 'disabled';
                    inputHtml = `<select data-col="${col}" data-rowkey="${rowKey}" class="input-auto motivo-select" ${habilitado}>${opts}</select>`;

                } else if (col === 'Observaciones') {
                    inputHtml = `
                        <textarea 
                            data-col="${col}" 
                            data-rowkey="${rowKey}" 
                            placeholder="Observaciones..." 
                            class="input-auto observaciones-textarea"
                            rows="2"
                            style="width:100%; min-width:120px; max-width:250px; min-height:30px; max-height:80px; resize:vertical; padding:4px 6px; font-size:0.6rem; border:1px solid #d1d9e6; border-radius:4px; background:#fcfdff; box-sizing:border-box; font-family:inherit;">${val}</textarea>
                    `;

                } else if (col === 'RUT') {
   
    
    inputHtml = `
        <div style="position:relative; display:inline-block; width:100%;">
            <input type="text" data-col="${col}" data-rowkey="${rowKey}" value="${val || ''}" placeholder="RUT" class="input-auto" style="width:100%; padding-right:24px;" />
            <span class="rut-validation-icon" data-rowkey="${rowKey}"></span>
        </div>
    `;

                } else {
                    let inputType = 'text';
                    let extraAttrs = '';

                    if (col === 'FECHA') {
                        inputType = 'date';
                        if (val && val !== '' && val.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            const [dia, mes, anio] = val.split('/');
                            extraAttrs = `value="${anio}-${mes}-${dia}"`;
                        } else if (val && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            extraAttrs = `value="${val}"`;
                        }
                    } else if (col === 'Hora_de_entrada' || col === 'Hora_de_salida' || col === 'T_QX' || col === 'T_Qx' || col === 'T_Retraso') {
                        inputType = 'time';
                        extraAttrs = 'step="60"';
                    }

                    inputHtml = `<input type="${inputType}" ${extraAttrs} data-col="${col}" data-rowkey="${rowKey}" value="${val}" placeholder="${col}" class="input-auto" />`;
                }

                html += `<td class="small-cell ${colClass} ${isIntervencion ? 'col-intervencion' : ''}">${inputHtml}</td>`;
            }

            html += `<td><button class="btn-sm btn-delete-row" data-action="deleteRow" data-rowkey="${rowKey}">🗑️</button></td>`;
            html += `</tr>`;
        }

        html += `</tbody></table>`;

        html += `<div class="btn-group">
            <button class="btn-sm btn-add" data-action="addRow" data-pabkey="${pabKey}">➕ Agregar Fila</button>
            <button class="btn-sm btn-save" data-action="savePab" data-pabkey="${pabKey}">💾 Guardar Pabellón</button>
            <button class="btn-sm btn-clear" data-action="clearPab" data-pabkey="${pabKey}">🗑️ Limpiar Pabellón</button>
        </div>`;

        html += `</div>`; // cierre pab-block
    }

    // ✅ CERRAR EL UNICO TABLE-WRAP
    html += `</div>`; // cierre table-wrap

    html += `</div>`; // cierre day-table-container
    return html;
}

// =============================================================
// 📌 SEGUIR EL SCROLL HORIZONTAL DE LA TABLA CON LOS BOTONES DE PABELLÓN
// =============================================================
// El grupo de botones de cada pabellón (Agregar Fila/Guardar Pabellón/
// Limpiar Pabellón) vive DENTRO de .table-wrap (el contenedor que scrollea
// horizontalmente). position:sticky no logró un resultado consistente ahí
// (el contenedor no le dejaba margen real de desplazamiento), así que se
// sigue el scroll de forma directa: al scrollear .table-wrap, se desplaza
// el grupo de botones con un transform en sentido contrario, para que
// visualmente se quede fijo pegado al borde derecho de lo que se ve.
// Debe llamarse cada vez que se vuelve a renderizar el día (el HTML se
// reconstruye por completo, así que no hay listeners que se acumulen).
function inicializarScrollBotonesPabellon() {
    document.querySelectorAll('#weekContent .table-wrap').forEach(wrap => {
        function actualizarBotones() {
            wrap.querySelectorAll('.pab-block > .btn-group').forEach(grupo => {
                grupo.style.transform = `translateX(${wrap.scrollLeft}px)`;
            });
        }
        wrap.addEventListener('scroll', actualizarBotones);
        actualizarBotones();
    });
}
