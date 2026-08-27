// =============================================================
// 🩺 LISTA DE ESPERA — MÓDULO 4: DASHBOARD (Chart.js)
// =============================================================
// Portado desde "LISTA DE ESPERA APP/script.js". Chart.js ya está cargado
// por la app integrada (ver <script> de chart.js@4.4.4 en index.html), no
// se agregó una segunda copia.
//
// printDashboard() vive en js/28-le-exportacion-impresion.js (junto con el
// resto de las exportaciones/impresiones), pero lee los mismos elementos
// del DOM que este archivo construye (#totalPatients, los <canvas>, las
// tablas de medianas/top-espera/últimos-pacientes).
// =============================================================

let especialidadChartInstance = null;
let estatusChartInstance = null;
let tendenciaChartInstance = null;
let dashboardFiltroEspecialidad = '';

function leRenderDashboardHTML() {
    return `
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; margin-bottom:20px;">
            <h2>Dashboard General</h2>
            ${usuarioTieneAccesoSeccion('listaEspera_exportar') ? '<button onclick="printDashboard()" class="btn-print-dashboard">🖨️ Imprimir Dashboard Completo</button>' : ''}
        </div>

        <div class="filters" style="align-items:center;">
            <label style="font-weight:600; color:#1e40af;">🔍 Filtrar por Especialidad:</label>
            <select id="dashboardFilterEspecialidad" onchange="leActualizarDashboardConFiltro()" style="padding:8px 15px; border-radius:8px; border:1px solid #cbd5e1; min-width:200px;">
                <option value="">Todas las Especialidades</option>
            </select>
            <button onclick="leLimpiarFiltroDashboard()" class="btn-secondary">Limpiar Filtro</button>
        </div>

        <div class="stats-grid">
            <div class="stat-card total-card">
                <h3>Total Pacientes Gestionables</h3>
                <p id="totalPatients" class="big-number">0</p>
            </div>
            <div class="stat-card" style="background:linear-gradient(135deg,#059669,#10b981); color:white;">
                <h3>📊 Mediana de Espera General</h3>
                <p id="medianaEsperaGeneral" style="font-size:1.8rem; font-weight:700;">0 días</p>
                <small>Desde Fecha Indicación Qx</small>
            </div>
            <div class="stat-card" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6); color:white;">
                <h3>📊 Mediana Espera Programación</h3>
                <p id="medianaEsperaProgramacion" style="font-size:1.8rem; font-weight:700;">0 días</p>
                <small>Desde Fecha Estatus Programable</small>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card" style="background:linear-gradient(135deg,#3b82f6,#1e40af); color:white;">
                <h3>📊 Percentil 25</h3>
                <p id="percentil25Valor" style="font-size:1.3rem; font-weight:700;">0 días</p>
                <p id="percentil25Conteo" style="font-size:1.5rem; font-weight:bold;">0 pacientes</p>
            </div>
            <div class="stat-card" style="background:linear-gradient(135deg,#10b981,#059669); color:white;">
                <h3>📊 Percentil 50</h3>
                <p id="percentil50Valor" style="font-size:1.3rem; font-weight:700;">0 días</p>
                <p id="percentil50Conteo" style="font-size:1.5rem; font-weight:bold;">0 pacientes</p>
            </div>
            <div class="stat-card" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white;">
                <h3>📊 Percentil 75</h3>
                <p id="percentil75Valor" style="font-size:1.3rem; font-weight:700;">0 días</p>
                <p id="percentil75Conteo" style="font-size:1.5rem; font-weight:bold;">0 pacientes</p>
            </div>
            <div class="stat-card" style="background:linear-gradient(135deg,#ef4444,#dc2626); color:white;">
                <h3>📊 Percentil 90</h3>
                <p id="percentil90Valor" style="font-size:1.3rem; font-weight:700;">0 días</p>
                <p id="percentil90Conteo" style="font-size:1.5rem; font-weight:bold;">0 pacientes</p>
            </div>
            <div class="stat-card" style="background:linear-gradient(135deg,#6b7280,#4b5563); color:white;">
                <h3>📊 Mayor Espera</h3>
                <p id="percentilRestoValor" style="font-size:1.3rem; font-weight:700;">0 días</p>
                <p id="percentilRestoConteo" style="font-size:1.5rem; font-weight:bold;">0 pacientes</p>
            </div>
        </div>
        <div style="background:#f8fafc; padding:12px 20px; border-radius:12px; margin:15px 0 20px 0; display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
            <label style="font-weight:600; color:#1e40af;">📊 Calcular percentiles desde:</label>
            <label style="cursor:pointer;"><input type="radio" name="fuentePercentilDashboard" value="fechaIndQx" checked onchange="leCambiarFuenteDashboard('fechaIndQx')"> Fecha Indicación Qx</label>
            <label style="cursor:pointer;"><input type="radio" name="fuentePercentilDashboard" value="fechaEstatusProgram" onchange="leCambiarFuenteDashboard('fechaEstatusProgram')"> Fecha Estatus Programable</label>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>🔄 Pacientes por Prioridad</h3>
                <div style="display:flex; justify-content:space-around; margin-top:15px;">
                    <div style="text-align:center;"><span style="display:inline-block; width:30px; height:30px; background:#ef4444; border-radius:50%;"></span><div><strong>P1</strong></div><div><span id="prioridadP1" style="font-size:1.5rem; font-weight:700;">0</span></div></div>
                    <div style="text-align:center;"><span style="display:inline-block; width:30px; height:30px; background:#f59e0b; border-radius:50%;"></span><div><strong>P2</strong></div><div><span id="prioridadP2" style="font-size:1.5rem; font-weight:700;">0</span></div></div>
                    <div style="text-align:center;"><span style="display:inline-block; width:30px; height:30px; background:#10b981; border-radius:50%;"></span><div><strong>P3</strong></div><div><span id="prioridadP3" style="font-size:1.5rem; font-weight:700;">0</span></div></div>
                </div>
            </div>
            <div class="stat-card">
                <h3>✅ GES vs NO GES</h3>
                <div style="display:flex; justify-content:space-around; margin-top:15px;">
                    <div style="text-align:center;"><span style="display:inline-block; width:30px; height:30px; background:#3b82f6; border-radius:50%;"></span><div><strong>GES SI</strong></div><div><span id="gesSi" style="font-size:1.5rem; font-weight:700;">0</span></div></div>
                    <div style="text-align:center;"><span style="display:inline-block; width:30px; height:30px; background:#94a3b8; border-radius:50%;"></span><div><strong>GES NO</strong></div><div><span id="gesNo" style="font-size:1.5rem; font-weight:700;">0</span></div></div>
                </div>
            </div>
        </div>

        <div class="charts-row">
            <div class="chart-card"><h3>Pacientes por Especialidad</h3><canvas id="especialidadChart"></canvas></div>
            <div class="chart-card"><h3>Pacientes por Estatus Tabla</h3><canvas id="estatusChart"></canvas></div>
        </div>

        <div class="chart-card" style="margin-bottom:25px;">
            <h3>📈 Ingresos por Mes (Fecha Indicación Qx)</h3>
            <canvas id="tendenciaChart" style="max-height:300px;"></canvas>
        </div>

        <h3 style="margin:30px 0 15px 0;">📊 Medianas de Espera por Especialidad</h3>
        <div class="table-container">
            <table id="medianasTable" class="cross-table">
                <thead><tr><th>Especialidad</th><th>Mediana Espera (días)</th><th>Mediana Espera Programación (días)</th><th>Total Pacientes</th></tr></thead>
                <tbody id="medianasTableBody"></tbody>
            </table>
        </div>

        <h3 style="margin:30px 0 15px 0;">📊 Pacientes por Especialidad vs Estatus</h3>
        <div class="table-container">
            <table id="crossTable" class="cross-table"><thead id="crossTableHead"></thead><tbody id="crossTableBody"></tbody></table>
        </div>

        <h3 style="margin:30px 0 15px 0;">⚠️ Pacientes con Mayor Tiempo de Espera</h3>
        <div class="table-container">
            <table id="topEsperaTable" class="cross-table">
                <thead><tr><th>Paciente</th><th>RUT</th><th>Especialidad</th><th>Días de Espera</th><th>Prioridad</th><th>Acción</th></tr></thead>
                <tbody id="topEsperaBody"></tbody>
            </table>
        </div>

        <h3 style="margin:30px 0 15px 0;">🆕 Últimos 5 Pacientes Registrados</h3>
        <div class="table-container">
            <table id="ultimosPacientesTable" class="cross-table">
                <thead><tr><th>Fecha Registro</th><th>Paciente</th><th>RUT</th><th>Especialidad</th><th>Estatus</th><th>Intervención</th></tr></thead>
                <tbody id="ultimosPacientesBody"></tbody>
            </table>
        </div>

        <h3 style="margin:30px 0 15px 0;">📞 Pacientes para Llamar (Fecha Programada)</h3>
        <div class="table-container">
            <table id="llamadosPendientesTable" class="cross-table">
                <thead><tr><th>Paciente</th><th>RUT</th><th>Teléfono</th><th>Especialidad</th><th>Fecha Programada</th><th>Días de Aviso</th><th>Última Observación</th><th>Acción</th></tr></thead>
                <tbody id="llamadosPendientesBody"></tbody>
            </table>
        </div>

        <h3 style="margin:30px 0 15px 0;">⏳ Pacientes que Superaron el Plazo de Espera (desde Fecha Estatus Programable)</h3>
        <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:center; margin-bottom:12px;">
            <div class="filter-group" style="min-width:240px;">
                <label>Filtrar por plazo superado</label>
                <select id="filtroPlazoEsperaDashboard" onchange="leFiltrarPlazoEsperaDashboard()">
                    <option value="todos">Todos (más de 6 meses)</option>
                    <option value="6meses">Solo entre 6 meses y 1 año</option>
                    <option value="1anio">Solo más de 1 año</option>
                </select>
            </div>
            <div id="plazoEsperaContador" style="font-weight:600; color:#1e40af;"></div>
        </div>
        <div class="table-container">
            <table id="plazoEsperaTable" class="cross-table">
                <thead><tr><th>Paciente</th><th>RUT</th><th>Especialidad</th><th>Fecha Estatus Programable</th><th>Tiempo Transcurrido</th><th>Acción</th></tr></thead>
                <tbody id="plazoEsperaBody"></tbody>
            </table>
        </div>
        <div id="plazoEsperaPaginacion" style="display:flex; justify-content:center; align-items:center; gap:12px; margin:15px 0;"></div>
    `;
}

