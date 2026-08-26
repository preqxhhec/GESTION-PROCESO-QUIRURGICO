// =============================================================
// 🩺 LISTA DE ESPERA — MÓDULO 2: ALTA / EDICIÓN DE PACIENTE
// =============================================================
// Portado desde "LISTA DE ESPERA APP/script.js" (formulario "Nuevo
// Paciente" + guardado/actualización con historial inteligente).
//
// Diferencia estructural clave frente al original: allá el formulario era
// HTML estático presente desde el <body>, así que sus listeners se
// agregaban una sola vez en carga de página. Acá el HTML se construye e
// inyecta recién cuando el usuario entra a la sub-sección "Nuevo Paciente"
// (ver js/30), así que leInicializarSeccionNuevoPaciente() reconstruye el
// HTML y vuelve a enganchar los listeners cada vez que se muestra —mismo
// patrón que ya usa el resto de esta app integrada para sus secciones
// dinámicas (cargarPacientesDiferidos(), cargarEstadisticas(), etc.)—.
//
// `currentUserRole === 'admin'` no aplica acá (este formulario es visible
// para cualquiera con acceso a la sección 'listaEspera'), así que no hubo
// nada que reemplazar por esAdministrador()/esSuperAdministrador() en este
// archivo en particular.
// =============================================================

let isSubmittingPaciente = false; // bloqueo contra doble clic en Guardar

function leRenderNuevoPacienteHTML() {
    return `
        <h2 style="margin-bottom:16px;">Ingreso de Nuevo Paciente</h2>
        <form id="patientForm" class="patient-form">
            <h3 class="form-section-title">📋 1. Datos Administrativos</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>ID (Automático)</label>
                    <input type="text" id="patientId" readonly>
                </div>
                <div class="form-group">
                    <label>Estatus Tabla</label>
                    <select id="estatusTabla" required></select>
                </div>
                <div class="form-group">
                    <label>Folio</label>
                    <input type="text" id="folio">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Fecha Indicación Qx</label>
                    <input type="date" id="fechaIndQx" required>
                </div>
                <div class="form-group">
                    <label>T. Espera (días)</label>
                    <input type="number" id="tEspera" readonly>
                </div>
            </div>

            <h3 class="form-section-title">👤 2. Datos del Paciente</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre y Apellido</label>
                    <input type="text" id="nombreApellido" required style="text-transform: uppercase;">
                </div>
                <div class="form-group">
                    <label>RUT</label>
                    <input type="text" id="rut" placeholder="12.345.678-9" maxlength="12"
                           onkeyup="this.value = formatRut(this.value)"
                           onblur="this.value = formatRut(this.value)" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Fecha de Nacimiento</label>
                    <input type="date" id="fechaNac" required>
                </div>
                <div class="form-group">
                    <label>Edad</label>
                    <input type="number" id="edad" readonly>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Comuna</label>
                    <select id="comuna" required></select>
                </div>
                <div class="form-group">
                    <label>Dirección</label>
                    <input type="text" id="direccion">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>N° Contacto</label>
                    <input type="tel" id="nContacto">
                </div>
                <div class="form-group">
                    <label>E-mail</label>
                    <input type="email" id="emailPaciente">
                </div>
            </div>

            <h3 class="form-section-title">🩺 3. Datos Clínicos</h3>
            <div class="form-group">
                <label>Patologías Crónicas</label>
                <textarea id="patologiasCronicas" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>Medicamentos Crónicos</label>
                <textarea id="medicamentosCronicos" rows="2"></textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Especialidad</label>
                    <select id="especialidad" onchange="leFiltrarMedicosPorEspecialidad()" required></select>
                </div>
                <div class="form-group">
                    <label>Médico Tratante</label>
                    <select id="medicoTratante" required></select>
                </div>
            </div>

            <div class="form-group">
                <label>Diagnóstico (CIE-10)</label>
                <textarea id="diagnostico" rows="2" required></textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Intervención</label>
                    <input type="text" id="intervencion" required>
                </div>
                <div class="form-group">
                    <label>Lateralidad</label>
                    <select id="lateralidad"></select>
                </div>
            </div>

            <h3 class="form-section-title">🔬 4. Evaluación Preoperatoria</h3>
            <div class="form-row">
                <div class="form-group"><label>Estatus EPA</label><select id="estatusEpa"></select></div>
                <div class="form-group"><label>Fecha EPA</label><input type="date" id="fechaEpa"></div>
                <div class="form-group"><label>Anestesiólogo</label><select id="anestesiologo"></select></div>
            </div>

            <div class="form-row">
                <div class="form-group"><label>GES</label><select id="ges"></select></div>
                <div class="form-group"><label>TACO</label><select id="taco"></select></div>
                <div class="form-group"><label>ASA</label><select id="asa"></select></div>
            </div>

            <div class="form-row">
                <div class="form-group"><label>EKG</label><select id="ekg"></select></div>
                <div class="form-group"><label>RX</label><select id="rx"></select></div>
                <div class="form-group"><label>ECO</label><select id="eco"></select></div>
            </div>

            <h3 class="form-section-title">📅 5. Programación Quirúrgica</h3>
            <div class="form-row">
                <div class="form-group"><label>Prioridad</label><select id="prioridad"></select></div>
                <div class="form-group"><label>Fecha Estatus Program</label><input type="date" id="fechaEstatusProgram"></div>
                <div class="form-group"><label>Espera Program (días)</label><input type="number" id="esperaProgram" readonly></div>
            </div>

            <div class="form-group">
                <label>Fecha de Cirugía</label>
                <input type="date" id="fechaCirugia">
            </div>

            <h3 class="form-section-title">📝 6. Observaciones</h3>
            <div class="form-group">
                <label>Observaciones Generales</label>
                <textarea id="observaciones" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label>Indicaciones Anestesiólogo</label>
                <textarea id="indicacionesAnest" rows="3"></textarea>
            </div>

            <div class="form-group">
                <label>📞 Fecha Próximo Llamado</label>
                <input type="date" id="fechaProximoLlamado" style="width:100%; padding:10px;">
                <small style="color:#64748b;">Si se programa una fecha, aparecerá en la lista de llamados pendientes del Dashboard.</small>
            </div>

            <div style="display:flex; gap:15px; justify-content:center; margin-top:15px;">
                ${usuarioTieneAccesoSeccion('listaEspera_guardarPaciente') ? '<button type="submit" class="btn-primary" style="padding:10px 24px;">💾 Guardar Paciente</button>' : ''}
                <button type="button" id="btnCancelarEdicion" class="btn-secondary" style="padding:10px 24px; background:#64748b; display:none;">❌ Cancelar</button>
            </div>
        </form>
    `;
}

