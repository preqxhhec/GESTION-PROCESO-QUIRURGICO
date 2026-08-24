// =============================================================
// 🤝 REUNIÓN DE TABLA
// No es una sección nueva: desde el menú hamburguesa abre un modal para
// elegir semanas (Tabla Quirúrgica) y rango de fechas (Estadísticas), y con
// eso genera UNA sola Presentación/PPT combinada. Reutiliza por completo la
// captura y el caché de js/19-tabla-presentacion-ppt.js (Tabla Quirúrgica) y
// js/18-estadisticas.js (Estadísticas) — acá solo se orquesta la selección
// previa y se combinan las láminas resultantes en una sola secuencia.
// =============================================================

let reunionTablaSemanasSeleccionadas = new Set();
let reunionTablaFechaInicio = '';
let reunionTablaFechaFin = '';

// -------------------------------------------------------------
// 🪟 MODAL: elegir semanas + rango de fechas
// -------------------------------------------------------------
function abrirModalReunionTabla() {
    document.getElementById('reunionTablaOverlay')?.remove();

    if (reunionTablaSemanasSeleccionadas.size === 0 && typeof currentWeek === 'number') {
        reunionTablaSemanasSeleccionadas.add(currentWeek);
    }
    if (!reunionTablaFechaInicio && !reunionTablaFechaFin && estadisticasFiltroFechaInicio) {
        reunionTablaFechaInicio = estadisticasFiltroFechaInicio;
        reunionTablaFechaFin = estadisticasFiltroFechaFin;
    }

    const overlay = document.createElement('div');
    overlay.id = 'reunionTablaOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width:520px; text-align:left;">
            <span class="modal-icon" style="text-align:center; display:block;">🤝</span>
            <div class="modal-title" style="text-align:center;">Reunión de Tabla</div>
            <div class="modal-message" style="text-align:center; margin-bottom:18px;">
                Genera una sola Presentación/PPT combinando Tabla Quirúrgica (semanas elegidas) y Estadísticas (rango de fechas elegido).
            </div>

            <div style="margin-bottom:16px;">
                <span style="font-size:0.8rem; font-weight:700; color:#0b2a4f; display:block; margin-bottom:6px;">📅 Semanas de Tabla Quirúrgica</span>
                <div id="reunionTablaSemanasLista" style="display:flex; flex-direction:column; gap:4px; max-height:160px; overflow-y:auto; border:1px solid #d1d9e6; border-radius:10px; padding:8px;"></div>
            </div>

            <div style="margin-bottom:22px;">
                <span style="font-size:0.8rem; font-weight:700; color:#0b2a4f; display:block; margin-bottom:6px;">📊 Rango de fechas de Estadísticas</span>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <input type="date" id="reunionTablaFechaInicio" value="${reunionTablaFechaInicio}" style="padding:6px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.85rem;">
                    <span style="font-size:0.8rem; color:#94a3b8;">a</span>
                    <input type="date" id="reunionTablaFechaFin" value="${reunionTablaFechaFin}" style="padding:6px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.85rem;">
                    <button id="reunionTablaLimpiarFecha" style="background:#e2e8f0; border:none; padding:6px 12px; border-radius:30px; font-size:0.7rem; font-weight:500; cursor:pointer; color:#475569;">🗑️ Limpiar</button>
                </div>
            </div>

            <div class="modal-actions">
                <button class="modal-btn modal-btn-cancel" id="reunionTablaCancelar">Cancelar</button>
                <button class="modal-btn" id="reunionTablaPresentar" style="background:#0b2a4f; color:white; box-shadow:0 4px 12px rgba(11,42,79,0.35);">🎥 Presentación</button>
                <button class="modal-btn" id="reunionTablaPpt" style="background:#c0392b; color:white; box-shadow:0 4px 12px rgba(192,57,43,0.35);">⬇️ Descargar PPT</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    renderReunionTablaSemanasLista();

    document.getElementById('reunionTablaFechaInicio').addEventListener('change', function() {
        reunionTablaFechaInicio = this.value || '';
    });
    document.getElementById('reunionTablaFechaFin').addEventListener('change', function() {
        reunionTablaFechaFin = this.value || '';
    });
    document.getElementById('reunionTablaLimpiarFecha').addEventListener('click', function() {
        reunionTablaFechaInicio = '';
        reunionTablaFechaFin = '';
        document.getElementById('reunionTablaFechaInicio').value = '';
        document.getElementById('reunionTablaFechaFin').value = '';
    });

    document.getElementById('reunionTablaCancelar').addEventListener('click', cerrarModalReunionTabla);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) cerrarModalReunionTabla();
    });

    document.getElementById('reunionTablaPresentar').addEventListener('click', function() {
        iniciarReunionTabla('presentacion');
    });
    document.getElementById('reunionTablaPpt').addEventListener('click', function() {
        iniciarReunionTabla('ppt');
    });
}

