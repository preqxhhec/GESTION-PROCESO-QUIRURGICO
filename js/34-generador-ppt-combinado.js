// =============================================================
// 🗂️ GENERADOR DE PPT COMBINADO
// Desde el menú hamburguesa: un modal para elegir cuáles de las 4 fuentes
// que ya generan PPT por separado (Tabla Quirúrgica, Estadísticas, Análisis
// IA, Dashboard de Lista de Espera) incluir, con las opciones propias de
// cada una (semanas / rango de fechas / bloques), y arma UN solo archivo
// .pptx con todas las láminas en orden. No reemplaza "Reunión de Tabla"
// (js/21) ni ninguno de los PPT individuales — es una cuarta forma más,
// para cuando se necesita mezclar fuentes que Reunión de Tabla no cubre
// (Análisis IA, Dashboard LE) o que no se quieren agrupar de a pares.
//
// Reutiliza 100% de la captura ya existente, sin tocarla:
//   - Tabla Quirúrgica: obtenerLaminasTablaSeleccionadas() / capturarLaminaDiaTabla() (js/19)
//   - Estadísticas: estadisticasResolverLaminas() / capturarElementoComoImagen() (js/18)
//   - Análisis IA: construirInformeAnalisisIA() / agregarLaminasInformeAnalisisIA() (js/22)
//   - Dashboard LE: LE_DASHBOARD_LAMINAS / capturarLaminaDashboard() (js/33)
// =============================================================

let generadorPptFuenteTabla = false;
let generadorPptFuenteEstadisticas = false;
let generadorPptFuenteAnalisisIa = false;
let generadorPptFuenteDashboardLE = false;

let generadorPptSemanasSeleccionadas = new Set();
let generadorPptEstadisticasFechaInicio = '';
let generadorPptEstadisticasFechaFin = '';
let generadorPptAnalisisIaFechaInicio = '';
let generadorPptAnalisisIaFechaFin = '';
let generadorPptAnalisisIaBloquesSeleccionados = new Set();

