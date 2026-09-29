// =============================================================
// 🩺 LISTA DE ESPERA — MÓDULO 10: REPORTE DE ACTIVIDAD POR USUARIO
// =============================================================
// Tarjeta "📊 Reporte de Actividad por Usuario" en el Panel de
// Administración (js/09 -- toda esa sección ya está gateada a
// esSuperAdministrador() en cargarAdmin(), no hace falta repetir el
// chequeo acá).
//
// Recorre TODOS los patients/{key}/historial de Lista de Espera -- ya se
// le agrega una entrada a esa colección por cada acción real (Creación,
// Actualización, Registro de Llamada, Cargado a la Tabla, etc. -- ver
// js/24, js/27, js/31), con {fecha, usuario, accion, descripcion}. Filtra
// por usuario y rango de fechas, y agrupa por tipo de acción para armar
// el reporte -- sin necesidad de ningún dato nuevo en Firebase.
//
// ⚠️ Algunas acciones (ej. "Actualizado desde la Tabla") se disparan
// automáticamente cuando cambia una fila de la Tabla Quirúrgica vinculada
// -- el "usuario" que queda ahí es quien tenía la sesión abierta en ese
// momento, no necesariamente alguien que decidió hacer ese cambio a
// propósito. El reporte las muestra tal cual quedaron guardadas, sin
// intentar adivinar cuáles fueron intencionales.
// =============================================================

// Mapea el valor crudo de "accion" a una etiqueta + ícono más legibles.
// Cualquier "accion" que no esté acá cae en un grupo aparte ("📌 <texto
// crudo>"), así el reporte no se rompe ni queda incompleto si aparece un
// tipo de acción nuevo que no se agregó a esta lista.
const REPORTE_ACTIVIDAD_ETIQUETAS = {
    'Creación': '🆕 Ingresos nuevos',
    'Actualización': '✏️ Registros modificados',
    'Registro de Llamada': '📞 Llamados realizados',
    'Cargado a la Tabla': '📋 Cargados a la Tabla',
    'Actualizado desde la Tabla': '🔄 Actualizados desde la Tabla',
    'WhatsApp enviado': '💬 WhatsApp enviados',
    'Corrección manual de estatus': '🛠️ Correcciones manuales de estatus'
};

let reporteActividadResultado = null; // último resultado generado, para expandir/colapsar sin recalcular