function leInicializarSeccionDashboard(container) {
    container.innerHTML = leRenderDashboardHTML();
    leCargarEspecialidadesEnFiltroDashboard();
    updateDashboard();
    actualizarTablaLlamadosPendientes();
    actualizarTablaPlazoEsperaDashboard();
}

function updateDashboard() {
    let pacientesFiltrados = patients;
    if (dashboardFiltroEspecialidad) {
        pacientesFiltrados = patients.filter(p => p.especialidad === dashboardFiltroEspecialidad);
    }

    const pacientesGestionables = pacientesFiltrados.filter(esGestionable);

    const totalGestionables = pacientesGestionables.length;
    const totalEl = document.getElementById('totalPatients');
    if (totalEl) totalEl.textContent = totalGestionables;

    const tiemposEspera = pacientesGestionables.map(p => getDiasEspera(p, 'dashboard')).filter(t => t > 0);
    const medianaGeneral = calcularMediana(tiemposEspera);
    const medianaGeneralEl = document.getElementById('medianaEsperaGeneral');
    if (medianaGeneralEl) medianaGeneralEl.innerHTML = `${medianaGeneral} <span style="font-size:0.9rem;">días</span>`;

    const tiemposEsperaProgram = pacientesGestionables.map(p => calculateWaitingDays(p.fechaEstatusProgram)).filter(t => t > 0);
    const medianaProgramacion = calcularMediana(tiemposEsperaProgram);
    const medianaProgramacionEl = document.getElementById('medianaEsperaProgramacion');
    if (medianaProgramacionEl) medianaProgramacionEl.innerHTML = `${medianaProgramacion} <span style="font-size:0.9rem;">días</span>`;

    const estadisticas = calcularEstadisticasEspera(tiemposEspera, totalGestionables || 1);
    percentilesGlobales = { p25: estadisticas.p25.max, p50: estadisticas.p50.max, p75: estadisticas.p75.max, p90: estadisticas.p90.max };

    const setTexto = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    setTexto('percentil25Valor', `≤ ${estadisticas.p25.max} <span style="font-size:0.8rem;">días</span>`);
    setTexto('percentil25Conteo', `${estadisticas.p25.pacientes} pacientes`);
    setTexto('percentil50Valor', `${estadisticas.p50.min} - ${estadisticas.p50.max} <span style="font-size:0.8rem;">días</span>`);
    setTexto('percentil50Conteo', `${estadisticas.p50.pacientes} pacientes`);
    setTexto('percentil75Valor', `${estadisticas.p75.min} - ${estadisticas.p75.max} <span style="font-size:0.8rem;">días</span>`);
    setTexto('percentil75Conteo', `${estadisticas.p75.pacientes} pacientes`);
    setTexto('percentil90Valor', `${estadisticas.p90.min} - ${estadisticas.p90.max} <span style="font-size:0.8rem;">días</span>`);
    setTexto('percentil90Conteo', `${estadisticas.p90.pacientes} pacientes`);
    setTexto('percentilRestoValor', `≥ ${estadisticas.resto.min} <span style="font-size:0.8rem;">días</span>`);
    setTexto('percentilRestoConteo', `${estadisticas.resto.pacientes} pacientes`);

    const p1 = pacientesGestionables.filter(p => p.prioridad === 'P1').length;
    const p2 = pacientesGestionables.filter(p => p.prioridad === 'P2').length;
    const p3 = pacientesGestionables.filter(p => p.prioridad === 'P3').length;
    setTexto('prioridadP1', p1); setTexto('prioridadP2', p2); setTexto('prioridadP3', p3);

    const gesSi = pacientesGestionables.filter(p => p.ges === 'SI').length;
    const gesNo = pacientesGestionables.filter(p => p.ges === 'NO').length;
    setTexto('gesSi', gesSi); setTexto('gesNo', gesNo);

    const porEspecialidad = {};
    const porEstatus = {};
    pacientesGestionables.forEach(p => {
        const esp = p.especialidad || 'Sin Especialidad';
        const est = p.estatusTabla || 'Sin Estatus';
        porEspecialidad[esp] = (porEspecialidad[esp] || 0) + 1;
        porEstatus[est] = (porEstatus[est] || 0) + 1;
    });
    renderEspecialidadChart(porEspecialidad);
    renderEstatusChart(porEstatus);

    const crossData = {};
    const porEstatusCompleto = {};
    const porEspecialidadCompleto = {};
    pacientesFiltrados.forEach(p => {
        const esp = p.especialidad || 'Sin Especialidad';
        const est = p.estatusTabla || 'Sin Estatus';
        if (!crossData[esp]) crossData[esp] = {};
        crossData[esp][est] = (crossData[esp][est] || 0) + 1;
        porEstatusCompleto[est] = (porEstatusCompleto[est] || 0) + 1;
        porEspecialidadCompleto[esp] = (porEspecialidadCompleto[esp] || 0) + 1;
    });
    renderCrossTable(crossData, porEspecialidadCompleto, porEstatusCompleto);

    renderMedianasPorEspecialidad(pacientesGestionables);
    renderTopEspera(pacientesGestionables);
    renderUltimosPacientes(pacientesGestionables);
    renderTendenciaMensual(pacientesGestionables);
}

