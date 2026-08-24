// =============================================================
// 🩺 LISTA DE ESPERA — MÓDULO 3: TABLA MAESTRA DE PACIENTES
// =============================================================
// Portado desde "LISTA DE ESPERA APP/script.js": tabla de pacientes con
// filtros/orden/duplicados, modal de detalle, editar/eliminar paciente y
// eliminar entradas del historial.
//
// `currentUserRole === 'admin'` → esAdministrador() (eliminar historial es
// una acción de "puede editar/gestionar", no de taxonomía — por eso no usa
// esSuperAdministrador(), a diferencia del CRUD de listas en js/29).
// `db.` → `database.`. Persistencia de filtros en localStorage usa la
// clave 'le_prequirurgico_filtros' (con prefijo "le_" para dejar claro que
// es de este módulo, ya que localStorage es compartido por todo el origen).
// =============================================================

let leLastFilters = {
    busquedaGeneral: '', filterEspecialidad: '', filterMedico: '', filterEstatus: '',
    filterPrioridad: '', filterGes: '', filterComuna: '', filterFechaDesde: '', filterFechaHasta: '',
    filterPercentil: '', soloSinFolio: false, mostrarDuplicados: false, soloSinProgramacion: false,
    ocultarNoGestionables: false, mostrarMultiEspecialidad: false,
    fuentePercentilLista: 'fechaIndQx'
};

// =============================================================
// 🧱 RENDER DE LA SECCIÓN (filtros + tabla)
// =============================================================

function leRenderListaPacientesHTML() {
    return `
        <h2 style="margin-bottom:16px;">Lista de Pacientes</h2>

        <div class="filters sticky-filters">
            <div class="filter-group" style="flex:2; min-width:200px;">
                <label>🔍 Búsqueda General</label>
                <input type="text" id="busquedaGeneral" placeholder="Buscar por nombre, RUT, diagnóstico, intervención..." onkeyup="leFilterPatients()" style="width:100%;">
            </div>
            <div class="filter-group"><label>Especialidad</label><select id="filterEspecialidad" onchange="leActualizarFiltroMedicos(); leFilterPatients();"></select></div>
            <div class="filter-group"><label>Médico Tratante</label><select id="filterMedico" onchange="leFilterPatients()"><option value="">Todos los Médicos</option></select></div>
            <div class="filter-group"><label>Estatus Tabla</label><select id="filterEstatus" onchange="leFilterPatients()"></select></div>
            <div class="filter-group">
                <label>Prioridad</label>
                <select id="filterPrioridad" onchange="leFilterPatients()">
                    <option value="">Todas las Prioridades</option>
                    <option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option>
                </select>
            </div>
            <div class="filter-group">
                <label>✅ GES</label>
                <select id="filterGes" onchange="leFilterPatients()">
                    <option value="">Todos</option><option value="SI">GES Sí</option><option value="NO">GES No</option>
                </select>
            </div>
            <div class="filter-group"><label>Comuna</label><select id="filterComuna" onchange="leFilterPatients()"><option value="">Todas las Comunas</option></select></div>
            <div class="filter-group">
                <label>Percentil</label>
                <select id="filterPercentil" onchange="filtroPercentil = this.value; leFilterPatients();">
                    <option value="">Todos los percentiles</option>
                    <option value="p25">Percentil 25</option><option value="p50">Percentil 50</option>
                    <option value="p75">Percentil 75</option><option value="p90">Percentil 90</option>
                    <option value="resto">Mayor espera</option>
                </select>
            </div>
            <div class="filter-group" style="min-width:200px;">
                <label>📊 Calcular T. Espera desde:</label>
                <select id="fuentePercentilLista" onchange="leCambiarFuenteLista(this.value)" style="width:100%;">
                    <option value="fechaIndQx">Fecha Indicación Qx</option>
                    <option value="fechaEstatusProgram">Fecha Estatus Programable</option>
                </select>
            </div>
            <div class="filter-group"><label>Desde (Ind. Qx)</label><input type="date" id="filterFechaDesde" onchange="leFilterPatients()"></div>
            <div class="filter-group"><label>Hasta (Ind. Qx)</label><input type="date" id="filterFechaHasta" onchange="leFilterPatients()"></div>

            <button onclick="leClearFilters()" class="btn-secondary">Limpiar Filtros</button>
            <button onclick="leToggleDuplicados()" id="btnDuplicados" class="btn-secondary">Duplicados (RUT+Esp)</button>
            <button id="btnMultiEspecialidad" onclick="leToggleMultiEspecialidad()" class="btn-secondary" style="background:#8b5cf6; color:white;">🔀 Multi-Especialidad</button>
            <button onclick="leToggleSinFolio()" id="btnSinFolio" class="btn-secondary">Sin Folio</button>
            <button onclick="leToggleSinProgramacion()" id="btnSinProgramacion" class="btn-secondary">📅 Sin Fecha Prog</button>
            <button onclick="leToggleNoGestionables()" id="btnNoGestionables" class="btn-secondary" style="background:#64748b; color:white;">🚫 Ocultar No Gestionables</button>
            <button onclick="downloadCSV()" class="btn-secondary" style="background:#10b981; color:white;">📥 Descargar CSV</button>
            <button onclick="downloadExcel()" class="btn-secondary" style="background:#2563eb; color:white;">📊 Descargar Excel</button>
            <button onclick="printPatientList()" class="btn-secondary" style="background:#f97316; color:white;">🖨️ Imprimir Lista</button>
            <button onclick="descargarRegistroLlamadas()" class="btn-secondary" style="background:#8b5cf6; color:white;">📞 Descargar Registro de Llamadas</button>
            <button onclick="imprimirRegistroLlamadas()" class="btn-secondary" style="background:#f59e0b; color:white;">🖨️ Imprimir Registro de Llamadas</button>
        </div>

        <div id="resultadosContador"></div>

        <div class="table-container scrollable-table">
            <table id="patientsTable">
                <thead>
                    <tr>
                        <th>ID</th><th>Estatus</th><th>Fecha Ind. Qx</th><th>T. Espera</th><th>T. Esp. Prog.</th>
                        <th>Nombre y Apellido</th><th>RUT</th><th>Edad</th><th>Especialidad</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="tableBody"></tbody>
            </table>
        </div>
    `;
}