async function cargarReporteActividadUsuarios() {
    const contenedor = document.getElementById('reporteActividadLista');
    if (!contenedor) return;

    contenedor.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">Cargando usuarios...</p>`;

    try {
        const snap = await database.ref('usuarios').once('value');
        const data = snap.val() || {};
        const listaUsuarios = Object.keys(data)
            .map(uid => ({ uid, email: data[uid].email || uid }))
            .sort((a, b) => a.email.localeCompare(b.email));

        const hoy = new Date().toISOString().slice(0, 10);

        contenedor.innerHTML = `
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; margin-bottom:10px;">
                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#475569; display:block; margin-bottom:4px;">Usuario</label>
                    <select id="reporteActUsuario" style="padding:7px 10px; border:1px solid #d1d9e6; border-radius:8px; font-size:0.82rem; min-width:220px;">
                        ${listaUsuarios.map(u => `<option value="${escaparHtml(u.email)}">${escaparHtml(u.email)}</option>`).join('') || '<option value="">Sin usuarios</option>'}
                    </select>
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#475569; display:block; margin-bottom:4px;">Desde</label>
                    <input type="date" id="reporteActDesde" value="${hoy}" style="padding:6px 9px; border:1px solid #d1d9e6; border-radius:8px; font-size:0.82rem;">
                </div>
                <div>
                    <label style="font-size:0.75rem; font-weight:600; color:#475569; display:block; margin-bottom:4px;">Hasta</label>
                    <input type="date" id="reporteActHasta" value="${hoy}" style="padding:6px 9px; border:1px solid #d1d9e6; border-radius:8px; font-size:0.82rem;">
                </div>
                <button id="reporteActBtnGenerar" style="background:#1e40af; color:white; border:none; padding:8px 18px; border-radius:20px; font-size:0.82rem; font-weight:600; cursor:pointer;">📊 Generar Reporte</button>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:14px;">
                <button class="reporteAct-btn-rango" data-rango="hoy" style="background:#f1f5f9; border:1px solid #d1d9e6; padding:5px 12px; border-radius:16px; font-size:0.75rem; cursor:pointer;">Hoy</button>
                <button class="reporteAct-btn-rango" data-rango="semana" style="background:#f1f5f9; border:1px solid #d1d9e6; padding:5px 12px; border-radius:16px; font-size:0.75rem; cursor:pointer;">Esta Semana</button>
                <button class="reporteAct-btn-rango" data-rango="mes" style="background:#f1f5f9; border:1px solid #d1d9e6; padding:5px 12px; border-radius:16px; font-size:0.75rem; cursor:pointer;">Este Mes</button>
            </div>
            <div id="reporteActResultado"></div>
        `;

        contenedor.querySelectorAll('.reporteAct-btn-rango').forEach(btn => {
            btn.addEventListener('click', () => reporteActividadAplicarRango(btn.dataset.rango, btn));
        });
        document.getElementById('reporteActBtnGenerar')?.addEventListener('click', reporteActividadGenerar);
        // Si ya se generó un reporte (botón rápido activo o resultado visible),
        // cambiar de usuario debe reflejarse al instante -- si no, el botón
        // rápido queda marcado como activo pero mostrando datos del usuario
        // anterior hasta volver a presionarlo.
        document.getElementById('reporteActUsuario')?.addEventListener('change', () => {
            if (reporteActividadResultado) reporteActividadGenerar();
        });
    } catch (error) {
        console.error('❌ Error al cargar usuarios para el reporte de actividad:', error);
        contenedor.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">❌ Error al cargar.</p>`;
    }
}

// "Esta Semana" = lunes de esta semana hasta hoy. "Este Mes" = día 1 del
// mes actual hasta hoy -- ambos como "lo que va corrido", no la semana/mes
// completo (que incluiría días futuros sin datos).
//
// Además de llenar las fechas, resalta el botón presionado y dispara el
// reporte de inmediato -- si solo se llenaban las fechas en silencio, el
// clic no daba ninguna señal visible de que había hecho algo.
function reporteActividadAplicarRango(rango, btnElement) {
    const hoy = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let desde;
    if (rango === 'hoy') {
        desde = new Date(hoy);
    } else if (rango === 'semana') {
        desde = new Date(hoy);
        const diaSemana = desde.getDay(); // 0=domingo
        const offset = diaSemana === 0 ? 6 : diaSemana - 1; // lunes = inicio de semana
        desde.setDate(desde.getDate() - offset);
    } else {
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }
    const desdeInput = document.getElementById('reporteActDesde');
    const hastaInput = document.getElementById('reporteActHasta');
    if (desdeInput) desdeInput.value = fmt(desde);
    if (hastaInput) hastaInput.value = fmt(hoy);

    document.querySelectorAll('.reporteAct-btn-rango').forEach(b => {
        b.style.background = '#f1f5f9';
        b.style.color = '#334155';
        b.style.fontWeight = 'normal';
    });
    if (btnElement) {
        btnElement.style.background = '#1e40af';
        btnElement.style.color = 'white';
        btnElement.style.fontWeight = '600';
    }

    reporteActividadGenerar();
}