// -------------------------------------------------------------
// 🪟 MODAL: elegir fuentes + opciones de cada una
// -------------------------------------------------------------
function abrirModalGeneradorPpt() {
    document.getElementById('generadorPptOverlay')?.remove();

    if (generadorPptSemanasSeleccionadas.size === 0 && typeof currentWeek === 'number') {
        generadorPptSemanasSeleccionadas.add(currentWeek);
    }
    if (!generadorPptAnalisisIaFechaInicio && !generadorPptAnalisisIaFechaFin) {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        generadorPptAnalisisIaFechaInicio = inicioMes.toISOString().slice(0, 10);
        generadorPptAnalisisIaFechaFin = hoy.toISOString().slice(0, 10);
    }

    const overlay = document.createElement('div');
    overlay.id = 'generadorPptOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width:560px; text-align:left;">
            <span class="modal-icon" style="text-align:center; display:block;">🗂️</span>
            <div class="modal-title" style="text-align:center;">Generador de PPT Combinado</div>
            <div class="modal-message" style="text-align:center; margin-bottom:16px;">
                Elige qué secciones incluir — cada una con sus propias opciones — y se genera un solo archivo PPT con todo junto.
            </div>

            <div id="generadorPptFuenteTablaBox" style="margin-bottom:14px; display:none;">
                <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:700; color:#0b2a4f; cursor:pointer;">
                    <input type="checkbox" id="generadorPptChkTabla"> 📋 Tabla Quirúrgica
                </label>
                <div id="generadorPptPanelTabla" style="display:none; margin-top:8px; padding-left:26px;">
                    <span style="font-size:0.75rem; color:#64748b; display:block; margin-bottom:4px;">Semanas a incluir</span>
                    <div id="generadorPptSemanasLista" style="display:flex; flex-direction:column; gap:4px; max-height:140px; overflow-y:auto; border:1px solid #d1d9e6; border-radius:10px; padding:8px;"></div>
                </div>
            </div>

            <div id="generadorPptFuenteEstadisticasBox" style="margin-bottom:14px; display:none;">
                <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:700; color:#0b2a4f; cursor:pointer;">
                    <input type="checkbox" id="generadorPptChkEstadisticas"> 📊 Estadísticas
                </label>
                <div id="generadorPptPanelEstadisticas" style="display:none; margin-top:8px; padding-left:26px;">
                    <span style="font-size:0.75rem; color:#64748b; display:block; margin-bottom:4px;">Rango de fechas (vacío = sin filtro)</span>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <input type="date" id="generadorPptEstadisticasFechaInicio" value="${generadorPptEstadisticasFechaInicio}" style="padding:6px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.85rem;">
                        <span style="font-size:0.8rem; color:#94a3b8;">a</span>
                        <input type="date" id="generadorPptEstadisticasFechaFin" value="${generadorPptEstadisticasFechaFin}" style="padding:6px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.85rem;">
                        <button id="generadorPptLimpiarFechaEstadisticas" style="background:#e2e8f0; border:none; padding:6px 12px; border-radius:30px; font-size:0.7rem; font-weight:500; cursor:pointer; color:#475569;">🗑️ Limpiar</button>
                    </div>
                </div>
            </div>

            <div id="generadorPptFuenteAnalisisIaBox" style="margin-bottom:14px; display:none;">
                <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:700; color:#0b2a4f; cursor:pointer;">
                    <input type="checkbox" id="generadorPptChkAnalisisIa"> 🧠 Análisis IA
                </label>
                <div id="generadorPptPanelAnalisisIa" style="display:none; margin-top:8px; padding-left:26px;">
                    <span style="font-size:0.75rem; color:#64748b; display:block; margin-bottom:4px;">Rango de fechas a analizar</span>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                        <input type="date" id="generadorPptAnalisisIaFechaInicio" value="${generadorPptAnalisisIaFechaInicio}" style="padding:6px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.85rem;">
                        <span style="font-size:0.8rem; color:#94a3b8;">a</span>
                        <input type="date" id="generadorPptAnalisisIaFechaFin" value="${generadorPptAnalisisIaFechaFin}" style="padding:6px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.85rem;">
                    </div>
                    <span style="font-size:0.75rem; color:#64748b; display:block; margin-bottom:4px;">Bloques de Estadísticas a incluir (opcional)</span>
                    <div id="generadorPptBloquesLista" style="display:flex; flex-direction:column; gap:4px; max-height:140px; overflow-y:auto; border:1px solid #d1d9e6; border-radius:10px; padding:8px;"></div>
                </div>
            </div>

            <div id="generadorPptFuenteDashboardLEBox" style="margin-bottom:18px; display:none;">
                <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; font-weight:700; color:#0b2a4f; cursor:pointer;">
                    <input type="checkbox" id="generadorPptChkDashboardLE"> 🩺 Dashboard de Lista de Espera
                </label>
            </div>

            <div class="modal-actions">
                <button class="modal-btn modal-btn-cancel" id="generadorPptCancelar">Cancelar</button>
                <button class="modal-btn" id="generadorPptGenerar" style="background:#c0392b; color:white; box-shadow:0 4px 12px rgba(192,57,43,0.35);">⬇️ Generar PPT Combinado</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Cada fuente solo se ofrece si el usuario tiene el mismo permiso que ya
    // gatea su PPT individual — mismo criterio granular que usa cada botón
    // hoy, sin inventar un permiso nuevo por fuente dentro de este modal.
    document.getElementById('generadorPptFuenteTablaBox').style.display = usuarioTieneAccesoSeccion('registro_presentacionPpt') ? '' : 'none';
    document.getElementById('generadorPptFuenteEstadisticasBox').style.display = usuarioTieneAccesoSeccion('estadisticas_presentacionPpt') ? '' : 'none';
    document.getElementById('generadorPptFuenteAnalisisIaBox').style.display = usuarioTieneAccesoSeccion('analisisIa') ? '' : 'none';
    document.getElementById('generadorPptFuenteDashboardLEBox').style.display = usuarioTieneAccesoSeccion('listaEspera_exportar') ? '' : 'none';

    document.getElementById('generadorPptChkTabla').checked = generadorPptFuenteTabla;
    document.getElementById('generadorPptChkEstadisticas').checked = generadorPptFuenteEstadisticas;
    document.getElementById('generadorPptChkAnalisisIa').checked = generadorPptFuenteAnalisisIa;
    document.getElementById('generadorPptChkDashboardLE').checked = generadorPptFuenteDashboardLE;
    document.getElementById('generadorPptPanelTabla').style.display = generadorPptFuenteTabla ? 'block' : 'none';
    document.getElementById('generadorPptPanelEstadisticas').style.display = generadorPptFuenteEstadisticas ? 'block' : 'none';
    document.getElementById('generadorPptPanelAnalisisIa').style.display = generadorPptFuenteAnalisisIa ? 'block' : 'none';

    renderGeneradorPptSemanasLista();
    renderGeneradorPptBloquesLista();

    document.getElementById('generadorPptChkTabla').addEventListener('change', function() {
        generadorPptFuenteTabla = this.checked;
        document.getElementById('generadorPptPanelTabla').style.display = this.checked ? 'block' : 'none';
    });
    document.getElementById('generadorPptChkEstadisticas').addEventListener('change', function() {
        generadorPptFuenteEstadisticas = this.checked;
        document.getElementById('generadorPptPanelEstadisticas').style.display = this.checked ? 'block' : 'none';
    });
    document.getElementById('generadorPptChkAnalisisIa').addEventListener('change', function() {
        generadorPptFuenteAnalisisIa = this.checked;
        document.getElementById('generadorPptPanelAnalisisIa').style.display = this.checked ? 'block' : 'none';
    });
    document.getElementById('generadorPptChkDashboardLE').addEventListener('change', function() {
        generadorPptFuenteDashboardLE = this.checked;
    });

    document.getElementById('generadorPptEstadisticasFechaInicio').addEventListener('change', function() {
        generadorPptEstadisticasFechaInicio = this.value || '';
    });
    document.getElementById('generadorPptEstadisticasFechaFin').addEventListener('change', function() {
        generadorPptEstadisticasFechaFin = this.value || '';
    });
    document.getElementById('generadorPptLimpiarFechaEstadisticas').addEventListener('click', function() {
        generadorPptEstadisticasFechaInicio = '';
        generadorPptEstadisticasFechaFin = '';
        document.getElementById('generadorPptEstadisticasFechaInicio').value = '';
        document.getElementById('generadorPptEstadisticasFechaFin').value = '';
    });

    document.getElementById('generadorPptAnalisisIaFechaInicio').addEventListener('change', function() {
        generadorPptAnalisisIaFechaInicio = this.value || '';
    });
    document.getElementById('generadorPptAnalisisIaFechaFin').addEventListener('change', function() {
        generadorPptAnalisisIaFechaFin = this.value || '';
    });

    document.getElementById('generadorPptCancelar').addEventListener('click', cerrarModalGeneradorPpt);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) cerrarModalGeneradorPpt();
    });
    document.getElementById('generadorPptGenerar').addEventListener('click', generarPptCombinadoFinal);
}