function leInicializarSeccionListaPacientes(container) {
    container.innerHTML = leRenderListaPacientesHTML();
    leCargarFiltrosListaPacientes();
    leCargarFiltrosDesdeStorage();
    leRestaurarFiltros();
}

// =============================================================
// 🔽 FILTROS DESPLEGABLES (Especialidad / Médico / Estatus / Comuna)
// =============================================================

function leCargarFiltrosListaPacientes() {
    const filterEsp = document.getElementById('filterEspecialidad');
    if (filterEsp) {
        filterEsp.innerHTML = '<option value="">Todas las Especialidades</option>' +
            especialidadesLista.map(esp => `<option value="${esp}">${esp}</option>`).join('');
    }

    const filterMedico = document.getElementById('filterMedico');
    if (filterMedico) filterMedico.innerHTML = '<option value="">Todos los Médicos</option>';

    const filterEstatus = document.getElementById('filterEstatus');
    if (filterEstatus) {
        filterEstatus.innerHTML = '<option value="">Todos los Estatus</option>' +
            estatusTablaLista.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    }

    const filterComuna = document.getElementById('filterComuna');
    if (filterComuna) {
        filterComuna.innerHTML = '<option value="">Todas las Comunas</option>' +
            comunasLista.map(c => `<option value="${c}">${c}</option>`).join('');
    }
}

function leActualizarFiltroMedicos() {
    const medicoFilter = document.getElementById('filterMedico');
    const especialidad = document.getElementById('filterEspecialidad').value;
    medicoFilter.innerHTML = '<option value="">Todos los Médicos</option>';
    if (especialidad && medicosPorEspecialidad[especialidad]) {
        medicosPorEspecialidad[especialidad].forEach(med => {
            const opt = document.createElement('option');
            opt.value = med;
            opt.textContent = med;
            medicoFilter.appendChild(opt);
        });
    }
}

// =============================================================
// 🔃 TABLA: RENDER + ORDEN
// =============================================================