async function reporteActividadGenerar() {
    const email = document.getElementById('reporteActUsuario')?.value || '';
    const desde = document.getElementById('reporteActDesde')?.value || '';
    const hasta = document.getElementById('reporteActHasta')?.value || '';
    const resultado = document.getElementById('reporteActResultado');
    if (!resultado) return;

    if (!email) {
        showModal({ title: '⚠️ Falta usuario', message: 'Elige un usuario para generar el reporte.', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }
    if (!desde || !hasta || desde > hasta) {
        showModal({ title: '⚠️ Rango inválido', message: 'Revisa las fechas "Desde" y "Hasta".', icon: '⚠️', confirmText: 'Aceptar' });
        return;
    }

    resultado.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:16px;">⏳ Generando reporte...</p>`;

    try {
        const snap = await database.ref('patients').once('value');
        const patientsData = snap.val() || {};

        // "hasta" incluye TODO ese día (hasta las 23:59:59), no solo su
        // medianoche -- si no, un registro de "hoy a las 14:00" quedaría
        // afuera de un reporte con Hasta=hoy.
        const desdeMs = new Date(desde + 'T00:00:00').getTime();
        const hastaMs = new Date(hasta + 'T23:59:59.999').getTime();

        const entradas = [];
        Object.keys(patientsData).forEach(key => {
            const p = patientsData[key];
            if (!p.historial) return;
            Object.values(p.historial).forEach(h => {
                if ((h.usuario || '') !== email) return;
                const fechaMs = new Date(h.fecha).getTime();
                if (isNaN(fechaMs) || fechaMs < desdeMs || fechaMs > hastaMs) return;
                entradas.push({
                    fecha: h.fecha,
                    accion: h.accion || '(sin acción)',
                    descripcion: h.descripcion || '',
                    pacienteNombre: p.nombreApellido || '',
                    pacienteRut: p.rut || ''
                });
            });
        });

        entradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        reporteActividadResultado = { email, desde, hasta, entradas };
        reporteActividadRenderResultado();
    } catch (error) {
        console.error('❌ Error al generar el reporte de actividad:', error);
        resultado.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">❌ Error al generar el reporte.</p>`;
    }
}

function reporteActividadRenderResultado() {
    const resultado = document.getElementById('reporteActResultado');
    if (!resultado || !reporteActividadResultado) return;

    const { email, desde, hasta, entradas } = reporteActividadResultado;

    if (entradas.length === 0) {
        resultado.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:16px;">Sin interacciones de <strong>${escaparHtml(email)}</strong> entre ${formatDate(desde)} y ${formatDate(hasta)}.</p>`;
        return;
    }

    const grupos = {};
    entradas.forEach(e => {
        if (!grupos[e.accion]) grupos[e.accion] = [];
        grupos[e.accion].push(e);
    });
    const clavesOrdenadas = Object.keys(grupos).sort((a, b) => grupos[b].length - grupos[a].length);

    let html = `
        <div style="background:#eff6ff; border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:0.85rem;">
            <strong>${escaparHtml(email)}</strong> — ${formatDate(desde)} a ${formatDate(hasta)} — <strong>${entradas.length}</strong> interacción(es) en total
        </div>
    `;

    clavesOrdenadas.forEach((accion, idx) => {
        const lista = grupos[accion];
        const etiqueta = REPORTE_ACTIVIDAD_ETIQUETAS[accion] || `📌 ${escaparHtml(accion)}`;
        const idDetalle = `reporteActDetalle${idx}`;
        html += `
            <div style="border:1px solid #e2e8f0; border-radius:8px; margin-bottom:8px; overflow:hidden;">
                <div class="reporteAct-toggle" data-target="${idDetalle}" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; cursor:pointer; background:#fafcff;">
                    <span style="font-weight:600; font-size:0.85rem;">${etiqueta}</span>
                    <span style="font-size:0.8rem; color:#64748b;">${lista.length} ▾</span>
                </div>
                <div id="${idDetalle}" style="display:none; border-top:1px solid #e2e8f0; padding:8px 14px;">
                    ${lista.map(e => `
                        <div style="padding:6px 0; border-bottom:1px dashed #f1f5f9; font-size:0.8rem;">
                            <div style="color:#94a3b8; font-size:0.72rem;">${new Date(e.fecha).toLocaleString('es-CL')}</div>
                            <div><strong>${escaparHtml(e.pacienteNombre)}</strong>${e.pacienteRut ? ' — ' + escaparHtml(e.pacienteRut) : ''}</div>
                            <div style="color:#475569;">${e.descripcion}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    resultado.innerHTML = html;

    resultado.querySelectorAll('.reporteAct-toggle').forEach(el => {
        el.addEventListener('click', () => {
            const target = document.getElementById(el.dataset.target);
            if (!target) return;
            target.style.display = target.style.display === 'none' ? 'block' : 'none';
        });
    });
}