function renderGeneradorPptSemanasLista() {
    const cont = document.getElementById('generadorPptSemanasLista');
    if (!cont || typeof semanas === 'undefined') return;

    let html = `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:4px 2px; border-bottom:1px solid #e2e8f0; margin-bottom:4px; cursor:pointer; font-weight:600;">
        <input type="checkbox" id="generadorPptChkTodasSemanas" ${generadorPptSemanasSeleccionadas.size === semanas.length ? 'checked' : ''}> Todas
    </label>`;
    for (let i = 0; i < semanas.length; i++) {
        html += `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:3px 2px; cursor:pointer;">
            <input type="checkbox" class="generadorPptChkSemana" data-semana="${i}" ${generadorPptSemanasSeleccionadas.has(i) ? 'checked' : ''}> Semana ${i + 1}
        </label>`;
    }
    cont.innerHTML = html;

    document.getElementById('generadorPptChkTodasSemanas').addEventListener('change', function() {
        generadorPptSemanasSeleccionadas = this.checked ? new Set(semanas.map((_, i) => i)) : new Set();
        renderGeneradorPptSemanasLista();
    });
    cont.querySelectorAll('.generadorPptChkSemana').forEach(chk => {
        chk.addEventListener('change', function() {
            const idx = parseInt(this.dataset.semana, 10);
            if (this.checked) generadorPptSemanasSeleccionadas.add(idx);
            else generadorPptSemanasSeleccionadas.delete(idx);
            renderGeneradorPptSemanasLista();
        });
    });
}

