// =============================================================
// 🖨️ TABLA QUIRÚRGICA · PRESENTACIÓN Y EXPORTAR A PPT (una lámina por día)
// Reutiliza obtenerLogoDataUrl() / ajustarImagenAlaCaja() definidas en
// js/18-estadisticas.js. Misma lógica que Estadísticas (captura con
// html2canvas + PptxGenJS), pero acá cada lámina se construye desde cero
// como una tabla limpia (no se fotografía el formulario editable), con las
// mismas columnas que imprimirDia() (js/08-acciones-fila-paciente.js) menos
// la columna FICHA.
// =============================================================

const NOMBRES_DIAS_LARGOS_TABLA = {
    LUN: 'Lunes', MAR: 'Martes', MIE: 'Miércoles', JUE: 'Jueves',
    VIE: 'Viernes', SAB: 'Sábado', DOM: 'Domingo'
};

let tablaPresentacionSemanasSeleccionadas = new Set();
let tablaPresentacionCache = {};
let tablaPresentacionIndice = 0;
let tablaPresentacionManejadorTeclado = null;
let tablaPresentacionSolicitudId = 0;
let tablaPresentacionColaCapturas = Promise.resolve();

function tablaPresentacionEncolar(tarea) {
    const resultado = tablaPresentacionColaCapturas.then(tarea, tarea);
    tablaPresentacionColaCapturas = resultado.catch(() => {});
    return resultado;
}

function filaTieneDatosParaPresentacion(fila) {
    const campos = ['FECHA', 'Especialidad', 'Nombre_Paciente', 'RUT', 'Edad', 'FICHA', 'Diagnostico', 'Intervencion_propuesta', 'Condicion_LE'];
    return campos.some(campo => {
        const val = fila[campo] || '';
        return val !== '' && val !== 'Seleccione';
    });
}

// -------------------------------------------------------------
// 🧰 TOOLBAR — inyectada dentro de renderWeekView() (js/14-render-principal.js)
// -------------------------------------------------------------
function renderToolbarPresentacionTabla() {
    // 🔘 Permiso "registro_presentacionPpt" — sin él, no tiene sentido
    // mostrar tampoco el selector de semanas (solo sirve para elegir qué
    // incluye la Presentación/PPT).
    if (!usuarioTieneAccesoSeccion('registro_presentacionPpt')) return '';

    if (tablaPresentacionSemanasSeleccionadas.size === 0 && typeof currentWeek === 'number') {
        tablaPresentacionSemanasSeleccionadas.add(currentWeek);
    }
    return `
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:2px 0 14px 0;">
            <div style="position:relative;">
                <button id="btnElegirSemanasTabla" type="button" style="background:#f1f5f9; border:1px solid #d1d9e6; padding:7px 14px; border-radius:20px; font-size:0.8rem; cursor:pointer; font-weight:600; color:#334155;">
                    📅 Semanas (${tablaPresentacionSemanasSeleccionadas.size}) ▾
                </button>
                <div id="panelElegirSemanasTabla" style="display:none; position:absolute; top:110%; left:0; z-index:200; background:white; border:1px solid #d1d9e6; border-radius:10px; padding:10px; box-shadow:0 8px 24px rgba(0,0,0,0.18); min-width:170px; max-height:260px; overflow-y:auto;"></div>
            </div>
            <button id="btnPresentacionTabla" type="button" style="background:#0b2a4f; color:white; border:none; padding:7px 16px; border-radius:20px; font-size:0.8rem; cursor:pointer; font-weight:600;">🎥 Presentación</button>
            <button id="btnDescargarPptTabla" type="button" style="background:#c0392b; color:white; border:none; padding:7px 16px; border-radius:20px; font-size:0.8rem; cursor:pointer; font-weight:600;">⬇️ Descargar PPT</button>
            <button id="btnDescargarImagenesTabla" type="button" style="background:#7c3aed; color:white; border:none; padding:7px 16px; border-radius:20px; font-size:0.8rem; cursor:pointer; font-weight:600;">🖼️ Descargar Imágenes</button>
        </div>
    `;
}

