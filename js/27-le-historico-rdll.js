// =============================================================
// 🩺 LISTA DE ESPERA — MÓDULO 5: VISOR HISTÓRICO (RDLL) + LLAMADAS
// =============================================================
// Portado desde "LISTA DE ESPERA APP/script.js". Junta dos cosas
// relacionadas pero con datos distintos (así lo agrupa el plan de
// integración):
//   1) El "Visor Histórico RDLL": una colección aparte en Firebase
//      (rdll_historico) con registros de llamadas migrados/ingresados en
//      un formato de planilla histórico, independiente de cada paciente.
//   2) La gestión de llamadas POR PACIENTE (patients/{key}/historialLlamadas),
//      que es la que dispara el modal "📞 Registrar Llamada" desde el
//      detalle de un paciente (js/25) y desde el widget del Dashboard
//      (js/26).
//
// `currentUserRole === 'admin'` → esAdministrador() en todos los casos de
// este archivo (editar/eliminar llamadas y registros RDLL, cargar Excel de
// RDLL): son acciones de "puede editar/gestionar", no de taxonomía.
// `db.` → `database.`. Se corrigió un bug del original en
// imprimirTodasLasLlamadas() (un caracter suelto en vez de "</table>" que
// habría roto el HTML de impresión).
// =============================================================

let datosRdll = [];
let datosRdllFiltrados = [];
let editandoRdllKey = null;
let isSubmittingLlamada = false;
let isEditingLlamada = false;
let isDeletingLlamada = false;
let isSubmittingRdll = false;

// =============================================================
// 🧱 RENDER DE LA SECCIÓN
// =============================================================

