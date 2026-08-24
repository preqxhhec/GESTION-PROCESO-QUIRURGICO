// =============================================================
// 🩺 LISTA DE ESPERA — MÓDULO 6: EXPORTACIÓN E IMPRESIÓN
// =============================================================
// Portado desde "LISTA DE ESPERA APP/script.js": descarga de CSV/Excel de
// pacientes, impresión de la lista filtrada, impresión de la ficha de un
// paciente, impresión del Dashboard y descarga/impresión del registro de
// llamadas. XLSX ya está cargado por la app integrada (xlsx.full.min.js en
// index.html), no se agregó una segunda copia.
//
// Todas estas funciones trabajan sobre "lo que se ve en pantalla ahora
// mismo" (leGetCurrentFilteredData(), en js/25) y no requieren permisos
// especiales: cualquiera con acceso a la sección puede exportar/imprimir.
// =============================================================

function calcularDiasEspera(fechaStr) {
    if (!fechaStr) return '-';
    try {
        const fecha = new Date(fechaStr);
        const hoy = new Date();
        const diffDays = Math.ceil((hoy - fecha) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    } catch (e) {
        return '-';
    }
}

// =============================================================
// 📥 CSV / EXCEL DE PACIENTES
// =============================================================

function downloadCSV() {
    const data = leGetCurrentFilteredData();
    if (data.length === 0) return alert("No hay datos para descargar con los filtros actuales.");

    let csvContent = "ID;Estatus Tabla;T.Espera;Fecha Ind Qx;Nombre y Apellido;RUT;Edad;Comuna;Especialidad;Médico Tratante;Diagnóstico;Intervención;Fecha Cirugía;Observaciones\n";
    data.forEach(p => {
        const tEspera = calcularDiasEspera(p.fechaIndQx);
        csvContent += `"${p.id || ''}";"${p.estatusTabla || ''}";"${tEspera}";"${p.fechaIndQx || ''}";"${p.nombreApellido || ''}";"${p.rut || ''}";"${p.edad || ''}";"${p.comuna || ''}";"${p.especialidad || ''}";"${p.medicoTratante || ''}";"${p.diagnostico || ''}";"${p.intervencion || ''}";"${p.fechaCirugia || ''}";"${(p.observaciones || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob(["﻿" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Pacientes_Filtrados_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    alert(`✅ CSV descargado (${data.length} registros con filtros aplicados)`);
}

function downloadExcel() {
    const data = leGetCurrentFilteredData();
    if (data.length === 0) return alert("No hay datos para descargar con los filtros actuales.");

    const excelData = data.map(p => ({
        "ID": p.id || '', "Estatus Tabla": p.estatusTabla || '', "T. Espera (días)": calcularDiasEspera(p.fechaIndQx),
        "Fecha Indicación Qx": p.fechaIndQx || '', "Nombre y Apellido": p.nombreApellido || '', "RUT": p.rut || '',
        "Fecha Nacimiento": p.fechaNac || '', "Edad": p.edad || '', "Patologías Crónicas": p.patologiasCronicas || '',
        "Medicamentos Crónicos": p.medicamentosCronicos || '', "Comuna": p.comuna || '', "Dirección": p.direccion || '',
        "N° Contacto": p.nContacto || '', "Email": p.emailPaciente || '', "Especialidad": p.especialidad || '',
        "Médico Tratante": p.medicoTratante || '', "Diagnóstico (CIE10)": p.diagnostico || '', "Lateralidad": p.lateralidad || '',
        "Intervención": p.intervencion || '', "Estatus EPA": p.estatusEpa || '', "Anestesiólogo": p.anestesiologo || '',
        "Fecha EPA": p.fechaEpa || '', "GES": p.ges || '', "TACO": p.taco || '', "ASA": p.asa || '', "EKG": p.ekg || '',
        "RX": p.rx || '', "ECO": p.eco || '', "Prioridad": p.prioridad || '', "Observaciones": p.observaciones || '',
        "Indicaciones Anestesiólogo": p.indicacionesAnest || '', "Folio": p.folio || '',
        "Fecha Estatus Program": p.fechaEstatusProgram || '', "T. Espera Programación": calcularDiasEspera(p.fechaEstatusProgram),
        "Fecha de Cirugía": p.fechaCirugia || '', "Registrado por": p.registro || ''
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
    XLSX.writeFile(wb, `Pacientes_Filtrados_${new Date().toISOString().slice(0, 10)}.xlsx`);

    alert(`✅ Excel completo descargado correctamente (${data.length} registros con filtros aplicados)`);
}

// =============================================================
// 🖨️ IMPRIMIR FICHA DE UN PACIENTE
// =============================================================

function printPatient() {
    if (!currentModalPatient) return;
    const p = currentModalPatient;

    let historialPrint = '<p><em>No hay historial de modificaciones registrado aún.</em></p>';
    if (p.historial && Object.keys(p.historial).length > 0) {
        const historialArray = Object.values(p.historial).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        historialPrint = `<h2>📜 Historial de Modificaciones</h2>`;
        historialArray.forEach(h => {
            const fecha = new Date(h.fecha);
            const cambiosHTML = (h.cambios && h.cambios.length) ? `<ul style="margin:8px 0; padding-left:20px;">${h.cambios.map(c => `<li>${c}</li>`).join('')}</ul>` : '';
            historialPrint += `
                <div style="margin:12px 0; padding:12px; background:#f8fafc; border-left:4px solid #3b82f6; border-radius:6px;">
                    <strong>${h.accion}</strong> — ${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}<br>
                    <strong>Usuario:</strong> ${h.usuario}<br>
                    ${cambiosHTML || `<em>${h.descripcion || 'Sin descripción'}</em>`}
                </div>`;
        });
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Ficha - ${p.nombreApellido}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 13px; line-height: 1.35; color: #1e2937; }
            .header { margin-bottom: 25px; border-bottom: 3px solid #1e40af; padding-bottom: 15px; text-align:center; }
            h1 { font-size: 19px; margin: 0 0 5px 0; color: #1e40af; }
            h2 { font-size: 15px; margin: 18px 0 8px 0; color: #1e40af; border-bottom: 1px solid #cbd5e1; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 14px; margin: 8px 0; }
            .label { font-weight: bold; color: #475569; display: inline-block; width: 160px; }
            hr { margin: 16px 0; border: none; border-top: 1px solid #e2e8f0; }
        </style></head><body>
            <div class="header"><h1>FICHA DE REGISTRO DE PACIENTE</h1><h2>UNIDAD PREQUIRÚRGICO</h2></div>
            <h2>📋 Datos Administrativos</h2>
            <div class="grid">
                <p><span class="label">ID:</span> ${p.id || '-'}</p>
                <p><span class="label">Estatus Tabla:</span> ${p.estatusTabla || '-'}</p>
                <p><span class="label">Folio:</span> ${p.folio || '-'}</p>
                <p><span class="label">Fecha Ind. Qx:</span> ${formatDate(p.fechaIndQx)}</p>
            </div>
            <hr>
            <h2>⏱️ Tiempos de Espera</h2>
            <div class="grid">
                <p><span class="label">T. Espera Actual:</span> ${calculateWaitingDays(p.fechaIndQx)} días</p>
                <p><span class="label">Espera Programación:</span> ${calculateWaitingDays(p.fechaEstatusProgram)} días</p>
            </div>
            <hr>
            <h2>👤 Datos del Paciente</h2>
            <div class="grid">
                <p><span class="label">Nombre y Apellido:</span> ${p.nombreApellido || '-'}</p>
                <p><span class="label">RUT:</span> ${p.rut || '-'}</p>
                <p><span class="label">Edad:</span> ${p.edad || '-'} años</p>
                <p><span class="label">Fecha Nacimiento:</span> ${formatDate(p.fechaNac)}</p>
                <p><span class="label">Comuna:</span> ${p.comuna || '-'}</p>
                <p><span class="label">Dirección:</span> ${p.direccion || '-'}</p>
                <p><span class="label">N° Contacto:</span> ${p.nContacto || '-'}</p>
                <p><span class="label">Email:</span> ${p.emailPaciente || '-'}</p>
            </div>
            <hr>
            <h2>🩺 Datos Clínicos</h2>
            <div class="grid">
                <p><span class="label">Especialidad:</span> ${p.especialidad || '-'}</p>
                <p><span class="label">Médico Tratante:</span> ${p.medicoTratante || '-'}</p>
                <p><span class="label">Diagnóstico:</span> ${p.diagnostico || '-'}</p>
                <p><span class="label">Lateralidad:</span> ${p.lateralidad || '-'}</p>
                <p><span class="label">Intervención:</span> ${p.intervencion || '-'}</p>
            </div>
            <hr>
            <h2>🔬 Evaluación Preoperatoria</h2>
            <div class="grid">
                <p><span class="label">Estatus EPA:</span> ${p.estatusEpa || '-'}</p>
                <p><span class="label">Anestesiólogo:</span> ${p.anestesiologo || '-'}</p>
                <p><span class="label">Fecha EPA:</span> ${formatDate(p.fechaEpa)}</p>
                <p><span class="label">GES:</span> ${p.ges || '-'}</p>
                <p><span class="label">TACO:</span> ${p.taco || '-'}</p>
                <p><span class="label">ASA:</span> ${p.asa || '-'}</p>
                <p><span class="label">EKG:</span> ${p.ekg || '-'}</p>
                <p><span class="label">RX:</span> ${p.rx || '-'}</p>
                <p><span class="label">ECO:</span> ${p.eco || '-'}</p>
                <p><span class="label">Prioridad:</span> ${p.prioridad || '-'}</p>
            </div>
            <hr>
            <h2>📅 Programación</h2>
            <div class="grid">
                <p><span class="label">Fecha Estatus Program:</span> ${formatDate(p.fechaEstatusProgram)}</p>
                <p><span class="label">Fecha de Cirugía:</span> ${p.fechaCirugia ? formatDate(p.fechaCirugia) : 'No programada'}</p>
            </div>
            <hr>
            <h2>📝 Observaciones</h2>
            <p><strong>Patologías Crónicas:</strong> ${p.patologiasCronicas || 'Ninguna'}</p>
            <p><strong>Medicamentos Crónicos:</strong> ${p.medicamentosCronicos || 'Ninguno'}</p>
            <p><strong>Observaciones:</strong> ${p.observaciones || 'Sin observaciones'}</p>
            <p><strong>Indicaciones Anestesiólogo:</strong> ${p.indicacionesAnest || 'Sin indicaciones'}</p>
            <hr>
            ${historialPrint}
            <div style="margin-top:35px; text-align:center; font-size:11px; color:#64748b;">
                Generado por Sistema Unidad Prequirúrgica • ${new Date().toLocaleDateString('es-CL')}
            </div>
        </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
}

// =============================================================
// 🖨️ IMPRIMIR LISTA DE PACIENTES (FILTRADA)
// =============================================================

function printPatientList() {
    const filtered = leGetCurrentFilteredData();
    if (filtered.length === 0) {
        alert("❌ No hay pacientes en la lista actual. Revisa los filtros aplicados.");
        return;
    }
    filtered.sort((a, b) => calculateWaitingDays(a.fechaIndQx) - calculateWaitingDays(b.fechaIndQx));

    const printWindow = window.open('', '_blank');
    const textoFiltros = leObtenerTextoFiltros();

    let tablaHTML = `
        <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Lista de Pacientes - Unidad Prequirúrgica</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; line-height: 1.4; color: #1e2937; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #1e40af; padding-bottom: 15px; }
            h1 { font-size: 18px; margin: 5px 0; color: #1e40af; }
            .filters-info { background: #f8fafc; padding: 10px; margin-bottom: 20px; border-radius: 8px; font-size: 11px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #94a3b8; padding: 8px 6px; text-align: left; vertical-align: top; font-size: 10px; }
            th { background: #1e40af; color: white; font-weight: 600; font-size: 11px; }
            tr:nth-child(even) { background: #f8fafc; }
            .total-registros { margin-top: 15px; font-weight: bold; text-align: right; font-size: 11px; }
        </style></head><body>
            <div class="header">
                <h1>HOSPITAL DE ILLAPEL - UNIDAD DE PREQUIRÚRGICO</h1>
                <h2>LISTA DE PACIENTES</h2>
                <p>Fecha de generación: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
            </div>
            <div class="filters-info">
                <p><strong>📋 Filtros aplicados:</strong> ${textoFiltros}</p>
                <p>✅ Total de registros encontrados: <strong>${filtered.length}</strong></p>
            </div>
            <table><thead><tr><th>ID</th><th>Fecha Ind. Qx</th><th>T. Espera</th><th>Nombre y Apellido</th><th>RUT</th><th>Diagnóstico</th><th>Estatus Tabla</th><th>Especialidad</th></tr></thead><tbody>
    `;

    filtered.forEach(patient => {
        const diasEspera = calculateWaitingDays(patient.fechaIndQx);
        const diagnosticoCorto = (patient.diagnostico || '-').substring(0, 50) + ((patient.diagnostico || '').length > 50 ? '...' : '');
        tablaHTML += `
            <tr>
                <td>${patient.id || '-'}</td>
                <td>${patient.fechaIndQx ? formatDate(patient.fechaIndQx) : '-'}</td>
                <td><strong>${diasEspera}</strong></td>
                <td>${patient.nombreApellido || '-'}</td>
                <td>${patient.rut || '-'}</td>
                <td>${diagnosticoCorto}</td>
                <td>${patient.estatusTabla || '-'}</td>
                <td>${patient.especialidad || '-'}</td>
            </tr>`;
    });

    tablaHTML += `
                </tbody></table>
            <div class="total-registros">Total de pacientes: ${filtered.length}</div>
            <div style="margin-top:30px; text-align:center; font-size:10px; color:#64748b;">Generado por Sistema Unidad Prequirúrgica - Hospital de Illapel</div>
        </body></html>
    `;

    printWindow.document.write(tablaHTML);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}

// =============================================================
// 🖨️ IMPRIMIR DASHBOARD
// =============================================================

function printDashboard() {
    const get = id => document.getElementById(id)?.textContent || '';
    const getHTML = id => document.getElementById(id)?.innerHTML || '';

    const totalGestionables = get('totalPatients');
    const medianaGeneral = getHTML('medianaEsperaGeneral');
    const medianaProgramacion = getHTML('medianaEsperaProgramacion');
    const prioridadP1 = get('prioridadP1'), prioridadP2 = get('prioridadP2'), prioridadP3 = get('prioridadP3');
    const gesSi = get('gesSi'), gesNo = get('gesNo');

    const medianasTable = document.getElementById('medianasTable');
    const topEsperaTable = document.getElementById('topEsperaTable');
    const ultimosPacientesTable = document.getElementById('ultimosPacientesTable');
    const crossTable = document.getElementById('crossTable');
    const especialidadChartEl = document.getElementById('especialidadChart');
    const estatusChartEl = document.getElementById('estatusChart');
    const tendenciaChartEl = document.getElementById('tendenciaChart');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Dashboard - Unidad Prequirúrgico</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; line-height: 1.4; color: #1e2937; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 4px solid #1e40af; padding-bottom: 15px; }
            h1 { font-size: 22px; margin: 8px 0 4px 0; color: #1e40af; }
            h3 { font-size: 14px; margin: 15px 0 10px 0; color: #1e40af; border-left: 4px solid #3b82f6; padding-left: 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
            .stat-card { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; border: 1px solid #e2e8f0; }
            .total-card { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; }
            .big-number { font-size: 28px; font-weight: 700; margin: 10px 0 0 0; }
            .stats-mini { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .priority-group, .ges-group { display: flex; justify-content: space-around; margin-top: 10px; }
            .priority-color { display: inline-block; width: 25px; height: 25px; border-radius: 50%; }
            .charts-print { display: flex; gap: 15px; margin: 20px 0; }
            .chart-print { flex: 1; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; }
            .chart-print img { width: 100%; max-height: 220px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
            th, td { border: 1px solid #94a3b8; padding: 8px 6px; text-align: center; }
            th { background: #1e40af; color: white; font-weight: 600; }
            tr:nth-child(even) { background: #f8fafc; }
        </style></head><body>
            <div class="header">
                <h1>FICHA DASHBOARD - UNIDAD PREQUIRÚRGICO</h1>
                <h2>HOSPITAL DE ILLAPEL</h2>
                <p>Fecha de generación: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
            </div>
            <div class="stats-grid">
                <div class="stat-card total-card"><h3>Total Pacientes Gestionables</h3><p class="big-number">${totalGestionables}</p></div>
                <div class="stat-card" style="background:linear-gradient(135deg,#059669,#10b981); color:white;"><h3>📊 Mediana de Espera General</h3><p class="big-number">${medianaGeneral}</p></div>
                <div class="stat-card" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6); color:white;"><h3>📊 Mediana Espera Programación</h3><p class="big-number">${medianaProgramacion}</p></div>
            </div>
            <div class="stats-mini">
                <div class="stat-card"><h3>🔄 Pacientes por Prioridad</h3>
                    <div class="priority-group">
                        <div><span class="priority-color" style="background:#ef4444;"></span><div><strong>P1</strong></div><div style="font-size:22px; font-weight:700;">${prioridadP1}</div></div>
                        <div><span class="priority-color" style="background:#f59e0b;"></span><div><strong>P2</strong></div><div style="font-size:22px; font-weight:700;">${prioridadP2}</div></div>
                        <div><span class="priority-color" style="background:#10b981;"></span><div><strong>P3</strong></div><div style="font-size:22px; font-weight:700;">${prioridadP3}</div></div>
                    </div>
                </div>
                <div class="stat-card"><h3>✅ GES vs NO GES</h3>
                    <div class="ges-group">
                        <div><span class="priority-color" style="background:#3b82f6;"></span><div><strong>GES SI</strong></div><div style="font-size:22px; font-weight:700;">${gesSi}</div></div>
                        <div><span class="priority-color" style="background:#94a3b8;"></span><div><strong>GES NO</strong></div><div style="font-size:22px; font-weight:700;">${gesNo}</div></div>
                    </div>
                </div>
            </div>
            <div class="charts-print">
                <div class="chart-print"><h3>Pacientes por Especialidad</h3>${especialidadChartEl ? `<img src="${especialidadChartEl.toDataURL()}">` : ''}</div>
                <div class="chart-print"><h3>Pacientes por Estatus Tabla</h3>${estatusChartEl ? `<img src="${estatusChartEl.toDataURL()}">` : ''}</div>
            </div>
            <div class="chart-print" style="margin:20px 0;"><h3>📈 Ingresos por Mes</h3>${tendenciaChartEl ? `<img src="${tendenciaChartEl.toDataURL()}" style="max-width:100%;">` : ''}</div>
            <h3>📊 Medianas de Espera por Especialidad</h3>${medianasTable ? medianasTable.outerHTML : '<p>No hay datos disponibles</p>'}
            <h3>📊 Pacientes por Especialidad vs Estatus</h3>${crossTable ? crossTable.outerHTML : '<p>No hay datos disponibles</p>'}
            <h3>⚠️ Pacientes con Mayor Tiempo de Espera</h3>${topEsperaTable ? topEsperaTable.outerHTML : '<p>No hay datos disponibles</p>'}
            <h3>🆕 Últimos 5 Pacientes Registrados</h3>${ultimosPacientesTable ? ultimosPacientesTable.outerHTML : '<p>No hay datos disponibles</p>'}
            <div style="margin-top:35px; text-align:center; font-size:10px; color:#64748b;">Generado por Sistema Unidad Prequirúrgica - Hospital de Illapel</div>
        </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 800);
}

// =============================================================
// 📞 DESCARGAR / IMPRIMIR REGISTRO DE LLAMADAS (por paciente)
// =============================================================

async function leRecopilarLlamadasFiltradas() {
    const pacientesFiltrados = leGetCurrentFilteredData();
    const todasLasLlamadas = [];

    for (const patient of pacientesFiltrados) {
        const snapshot = await database.ref(`patients/${patient.firebaseKey}`).once('value');
        const patientCompleto = snapshot.val();
        if (!patientCompleto || !patientCompleto.historialLlamadas) continue;

        Object.values(patientCompleto.historialLlamadas).forEach(llamada => {
            let fechaLlamadaFormateada = '';
            if (llamada.fechaLlamada) {
                const fecha = new Date(llamada.fechaLlamada);
                fechaLlamadaFormateada = !isNaN(fecha.getTime()) ? `${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}` : String(llamada.fechaLlamada);
            }
            let fechaProximoFormateada = '';
            if (llamada.proximoLlamado) {
                const fecha = new Date(llamada.proximoLlamado);
                fechaProximoFormateada = !isNaN(fecha.getTime()) ? fecha.toLocaleDateString('es-CL') : String(llamada.proximoLlamado);
            }

            todasLasLlamadas.push({
                rut: patientCompleto.rut || '', nombre: patientCompleto.nombreApellido || '',
                telefono: patientCompleto.nContacto || '', especialidad: patientCompleto.especialidad || '',
                fechaLlamada: fechaLlamadaFormateada, motivo: llamada.motivo || '', receptor: llamada.nombreRec || '',
                rutReceptor: llamada.rutRec || '', parentesco: llamada.parentesco || '', respuesta: llamada.respuesta || '',
                observaciones: (llamada.observaciones || '').toString().substring(0, 100), proximoLlamado: fechaProximoFormateada,
                registradoPor: llamada.registradoPor || '', fechaRegistro: llamada.timestamp ? new Date(llamada.timestamp).toLocaleDateString('es-CL') : ''
            });
        });
    }

    todasLasLlamadas.sort((a, b) => {
        const fechaA = new Date((a.fechaLlamada.split(' ')[0] || '').split('/').reverse().join('-'));
        const fechaB = new Date((b.fechaLlamada.split(' ')[0] || '').split('/').reverse().join('-'));
        return fechaB - fechaA;
    });

    return { todasLasLlamadas, pacientesFiltrados };
}

async function descargarRegistroLlamadas() {
    if (!patients || patients.length === 0) { alert("❌ No hay pacientes cargados."); return; }

    leMostrarCargando();
    try {
        const { todasLasLlamadas, pacientesFiltrados } = await leRecopilarLlamadasFiltradas();
        if (todasLasLlamadas.length === 0) {
            alert("❌ No hay registros de llamadas para los pacientes filtrados.");
            return;
        }

        const excelRows = todasLasLlamadas.map(l => ({
            'RUT PACIENTE': l.rut, 'NOMBRE PACIENTE': l.nombre, 'TELÉFONO': l.telefono, 'ESPECIALIDAD': l.especialidad,
            'FECHA LLAMADA': l.fechaLlamada, 'MOTIVO': l.motivo, 'RECEPTOR': l.receptor, 'RUT RECEPTOR': l.rutReceptor,
            'PARENTESCO': l.parentesco, 'RESPUESTA': l.respuesta, 'OBSERVACIONES': l.observaciones,
            'PRÓXIMO LLAMADO': l.proximoLlamado, 'REGISTRADO POR': l.registradoPor, 'FECHA REGISTRO': l.fechaRegistro
        }));

        const ws = XLSX.utils.json_to_sheet(excelRows);
        ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 25 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registro_Llamadas');
        XLSX.writeFile(wb, `Registro_Llamadas_${new Date().toISOString().slice(0, 10)}.xlsx`);

        alert(`✅ Reporte generado correctamente\n\n📞 Total de llamadas exportadas: ${todasLasLlamadas.length}\n👥 Pacientes considerados: ${pacientesFiltrados.length}`);
    } catch (error) {
        console.error(error);
        alert("❌ Error al generar el reporte: " + error.message);
    } finally {
        leOcultarCargando();
    }
}

async function imprimirRegistroLlamadas() {
    if (!patients || patients.length === 0) { alert("❌ No hay pacientes cargados."); return; }

    leMostrarCargando();
    try {
        const { todasLasLlamadas, pacientesFiltrados } = await leRecopilarLlamadasFiltradas();
        if (todasLasLlamadas.length === 0) {
            alert("❌ No hay registros de llamadas para los pacientes filtrados.");
            return;
        }

        const printWindow = window.open('', '_blank');
        let tablaHTML = `
            <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Registro de Llamadas - Unidad Prequirúrgica</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; line-height: 1.4; color: #1e2937; }
                .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #1e40af; padding-bottom: 15px; }
                .filters-info { background: #f8fafc; padding: 10px; margin-bottom: 20px; border-radius: 8px; font-size: 10px; border: 1px solid #e2e8f0; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #94a3b8; padding: 8px 6px; text-align: left; vertical-align: top; font-size: 9px; }
                th { background: #1e40af; color: white; font-weight: 600; font-size: 10px; }
                tr:nth-child(even) { background: #f8fafc; }
            </style></head><body>
                <div class="header">
                    <h1>HOSPITAL DE ILLAPEL - UNIDAD DE PREQUIRÚRGICO</h1>
                    <h2>REGISTRO DE LLAMADAS REALIZADAS</h2>
                    <p>Fecha de generación: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
                </div>
                <div class="filters-info">
                    <p><strong>📋 Filtros aplicados:</strong> ${leObtenerTextoFiltros()}</p>
                    <p>✅ Total de llamadas: <strong>${todasLasLlamadas.length}</strong> | 👥 Pacientes considerados: <strong>${pacientesFiltrados.length}</strong></p>
                </div>
                <table><thead><tr><th>RUT</th><th>Paciente</th><th>Teléfono</th><th>Especialidad</th><th>Fecha Llamada</th><th>Motivo</th><th>Receptor</th><th>Parentesco</th><th>Respuesta</th><th>Observaciones</th><th>Próximo Llamado</th></tr></thead><tbody>
        `;

        todasLasLlamadas.forEach(l => {
            tablaHTML += `
                <tr>
                    <td>${l.rut || '-'}</td><td>${l.nombre || '-'}</td><td>${l.telefono || '-'}</td><td>${l.especialidad || '-'}</td>
                    <td>${l.fechaLlamada || '-'}</td><td>${l.motivo || '-'}</td><td>${l.receptor || '-'}</td><td>${l.parentesco || '-'}</td>
                    <td>${l.respuesta || '-'}</td><td style="max-width:200px;">${l.observaciones || '-'}</td><td>${l.proximoLlamado || '-'}</td>
                </tr>`;
        });

        tablaHTML += `
                </tbody></table>
                <div style="margin-top:15px; font-weight:bold; text-align:right; font-size:10px;">Total de llamadas registradas: ${todasLasLlamadas.length}</div>
                <div style="margin-top:30px; text-align:center; font-size:9px; color:#64748b;">Generado por Sistema Unidad Prequirúrgica - Hospital de Illapel</div>
            </body></html>
        `;

        printWindow.document.write(tablaHTML);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    } catch (error) {
        console.error(error);
        alert("❌ Error al generar el reporte: " + error.message);
    } finally {
        leOcultarCargando();
    }
}

// Reporte de TODAS las llamadas registradas (sin aplicar los filtros de la
// Lista de Pacientes) — pensado como reporte administrativo global.
function imprimirTodasLasLlamadas() {
    const todasLasLlamadas = [];
    patients.forEach(patient => {
        if (!patient.historialLlamadas) return;
        Object.values(patient.historialLlamadas).forEach(llamada => {
            todasLasLlamadas.push({ paciente: patient.nombreApellido, rut: patient.rut, telefono: patient.nContacto, ...llamada });
        });
    });

    todasLasLlamadas.sort((a, b) => new Date(b.fechaLlamada) - new Date(a.fechaLlamada));

    const printWindow = window.open('', '_blank');
    let tablaHTML = `
        <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte de Llamadas Realizadas</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #1e40af; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #94a3b8; padding: 6px 4px; text-align: left; vertical-align: top; }
            th { background: #1e40af; color: white; font-weight: 600; }
        </style></head><body>
            <div class="header">
                <h1>HOSPITAL DE ILLAPEL - UNIDAD DE PREQUIRÚRGICO</h1>
                <h2>REPORTE DE LLAMADAS REALIZADAS</h2>
                <p>Generado: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
                <p><strong>Total de llamadas registradas: ${todasLasLlamadas.length}</strong></p>
            </div>
            <table><thead><tr><th>Fecha Llamada</th><th>Paciente</th><th>RUT</th><th>Teléfono</th><th>Receptor</th><th>Motivo</th><th>Respuesta</th><th>Funcionario</th></tr></thead><tbody>
    `;

    todasLasLlamadas.forEach(llamada => {
        const fecha = new Date(llamada.fechaLlamada);
        tablaHTML += `
            <tr>
                <td>${fecha.toLocaleDateString('es-CL')} ${fecha.toLocaleTimeString('es-CL')}</td>
                <td>${llamada.paciente || '-'}</td><td>${llamada.rut || '-'}</td><td>${llamada.telefono || '-'}</td>
                <td>${llamada.nombreRec || '-'}</td><td>${llamada.motivo || '-'}</td><td>${llamada.respuesta || '-'}</td>
                <td>${llamada.registradoPor || '-'}</td>
            </tr>`;
    });

    tablaHTML += `
                </tbody></table>
            <div style="margin-top:30px; text-align:center; font-size:10px; color:#64748b;">Reporte generado por Sistema Unidad Prequirúrgica - Hospital de Illapel</div>
        </body></html>
    `;

    printWindow.document.write(tablaHTML);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}
