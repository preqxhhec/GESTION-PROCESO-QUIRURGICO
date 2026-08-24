
    // =============================================================
    // 📋 GESTIÓN DE DESPLEGABLES FIJOS
    // =============================================================

    const DESPLEGABLES_CONFIG = {
        'Jornada': {
            label: 'Jornada',
            opciones: ['Seleccione', 'AM', 'PM'],
            ruta: 'desplegables/jornada'
        },
        'ESTADO_DE_IQx': {
            label: 'ESTADO DE IQx',
            opciones: [
                'Seleccione',
                'OPERADO (PROGRAMADO)',
                'OPERADO (AGREGADO)',
                'OPERADO (CONDICIONAL)',
                'OPERADO (PAD)',
                'SUSPENDIDO',
                'URGENCIA',
                'CONDICIONAL (NO OPERADO)',
                'PERIANALGESIA (PARTO)'
            ],
            ruta: 'desplegables/estado_iqx'
        },
        'DESTINO': {
            label: 'DESTINO',
            opciones: ['Seleccione', 'Hospitalizacion', 'CMA', 'UTI'],
            ruta: 'desplegables/destino'
        },
        'Especialidad': {
            label: 'Especialidad',
            opciones: [
                'Seleccione',
                'CIRUGÍA ADULTO',
                'CIRUGÍA INFANTIL',
                'GINECOLOGÍA',
                'MAXILOFACIAL',
                'ODONTOPEDIATRÍA',
                'OFTALMOLOGÍA',
                'ORL',
                'TRAUMATOLOGÍA',
                'UROLOGÍA',
                'OTRO'
            ],
            ruta: 'desplegables/especialidad'
        },
        'Anestesista': {
            label: 'Anestesista',
            opciones: ['Seleccione'],
            ruta: 'desplegables/anestesista'
        }
    };

    // =============================================================
    // 👨‍⚕️ MÉDICOS POR ESPECIALIDAD (campo "Cirujano" de la tabla)
    // A diferencia de los desplegables fijos de arriba, esta lista depende
    // de la Especialidad de cada fila: cada especialidad tiene su propia
    // lista de médicos, editable por separado desde el panel admin.
    // =============================================================
    let medicosPorEspecialidadCache = {};

    async function cargarMedicosPorEspecialidadCache() {
        try {
            const snapshot = await database.ref('desplegables/medicos_por_especialidad').once('value');
            medicosPorEspecialidadCache = snapshot.val() || {};
        } catch (error) {
            console.error('❌ Error al cargar médicos por especialidad:', error);
            medicosPorEspecialidadCache = {};
        }
    }

    function obtenerMedicosPorEspecialidadCache(especialidad) {
        if (!especialidad || especialidad === 'Seleccione') return [];
        return medicosPorEspecialidadCache[especialidad] || [];
    }

    let medicosEspecialidadSeleccionada = null;

    async function cargarMedicosPorEspecialidad() {
        const contenedor = document.getElementById('medicosEspecialidadLista');
        if (!contenedor) return;

        try {
            const especialidades = (desplegablesCache['Especialidad'] || DESPLEGABLES_CONFIG['Especialidad'].opciones)
                .filter(e => e !== 'Seleccione');

            if (!medicosEspecialidadSeleccionada || !especialidades.includes(medicosEspecialidadSeleccionada)) {
                medicosEspecialidadSeleccionada = especialidades[0] || null;
            }

            const snapshot = await database.ref('desplegables/medicos_por_especialidad').once('value');
            medicosPorEspecialidadCache = snapshot.val() || {};

            const medicos = medicosEspecialidadSeleccionada ? (medicosPorEspecialidadCache[medicosEspecialidadSeleccionada] || []) : [];

            let html = `
                <select id="medicosEspecialidadSelector" style="width:100%; padding:6px 8px; border:1px solid #d1d9e6; border-radius:6px; font-size:0.8rem; margin-bottom:10px;">
                    ${especialidades.map(e => `<option value="${e}" ${e === medicosEspecialidadSeleccionada ? 'selected' : ''}>${e}</option>`).join('')}
                </select>
                <div style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; padding:12px;">
                    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">
                        ${medicos.length ? medicos.map(m => `
                            <span style="background:#e2e8f0; padding:2px 10px; border-radius:12px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">
                                ${m}
                                <button class="btn-eliminar-medico" data-medico="${m}" style="background:transparent; border:none; cursor:pointer; color:#ef4444; font-size:0.7rem; padding:0 2px;">✕</button>
                            </span>
                        `).join('') : '<span style="font-size:0.75rem; color:#94a3b8;">Sin médicos registrados para esta especialidad.</span>'}
                    </div>
                    <div style="display:flex; gap:4px;">
                        <input type="text" id="nuevoMedicoEspecialidad" placeholder="Nombre del médico..." style="flex:1; padding:4px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem;">
                        <button id="btnAgregarMedicoEspecialidad" style="background:#1e293b; color:white; border:none; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:0.7rem;">+</button>
                    </div>
                </div>
            `;
            contenedor.innerHTML = html;

            document.getElementById('medicosEspecialidadSelector').addEventListener('change', function() {
                medicosEspecialidadSeleccionada = this.value;
                cargarMedicosPorEspecialidad();
            });

            document.getElementById('btnAgregarMedicoEspecialidad').addEventListener('click', function() {
                const input = document.getElementById('nuevoMedicoEspecialidad');
                const valor = input.value.trim();
                if (valor) agregarMedicoEspecialidad(medicosEspecialidadSeleccionada, valor);
            });

            document.getElementById('nuevoMedicoEspecialidad').addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    const valor = this.value.trim();
                    if (valor) agregarMedicoEspecialidad(medicosEspecialidadSeleccionada, valor);
                }
            });

            contenedor.querySelectorAll('.btn-eliminar-medico').forEach(btn => {
                btn.addEventListener('click', function() {
                    eliminarMedicoEspecialidad(medicosEspecialidadSeleccionada, this.dataset.medico);
                });
            });

        } catch (error) {
            console.error('❌ Error al cargar médicos por especialidad:', error);
            contenedor.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">Error al cargar médicos. Intenta nuevamente.</p>`;
        }
    }

    async function agregarMedicoEspecialidad(especialidad, nombre) {
        if (!currentUser || !esSuperAdministrador()) {
            showModal({ title: '⛔ Acceso denegado', message: 'Solo el superadministrador puede modificar la lista de médicos.', icon: '⛔', confirmText: 'Aceptar' });
            return;
        }
        if (!especialidad) return;

        try {
            const ref = database.ref('desplegables/medicos_por_especialidad/' + especialidad);
            const snapshot = await ref.once('value');
            let medicos = snapshot.val() || [];

            if (medicos.includes(nombre)) {
                showModal({ title: '⚠️ Médico duplicado', message: `<strong>${nombre}</strong> ya está en la lista de ${especialidad}.`, icon: '⚠️', confirmText: 'Aceptar' });
                return;
            }

            medicos.push(nombre);
            await ref.set(medicos);
            medicosPorEspecialidadCache[especialidad] = medicos;

            cargarMedicosPorEspecialidad();
            if (seccionActiva === 'registro') renderWeekView();

        } catch (error) {
            console.error('❌ Error al agregar médico:', error);
            showModal({ title: '❌ Error', message: 'Hubo un problema al agregar el médico.<br>Intenta nuevamente.', icon: '❌', confirmText: 'Aceptar' });
        }
    }

    async function eliminarMedicoEspecialidad(especialidad, nombre) {
        if (!currentUser || !esSuperAdministrador()) {
            showModal({ title: '⛔ Acceso denegado', message: 'Solo el superadministrador puede modificar la lista de médicos.', icon: '⛔', confirmText: 'Aceptar' });
            return;
        }
        if (!especialidad) return;

        const confirmado = await showModal({
            title: '🗑️ Eliminar médico',
            message: `¿Estás seguro de eliminar a <strong>${nombre}</strong> de la lista de <strong>${especialidad}</strong>?`,
            icon: '🗑️',
            confirmText: '✅ Eliminar',
            cancelText: 'Cancelar',
            type: 'danger'
        });
        if (!confirmado) return;

        try {
            const ref = database.ref('desplegables/medicos_por_especialidad/' + especialidad);
            const snapshot = await ref.once('value');
            let medicos = (snapshot.val() || []).filter(m => m !== nombre);
            await ref.set(medicos);
            medicosPorEspecialidadCache[especialidad] = medicos;

            cargarMedicosPorEspecialidad();
            if (seccionActiva === 'registro') renderWeekView();

        } catch (error) {
            console.error('❌ Error al eliminar médico:', error);
            showModal({ title: '❌ Error', message: 'Hubo un problema al eliminar el médico.<br>Intenta nuevamente.', icon: '❌', confirmText: 'Aceptar' });
        }
    }

    async function cargarDesplegables() {
        const contenedor = document.getElementById('desplegablesLista');
        if (!contenedor) return;

        try {
            const snapshot = await database.ref('desplegables').once('value');
            const data = snapshot.val();

            let html = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            `;

            Object.keys(DESPLEGABLES_CONFIG).forEach(key => {
                const config = DESPLEGABLES_CONFIG[key];
                const opciones = data && data[key] ? data[key] : config.opciones;

                html += `
                    <div style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; padding:12px;">
                        <div style="font-weight:600; font-size:0.85rem; margin-bottom:8px; color:#1e293b;">${config.label}</div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">
                            ${opciones.map((opt, idx) => `
                                <span style="background:#e2e8f0; padding:2px 10px; border-radius:12px; font-size:0.7rem; display:inline-flex; align-items:center; gap:4px;">
                                    ${opt}
                                    ${idx > 0 ? `<button class="btn-eliminar-opcion" data-desplegable="${key}" data-opcion="${opt}" style="background:transparent; border:none; cursor:pointer; color:#ef4444; font-size:0.7rem; padding:0 2px;">✕</button>` : ''}
                                </span>
                            `).join('')}
                        </div>
                        <div style="display:flex; gap:4px;">
                            <input type="text" id="nuevaOpcion_${key}" placeholder="Nueva opción..." style="flex:1; padding:4px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem;">
                            <button class="btn-agregar-opcion" data-desplegable="${key}" style="background:#1e293b; color:white; border:none; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:0.7rem;">+</button>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
            contenedor.innerHTML = html;

            document.querySelectorAll('.btn-agregar-opcion').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.dataset.desplegable;
                    const input = document.getElementById(`nuevaOpcion_${key}`);
                    const valor = input.value.trim();
                    if (valor) {
                        agregarOpcionDesplegable(key, valor);
                    }
                });
            });

            document.querySelectorAll('.btn-eliminar-opcion').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.dataset.desplegable;
                    const opcion = this.dataset.opcion;
                    eliminarOpcionDesplegable(key, opcion);
                });
            });

            document.querySelectorAll('[id^="nuevaOpcion_"]').forEach(input => {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        const key = this.id.replace('nuevaOpcion_', '');
                        const valor = this.value.trim();
                        if (valor) {
                            agregarOpcionDesplegable(key, valor);
                        }
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error al cargar desplegables:', error);
            contenedor.innerHTML = `
                <p style="color:#dc2626; text-align:center; padding:20px;">Error al cargar desplegables. Intenta nuevamente.</p>
            `;
        }
    }

    async function agregarOpcionDesplegable(key, valor) {
    if (!currentUser || !esSuperAdministrador()) {
        showModal({
            title: '⛔ Acceso denegado',
            message: 'Solo el superadministrador puede modificar desplegables.',
            icon: '⛔',
            confirmText: 'Aceptar'
        });
        return;
    }

    try {
        const snapshot = await database.ref('desplegables/' + key).once('value');
        let opciones = snapshot.val() || DESPLEGABLES_CONFIG[key].opciones;

        if (opciones.includes(valor)) {
            showModal({
                title: '⚠️ Opción duplicada',
                message: `La opción <strong>${valor}</strong> ya existe.`,
                icon: '⚠️',
                confirmText: 'Aceptar'
            });
            return;
        }

        opciones.push(valor);
        await database.ref('desplegables/' + key).set(opciones);

        // ✅ ACTUALIZAR CACHÉ LOCAL
        desplegablesCache[key] = opciones;
        console.log(`✅ Caché actualizado para ${key}:`, opciones);

        showModal({
            title: '✅ Opción agregada',
            message: `Se agregó <strong>${valor}</strong> a <strong>${DESPLEGABLES_CONFIG[key].label}</strong>.`,
            icon: '✅',
            confirmText: 'Aceptar'
        });

        cargarDesplegables();
        
        // ✅ RECARGAR LA TABLA CON LAS NUEVAS OPCIONES
        if (seccionActiva === 'registro') {
            renderWeekView();
        }

    } catch (error) {
        console.error('❌ Error al agregar opción:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al agregar la opción.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}

    async function eliminarOpcionDesplegable(key, opcion) {
    if (!currentUser || !esSuperAdministrador()) {
        showModal({
            title: '⛔ Acceso denegado',
            message: 'Solo el superadministrador puede modificar desplegables.',
            icon: '⛔',
            confirmText: 'Aceptar'
        });
        return;
    }

    const confirmado = await showModal({
        title: '🗑️ Eliminar opción',
        message: `¿Estás seguro de eliminar <strong>${opcion}</strong> de <strong>${DESPLEGABLES_CONFIG[key].label}</strong>?`,
        icon: '🗑️',
        confirmText: '✅ Eliminar',
        cancelText: 'Cancelar',
        type: 'danger'
    });

    if (!confirmado) return;

    try {
        const snapshot = await database.ref('desplegables/' + key).once('value');
        let opciones = snapshot.val() || DESPLEGABLES_CONFIG[key].opciones;

        opciones = opciones.filter(opt => opt !== opcion);
        await database.ref('desplegables/' + key).set(opciones);

        // ✅ ACTUALIZAR CACHÉ LOCAL
        desplegablesCache[key] = opciones;
        console.log(`✅ Caché actualizado para ${key}:`, opciones);

        showModal({
            title: '✅ Opción eliminada',
            message: `Se eliminó <strong>${opcion}</strong> de <strong>${DESPLEGABLES_CONFIG[key].label}</strong>.`,
            icon: '✅',
            confirmText: 'Aceptar'
        });

        cargarDesplegables();
        
        // ✅ RECARGAR LA TABLA CON LAS NUEVAS OPCIONES
        if (seccionActiva === 'registro') {
            renderWeekView();
        }

    } catch (error) {
        console.error('❌ Error al eliminar opción:', error);
        showModal({
            title: '❌ Error',
            message: 'Hubo un problema al eliminar la opción.<br>Intenta nuevamente.',
            icon: '❌',
            confirmText: 'Aceptar'
        });
    }
}

    async function precargarDesplegables() {
        try {
            const snapshot = await database.ref('desplegables').once('value');
            const data = snapshot.val();

            if (data) return;

            for (const key of Object.keys(DESPLEGABLES_CONFIG)) {
                await database.ref('desplegables/' + key).set(DESPLEGABLES_CONFIG[key].opciones);
            }
            console.log('✅ Desplegables precargados en Firebase');
        } catch (error) {
            console.error('❌ Error al precargar desplegables:', error);
        }
    }

   async function obtenerOpcionesDesplegable(key) {
    // ✅ Primero intentar usar el caché
    if (desplegablesCache[key]) {
        return desplegablesCache[key];
    }
    
    // Si no está en caché, cargar desde Firebase
    try {
        const snapshot = await database.ref('desplegables/' + key).once('value');
        const data = snapshot.val();
        
        if (data && Array.isArray(data) && data.length > 0) {
            desplegablesCache[key] = data;
            return data;
        }
        
        desplegablesCache[key] = DESPLEGABLES_CONFIG[key]?.opciones || ['Seleccione'];
        return desplegablesCache[key];
        
    } catch (error) {
        console.error('❌ Error al obtener opciones:', error);
        desplegablesCache[key] = DESPLEGABLES_CONFIG[key]?.opciones || ['Seleccione'];
        return desplegablesCache[key];
    }
}