function renderReunionTablaSemanasLista() {
    const cont = document.getElementById('reunionTablaSemanasLista');
    if (!cont || typeof semanas === 'undefined') return;

    let html = `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:4px 2px; border-bottom:1px solid #e2e8f0; margin-bottom:4px; cursor:pointer; font-weight:600;">
        <input type="checkbox" id="reunionTablaChkTodas" ${reunionTablaSemanasSeleccionadas.size === semanas.length ? 'checked' : ''}> Todas
    </label>`;
    for (let i = 0; i < semanas.length; i++) {
        html += `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:3px 2px; cursor:pointer;">
            <input type="checkbox" class="reunionTablaChkSemana" data-semana="${i}" ${reunionTablaSemanasSeleccionadas.has(i) ? 'checked' : ''}> Semana ${i + 1}
        </label>`;
    }
    cont.innerHTML = html;

    document.getElementById('reunionTablaChkTodas').addEventListener('change', function() {
        reunionTablaSemanasSeleccionadas = this.checked ? new Set(semanas.map((_, i) => i)) : new Set();
        renderReunionTablaSemanasLista();
    });
    cont.querySelectorAll('.reunionTablaChkSemana').forEach(chk => {
        chk.addEventListener('change', function() {
            const idx = parseInt(this.dataset.semana, 10);
            if (this.checked) reunionTablaSemanasSeleccionadas.add(idx);
            else reunionTablaSemanasSeleccionadas.delete(idx);
            renderReunionTablaSemanasLista();
        });
    });
}

function cerrarModalReunionTabla() {
    document.getElementById('reunionTablaOverlay')?.remove();
}

