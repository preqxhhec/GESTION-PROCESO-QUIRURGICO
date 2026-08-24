
    // =============================================================
    // 🔢 PAGINACIÓN DEL LIBRO DE QUIRÓFANO
    // =============================================================
    const REGISTROS_POR_PAGINA_LIBRO = 15;
    let paginaActualLibroQuirofano = 1;

    // =============================================================
    // 📊 EXPORTAR A EXCEL
    // =============================================================
    function exportarLibroAExcel() {
        const tabla = document.querySelector('#libroTablaContainer table');
        if (!tabla) {
            showModal({
                title: '⚠️ Sin datos',
                message: 'No hay datos para exportar.',
                icon: '⚠️',
                confirmText: 'Aceptar'
            });
            return;
        }

        const filas = tabla.querySelectorAll('tbody tr');
        if (filas.length === 0) {
            showModal({
                title: '⚠️ Sin datos',
                message: 'No hay registros visibles para exportar.',
                icon: '⚠️',
                confirmText: 'Aceptar'
            });
            return;
        }

        const idsVisibles = [];
        filas.forEach(fila => {
            const btn = fila.querySelector('.btn-ver-detalle-libro');
            if (btn) {
                idsVisibles.push(btn.dataset.key);
            }
        });

        showModal({
            title: '⏳ Exportando...',
            message: 'Recopilando datos para exportar...',
            icon: '⏳',
            confirmText: 'Aceptar'
        });

        database.ref('registros_definitivos').once('value').then(snapshot => {
            const allData = snapshot.val();

            if (!allData) {
                showModal({
                    title: '❌ Error',
                    message: 'No se pudieron obtener los datos completos.',
                    icon: '❌',
                    confirmText: 'Aceptar'
                });
                return;
            }

            const idsSet = new Set(idsVisibles);
            const datosExcel = [];
            const encabezados = [
                '#', 'FECHA', 'T_Qx', 'Jornada', 'Cirujano', 'Especialidad', 'Anestesista',
                'Nombre_Paciente', 'RUT', 'Edad', 'FICHA', 'Diagnostico',
                'Intervencion_propuesta', 'Condicion_LE', 'ESTADO_DE_IQx',
                '1ra_Intervencion_Qx_Realizada', 'Tipo_Actividad',
                '2da_Intervencion_Qx_Realizada', 'Tipo_Actividad_2',
                '3ra_Intervencion_Realizada', 'Tipo_Actividad_3',
                'Causal_de_suspension', 'Motivo', 'Observaciones',
                'T_Retraso', 'Hora_de_entrada', 'Hora_de_salida', 'T_QX', 'DESTINO',
                'Pabellón', 'Registrado por', 'Fecha Registro'
            ];
            datosExcel.push(encabezados);

            let index = 0;
            Object.keys(allData).forEach(key => {
                if (idsSet.has(key)) {
                    const item = allData[key];
                    const metadata = item.metadata || {};
                    index++;

                    let fechaRegistro = '';
                    if (metadata.fecha_registro) {
                        const d = new Date(metadata.fecha_registro);
                        fechaRegistro = d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL');
                    }

                    datosExcel.push([
                        index,
                        item.FECHA || '',
                        item.T_Qx || '',
                        item.Jornada || '',
                        item.Cirujano || '',
                        item.Especialidad || '',
                        item.Anestesista || '',
                        item.Nombre_Paciente || '',
                        item.RUT || '',
                        item.Edad || '',
                        item.FICHA || '',
                        item.Diagnostico || '',
                        item.Intervencion_propuesta || '',
                        item.Condicion_LE || '',
                        item.ESTADO_DE_IQx || '',
                        item['1ra_Intervencion_Qx_Realizada'] || '',
                        item.Tipo_Actividad || '',
                        item['2da_Intervencion_Qx_Realizada'] || '',
                        item.Tipo_Actividad_2 || '',
                        item['3ra_Intervencion_Realizada'] || '',
                        item.Tipo_Actividad_3 || '',
                        item.Causal_de_suspension || '',
                        item.Motivo || '',
                        item.Observaciones || '',
                        item.T_Retraso || '',
                        item.Hora_de_entrada || '',
                        item.Hora_de_salida || '',
                        item.T_QX || '',
                        item.DESTINO || '',
                        metadata.pabellon || '',
                        metadata.registrado_por || '',
                        fechaRegistro
                    ]);
                }
            });

            try {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(datosExcel);
                ws['!cols'] = [
                    { wch: 5 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
                    { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 30 },
                    { wch: 15 }, { wch: 8 }, { wch: 15 }, { wch: 35 },
                    { wch: 40 }, { wch: 15 }, { wch: 25 }, { wch: 40 },
                    { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 40 },
                    { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 35 },
                    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
                    { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 20 }
                ];
                XLSX.utils.book_append_sheet(wb, ws, 'LibroQuirofano');

                const ahora = new Date();
                const fechaStr = ahora.toISOString().slice(0, 10);
                const nombreArchivo = `Libro_Quirofano_${fechaStr}.xlsx`;

                XLSX.writeFile(wb, nombreArchivo);

                showModal({
                    title: '✅ Exportación exitosa',
                    message: `Se exportaron <strong>${datosExcel.length - 1}</strong> registros a <strong>${nombreArchivo}</strong>.`,
                    icon: '✅',
                    confirmText: 'Aceptar'
                });

            } catch (error) {
                console.error('❌ Error al exportar a Excel:', error);
                showModal({
                    title: '❌ Error',
                    message: 'Hubo un problema al exportar los datos.<br>Intenta nuevamente.',
                    icon: '❌',
                    confirmText: 'Aceptar'
                });
            }
        }).catch(error => {
            console.error('❌ Error al obtener datos:', error);
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al obtener los datos.<br>Intenta nuevamente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        });
    }

    // =============================================================
    // 🔧 GENERAR CAMPO DE EDICIÓN
    // =============================================================
    // =============================================================
    // 🕐 NORMALIZAR VALOR DE HORA A FORMATO HH:mm
    // =============================================================
    // Los campos de tiempo (Hora_de_entrada, Hora_de_salida, T_QX, T_Qx,
    // T_Retraso) requieren formato HH:mm para poder mostrarse en un
    // <input type="time">. Algunos registros importados desde Excel
    // quedaron como horas decimales con coma o punto (ej: "1,5" = 1.5
    // horas = 1:30), lo que el navegador rechaza silenciosamente y
    // muestra el campo vacío. Esta función interpreta esos casos.
    function normalizarValorHora(valor) {
        if (valor === null || valor === undefined || valor === '') return '';

        let texto = String(valor).trim();
        if (texto === '') return '';

        // Ya viene en formato válido HH:mm o HH:mm:ss
        let m = texto.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
        if (m) {
            const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
            const mm = String(Math.min(59, parseInt(m[2], 10))).padStart(2, '0');
            return `${hh}:${mm}`;
        }

        // Hora decimal con coma o punto (ej: "1,5" o "1.5" → 1 hora 30 min)
        texto = texto.replace(',', '.');
        if (/^\d+(\.\d+)?$/.test(texto)) {
            let horasTotales = parseFloat(texto);
            // Si viene entre 0 y 1, podría ser un serial de hora de Excel (fracción de día)
            if (horasTotales > 0 && horasTotales < 1) {
                horasTotales = horasTotales * 24;
            }
            let hh = Math.floor(horasTotales);
            let mm = Math.round((horasTotales - hh) * 60);
            if (mm === 60) { mm = 0; hh += 1; }
            hh = Math.min(23, Math.max(0, hh));
            return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        }

        // No se pudo interpretar: se deja vacío para no romper el input
        return '';
    }

    async function generarCampoEdicion(col, valor, rowKey, data) {
        if (col === 'Jornada') {
            const opciones = await obtenerOpcionesDesplegable('Jornada');
            let opts = opciones.map(opt =>
                `<option value="${opt}" ${opt === valor ? 'selected' : ''}>${opt}</option>`
            ).join('');
            return `<select data-field="${col}" class="edit-field edit-select" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">${opts}</select>`;
        }

        if (col === 'ESTADO_DE_IQx') {
            const opciones = await obtenerOpcionesDesplegable('ESTADO_DE_IQx');
            let opts = opciones.map(opt =>
                `<option value="${opt}" ${opt === valor ? 'selected' : ''}>${opt}</option>`
            ).join('');
            return `<select data-field="${col}" class="edit-field edit-select" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">${opts}</select>`;
        }

        if (col === 'DESTINO') {
            const opciones = await obtenerOpcionesDesplegable('DESTINO');
            let opts = opciones.map(opt =>
                `<option value="${opt}" ${opt === valor ? 'selected' : ''}>${opt}</option>`
            ).join('');
            return `<select data-field="${col}" class="edit-field edit-select" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">${opts}</select>`;
        }

        if (col === 'Especialidad') {
            const opciones = await obtenerOpcionesDesplegable('Especialidad');
            let opts = opciones.map(opt =>
                `<option value="${opt}" ${opt === valor ? 'selected' : ''}>${opt}</option>`
            ).join('');
            return `<select data-field="${col}" class="edit-field edit-select" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">${opts}</select>`;
        }

        if (col === 'Causal_de_suspension') {
            const causalKeys = Object.keys(CAUSALES_SUSPENSION);
            let opts = '<option value="">Seleccione causal</option>';
            causalKeys.forEach(key => {
                const causal = CAUSALES_SUSPENSION[key];
                opts += `<option value="${key}" ${key === valor ? 'selected' : ''}>${causal.label}</option>`;
            });
            return `<select data-field="${col}" class="edit-field edit-select edit-causal" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">${opts}</select>`;
        }

        if (col === 'Motivo') {
            const causalKey = valor ? valor.split('-')[0].trim() : '';
            let motivos = [];
            if (causalKey && CAUSALES_SUSPENSION[causalKey]) {
                motivos = CAUSALES_SUSPENSION[causalKey].motivos || [];
            }
            let opts = '<option value="">Seleccione motivo</option>';
            motivos.forEach(m => {
                opts += `<option value="${m}" ${m === valor ? 'selected' : ''}>${m}</option>`;
            });
            const habilitado = causalKey ? '' : 'disabled';
            return `<select data-field="${col}" class="edit-field edit-select edit-motivo" ${habilitado} style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">${opts}</select>`;
        }

        if (col === '1ra_Intervencion_Qx_Realizada' || col === '2da_Intervencion_Qx_Realizada' || col === '3ra_Intervencion_Realizada') {
            let tipoActividadField = '';
            if (col === '1ra_Intervencion_Qx_Realizada') tipoActividadField = 'Tipo_Actividad';
            else if (col === '2da_Intervencion_Qx_Realizada') tipoActividadField = 'Tipo_Actividad_2';
            else if (col === '3ra_Intervencion_Realizada') tipoActividadField = 'Tipo_Actividad_3';

            const tipoActividadValor = data[tipoActividadField] || '';

            return `
                <div style="position:relative; width:100%;">
                    <textarea data-field="${col}" class="edit-field edit-intervencion edit-intervencion-textarea" rows="2" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box; resize:vertical; font-family:inherit; min-height:40px;">${valor}</textarea>
                    <div class="edit-intervencion-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; max-height:200px; overflow-y:auto; background:white; border:1px solid #ccc; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:10000; padding:4px 0;">
                    </div>
                    <div style="margin-top:4px; font-size:0.75rem; color:#64748b; display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:600;">Tipo Actividad:</span>
                        <span class="edit-tipo-actividad-display" data-target="${tipoActividadField}" style="font-weight:700; color:#1e293b; padding:2px 8px; background:#e8f5e9; border-radius:4px;">${tipoActividadValor || 'Seleccione intervención'}</span>
                    </div>
                </div>
            `;
        }

        if (col === 'FECHA') {
            let fechaVal = valor;
            if (valor && valor.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [dia, mes, anio] = valor.split('/');
                fechaVal = `${anio}-${mes}-${dia}`;
            }
            return `<input type="date" data-field="${col}" class="edit-field edit-date" value="${fechaVal}" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">`;
        }

        if (col === 'Hora_de_entrada' || col === 'Hora_de_salida' || col === 'T_QX' || col === 'T_Qx' || col === 'T_Retraso') {
            const valorHora = normalizarValorHora(valor);
            return `<input type="time" data-field="${col}" class="edit-field edit-time" step="60" value="${valorHora}" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">`;
        }

        if (col === 'RUT') {
            return `<input type="text" data-field="${col}" class="edit-field edit-rut" value="${valor}" placeholder="RUT" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">`;
        }

        if (col === 'Observaciones') {
            return `<textarea data-field="${col}" class="edit-field edit-observaciones" rows="3" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box; resize:vertical; font-family:inherit;">${valor}</textarea>`;
        }

        return `<input type="text" data-field="${col}" class="edit-field edit-text" value="${valor}" placeholder="${col}" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.85rem; background:white; box-sizing:border-box;">`;
    }

    // =============================================================
    // 🔍 GENERAR PANEL DE FILTROS
    // =============================================================
    function generarPanelFiltros(registros) {
        const obtenerValoresUnicos = (campo) => {
            const valores = new Set();
            registros.forEach(r => {
                const val = r[campo] || '';
                if (val && val !== '' && val !== 'Seleccione') {
                    valores.add(val);
                }
            });
            return Array.from(valores).sort();
        };

        const pabellones = new Set();
        registros.forEach(r => {
            const pab = r.metadata?.pabellon || '';
            if (pab && pab !== '') {
                pabellones.add(pab);
            }
        });
        const pabellonesList = Array.from(pabellones).sort();

        const filtrosSelect = [
            { campo: 'Jornada', label: 'Jornada' },
            { campo: 'Especialidad', label: 'Especialidad' },
            { campo: 'ESTADO_DE_IQx', label: 'ESTADO DE IQx' },
            { campo: 'Tipo_Actividad', label: 'Tipo Actividad' },
            { campo: 'Tipo_Actividad_2', label: 'Tipo Actividad 2' },
            { campo: 'Tipo_Actividad_3', label: 'Tipo Actividad 3' },
            { campo: 'DESTINO', label: 'DESTINO' }
        ];

        const filtrosAutocomplete = [
            { campo: 'Cirujano', label: 'Cirujano' },
            { campo: 'Anestesista', label: 'Anestesista' },
            { campo: 'Nombre_Paciente', label: 'Nombre Paciente' },
            { campo: 'RUT', label: 'RUT' },
            { campo: 'FICHA', label: 'FICHA' },
            { campo: 'Condicion_LE', label: 'Condición LE' },
            { campo: '1ra_Intervencion_Qx_Realizada', label: '1ra Intervención' },
            { campo: '2da_Intervencion_Qx_Realizada', label: '2da Intervención' },
            { campo: '3ra_Intervencion_Realizada', label: '3ra Intervención' },
            { campo: 'Causal_de_suspension', label: 'Causal de Suspensión' },
            { campo: 'Motivo', label: 'Motivo' },
            { campo: 'Observaciones', label: 'Observaciones' }
        ];

        let html = `
            <div class="filtros-panel" style="background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; padding:12px; margin-bottom:16px;">
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px;">
        `;

        html += `
            <div style="grid-column: span 2;">
                <label style="font-size:0.7rem; font-weight:600; color:#64748b; display:block; margin-bottom:3px;">📅 Rango de Fechas</label>
                <div style="display:flex; gap:6px; align-items:center;">
                    <input type="date" id="filtroFechaInicio" style="width:100%; padding:4px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem; background:white;">
                    <span style="font-size:0.7rem; color:#94a3b8;">a</span>
                    <input type="date" id="filtroFechaFin" style="width:100%; padding:4px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem; background:white;">
                </div>
            </div>
        `;

        let pabOptions = '<option value="">Todos</option>';
        pabellonesList.forEach(v => {
            pabOptions += `<option value="${v}">${v}</option>`;
        });
        html += `
            <div>
                <label style="font-size:0.7rem; font-weight:600; color:#64748b; display:block; margin-bottom:3px;">🏥 Pabellón</label>
                <select id="filtro_pabellon" class="filtro-select" data-campo="pabellon" style="width:100%; padding:4px 6px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem; background:white;">
                    ${pabOptions}
                </select>
            </div>
        `;

        filtrosSelect.forEach(f => {
            const valores = obtenerValoresUnicos(f.campo);
            const id = `filtro_${f.campo}`;
            let opts = `<option value="">Todos</option>`;
            valores.forEach(v => {
                opts += `<option value="${v}">${v}</option>`;
            });
            html += `
                <div>
                    <label style="font-size:0.7rem; font-weight:600; color:#64748b; display:block; margin-bottom:3px;">${f.label}</label>
                    <select id="${id}" class="filtro-select" data-campo="${f.campo}" style="width:100%; padding:4px 6px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem; background:white;">
                        ${opts}
                    </select>
                </div>
            `;
        });

        filtrosAutocomplete.forEach(f => {
            const valores = obtenerValoresUnicos(f.campo);
            const id = `filtro_${f.campo}`;
            let opts = `<option value="">Todos</option>`;
            valores.forEach(v => {
                opts += `<option value="${v}">${v}</option>`;
            });
            html += `
                <div>
                    <label style="font-size:0.7rem; font-weight:600; color:#64748b; display:block; margin-bottom:3px;">${f.label}</label>
                    <input type="text" id="${id}" class="filtro-autocomplete" data-campo="${f.campo}" placeholder="Filtrar..." style="width:100%; padding:4px 6px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem; background:white;" list="lista_${f.campo}">
                    <datalist id="lista_${f.campo}">
                        ${opts}
                    </datalist>
                </div>
            `;
        });

        html += `
                </div>
                <div style="display:flex; justify-content:flex-end; margin-top:10px; gap:8px;">
                    <button class="btn-sm btn-clear-filtros" id="limpiarFiltrosBtn" style="background:#e2e8f0; border:none; padding:6px 16px; border-radius:30px; font-size:0.7rem; font-weight:500; cursor:pointer; color:#475569;">🗑️ Limpiar filtros</button>
                </div>
            </div>
        `;

        return html;
    }

    // =============================================================
    // 🗓️ NORMALIZAR FECHA A FORMATO COMPARABLE (yyyy-mm-dd)
    // =============================================================
    // Los registros pueden venir de distintas fuentes (registro manual,
    // importación desde Excel, etc.) y el campo FECHA puede llegar en
    // formatos distintos: "31/07/2026", "31-07-2026", "2026-07-31",
    // "31/7/2026" (sin cero inicial), un número de serie de Excel,
    // o incluso un objeto Date. Esta función normaliza cualquiera de
    // esos formatos a "yyyy-mm-dd" para poder compararlos de forma
    // confiable contra los filtros de fecha.
    function normalizarFechaComparable(valor) {
        if (valor === null || valor === undefined || valor === '') return '';

        if (valor instanceof Date && !isNaN(valor)) {
            return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
        }

        if (typeof valor === 'number') {
            const base = new Date(Date.UTC(1899, 11, 30));
            const fecha = new Date(base.getTime() + valor * 86400000);
            return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
        }

        const texto = String(valor).trim();
        if (texto === '') return '';

        let m = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) {
            const dia = m[1].padStart(2, '0');
            const mes = m[2].padStart(2, '0');
            return `${m[3]}-${mes}-${dia}`;
        }

        m = texto.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (m) {
            const mes = m[2].padStart(2, '0');
            const dia = m[3].padStart(2, '0');
            return `${m[1]}-${mes}-${dia}`;
        }

        if (/^\d+(\.\d+)?$/.test(texto)) {
            const serial = parseFloat(texto);
            if (serial > 20000 && serial < 60000) {
                const base = new Date(Date.UTC(1899, 11, 30));
                const fecha = new Date(base.getTime() + serial * 86400000);
                return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
            }
        }

        const fechaParseada = new Date(texto);
        if (!isNaN(fechaParseada)) {
            return `${fechaParseada.getFullYear()}-${String(fechaParseada.getMonth() + 1).padStart(2, '0')}-${String(fechaParseada.getDate()).padStart(2, '0')}`;
        }

        return '';
    }

    function renderizarTablaLibro(registros, filtros = {}) {
        let datosFiltrados = registros;

        if (filtros.fechaInicio) {
            datosFiltrados = datosFiltrados.filter(r => {
                const fechaRegNorm = normalizarFechaComparable(r.FECHA);
                if (!fechaRegNorm) return false;
                return fechaRegNorm >= filtros.fechaInicio;
            });
        }
        if (filtros.fechaFin) {
            datosFiltrados = datosFiltrados.filter(r => {
                const fechaRegNorm = normalizarFechaComparable(r.FECHA);
                if (!fechaRegNorm) return false;
                return fechaRegNorm <= filtros.fechaFin;
            });
        }

        if (filtros.pabellon && filtros.pabellon !== '') {
            datosFiltrados = datosFiltrados.filter(r => {
                const pab = r.metadata?.pabellon || '';
                return pab === filtros.pabellon;
            });
        }

        const camposFiltro = [
            'Jornada', 'Especialidad', 'ESTADO_DE_IQx', 'Tipo_Actividad', 'Tipo_Actividad_2', 'Tipo_Actividad_3',
            'DESTINO', 'Cirujano', 'Anestesista', 'Nombre_Paciente', 'RUT', 'FICHA', 'Condicion_LE',
            '1ra_Intervencion_Qx_Realizada', '2da_Intervencion_Qx_Realizada', '3ra_Intervencion_Realizada',
            'Causal_de_suspension', 'Motivo', 'Observaciones'
        ];

        camposFiltro.forEach(campo => {
            const valor = filtros[campo] || '';
            if (valor && valor !== '') {
                datosFiltrados = datosFiltrados.filter(r => {
                    const val = r[campo] || '';
                    return val.toLowerCase().includes(valor.toLowerCase());
                });
            }
        });

        // --- Paginación: 15 registros por página ---
        const totalFiltrados = datosFiltrados.length;
        const totalPaginasLibro = Math.max(1, Math.ceil(totalFiltrados / REGISTROS_POR_PAGINA_LIBRO));
        if (paginaActualLibroQuirofano > totalPaginasLibro) paginaActualLibroQuirofano = totalPaginasLibro;
        if (paginaActualLibroQuirofano < 1) paginaActualLibroQuirofano = 1;
        const inicioPagina = (paginaActualLibroQuirofano - 1) * REGISTROS_POR_PAGINA_LIBRO;
        const datosPagina = datosFiltrados.slice(inicioPagina, inicioPagina + REGISTROS_POR_PAGINA_LIBRO);

        let html = `
            <div style="margin-top:8px;">
                <div style="font-size:0.85rem; color:#64748b; margin-bottom:8px;">
                    Mostrando <strong>${totalFiltrados === 0 ? 0 : inicioPagina + 1}-${Math.min(inicioPagina + REGISTROS_POR_PAGINA_LIBRO, totalFiltrados)}</strong> de <strong>${totalFiltrados}</strong> registros (${registros.length} en total)
                </div>
                <div class="table-wrap">
                    <table style="table-layout:fixed; width:100%;">
                        <colgroup>
                            <col style="width:4%;">
                            <col style="width:8%;">
                            <col style="width:15%;">
                            <col style="width:10%;">
                            <col style="width:11%;">
                            <col style="width:11%;">
                            <col style="width:22%;">
                            <col style="width:9%;">
                            <col style="width:10%;">
                        </colgroup>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>FECHA</th>
                                <th>Nombre Paciente</th>
                                <th>RUT</th>
                                <th>Especialidad</th>
                                <th>ESTADO_DE_IQx</th>
                                <th>Intervención Realizada</th>
                                <th>DESTINO</th>
                                <th style="text-align:center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (datosPagina.length === 0) {
            html += `
                <tr>
                    <td colspan="9" style="text-align:center; padding:30px; color:#94a3b8;">
                        No hay registros que coincidan con los filtros seleccionados.
                    </td>
                </tr>
            `;
        } else {
            datosPagina.forEach((item, index) => {
                const metadata = item.metadata || {};
                html += `
                    <tr>
                        <td style="text-align:center;">${inicioPagina + index + 1}</td>
                        <td>${item.FECHA || ''}</td>
                        <td><strong>${item.Nombre_Paciente || ''}</strong></td>
                        <td>${item.RUT ? formatearRut(item.RUT) : ''}</td>
                        <td>${item.Especialidad || ''}</td>
                        <td>${item.ESTADO_DE_IQx || ''}</td>
                        <td style="white-space:normal !important; word-wrap:break-word !important; word-break:break-word !important; overflow-wrap:break-word !important; vertical-align:top;">${item['1ra_Intervencion_Qx_Realizada'] || ''}</td>
                        <td>${item.DESTINO || ''}</td>
                        <td style="text-align:center; white-space:nowrap;">
                            <button class="btn-ver-detalle-libro" data-key="${item.id}" title="Ver detalles completos" style="background:transparent; border:1px solid #3b82f6; border-radius:4px; padding:2px 8px; cursor:pointer; color:#3b82f6; font-size:1rem;">
                                👁️
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                        </tbody>
                    </table>
                </div>
                ${generarControlesPaginacionLibro(totalPaginasLibro)}
            </div>
        `;

        setTimeout(() => {
            document.querySelectorAll('.btn-ver-detalle-libro').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.dataset.key;
                    if (key) {
                        mostrarDetalleLibro(key);
                    }
                });
            });

            document.querySelectorAll('.btn-pagina-libro').forEach(btn => {
                btn.addEventListener('click', function() {
                    if (this.disabled) return;
                    const nuevaPagina = parseInt(this.dataset.pagina, 10);
                    if (!nuevaPagina || nuevaPagina === paginaActualLibroQuirofano) return;
                    paginaActualLibroQuirofano = nuevaPagina;
                    const container = document.getElementById('libroTablaContainer');
                    if (container) {
                        container.innerHTML = renderizarTablaLibro(registros, filtros);
                    }
                });
            });
        }, 50);

        return html;
    }

    // =============================================================
    // 🔢 CONTROLES DE PAGINACIÓN DEL LIBRO DE QUIRÓFANO
    // =============================================================
    function generarControlesPaginacionLibro(totalPaginas) {
        if (totalPaginas <= 1) return '';

        const paginaActual = paginaActualLibroQuirofano;
        const estiloBoton = (deshabilitado) => `background:${deshabilitado ? '#f1f5f9' : 'white'}; border:1px solid #d1d9e6; border-radius:6px; padding:6px 14px; font-size:0.8rem; font-weight:500; color:${deshabilitado ? '#cbd5e1' : '#334155'}; cursor:${deshabilitado ? 'not-allowed' : 'pointer'};`;

        return `
            <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-top:14px;">
                <button class="btn-pagina-libro" data-pagina="${paginaActual - 1}" ${paginaActual <= 1 ? 'disabled' : ''} style="${estiloBoton(paginaActual <= 1)}">‹ Anterior</button>
                <span style="font-size:0.8rem; color:#64748b;">Página <strong>${paginaActual}</strong> de <strong>${totalPaginas}</strong></span>
                <button class="btn-pagina-libro" data-pagina="${paginaActual + 1}" ${paginaActual >= totalPaginas ? 'disabled' : ''} style="${estiloBoton(paginaActual >= totalPaginas)}">Siguiente ›</button>
            </div>
        `;
    }

    function inicializarFiltrosLibro(registros) {
        paginaActualLibroQuirofano = 1;
        const filtros = {};

        function aplicarFiltros() {
            paginaActualLibroQuirofano = 1;
            const fechaInicio = document.getElementById('filtroFechaInicio')?.value || '';
            const fechaFin = document.getElementById('filtroFechaFin')?.value || '';
            filtros.fechaInicio = fechaInicio;
            filtros.fechaFin = fechaFin;

            document.querySelectorAll('.filtro-select').forEach(el => {
                const campo = el.dataset.campo;
                const valor = el.value || '';
                filtros[campo] = valor;
            });

            document.querySelectorAll('.filtro-autocomplete').forEach(el => {
                const campo = el.dataset.campo;
                const valor = el.value || '';
                filtros[campo] = valor;
            });

            const tablaHTML = renderizarTablaLibro(registros, filtros);
            const container = document.getElementById('libroTablaContainer');
            if (container) {
                container.innerHTML = tablaHTML;
            }

            // ✅ NO enganchar listeners de '.btn-ver-detalle-libro' acá:
            // renderizarTablaLibro() ya lo hace internamente (con su propio
            // setTimeout). Hacerlo también acá duplicaba el listener en cada
            // botón, causando que un solo clic disparara mostrarDetalleLibro()
            // dos veces y se abrieran modales duplicados.

            document.getElementById('exportarExcelBtn')?.addEventListener('click', function() {
                exportarLibroAExcel();
            });
        }

        document.querySelectorAll('.filtro-select').forEach(el => {
            el.addEventListener('change', aplicarFiltros);
        });

        let timeoutId = null;
        document.querySelectorAll('.filtro-autocomplete').forEach(el => {
            el.addEventListener('input', function() {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    aplicarFiltros();
                }, 300);
            });
        });

        document.getElementById('filtroFechaInicio')?.addEventListener('change', aplicarFiltros);
        document.getElementById('filtroFechaFin')?.addEventListener('change', aplicarFiltros);

        document.querySelectorAll('.filtro-autocomplete').forEach(el => {
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(timeoutId);
                    aplicarFiltros();
                }
            });
        });

        document.getElementById('limpiarFiltrosBtn')?.addEventListener('click', function() {
            limpiarFiltrosLibro(registros);
        });
    }

    function limpiarFiltrosLibro(registros) {
        paginaActualLibroQuirofano = 1;
        const fechaInicio = document.getElementById('filtroFechaInicio');
        const fechaFin = document.getElementById('filtroFechaFin');
        if (fechaInicio) fechaInicio.value = '';
        if (fechaFin) fechaFin.value = '';

        document.querySelectorAll('.filtro-select').forEach(el => {
            el.value = '';
        });

        document.querySelectorAll('.filtro-autocomplete').forEach(el => {
            el.value = '';
        });

        const filtros = {};
        const tablaHTML = renderizarTablaLibro(registros, filtros);
        const container = document.getElementById('libroTablaContainer');
        if (container) {
            container.innerHTML = tablaHTML;
        }

        // ✅ Igual que en aplicarFiltros(): renderizarTablaLibro() ya
        // engancha sola los listeners de '.btn-ver-detalle-libro'.
    }

    async function mostrarDetalleLibro(key) {
        try {
            // ✅ Evitar modales duplicados: si el usuario hace doble clic en
            // "ver detalle" antes de que cargue, sin esto se apilan dos
            // overlays con los mismos id, y los botones (editar/eliminar/
            // cerrar) del que se ve en pantalla pueden quedar sin listener
            // porque document.getElementById() agarra el primero que
            // encuentra en el documento, no el visible.
            document.getElementById('detalleLibroModal')?.remove();

            const snapshot = await database.ref('registros_definitivos/' + key).once('value');
            const data = snapshot.val();

            if (!data) {
                showModal({
                    title: '❌ Error',
                    message: 'No se encontraron datos del registro.',
                    icon: '❌',
                    confirmText: 'Aceptar'
                });
                return;
            }

            const metadata = data.metadata || {};

            const ordenColumnas = [
                'FECHA', 'T_Qx', 'Jornada', 'Cirujano', 'Especialidad',
                'Anestesista', 'Nombre_Paciente', 'RUT', 'Edad', 'FICHA',
                'Diagnostico', 'Intervencion_propuesta', 'Condicion_LE',
                'ESTADO_DE_IQx', 'Causal_de_suspension', 'Motivo',
                '1ra_Intervencion_Qx_Realizada', 'Tipo_Actividad',
                '2da_Intervencion_Qx_Realizada', 'Tipo_Actividad_2',
                '3ra_Intervencion_Realizada', 'Tipo_Actividad_3',
                'T_Retraso', 'Hora_de_entrada', 'Hora_de_salida', 'T_QX', 'DESTINO'
            ];

            const nombresLegibles = {
                'FECHA': '📅 Fecha',
                'T_Qx': '⏱️ Tiempo Qx (Programado)',
                'Jornada': '🌅 Jornada',
                'Cirujano': '👨‍⚕️ Cirujano',
                'Especialidad': '🏥 Especialidad',
                'Anestesista': '💉 Anestesista',
                'Nombre_Paciente': '👤 Nombre del Paciente',
                'RUT': '🪪 RUT',
                'Edad': '🎂 Edad',
                'FICHA': '📋 Ficha',
                'Diagnostico': '📝 Diagnóstico',
                'Intervencion_propuesta': '📌 Intervención Propuesta',
                'Condicion_LE': '⚕️ Condición LE',
                'ESTADO_DE_IQx': '📊 Estado de IQx',
                'Causal_de_suspension': '📋 Causal de Suspensión',
                'Motivo': '📝 Motivo',
                '1ra_Intervencion_Qx_Realizada': '1️⃣ Intervención Realizada',
                'Tipo_Actividad': '📌 Tipo Actividad',
                '2da_Intervencion_Qx_Realizada': '2️⃣ Intervención Realizada 2',
                'Tipo_Actividad_2': '📌 Tipo Actividad 2',
                '3ra_Intervencion_Realizada': '3️⃣ Intervención Realizada 3',
                'Tipo_Actividad_3': '📌 Tipo Actividad 3',
                'T_Retraso': '⏱️ Tiempo Retraso',
                'Hora_de_entrada': '🕐 Hora de Entrada',
                'Hora_de_salida': '🕐 Hora de Salida',
                'T_QX': '⏱️ Tiempo Qx (Real)',
                'DESTINO': '🏥 Destino'
            };

            function generarContenidoVista() {
                let html = `
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:left; max-height:500px; overflow-y:auto; padding:4px;">
                `;

                ordenColumnas.forEach(col => {
                    const valor = data[col] || '';
                    const etiqueta = nombresLegibles[col] || col;
                    if (valor && valor !== '' && valor !== 'Seleccione') {
                        html += `
                            <div style="background:#f8fafc; padding:10px 14px; border-radius:8px; border-left:3px solid #3b82f6;">
                                <div style="font-size:0.7rem; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">${etiqueta}</div>
                                <div style="font-size:0.95rem; font-weight:500; color:#1e293b; margin-top:2px;">${valor}</div>
                            </div>
                        `;
                    }
                });

                let fechaRegistro = '';
                if (metadata.fecha_registro) {
                    const d = new Date(metadata.fecha_registro);
                    fechaRegistro = d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL');
                }

                html += `
                    </div>
                    <div style="margin-top:16px; padding-top:12px; border-top:1px solid #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:left;">
                        <div style="background:#f1f5f9; padding:8px 12px; border-radius:6px;">
                            <div style="font-size:0.65rem; font-weight:600; color:#64748b; text-transform:uppercase;">Registrado por</div>
                            <div style="font-size:0.85rem; font-weight:500; color:#1e293b;">${metadata.registrado_por || 'N/A'}</div>
                        </div>
                        <div style="background:#f1f5f9; padding:8px 12px; border-radius:6px;">
                            <div style="font-size:0.65rem; font-weight:600; color:#64748b; text-transform:uppercase;">Fecha de registro</div>
                            <div style="font-size:0.85rem; font-weight:500; color:#1e293b;">${fechaRegistro || 'N/A'}</div>
                        </div>
                        <div style="background:#f1f5f9; padding:8px 12px; border-radius:6px; grid-column: span 2;">
                            <div style="font-size:0.65rem; font-weight:600; color:#64748b; text-transform:uppercase;">Ubicación original</div>
                            <div style="font-size:0.85rem; font-weight:500; color:#1e293b;">${metadata.semana ? 'Semana ' + metadata.semana : ''} ${metadata.dia || ''} - ${metadata.pabellon || ''} - Fila ${metadata.fila || ''}</div>
                        </div>
                    </div>
                `;
                return html;
            }

            async function generarContenidoEdicion() {
                let html = `
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; text-align:left; max-height:500px; overflow-y:auto; padding:4px;">
                `;

                for (const col of ordenColumnas) {
                    const valor = data[col] || '';
                    const etiqueta = nombresLegibles[col] || col;
                    const campoHtml = await generarCampoEdicion(col, valor, key, data);
                    html += `
                        <div style="background:#f8fafc; padding:10px 14px; border-radius:8px; border-left:3px solid #10b981;">
                            <div style="font-size:0.7rem; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">${etiqueta}</div>
                            ${campoHtml}
                        </div>
                    `;
                }

                let fechaRegistro = '';
                if (metadata.fecha_registro) {
                    const d = new Date(metadata.fecha_registro);
                    fechaRegistro = d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL');
                }

                html += `
                    </div>
                    <div style="margin-top:16px; padding-top:12px; border-top:1px solid #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:left;">
                        <div style="background:#f1f5f9; padding:8px 12px; border-radius:6px;">
                            <div style="font-size:0.65rem; font-weight:600; color:#64748b; text-transform:uppercase;">Registrado por</div>
                            <div style="font-size:0.85rem; font-weight:500; color:#1e293b;">${metadata.registrado_por || 'N/A'}</div>
                        </div>
                        <div style="background:#f1f5f9; padding:8px 12px; border-radius:6px;">
                            <div style="font-size:0.65rem; font-weight:600; color:#64748b; text-transform:uppercase;">Fecha de registro</div>
                            <div style="font-size:0.85rem; font-weight:500; color:#1e293b;">${fechaRegistro || 'N/A'}</div>
                        </div>
                        <div style="background:#f1f5f9; padding:8px 12px; border-radius:6px; grid-column: span 2;">
                            <div style="font-size:0.65rem; font-weight:600; color:#64748b; text-transform:uppercase;">Ubicación original</div>
                            <div style="font-size:0.85rem; font-weight:500; color:#1e293b;">${metadata.semana ? 'Semana ' + metadata.semana : ''} ${metadata.dia || ''} - ${metadata.pabellon || ''} - Fila ${metadata.fila || ''}</div>
                        </div>
                    </div>
                `;
                return html;
            }

            let modoEdicion = false;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.id = 'detalleLibroModal';
            overlay.innerHTML = `
                <div class="modal-box" style="max-width: 700px; max-height: 90vh; overflow-y:auto;">
                    <span class="modal-icon">📘</span>
                    <div class="modal-title" id="detalleLibroTitle">Detalle del Registro - Libro de Quirófano</div>
                    <div class="modal-message" id="detalleLibroContent" style="text-align:left; margin-bottom:16px;">
                        ${generarContenidoVista()}
                    </div>
                    <div class="modal-actions" id="detalleLibroActions">
                        ${esAdministrador() ? `
                        <button class="modal-btn modal-btn-success" id="editarRegistroBtn">✏️ Editar</button>
                        <button class="modal-btn modal-btn-danger" id="eliminarRegistroBtn" style="background:#dc2626; color:white; box-shadow:0 4px 12px rgba(220,38,38,0.35);">🗑️ Eliminar</button>
                        ` : ''}
                        <button class="modal-btn modal-btn-cancel" id="cerrarDetalleLibro">✅ Cerrar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // ✅ Escopado a ESTE overlay (no document.getElementById global),
            // así funciona bien aunque por algún motivo quedara otro modal
            // de detalle abierto en el documento.
            const contentDiv = overlay.querySelector('#detalleLibroContent');
            const titleDiv = overlay.querySelector('#detalleLibroTitle');
            const editarBtn = overlay.querySelector('#editarRegistroBtn');
            const eliminarBtn = overlay.querySelector('#eliminarRegistroBtn');
            const cerrarBtn = overlay.querySelector('#cerrarDetalleLibro');

            async function actualizarContenido() {
                if (modoEdicion) {
                    contentDiv.innerHTML = await generarContenidoEdicion();
                    titleDiv.textContent = '✏️ Editando Registro - Libro de Quirófano';
                    editarBtn.textContent = '💾 Guardar Cambios';
                    editarBtn.style.background = '#16a34a';
                    editarBtn.style.color = 'white';
                    eliminarBtn.textContent = '❌ Cancelar';
                    eliminarBtn.style.background = '#f59e0b';
                    eliminarBtn.style.color = 'white';
                    aplicarEventosEdicion();
                } else {
                    contentDiv.innerHTML = generarContenidoVista();
                    titleDiv.textContent = 'Detalle del Registro - Libro de Quirófano';
                    editarBtn.textContent = '✏️ Editar';
                    editarBtn.style.background = '';
                    editarBtn.style.color = '';
                    eliminarBtn.textContent = '🗑️ Eliminar';
                    eliminarBtn.style.background = '#dc2626';
                    eliminarBtn.style.color = 'white';
                }
            }

            function aplicarEventosEdicion() {
                const causalSelect = contentDiv.querySelector('.edit-causal');
                if (causalSelect) {
                    causalSelect.addEventListener('change', function() {
                        const causalKey = this.value;
                        const motivoSelect = contentDiv.querySelector('.edit-motivo');
                        if (motivoSelect) {
                            let opts = '<option value="">Seleccione motivo</option>';
                            if (causalKey && CAUSALES_SUSPENSION[causalKey]) {
                                const motivos = CAUSALES_SUSPENSION[causalKey].motivos || [];
                                motivos.forEach(m => {
                                    opts += `<option value="${m}">${m}</option>`;
                                });
                                motivoSelect.disabled = false;
                            } else {
                                motivoSelect.disabled = true;
                            }
                            motivoSelect.innerHTML = opts;
                            motivoSelect.value = '';
                        }
                    });
                }

                const rutInput = contentDiv.querySelector('.edit-rut');
                if (rutInput) {
                    rutInput.addEventListener('input', function() {
                        let valor = this.value;
                        let limpio = valor.replace(/[^0-9Kk]/g, '').toUpperCase();
                        if (limpio.length > 1) {
                            this.value = formatearRut(limpio);
                        } else {
                            this.value = limpio;
                        }
                    });
                    rutInput.addEventListener('blur', function() {
                        const rutSinPuntos = this.value.replace(/[.\-]/g, '');
                        if (rutSinPuntos.length >= 8) {
                            const valido = validarRut(this.value);
                            this.style.borderColor = valido ? '#10b981' : '#dc2626';
                            this.style.backgroundColor = valido ? '#f0fdf4' : '#fef2f2';
                        } else {
                            this.style.borderColor = '#d1d9e6';
                            this.style.backgroundColor = 'white';
                        }
                    });
                }

                const fechaInput = contentDiv.querySelector('.edit-date');
                if (fechaInput) {
                    fechaInput.addEventListener('change', function() {
                        if (this.value) {
                            const [anio, mes, dia] = this.value.split('-');
                            this.dataset.fechaFormateada = `${dia}/${mes}/${anio}`;
                        }
                    });
                }

                const horaEntrada = contentDiv.querySelector('.edit-time[data-field="Hora_de_entrada"]');
                const horaSalida = contentDiv.querySelector('.edit-time[data-field="Hora_de_salida"]');
                const tqxInput = contentDiv.querySelector('.edit-time[data-field="T_QX"]');

                function calcularDuracionModal() {
                    if (!horaEntrada || !horaSalida || !tqxInput) return;
                    const entrada = horaEntrada.value;
                    const salida = horaSalida.value;
                    if (!entrada || !salida) {
                        tqxInput.value = '';
                        return;
                    }
                    const [h1, m1] = entrada.split(':').map(Number);
                    const [h2, m2] = salida.split(':').map(Number);
                    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) {
                        tqxInput.value = '';
                        return;
                    }
                    let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
                    if (minutos < 0) minutos += 1440;
                    const horas = Math.floor(minutos / 60);
                    const mins = minutos % 60;
                    tqxInput.value = `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                }

                if (horaEntrada) {
                    horaEntrada.addEventListener('change', calcularDuracionModal);
                    horaEntrada.addEventListener('input', calcularDuracionModal);
                }
                if (horaSalida) {
                    horaSalida.addEventListener('change', calcularDuracionModal);
                    horaSalida.addEventListener('input', calcularDuracionModal);
                }

                const obsTextarea = contentDiv.querySelector('.edit-observaciones');
                if (obsTextarea) {
                    function ajustarAltura(el) {
                        el.style.height = 'auto';
                        let nuevaAltura = el.scrollHeight;
                        if (nuevaAltura < 40) nuevaAltura = 40;
                        if (nuevaAltura > 120) nuevaAltura = 120;
                        el.style.height = nuevaAltura + 'px';
                    }
                    obsTextarea.addEventListener('input', function() {
                        ajustarAltura(this);
                    });
                    setTimeout(() => ajustarAltura(obsTextarea), 50);
                }

                const interTextareas = contentDiv.querySelectorAll('.edit-intervencion-textarea');
                interTextareas.forEach(textarea => {
                    const container = textarea.parentElement;
                    const dropdown = container.querySelector('.edit-intervencion-dropdown');
                    const col = textarea.dataset.field;

                    function populateDropdown(filter = '') {
                        dropdown.innerHTML = '';
                        const filtro = filter.toLowerCase().trim();
                        let visibleCount = 0;

                        INTERVENCIONES.forEach(interv => {
                            const nombre = interv.nombre.toLowerCase();
                            if (filtro === '' || nombre.includes(filtro)) {
                                const item = document.createElement('div');
                                item.style.cssText = 'padding:6px 12px; cursor:pointer; font-size:0.85rem; border-bottom:1px solid #f0f0f0; transition:background 0.15s;';
                                item.textContent = `${interv.nombre} (${interv.tipo})`;
                                item.addEventListener('mouseenter', () => {
                                    item.style.background = '#e8f0fe';
                                });
                                item.addEventListener('mouseleave', () => {
                                    item.style.background = 'transparent';
                                });
                                item.addEventListener('click', () => {
                                    textarea.value = interv.nombre;
                                    dropdown.style.display = 'none';
                                    textarea.dispatchEvent(new Event('input', { bubbles: true }));

                                    const tipoDisplay = container.querySelector('.edit-tipo-actividad-display');
                                    if (tipoDisplay) {
                                        const tipo = interv.tipo || '';
                                        tipoDisplay.textContent = tipo || 'Seleccione intervención';
                                        tipoDisplay.dataset.tipoActividad = tipo;
                                    }

                                    let tipoActividadField = '';
                                    if (col === '1ra_Intervencion_Qx_Realizada') tipoActividadField = 'Tipo_Actividad';
                                    else if (col === '2da_Intervencion_Qx_Realizada') tipoActividadField = 'Tipo_Actividad_2';
                                    else if (col === '3ra_Intervencion_Realizada') tipoActividadField = 'Tipo_Actividad_3';

                                    if (tipoActividadField) {
                                        const tipoInput = contentDiv.querySelector(`[data-field="${tipoActividadField}"]`);
                                        if (tipoInput) {
                                            const tipo = interv.tipo || '';
                                            tipoInput.value = tipo;
                                        }
                                    }
                                });
                                dropdown.appendChild(item);
                                visibleCount++;
                            }
                        });

                        dropdown.style.display = visibleCount > 0 ? 'block' : 'none';
                    }

                    textarea.addEventListener('input', function() {
                        populateDropdown(this.value);
                        this.style.height = 'auto';
                        let nuevaAltura = this.scrollHeight;
                        if (nuevaAltura < 40) nuevaAltura = 40;
                        if (nuevaAltura > 80) nuevaAltura = 80;
                        this.style.height = nuevaAltura + 'px';
                    });

                    textarea.addEventListener('focus', function() {
                        populateDropdown(this.value);
                    });

                    textarea.addEventListener('blur', function() {
                        setTimeout(() => {
                            dropdown.style.display = 'none';
                        }, 200);
                    });

                    textarea.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            const items = dropdown.querySelectorAll('div');
                            if (items.length > 0) {
                                e.preventDefault();
                                const firstItem = items[0];
                                textarea.value = firstItem.textContent.replace(/\s*\(.*\)\s*$/, '');
                                dropdown.style.display = 'none';
                                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }
                        if (e.key === 'Escape') {
                            dropdown.style.display = 'none';
                        }
                    });

                    document.addEventListener('click', function(e) {
                        if (!container.contains(e.target)) {
                            dropdown.style.display = 'none';
                        }
                    });

                    setTimeout(() => {
                        textarea.style.height = 'auto';
                        let nuevaAltura = textarea.scrollHeight;
                        if (nuevaAltura < 40) nuevaAltura = 40;
                        if (nuevaAltura > 80) nuevaAltura = 80;
                        textarea.style.height = nuevaAltura + 'px';
                    }, 100);
                });
            }

            if (editarBtn) editarBtn.addEventListener('click', async function() {
                if (modoEdicion) {
                    const camposEditados = contentDiv.querySelectorAll('.edit-field');
                    const datosActualizados = {};
                    camposEditados.forEach(input => {
                        const field = input.dataset.field;
                        let valor = input.value;
                        if (input.classList.contains('edit-date') && input.dataset.fechaFormateada) {
                            valor = input.dataset.fechaFormateada;
                        }
                        if (input.classList.contains('edit-rut')) {
                            valor = input.value;
                        }
                        datosActualizados[field] = valor;
                    });

                    const tipoDisplays = contentDiv.querySelectorAll('.edit-tipo-actividad-display');
                    tipoDisplays.forEach(display => {
                        const targetField = display.dataset.target;
                        const valor = display.dataset.tipoActividad || display.textContent;
                        if (targetField && valor !== 'Seleccione intervención' && valor !== '') {
                            datosActualizados[targetField] = valor;
                        } else {
                            datosActualizados[targetField] = '';
                        }
                    });

                    const confirmado = await showModal({
                        title: '💾 Guardar Cambios',
                        message: '¿Estás seguro de que deseas guardar los cambios en este registro?',
                        icon: '💾',
                        confirmText: '✅ Guardar',
                        cancelText: 'Cancelar',
                        type: 'warning'
                    });

                    if (!confirmado) return;

                    try {
                        await database.ref('registros_definitivos/' + key).update(datosActualizados);
                        Object.keys(datosActualizados).forEach(field => {
                            data[field] = datosActualizados[field];
                        });

                        showModal({
                            title: '✅ Cambios guardados',
                            message: 'Los cambios se han guardado correctamente.',
                            icon: '✅',
                            confirmText: 'Aceptar'
                        });

                        modoEdicion = false;
                        await actualizarContenido();
                        cargarLibroQuirofano();

                    } catch (error) {
                        console.error('❌ Error al guardar cambios:', error);
                        showModal({
                            title: '❌ Error',
                            message: 'Hubo un problema al guardar los cambios.<br>Intenta nuevamente.',
                            icon: '❌',
                            confirmText: 'Aceptar'
                        });
                    }
                } else {
                    modoEdicion = true;
                    await actualizarContenido();
                }
            });

            if (eliminarBtn) eliminarBtn.addEventListener('click', async function() {
                if (modoEdicion) {
                    modoEdicion = false;
                    await actualizarContenido();
                    return;
                }

                const confirmado = await showModal({
                    title: '🗑️ Eliminar Registro',
                    message: '¿Estás seguro de que deseas eliminar este registro del Libro de Quirófano?<br><br><strong>Esta acción no se puede deshacer.</strong>',
                    icon: '🗑️',
                    confirmText: '✅ Eliminar',
                    cancelText: 'Cancelar',
                    type: 'danger'
                });

                if (!confirmado) return;

                try {
                    await database.ref('registros_definitivos/' + key).remove();

                    showModal({
                        title: '✅ Registro eliminado',
                        message: 'El registro ha sido eliminado del Libro de Quirófano.',
                        icon: '✅',
                        confirmText: 'Aceptar'
                    });

                    const box = overlay.querySelector('.modal-box');
                    box.classList.add('closing');
                    overlay.classList.add('closing');
                    setTimeout(() => overlay.remove(), 300);

                    cargarLibroQuirofano();

                } catch (error) {
                    console.error('❌ Error al eliminar registro:', error);
                    showModal({
                        title: '❌ Error',
                        message: 'Hubo un problema al eliminar el registro.<br>Intenta nuevamente.',
                        icon: '❌',
                        confirmText: 'Aceptar'
                    });
                }
            });

            cerrarBtn.addEventListener('click', function() {
                const box = overlay.querySelector('.modal-box');
                box.classList.add('closing');
                overlay.classList.add('closing');
                setTimeout(() => overlay.remove(), 300);
            });

            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    const box = overlay.querySelector('.modal-box');
                    box.classList.add('closing');
                    overlay.classList.add('closing');
                    setTimeout(() => overlay.remove(), 300);
                }
            });

        } catch (error) {
            console.error('❌ Error al cargar detalle del registro:', error);
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al cargar los detalles del registro.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
    }