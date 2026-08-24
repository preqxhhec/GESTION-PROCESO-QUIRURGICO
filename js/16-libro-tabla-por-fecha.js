
    // =============================================================
    // 📅 LIBRO DE QUIRÓFANO - TABLA POR FECHA (SOLO LECTURA)
    // =============================================================
    // Carga los pacientes de PAB 1 y PAB 2 para una fecha específica,
    // tomados directamente de "registros_definitivos" (Libro de Quirófano).
    // Es de SOLO LECTURA: no incluye selects, inputs ni botones de edición,
    // solo la información ya registrada. Incluye botón de impresión.
    // =============================================================

    // Caché en memoria de los últimos registros cargados (para poder imprimir sin re-consultar)
    let registrosLibroFechaActual = null;
    let fechaLibroFechaActual = '';

    // Columnas que se muestran tanto en pantalla como en la impresión
    // width: ancho sugerido de la columna (# es angosta, Intervención Realizada es la más ancha)
    const COLUMNAS_LIBRO_POR_FECHA = [
        { key: 'Nombre_Paciente', label: 'Paciente', width: '13%' },
        { key: 'RUT', label: 'RUT', width: '8%' },
        { key: 'Edad', label: 'Edad', width: '5%' },
        { key: 'FICHA', label: 'Ficha', width: '7%' },
        { key: 'Especialidad', label: 'Especialidad', width: '10%' },
        { key: '1ra_Intervencion_Qx_Realizada', label: 'Intervención Realizada', width: '26%' },
        { key: 'ESTADO_DE_IQx', label: 'Estado IQx', width: '11%' },
        { key: 'Hora_de_entrada', label: 'Entrada', width: '6%' },
        { key: 'Hora_de_salida', label: 'Salida', width: '6%' },
        { key: 'T_QX', label: 'T. Qx', width: '6%' },
        { key: 'DESTINO', label: 'Destino', width: '8%' }
    ];

    // Ancho fijo de la columna "#" (máximo 2 dígitos: hasta 99 filas)
    const ANCHO_COLUMNA_NUMERO = '28px';

    // =============================================================
    // 🗓️ NORMALIZAR FECHA A FORMATO COMPARABLE (yyyy-mm-dd)
    // =============================================================
    // Los registros pueden venir de distintas fuentes (registro manual,
    // importación desde Excel, etc.) y el campo FECHA puede llegar en
    // formatos distintos: "31/07/2026", "31-07-2026", "2026-07-31",
    // "31/7/2026" (sin cero inicial), un número de serie de Excel,
    // o incluso un objeto Date. Esta función normaliza cualquiera de
    // esos formatos a "yyyy-mm-dd" para poder compararlos de forma
    // confiable contra el valor del <input type="date">.
    function normalizarFechaComparable(valor) {
        if (valor === null || valor === undefined || valor === '') return '';

        // Objeto Date
        if (valor instanceof Date && !isNaN(valor)) {
            return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
        }

        // Número de serie de fecha de Excel (ej: 46234)
        if (typeof valor === 'number') {
            const base = new Date(Date.UTC(1899, 11, 30));
            const fecha = new Date(base.getTime() + valor * 86400000);
            return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
        }

        const texto = String(valor).trim();
        if (texto === '') return '';

        // dd/mm/yyyy, d/m/yyyy, dd-mm-yyyy, etc. (día y mes con 1 o 2 dígitos)
        let m = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) {
            const dia = m[1].padStart(2, '0');
            const mes = m[2].padStart(2, '0');
            return `${m[3]}-${mes}-${dia}`;
        }

        // yyyy-mm-dd o yyyy/mm/dd, con o sin hora (ISO / Firebase)
        m = texto.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (m) {
            const mes = m[2].padStart(2, '0');
            const dia = m[3].padStart(2, '0');
            return `${m[1]}-${mes}-${dia}`;
        }

        // Número de serie de Excel guardado como texto (ej: "46234")
        if (/^\d+(\.\d+)?$/.test(texto)) {
            const serial = parseFloat(texto);
            if (serial > 20000 && serial < 60000) {
                const base = new Date(Date.UTC(1899, 11, 30));
                const fecha = new Date(base.getTime() + serial * 86400000);
                return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
            }
        }

        // Último recurso: dejar que el motor de JS intente parsear
        const fechaParseada = new Date(texto);
        if (!isNaN(fechaParseada)) {
            return `${fechaParseada.getFullYear()}-${String(fechaParseada.getMonth() + 1).padStart(2, '0')}-${String(fechaParseada.getDate()).padStart(2, '0')}`;
        }

        return '';
    }

    // =============================================================
    // 🔄 CARGAR REGISTROS DEFINITIVOS DE UNA FECHA
    // =============================================================
    async function cargarTablaLibroPorFecha(fechaISO) {
        const container = document.getElementById('libroFechaTablaContainer');
        const btnImprimir = document.getElementById('libroFechaImprimirBtn');
        if (!container) return;

        if (!fechaISO) {
            container.innerHTML = '';
            if (btnImprimir) btnImprimir.style.display = 'none';
            registrosLibroFechaActual = null;
            fechaLibroFechaActual = '';
            return;
        }

        container.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">⏳ Cargando registros...</div>`;
        if (btnImprimir) btnImprimir.style.display = 'none';

        // El input type="date" entrega yyyy-mm-dd; los registros se guardan como dd/mm/yyyy
        const [anio, mes, dia] = fechaISO.split('-');
        const fechaFormateada = `${dia}/${mes}/${anio}`;

        try {
            const snapshot = await database.ref('registros_definitivos').once('value');
            const data = snapshot.val();

            if (!data) {
                container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">No hay registros definitivos para el ${fechaFormateada}.</div>`;
                registrosLibroFechaActual = null;
                fechaLibroFechaActual = '';
                return;
            }

            const GRUPO_SIN_PABELLON = 'Sin Pabellón Asignado';
            const registrosDelDia = { 'PAB 1': [], 'PAB 2': [], [GRUPO_SIN_PABELLON]: [] };

            Object.keys(data).forEach(key => {
                const item = data[key];
                if (normalizarFechaComparable(item.FECHA) !== fechaISO) return;

                const pab = item.metadata?.pabellon || '';
                if (pab === 'PAB 1' || pab === 'PAB 2') {
                    registrosDelDia[pab].push(item);
                } else {
                    registrosDelDia[GRUPO_SIN_PABELLON].push(item);
                }
            });

            // Orden alfabético por nombre del paciente dentro de cada grupo
            ['PAB 1', 'PAB 2', GRUPO_SIN_PABELLON].forEach(pab => {
                registrosDelDia[pab].sort((a, b) =>
                    (a.Nombre_Paciente || '').localeCompare(b.Nombre_Paciente || '')
                );
            });

            const totalRegistros = registrosDelDia['PAB 1'].length + registrosDelDia['PAB 2'].length + registrosDelDia[GRUPO_SIN_PABELLON].length;

            if (totalRegistros === 0) {
                container.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">No hay registros definitivos para el ${fechaFormateada}.</div>`;
                registrosLibroFechaActual = null;
                fechaLibroFechaActual = '';
                return;
            }

            registrosLibroFechaActual = registrosDelDia;
            fechaLibroFechaActual = fechaFormateada;

            container.innerHTML = renderTablasSoloLecturaPorPabellon(registrosDelDia, fechaFormateada);

            if (btnImprimir) btnImprimir.style.display = 'inline-flex';

        } catch (error) {
            console.error('❌ Error al cargar tabla del Libro por fecha:', error);
            container.innerHTML = `<div style="text-align:center; padding:30px; color:#dc2626;">❌ Error al cargar los registros de esa fecha.</div>`;
            registrosLibroFechaActual = null;
            fechaLibroFechaActual = '';
        }
    }

    // =============================================================
    // 🧾 RENDER TABLAS DE SOLO LECTURA (SIN SELECTS NI INPUTS)
    // =============================================================
    function renderTablasSoloLecturaPorPabellon(registrosDelDia, fechaFormateada) {
        let html = `<div style="font-size:0.85rem; color:#64748b; margin:8px 0 12px;">📅 Registros definitivos del <strong>${fechaFormateada}</strong></div>`;

        const GRUPO_SIN_PABELLON = 'Sin Pabellón Asignado';
        const gruposEstilo = {
            'PAB 1': { icono: '🏥', bg: '#e8f4fd', color: '#0b2a4f' },
            'PAB 2': { icono: '🏥', bg: '#e8f4fd', color: '#0b2a4f' },
            [GRUPO_SIN_PABELLON]: { icono: '⚠️', bg: '#fef3c7', color: '#92400e' }
        };

        const countPab1 = (registrosDelDia['PAB 1'] || []).length;
        const countPab2 = (registrosDelDia['PAB 2'] || []).length;
        const countSinPabellon = (registrosDelDia[GRUPO_SIN_PABELLON] || []).length;

        // Si todos los registros del día caen en "Sin Pabellón Asignado",
        // no tiene sentido mostrar PAB 1 y PAB 2 vacíos: se ocultan.
        // En cualquier otro caso, PAB 1 y PAB 2 se muestran siempre
        // (aunque uno de los dos esté vacío), tal como hoy.
        const soloSinPabellon = countPab1 === 0 && countPab2 === 0 && countSinPabellon > 0;

        let gruposAMostrar;
        if (soloSinPabellon) {
            gruposAMostrar = [GRUPO_SIN_PABELLON];
        } else {
            gruposAMostrar = ['PAB 1', 'PAB 2'];
            if (countSinPabellon > 0) gruposAMostrar.push(GRUPO_SIN_PABELLON);
        }

        gruposAMostrar.forEach(pab => {
            const filas = registrosDelDia[pab] || [];
            const estilo = gruposEstilo[pab];

            html += `<div class="titulo-pabellon" style="font-size:1rem; font-weight:700; color:${estilo.color}; margin:16px 0 8px 0; padding:6px 14px; background:${estilo.bg}; border-radius:6px; display:inline-block;">${estilo.icono} ${pab} (${filas.length})</div>`;
            html += `<div class="table-wrap"><table style="table-layout:fixed; width:100%;"><thead><tr><th style="width:${ANCHO_COLUMNA_NUMERO}; min-width:${ANCHO_COLUMNA_NUMERO}; max-width:${ANCHO_COLUMNA_NUMERO}; text-align:center;">#</th>`;
            COLUMNAS_LIBRO_POR_FECHA.forEach(c => {
                html += `<th style="width:${c.width}; word-wrap:break-word;">${c.label}</th>`;
            });
            html += `</tr></thead><tbody>`;

            if (filas.length === 0) {
                html += `<tr><td colspan="${COLUMNAS_LIBRO_POR_FECHA.length + 1}" style="text-align:center; padding:20px; color:#94a3b8;">Sin registros en este grupo</td></tr>`;
            } else {
                filas.forEach((fila, idx) => {
                    html += `<tr><td style="width:${ANCHO_COLUMNA_NUMERO}; text-align:center;">${idx + 1}</td>`;
                    COLUMNAS_LIBRO_POR_FECHA.forEach(c => {
                        let val = fila[c.key] || '';
                        if (c.key === 'RUT' && val) val = formatearRut(val);
                        html += `<td style="width:${c.width}; word-wrap:break-word !important; word-break:break-word !important; white-space:normal !important; vertical-align:top;">${val}</td>`;
                    });
                    html += `</tr>`;
                });
            }

            html += `</tbody></table></div>`;
        });

        return html;
    }

    // =============================================================
    // 🖨️ IMPRIMIR TABLA DEL LIBRO POR FECHA
    // =============================================================
    function imprimirTablaLibroPorFecha() {
        if (!registrosLibroFechaActual || !fechaLibroFechaActual) {
            showModal({
                title: 'ℹ️ Sin datos',
                message: 'Primero selecciona una fecha con registros para poder imprimir.',
                icon: 'ℹ️',
                confirmText: 'Aceptar'
            });
            return;
        }

        let contenidoHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Libro de Quirófano - ${fechaLibroFechaActual}</title>
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
                        margin: 12mm;
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
                    .membrete .logo img {
                        height: 70px;
                        width: auto;
                        background: rgba(255,255,255,0.9);
                        padding: 4px;
                        border-radius: 6px;
                    }
                    .membrete .info { flex: 1; }
                    .membrete .info h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.5px; }
                    .membrete .info .sub { font-size: 0.9rem; opacity: 0.85; }
                    .membrete .info .fecha-dia { font-size: 1rem; font-weight: 600; margin-top: 4px; }
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
                        font-size: 0.62rem;
                        margin-bottom: 16px;
                        table-layout: fixed;
                    }
                    .tabla-print th {
                        background: #1e293b;
                        color: white;
                        padding: 5px 3px;
                        text-align: center;
                        font-weight: 600;
                        font-size: 0.55rem;
                        text-transform: uppercase;
                        letter-spacing: 0.2px;
                        border: 1px solid #1e293b;
                    }
                    .tabla-print td {
                        padding: 4px 3px;
                        border: 1px solid #d1d9e6;
                        text-align: center;
                        font-size: 0.6rem;
                        vertical-align: middle;
                        word-wrap: break-word;
                    }
                    .tabla-print tr:nth-child(even) td { background: #f8fafc; }
                    .tabla-print .sin-datos { text-align: center; padding: 20px; color: #94a3b8; font-style: italic; }
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
                        .membrete,
                        .tabla-print th,
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
                        <h1>📘 Libro de Quirófano · Registros Definitivos</h1>
                        <div class="sub">Hospital Dr. Humberto Elorza Cortés · Illapel, Chile</div>
                        <div class="fecha-dia">📅 ${fechaLibroFechaActual}</div>
                    </div>
                </div>
        `;

        const GRUPO_SIN_PABELLON_PRINT = 'Sin Pabellón Asignado';
        const iconosGrupoPrint = { 'PAB 1': '🏥', 'PAB 2': '🏥', [GRUPO_SIN_PABELLON_PRINT]: '⚠️' };

        const countPab1Print = (registrosLibroFechaActual['PAB 1'] || []).length;
        const countPab2Print = (registrosLibroFechaActual['PAB 2'] || []).length;
        const countSinPabellonPrint = (registrosLibroFechaActual[GRUPO_SIN_PABELLON_PRINT] || []).length;
        const soloSinPabellonPrint = countPab1Print === 0 && countPab2Print === 0 && countSinPabellonPrint > 0;

        let gruposAImprimir;
        if (soloSinPabellonPrint) {
            gruposAImprimir = [GRUPO_SIN_PABELLON_PRINT];
        } else {
            gruposAImprimir = ['PAB 1', 'PAB 2'];
            if (countSinPabellonPrint > 0) gruposAImprimir.push(GRUPO_SIN_PABELLON_PRINT);
        }

        gruposAImprimir.forEach(pab => {
            const filas = registrosLibroFechaActual[pab] || [];

            contenidoHTML += `<div class="titulo-pabellon">${iconosGrupoPrint[pab]} ${pab}</div><table class="tabla-print"><thead><tr><th style="width:${ANCHO_COLUMNA_NUMERO};">#</th>`;
            COLUMNAS_LIBRO_POR_FECHA.forEach(c => {
                contenidoHTML += `<th style="width:${c.width};">${c.label}</th>`;
            });
            contenidoHTML += `</tr></thead><tbody>`;

            if (filas.length === 0) {
                contenidoHTML += `<tr><td colspan="${COLUMNAS_LIBRO_POR_FECHA.length + 1}" class="sin-datos">No hay registros en este grupo</td></tr>`;
            } else {
                filas.forEach((fila, idx) => {
                    contenidoHTML += `<tr><td>${idx + 1}</td>`;
                    COLUMNAS_LIBRO_POR_FECHA.forEach(c => {
                        let val = fila[c.key] || '';
                        if (c.key === 'RUT' && val) val = formatearRut(val);
                        contenidoHTML += `<td>${val}</td>`;
                    });
                    contenidoHTML += `</tr>`;
                });
            }

            contenidoHTML += `</tbody></table>`;
        });

        const fechaActual = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL');
        contenidoHTML += `
                <div class="footer-print">
                    <div class="left">© Dr. Danilo A. Nava La C. · Jéfe del Proceso Quirúrgico</div>
                    <div class="right">Impreso: ${fechaActual} · Pabellón 1, Pabellón 2 y Sin Pabellón Asignado</div>
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