function leRenderPatientsTable(data) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (mostrarDuplicados || mostrarMultiEspecialidad) {
        data.sort((a, b) => (a.rut || '').localeCompare(b.rut || ''));
    } else if (sortActive && currentSortColumn) {
        data.sort((a, b) => {
            let valA, valB;
            switch (currentSortColumn) {
                case 'tEspera':
                    valA = getDiasEspera(a, 'lista'); valB = getDiasEspera(b, 'lista'); break;
                case 'esperaProgram':
                    valA = calculateWaitingDays(a.fechaEstatusProgram); valB = calculateWaitingDays(b.fechaEstatusProgram); break;
                case 'fechaIndQx':
                    valA = new Date(a.fechaIndQx || 0); valB = new Date(b.fechaIndQx || 0); break;
                case 'edad':
                    valA = parseInt(a.edad) || 0; valB = parseInt(b.edad) || 0; break;
                default:
                    valA = (a[currentSortColumn] || '').toString().toLowerCase();
                    valB = (b[currentSortColumn] || '').toString().toLowerCase();
            }
            if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    data.forEach((patient) => {
        const fechaFormateada = patient.fechaIndQx ? formatDate(patient.fechaIndQx) : '-';
        const diasEspera = getDiasEspera(patient, 'lista');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${patient.id || '-'}</strong></td>
            <td>${patient.estatusTabla || '-'}</td>
            <td>${fechaFormateada}</td>
            <td><strong>${diasEspera}</strong></td>
            <td>${patient.fechaEstatusProgram ? calculateWaitingDays(patient.fechaEstatusProgram) : '-'}</td>
            <td>${patient.nombreApellido || ''}</td>
            <td>${patient.rut || ''}</td>
            <td>${patient.edad || ''}</td>
            <td>${patient.especialidad || ''}</td>
            <td>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button onclick="leShowPatientModal('${patient.firebaseKey}')" title="Ver" style="background:transparent; border:1px solid #3b82f6; border-radius:4px; padding:2px 8px; cursor:pointer; color:#3b82f6; font-size:1rem;">👁️</button>
                    ${(esGestionable(patient) && !leYaEstaEnTabla(patient) && !currentUserSoloLecturaTabla) ? `<button onclick="leMostrarModalCargarATabla('${patient.firebaseKey}')" title="Cargar a la Tabla" style="background:transparent; border:1px solid #0b2a4f; border-radius:4px; padding:2px 8px; cursor:pointer; color:#0b2a4f; font-size:1rem;">📋</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function leMakeTableSortable() {
    const headers = document.querySelectorAll('#patientsTable th');
    const columnKeys = ['id', 'estatusTabla', 'fechaIndQx', 'tEspera', 'esperaProgram', 'nombreApellido', 'rut', 'edad', 'especialidad'];
    const sortableColumns = ['fechaIndQx', 'tEspera', 'esperaProgram', 'edad'];

    function actualizarFlechas() {
        headers.forEach(h => { h.textContent = h.textContent.replace(/ [↑↓]$/, ''); });
        if (sortActive && currentSortColumn) {
            const index = columnKeys.indexOf(currentSortColumn);
            if (index !== -1 && headers[index]) {
                headers[index].textContent += currentSortOrder === 'asc' ? ' ↑' : ' ↓';
            }
        }
    }
    actualizarFlechas();

    headers.forEach((th, index) => {
        const column = columnKeys[index];
        if (!column || !sortableColumns.includes(column)) {
            th.style.cursor = 'default';
            th.onclick = null;
            return;
        }

        if (mostrarDuplicados || mostrarMultiEspecialidad) {
            th.style.cursor = 'default';
            th.onclick = null;
            th.title = 'Ordenamiento deshabilitado cuando Duplicados o Multi-Especialidad están activos';
            return;
        }

        th.style.cursor = 'pointer';
        th.title = '';
        th.onclick = function () {
            if (currentSortColumn === column) {
                if (currentSortOrder === 'asc') {
                    currentSortOrder = 'desc';
                    sortActive = true;
                } else {
                    if (column === 'fechaIndQx') {
                        currentSortOrder = 'asc';
                        sortActive = true;
                    } else {
                        sortActive = true;
                        currentSortColumn = 'fechaIndQx';
                        currentSortOrder = 'desc';
                    }
                }
            } else {
                currentSortColumn = column;
                currentSortOrder = 'asc';
                sortActive = true;
            }
            actualizarFlechas();
            leFilterPatients();
        };
    });
}

// =============================================================
// 🔍 FILTRADO PRINCIPAL
// =============================================================

function leFilterPatients() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').toLowerCase().trim();
    const especialidad = document.getElementById('filterEspecialidad')?.value || '';
    const medico = document.getElementById('filterMedico')?.value || '';
    const estatus = document.getElementById('filterEstatus')?.value || '';
    const prioridad = document.getElementById('filterPrioridad')?.value || '';
    const ges = document.getElementById('filterGes')?.value || '';
    const comuna = document.getElementById('filterComuna')?.value || '';
    const fechaDesde = document.getElementById('filterFechaDesde')?.value || '';
    const fechaHasta = document.getElementById('filterFechaHasta')?.value || '';

    let filtered = patients.filter(p => {
        let pasa = true;

        if (busqueda) {
            const texto = `${p.nombreApellido || ''} ${p.rut || ''} ${p.diagnostico || ''} ${p.intervencion || ''} ${p.especialidad || ''} ${p.medicoTratante || ''}`.toLowerCase();
            if (!texto.includes(busqueda)) pasa = false;
        }

        if (especialidad && p.especialidad !== especialidad) pasa = false;
        if (medico && p.medicoTratante !== medico) pasa = false;
        if (estatus && p.estatusTabla !== estatus) pasa = false;
        if (prioridad && p.prioridad !== prioridad) pasa = false;
        if (ges && p.ges !== ges) pasa = false;
        if (comuna && p.comuna !== comuna) pasa = false;

        if (fechaDesde || fechaHasta) {
            const fechaInd = new Date(p.fechaIndQx || 0);
            if (fechaDesde && fechaInd < new Date(fechaDesde)) pasa = false;
            if (fechaHasta && fechaInd > new Date(fechaHasta)) pasa = false;
        }

        if (soloSinFolio && (p.folio || '').toString().trim() !== '') pasa = false;
        if (soloSinProgramacion && (p.fechaEstatusProgram || '').toString().trim() !== '') pasa = false;

        if (ocultarNoGestionables && !esGestionable(p)) pasa = false;

        if (filtroPercentil) {
            const dias = getDiasEspera(p, 'lista');
            if (dias <= 0) pasa = false;
            else if (filtroPercentil === 'p25' && dias > percentilesGlobales.p25) pasa = false;
            else if (filtroPercentil === 'p50' && (dias <= percentilesGlobales.p25 || dias > percentilesGlobales.p50)) pasa = false;
            else if (filtroPercentil === 'p75' && (dias <= percentilesGlobales.p50 || dias > percentilesGlobales.p75)) pasa = false;
            else if (filtroPercentil === 'p90' && (dias <= percentilesGlobales.p75 || dias > percentilesGlobales.p90)) pasa = false;
            else if (filtroPercentil === 'resto' && dias <= percentilesGlobales.p90) pasa = false;
        }

        return pasa;
    });

    if (mostrarDuplicados) {
        const gestionables = filtered.filter(esGestionable);
        const claveCount = {};
        gestionables.forEach(p => {
            if (p.rut) {
                const clave = `${p.rut}|${p.especialidad || 'SIN_ESPECIALIDAD'}`;
                claveCount[clave] = (claveCount[clave] || 0) + 1;
            }
        });
        filtered = filtered.filter(p => {
            if (!p.rut || !esGestionable(p)) return false;
            const clave = `${p.rut}|${p.especialidad || 'SIN_ESPECIALIDAD'}`;
            return claveCount[clave] > 1;
        });
        filtered.sort((a, b) => (a.rut || '').localeCompare(b.rut || ''));
    }

    if (mostrarMultiEspecialidad) {
        const gestionables = filtered.filter(esGestionable);
        const rutEspecialidades = {};
        gestionables.forEach(p => {
            if (p.rut) {
                if (!rutEspecialidades[p.rut]) rutEspecialidades[p.rut] = new Set();
                rutEspecialidades[p.rut].add(p.especialidad || 'SIN_ESPECIALIDAD');
            }
        });
        const rutsMultiEsp = Object.keys(rutEspecialidades).filter(rut => rutEspecialidades[rut].size > 1);
        filtered = filtered.filter(p => p.rut && esGestionable(p) && rutsMultiEsp.includes(p.rut));
        filtered.sort((a, b) => (a.rut || '').localeCompare(b.rut || ''));
    }

    leRenderPatientsTable(filtered);
    leMostrarContadorResultados(filtered.length);
    leGuardarFiltrosEnStorage();
}

// Misma lógica de filtros que leFilterPatients() pero SIN tocar el DOM de
// la tabla — la usan las exportaciones/impresiones (CSV, Excel, listado
// impreso, registro de llamadas) para trabajar siempre sobre "lo que se ve
// en pantalla ahora mismo", igual que en la app original.
function leGetCurrentFilteredData() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').toLowerCase().trim();
    const especialidad = document.getElementById('filterEspecialidad')?.value || '';
    const medico = document.getElementById('filterMedico')?.value || '';
    const estatus = document.getElementById('filterEstatus')?.value || '';
    const prioridad = document.getElementById('filterPrioridad')?.value || '';
    const ges = document.getElementById('filterGes')?.value || '';
    const comuna = document.getElementById('filterComuna')?.value || '';
    const fechaDesde = document.getElementById('filterFechaDesde')?.value || '';
    const fechaHasta = document.getElementById('filterFechaHasta')?.value || '';

    let filtered = [...patients];

    if (busqueda) {
        filtered = filtered.filter(p => `${p.nombreApellido || ''} ${p.rut || ''} ${p.diagnostico || ''} ${p.intervencion || ''} ${p.especialidad || ''} ${p.medicoTratante || ''}`.toLowerCase().includes(busqueda));
    }
    if (especialidad) filtered = filtered.filter(p => p.especialidad === especialidad);
    if (medico) filtered = filtered.filter(p => p.medicoTratante === medico);
    if (estatus) filtered = filtered.filter(p => p.estatusTabla === estatus);
    if (prioridad) filtered = filtered.filter(p => p.prioridad === prioridad);
    if (ges) filtered = filtered.filter(p => p.ges === ges);
    if (comuna) filtered = filtered.filter(p => p.comuna === comuna);

    if (fechaDesde || fechaHasta) {
        filtered = filtered.filter(p => {
            const fechaInd = new Date(p.fechaIndQx || 0);
            if (fechaDesde && fechaInd < new Date(fechaDesde)) return false;
            if (fechaHasta && fechaInd > new Date(fechaHasta)) return false;
            return true;
        });
    }

    if (soloSinFolio) filtered = filtered.filter(p => (p.folio || '').toString().trim() === '');
    if (soloSinProgramacion) filtered = filtered.filter(p => (p.fechaEstatusProgram || '').toString().trim() === '');
    if (ocultarNoGestionables) filtered = filtered.filter(esGestionable);

    if (filtroPercentil) {
        filtered = filtered.filter(p => {
            const dias = getDiasEspera(p, 'lista');
            if (dias <= 0) return false;
            if (filtroPercentil === 'p25' && dias > percentilesGlobales.p25) return false;
            if (filtroPercentil === 'p50' && (dias <= percentilesGlobales.p25 || dias > percentilesGlobales.p50)) return false;
            if (filtroPercentil === 'p75' && (dias <= percentilesGlobales.p50 || dias > percentilesGlobales.p75)) return false;
            if (filtroPercentil === 'p90' && (dias <= percentilesGlobales.p75 || dias > percentilesGlobales.p90)) return false;
            if (filtroPercentil === 'resto' && dias <= percentilesGlobales.p90) return false;
            return true;
        });
    }

    if (mostrarDuplicados) {
        const gestionables = filtered.filter(esGestionable);
        const claveCount = {};
        gestionables.forEach(p => {
            if (p.rut) {
                const clave = `${p.rut}|${p.especialidad || 'SIN_ESPECIALIDAD'}`;
                claveCount[clave] = (claveCount[clave] || 0) + 1;
            }
        });
        filtered = filtered.filter(p => {
            if (!p.rut || !esGestionable(p)) return false;
            const clave = `${p.rut}|${p.especialidad || 'SIN_ESPECIALIDAD'}`;
            return claveCount[clave] > 1;
        });
        filtered.sort((a, b) => (a.rut || '').localeCompare(b.rut || ''));
    }

    if (mostrarMultiEspecialidad) {
        const gestionables = filtered.filter(esGestionable);
        const rutEspecialidades = {};
        gestionables.forEach(p => {
            if (p.rut) {
                if (!rutEspecialidades[p.rut]) rutEspecialidades[p.rut] = new Set();
                rutEspecialidades[p.rut].add(p.especialidad || 'SIN_ESPECIALIDAD');
            }
        });
        const rutsMultiEsp = Object.keys(rutEspecialidades).filter(rut => rutEspecialidades[rut].size > 1);
        filtered = filtered.filter(p => p.rut && esGestionable(p) && rutsMultiEsp.includes(p.rut));
        filtered.sort((a, b) => (a.rut || '').localeCompare(b.rut || ''));
    }

    return filtered;
}

function leMostrarContadorResultados(cantidad) {
    const contador = document.getElementById('resultadosContador');
    if (!contador) return;

    if (cantidad === patients.length) {
        contador.innerHTML = `📋 <strong>${cantidad}</strong> pacientes en total`;
        contador.style.background = '#ecfdf5'; contador.style.color = '#0f766e'; contador.style.borderColor = '#a7f3d0';
    } else if (cantidad === 0) {
        contador.innerHTML = `❌ No se encontraron registros`;
        contador.style.background = '#fee2e2'; contador.style.color = '#b91c1c'; contador.style.borderColor = '#fecaca';
    } else {
        contador.innerHTML = `✅ <strong>${cantidad}</strong> registro${cantidad !== 1 ? 's' : ''} encontrado${cantidad !== 1 ? 's' : ''} (de ${patients.length} total)`;
        contador.style.background = '#eff6ff'; contador.style.color = '#1e40af'; contador.style.borderColor = '#bfdbfe';
    }
}

function leObtenerTextoFiltros() {
    const busqueda = (document.getElementById('busquedaGeneral')?.value || '').trim();
    const especialidad = document.getElementById('filterEspecialidad')?.value || '';
    const medico = document.getElementById('filterMedico')?.value || '';
    const estatus = document.getElementById('filterEstatus')?.value || '';
    const prioridad = document.getElementById('filterPrioridad')?.value || '';
    const ges = document.getElementById('filterGes')?.value || '';
    const comuna = document.getElementById('filterComuna')?.value || '';
    const fechaDesde = document.getElementById('filterFechaDesde')?.value || '';
    const fechaHasta = document.getElementById('filterFechaHasta')?.value || '';

    const filtros = [];
    if (busqueda) filtros.push(`🔍 Búsqueda: "${busqueda}"`);
    if (especialidad) filtros.push(`🏥 Especialidad: ${especialidad}`);
    if (medico) filtros.push(`👨‍⚕️ Médico: ${medico}`);
    if (estatus) filtros.push(`📊 Estatus: ${estatus}`);
    if (prioridad) filtros.push(`⚠️ Prioridad: ${prioridad}`);
    if (ges) filtros.push(`✅ GES: ${ges}`);
    if (comuna) filtros.push(`🏠 Comuna: ${comuna}`);
    if (fechaDesde) filtros.push(`📅 Desde: ${fechaDesde}`);
    if (fechaHasta) filtros.push(`📅 Hasta: ${fechaHasta}`);
    if (soloSinFolio) filtros.push(`📄 Solo sin folio`);
    if (soloSinProgramacion) filtros.push(`📅 Solo sin fecha programación`);
    if (ocultarNoGestionables) filtros.push(`🚫 Ocultando No Gestionables`);
    if (mostrarDuplicados) filtros.push(`🔄 Mostrando duplicados`);
    if (mostrarMultiEspecialidad) filtros.push(`🔀 Multi-Especialidad`);
    if (filtroPercentil) {
        const nombres = { p25: 'Percentil 25 (≤ P25)', p50: 'Percentil 50 (P25-P50)', p75: 'Percentil 75 (P50-P75)', p90: 'Percentil 90 (P75-P90)', resto: 'Resto (> P90)' };
        filtros.push(`📊 ${nombres[filtroPercentil] || filtroPercentil}`);
    }

    return filtros.length > 0 ? filtros.join(' | ') : 'Ningún filtro aplicado';
}

// =============================================================
// 🔘 BOTONES TOGGLE
// =============================================================

function leToggleSinFolio() {
    soloSinFolio = !soloSinFolio;
    leActualizarBotonesFiltrosVisuales();
    leFilterPatients();
}

function leToggleDuplicados() {
    mostrarDuplicados = !mostrarDuplicados;
    if (mostrarDuplicados && mostrarMultiEspecialidad) mostrarMultiEspecialidad = false;
    leActualizarBotonesFiltrosVisuales();
    leFilterPatients();
    setTimeout(leMakeTableSortable, 100);
}

function leToggleMultiEspecialidad() {
    mostrarMultiEspecialidad = !mostrarMultiEspecialidad;
    if (mostrarMultiEspecialidad && mostrarDuplicados) mostrarDuplicados = false;
    leActualizarBotonesFiltrosVisuales();
    leFilterPatients();
    setTimeout(leMakeTableSortable, 100);
}

function leToggleNoGestionables() {
    ocultarNoGestionables = !ocultarNoGestionables;
    leActualizarBotonesFiltrosVisuales();
    leFilterPatients();
}

function leToggleSinProgramacion() {
    soloSinProgramacion = !soloSinProgramacion;
    leActualizarBotonesFiltrosVisuales();
    leFilterPatients();
}

function leActualizarBotonesFiltrosVisuales() {
    const btnSinFolio = document.getElementById('btnSinFolio');
    if (btnSinFolio) {
        btnSinFolio.style.background = soloSinFolio ? '#eab308' : '';
        btnSinFolio.style.color = soloSinFolio ? 'black' : '';
        btnSinFolio.textContent = soloSinFolio ? '✅ Solo Sin Folio' : 'Sin Folio';
    }
    const btnDuplicados = document.getElementById('btnDuplicados');
    if (btnDuplicados) {
        btnDuplicados.style.background = mostrarDuplicados ? '#eab308' : '';
        btnDuplicados.style.color = mostrarDuplicados ? 'black' : '';
        btnDuplicados.textContent = mostrarDuplicados ? '✅ Duplicados ACTIVADO' : 'Duplicados (RUT+Esp)';
    }
    const btnSinProgramacion = document.getElementById('btnSinProgramacion');
    if (btnSinProgramacion) {
        btnSinProgramacion.style.background = soloSinProgramacion ? '#eab308' : '';
        btnSinProgramacion.style.color = soloSinProgramacion ? 'black' : '';
        btnSinProgramacion.textContent = soloSinProgramacion ? '✅ Solo Sin Fecha Programación' : '📅 Sin Fecha Prog';
    }
    const btnNoGestionables = document.getElementById('btnNoGestionables');
    if (btnNoGestionables) {
        btnNoGestionables.style.background = ocultarNoGestionables ? '#dc2626' : '#64748b';
        btnNoGestionables.style.color = 'white';
        btnNoGestionables.textContent = ocultarNoGestionables ? '✅ Ocultando No Gestionables' : '🚫 Ocultar No Gestionables';
    }
    const btnMulti = document.getElementById('btnMultiEspecialidad');
    if (btnMulti) {
        btnMulti.style.background = mostrarMultiEspecialidad ? '#8b5cf6' : '';
        btnMulti.style.color = mostrarMultiEspecialidad ? 'white' : '';
        btnMulti.textContent = mostrarMultiEspecialidad ? '✅ Multi-Especialidad ACTIVADO' : '🔀 Multi-Especialidad';
    }
}

function leClearFilters() {
    soloSinFolio = false;
    mostrarDuplicados = false;
    ocultarNoGestionables = false;
    soloSinProgramacion = false;
    filtroPercentil = '';
    mostrarMultiEspecialidad = false;

    ['busquedaGeneral', 'filterEspecialidad', 'filterMedico', 'filterEstatus', 'filterPrioridad',
        'filterGes', 'filterComuna', 'filterFechaDesde', 'filterFechaHasta', 'filterPercentil'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    fuentePercentilLista = 'fechaIndQx';
    const selectFuente = document.getElementById('fuentePercentilLista');
    if (selectFuente) selectFuente.value = 'fechaIndQx';

    sortActive = true;
    currentSortColumn = 'fechaIndQx';
    currentSortOrder = 'desc';
    leMakeTableSortable();

    leActualizarBotonesFiltrosVisuales();
    leFilterPatients();
}

// Cambia la fuente de fecha ("Fecha Indicación Qx" / "Fecha Estatus
// Programable") usada para calcular T. Espera solo en la Lista de
// Pacientes (independiente del Dashboard, ver js/26).
function leCambiarFuenteLista(fuente) {
    fuentePercentilLista = fuente;
    leRenderPatientsTable(patients);
    if (filtroPercentil) leFilterPatients();
    leGuardarFiltrosEnStorage();
}

// =============================================================
// 💾 FILTROS EN localStorage
// =============================================================

function leCargarFiltrosDesdeStorage() {
    const saved = localStorage.getItem('le_prequirurgico_filtros');
    if (saved) {
        try {
            Object.assign(leLastFilters, JSON.parse(saved));
        } catch (e) { /* localStorage corrupto: se ignora, quedan los valores por defecto */ }
    }
    soloSinFolio = !!leLastFilters.soloSinFolio;
    mostrarDuplicados = !!leLastFilters.mostrarDuplicados;
    soloSinProgramacion = !!leLastFilters.soloSinProgramacion;
    ocultarNoGestionables = !!leLastFilters.ocultarNoGestionables;
    mostrarMultiEspecialidad = !!leLastFilters.mostrarMultiEspecialidad;
    filtroPercentil = leLastFilters.filtroPercentil || '';
    fuentePercentilLista = leLastFilters.fuentePercentilLista || 'fechaIndQx';
}

function leGuardarFiltrosEnStorage() {
    leLastFilters = {
        busquedaGeneral: document.getElementById('busquedaGeneral')?.value?.trim() || '',
        filterEspecialidad: document.getElementById('filterEspecialidad')?.value || '',
        filterMedico: document.getElementById('filterMedico')?.value || '',
        filterEstatus: document.getElementById('filterEstatus')?.value || '',
        filterPrioridad: document.getElementById('filterPrioridad')?.value || '',
        filterGes: document.getElementById('filterGes')?.value || '',
        filterComuna: document.getElementById('filterComuna')?.value || '',
        filterFechaDesde: document.getElementById('filterFechaDesde')?.value || '',
        filterFechaHasta: document.getElementById('filterFechaHasta')?.value || '',
        filterPercentil: filtroPercentil || '',
        soloSinFolio: !!soloSinFolio,
        mostrarDuplicados: !!mostrarDuplicados,
        soloSinProgramacion: !!soloSinProgramacion,
        ocultarNoGestionables: !!ocultarNoGestionables,
        mostrarMultiEspecialidad: !!mostrarMultiEspecialidad,
        fuentePercentilLista: fuentePercentilLista || 'fechaIndQx'
    };
    localStorage.setItem('le_prequirurgico_filtros', JSON.stringify(leLastFilters));
}

function leRestaurarFiltros() {
    leCargarFiltrosDesdeStorage();

    setTimeout(() => {
        ['busquedaGeneral', 'filterEspecialidad', 'filterMedico', 'filterEstatus', 'filterPrioridad',
            'filterGes', 'filterComuna', 'filterFechaDesde', 'filterFechaHasta', 'filterPercentil'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = leLastFilters[id] || '';
        });

        if (leLastFilters.filterEspecialidad) leActualizarFiltroMedicos();
        const filterMedicoEl = document.getElementById('filterMedico');
        if (filterMedicoEl) filterMedicoEl.value = leLastFilters.filterMedico || '';

        const selectLista = document.getElementById('fuentePercentilLista');
        if (selectLista) selectLista.value = fuentePercentilLista;

        leActualizarBotonesFiltrosVisuales();
        leFilterPatients();
    }, 200);
}

// =============================================================
// 🗂️ MODAL DE DETALLE DE PACIENTE
// =============================================================

function leAbrirModalPaciente() {
    let modal = document.getElementById('lePatientModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'lePatientModal';
        modal.className = 'modal le-scope';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="leCerrarModalPaciente()">&times;</span>
                <h2 id="leModalTitle">Detalle del Paciente</h2>
                <div id="leModalBody" class="modal-body"></div>
                <div class="modal-buttons">
                    <button onclick="leEditarPacienteActual()" class="btn-primary">✏️ Editar Paciente</button>
                    <button id="leBtnRegistrarLlamadaModal" class="btn-secondary" style="background:#10b981;">📞 Registrar Llamada</button>
                    <button onclick="printPatient()" class="btn-secondary">🖨️ Imprimir Informe</button>
                    <button onclick="leDeleteCurrentPatient()" class="btn-danger">🗑️ Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    return modal;
}

function leShowPatientModal(key) {
    currentModalPatient = patients.find(p => p.firebaseKey === key);
    if (!currentModalPatient) return;
    leAbrirModalPaciente();

    const fechaIndQxFmt = formatDate(currentModalPatient.fechaIndQx);
    const fechaNacFmt = formatDate(currentModalPatient.fechaNac);
    const fechaEpaFmt = formatDate(currentModalPatient.fechaEpa);
    const fechaEstatusProgFmt = formatDate(currentModalPatient.fechaEstatusProgram);
    const fechaCirugiaFmt = formatDate(currentModalPatient.fechaCirugia);

    let historialHTML = '';
    if (currentModalPatient.historial) {
        const keysOrdenadas = Object.keys(currentModalPatient.historial).sort((a, b) =>
            new Date(currentModalPatient.historial[b].fecha) - new Date(currentModalPatient.historial[a].fecha));

        historialHTML = `<h3 style="color:#1e40af; margin:30px 0 18px 0; font-size:1.3rem;">📜 Historial de Modificaciones</h3>`;
        keysOrdenadas.forEach(historialKey => {
            const h = currentModalPatient.historial[historialKey];
            const fecha = new Date(h.fecha);
            const cambiosHTML = h.cambios ? `<ul style="margin:10px 0 0 22px;">${h.cambios.map(c => `<li>${c}</li>`).join('')}</ul>` : '';
            const botonEliminar = esAdministrador() ? `
                <button onclick="leEliminarRegistroHistorial('${currentModalPatient.firebaseKey}', '${historialKey}')"
                        style="background:#ef4444; color:white; border:none; padding:4px 10px; border-radius:5px; margin-top:10px; cursor:pointer; font-size:0.75rem;">
                    🗑️ Eliminar este registro
                </button>` : '';

            historialHTML += `
                <div style="margin-bottom:20px; padding:16px; background:#f8fafc; border-radius:10px; border-left:6px solid #3b82f6;">
                    <strong>${h.accion}</strong> — ${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}
                    <br><small style="color:#64748b;">Usuario: ${h.usuario}</small>
                    ${cambiosHTML}
                    ${botonEliminar}
                </div>`;
        });
    }

    let historialLlamadasHTML = `<h3 style="color:#1e40af; margin:30px 0 18px 0; font-size:1.3rem;">📞 Historial de Llamadas</h3>`;
    if (currentModalPatient.historialLlamadas) {
        const llamadasKeys = Object.keys(currentModalPatient.historialLlamadas).sort((a, b) =>
            new Date(currentModalPatient.historialLlamadas[b].fechaLlamada) - new Date(currentModalPatient.historialLlamadas[a].fechaLlamada));

        llamadasKeys.forEach(llamadaKey => {
            const llamada = currentModalPatient.historialLlamadas[llamadaKey];
            const fechaLlamada = new Date(llamada.fechaLlamada);
            historialLlamadasHTML += `
                <div style="margin-bottom:15px; padding:15px; background:#f0fdf4; border-radius:10px; border-left:6px solid #10b981; cursor:pointer;" onclick="verDetalleLlamada('${currentModalPatient.firebaseKey}', '${llamadaKey}')">
                    <strong>📞 Llamada:</strong> ${fechaLlamada.toLocaleDateString('es-CL')} ${fechaLlamada.toLocaleTimeString('es-CL')}<br>
                    <strong>Motivo:</strong> ${llamada.motivo || '-'}<br>
                    <strong>Respuesta:</strong> ${llamada.respuesta || '-'}<br>
                    <strong>Receptor:</strong> ${llamada.nombreRec || '-'}<br>
                    <small style="color:#64748b;">👆 Click para ver detalles completos</small>
                </div>`;
        });
    } else {
        historialLlamadasHTML += `<p style="color:#64748b;">No hay registros de llamadas para este paciente.</p>`;
    }

    const html = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:14px 40px; margin-bottom:35px;">
            <p><strong>ID:</strong> ${currentModalPatient.id || '-'}</p>
            <p><strong>Estatus Tabla:</strong> ${currentModalPatient.estatusTabla || '-'}</p>
            <p><strong>Folio:</strong> ${currentModalPatient.folio || '-'}</p>
            <p><strong>Fecha Indicación Qx:</strong> ${fechaIndQxFmt}</p>
            <p><strong>Tiempo de Espera:</strong> ${calculateWaitingDays(currentModalPatient.fechaIndQx)} días</p>
        </div>
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px;">👤 Datos del Paciente</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:14px 40px; margin-bottom:35px;">
            <p><strong>Nombre y Apellido:</strong> ${currentModalPatient.nombreApellido || '-'}</p>
            <p><strong>RUT:</strong> ${currentModalPatient.rut || '-'}</p>
            <p><strong>Fecha de Nacimiento:</strong> ${fechaNacFmt}</p>
            <p><strong>Edad:</strong> ${currentModalPatient.edad || '-'} años</p>
            <p><strong>Comuna:</strong> ${currentModalPatient.comuna || '-'}</p>
            <p><strong>Dirección:</strong> ${currentModalPatient.direccion || '-'}</p>
            <p><strong>N° Contacto:</strong> ${currentModalPatient.nContacto || '-'}</p>
            <p><strong>Email:</strong> ${currentModalPatient.emailPaciente || '-'}</p>
        </div>
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px;">🩺 Datos Clínicos</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px,1fr)); gap:14px 40px; margin-bottom:35px;">
            <p><strong>Especialidad:</strong> ${currentModalPatient.especialidad || '-'}</p>
            <p><strong>Médico Tratante:</strong> ${currentModalPatient.medicoTratante || '-'}</p>
            <p><strong>Diagnóstico (CIE-10):</strong> ${currentModalPatient.diagnostico || '-'}</p>
            <p><strong>Intervención:</strong> ${currentModalPatient.intervencion || '-'}</p>
            <p><strong>Lateralidad:</strong> ${currentModalPatient.lateralidad || 'NO APLICA'}</p>
        </div>
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px;">🔬 Evaluación Preoperatoria</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px 35px; margin-bottom:35px;">
            <p><strong>Estatus EPA:</strong> ${currentModalPatient.estatusEpa || '-'}</p>
            <p><strong>Fecha EPA:</strong> ${fechaEpaFmt}</p>
            <p><strong>Anestesiólogo:</strong> ${currentModalPatient.anestesiologo || '-'}</p>
            <p><strong>GES:</strong> ${currentModalPatient.ges || '-'}</p>
            <p><strong>TACO:</strong> ${currentModalPatient.taco || '-'}</p>
            <p><strong>ASA:</strong> ${currentModalPatient.asa || '-'}</p>
            <p><strong>EKG:</strong> ${currentModalPatient.ekg || '-'}</p>
            <p><strong>RX:</strong> ${currentModalPatient.rx || '-'}</p>
            <p><strong>ECO:</strong> ${currentModalPatient.eco || '-'}</p>
            <p><strong>Prioridad:</strong> ${currentModalPatient.prioridad || '-'}</p>
        </div>
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px;">📅 Programación Quirúrgica</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:14px 40px; margin-bottom:35px;">
            <p><strong>Fecha Estatus Program:</strong> ${fechaEstatusProgFmt}</p>
            <p><strong>Fecha de Cirugía:</strong> ${fechaCirugiaFmt}</p>
            <p><strong>Espera Programación:</strong> ${calculateWaitingDays(currentModalPatient.fechaEstatusProgram)} días</p>
            <p><strong>📞 Próximo Llamado:</strong> ${currentModalPatient.fechaProximoLlamado ? formatDate(currentModalPatient.fechaProximoLlamado) : 'No programado'}</p>
        </div>
        <h3 style="color:#1e40af; background:#f1f5f9; padding:12px 20px; border-radius:8px; margin-bottom:18px;">📝 Observaciones</h3>
        <p><strong>Patologías Crónicas:</strong> ${currentModalPatient.patologiasCronicas || 'Ninguna'}</p>
        <p><strong>Medicamentos Crónicos:</strong> ${currentModalPatient.medicamentosCronicos || 'Ninguno'}</p>
        <p style="margin-top:18px;"><strong>Observaciones Generales:</strong><br>${currentModalPatient.observaciones || 'Sin observaciones'}</p>
        <p><strong>Indicaciones Anestesiólogo:</strong><br>${currentModalPatient.indicacionesAnest || 'Sin indicaciones'}</p>
        ${historialHTML}
        ${historialLlamadasHTML}
    `;

    document.getElementById('leModalBody').innerHTML = html;

    const btnLlamada = document.getElementById('leBtnRegistrarLlamadaModal');
    if (btnLlamada) btnLlamada.onclick = () => abrirModalRegistroLlamada(currentModalPatient.firebaseKey);

    document.getElementById('lePatientModal').style.display = 'flex';
}

function leCerrarModalPaciente() {
    const modal = document.getElementById('lePatientModal');
    if (modal) modal.style.display = 'none';
}

function leDeleteCurrentPatient() {
    if (!currentModalPatient || !confirm("¿Estás seguro de eliminar este paciente? Esta acción es irreversible.")) return;

    leGuardarFiltrosEnStorage();
    leMostrarCargando();

    database.ref('patients/' + currentModalPatient.firebaseKey).remove()
        .then(() => {
            alert("✅ Paciente eliminado correctamente");
            leCerrarModalPaciente();
        })
        .catch(err => {
            console.error(err);
            alert("Error al eliminar: " + err.message);
        })
        .finally(() => leOcultarCargando());
}

function leEliminarRegistroHistorial(patientKey, historialKey) {
    if (!esAdministrador()) {
        alert("❌ No tienes permisos para eliminar registros del historial.");
        return;
    }
    if (!confirm("⚠️ ¿Estás seguro de eliminar este registro del historial?\n\nEsta acción es irreversible.")) return;

    leGuardarFiltrosEnStorage();
    leMostrarCargando();

    database.ref(`patients/${patientKey}/historial/${historialKey}`).remove()
        .then(() => {
            alert("✅ Registro del historial eliminado correctamente.");
            setTimeout(() => leShowPatientModal(patientKey), 300);
        })
        .catch(error => {
            console.error(error);
            alert("❌ Error al eliminar: " + error.message);
        })
        .finally(() => leOcultarCargando());
}
