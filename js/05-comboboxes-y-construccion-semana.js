
    // -------------------------------------------------------------
    // FUNCIÓN PARA CREAR COMBOBOX PERSONALIZADO DE INTERVENCIONES
    // -------------------------------------------------------------
    function crearComboboxIntervenciones(textarea) {
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.display = 'inline-block';
        container.style.width = '100%';
        container.style.minWidth = '180px';
        container.style.maxWidth = '350px';
        container.style.height = 'auto';
        container.style.minHeight = '26px';

        textarea.parentNode.insertBefore(container, textarea);
        container.appendChild(textarea);

        textarea.style.width = '100%';
        textarea.style.boxSizing = 'border-box';
        textarea.style.minHeight = '26px';
        textarea.style.maxHeight = '80px';
        textarea.style.overflow = 'auto';
        textarea.style.resize = 'none';
        textarea.style.display = 'block';
        textarea.style.fontFamily = 'inherit';

        const dropdown = document.createElement('div');
        dropdown.className = 'intervencion-dropdown';
        dropdown.style.cssText = `
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: auto;
            min-width: 100%;
            max-width: 550px;
            max-height: 280px;
            overflow-y: auto;
            overflow-x: hidden;
            background: white;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.18);
            z-index: 99999;
            padding: 4px 0;
            font-size: 12px;
            margin-top: 2px;
        `;
        container.appendChild(dropdown);

        function ajustarAlturaTextarea() {
            textarea.style.height = 'auto';
            let nuevaAltura = textarea.scrollHeight;
            if (nuevaAltura < 26) nuevaAltura = 26;
            if (nuevaAltura > 80) nuevaAltura = 80;
            textarea.style.height = nuevaAltura + 'px';
            textarea.style.overflow = textarea.scrollHeight > 80 ? 'auto' : 'hidden';
            container.style.minHeight = nuevaAltura + 'px';
        }

        const styleItem = (item) => {
            item.style.cssText = `
                padding: 6px 12px;
                cursor: pointer;
                white-space: normal;
                word-wrap: break-word;
                font-size: 12px;
                border-bottom: 1px solid #f0f0f0;
                transition: background 0.15s;
                line-height: 1.3;
                color: #222;
                max-width: 100%;
            `;
            item.addEventListener('mouseenter', () => {
                item.style.background = '#e8f0fe';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
        };

        function filtrarOpciones(texto) {
            const filtro = texto.toLowerCase().trim();
            const items = dropdown.querySelectorAll('.dropdown-item');
            let visibleCount = 0;
            items.forEach(item => {
                const nombre = item.dataset.nombre.toLowerCase();
                const match = filtro === '' || nombre.includes(filtro);
                item.style.display = match ? 'block' : 'none';
                if (match) visibleCount++;
            });
            dropdown.style.display = visibleCount > 0 ? 'block' : 'none';
        }

        INTERVENCIONES.forEach(interv => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.nombre = interv.nombre;
            item.dataset.tipo = interv.tipo;
            item.textContent = `${interv.nombre} (${interv.tipo})`;
            styleItem(item);

            item.addEventListener('click', function() {
    const nombre = this.dataset.nombre;
    const tipo = this.dataset.tipo;
    const rowKey = textarea.dataset.rowkey;
    const col = textarea.dataset.col;
    
    // ✅ 1. Poner el nombre de la intervención en el textarea
    textarea.value = nombre;
    dropdown.style.display = 'none';
    ajustarAlturaTextarea();
    
    // ✅ 2. OBTENER LA FILA EN MEMORIA (donde están los datos)
    if (rowKey && col) {
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
                            // ✅ 3. Guardar la intervención en memoria
                            rows[f][col] = nombre;
                            
                            // ✅ 4. Determinar cuál es el campo Tipo_Actividad
                            let tipoField = '';
                            if (col === '1ra_Intervencion_Qx_Realizada') tipoField = 'Tipo_Actividad';
                            else if (col === '2da_Intervencion_Qx_Realizada') tipoField = 'Tipo_Actividad_2';
                            else if (col === '3ra_Intervencion_Realizada') tipoField = 'Tipo_Actividad_3';
                            
                            // ✅ 5. Guardar el Tipo_Actividad en memoria
                            if (tipoField) {
                                rows[f][tipoField] = tipo || '';
                                
                                // ✅ 6. BUSCAR EL INPUT DE TIPO_ACTIVIDAD EN LA TABLA Y ACTUALIZARLO
                                const tr = document.querySelector(`tr[data-rowkey="${rowKey}"]`);
                                if (tr) {
                                    const tipoInput = tr.querySelector(`input[data-col="${tipoField}"], select[data-col="${tipoField}"]`);
                                    if (tipoInput) {
                                        tipoInput.value = tipo || '';
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // ✅ 7. Disparar eventos para otros listeners
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
});

            dropdown.appendChild(item);
        });

        textarea.addEventListener('input', function() {
            filtrarOpciones(this.value);
            ajustarAlturaTextarea();
        });

        textarea.addEventListener('focus', function() {
            filtrarOpciones(this.value);
        });

        textarea.addEventListener('blur', function() {
            setTimeout(() => {
                dropdown.style.display = 'none';
            }, 200);
        });

        document.addEventListener('click', function(e) {
            if (!container.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

       textarea.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        dropdown.style.display = 'none';
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        const visible = dropdown.querySelector('.dropdown-item[style*="display: block"]');
        if (visible) {
            const nombre = visible.dataset.nombre;
            const tipo = visible.dataset.tipo;
            const rowKey = textarea.dataset.rowkey;
            const col = textarea.dataset.col;
            
            textarea.value = nombre;
            dropdown.style.display = 'none';
            ajustarAlturaTextarea();
            
            // ✅ Actualizar Tipo_Actividad
            if (rowKey && col) {
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
                                    rows[f][col] = nombre;
                                    
                                    let tipoField = '';
                                    if (col === '1ra_Intervencion_Qx_Realizada') tipoField = 'Tipo_Actividad';
                                    else if (col === '2da_Intervencion_Qx_Realizada') tipoField = 'Tipo_Actividad_2';
                                    else if (col === '3ra_Intervencion_Realizada') tipoField = 'Tipo_Actividad_3';
                                    
                                    if (tipoField) {
                                        rows[f][tipoField] = tipo || '';
                                        
                                        const tr = document.querySelector(`tr[data-rowkey="${rowKey}"]`);
                                        if (tr) {
                                            const tipoInput = tr.querySelector(`input[data-col="${tipoField}"], select[data-col="${tipoField}"]`);
                                            if (tipoInput) {
                                                tipoInput.value = tipo || '';
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
});

        setTimeout(ajustarAlturaTextarea, 100);
        return container;
    }


    // =============================================================
    // 🚀 LAZY LOADING DE COMBOBOXES - OPTIMIZACIÓN DE RENDIMIENTO
    // =============================================================
    function initLazyComboboxes() {
        document.querySelectorAll('#weekContent .intervencion-textarea').forEach(textarea => {
            // ✅ Si ya tiene combobox, saltar
            if (textarea.closest('.intervencion-combobox')) return;
            
            // ✅ Si tiene autofocus o está activo, crear inmediatamente
            if (document.activeElement === textarea || textarea.autofocus) {
                crearComboboxIntervenciones(textarea);
                textarea.closest('div').classList.add('intervencion-combobox');
                return;
            }
            
            // ✅ Si no, crear al hacer foco (UNA SOLA VEZ)
            textarea.addEventListener('focus', function handler() {
                if (!this.closest('.intervencion-combobox')) {
                    crearComboboxIntervenciones(this);
                    this.closest('div').classList.add('intervencion-combobox');
                }
                // Remover el handler después de crear
                this.removeEventListener('focus', handler);
            });
        });
    }







    function obtenerTipoActividad(nombreIntervencion) {
        if (!nombreIntervencion) return '';
        const encontrado = INTERVENCIONES.find(item => item.nombre === nombreIntervencion);
        return encontrado ? encontrado.tipo : '';
    }

    function calcularDuracion(entrada, salida) {
        if (!entrada || !salida) return '';
        const [h1, m1] = entrada.split(':').map(Number);
        const [h2, m2] = salida.split(':').map(Number);
        if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return '';
        let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (minutos < 0) minutos += 1440;
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    function ajustarInputs() {
        document.querySelectorAll('.input-auto').forEach(input => {
            if (input.closest('.col-intervencion')) return;
            const val = input.value || input.placeholder || ' ';
            const temp = document.createElement('span');
            temp.style.visibility = 'hidden';
            temp.style.position = 'absolute';
            temp.style.fontSize = window.getComputedStyle(input).fontSize;
            temp.style.fontFamily = window.getComputedStyle(input).fontFamily;
            temp.style.padding = '2px 4px';
            temp.style.border = '1px solid transparent';
            temp.style.whiteSpace = 'pre';
            temp.textContent = val;
            document.body.appendChild(temp);
            const ancho = Math.max(25, temp.offsetWidth + 14);
            document.body.removeChild(temp);
            input.style.width = ancho + 'px';
        });
    }

    function crearFilaVacia() {
        const obj = {};
        COLS.forEach(col => {
            if (col === 'FECHA') obj[col] = '';
            else if (col === 'ESTADO_DE_IQx') obj[col] = 'Seleccione';
            else if (col === 'Especialidad') obj[col] = 'Seleccione';
            else if (col === 'Tipo_Actividad') obj[col] = '';
            else if (col === 'Tipo_Actividad_2') obj[col] = '';
            else if (col === 'Tipo_Actividad_3') obj[col] = '';
            else if (col === 'DESTINO') obj[col] = 'Seleccione';
            else obj[col] = '';
        });
        return obj;
    }

    function construirSemana() {
        const semana = [];
        DIAS.forEach((dia) => {
            const dayObj = { dia, pabs: {} };
            PABS.forEach((pab) => {
                const rows = [];
                for (let i = 0; i < FILAS_INICIALES; i++) {
                    rows.push(crearFilaVacia());
                }
                dayObj.pabs[pab] = rows;
            });
            semana.push(dayObj);
        });
        return semana;
    }

    let semanas = [];
    for (let w = 0; w < 5; w++) {
        semanas.push(construirSemana());
    }

    let currentWeek = 0;
    let currentDay = 0;

    const weekContent = document.getElementById('weekContent');
    const tabContainer = document.getElementById('tabContainer');