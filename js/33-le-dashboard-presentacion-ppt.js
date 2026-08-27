// =============================================================
// 🎥 DASHBOARD DE LISTA DE ESPERA · PRESENTACIÓN Y PPT
// =============================================================
// Mismo patrón que Tabla Quirúrgica (js/19) y Estadísticas (js/18):
// html2canvas fotografía secciones YA RENDERIZADAS del Dashboard — a
// diferencia de Tabla Quirúrgica (que reconstruye HTML aparte porque solo
// un día está visible a la vez), acá todo el Dashboard ya está en el DOM
// al mismo tiempo, así que no hace falta reconstruir nada — y PptxGenJS
// arma el .pptx a partir de esas capturas. Reutiliza
// obtenerLogoDataUrl()/ajustarImagenAlaCaja() de js/18-estadisticas.js
// (cargado antes que este archivo, ver index.html).
//
// El Dashboard queda "segmentado" en 5 láminas — una por sección — en vez
// de una sola captura gigante de toda la página. "Pacientes para Llamar" y
// "Pacientes entre 6 Meses y 1 Año" (las dos tablas paginadas) y "Últimos 5
// Pacientes Registrados" quedan fuera de la Presentación/PPT a propósito —
// siguen viéndose normal en el Dashboard, solo no forman parte de las
// láminas.
// =============================================================

const LE_DASHBOARD_LAMINAS = [
    { titulo: '📊 Resumen General', elementoId: 'dashboardSeccionResumen' },
    { titulo: '📈 Gráficos', elementoId: 'dashboardSeccionGraficos' },
    { titulo: '📊 Medianas de Espera por Especialidad', elementoId: 'dashboardSeccionMedianas' },
    { titulo: '📊 Pacientes por Especialidad vs Estatus', elementoId: 'dashboardSeccionCrossTable' },
    { titulo: '⚠️ Pacientes con Mayor Tiempo de Espera', elementoId: 'dashboardSeccionTopEspera' }
];

let dashboardPresentacionCache = {};
let dashboardPresentacionIndice = 0;
let dashboardPresentacionManejadorTeclado = null;
let dashboardPresentacionSolicitudId = 0;
let dashboardPresentacionCola = Promise.resolve();

function dashboardPresentacionEncolar(tarea) {
    const resultado = dashboardPresentacionCola.then(tarea, tarea);
    dashboardPresentacionCola = resultado.catch(() => {});
    return resultado;
}