function leRenderHistoricoRdllHTML() {
    return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
            <h2>📜 Visor Histórico - Registro Diario de Lista de Espera (RDLL)</h2>
            <div>
                <button id="btnNuevoRegistroRdll" class="btn-primary" style="background:#10b981;">✏️ Nuevo Registro</button>
                <button id="btnCargarExcelRdll" class="btn-primary" style="background:#8b5cf6;">📂 Cargar Excel</button>
            </div>
        </div>

        <div class="filters" style="margin-bottom:20px;">
            <div class="filter-group" style="flex:3;">
                <label>🔍 Búsqueda General</label>
                <input type="text" id="busquedaRdll" placeholder="Buscar en todos los campos..." onkeyup="filtrarRdll()">
            </div>
            <div class="filter-group">
                <label>Filtrar por campo</label>
                <select id="campoFiltroRdll" onchange="filtrarRdll()">
                    <option value="todos">Todos los campos</option>
                    <option value="NOMBRE">Nombre</option>
                    <option value="RUT">RUT</option>
                    <option value="DIAGNOSTICO">Diagnóstico</option>
                    <option value="MOTIVO LLAMADO">Motivo</option>
                </select>
            </div>
            <button onclick="limpiarFiltrosRdll()" class="btn-secondary">Limpiar</button>
            <button onclick="exportarRdllExcel()" class="btn-secondary" style="background:#2563eb;">📥 Exportar</button>
        </div>

        <div id="contadorRdll" style="margin:10px 0; padding:8px 15px; background:#eff6ff; border-radius:8px;"></div>

        <div class="table-container scrollable-table">
            <table id="tablaRdll" class="cross-table">
                <thead><tr><th>Fecha</th><th>Nombre</th><th>RUT</th><th>Diagnóstico</th><th>Teléfono</th><th>Motivo</th><th>Respuesta</th><th>Próx. Llamado</th><th>Funcionario</th><th>Acciones</th></tr></thead>
                <tbody id="tbodyRdll"><tr><td colspan="10" style="text-align:center;">Cargando...</td></tr></tbody>
            </table>
        </div>
    `;
}

function leInicializarSeccionHistoricoRdll(container) {
    container.innerHTML = leRenderHistoricoRdllHTML();

    document.getElementById('btnNuevoRegistroRdll').addEventListener('click', abrirNuevoRdll);
    document.getElementById('btnCargarExcelRdll').addEventListener('click', leCargarExcelRdll);

    cargarRdll();
}

// =============================================================
// 📜 VISOR HISTÓRICO RDLL
// =============================================================

async function cargarRdll() {
    try {
        const snap = await database.ref(LE_RDLL_DB_PATH).once('value');
        const data = snap.val();
        datosRdll = data ? Object.entries(data).map(([k, v]) => ({ key: k, ...v })) : [];
        datosRdll.sort((a, b) => new Date(b.FECHA || 0) - new Date(a.FECHA || 0));
        filtrarRdll();
    } catch (e) {
        console.error("Error cargando RDLL:", e);
    }
}

function filtrarRdll() {
    const busq = (document.getElementById('busquedaRdll')?.value || '').toLowerCase().trim();
    const campo = document.getElementById('campoFiltroRdll')?.value || 'todos';
    if (!busq) {
        datosRdllFiltrados = [...datosRdll];
    } else {
        datosRdllFiltrados = datosRdll.filter(r => {
            if (campo === 'todos') return Object.values(r).some(v => v && String(v).toLowerCase().includes(busq));
            const val = r[campo];
            return val && String(val).toLowerCase().includes(busq);
        });
    }
    renderTablaRdll();
    const cont = document.getElementById('contadorRdll');
    if (cont) cont.innerHTML = `📊 <strong>${datosRdllFiltrados.length}</strong> registros (de ${datosRdll.length} total)`;
}

function renderTablaRdll() {
    const tbody = document.getElementById('tbodyRdll');
    if (!tbody) return;

    if (datosRdllFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No hay registros</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    datosRdllFiltrados.forEach(r => {
        const campoTexto = (v) => (v === undefined || v === null) ? '-' : String(v);
        const nombre = campoTexto(r.NOMBRE);
        const diagnostico = campoTexto(r.DIAGNOSTICO);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(r.FECHA)}</td>
            <td><strong>${nombre.substring(0, 50)}</strong></td>
            <td>${campoTexto(r.RUT)}</td>
            <td style="max-width:200px;">${diagnostico.substring(0, 35)}${diagnostico.length > 35 ? '...' : ''}</td>
            <td>${campoTexto(r.TELEFONO)}</td>
            <td>${campoTexto(r['MOTIVO LLAMADO'])}</td>
            <td>${campoTexto(r['RESPUESTA RECEPTOR'])}</td>
            <td>${formatDate(r['FECHA PROXIMO LLAMADO'])}</td>
            <td>${campoTexto(r.FUNCIONARIO)}</td>
            <td><button onclick="verDetalleRdll('${r.key}')" style="background:#3b82f6; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;">👁️ Ver</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function leAbrirModalRdllDetalle() {
    let modal = document.getElementById('modalRdllDetalle');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalRdllDetalle';
        modal.className = 'modal le-scope';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:750px;">
                <span class="close" onclick="cerrarModalRdllDetalle()">&times;</span>
                <h2 style="color:#1e40af;">📋 Detalle Registro</h2>
                <div id="modalRdllBody" class="modal-body"></div>
                <div class="modal-buttons">
                    <button onclick="cerrarModalRdllDetalle()" class="btn-secondary">Cerrar</button>
                    <button id="btnEditarRdllModal" class="btn-primary" style="background:#f59e0b; display:none;">✏️ Editar</button>
                    <button id="btnEliminarRdllModal" class="btn-danger" style="display:none;">🗑️ Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    return modal;
}

function verDetalleRdll(key) {
    const r = datosRdll.find(d => d.key === key);
    if (!r) return;
    leAbrirModalRdllDetalle();

    let html = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">';
    const campos = ['FECHA', 'NOMBRE', 'RUT', 'DIAGNOSTICO', 'TELEFONO', 'NOMBRE RECEPTOR', 'RUT RECEPTOR', 'PARENTESCO RECEPTOR', 'MOTIVO LLAMADO', 'RESPUESTA RECEPTOR', 'OBSERVACIONES', 'FECHA PROXIMO LLAMADO', 'FUNCIONARIO'];
    campos.forEach(c => {
        let val = r[c] || '-';
        if (c === 'FECHA' || c === 'FECHA PROXIMO LLAMADO') val = formatDate(val);
        html += `<p><strong>${c}:</strong><br>${val}</p>`;
    });
    html += '</div>';
    document.getElementById('modalRdllBody').innerHTML = html;

    const btnEditar = document.getElementById('btnEditarRdllModal');
    const btnEliminar = document.getElementById('btnEliminarRdllModal');
    if (esAdministrador()) {
        btnEditar.style.display = 'inline-block';
        btnEliminar.style.display = 'inline-block';
        btnEditar.onclick = () => abrirEditarRdll(key);
        btnEliminar.onclick = () => eliminarRdll(key);
    } else {
        btnEditar.style.display = 'none';
        btnEliminar.style.display = 'none';
    }
    document.getElementById('modalRdllDetalle').style.display = 'flex';
}

function cerrarModalRdllDetalle() {
    const modal = document.getElementById('modalRdllDetalle');
    if (modal) modal.style.display = 'none';
}

function limpiarFiltrosRdll() {
    document.getElementById('busquedaRdll').value = '';
    document.getElementById('campoFiltroRdll').value = 'todos';
    filtrarRdll();
}

function exportarRdllExcel() {
    if (datosRdllFiltrados.length === 0) { alert("No hay datos"); return; }
    const datos = datosRdllFiltrados.map(r => ({
        FECHA: r.FECHA || '', NOMBRE: r.NOMBRE || '', RUT: r.RUT || '', DIAGNOSTICO: r.DIAGNOSTICO || '',
        TELEFONO: r.TELEFONO || '', 'NOMBRE RECEPTOR': r['NOMBRE RECEPTOR'] || '', 'RUT RECEPTOR': r['RUT RECEPTOR'] || '',
        'PARENTESCO RECEPTOR': r['PARENTESCO RECEPTOR'] || '', 'MOTIVO LLAMADO': r['MOTIVO LLAMADO'] || '',
        'RESPUESTA RECEPTOR': r['RESPUESTA RECEPTOR'] || '', OBSERVACIONES: r.OBSERVACIONES || '',
        'FECHA PROXIMO LLAMADO': r['FECHA PROXIMO LLAMADO'] || '', FUNCIONARIO: r.FUNCIONARIO || ''
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historico_RDLL');
    XLSX.writeFile(wb, `Historico_RDLL_${new Date().toISOString().slice(0, 10)}.xlsx`);
    alert("✅ Exportado");
}

function leAbrirModalRdllForm() {
    let modal = document.getElementById('modalRdllForm');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalRdllForm';
        modal.className = 'modal le-scope';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:850px; max-height:90vh; overflow-y:auto;">
                <span class="close" onclick="cerrarModalRdllForm()">&times;</span>
                <h2 id="tituloRdllForm" style="color:#1e40af;">✏️ Nuevo Registro RDLL</h2>
                <form id="formRdll">
                    <div class="form-row">
                        <div class="form-group"><label>📅 Fecha *</label><input type="date" id="rdll_fecha" required></div>
                        <div class="form-group"><label>👤 Nombre *</label><input type="text" id="rdll_nombre" required style="text-transform:uppercase;"></div>
                        <div class="form-group"><label>🆔 RUT *</label><input type="text" id="rdll_rut" placeholder="12.345.678-9" onkeyup="this.value=formatRut(this.value)" required></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>📝 Diagnóstico *</label><textarea id="rdll_diagnostico" rows="2" required></textarea></div>
                        <div class="form-group"><label>📞 Teléfono</label><input type="text" id="rdll_telefono"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>👤 Nombre Receptor</label><input type="text" id="rdll_nombre_receptor" style="text-transform:uppercase;"></div>
                        <div class="form-group"><label>🆔 RUT Receptor</label><input type="text" id="rdll_rut_receptor" onkeyup="this.value=formatRut(this.value)"></div>
                        <div class="form-group"><label>Parentesco</label><input type="text" id="rdll_parentesco" style="text-transform:uppercase;"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>📋 Motivo *</label>
                            <select id="rdll_motivo" required>
                                <option value="">Seleccionar</option>
                                <option value="HORA DE EXAMENES">HORA DE EXAMENES</option>
                                <option value="HORA DE ANESTESIA">HORA DE ANESTESIA</option>
                                <option value="ACTUALIZACION DE INFORMACION">ACTUALIZACION DE INFORMACION</option>
                                <option value="FECHA CIRUGIA">FECHA CIRUGIA</option>
                                <option value="SUSPENDIDO">SUSPENDIDO</option>
                            </select>
                        </div>
                        <div class="form-group"><label>📝 Respuesta *</label>
                            <select id="rdll_respuesta" required>
                                <option value="">Seleccionar</option>
                                <option value="ACEPTA">ACEPTA</option>
                                <option value="RECHAZA">RECHAZA</option>
                                <option value="POSTERGA">POSTERGA</option>
                                <option value="NO RESPONDE">NO RESPONDE</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group"><label>📝 Observaciones</label><textarea id="rdll_observaciones" rows="2"></textarea></div>
                    <div class="form-row">
                        <div class="form-group"><label>📅 Próximo Llamado</label><input type="date" id="rdll_proximo_llamado"></div>
                        <div class="form-group"><label>👤 Funcionario</label><input type="text" id="rdll_funcionario" readonly style="background:#f3f4f6;"></div>
                    </div>
                    <input type="hidden" id="rdll_key">
                    <div class="modal-buttons"><button type="submit" class="btn-primary">💾 Guardar</button><button type="button" onclick="cerrarModalRdllForm()" class="btn-secondary">Cancelar</button></div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('formRdll').addEventListener('submit', leGuardarRdll);
    }
    return modal;
}

function abrirNuevoRdll() {
    editandoRdllKey = null;
    leAbrirModalRdllForm();
    document.getElementById('tituloRdllForm').textContent = '✏️ Nuevo Registro RDLL';
    document.getElementById('formRdll').reset();
    document.getElementById('rdll_key').value = '';
    document.getElementById('rdll_fecha').value = new Date().toISOString().split('T')[0];
    if (currentUserEmail) document.getElementById('rdll_funcionario').value = currentUserEmail;
    document.getElementById('modalRdllForm').style.display = 'flex';

    setupRutValidationLimpio(document.getElementById('rdll_rut'));
    setupRutValidationLimpio(document.getElementById('rdll_rut_receptor'));
}

function cerrarModalRdllForm() {
    const modal = document.getElementById('modalRdllForm');
    if (modal) modal.style.display = 'none';
}

function abrirEditarRdll(key) {
    if (!esAdministrador()) { alert("Solo administradores"); return; }
    cerrarModalRdllDetalle();
    const r = datosRdll.find(d => d.key === key);
    if (!r) return;

    editandoRdllKey = key;
    leAbrirModalRdllForm();
    document.getElementById('tituloRdllForm').textContent = '✏️ Editar Registro RDLL';
    document.getElementById('rdll_key').value = key;

    let fechaVal = '', proxVal = '';
    if (r.FECHA) {
        const partes = String(r.FECHA).split(/[-:\s]/);
        if (partes.length >= 3) fechaVal = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    if (r['FECHA PROXIMO LLAMADO']) {
        const partes = String(r['FECHA PROXIMO LLAMADO']).split(/[-:\s]/);
        if (partes.length >= 3) proxVal = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }

    document.getElementById('rdll_fecha').value = fechaVal;
    document.getElementById('rdll_nombre').value = r.NOMBRE || '';
    document.getElementById('rdll_rut').value = r.RUT || '';
    document.getElementById('rdll_diagnostico').value = r.DIAGNOSTICO || '';
    document.getElementById('rdll_telefono').value = r.TELEFONO || '';
    document.getElementById('rdll_nombre_receptor').value = r['NOMBRE RECEPTOR'] || '';
    document.getElementById('rdll_rut_receptor').value = r['RUT RECEPTOR'] || '';
    document.getElementById('rdll_parentesco').value = r['PARENTESCO RECEPTOR'] || '';
    document.getElementById('rdll_motivo').value = r['MOTIVO LLAMADO'] || '';
    document.getElementById('rdll_respuesta').value = r['RESPUESTA RECEPTOR'] || '';
    document.getElementById('rdll_observaciones').value = r.OBSERVACIONES || '';
    document.getElementById('rdll_proximo_llamado').value = proxVal;
    document.getElementById('rdll_funcionario').value = r.FUNCIONARIO || currentUserEmail || '';
    document.getElementById('modalRdllForm').style.display = 'flex';

    setupRutValidationLimpio(document.getElementById('rdll_rut'));
    setupRutValidationLimpio(document.getElementById('rdll_rut_receptor'));
}

async function eliminarRdll(key) {
    if (!esAdministrador()) { alert("Solo administradores"); return; }
    if (!confirm("¿Eliminar este registro permanentemente?")) return;
    leMostrarCargando();
    try {
        await database.ref(`${LE_RDLL_DB_PATH}/${key}`).remove();
        alert("✅ Registro eliminado");
        cerrarModalRdllDetalle();
        await cargarRdll();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        leOcultarCargando();
    }
}

async function leGuardarRdll(e) {
    e.preventDefault();
    if (isSubmittingRdll) return;
    isSubmittingRdll = true;

    const key = document.getElementById('rdll_key').value;

    function formatearFechaGuardar(val) {
        if (!val) return '';
        if (val.match(/^\d{4}-\d{2}-\d{2}/)) {
            const [a, m, d] = val.split('-');
            return `${d}-${m}-${a} 00:00:00`;
        }
        return val;
    }

    const rutPaciente = document.getElementById('rdll_rut').value;
    const rutReceptor = document.getElementById('rdll_rut_receptor').value;
    const rutPacienteLimpio = rutPaciente ? rutPaciente.replace(/[^0-9kK]/g, '').toUpperCase() : '';
    const rutReceptorLimpio = rutReceptor ? rutReceptor.replace(/[^0-9kK]/g, '').toUpperCase() : '';

    if (!rutPacienteLimpio || !validarRutChileno(rutPacienteLimpio)) {
        alert("❌ El RUT del paciente es obligatorio y debe ser válido.");
        document.getElementById('rdll_rut').focus();
        isSubmittingRdll = false;
        return;
    }
    if (rutReceptorLimpio && !validarRutChileno(rutReceptorLimpio)) {
        alert("❌ El RUT del receptor no es válido. Por favor verifica el formato.");
        document.getElementById('rdll_rut_receptor').focus();
        isSubmittingRdll = false;
        return;
    }

    const data = {
        FECHA: formatearFechaGuardar(document.getElementById('rdll_fecha').value),
        NOMBRE: document.getElementById('rdll_nombre').value.toUpperCase().trim(),
        RUT: formatRut(rutPacienteLimpio),
        DIAGNOSTICO: document.getElementById('rdll_diagnostico').value,
        TELEFONO: document.getElementById('rdll_telefono').value,
        'NOMBRE RECEPTOR': document.getElementById('rdll_nombre_receptor').value.toUpperCase().trim(),
        'RUT RECEPTOR': rutReceptorLimpio ? formatRut(rutReceptorLimpio) : '',
        'PARENTESCO RECEPTOR': document.getElementById('rdll_parentesco').value.toUpperCase().trim(),
        'MOTIVO LLAMADO': document.getElementById('rdll_motivo').value,
        'RESPUESTA RECEPTOR': document.getElementById('rdll_respuesta').value,
        OBSERVACIONES: document.getElementById('rdll_observaciones').value,
        'FECHA PROXIMO LLAMADO': formatearFechaGuardar(document.getElementById('rdll_proximo_llamado').value),
        FUNCIONARIO: document.getElementById('rdll_funcionario').value || currentUserEmail,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        creadoPor: currentUserEmail || 'Sistema'
    };

    if (!data.FECHA || !data.NOMBRE || !data.RUT || !data.DIAGNOSTICO || !data['MOTIVO LLAMADO'] || !data['RESPUESTA RECEPTOR']) {
        alert("❌ Complete los campos obligatorios");
        isSubmittingRdll = false;
        return;
    }

    leMostrarCargando();
    try {
        if (key) {
            await database.ref(`${LE_RDLL_DB_PATH}/${key}`).update(data);
            alert("✅ Registro actualizado correctamente");
        } else {
            await database.ref(LE_RDLL_DB_PATH).push(data);
            alert("✅ Registro guardado correctamente");
        }
        cerrarModalRdllForm();
        await cargarRdll();
    } catch (e) {
        console.error(e);
        alert("Error al guardar: " + e.message);
    } finally {
        isSubmittingRdll = false;
        leOcultarCargando();
    }
}

function leCargarExcelRdll() {
    if (!esAdministrador()) { alert("Solo administradores"); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        leMostrarCargando();
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            if (rows.length === 0) { alert("Archivo vacío"); return; }

            for (const row of rows) {
                const registro = {
                    FECHA: row.FECHA || row.fecha || '',
                    NOMBRE: (row.NOMBRE || row.nombre || '').toUpperCase(),
                    RUT: row.RUT || row.rut || '',
                    DIAGNOSTICO: row.DIAGNOSTICO || row.diagnostico || '',
                    TELEFONO: row.TELEFONO || row.telefono || '',
                    'NOMBRE RECEPTOR': (row['NOMBRE RECEPTOR'] || row.nombre_receptor || '').toUpperCase(),
                    'RUT RECEPTOR': row['RUT RECEPTOR'] || row.rut_receptor || '',
                    'PARENTESCO RECEPTOR': (row['PARENTESCO RECEPTOR'] || row.parentesco || '').toUpperCase(),
                    'MOTIVO LLAMADO': row['MOTIVO LLAMADO'] || row.motivo || '',
                    'RESPUESTA RECEPTOR': row['RESPUESTA RECEPTOR'] || row.respuesta || '',
                    OBSERVACIONES: row.OBSERVACIONES || row.observaciones || '',
                    'FECHA PROXIMO LLAMADO': row['FECHA PROXIMO LLAMADO'] || row.proximo_llamado || '',
                    FUNCIONARIO: row.FUNCIONARIO || row.funcionario || currentUserEmail || 'Sistema',
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    creadoPor: currentUserEmail || 'Sistema'
                };
                await database.ref(LE_RDLL_DB_PATH).push(registro);
            }
            alert(`✅ Cargados ${rows.length} registros`);
            await cargarRdll();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            leOcultarCargando();
        }
    };
    input.click();
}

// =============================================================
// 📞 GESTIÓN DE LLAMADAS POR PACIENTE (patients/{key}/historialLlamadas)
// =============================================================

function leAbrirModalRegistroLlamada() {
    let modal = document.getElementById('modalRegistroLlamada');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalRegistroLlamada';
        modal.className = 'modal le-scope';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:700px;">
                <span class="close" onclick="cerrarModalRegistroLlamada()">&times;</span>
                <h2 style="color:#1e40af; margin-bottom:20px;">📞 Registro de Llamada</h2>
                <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:20px;">
                    <p><strong>Paciente:</strong> <span id="llamadaPacienteNombre"></span></p>
                    <p><strong>RUT:</strong> <span id="llamadaPacienteRut"></span></p>
                    <p><strong>Teléfono:</strong> <span id="llamadaPacienteContacto"></span></p>
                    <hr style="margin:10px 0;">
                    <p><strong>📝 Observaciones Generales:</strong><br><span id="llamadaPacienteObservaciones" style="font-size:13px; color:#475569;"></span></p>
                    <p><strong>💉 Indicaciones Anestesiólogo:</strong><br><span id="llamadaPacienteIndicaciones" style="font-size:13px; color:#475569;"></span></p>
                </div>
                <div class="form-group"><label>📅 Fecha y Hora de la Llamada</label><input type="datetime-local" id="llamadaFechaHora" style="width:100%; padding:10px;"></div>
                <div class="form-group"><label>👤 Nombre del Receptor</label><input type="text" id="llamadaNombreRec" placeholder="Nombre y Apellido" style="width:100%; padding:10px;"></div>
                <div class="form-group"><label>🆔 RUT del Receptor</label><input type="text" id="llamadaRutRec" placeholder="Sin puntos con guión" style="width:100%; padding:10px;"></div>
                <div class="form-group"><label>👨‍👩‍👧 Parentesco con el Paciente</label><input type="text" id="llamadaParentesco" placeholder="Ej: Madre, Padre, Hermano, etc." style="width:100%; padding:10px;"></div>
                <div class="form-group">
                    <label>📋 Motivo de la Llamada</label>
                    <select id="llamadaMotivo" style="width:100%; padding:10px;">
                        <option value="">Seleccionar</option>
                        <option value="HORA DE EXAMENES">HORA DE EXAMENES</option>
                        <option value="HORA DE ANESTESIA">HORA DE ANESTESIA</option>
                        <option value="ACTUALIZACION DE INFORMACION / CONTINUIDAD DEL PROCESO">ACTUALIZACION DE INFORMACION / CONTINUIDAD DEL PROCESO</option>
                        <option value="FECHA CIRUGIA">FECHA CIRUGIA</option>
                        <option value="SUSPENDIDO">SUSPENDIDO</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>📝 Respuesta del Paciente/Receptor</label>
                    <select id="llamadaRespuesta" style="width:100%; padding:10px;">
                        <option value="">Seleccionar</option>
                        <option value="ACEPTA">ACEPTA</option>
                        <option value="RECHAZA">RECHAZA</option>
                        <option value="POSTERGA">POSTERGA</option>
                        <option value="NO RESPONDE LLAMADA">NO RESPONDE LLAMADA</option>
                        <option value="ENTREGARA INFORMACION">ENTREGARA INFORMACION</option>
                    </select>
                </div>
                <div class="form-group"><label>📝 Observaciones de la Llamada</label><textarea id="llamadaObservaciones" rows="3" style="width:100%; padding:10px;" placeholder="Detalles específicos de la conversación..."></textarea></div>
                <div class="form-group">
                    <label>📅 Programar Próximo Llamado</label>
                    <input type="date" id="llamadaProximoLlamado" style="width:100%; padding:10px;">
                    <small style="color:#64748b;">Si se programa una fecha, aparecerá en la lista de pendientes</small>
                </div>
                <div class="modal-buttons" style="margin-top:20px;">
                    <button onclick="guardarRegistroLlamada()" class="btn-primary">💾 Guardar Llamada</button>
                    <button onclick="cerrarModalRegistroLlamada()" class="btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    return modal;
}

let currentCallPatient = null;

function abrirModalRegistroLlamada(patientKey) {
    const patient = patients.find(p => p.firebaseKey === patientKey);
    if (!patient) return;

    currentCallPatient = patient;
    const modal = leAbrirModalRegistroLlamada();

    document.getElementById('llamadaPacienteNombre').textContent = patient.nombreApellido || '-';
    document.getElementById('llamadaPacienteRut').textContent = patient.rut || '-';
    document.getElementById('llamadaPacienteContacto').textContent = patient.nContacto || '-';
    document.getElementById('llamadaPacienteObservaciones').innerHTML = patient.observaciones || 'Sin observaciones registradas';
    document.getElementById('llamadaPacienteIndicaciones').innerHTML = patient.indicacionesAnest || 'Sin indicaciones registradas';

    const ahora = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('llamadaFechaHora').value = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

    document.getElementById('llamadaNombreRec').value = '';
    document.getElementById('llamadaRutRec').value = '';
    document.getElementById('llamadaParentesco').value = '';
    document.getElementById('llamadaMotivo').value = '';
    document.getElementById('llamadaRespuesta').value = '';
    document.getElementById('llamadaObservaciones').value = '';
    document.getElementById('llamadaProximoLlamado').value = '';

    setupRutValidationLimpio(document.getElementById('llamadaRutRec'));

    modal.style.display = 'flex';
}

function cerrarModalRegistroLlamada() {
    const modal = document.getElementById('modalRegistroLlamada');
    if (modal) modal.style.display = 'none';
}

async function guardarRegistroLlamada() {
    if (!currentCallPatient) { alert("❌ No hay paciente seleccionado"); return; }
    if (isSubmittingLlamada) return;
    isSubmittingLlamada = true;
    leMostrarCargando();

    const patientKey = currentCallPatient.firebaseKey;

    const rutReceptorInput = document.getElementById('llamadaRutRec');
    const rutReceptorLimpio = rutReceptorInput.value ? rutReceptorInput.value.replace(/[^0-9kK]/g, '').toUpperCase() : '';

    if (rutReceptorLimpio && !validarRutChileno(rutReceptorLimpio)) {
        alert("❌ El RUT del receptor no es válido. Por favor verifica el formato.");
        rutReceptorInput.focus();
        isSubmittingLlamada = false;
        leOcultarCargando();
        return;
    }

    const rutReceptorFormateado = rutReceptorLimpio ? formatRut(rutReceptorLimpio) : '';
    if (rutReceptorLimpio) rutReceptorInput.value = rutReceptorFormateado;

    const llamadaData = {
        fechaLlamada: document.getElementById('llamadaFechaHora').value,
        nombreRec: document.getElementById('llamadaNombreRec').value,
        rutRec: rutReceptorFormateado,
        parentesco: document.getElementById('llamadaParentesco').value,
        motivo: document.getElementById('llamadaMotivo').value,
        respuesta: document.getElementById('llamadaRespuesta').value,
        observaciones: document.getElementById('llamadaObservaciones').value,
        proximoLlamado: document.getElementById('llamadaProximoLlamado').value,
        registradoPor: currentUserEmail || 'Sistema',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    if (!llamadaData.motivo || !llamadaData.respuesta) {
        alert("❌ Motivo y Respuesta son obligatorios");
        isSubmittingLlamada = false;
        leOcultarCargando();
        return;
    }

    leGuardarFiltrosEnStorage();

    try {
        await database.ref(`patients/${patientKey}/historialLlamadas`).push(llamadaData);

        if (llamadaData.proximoLlamado) {
            await database.ref(`patients/${patientKey}`).update({ fechaProximoLlamado: llamadaData.proximoLlamado });
        } else {
            await database.ref(`patients/${patientKey}/fechaProximoLlamado`).remove();
        }

        await database.ref(`patients/${patientKey}/historial`).push({
            fecha: new Date().toISOString(),
            usuario: currentUserEmail || 'Sistema',
            accion: "Registro de Llamada",
            descripcion: `Llamada registrada - Motivo: ${llamadaData.motivo} - Respuesta: ${llamadaData.respuesta}`
        });

        alert("✅ Registro de llamada guardado correctamente");
        cerrarModalRegistroLlamada();

        setTimeout(() => {
            leRestaurarFiltros();
            leShowPatientModal(patientKey);
        }, 300);

    } catch (error) {
        console.error(error);
        alert("❌ Error al guardar: " + error.message);
    } finally {
        isSubmittingLlamada = false;
        leOcultarCargando();
    }
}

function leAbrirModalDetalleLlamada() {
    let modal = document.getElementById('modalDetalleLlamada');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalDetalleLlamada';
        modal.className = 'modal le-scope';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px;">
                <span class="close" onclick="cerrarModalDetalleLlamada()">&times;</span>
                <h2 style="color:#1e40af;">📋 Detalle de Llamada</h2>
                <div id="detalleLlamadaBody" style="margin-top:20px;"></div>
                <div class="modal-buttons" id="detalleLlamadaButtons" style="margin-top:20px;">
                    <button onclick="cerrarModalDetalleLlamada()" class="btn-secondary">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    return modal;
}

async function verDetalleLlamada(patientKey, llamadaKey) {
    const snapshot = await database.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).once('value');
    const llamada = snapshot.val();
    if (!llamada) return;

    leAbrirModalDetalleLlamada();

    const fecha = new Date(llamada.fechaLlamada);
    document.getElementById('detalleLlamadaBody').innerHTML = `
        <p><strong>📅 Fecha y Hora:</strong> ${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}</p>
        <p><strong>👤 Receptor:</strong> ${llamada.nombreRec || '-'}</p>
        <p><strong>🆔 RUT Receptor:</strong> ${llamada.rutRec || '-'}</p>
        <p><strong>👨‍👩‍👧 Parentesco:</strong> ${llamada.parentesco || '-'}</p>
        <hr>
        <p><strong>📋 Motivo:</strong> ${llamada.motivo || '-'}</p>
        <p><strong>📝 Respuesta:</strong> ${llamada.respuesta || '-'}</p>
        <p><strong>📝 Observaciones:</strong> ${llamada.observaciones || '-'}</p>
        <hr>
        <p><strong>📅 Próximo Llamado:</strong> ${llamada.proximoLlamado ? formatDate(llamada.proximoLlamado) : 'No programado'}</p>
        <p><strong>👤 Registrado por:</strong> ${llamada.registradoPor || '-'}</p>
    `;

    const buttonsContainer = document.getElementById('detalleLlamadaButtons');
    if (esAdministrador()) {
        buttonsContainer.innerHTML = `
            <button onclick="abrirModalEditarLlamada('${patientKey}', '${llamadaKey}')" class="btn-primary" style="background:#f59e0b;">✏️ Editar Llamada</button>
            <button onclick="eliminarRegistroLlamada('${patientKey}', '${llamadaKey}')" class="btn-danger">🗑️ Eliminar Llamada</button>
            <button onclick="cerrarModalDetalleLlamada()" class="btn-secondary">Cerrar</button>
        `;
    } else {
        buttonsContainer.innerHTML = `<button onclick="cerrarModalDetalleLlamada()" class="btn-secondary">Cerrar</button>`;
    }

    document.getElementById('modalDetalleLlamada').style.display = 'flex';
}

function cerrarModalDetalleLlamada() {
    const modal = document.getElementById('modalDetalleLlamada');
    if (modal) modal.style.display = 'none';
}

function leAbrirModalEditarLlamada() {
    let modal = document.getElementById('modalEditarLlamada');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalEditarLlamada';
        modal.className = 'modal le-scope';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:700px;">
                <span class="close" onclick="cerrarModalEditarLlamada()">&times;</span>
                <h2 style="color:#1e40af; margin-bottom:20px;">✏️ Editar Registro de Llamada</h2>
                <input type="hidden" id="editLlamadaPatientKey">
                <input type="hidden" id="editLlamadaKey">
                <div class="form-group"><label>📅 Fecha y Hora de la Llamada</label><input type="datetime-local" id="editLlamadaFechaHora" style="width:100%; padding:10px;"></div>
                <div class="form-group"><label>👤 Nombre del Receptor</label><input type="text" id="editLlamadaNombreRec" style="width:100%; padding:10px;"></div>
                <div class="form-group"><label>🆔 RUT del Receptor</label><input type="text" id="editLlamadaRutRec" style="width:100%; padding:10px;"></div>
                <div class="form-group"><label>👨‍👩‍👧 Parentesco con el Paciente</label><input type="text" id="editLlamadaParentesco" style="width:100%; padding:10px;"></div>
                <div class="form-group">
                    <label>📋 Motivo de la Llamada</label>
                    <select id="editLlamadaMotivo" style="width:100%; padding:10px;">
                        <option value="">Seleccionar</option>
                        <option value="HORA DE EXAMENES">HORA DE EXAMENES</option>
                        <option value="HORA DE ANESTESIA">HORA DE ANESTESIA</option>
                        <option value="ACTUALIZACION DE INFORMACION / CONTINUIDAD DEL PROCESO">ACTUALIZACION DE INFORMACION / CONTINUIDAD DEL PROCESO</option>
                        <option value="FECHA CIRUGIA">FECHA CIRUGIA</option>
                        <option value="SUSPENDIDO">SUSPENDIDO</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>📝 Respuesta del Paciente/Receptor</label>
                    <select id="editLlamadaRespuesta" style="width:100%; padding:10px;">
                        <option value="">Seleccionar</option>
                        <option value="ACEPTA">ACEPTA</option>
                        <option value="RECHAZA">RECHAZA</option>
                        <option value="POSTERGA">POSTERGA</option>
                        <option value="NO RESPONDE LLAMADA">NO RESPONDE LLAMADA</option>
                        <option value="ENTREGARA INFORMACION">ENTREGARA INFORMACION</option>
                    </select>
                </div>
                <div class="form-group"><label>📝 Observaciones de la Llamada</label><textarea id="editLlamadaObservaciones" rows="3" style="width:100%; padding:10px;"></textarea></div>
                <div class="form-group">
                    <label>📅 Programar Próximo Llamado</label>
                    <input type="date" id="editLlamadaProximoLlamado" style="width:100%; padding:10px;">
                </div>
                <div class="modal-buttons" style="margin-top:20px;">
                    <button onclick="guardarEdicionLlamada()" class="btn-primary">💾 Guardar Cambios</button>
                    <button onclick="cerrarModalEditarLlamada()" class="btn-secondary">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    return modal;
}

async function abrirModalEditarLlamada(patientKey, llamadaKey) {
    if (!esAdministrador()) { alert("❌ No tienes permisos para editar llamadas."); return; }

    const snapshot = await database.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).once('value');
    const llamada = snapshot.val();
    if (!llamada) return;

    cerrarModalDetalleLlamada();
    leAbrirModalEditarLlamada();

    let fechaHoraValue = '';
    if (llamada.fechaLlamada) {
        const fecha = new Date(llamada.fechaLlamada);
        if (!isNaN(fecha.getTime())) {
            const pad = n => String(n).padStart(2, '0');
            fechaHoraValue = `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
        }
    }

    let fechaProximoValue = '';
    if (llamada.proximoLlamado) {
        const fecha = new Date(llamada.proximoLlamado);
        if (!isNaN(fecha.getTime())) fechaProximoValue = fecha.toISOString().split('T')[0];
    }

    document.getElementById('editLlamadaPatientKey').value = patientKey;
    document.getElementById('editLlamadaKey').value = llamadaKey;
    document.getElementById('editLlamadaFechaHora').value = fechaHoraValue;
    document.getElementById('editLlamadaNombreRec').value = llamada.nombreRec || '';

    const rutRecLimpio = llamada.rutRec ? llamada.rutRec.replace(/[^0-9kK]/g, '').toUpperCase() : '';
    document.getElementById('editLlamadaRutRec').value = rutRecLimpio ? formatRut(rutRecLimpio) : '';

    document.getElementById('editLlamadaParentesco').value = llamada.parentesco || '';
    document.getElementById('editLlamadaMotivo').value = llamada.motivo || '';
    document.getElementById('editLlamadaRespuesta').value = llamada.respuesta || '';
    document.getElementById('editLlamadaObservaciones').value = llamada.observaciones || '';
    document.getElementById('editLlamadaProximoLlamado').value = fechaProximoValue;

    setupRutValidationLimpio(document.getElementById('editLlamadaRutRec'));

    document.getElementById('modalEditarLlamada').style.display = 'flex';
}

