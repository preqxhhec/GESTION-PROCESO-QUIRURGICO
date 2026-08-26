    // =============================================================
    // 🧭 NAVEGACIÓN ENTRE SECCIONES
    // =============================================================

    const navRegistro = document.getElementById('navRegistro');
    const navDiferidos = document.getElementById('navDiferidos');
    const navLibro = document.getElementById('navLibro');
    const navEstadisticas = document.getElementById('navEstadisticas');
    const navAdmin = document.getElementById('navAdmin');
    const navManual = document.getElementById('navManual');
    const navListaEspera = document.getElementById('navListaEspera');
    const diferidosContent = document.getElementById('diferidosContent');
    const libroContent = document.getElementById('libroContent');
    const estadisticasContent = document.getElementById('estadisticasContent');
    const adminContent = document.getElementById('adminContent');
    const manualContent = document.getElementById('manualContent');
    const listaEsperaContent = document.getElementById('listaEsperaContent');
    const menuToggle = document.getElementById('menuToggle');
    const menuDropdown = document.getElementById('menuDropdown');

    let seccionActiva = 'registro';

    // =============================================================
    // 📋 CARGAR PACIENTES DIFERIDOS
    // =============================================================
    async function cargarPacientesDiferidos() {
        if (!currentUser) {
            diferidosContent.innerHTML = `
                <div style="text-align:center; padding:40px; color:#64748b;">
                    <p>🔐 Inicia sesión para ver los pacientes diferidos.</p>
                </div>
            `;
            return;
        }

        try {
            const snapshot = await database.ref('pacientes_diferidos').once('value');
            const data = snapshot.val();

            if (!data) {
                diferidosContent.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#64748b;">
                        <p style="font-size:2rem; margin-bottom:10px;">📭</p>
                        <p>No hay pacientes diferidos.</p>
                    </div>
                `;
                return;
            }

            let html = `
                <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:8px;">
                    <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px;">
                        📤 Pacientes Diferidos (${Object.keys(data).length})
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>FECHA</th>
                                    <th>T_Qx</th>
                                    <th>Jornada</th>
                                    <th>Cirujano</th>
                                    <th>Especialidad</th>
                                    <th>Anestesista</th>
                                    <th>Nombre Paciente</th>
                                    <th>RUT</th>
                                    <th>Edad</th>
                                    <th>FICHA</th>
                                    <th>Diagnostico</th>
                                    <th>Intervención</th>
                                    <th>Condicion LE</th>
                                    <th>ESTADO_DE_IQx</th>
                                    <th>Motivo</th>
                                    <th>Diferido por</th>
                                    <th>Fecha</th>
                                    <th style="text-align:center;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            let index = 0;
            Object.keys(data).forEach(key => {
                const item = data[key];
                const metadata = item.metadata || {};
                index++;

                let fechaDiferido = '';
                if (metadata.fecha_diferido) {
                    const d = new Date(metadata.fecha_diferido);
                    fechaDiferido = d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL');
                }

                html += `
                    <tr>
                        <td style="text-align:center;">${index}</td>
                        <td>${item.FECHA || ''}</td>
                        <td>${item.T_Qx || ''}</td>
                        <td>${item.Jornada || ''}</td>
                        <td>${item.Cirujano || ''}</td>
                        <td>${item.Especialidad || ''}</td>
                        <td>${item.Anestesista || ''}</td>
                        <td><strong>${item.Nombre_Paciente || ''}</strong></td>
                        <td>${item.RUT || ''}</td>
                        <td>${item.Edad || ''}</td>
                        <td>${item.FICHA || ''}</td>
                        <td>${item.Diagnostico || ''}</td>
                        <td>${item.Intervencion_propuesta || ''}</td>
                        <td>${item.Condicion_LE || ''}</td>
                        <td>${item.ESTADO_DE_IQx || ''}</td>
                        <td>${item.Motivo || ''}</td>
                        <td style="font-size:0.7rem;">${metadata.diferido_por || ''}</td>
                        <td style="font-size:0.7rem;">${fechaDiferido}</td>
                        <td style="text-align:center; white-space:nowrap;">
                            ${usuarioTieneAccesoSeccion('diferidos_reintegrar') ? `<button class="btn-reintegrar" data-key="${key}" title="Reintegrar a la tabla" style="background:transparent; border:1px solid #10b981; border-radius:4px; padding:2px 6px; cursor:pointer; color:#10b981; font-size:1rem; margin-right:4px;">
                                ↩️
                            </button>` : ''}
                            ${usuarioTieneAccesoSeccion('diferidos_eliminar') ? `<button class="btn-eliminar-diferido" data-key="${key}" title="Eliminar registro" style="background:transparent; border:1px solid #ef4444; border-radius:4px; padding:2px 6px; cursor:pointer; color:#ef4444; font-size:1rem;">
                                🗑️
                            </button>` : ''}
                        </td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            diferidosContent.innerHTML = html;

            document.querySelectorAll('.btn-eliminar-diferido').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.dataset.key;
                    if (key) {
                        eliminarPacienteDiferido(key);
                    }
                });
            });

            document.querySelectorAll('.btn-reintegrar').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.dataset.key;
                    if (key) {
                        mostrarModalReintegrar(key);
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error al cargar pacientes diferidos:', error);
            diferidosContent.innerHTML = `
                <div style="text-align:center; padding:40px; color:#dc2626;">
                    <p>❌ Error al cargar los pacientes diferidos.</p>
                </div>
            `;
        }
    }

    async function eliminarPacienteDiferido(key) {
        if (!currentUser) {
            showModal({
                title: '⛔ No autenticado',
                message: 'Debes iniciar sesión para eliminar un paciente diferido.',
                icon: '⛔',
                confirmText: 'Aceptar'
            });
            return;
        }

        const confirmado = await showModal({
            title: '🗑️ Eliminar paciente diferido',
            message: '¿Estás seguro de que deseas eliminar este registro de "Pacientes Diferidos"?<br><br><strong>Esta acción no se puede deshacer.</strong>',
            icon: '🗑️',
            confirmText: '✅ Eliminar',
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (!confirmado) return;

        try {
            await database.ref('pacientes_diferidos/' + key).remove();
            console.log(`✅ Paciente diferido eliminado: ${key}`);

            showModal({
                title: '✅ Eliminado',
                message: 'El paciente ha sido eliminado de "Pacientes Diferidos".',
                icon: '✅',
                confirmText: 'Aceptar'
            });

            cargarPacientesDiferidos();

        } catch (error) {
            console.error('❌ Error al eliminar paciente diferido:', error);
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al eliminar el paciente.<br>Intenta nuevamente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
    }

    async function mostrarModalReintegrar(key) {
        try {
            const snapshot = await database.ref('pacientes_diferidos/' + key).once('value');
            const data = snapshot.val();

            if (!data) {
                showModal({
                    title: '❌ Error',
                    message: 'No se encontraron datos del paciente.',
                    icon: '❌',
                    confirmText: 'Aceptar'
                });
                return;
            }

            const nombrePaciente = data.Nombre_Paciente || 'sin nombre';

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box" style="max-width: 500px;">
                    <span class="modal-icon">↩️</span>
                    <div class="modal-title">Reintegrar Paciente</div>
                    <div class="modal-message">
                        Reintegrar a <strong>${nombrePaciente}</strong>
                        <br><br>
                        Selecciona el destino en la tabla quirúrgica:
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
                        <div>
                            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Semana</label>
                            <select id="reintegrarSemana" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                                ${semanas.map((_, idx) => `<option value="${idx}">Semana ${idx + 1}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Día</label>
                            <select id="reintegrarDia" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                                ${DIAS.map((dia, idx) => `<option value="${idx}">${dia}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Pabellón</label>
                            <select id="reintegrarPab" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                                ${PABS.map((pab, idx) => `<option value="${idx}">${pab}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px; color:#475569;">Fila</label>
                            <select id="reintegrarFila" style="width:100%; padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                                ${Array.from({length: 10}, (_, i) => `<option value="${i}">Fila ${i + 1}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div id="reintegrarError" style="color:#dc2626; font-size:0.9rem; margin-bottom:12px; min-height:24px;"></div>
                    <div class="modal-actions">
                        <button class="modal-btn modal-btn-cancel" id="reintegrarCancelar">Cancelar</button>
                        <button class="modal-btn modal-btn-success" id="reintegrarConfirmar">✅ Reintegrar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const semanaSelect = overlay.querySelector('#reintegrarSemana');
            const diaSelect = overlay.querySelector('#reintegrarDia');
            const pabSelect = overlay.querySelector('#reintegrarPab');
            const filaSelect = overlay.querySelector('#reintegrarFila');
            const errorDiv = overlay.querySelector('#reintegrarError');
            const confirmarBtn = overlay.querySelector('#reintegrarConfirmar');
            const cancelarBtn = overlay.querySelector('#reintegrarCancelar');

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
                await reintegrarPaciente(key, semanaIdx, diaIdx, pabIdx, filaIdx, data);
            });

            cancelarBtn.addEventListener('click', cerrar);
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) cerrar();
            });

        } catch (error) {
            console.error('❌ Error al cargar datos del paciente:', error);
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al cargar los datos del paciente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
    }

    async function reintegrarPaciente(key, semanaIdx, diaIdx, pabIdx, filaIdx, data) {
    try {
        const semana = semanas[semanaIdx];
        const day = semana[diaIdx];
        const pabName = PABS[pabIdx];
        const rows = day.pabs[pabName];
        const filaDestino = rows[filaIdx];

        // ✅ Usar CAMPOS_A_COPIAR en lugar del array manual
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

        // ✅ Copiar SOLO los campos definidos en CAMPOS_A_COPIAR
        CAMPOS_A_COPIAR.forEach(campo => {
            filaDestino[campo] = data[campo] || '';
        });

        const rowKey = `${semanaIdx}-${diaIdx}-${pabIdx}-${filaIdx}`;
        await guardarFilaEnFirebase(rowKey, filaDestino);

        await database.ref('pacientes_diferidos/' + key).remove();

        // 🩺 Si el registro diferido venía de Lista de Espera (viajó vía
        // CAMPOS_A_COPIAR), sincroniza el estatus con la fila nueva — el
        // paciente vuelve a "Programado en Tabla" con esta ubicación (ver
        // js/31-le-bridge-cargar-a-tabla.js).
        if (filaDestino['LE_PacienteKey'] && typeof leSincronizarEstatusDesdeFila === 'function') {
            const ubicacionDestino = `Semana ${semanaIdx + 1} - ${DIAS[diaIdx]} - ${pabName} - Fila ${filaIdx + 1}`;
            await leSincronizarEstatusDesdeFila(filaDestino, ubicacionDestino);
        }

        renderWeekView();
        cargarPacientesDiferidos();

        showModal({
            title: '✅ Paciente reintegrado',
            message: `El paciente <strong>${data.Nombre_Paciente || 'sin nombre'}</strong> ha sido reintegrado a:<br><br>📅 Semana ${semanaIdx + 1} - ${DIAS[diaIdx]}<br>🏥 ${pabName} - Fila ${filaIdx + 1}`,
            icon: '✅',
            confirmText: 'Aceptar'
        });

    } catch (error) {
        console.error('❌ Error al reintegrar paciente:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al reintegrar el paciente.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}

    // =============================================================
    // 📘 LIBRO DE QUIRÓFANO
    // =============================================================

    async function cargarLibroQuirofano() {
        if (!currentUser) {
            libroContent.innerHTML = `
                <div style="text-align:center; padding:40px; color:#64748b;">
                    <p>🔐 Inicia sesión para ver el Libro de Quirófano.</p>
                </div>
            `;
            return;
        }

        try {
            const snapshot = await database.ref('registros_definitivos').once('value');
            const data = snapshot.val();

            if (!data) {
                libroContent.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#64748b;">
                        <p style="font-size:2rem; margin-bottom:10px;">📘</p>
                        <p>No hay registros en el Libro de Quirófano.</p>
                    </div>
                `;
                return;
            }

            const registros = [];
            Object.keys(data).forEach(key => {
                const item = data[key];
                const metadata = item.metadata || {};
                registros.push({
                    id: key,
                    ...item,
                    metadata: metadata
                });
            });

            const filtrosHTML = generarPanelFiltros(registros);
            const tablaHTML = renderizarTablaLibro(registros, {});

            const mostrarExportarExcelLibro = usuarioTieneAccesoSeccion('libro_exportarExcel') ?
                `<button class="btn-sm btn-excel" id="exportarExcelBtn" style="background:#1e7e34; color:white; border:none; padding:6px 16px; border-radius:30px; font-size:0.7rem; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px;">
                    📊 Exportar a Excel
                </button>` : '';

            libroContent.innerHTML = `
                ${renderLibroFechaUI()}

                <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:16px;">
                    <div style="font-size:1.3rem; font-weight:700; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <span>📘 Libro de Quirófano (${registros.length} registros)</span>
                        ${mostrarExportarExcelLibro}
                    </div>
                    <div id="libroFiltrosContainer">
                        ${filtrosHTML}
                    </div>
                    <div id="libroTablaContainer">
                        ${tablaHTML}
                    </div>
                </div>
            `;

            inicializarFiltrosLibro(registros);

            document.getElementById('exportarExcelBtn')?.addEventListener('click', function() {
                exportarLibroAExcel();
            });

            // 📅 Vista rápida por fecha (solo lectura + imprimir) — HTML y listeners
            // viven en 17-libro-por-fecha-ui.js, este solo dispara la inicialización.
            inicializarLibroFechaUI();

        } catch (error) {
            console.error('❌ Error al cargar Libro de Quirófano:', error);
            libroContent.innerHTML = `
                <div style="text-align:center; padding:40px; color:#dc2626;">
                    <p>❌ Error al cargar el Libro de Quirófano.</p>
                </div>
            `;
        }
    }

    // =============================================================
    // ⚙️ ADMINISTRADOR - PANEL DE CONTROL
    // =============================================================
    async function cargarAdmin() {
        if (!esSuperAdministrador()) {
            adminContent.innerHTML = `
                <div style="text-align:center; padding:40px; color:#dc2626;">
                    <p style="font-size:3rem; margin-bottom:10px;">⛔</p>
                    <p style="font-size:1.2rem; font-weight:600;">Acceso denegado</p>
                    <p style="color:#64748b;">Solo el superadministrador puede acceder a esta sección.</p>
                </div>
            `;
            return;
        }

        adminContent.innerHTML = `
            <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:20px; margin-top:8px;">
                <div style="font-size:1.5rem; font-weight:700; margin-bottom:16px; display:flex; align-items:center; gap:12px;">
                    ⚙️ Panel de Administración
                    <span style="font-size:0.8rem; font-weight:400; color:#64748b; background:#f1f5f9; padding:4px 12px; border-radius:20px;">
                        ${currentUserEmail}
                    </span>
                </div>
                
                <div style="background:white; border-radius:12px; border:1px solid #e2e8f0; padding:16px; margin-bottom:16px;">
                    <div style="font-size:1.1rem; font-weight:600; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                        <span>👥 Gestión de Usuarios</span>
                        <button class="btn-sm btn-add" id="crearUsuarioBtn" style="background:#1e293b; color:white; border:none; padding:6px 16px; border-radius:30px; cursor:pointer;">+ Crear Usuario</button>
                    </div>
                    <div id="usuariosLista">
                        <p style="color:#94a3b8; text-align:center; padding:20px;">Cargando usuarios...</p>
                    </div>
                </div>
                
                <div style="background:white; border-radius:12px; border:1px solid #e2e8f0; padding:16px; margin-bottom:16px;">
                    <div style="font-size:1.1rem; font-weight:600; margin-bottom:12px;">
                        📋 Gestión de Desplegables Fijos
                    </div>
                    <div id="desplegablesLista">
                        <p style="color:#94a3b8; text-align:center; padding:20px;">Cargando opciones...</p>
                    </div>
                </div>

                <div style="background:white; border-radius:12px; border:1px solid #e2e8f0; padding:16px;">
                    <div style="font-size:1.1rem; font-weight:600; margin-bottom:4px;">
                        👨‍⚕️ Médicos por Especialidad (campo Cirujano)
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-bottom:12px;">
                        Elige una especialidad para editar su lista de médicos.
                    </div>
                    <div id="medicosEspecialidadLista">
                        <p style="color:#94a3b8; text-align:center; padding:20px;">Cargando médicos...</p>
                    </div>
                </div>

                <div style="background:white; border-radius:12px; border:1px solid #e2e8f0; padding:16px;">
                    <div style="font-size:1.1rem; font-weight:600; margin-bottom:4px;">
                        💬 Plantillas de WhatsApp
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-bottom:12px;">
                        Mensajes predeterminados que se pueden enviar desde cada fila de la Tabla Quirúrgica.
                    </div>
                    <div id="whatsappPlantillasLista">
                        <p style="color:#94a3b8; text-align:center; padding:20px;">Cargando plantillas...</p>
                    </div>
                </div>
            </div>
        `;

        await precargarDesplegables();
        cargarUsuarios();
        cargarDesplegables();
        cargarMedicosPorEspecialidad();
        cargarPlantillasWhatsAppAdmin();

        document.getElementById('crearUsuarioBtn')?.addEventListener('click', function() {
            mostrarModalCrearUsuario();
        });
    }