// -------------------------------------------------------------
// 📸 GENERACIÓN: captura Tabla Quirúrgica + Estadísticas y arma UNA sola
// secuencia de láminas, en el mismo formato que usan mostrarDiapositiva*()
// y descargarPpt*() ya existentes.
// -------------------------------------------------------------
async function iniciarReunionTabla(modo) {
    if (reunionTablaSemanasSeleccionadas.size === 0) {
        showModal({
            title: '⚠️ Sin semanas seleccionadas',
            message: 'Selecciona al menos una semana de la Tabla Quirúrgica para generar la Reunión de Tabla.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
        return;
    }

    cerrarModalReunionTabla();

    document.getElementById('reunionTablaEsperaOverlay')?.remove();
    const overlayEspera = document.createElement('div');
    overlayEspera.id = 'reunionTablaEsperaOverlay';
    overlayEspera.style.cssText = 'position:fixed; inset:0; background:#0b2a4f; z-index:5500; display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; text-align:center; padding:20px; box-sizing:border-box;';
    overlayEspera.textContent = '⏳ Preparando Reunión de Tabla...';
    document.body.appendChild(overlayEspera);

    // --- Semanas de Tabla Quirúrgica: reusa tablaPresentacionSemanasSeleccionadas
    // y obtenerLaminasTablaSeleccionadas() (js/19), solo reemplazando
    // temporalmente qué semanas están "elegidas" mientras dura esta captura.
    const semanasOriginales = tablaPresentacionSemanasSeleccionadas;
    tablaPresentacionSemanasSeleccionadas = new Set(reunionTablaSemanasSeleccionadas);
    tablaPresentacionCache = {}; // fuerza a releer semanas/días actuales, igual que abrirPresentacionTabla()/descargarPptTabla()
    const laminasTabla = obtenerLaminasTablaSeleccionadas().map(l => ({ ...l, origen: 'tabla' }));

    // --- Estadísticas: reusa estadisticasResolverLaminas() y
    // capturarElementoComoImagen() (js/18), solo reemplazando temporalmente
    // el filtro de fecha general.
    if (!estadisticasRegistros || estadisticasRegistros.length === 0) {
        await cargarEstadisticas();
    }
    const fechaInicioOriginal = estadisticasFiltroFechaInicio;
    const fechaFinOriginal = estadisticasFiltroFechaFin;
    const displayEstadisticasOriginal = estadisticasContent.style.display;

    estadisticasFiltroFechaInicio = reunionTablaFechaInicio;
    estadisticasFiltroFechaFin = reunionTablaFechaFin;
    // html2canvas no puede fotografiar contenido con display:none, así que
    // la sección debe quedar visible mientras dura la captura (el overlay de
    // espera, arriba en z-index, la tapa por completo para el usuario).
    estadisticasContent.style.display = 'block';
    renderEstadisticas();

    const laminasEstadisticas = estadisticasResolverLaminas().map(l => ({ ...l, origen: 'estadisticas' }));
    const laminas = [...laminasTabla, ...laminasEstadisticas];

    function restaurarEstado() {
        tablaPresentacionSemanasSeleccionadas = semanasOriginales;
        estadisticasFiltroFechaInicio = fechaInicioOriginal;
        estadisticasFiltroFechaFin = fechaFinOriginal;
        estadisticasContent.style.display = displayEstadisticasOriginal;
        renderEstadisticas();
    }

    const capturas = [];
    try {
        for (let i = 0; i < laminas.length; i++) {
            overlayEspera.textContent = `⏳ Preparando Reunión de Tabla... (${i + 1}/${laminas.length})`;
            const l = laminas[i];
            const captura = l.origen === 'tabla'
                ? await capturarLaminaDiaTabla(l.semanaIdx, l.diaIdx)
                : await capturarElementoComoImagen(l.pagina, l.elementoId, { modoCaptura: laminaNecesitaModoCaptura(l), gridId: l.gridId, chunkIndex: l.chunkIndex });
            capturas.push({ titulo: l.titulo, dataUrl: captura.dataUrl, width: captura.width, height: captura.height });
        }
    } catch (error) {
        console.error('❌ Error al generar Reunión de Tabla:', error);
        restaurarEstado();
        overlayEspera.remove();
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al generar la Reunión de Tabla.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
        return;
    }

    restaurarEstado();
    overlayEspera.remove();

    if (modo === 'presentacion') {
        abrirPresentacionReunionTabla(capturas);
    } else {
        await descargarPptReunionTabla(capturas);
    }
}

// -------------------------------------------------------------
// 🎥 MODO PRESENTACIÓN (pantalla completa) — mismas láminas ya capturadas,
// misma UI que abrirPresentacionTabla()/abrirPresentacionEstadisticas().
// -------------------------------------------------------------
let reunionTablaPresentandoCapturas = [];
let reunionTablaPresentandoIndice = 0;
let reunionTablaManejadorTeclado = null;

function abrirPresentacionReunionTabla(capturas) {
    reunionTablaPresentandoCapturas = capturas;
    reunionTablaPresentandoIndice = 0;

    document.getElementById('reunionTablaPresentacionOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'reunionTablaPresentacionOverlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:#0b2a4f; z-index:5000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; box-sizing:border-box;';
    document.body.appendChild(overlay);

    reunionTablaManejadorTeclado = function(e) {
        if (e.key === 'Escape') cerrarPresentacionReunionTabla();
        else if (e.key === 'ArrowRight') cambiarDiapositivaReunionTabla(1);
        else if (e.key === 'ArrowLeft') cambiarDiapositivaReunionTabla(-1);
    };
    document.addEventListener('keydown', reunionTablaManejadorTeclado);

    renderDiapositivaReunionTabla();
}

async function renderDiapositivaReunionTabla() {
    const overlay = document.getElementById('reunionTablaPresentacionOverlay');
    if (!overlay) return;
    const lamina = reunionTablaPresentandoCapturas[reunionTablaPresentandoIndice];
    const logoDataUrl = await obtenerLogoDataUrl();
    if (!document.getElementById('reunionTablaPresentacionOverlay')) return;

    overlay.innerHTML = `
        <div style="width:100%; display:flex; justify-content:space-between; align-items:center; color:white; margin-bottom:12px; gap:12px;">
            <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                ${logoDataUrl ? `<img src="${logoDataUrl.dataUrl}" style="height:32px; width:auto; flex-shrink:0;">` : ''}
                <div style="font-weight:700; font-size:1rem;">🤝 ${lamina.titulo}</div>
            </div>
            <button id="reunionTablaPresentacionCerrar" style="background:transparent; border:1px solid white; color:white; padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.8rem; flex-shrink:0;">✕ Cerrar (Esc)</button>
        </div>
        <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            <img src="${lamina.dataUrl}" style="max-width:100%; max-height:100%; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.4);">
        </div>
        <div style="margin-top:16px; display:flex; align-items:center; gap:20px;">
            <button id="reunionTablaPresentacionAnterior" style="background:white; color:#0b2a4f; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.1rem; font-weight:700;">‹</button>
            <span style="color:white; font-size:0.85rem;">${reunionTablaPresentandoIndice + 1} / ${reunionTablaPresentandoCapturas.length}</span>
            <button id="reunionTablaPresentacionSiguiente" style="background:white; color:#0b2a4f; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.1rem; font-weight:700;">›</button>
        </div>
    `;

    overlay.querySelector('#reunionTablaPresentacionCerrar').addEventListener('click', cerrarPresentacionReunionTabla);
    overlay.querySelector('#reunionTablaPresentacionAnterior').addEventListener('click', () => cambiarDiapositivaReunionTabla(-1));
    overlay.querySelector('#reunionTablaPresentacionSiguiente').addEventListener('click', () => cambiarDiapositivaReunionTabla(1));
}

function cambiarDiapositivaReunionTabla(delta) {
    const nuevoIndice = reunionTablaPresentandoIndice + delta;
    if (nuevoIndice < 0 || nuevoIndice >= reunionTablaPresentandoCapturas.length) return;
    reunionTablaPresentandoIndice = nuevoIndice;
    renderDiapositivaReunionTabla();
}

function cerrarPresentacionReunionTabla() {
    document.getElementById('reunionTablaPresentacionOverlay')?.remove();
    if (reunionTablaManejadorTeclado) {
        document.removeEventListener('keydown', reunionTablaManejadorTeclado);
        reunionTablaManejadorTeclado = null;
    }
}

// -------------------------------------------------------------
// ⬇️ EXPORTAR A PPT — mismo armado de diapositivas que
// descargarPptTabla()/descargarPresentacionPpt(), en un solo archivo.
// -------------------------------------------------------------
async function descargarPptReunionTabla(capturas) {
    try {
        if (typeof PptxGenJS === 'undefined') throw new Error('PptxGenJS no está disponible');

        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'REUNION_TABLA', width: 13.33, height: 7.5 });
        pptx.layout = 'REUNION_TABLA';

        const logoDataUrl = await obtenerLogoDataUrl();

        for (const lamina of capturas) {
            const slide = pptx.addSlide();
            slide.addText(lamina.titulo, {
                x: 0.3, y: 0.15, w: 11.6, h: 0.5, fontSize: 20, bold: true, color: '0B2A4F'
            });
            if (logoDataUrl) {
                const cajaLogo = ajustarImagenAlaCaja(logoDataUrl.width, logoDataUrl.height, 12.33, 0.1, 0.7, 0.55);
                slide.addImage({ data: logoDataUrl.dataUrl, ...cajaLogo });
            }
            const cajaImagen = ajustarImagenAlaCaja(lamina.width, lamina.height, 0.3, 0.75, 12.7, 6.5);
            slide.addImage({ data: lamina.dataUrl, ...cajaImagen });
        }

        const fechaStr = new Date().toISOString().slice(0, 10);
        await pptx.writeFile({ fileName: `Reunion_Tabla_Hospital_Illapel_${fechaStr}.pptx` });

    } catch (error) {
        console.error('❌ Error al generar PPT de Reunión de Tabla:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al generar la presentación PPT.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}