function renderGeneradorPptBloquesLista() {
    const cont = document.getElementById('generadorPptBloquesLista');
    if (!cont || typeof ANALISIS_IA_BLOQUES_ESTADISTICAS === 'undefined') return;

    let html = `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:4px 2px; border-bottom:1px solid #e2e8f0; margin-bottom:4px; cursor:pointer; font-weight:600;">
        <input type="checkbox" id="generadorPptChkTodosBloques" ${generadorPptAnalisisIaBloquesSeleccionados.size === ANALISIS_IA_BLOQUES_ESTADISTICAS.length ? 'checked' : ''}> Todos
    </label>`;
    ANALISIS_IA_BLOQUES_ESTADISTICAS.forEach(b => {
        html += `<label style="display:flex; align-items:center; gap:6px; font-size:0.8rem; padding:3px 2px; cursor:pointer;">
            <input type="checkbox" class="generadorPptChkBloque" data-pagina="${b.pagina}" ${generadorPptAnalisisIaBloquesSeleccionados.has(b.pagina) ? 'checked' : ''}> ${b.label}
        </label>`;
    });
    cont.innerHTML = html;

    document.getElementById('generadorPptChkTodosBloques').addEventListener('change', function() {
        generadorPptAnalisisIaBloquesSeleccionados = this.checked ? new Set(ANALISIS_IA_BLOQUES_ESTADISTICAS.map(b => b.pagina)) : new Set();
        renderGeneradorPptBloquesLista();
    });
    cont.querySelectorAll('.generadorPptChkBloque').forEach(chk => {
        chk.addEventListener('change', function() {
            const pagina = parseInt(this.dataset.pagina, 10);
            if (this.checked) generadorPptAnalisisIaBloquesSeleccionados.add(pagina);
            else generadorPptAnalisisIaBloquesSeleccionados.delete(pagina);
            renderGeneradorPptBloquesLista();
        });
    });
}

function cerrarModalGeneradorPpt() {
    document.getElementById('generadorPptOverlay')?.remove();
}

// -------------------------------------------------------------
// 🩺 Dashboard LE: pide prestado momentáneamente el único punto de montaje
// (#leSubseccionContent usa IDs globales — no se puede clonar aparte, ver
// plan) y lo deja tal como estaba al terminar.
// -------------------------------------------------------------
async function generadorPptConCapturaDashboardLE(tarea) {
    const cont = document.getElementById('listaEsperaContent');
    if (!cont) return;

    const displayOriginal = cont.style.display;
    const subseccionExiste = !!document.getElementById('leSubseccionContent');
    const seccionOriginal = subseccionExiste ? leSeccionActiva : null;

    cont.style.display = 'block';
    if (!subseccionExiste) {
        leMostrarSeccionListaEspera(); // primera vez: arma el subnav y monta 'dashboard'
    } else if (seccionOriginal !== 'dashboard') {
        leCambiarSubseccion('dashboard');
    }
    await new Promise(resolve => setTimeout(resolve, 300)); // deja pintar los gráficos

    try {
        await tarea();
    } finally {
        if (seccionOriginal && seccionOriginal !== 'dashboard') leCambiarSubseccion(seccionOriginal);
        cont.style.display = displayOriginal;
    }
}