function renderPanelElegirSemanasTabla() {
    const panel = document.getElementById('panelElegirSemanasTabla');
    if (!panel) return;

    let html = `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:4px 2px; border-bottom:1px solid #e2e8f0; margin-bottom:6px; cursor:pointer; font-weight:600;">
        <input type="checkbox" id="chkTodasSemanasTabla" ${tablaPresentacionSemanasSeleccionadas.size === semanas.length ? 'checked' : ''}> Todas
    </label>`;
    for (let i = 0; i < semanas.length; i++) {
        html += `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:4px 2px; cursor:pointer;">
            <input type="checkbox" class="chk-semana-tabla" data-semana="${i}" ${tablaPresentacionSemanasSeleccionadas.has(i) ? 'checked' : ''}> Semana ${i + 1}
        </label>`;
    }
    panel.innerHTML = html;

    document.getElementById('chkTodasSemanasTabla')?.addEventListener('change', function() {
        tablaPresentacionSemanasSeleccionadas = this.checked ? new Set(semanas.map((_, i) => i)) : new Set();
        renderPanelElegirSemanasTabla();
        actualizarLabelBotonSemanasTabla();
    });

    panel.querySelectorAll('.chk-semana-tabla').forEach(chk => {
        chk.addEventListener('change', function() {
            const idx = parseInt(this.dataset.semana, 10);
            if (this.checked) tablaPresentacionSemanasSeleccionadas.add(idx);
            else tablaPresentacionSemanasSeleccionadas.delete(idx);
            renderPanelElegirSemanasTabla();
            actualizarLabelBotonSemanasTabla();
        });
    });
}

function actualizarLabelBotonSemanasTabla() {
    const btn = document.getElementById('btnElegirSemanasTabla');
    if (btn) btn.textContent = `📅 Semanas (${tablaPresentacionSemanasSeleccionadas.size}) ▾`;
}

function tablaPresentacionCerrarPanelSiEsFueraDelClick(e) {
    const panel = document.getElementById('panelElegirSemanasTabla');
    const btn = document.getElementById('btnElegirSemanasTabla');
    if (!panel || panel.style.display === 'none') return;
    if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
    panel.style.display = 'none';
}
document.addEventListener('click', tablaPresentacionCerrarPanelSiEsFueraDelClick);

function inicializarToolbarPresentacionTabla() {
    document.getElementById('btnElegirSemanasTabla')?.addEventListener('click', function(e) {
        e.stopPropagation();
        const panel = document.getElementById('panelElegirSemanasTabla');
        if (!panel) return;
        const abrir = panel.style.display === 'none';
        panel.style.display = abrir ? 'block' : 'none';
        if (abrir) renderPanelElegirSemanasTabla();
    });

    document.getElementById('btnPresentacionTabla')?.addEventListener('click', abrirPresentacionTabla);
    document.getElementById('btnDescargarPptTabla')?.addEventListener('click', descargarPptTabla);
    document.getElementById('btnDescargarImagenesTabla')?.addEventListener('click', descargarImagenesTabla);
}

// -------------------------------------------------------------
// 📑 LÁMINAS: una por cada día de cada semana seleccionada
// -------------------------------------------------------------
function obtenerLaminasTablaSeleccionadas() {
    const semanasOrdenadas = Array.from(tablaPresentacionSemanasSeleccionadas).sort((a, b) => a - b);
    const laminas = [];
    semanasOrdenadas.forEach(semanaIdx => {
        if (!semanas[semanaIdx]) return;
        DIAS.forEach((dia, diaIdx) => {
            laminas.push({
                semanaIdx, diaIdx,
                titulo: `${NOMBRES_DIAS_LARGOS_TABLA[dia] || dia} · Semana ${semanaIdx + 1}`
            });
        });
    });
    return laminas;
}