async function guardarEdicionLlamada() {
    if (!esAdministrador()) { alert("❌ No tienes permisos para editar llamadas."); return; }
    if (isEditingLlamada) return;
    isEditingLlamada = true;

    const patientKey = document.getElementById('editLlamadaPatientKey').value;
    const llamadaKey = document.getElementById('editLlamadaKey').value;

    if (!patientKey || !llamadaKey) {
        alert("❌ Error: No se encontró la llamada a editar.");
        isEditingLlamada = false;
        return;
    }

    leMostrarCargando();
    leGuardarFiltrosEnStorage();

    try {
        const rutReceptor = document.getElementById('editLlamadaRutRec').value;
        const rutReceptorLimpio = rutReceptor ? rutReceptor.replace(/[^0-9kK]/g, '').toUpperCase() : '';

        if (rutReceptorLimpio && !validarRutChileno(rutReceptorLimpio)) {
            alert("❌ El RUT del receptor no es válido. Por favor verifica el formato.");
            document.getElementById('editLlamadaRutRec').focus();
            isEditingLlamada = false;
            leOcultarCargando();
            return;
        }

        const rutReceptorFormateado = rutReceptorLimpio ? formatRut(rutReceptorLimpio) : '';

        const llamadaData = {
            fechaLlamada: document.getElementById('editLlamadaFechaHora').value,
            nombreRec: document.getElementById('editLlamadaNombreRec').value,
            rutRec: rutReceptorFormateado,
            parentesco: document.getElementById('editLlamadaParentesco').value,
            motivo: document.getElementById('editLlamadaMotivo').value,
            respuesta: document.getElementById('editLlamadaRespuesta').value,
            observaciones: document.getElementById('editLlamadaObservaciones').value,
            proximoLlamado: document.getElementById('editLlamadaProximoLlamado').value,
            editadoPor: currentUserEmail || 'Sistema',
            editadoEn: firebase.database.ServerValue.TIMESTAMP
        };

        if (!llamadaData.motivo || !llamadaData.respuesta) {
            alert("❌ Motivo y Respuesta son obligatorios");
            isEditingLlamada = false;
            leOcultarCargando();
            return;
        }

        await database.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).update(llamadaData);

        if (llamadaData.proximoLlamado) {
            await database.ref(`patients/${patientKey}`).update({ fechaProximoLlamado: llamadaData.proximoLlamado });
        } else {
            const snapshot = await database.ref(`patients/${patientKey}/historialLlamadas`).once('value');
            let tieneProximo = false;
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    const l = child.val();
                    if (l.proximoLlamado && child.key !== llamadaKey) tieneProximo = true;
                });
            }
            if (!tieneProximo) await database.ref(`patients/${patientKey}/fechaProximoLlamado`).remove();
        }

        alert("✅ Llamada actualizada correctamente");
        cerrarModalEditarLlamada();

        setTimeout(() => {
            leRestaurarFiltros();
            leShowPatientModal(patientKey);
        }, 300);

    } catch (error) {
        console.error(error);
        alert("❌ Error al editar: " + error.message);
    } finally {
        isEditingLlamada = false;
        leOcultarCargando();
    }
}

