
    // =============================================================
    // 🖼️ UI DEL PANEL "VER TABLA QUIRÚRGICA POR FECHA"
    // =============================================================
    // Este archivo solo contiene el HTML y los listeners del panel
    // (input de fecha, botón limpiar, botón imprimir, contenedor).
    // La lógica de datos (cargar/renderizar/imprimir la tabla) vive
    // en 16-libro-tabla-por-fecha.js. Se llama desde
    // cargarLibroQuirofano() en 09-diferidos-libro-admin.js.
    // =============================================================

    // 🧱 Devuelve el HTML del panel, para insertar dentro de libroContent
    function renderLibroFechaUI() {
        return `
            <div style="background:#fafcff; border-radius:20px; border:1px solid #e2e8f0; padding:16px; margin-top:8px;">
                <div style="font-size:1.1rem; font-weight:700; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <span>📅 Ver Tabla Quirúrgica por Fecha</span>
                </div>
                <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:12px;">
                    <div>
                        <label style="font-size:0.75rem; font-weight:600; color:#64748b; display:block; margin-bottom:4px;">Selecciona una fecha</label>
                        <input type="date" id="libroFechaInput" style="padding:8px 10px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.9rem; background:#f8fafc;">
                    </div>
                    <button class="btn-sm" id="libroFechaLimpiarBtn" title="Quitar fecha" aria-label="Quitar fecha" style="display:none; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; width:34px; height:34px; border-radius:8px; cursor:pointer; align-items:center; justify-content:center; font-size:0.95rem;">
                        🗑️
                    </button>
                    <button class="btn-sm btn-print" id="libroFechaImprimirBtn" style="display:none; background:#4f46e5; color:white; border:none; padding:8px 16px; border-radius:30px; font-size:0.75rem; font-weight:500; cursor:pointer;">
                        🖨️ Imprimir Tabla
                    </button>
                </div>
                <div id="libroFechaTablaContainer"></div>
            </div>
        `;
    }

    // 🔌 Conecta los listeners del panel. Debe llamarse DESPUÉS de que
    // renderLibroFechaUI() ya esté en el DOM (es decir, después de
    // asignar libroContent.innerHTML).
    function inicializarLibroFechaUI() {
        const libroFechaInputEl = document.getElementById('libroFechaInput');
        const libroFechaLimpiarBtnEl = document.getElementById('libroFechaLimpiarBtn');
        const libroFechaImprimirBtnEl = document.getElementById('libroFechaImprimirBtn');

        libroFechaInputEl?.addEventListener('change', function() {
            if (libroFechaLimpiarBtnEl) {
                libroFechaLimpiarBtnEl.style.display = this.value ? 'flex' : 'none';
            }
            cargarTablaLibroPorFecha(this.value);
        });

        libroFechaLimpiarBtnEl?.addEventListener('click', function() {
            if (libroFechaInputEl) libroFechaInputEl.value = '';
            this.style.display = 'none';
            cargarTablaLibroPorFecha('');
        });

        libroFechaImprimirBtnEl?.addEventListener('click', function() {
            imprimirTablaLibroPorFecha();
        });
    }