async function capturarLaminaDashboard(lamina) {
    if (dashboardPresentacionCache[lamina.elementoId]) return dashboardPresentacionCache[lamina.elementoId];

    if (typeof html2canvas === 'undefined') throw new Error('html2canvas no está disponible');

    return dashboardPresentacionEncolar(async () => {
        if (dashboardPresentacionCache[lamina.elementoId]) return dashboardPresentacionCache[lamina.elementoId];

        const elemento = document.getElementById(lamina.elementoId);
        if (!elemento) throw new Error(`No se encontró el elemento ${lamina.elementoId}`);
        const canvas = await html2canvas(elemento, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
        const captura = { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };

        dashboardPresentacionCache[lamina.elementoId] = captura;
        return captura;
    });
}

// -------------------------------------------------------------
// 🎥 MODO PRESENTACIÓN (pantalla completa)
// -------------------------------------------------------------
function abrirPresentacionDashboard() {
    document.getElementById('dashboardPresentacionOverlay')?.remove();
    dashboardPresentacionCache = {};

    const overlay = document.createElement('div');
    overlay.id = 'dashboardPresentacionOverlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:#0b2a4f; z-index:5000; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; box-sizing:border-box;';
    document.body.appendChild(overlay);

    dashboardPresentacionManejadorTeclado = function(e) {
        if (e.key === 'Escape') cerrarPresentacionDashboard();
        else if (e.key === 'ArrowRight') cambiarDiapositivaPresentacionDashboard(1);
        else if (e.key === 'ArrowLeft') cambiarDiapositivaPresentacionDashboard(-1);
    };
    document.addEventListener('keydown', dashboardPresentacionManejadorTeclado);

    mostrarDiapositivaPresentacionDashboard(0);
}

async function mostrarDiapositivaPresentacionDashboard(indice) {
    const overlay = document.getElementById('dashboardPresentacionOverlay');
    if (!overlay) return;
    dashboardPresentacionIndice = Math.max(0, Math.min(indice, LE_DASHBOARD_LAMINAS.length - 1));
    const lamina = LE_DASHBOARD_LAMINAS[dashboardPresentacionIndice];

    const solicitudId = ++dashboardPresentacionSolicitudId;

    overlay.innerHTML = `<div style="color:white; text-align:center; font-size:1.1rem;">⏳ Generando diapositiva...</div>`;

    let captura;
    try {
        captura = await capturarLaminaDashboard(lamina);
    } catch (error) {
        console.error('❌ Error al generar diapositiva del Dashboard:', error);
        if (solicitudId !== dashboardPresentacionSolicitudId) return;
        overlay.innerHTML = `<div style="color:white; text-align:center;">❌ No se pudo generar la diapositiva.<br><button id="dashboardPresentacionCerrarError" style="margin-top:12px; background:white; color:#0b2a4f; border:none; padding:8px 18px; border-radius:20px; cursor:pointer;">Cerrar</button></div>`;
        overlay.querySelector('#dashboardPresentacionCerrarError')?.addEventListener('click', cerrarPresentacionDashboard);
        return;
    }

    if (solicitudId !== dashboardPresentacionSolicitudId) return;
    if (!document.getElementById('dashboardPresentacionOverlay')) return;

    overlay.innerHTML = `
        <div style="width:100%; display:flex; justify-content:space-between; align-items:center; color:white; margin-bottom:12px; gap:12px;">
            <div style="font-weight:700; font-size:1rem;">${lamina.titulo}</div>
            <button id="dashboardPresentacionCerrar" style="background:transparent; border:1px solid white; color:white; padding:6px 14px; border-radius:20px; cursor:pointer; font-size:0.8rem; flex-shrink:0;">✕ Cerrar (Esc)</button>
        </div>
        <div style="flex:1; width:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            <img src="${captura.dataUrl}" style="max-width:100%; max-height:100%; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.4);">
        </div>
        <div style="margin-top:16px; display:flex; align-items:center; gap:20px;">
            <button id="dashboardPresentacionAnterior" style="background:white; color:#0b2a4f; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.1rem; font-weight:700;">‹</button>
            <span style="color:white; font-size:0.85rem;">${dashboardPresentacionIndice + 1} / ${LE_DASHBOARD_LAMINAS.length}</span>
            <button id="dashboardPresentacionSiguiente" style="background:white; color:#0b2a4f; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:1.1rem; font-weight:700;">›</button>
        </div>
    `;

    overlay.style.flexDirection = 'column';
    overlay.querySelector('#dashboardPresentacionCerrar').addEventListener('click', cerrarPresentacionDashboard);
    overlay.querySelector('#dashboardPresentacionAnterior').addEventListener('click', () => cambiarDiapositivaPresentacionDashboard(-1));
    overlay.querySelector('#dashboardPresentacionSiguiente').addEventListener('click', () => cambiarDiapositivaPresentacionDashboard(1));
}

function cambiarDiapositivaPresentacionDashboard(delta) {
    const nuevoIndice = dashboardPresentacionIndice + delta;
    if (nuevoIndice < 0 || nuevoIndice >= LE_DASHBOARD_LAMINAS.length) return;
    mostrarDiapositivaPresentacionDashboard(nuevoIndice);
}

function cerrarPresentacionDashboard() {
    document.getElementById('dashboardPresentacionOverlay')?.remove();
    if (dashboardPresentacionManejadorTeclado) {
        document.removeEventListener('keydown', dashboardPresentacionManejadorTeclado);
        dashboardPresentacionManejadorTeclado = null;
    }
}

// -------------------------------------------------------------
// ⬇️ EXPORTAR A PPT
// -------------------------------------------------------------
async function descargarPresentacionPptDashboard() {
    const boton = document.getElementById('dashboardBtnDescargarPpt');
    if (boton) {
        boton.disabled = true;
        boton.textContent = '⏳ Generando...';
    }

    dashboardPresentacionCache = {};

    try {
        if (typeof PptxGenJS === 'undefined') throw new Error('PptxGenJS no está disponible');

        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'LE_DASHBOARD', width: 13.33, height: 7.5 });
        pptx.layout = 'LE_DASHBOARD';

        const logoDataUrl = await obtenerLogoDataUrl();

        for (const lamina of LE_DASHBOARD_LAMINAS) {
            const captura = await capturarLaminaDashboard(lamina);

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
        await pptx.writeFile({ fileName: `Dashboard_Lista_Espera_Hospital_Illapel_${fechaStr}.pptx` });

    } catch (error) {
        console.error('❌ Error al generar PPT del Dashboard:', error);
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