function leInicializarSeccionNuevoPaciente(container) {
    container.innerHTML = leRenderNuevoPacienteHTML();
    leCargarDesplegablesFormularioPaciente();

    document.getElementById('patientForm').addEventListener('submit', leGuardarPaciente);
    document.getElementById('btnCancelarEdicion').addEventListener('click', leCancelarEdicionPaciente);

    document.getElementById('fechaNac').addEventListener('change', () => {
        document.getElementById('edad').value = calculateAge(document.getElementById('fechaNac').value);
    });
    document.getElementById('fechaIndQx').addEventListener('change', () => {
        document.getElementById('tEspera').value = calculateWaitingDays(document.getElementById('fechaIndQx').value);
    });
    document.getElementById('fechaEstatusProgram').addEventListener('change', () => {
        document.getElementById('esperaProgram').value = calculateWaitingDays(document.getElementById('fechaEstatusProgram').value);
    });

    leSetupAutoFolioGES();

    const rutInput = document.getElementById('rut');
    if (rutInput) setupRutValidationLimpio(rutInput);

    // Si venimos de "Editar" (leEditarPacienteActual dejó currentPatientKey
    // seteado antes de cambiar a esta sub-sección), rellenar el formulario.
    if (currentPatientKey && currentModalPatient) {
        leRellenarFormularioParaEdicion();
    }
}