function construirHtmlLaminaDiaTabla(semanaIdx, diaIdx, logoDataUrl) {
    const dayData = semanas[semanaIdx][diaIdx];
    const dia = DIAS[diaIdx];
    const nombreDia = NOMBRES_DIAS_LARGOS_TABLA[dia] || dia;

    const headers = ['#', 'FECHA', 'Especialidad', 'Nombre Paciente', 'RUT', 'Edad', 'Diagnóstico', 'Intervención Propuesta', 'Condición LE'];
    const anchos = [3, 7, 11, 16, 9, 5, 18, 20, 11];

    function construirTabla(pab) {
        const rows = ((dayData && dayData.pabs && dayData.pabs[pab]) || []).filter(filaTieneDatosParaPresentacion);
        let html = `<div style="font-size:1.05rem; font-weight:700; color:#0b2a4f; margin:14px 0 8px 0; padding:6px 14px; background:#e8f4fd; border-radius:6px; display:inline-block;">🏥 ${pab}</div>`;
        html += `<table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px; table-layout:fixed;"><thead><tr>`;
        headers.forEach((h, i) => {
            html += `<th style="background:#1e293b; color:white; padding:7px 5px; text-align:center; font-weight:600; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.3px; border:1px solid #1e293b; width:${anchos[i]}%;">${h}</th>`;
        });
        html += `</tr></thead><tbody>`;
        if (rows.length === 0) {
            html += `<tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8; font-style:italic; border:1px solid #d1d9e6;">No hay registros en este pabellón</td></tr>`;
        } else {
            rows.forEach((fila, idx) => {
                const fondo = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
                html += `<tr>
                    <td style="padding:5px; border:1px solid #d1d9e6; text-align:center; background:${fondo};">${idx + 1}</td>
                    <td style="padding:5px; border:1px solid #d1d9e6; text-align:center; background:${fondo};">${fila.FECHA || ''}</td>
                    <td style="padding:5px; border:1px solid #d1d9e6; text-align:center; background:${fondo};">${fila.Especialidad || ''}</td>
                    <td style="padding:5px; border:1px solid #d1d9e6; text-align:center; background:${fondo}; font-weight:700;">${fila.Nombre_Paciente || ''}</td>
                    <td style="padding:5px; border:1px solid #d1d9e6; text-align:center; background:${fondo};">${fila.RUT || ''}</td>
                    <td style="padding:5px; border:1px solid #d1d9e6; text-align:center; background:${fondo};">${fila.Edad || ''}</td>
                    <td style="padding:5px; border:1px solid #d1d9e6; text-align:center; background:${fondo};">${fila.Diagnostico || ''}</td>
                    <td style="padding:5px; border:1px solid #d1d9e6; text-align:center; background:${fondo};">${fila.Intervencion_propuesta || ''}</td>
                    <td style="padding:5px; border:1px solid #d1d9e6; text-align:center; background:${fondo};">${fila.Condicion_LE || ''}</td>
                </tr>`;
            });
        }
        html += `</tbody></table>`;
        return html;
    }

    return `
        <div style="width:1500px; background:#ffffff; font-family:'Segoe UI', Arial, sans-serif; color:#1e293b; padding:24px; box-sizing:border-box;">
            <div style="display:flex; align-items:center; gap:16px; padding:14px 18px; background:linear-gradient(135deg, #0b2a4f 0%, #1a6d8a 100%); border-radius:10px; margin-bottom:18px; color:white;">
                ${logoDataUrl ? `<img src="${logoDataUrl.dataUrl}" style="height:56px; width:auto; background:rgba(255,255,255,0.9); padding:4px; border-radius:6px;">` : ''}
                <div>
                    <div style="font-size:1.3rem; font-weight:700;">📋 Tabla Quirúrgica · Registro</div>
                    <div style="font-size:0.85rem; opacity:0.85;">Hospital Dr. Humberto Elorza Cortés · Illapel, Chile</div>
                    <div style="font-size:0.95rem; font-weight:600; margin-top:4px;">${nombreDia} · Semana ${semanaIdx + 1}</div>
                </div>
            </div>
            ${PABS.map(pab => construirTabla(pab)).join('')}
        </div>
    `;
}