// -------------------------------------------------------------
// ⬇️ GENERACIÓN: arma UN solo PptxGenJS con las láminas de cada fuente
// marcada, en orden. Cada bloque de fuente restaura su propio estado
// temporal en un try/finally, así un error a mitad de camino no deja el
// resto de la app en un estado raro.
// -------------------------------------------------------------
async function generarPptCombinadoFinal() {
    if (!generadorPptFuenteTabla && !generadorPptFuenteEstadisticas && !generadorPptFuenteAnalisisIa && !generadorPptFuenteDashboardLE) {
        showModal({
            title: '⚠️ Sin secciones seleccionadas',
            message: 'Selecciona al menos una sección para generar el PPT combinado.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
        return;
    }
    if (generadorPptFuenteTabla && generadorPptSemanasSeleccionadas.size === 0) {
        showModal({
            title: '⚠️ Sin semanas seleccionadas',
            message: 'Selecciona al menos una semana de Tabla Quirúrgica, o desmarca esa sección.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
        return;
    }
    if (generadorPptFuenteAnalisisIa && (!generadorPptAnalisisIaFechaInicio || !generadorPptAnalisisIaFechaFin)) {
        showModal({
            title: '⚠️ Falta el rango de fechas',
            message: 'Selecciona un rango de fechas para Análisis IA, o desmarca esa sección.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
        return;
    }

    cerrarModalGeneradorPpt();

    document.getElementById('generadorPptEsperaOverlay')?.remove();
    const overlayEspera = document.createElement('div');
    overlayEspera.id = 'generadorPptEsperaOverlay';
    overlayEspera.style.cssText = 'position:fixed; inset:0; background:#0b2a4f; z-index:5500; display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; text-align:center; padding:20px; box-sizing:border-box;';
    overlayEspera.textContent = '⏳ Preparando el PPT combinado...';
    document.body.appendChild(overlayEspera);

    try {
        if (typeof PptxGenJS === 'undefined') throw new Error('PptxGenJS no está disponible');

        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'GENERADOR_PPT_COMBINADO', width: 13.33, height: 7.5 });
        pptx.layout = 'GENERADOR_PPT_COMBINADO';

        const logoDataUrl = await obtenerLogoDataUrl();

        function agregarLaminaImagenCombinado(lamina) {
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

        if (generadorPptFuenteTabla) {
            overlayEspera.textContent = '⏳ Generando Tabla Quirúrgica...';
            const semanasOriginales = tablaPresentacionSemanasSeleccionadas;
            try {
                tablaPresentacionSemanasSeleccionadas = new Set(generadorPptSemanasSeleccionadas);
                tablaPresentacionCache = {};
                const laminas = obtenerLaminasTablaSeleccionadas();
                for (const l of laminas) {
                    const captura = await capturarLaminaDiaTabla(l.semanaIdx, l.diaIdx);
                    agregarLaminaImagenCombinado({ titulo: l.titulo, dataUrl: captura.dataUrl, width: captura.width, height: captura.height });
                }
            } finally {
                tablaPresentacionSemanasSeleccionadas = semanasOriginales;
            }
        }

        if (generadorPptFuenteEstadisticas) {
            overlayEspera.textContent = '⏳ Generando Estadísticas...';
            if (!estadisticasRegistros || estadisticasRegistros.length === 0) {
                await cargarEstadisticas();
            }
            const fechaInicioOriginal = estadisticasFiltroFechaInicio;
            const fechaFinOriginal = estadisticasFiltroFechaFin;
            const displayOriginal = estadisticasContent.style.display;
            try {
                estadisticasFiltroFechaInicio = generadorPptEstadisticasFechaInicio;
                estadisticasFiltroFechaFin = generadorPptEstadisticasFechaFin;
                estadisticasContent.style.display = 'block';
                renderEstadisticas();
                estadisticasCapturasCache = {};

                const laminas = estadisticasResolverLaminas();
                for (const l of laminas) {
                    const captura = await capturarElementoComoImagen(l.pagina, l.elementoId, { modoCaptura: laminaNecesitaModoCaptura(l), gridId: l.gridId, chunkIndex: l.chunkIndex });
                    agregarLaminaImagenCombinado({ titulo: l.titulo, dataUrl: captura.dataUrl, width: captura.width, height: captura.height });
                }
            } finally {
                estadisticasFiltroFechaInicio = fechaInicioOriginal;
                estadisticasFiltroFechaFin = fechaFinOriginal;
                estadisticasContent.style.display = displayOriginal;
                renderEstadisticas();
            }
        }

        if (generadorPptFuenteAnalisisIa) {
            overlayEspera.textContent = '⏳ Analizando datos para IA...';
            const informe = await construirInformeAnalisisIA(
                generadorPptAnalisisIaFechaInicio,
                generadorPptAnalisisIaFechaFin,
                generadorPptAnalisisIaBloquesSeleccionados,
                function(texto) { overlayEspera.textContent = texto; }
            );
            agregarLaminasInformeAnalisisIA(pptx, informe);
        }

        if (generadorPptFuenteDashboardLE) {
            overlayEspera.textContent = '⏳ Generando Dashboard de Lista de Espera...';
            await generadorPptConCapturaDashboardLE(async function() {
                dashboardPresentacionCache = {};
                for (const lamina of LE_DASHBOARD_LAMINAS) {
                    const captura = await capturarLaminaDashboard(lamina);
                    agregarLaminaImagenCombinado({ titulo: lamina.titulo, dataUrl: captura.dataUrl, width: captura.width, height: captura.height });
                }
            });
        }

        const fechaStr = new Date().toISOString().slice(0, 10);
        await pptx.writeFile({ fileName: `Presentacion_Combinada_Hospital_Illapel_${fechaStr}.pptx` });

        overlayEspera.remove();

    } catch (error) {
        console.error('❌ Error al generar el PPT combinado:', error);
        overlayEspera.remove();
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al generar el PPT combinado.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}