// Llena los selects que dependen de la taxonomía administrable (Estatus
// Tabla, Estatus EPA, Anestesiólogo, Comuna, Especialidad) más los fijos
// (GES/TACO/ASA/EKG/RX/ECO, Lateralidad, Prioridad).
function leCargarDesplegablesFormularioPaciente() {
    const estatusSelect = document.getElementById('estatusTabla');
    if (estatusSelect) {
        estatusSelect.innerHTML = '<option value="">Seleccionar Estatus</option>' +
            estatusTablaLista.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    }

    const estatusEpaSelect = document.getElementById('estatusEpa');
    if (estatusEpaSelect) {
        estatusEpaSelect.innerHTML = '<option value="">Seleccionar</option>' +
            estatusEpaLista.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    }

    const anestesiologoSelect = document.getElementById('anestesiologo');
    if (anestesiologoSelect) {
        anestesiologoSelect.innerHTML = '<option value="">Seleccionar Anestesiólogo</option>' +
            anestesiologosLista.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    }

    ['ges', 'taco', 'asa', 'ekg', 'rx', 'eco'].forEach(campo => {
        const select = document.getElementById(campo);
        if (select) {
            select.innerHTML = `
                <option value="">Seleccionar</option>
                <option value="SI">SI</option>
                <option value="NO">NO</option>
                <option value="NO APLICA">NO APLICA</option>
            `;
        }
    });

    const comunaSelect = document.getElementById('comuna');
    if (comunaSelect) {
        comunaSelect.innerHTML = '<option value="">Seleccionar Comuna</option>' +
            comunasLista.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    const especialidadSelect = document.getElementById('especialidad');
    if (especialidadSelect) {
        especialidadSelect.innerHTML = '<option value="">Seleccionar Especialidad</option>' +
            especialidadesLista.map(esp => `<option value="${esp}">${esp}</option>`).join('');
    }

    const lateralidadSelect = document.getElementById('lateralidad');
    if (lateralidadSelect) {
        lateralidadSelect.innerHTML = `
            <option value="NO APLICA">NO APLICA</option>
            <option value="DERECHA">DERECHA</option>
            <option value="IZQUIERDA">IZQUIERDA</option>
            <option value="BILATERAL">BILATERAL</option>
        `;
    }

    const prioridadSelect = document.getElementById('prioridad');
    if (prioridadSelect) {
        prioridadSelect.innerHTML = `
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
        `;
    }
}

function leFiltrarMedicosPorEspecialidad() {
    const especialidad = document.getElementById('especialidad').value;
    const medicoSelect = document.getElementById('medicoTratante');
    medicoSelect.innerHTML = '<option value="">Seleccionar Médico</option>';
    (especialistas[especialidad] || []).forEach(med => {
        const opt = document.createElement('option');
        opt.value = med;
        opt.textContent = med;
        medicoSelect.appendChild(opt);
    });
}

// Auto-relleno de Folio a "NO APLICA" (bloqueado) cuando GES = SI.
function leSetupAutoFolioGES() {
    const gesSelect = document.getElementById('ges');
    const folioInput = document.getElementById('folio');
    if (!gesSelect || !folioInput) return;

    gesSelect.addEventListener('change', () => {
        if (gesSelect.value === 'SI') {
            folioInput.value = 'NO APLICA';
            folioInput.readOnly = true;
            folioInput.style.backgroundColor = '#f3f4f6';
        } else {
            if (folioInput.value === 'NO APLICA') folioInput.value = '';
            folioInput.readOnly = false;
            folioInput.style.backgroundColor = '';
        }
    });
}

async function leGuardarPaciente(e) {
    e.preventDefault();

    // 🔘 Red de seguridad además de ocultar el botón (ver
    // leRenderNuevoPacienteHTML()): un <form> con un solo campo de texto
    // puede enviarse implícitamente con Enter aunque el botón no esté.
    if (!usuarioTieneAccesoSeccion('listaEspera_guardarPaciente')) {
        showModal({
            title: '⛔ Sin permiso',
            message: 'No tienes permiso para guardar pacientes en Lista de Espera.',
            icon: '⛔',
            confirmText: 'Aceptar'
        });
        return;
    }

    if (isSubmittingPaciente) return;

    const rutInput = document.getElementById('rut').value;
    const rutLimpio = rutInput ? rutInput.replace(/[^0-9kK]/g, '').toUpperCase() : '';

    if (!rutLimpio || !validarRutChileno(rutLimpio)) {
        alert("❌ El RUT es obligatorio y debe ser válido.");
        document.getElementById('rut').focus();
        return;
    }

    const rutFormateado = formatRut(rutLimpio);

    isSubmittingPaciente = true;
    leMostrarCargando();

    const patientData = {
        id: document.getElementById('patientId').value || Date.now().toString().slice(-6),
        estatusTabla: document.getElementById('estatusTabla').value,
        fechaIndQx: document.getElementById('fechaIndQx').value,
        nombreApellido: document.getElementById('nombreApellido').value.toUpperCase().trim(),
        rut: rutFormateado,
        fechaNac: document.getElementById('fechaNac').value,
        edad: parseInt(document.getElementById('edad').value) || 0,
        patologiasCronicas: document.getElementById('patologiasCronicas').value,
        medicamentosCronicos: document.getElementById('medicamentosCronicos').value,
        comuna: document.getElementById('comuna').value,
        direccion: document.getElementById('direccion').value,
        nContacto: document.getElementById('nContacto').value,
        emailPaciente: document.getElementById('emailPaciente').value,
        especialidad: document.getElementById('especialidad').value,
        medicoTratante: document.getElementById('medicoTratante').value,
        diagnostico: document.getElementById('diagnostico').value,
        lateralidad: document.getElementById('lateralidad').value,
        intervencion: document.getElementById('intervencion').value,
        estatusEpa: document.getElementById('estatusEpa').value,
        anestesiologo: document.getElementById('anestesiologo').value,
        fechaEpa: document.getElementById('fechaEpa').value,
        ges: document.getElementById('ges').value,
        taco: document.getElementById('taco').value,
        asa: document.getElementById('asa').value,
        ekg: document.getElementById('ekg').value,
        rx: document.getElementById('rx').value,
        eco: document.getElementById('eco').value,
        prioridad: document.getElementById('prioridad').value,
        observaciones: document.getElementById('observaciones').value,
        indicacionesAnest: document.getElementById('indicacionesAnest').value,
        folio: document.getElementById('folio').value,
        fechaEstatusProgram: document.getElementById('fechaEstatusProgram').value,
        fechaCirugia: document.getElementById('fechaCirugia').value,
        fechaProximoLlamado: document.getElementById('fechaProximoLlamado').value,
        registro: currentUserEmail || 'Sistema',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        if (currentPatientKey) {
            const oldData = currentModalPatient || {};
            let cambios = [];

            Object.keys(patientData).forEach(key => {
                if (['timestamp', 'registro'].includes(key)) return;
                const oldVal = (oldData[key] || '').toString().trim();
                const newVal = (patientData[key] || '').toString().trim();
                if (oldVal !== newVal) {
                    if (key === 'observaciones' || key === 'indicacionesAnest') {
                        const agregado = newVal.replace(oldVal, '').trim();
                        cambios.push(agregado ? `<strong>${key}</strong>: Se agregó: "${agregado}"` : `<strong>${key}</strong>: Texto modificado`);
                    } else {
                        cambios.push(`<strong>${key}</strong>: "${oldVal || 'vacío'}" → "${newVal || 'vacío'}"`);
                    }
                }
            });

            const descripcion = cambios.length > 0 ? `${cambios.length} campo(s) modificado(s)` : "Actualización general";

            await database.ref('patients/' + currentPatientKey).update(patientData);
            await database.ref('patients/' + currentPatientKey + '/historial').push({
                fecha: new Date().toISOString(),
                usuario: currentUserEmail || 'Sistema',
                accion: "Actualización",
                descripcion: descripcion,
                cambios: cambios.length > 0 ? cambios : null
            });

            alert("✅ Paciente actualizado correctamente");
        } else {
            const newRef = await database.ref('patients').push(patientData);
            currentPatientKey = newRef.key;

            await database.ref('patients/' + currentPatientKey + '/historial').push({
                fecha: new Date().toISOString(),
                usuario: currentUserEmail || 'Sistema',
                accion: "Creación",
                descripcion: "Paciente registrado por primera vez"
            });

            alert("✅ Paciente guardado correctamente");
        }

        leResetFormularioPaciente();
        currentPatientKey = null;
        currentModalPatient = null;
        leCambiarSubseccion('listaPacientes');

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    } finally {
        isSubmittingPaciente = false;
        leOcultarCargando();
    }
}

function leResetFormularioPaciente() {
    const form = document.getElementById('patientForm');
    if (form) form.reset();
    currentPatientKey = null;
    const btnCancelar = document.getElementById('btnCancelarEdicion');
    if (btnCancelar) btnCancelar.style.display = 'none';
}

function leCancelarEdicionPaciente() {
    if (!confirm("¿Cancelar la edición? Los cambios no guardados se perderán.")) return;
    leResetFormularioPaciente();
    currentPatientKey = null;
    currentModalPatient = null;
    leCambiarSubseccion('listaPacientes');
}

// Llamada desde el modal de detalle de paciente (js/25) para editar. Deja
// currentPatientKey/currentModalPatient seteados y cambia de sub-sección;
// leInicializarSeccionNuevoPaciente() detecta esto y llama a
// leRellenarFormularioParaEdicion().
function leEditarPacienteActual() {
    if (!currentModalPatient) return;
    currentPatientKey = currentModalPatient.firebaseKey;
    leCerrarModalPaciente();
    leCambiarSubseccion('nuevoPaciente');
}

function leRellenarFormularioParaEdicion() {
    const btnCancelar = document.getElementById('btnCancelarEdicion');
    if (btnCancelar) btnCancelar.style.display = 'inline-block';

    const campos = [
        'patientId', 'estatusTabla', 'fechaIndQx', 'nombreApellido', 'rut', 'fechaNac',
        'patologiasCronicas', 'medicamentosCronicos', 'comuna', 'direccion', 'nContacto',
        'emailPaciente', 'especialidad', 'medicoTratante', 'diagnostico', 'lateralidad',
        'intervencion', 'estatusEpa', 'anestesiologo', 'fechaEpa', 'ges', 'taco', 'asa',
        'ekg', 'rx', 'eco', 'prioridad', 'observaciones', 'indicacionesAnest', 'folio',
        'fechaEstatusProgram', 'fechaCirugia', 'fechaProximoLlamado'
    ];

    campos.forEach(key => {
        const elemento = document.getElementById(key);
        if (elemento) elemento.value = currentModalPatient[key] || '';
    });

    // 'patientId' del formulario en realidad guarda el campo "id" del
    // paciente (mismo comportamiento que el original).
    document.getElementById('patientId').value = currentModalPatient.id || '';

    const rutInput = document.getElementById('rut');
    if (rutInput) setupRutValidationLimpio(rutInput);

    if (currentModalPatient.especialidad) {
        leFiltrarMedicosPorEspecialidad();
        setTimeout(() => {
            const medicoSelect = document.getElementById('medicoTratante');
            if (medicoSelect) medicoSelect.value = currentModalPatient.medicoTratante || '';
        }, 100);
    }

    if (currentModalPatient.fechaNac) {
        document.getElementById('edad').value = calculateAge(currentModalPatient.fechaNac);
    }
    if (currentModalPatient.fechaIndQx) {
        document.getElementById('tEspera').value = calculateWaitingDays(currentModalPatient.fechaIndQx);
    }
    if (currentModalPatient.fechaEstatusProgram) {
        document.getElementById('esperaProgram').value = calculateWaitingDays(currentModalPatient.fechaEstatusProgram);
    }

    if (currentModalPatient.ges === 'SI') {
        const folioInput = document.getElementById('folio');
        if (folioInput) {
            folioInput.value = 'NO APLICA';
            folioInput.readOnly = true;
            folioInput.style.backgroundColor = '#f3f4f6';
        }
    }
}