function renderEspecialidadChart(data) {
    const ctx = document.getElementById('especialidadChart');
    if (!ctx) return;
    if (especialidadChartInstance) especialidadChartInstance.destroy();
    especialidadChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: Object.keys(data), datasets: [{ label: 'Cantidad de Pacientes', data: Object.values(data), backgroundColor: '#3b82f6', borderColor: '#1e40af', borderWidth: 1 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

function renderEstatusChart(data) {
    const ctx = document.getElementById('estatusChart');
    if (!ctx) return;
    if (estatusChartInstance) estatusChartInstance.destroy();
    estatusChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Cantidad de Pacientes', data: Object.values(data),
                backgroundColor: ['#3b82f6', '#eab308', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#14b8a6'],
                borderColor: '#1e40af', borderWidth: 1, borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
}

function renderCrossTable(crossData, porEspecialidad, porEstatus) {
    const thead = document.getElementById('crossTableHead');
    const tbody = document.getElementById('crossTableBody');
    if (!thead || !tbody) return;

    let headerHTML = '<tr><th>Especialidad</th>';
    Object.keys(porEstatus).forEach(est => { headerHTML += `<th>${est}</th>`; });
    headerHTML += '<th><strong>Total</strong></th></tr>';
    thead.innerHTML = headerHTML;

    let bodyHTML = '';
    Object.keys(porEspecialidad).sort().forEach(esp => {
        let rowHTML = `<tr><td><strong>${esp}</strong></td>`;
        let totalEsp = 0;
        Object.keys(porEstatus).forEach(est => {
            const cantidad = (crossData[esp] && crossData[esp][est]) || 0;
            rowHTML += `<td>${cantidad}</td>`;
            totalEsp += cantidad;
        });
        rowHTML += `<td><strong>${totalEsp}</strong></td></tr>`;
        bodyHTML += rowHTML;
    });

    let totalRow = `<tr><td><strong>TOTAL</strong></td>`;
    let granTotal = 0;
    Object.keys(porEstatus).forEach(est => {
        const totalEstatus = porEstatus[est] || 0;
        totalRow += `<td><strong>${totalEstatus}</strong></td>`;
        granTotal += totalEstatus;
    });
    totalRow += `<td><strong>${granTotal}</strong></td></tr>`;
    tbody.innerHTML = bodyHTML + totalRow;
}

function renderMedianasPorEspecialidad(pacientesFiltrados) {
    const tbody = document.getElementById('medianasTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const especialidades = [...new Set(pacientesFiltrados.map(p => p.especialidad).filter(e => e))].sort();

    especialidades.forEach(esp => {
        const pacientesEsp = pacientesFiltrados.filter(p => p.especialidad === esp);
        const tiemposEsp = pacientesEsp.map(p => getDiasEspera(p, 'dashboard')).filter(t => t > 0);
        const tiemposProgramEsp = pacientesEsp.map(p => calculateWaitingDays(p.fechaEstatusProgram)).filter(t => t > 0);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${esp}</strong></td>
            <td>${calcularMediana(tiemposEsp)} días</td>
            <td>${calcularMediana(tiemposProgramEsp)} días</td>
            <td>${pacientesEsp.length}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderTopEspera(pacientesFiltrados) {
    const tbody = document.getElementById('topEsperaBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const top10 = [...pacientesFiltrados].sort((a, b) => getDiasEspera(b, 'dashboard') - getDiasEspera(a, 'dashboard')).slice(0, 10);

    top10.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.nombreApellido || '-'}</td>
            <td>${p.rut || '-'}</td>
            <td>${p.especialidad || '-'}</td>
            <td><strong style="color:#ef4444;">${getDiasEspera(p, 'dashboard')} días</strong></td>
            <td>${p.prioridad || '-'}</td>
            <td><button onclick="leShowPatientModal('${p.firebaseKey}')" class="btn-secondary" style="padding:4px 12px;">Ver</button></td>
        `;
        tbody.appendChild(row);
    });
}

function renderUltimosPacientes(pacientesFiltrados) {
    const tbody = document.getElementById('ultimosPacientesBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const ultimos5 = [...pacientesFiltrados].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 5);

    ultimos5.forEach(p => {
        const fechaRegistro = p.timestamp ? new Date(p.timestamp).toLocaleDateString('es-CL') : '-';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fechaRegistro}</td>
            <td>${p.nombreApellido || '-'}</td>
            <td>${p.rut || '-'}</td>
            <td>${p.especialidad || '-'}</td>
            <td>${p.estatusTabla || '-'}</td>
            <td>${p.intervencion || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderTendenciaMensual(pacientesFiltrados) {
    const ctx = document.getElementById('tendenciaChart');
    if (!ctx) return;
    if (tendenciaChartInstance) tendenciaChartInstance.destroy();

    const meses = {};
    pacientesFiltrados.forEach(p => {
        if (p.fechaIndQx) {
            const fecha = new Date(p.fechaIndQx);
            const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            meses[mesKey] = (meses[mesKey] || 0) + 1;
        }
    });

    const labels = Object.keys(meses).sort();
    const datos = labels.map(l => meses[l]);

    tendenciaChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Pacientes ingresados', data: datos, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#1e40af', pointBorderColor: '#fff', pointRadius: 5, pointHoverRadius: 7 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} pacientes` } } } }
    });
}

function leActualizarDashboardConFiltro() {
    const select = document.getElementById('dashboardFilterEspecialidad');
    dashboardFiltroEspecialidad = select.value;
    updateDashboard();
}

function leLimpiarFiltroDashboard() {
    const select = document.getElementById('dashboardFilterEspecialidad');
    if (select) select.value = '';
    dashboardFiltroEspecialidad = '';
    updateDashboard();
}

function leCargarEspecialidadesEnFiltroDashboard() {
    const select = document.getElementById('dashboardFilterEspecialidad');
    if (!select) return;
    const especialidades = [...new Set(patients.map(p => p.especialidad).filter(e => e))].sort();
    select.innerHTML = '<option value="">Todas las Especialidades</option>' +
        especialidades.map(esp => `<option value="${esp}">${esp}</option>`).join('');
}

function leCambiarFuenteDashboard(fuente) {
    fuentePercentilDashboard = fuente;
    const radioIndQx = document.querySelector('input[name="fuentePercentilDashboard"][value="fechaIndQx"]');
    const radioEstatus = document.querySelector('input[name="fuentePercentilDashboard"][value="fechaEstatusProgram"]');
    if (radioIndQx && radioEstatus) {
        radioIndQx.checked = (fuente === 'fechaIndQx');
        radioEstatus.checked = (fuente === 'fechaEstatusProgram');
    }
    updateDashboard();
}

// Widget "Pacientes para Llamar": pacientes con fechaProximoLlamado dentro
// de los próximos 10 días (o ya atrasados).
function actualizarTablaLlamadosPendientes() {
    const tbody = document.getElementById('llamadosPendientesBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(hoy.getDate() + 10);
    fechaLimite.setHours(0, 0, 0, 0);

    const pendientes = patients.filter(p => {
        if (!p.fechaProximoLlamado) return false;
        const fechaLlamado = new Date(p.fechaProximoLlamado);
        fechaLlamado.setHours(0, 0, 0, 0);
        return fechaLlamado <= fechaLimite;
    });

    pendientes.sort((a, b) => new Date(a.fechaProximoLlamado) - new Date(b.fechaProximoLlamado));

    if (pendientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay pacientes pendientes de llamado en los próximos 10 días</td></tr>';
        return;
    }

    pendientes.forEach(patient => {
        const fechaProgramada = new Date(patient.fechaProximoLlamado);
        const diasDiferencia = Math.ceil((fechaProgramada - hoy) / (1000 * 60 * 60 * 24));

        let estadoTexto, estadoColor, bgColor;
        if (diasDiferencia < 0) {
            estadoTexto = `${Math.abs(diasDiferencia)} días atrasado`; estadoColor = '#dc2626'; bgColor = '#fee2e2';
        } else if (diasDiferencia === 0) {
            estadoTexto = 'Hoy'; estadoColor = '#d97706'; bgColor = '#fef3c7';
        } else {
            estadoTexto = `En ${diasDiferencia} días`; estadoColor = '#059669'; bgColor = '#ecfdf5';
        }

        let ultimaObservacion = '-';
        if (patient.historialLlamadas) {
            const llamadasArray = Object.values(patient.historialLlamadas).sort((a, b) => new Date(b.fechaLlamada) - new Date(a.fechaLlamada));
            if (llamadasArray.length > 0 && llamadasArray[0].observaciones) {
                ultimaObservacion = llamadasArray[0].observaciones.substring(0, 50);
                if (llamadasArray[0].observaciones.length > 50) ultimaObservacion += '...';
            }
        }

        const tr = document.createElement('tr');
        // setProperty(...,'important') en vez de tr.style.backgroundColor:
        // por alguna regla de .cross-table que no se alcanza a ver bien de
        // forma estática, el color de fondo no estaba quedando visible —
        // forzarlo con !important garantiza que gane pase lo que pase.
        tr.style.setProperty('background-color', bgColor, 'important');
        tr.innerHTML = `
            <td><strong>${patient.nombreApellido || '-'}</strong></td>
            <td>${patient.rut || '-'}</td>
            <td>${patient.nContacto || '-'}</td>
            <td>${patient.especialidad || '-'}</td>
            <td><strong>${formatDate(patient.fechaProximoLlamado)}</strong></td>
            <td><strong style="color:${estadoColor};">${estadoTexto}</strong></td>
            <td><small>${ultimaObservacion}</small></td>
            <td><button onclick="abrirModalRegistroLlamada('${patient.firebaseKey}')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;">📞 Registrar Llamada</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// =============================================================
// ⏳ WIDGET "Pacientes que Superaron el Plazo de Espera" — pacientes
// gestionables cuya Fecha Estatus Programable pasó los 6 meses (ámbar) o
// el año (rojo), paginado de a 15. Ver botón reutiliza leShowPatientModal()
// (mismo modal que usa el 👁️ de Lista de Pacientes).
// =============================================================
const LE_DASHBOARD_PLAZO_6_MESES_DIAS = 182; // ~6 meses
const LE_DASHBOARD_PLAZO_1_ANIO_DIAS = 365;
const LE_DASHBOARD_PLAZO_POR_PAGINA = 15;

let dashboardPlazoEsperaFiltro = 'todos'; // 'todos' | '6meses' | '1anio'
let dashboardPlazoEsperaPagina = 0; // 0-indexado

function obtenerPacientesPlazoEsperaDashboard() {
    let lista = patients
        .filter(esGestionable)
        .filter(p => p.fechaEstatusProgram)
        .map(p => ({ ...p, _diasTranscurridos: calculateWaitingDays(p.fechaEstatusProgram) }))
        .filter(p => p._diasTranscurridos >= LE_DASHBOARD_PLAZO_6_MESES_DIAS);

    if (dashboardPlazoEsperaFiltro === '6meses') {
        lista = lista.filter(p => p._diasTranscurridos < LE_DASHBOARD_PLAZO_1_ANIO_DIAS);
    } else if (dashboardPlazoEsperaFiltro === '1anio') {
        lista = lista.filter(p => p._diasTranscurridos >= LE_DASHBOARD_PLAZO_1_ANIO_DIAS);
    }

    lista.sort((a, b) => b._diasTranscurridos - a._diasTranscurridos);
    return lista;
}

function actualizarTablaPlazoEsperaDashboard() {
    const tbody = document.getElementById('plazoEsperaBody');
    const contador = document.getElementById('plazoEsperaContador');
    const paginacion = document.getElementById('plazoEsperaPaginacion');
    if (!tbody) return;

    const lista = obtenerPacientesPlazoEsperaDashboard();

    if (contador) {
        contador.textContent = `${lista.length} paciente${lista.length === 1 ? '' : 's'} en total`;
    }

    const totalPaginas = Math.max(1, Math.ceil(lista.length / LE_DASHBOARD_PLAZO_POR_PAGINA));
    if (dashboardPlazoEsperaPagina >= totalPaginas) dashboardPlazoEsperaPagina = totalPaginas - 1;
    if (dashboardPlazoEsperaPagina < 0) dashboardPlazoEsperaPagina = 0;

    const inicio = dashboardPlazoEsperaPagina * LE_DASHBOARD_PLAZO_POR_PAGINA;
    const paginaActual = lista.slice(inicio, inicio + LE_DASHBOARD_PLAZO_POR_PAGINA);

    tbody.innerHTML = '';
    if (paginaActual.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay pacientes que hayan superado los 6 meses de espera</td></tr>';
    } else {
        paginaActual.forEach(p => {
            const esMasDeUnAnio = p._diasTranscurridos >= LE_DASHBOARD_PLAZO_1_ANIO_DIAS;
            const bgColor = esMasDeUnAnio ? '#fee2e2' : '#fef3c7';
            const textColor = esMasDeUnAnio ? '#dc2626' : '#b45309';
            const etiquetaTiempo = esMasDeUnAnio
                ? `${(p._diasTranscurridos / 365).toFixed(1)} años`
                : `${Math.floor(p._diasTranscurridos / 30.44)} meses`;

            const tr = document.createElement('tr');
            // setProperty(...,'important'): mismo motivo que en
            // actualizarTablaLlamadosPendientes() más arriba.
            tr.style.setProperty('background-color', bgColor, 'important');
            tr.innerHTML = `
                <td><strong>${p.nombreApellido || '-'}</strong></td>
                <td>${p.rut || '-'}</td>
                <td>${p.especialidad || '-'}</td>
                <td>${formatDate(p.fechaEstatusProgram)}</td>
                <td><strong style="color:${textColor};">${etiquetaTiempo} (${p._diasTranscurridos} días)</strong></td>
                <td><button onclick="leShowPatientModal('${p.firebaseKey}')" title="Ver" style="background:transparent; border:1px solid #3b82f6; border-radius:4px; padding:4px 10px; cursor:pointer; color:#3b82f6; font-size:0.9rem;">👁️ Ver</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    if (paginacion) {
        paginacion.innerHTML = `
            <button onclick="leCambiarPaginaPlazoEspera(-1)" class="btn-secondary" style="padding:6px 14px;" ${dashboardPlazoEsperaPagina === 0 ? 'disabled' : ''}>‹ Anterior</button>
            <span style="font-size:0.85rem; color:#475569;">Página ${dashboardPlazoEsperaPagina + 1} de ${totalPaginas}</span>
            <button onclick="leCambiarPaginaPlazoEspera(1)" class="btn-secondary" style="padding:6px 14px;" ${dashboardPlazoEsperaPagina >= totalPaginas - 1 ? 'disabled' : ''}>Siguiente ›</button>
        `;
    }
}

function leCambiarPaginaPlazoEspera(delta) {
    dashboardPlazoEsperaPagina += delta;
    actualizarTablaPlazoEsperaDashboard();
}

function leFiltrarPlazoEsperaDashboard() {
    const sel = document.getElementById('filtroPlazoEsperaDashboard');
    dashboardPlazoEsperaFiltro = sel ? sel.value : 'todos';
    dashboardPlazoEsperaPagina = 0;
    actualizarTablaPlazoEsperaDashboard();
}
