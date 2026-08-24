    // =============================================================
    // RENDERIZADO
    // =============================================================
   // ✅ Considera "vacío" tanto "" como el placeholder "Seleccione".
   // Función independiente (no depende de otros archivos) para evitar
   // problemas de scope si los .js se cargan como módulos separados.
   function esEstadoVacioLocal(estado) {
       if (!estado) return true;
       const val = String(estado).trim().toLowerCase();
       return val === '' || val === 'seleccione';
   }

   function renderTabs() {
    // ✅ Si los botones ya existen, solo actualizar clases
    const existingButtons = tabContainer.querySelectorAll('.tab-btn');
    if (existingButtons.length === semanas.length) {
        existingButtons.forEach((btn, index) => {
            if (index === currentWeek) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        return; // No recrear botones
    }

    // ✅ Primera vez: crear los botones
    tabContainer.innerHTML = '';
    for (let i = 0; i < semanas.length; i++) {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${i === currentWeek ? 'active' : ''}`;
        btn.textContent = `Semana ${i+1}`;
        btn.dataset.index = i;
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index);
            if (!isNaN(idx) && idx !== currentWeek) {
                // ✅ Guardar el día actual antes de cambiar
                const dayKey = `${currentWeek}-${currentDay}`;
                const hayDatos = verificarSiHayDatos(dayKey);
                if (hayDatos) {
                    console.log(`💾 Guardando ${DIAS[currentDay]} antes de cambiar de semana...`);
                    guardarDiaEnFirebaseOptimizadoConModal(dayKey, false);
                }
                currentWeek = idx;
                currentDay = 0;
                renderWeekView(false);
                // ✅ Actualizar clases sin recrear botones
                renderTabs();
            }
        });
        tabContainer.appendChild(btn);
    }
}

    // =============================================================
    // ⭐ FUNCIÓN RENDER (CORREGIDA CON ASYNC)
    // =============================================================
    async function render() {
        if (!currentUser) {
            console.log('⏳ Esperando autenticación...');
            return;
        }
        renderTabs();

        if (seccionActiva === 'registro') {
            await renderWeekView();
        } else if (seccionActiva === 'diferidos') {
            await cargarPacientesDiferidos();
        } else if (seccionActiva === 'libro') {
            await cargarLibroQuirofano();
        } else if (seccionActiva === 'admin') {
            await cargarAdmin();
        }
    }

// =============================================================
// ⭐ FUNCIÓN RENDERWEEKVIEW - CON PRESERVACIÓN DE SCROLL
// =============================================================
async function renderWeekView(esAutoSave = false) {
    const semanaData = semanas[currentWeek];
    if (!semanaData) return;

    let scrollY = 0;
    let scrollX = 0;
    
    // SOLO guardar scroll si es auto-guardado
    if (esAutoSave) {
        scrollY = window.scrollY || 0;
        const tableWrap = document.querySelector('.table-wrap');
        scrollX = tableWrap ? tableWrap.scrollLeft : 0;
    }

    const weekNum = currentWeek + 1;

    // 1️⃣ CONSTRUIR EL HTML COMPLETO
    let html = `<div class="week-container">`;
    html += `<h3 style="margin-bottom:4px;">📅 Semana ${weekNum}</h3>`;
    html += renderToolbarPresentacionTabla();

    // 2️⃣ BOTONES DE DÍAS
    html += `<div class="days-grid">`;
    DIAS.forEach((dia, idx) => {
        const active = idx === currentDay ? 'active' : '';
        const count = semanaData[idx].pabs['PAB 1']?.length || 0;
        html += `<button class="day-btn ${active}" data-dayindex="${idx}">
            ${dia}
            <span class="sub-text">${count} + ${semanaData[idx].pabs['PAB 2']?.length || 0} registros</span>
        </button>`;
    });
    html += `</div>`;

    // 3️⃣ TABLA DEL DÍA ACTUAL
    const dayData = semanaData[currentDay];
    if (dayData) {
        html += await renderDayTable(dayData, currentWeek, currentDay);
    }

    html += `</div>`;
    weekContent.innerHTML = html;

    // =============================================================
    // 4️⃣ ASIGNAR TODOS LOS EVENTOS
    // =============================================================

    // 🎯 EVENTOS DE DÍAS - Guarda antes de cambiar
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const idx = parseInt(this.dataset.dayindex);
            if (!isNaN(idx) && idx !== currentDay) {
                const dayKey = `${currentWeek}-${currentDay}`;
                const hayDatos = verificarSiHayDatos(dayKey);
                if (hayDatos) {
                    console.log(`💾 Guardando ${DIAS[currentDay]} antes de cambiar...`);
                    await guardarDiaEnFirebaseOptimizadoConModal(dayKey, false);
                }
                currentDay = idx;
                renderWeekView(false);
            }
        });
    });

    // 📝 CONVERTIR TEXTAREAS DE INTERVENCIÓN EN COMBOBOX (LAZY LOADING)
    initLazyComboboxes();

    // 🎥 Toolbar de Presentación / Descargar PPT (una lámina por día)
    inicializarToolbarPresentacionTabla();

    // 📌 Botones de cada pabellón siguiendo el scroll horizontal de la tabla
    inicializarScrollBotonesPabellon();

    // 🔒 Si el usuario está en modo solo lectura, deshabilita toda edición
    aplicarSoloLecturaTabla();

    // ✅ EVENTOS DELEGADOS
    asignarEventosDelegados();

    // 🎯 BOTONES DE ACCIÓN
    document.querySelectorAll('#weekContent [data-action="saveDay"]').forEach(btn => {
        btn.addEventListener('click', async function() {
            const dayKey = this.dataset.daykey;
            await guardarDiaEnFirebaseOptimizadoConModal(dayKey, true);
        });
    });

    document.querySelectorAll('#weekContent [data-action="clearDay"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const dayKey = this.dataset.daykey;
            limpiarDia(dayKey);
        });
    });

    document.querySelectorAll('#weekContent [data-action="savePab"]').forEach(btn => {
        btn.addEventListener('click', async function() {
            const pabKey = this.dataset.pabkey;
            await guardarPabellonEnFirebaseOptimizadoConModal(pabKey, true);
        });
    });

    document.querySelectorAll('#weekContent [data-action="clearPab"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const pabKey = this.dataset.pabkey;
            limpiarPabellon(pabKey);
        });
    });

    document.querySelectorAll('#weekContent [data-action="addRow"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const pabKey = this.dataset.pabkey;
            agregarFila(pabKey);
        });
    });

    document.querySelectorAll('#weekContent [data-action="deleteRow"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const rowKey = this.dataset.rowkey;
            eliminarFila(rowKey);
        });
    });

    document.querySelectorAll('#weekContent [data-action="registrarDay"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const dayKey = this.dataset.daykey;
            registrarDefinitivo(dayKey);
        });
    });

    document.querySelectorAll('#weekContent [data-action="diferir"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const rowKey = this.dataset.rowkey;
            if (rowKey) {
                diferirFila(rowKey);
            }
        });
    });

    document.querySelectorAll('#weekContent [data-action="reubicar"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const rowKey = this.dataset.rowkey;
            if (rowKey) {
                mostrarModalReubicar(rowKey);
            }
        });
    });

    document.querySelectorAll('#weekContent [data-action="whatsapp"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const rowKey = this.dataset.rowkey;
            if (rowKey && typeof mostrarModalWhatsApp === 'function') {
                mostrarModalWhatsApp(rowKey);
            }
        });
    });

    document.querySelectorAll('#weekContent [data-action="printDay"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const dayKey = this.dataset.daykey;
            if (dayKey) {
                imprimirDia(dayKey);
            }
        });
    });

    // 🎯 CAUSAL Y MOTIVO DE SUSPENSIÓN
    document.querySelectorAll('#weekContent .causal-select').forEach(select => {
        select.addEventListener('change', function() {
            const rowKey = this.dataset.rowkey;
            const causalKey = this.value;
            const tr = this.closest('tr');
            const motivoSelect = tr.querySelector('.motivo-select');

            if (motivoSelect) {
                let opts = '<option value="">Seleccione motivo</option>';
                if (causalKey && CAUSALES_SUSPENSION[causalKey]) {
                    const motivos = CAUSALES_SUSPENSION[causalKey].motivos || [];
                    motivos.forEach(m => {
                        opts += `<option value="${m}">${m}</option>`;
                    });
                    motivoSelect.disabled = false;
                } else {
                    motivoSelect.disabled = true;
                }
                motivoSelect.innerHTML = opts;
                motivoSelect.value = '';

                if (rowKey) {
                    const parts = rowKey.split('-').map(Number);
                    if (parts.length === 4) {
                        const [s, d, p, f] = parts;
                        const semana = semanas[s];
                        if (semana) {
                            const day = semana[d];
                            if (day) {
                                const pabName = PABS[p];
                                if (pabName) {
                                    const rows = day.pabs[pabName];
                                    if (rows && rows[f]) {
                                        rows[f]['Causal_de_suspension'] = causalKey;
                                        rows[f]['Motivo'] = '';
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    });

    document.querySelectorAll('#weekContent select[data-col="ESTADO_DE_IQx"]').forEach(select => {
        select.addEventListener('change', function() {
            const rowKey = this.dataset.rowkey;
            const estado = this.value;
            const tr = this.closest('tr');
            const causalSelect = tr.querySelector('.causal-select');
            const motivoSelect = tr.querySelector('.motivo-select');

            const esSuspendido = estado === 'SUSPENDIDO' || estado === 'CONDICIONAL (NO OPERADO)';

            // ⚠️ Buscar la fila EN MEMORIA y actualizar su ESTADO_DE_IQx antes
            // de recalcular el bloqueo de Diferir/Reubicar — antes este
            // bloque tenía su PROPIA lógica de bloqueo (solo miraba si había
            // "cualquier estado seleccionado"), duplicada e inconsistente
            // con la de renderDayTable()/actualizarBotonesDiferirReubicar()
            // en js/07 (que sí exceptúa SUSPENDIDO/CONDICIONAL). Como este
            // listener se registra después del de js/02, su versión vieja
            // pisaba la correcta apenas el usuario tocaba el select — por
            // eso los botones se veían mal bloqueados hasta el próximo
            // redibujado completo (autoguardado). Ahora usa la MISMA función
            // que el render, para que no puedan volver a desincronizarse.
            let fila = null;
            if (rowKey) {
                const parts = rowKey.split('-').map(Number);
                if (parts.length === 4) {
                    const [s, d, p, f] = parts;
                    const semana = semanas[s];
                    const day = semana && semana[d];
                    const pabName = PABS[p];
                    const rows = day && pabName && day.pabs[pabName];
                    fila = rows && rows[f];
                }
            }

            if (fila) {
                fila['ESTADO_DE_IQx'] = estado;
                if (!esSuspendido) {
                    fila['Causal_de_suspension'] = '';
                    fila['Motivo'] = '';
                }
            }

            if (typeof actualizarBotonesDiferirReubicar === 'function') {
                actualizarBotonesDiferirReubicar(tr, fila || { 'ESTADO_DE_IQx': estado });
            }

            if (causalSelect) {
                causalSelect.disabled = !esSuspendido;
                if (!esSuspendido) {
                    causalSelect.value = '';
                    if (motivoSelect) {
                        motivoSelect.innerHTML = '<option value="">Seleccione motivo</option>';
                        motivoSelect.disabled = true;
                        motivoSelect.value = '';
                    }
                }
            }
        });
    });

    // 🎨 SELECTOR DE COLOR
    document.querySelectorAll('#weekContent [id^="color-container-"]').forEach(container => {
        const rowKey = container.dataset.rowkey;
        const colorVal = container.dataset.color || '';

        container.innerHTML = '';
        const colorPicker = crearSelectorColor(rowKey, colorVal);
        container.appendChild(colorPicker);
    });

    setTimeout(ajustarInputs, 100);
    // ✅ Validar todos los RUT después de renderizar
    setTimeout(validarTodosLosRut, 150);

    // ✅ RESTAURAR POSICIONES DE SCROLL
    setTimeout(() => {
        if (esAutoSave) {
            // ✅ AUTO-GUARDADO: restaurar scroll donde estaba
            if (scrollY > 0) {
                window.scrollTo({
                    top: scrollY,
                    behavior: 'instant'
                });
                console.log(`🔄 Scroll vertical restaurado a ${scrollY}px (auto-save)`);
            }
            if (scrollX > 0) {
                const nuevoTableWrap = document.querySelector('.table-wrap');
                if (nuevoTableWrap) {
                    nuevoTableWrap.scrollLeft = scrollX;
                    console.log(`🔄 Scroll horizontal restaurado a ${scrollX}px (auto-save)`);
                }
            }
        } else {
            // ✅ CAMBIO DE DÍA/SEMANA: resetear scroll al inicio
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            const nuevoTableWrap = document.querySelector('.table-wrap');
            if (nuevoTableWrap) {
                nuevoTableWrap.scrollLeft = 0;
            }
            console.log('🔄 Scroll reseteado al inicio (cambio de día/semana)');
        }
    }, 150);

}