async function capturarLaminaDiaTabla(semanaIdx, diaIdx) {
    const clave = `sem${semanaIdx}_dia${diaIdx}`;
    if (tablaPresentacionCache[clave]) return tablaPresentacionCache[clave];

    if (typeof html2canvas === 'undefined') throw new Error('html2canvas no está disponible');

    return tablaPresentacionEncolar(async () => {
        if (tablaPresentacionCache[clave]) return tablaPresentacionCache[clave];

        const logoDataUrl = await obtenerLogoDataUrl();

        const contenedor = document.createElement('div');
        contenedor.style.cssText = 'position:fixed; left:-99999px; top:0; z-index:-1;';
        contenedor.innerHTML = construirHtmlLaminaDiaTabla(semanaIdx, diaIdx, logoDataUrl);
        document.body.appendChild(contenedor);

        await new Promise(resolve => setTimeout(resolve, 30));

        let captura;
        try {
            const canvas = await html2canvas(contenedor.firstElementChild, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
            captura = { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
        } finally {
            document.body.removeChild(contenedor);
        }

        tablaPresentacionCache[clave] = captura;
        return captura;
    });
}

// -------------------------------------------------------------
// 🎥 MODO PRESENTACIÓN (pantalla completa)
// -------------------------------------------------------------
function abrirPresentacionTabla() {
    const laminas = obtenerLaminasTablaSeleccionadas();
    if (laminas.length === 0) {
        showModal({
            title: '⚠️ Sin semanas seleccionadas',
            message: 'Selecciona al menos una semana para generar la presentación.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
        return;
    }

    document.getElementById('tablaPresentacionOverlay')?.remove();
    tablaPresentacionCache = {};

    const overlay = document.createElement('div');
    overlay.id = 'tablaPresentacionOverlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:#0b2a4f; z-index:5000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; box-sizing:border-box;';
    document.body.appendChild(overlay);

    tablaPresentacionManejadorTeclado = function(e) {
        if (e.key === 'Escape') cerrarPresentacionTabla();
        else if (e.key === 'ArrowRight') cambiarDiapositivaPresentacionTabla(1);
        else if (e.key === 'ArrowLeft') cambiarDiapositivaPresentacionTabla(-1);
    };
    document.addEventListener('keydown', tablaPresentacionManejadorTeclado);

    mostrarDiapositivaPresentacionTabla(0, laminas);
}

async function mostrarDiapositivaPresentacionTabla(indice, laminas) {
    const overlay = document.getElementById('tablaPresentacionOverlay');
    if (!overlay) return;
    laminas = laminas || obtenerLaminasTablaSeleccionadas();
    tablaPresentacionIndice = Math.max(0, Math.min(indice, laminas.length - 1));
    const lamina = laminas[tablaPresentacionIndice];

    const solicitudId = ++tablaPresentacionSolicitudId;

    overlay.innerHTML = `<div style="color:white; text-align:center; font-size:1.1rem;">⏳ Generando diapositiva...</div>`;

    let captura;
    try {
        captura = await capturarLaminaDiaTabla(lamina.semanaIdx, lamina.diaIdx);
    } catch (error) {
        console.error('❌ Error al generar diapositiva:', error);
        if (solicitudId !== tablaPresentacionSolicitudId) return;
        overlay.innerHTML = `<div style="color:white; text-align:center;">❌ No se pudo generar la diapositiva.<br><button id="tablaPresentacionCerrarError" style="margin-top:12px; background:white; color:#0b2a4f; border:none; padding:8px 18px; border-radius:20px; cursor:pointer;">Cerrar</button></div>`;
        overlay.querySelector('#tablaPresentacionCerrarError')?.addEventListener('click', cerrarPresentacionTabla);
        return;
    }

    if (solicitudId !== tablaPresentacionSolicitudId) return;
    if (!document.getElementById('tablaPresentacionOverlay')) return;

    overlay.innerHTML = `
        <div style="width:100%; display:flex; justify-content:space-between; align-items:center; color:white; margin-bottom:12px; gap:12px;">
            <div style="font-weight:700; font-size:1rem;">${lamina.titulo}</div>
            <button id="tablaPresentacionCerrar" style="background:transparent; border:1px solid white; color:white; padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.8rem; flex-shrink:0;">✕ Cerrar (Esc)</button>
        </div>
        <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            <img src="${captura.dataUrl}" style="max-width:100%; max-height:100%; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.4);">
        </div>
        <div style="margin-top:16px; display:flex; align-items:center; gap:20px;">
            <button id="tablaPresentacionAnterior" style="background:white; color:#0b2a4f; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.1rem; font-weight:700;">‹</button>
            <span style="color:white; font-size:0.85rem;">${tablaPresentacionIndice + 1} / ${laminas.length}</span>
            <button id="tablaPresentacionSiguiente" style="background:white; color:#0b2a4f; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.1rem; font-weight:700;">›</button>
        </div>
    `;

    overlay.style.flexDirection = 'column';
    overlay.querySelector('#tablaPresentacionCerrar').addEventListener('click', cerrarPresentacionTabla);
    overlay.querySelector('#tablaPresentacionAnterior').addEventListener('click', () => cambiarDiapositivaPresentacionTabla(-1));
    overlay.querySelector('#tablaPresentacionSiguiente').addEventListener('click', () => cambiarDiapositivaPresentacionTabla(1));
}

function cambiarDiapositivaPresentacionTabla(delta) {
    const laminas = obtenerLaminasTablaSeleccionadas();
    const nuevoIndice = tablaPresentacionIndice + delta;
    if (nuevoIndice < 0 || nuevoIndice >= laminas.length) return;
    mostrarDiapositivaPresentacionTabla(nuevoIndice, laminas);
}

function cerrarPresentacionTabla() {
    document.getElementById('tablaPresentacionOverlay')?.remove();
    if (tablaPresentacionManejadorTeclado) {
        document.removeEventListener('keydown', tablaPresentacionManejadorTeclado);
        tablaPresentacionManejadorTeclado = null;
    }
}

// -------------------------------------------------------------
// ⬇️ EXPORTAR A PPT
// -------------------------------------------------------------
async function descargarPptTabla() {
    const laminas = obtenerLaminasTablaSeleccionadas();
    if (laminas.length === 0) {
        showModal({
            title: '⚠️ Sin semanas seleccionadas',
            message: 'Selecciona al menos una semana para generar el PPT.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
        return;
    }

    const boton = document.getElementById('btnDescargarPptTabla');
    if (boton) {
        boton.disabled = true;
        boton.textContent = '⏳ Generando...';
    }

    tablaPresentacionCache = {};

    try {
        if (typeof PptxGenJS === 'undefined') throw new Error('PptxGenJS no está disponible');

        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'TABLA_QX', width: 13.33, height: 7.5 });
        pptx.layout = 'TABLA_QX';

        const logoDataUrl = await obtenerLogoDataUrl();

        for (const lamina of laminas) {
            const captura = await capturarLaminaDiaTabla(lamina.semanaIdx, lamina.diaIdx);

            const slide = pptx.addSlide();
            slide.addText(lamina.titulo, {
                x: 0.3, y: 0.15, w: 11.6, h: 0.5, fontSize: 20, bold: true, color: '0B2A4F'
            });
            if (logoDataUrl) {
                const cajaLogo = ajustarImagenAlaCaja(logoDataUrl.width, logoDataUrl.height, 12.33, 0.1, 0.7, 0.55);
                slide.addImage({ data: logoDataUrl.dataUrl, ...cajaLogo });
            }
            const cajaImagen = ajustarImagenAlaCaja(captura.width, captura.height, 0.3, 0.75, 12.7, 6.5);
            slide.addImage({ data: captura.dataUrl, ...cajaImagen });
        }

        const fechaStr = new Date().toISOString().slice(0, 10);
        await pptx.writeFile({ fileName: `Tabla_Quirurgica_Hospital_Illapel_${fechaStr}.pptx` });

    } catch (error) {
        console.error('❌ Error al generar PPT de Tabla Quirúrgica:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al generar la presentación PPT.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = '⬇️ Descargar PPT';
        }
    }
}

// -------------------------------------------------------------
// 🖼️ EXPORTAR IMÁGENES — dos modos, a elección del usuario:
// - Separadas: una PNG por lámina (día), comprimidas en un .zip.
// - Una por semana: Lunes a Viernes de cada semana seleccionada, apilados
//   verticalmente en una sola imagen (sin Sábado/Domingo — así cabe más
//   resolución por día dentro del límite de tamaño de Google Sheets).
// Reutiliza capturarLaminaDiaTabla() — misma lámina que se ve en Presentación
// y se inserta en el PPT, solo que acá se entrega suelta en vez de incrustada.
// -------------------------------------------------------------
async function descargarImagenesTabla() {
    const laminas = obtenerLaminasTablaSeleccionadas();
    if (laminas.length === 0) {
        showModal({
            title: '⚠️ Sin semanas seleccionadas',
            message: 'Selecciona al menos una semana para descargar las imágenes.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
        return;
    }

    const combinarPorSemana = await showModal({
        title: '🖼️ Descargar Imágenes',
        message: '¿Cómo quieres las imágenes?<br><br>' +
            '<strong>🗂️ Separadas:</strong> una imagen por cada día.<br>' +
            '<strong>📅 Una por semana:</strong> Lunes a Viernes de cada semana, apilados en una sola imagen.',
        icon: '🖼️',
        confirmText: '📅 Una por semana',
        cancelText: '🗂️ Separadas'
    });

    if (combinarPorSemana) {
        await descargarImagenesTablaPorSemana(laminas);
    } else {
        await descargarImagenesTablaSeparadas(laminas);
    }
}

function descargarBlobComoArchivo(blob, nombreArchivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Apila verticalmente varias capturas {dataUrl, width, height} (mismo ancho,
// ya que todas salen de la misma plantilla) en un solo canvas/PNG.
async function combinarCapturasVerticalmente(capturas, anchoMaximo = 2000) {
    const imagenes = await Promise.all(capturas.map(c => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = c.dataUrl;
    })));

    const anchoOriginal = Math.max(...capturas.map(c => c.width));
    // 🖼️ El usuario necesita agrandar la imagen DENTRO de Sheets sin que se
    // pixele, y eso solo se resuelve con más píxeles reales — ninguna
    // compresión lo arregla (por eso PNG y no JPEG, ver el toDataURL de más
    // abajo). Con las 7 láminas (Lun-Dom) ni "en la celda" ni "sobre las
    // celdas" aceptaban el archivo aunque fuera sin recorte; ahora que
    // descargarImagenesTablaPorSemana() solo arma Lunes-Viernes (5 láminas,
    // no 7) hay margen para subir el ancho sin volver a pasarse del límite.

    const factor = anchoOriginal > anchoMaximo ? anchoMaximo / anchoOriginal : 1;
    const ancho = Math.round(anchoOriginal * factor);
    const alto = Math.round(capturas.reduce((suma, c) => suma + c.height, 0) * factor);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ancho, alto);

    let y = 0;
    imagenes.forEach((img, i) => {
        const alturaCaptura = Math.round(capturas[i].height * factor);
        ctx.drawImage(img, 0, y, ancho, alturaCaptura);
        y += alturaCaptura;
    });

    return { dataUrl: canvas.toDataURL('image/png'), width: ancho, height: alto };
}

async function descargarImagenesTablaSeparadas(laminas) {
    const boton = document.getElementById('btnDescargarImagenesTabla');
    if (boton) {
        boton.disabled = true;
        boton.textContent = '⏳ Generando...';
    }

    tablaPresentacionCache = {};

    try {
        if (typeof JSZip === 'undefined') throw new Error('JSZip no está disponible');

        const zip = new JSZip();

        for (let i = 0; i < laminas.length; i++) {
            const lamina = laminas[i];
            const captura = await capturarLaminaDiaTabla(lamina.semanaIdx, lamina.diaIdx);
            const nombreDia = NOMBRES_DIAS_LARGOS_TABLA[DIAS[lamina.diaIdx]] || DIAS[lamina.diaIdx];
            const nombreArchivo = `${String(i + 1).padStart(2, '0')}_${nombreDia}_Semana${lamina.semanaIdx + 1}.png`;
            const base64 = captura.dataUrl.split(',')[1];
            zip.file(nombreArchivo, base64, { base64: true });
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const fechaStr = new Date().toISOString().slice(0, 10);
        descargarBlobComoArchivo(blob, `Tabla_Quirurgica_Imagenes_${fechaStr}.zip`);

    } catch (error) {
        console.error('❌ Error al descargar imágenes de la Tabla Quirúrgica:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al generar el archivo con las imágenes.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = '🖼️ Descargar Imágenes';
        }
    }
}

async function descargarImagenesTablaPorSemana(laminas) {
    const boton = document.getElementById('btnDescargarImagenesTabla');
    if (boton) {
        boton.disabled = true;
        boton.textContent = '⏳ Generando...';
    }

    tablaPresentacionCache = {};

    try {
        // Agrupar las láminas por semana (ya vienen ordenadas Lunes→Domingo
        // dentro de cada semana, ver obtenerLaminasTablaSeleccionadas()).
        // 🗓️ Solo Lunes a Viernes: sin Sábado/Domingo caben más píxeles por
        // día dentro del límite de tamaño que acepta Google Sheets.
        const porSemana = new Map();
        laminas.forEach(lamina => {
            if (lamina.diaIdx > 4) return; // 0=LUN ... 4=VIE, 5=SAB, 6=DOM
            if (!porSemana.has(lamina.semanaIdx)) porSemana.set(lamina.semanaIdx, []);
            porSemana.get(lamina.semanaIdx).push(lamina);
        });
        const semanasOrdenadas = Array.from(porSemana.keys()).sort((a, b) => a - b);

        const combinadas = [];
        for (const semanaIdx of semanasOrdenadas) {
            const capturas = [];
            for (const lamina of porSemana.get(semanaIdx)) {
                capturas.push(await capturarLaminaDiaTabla(lamina.semanaIdx, lamina.diaIdx));
            }
            const combinada = await combinarCapturasVerticalmente(capturas);
            combinadas.push({ semanaIdx, dataUrl: combinada.dataUrl });
        }

        const fechaStr = new Date().toISOString().slice(0, 10);

        if (combinadas.length === 1) {
            // Una sola semana: se descarga la imagen directo, sin .zip.
            const a = document.createElement('a');
            a.href = combinadas[0].dataUrl;
            a.download = `Tabla_Quirurgica_Semana${combinadas[0].semanaIdx + 1}_${fechaStr}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            if (typeof JSZip === 'undefined') throw new Error('JSZip no está disponible');
            const zip = new JSZip();
            combinadas.forEach((img, i) => {
                const base64 = img.dataUrl.split(',')[1];
                zip.file(`${String(i + 1).padStart(2, '0')}_Semana${img.semanaIdx + 1}.png`, base64, { base64: true });
            });
            const blob = await zip.generateAsync({ type: 'blob' });
            descargarBlobComoArchivo(blob, `Tabla_Quirurgica_Semanas_${fechaStr}.zip`);
        }

    } catch (error) {
        console.error('❌ Error al generar la imagen combinada de la Tabla Quirúrgica:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al generar la imagen combinada.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = '🖼️ Descargar Imágenes';
        }
    }
}