function cerrarModalEditarLlamada() {
    const modal = document.getElementById('modalEditarLlamada');
    if (modal) modal.style.display = 'none';
}

async function eliminarRegistroLlamada(patientKey, llamadaKey) {
    if (!esAdministrador()) { alert("❌ No tienes permisos para eliminar registros de llamadas."); return; }
    if (isDeletingLlamada) return;
    if (!confirm("⚠️ ¿Estás seguro de eliminar este registro de llamada?\n\nEsta acción NO se registra en el historial y NO se puede deshacer.")) return;

    isDeletingLlamada = true;
    leMostrarCargando();
    leGuardarFiltrosEnStorage();

    try {
        const snapshot = await database.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).once('value');
        const llamada = snapshot.val();

        await database.ref(`patients/${patientKey}/historialLlamadas/${llamadaKey}`).remove();

        if (llamada && llamada.proximoLlamado) {
            const todasLlamadasSnap = await database.ref(`patients/${patientKey}/historialLlamadas`).once('value');
            let tieneProximo = false;
            if (todasLlamadasSnap.exists()) {
                todasLlamadasSnap.forEach(child => {
                    if (child.val().proximoLlamado) tieneProximo = true;
                });
            }
            if (!tieneProximo) await database.ref(`patients/${patientKey}/fechaProximoLlamado`).remove();
        }

        alert("✅ Registro de llamada eliminado correctamente");
        cerrarModalDetalleLlamada();

        setTimeout(() => {
            leRestaurarFiltros();
            leShowPatientModal(patientKey);
        }, 300);

    } catch (error) {
        console.error(error);
        alert("❌ Error al eliminar: " + error.message);
    } finally {
        isDeletingLlamada = false;
        leOcultarCargando();
    }
}
