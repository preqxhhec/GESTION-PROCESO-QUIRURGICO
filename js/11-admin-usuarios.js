

    // =============================================================
    // 👥 GESTIÓN DE USUARIOS
    // =============================================================
    let usuariosCache = {};

    // -------------------------------------------------------------
    // 🆕 CREAR USUARIO SIN CERRAR LA SESIÓN DEL ADMINISTRADOR
    // -------------------------------------------------------------
    // auth.createUserWithEmailAndPassword() en la instancia PRINCIPAL de
    // Firebase Auth inicia sesión automáticamente como el usuario recién
    // creado — eso cerraba (reemplazaba) la sesión del administrador que
    // lo estaba creando, dejándolo "afuera" de su propia cuenta. La forma
    // estándar de evitarlo sin backend propio es crear el usuario en una
    // instancia SECUNDARIA de Firebase (mismo proyecto, apenas un nombre
    // distinto): el login automático pasa ahí, sin tocar auth.currentUser
    // de la instancia principal donde sigue conectado el administrador.
    let appSecundariaCrearUsuario = null;
    async function crearUsuarioSinCerrarSesion(email, password) {
        if (!appSecundariaCrearUsuario) {
            appSecundariaCrearUsuario = firebase.initializeApp(firebaseConfig, 'CrearUsuarioSecundaria');
        }
        const authSecundaria = appSecundariaCrearUsuario.auth();
        const userCredential = await authSecundaria.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await authSecundaria.signOut();
        return user;
    }

    async function cargarUsuarios() {
        const contenedor = document.getElementById('usuariosLista');
        if (!contenedor) return;

        try {
            const snapshot = await database.ref('usuarios').once('value');
            const data = snapshot.val();

            if (!data) {
                contenedor.innerHTML = `
                    <p style="color:#94a3b8; text-align:center; padding:20px;">No hay usuarios registrados.</p>
                `;
                return;
            }

            let html = `
                <div class="table-wrap" style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                        <thead>
                            <tr style="background:#f8fafc;">
                                <th style="padding:8px 10px; text-align:left; border-bottom:2px solid #e2e8f0;">Email</th>
                                <th style="padding:8px 10px; text-align:center; border-bottom:2px solid #e2e8f0;">Rol</th>
                                <th style="padding:8px 10px; text-align:center; border-bottom:2px solid #e2e8f0;">Estado</th>
                                <th style="padding:8px 10px; text-align:center; border-bottom:2px solid #e2e8f0;">Permisos</th>
                                <th style="padding:8px 10px; text-align:center; border-bottom:2px solid #e2e8f0;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            usuariosCache = data;

            Object.keys(data).forEach(uid => {
                const user = data[uid];
                const email = user.email || 'Sin email';
                const rol = user.rol || 'usuario';
                const activo = user.activo !== false;
                const esUsuarioActual = uid === currentUser.uid;

                html += `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px 10px; text-align:left;">
                            ${email}
                            ${esUsuarioActual ? ' <span style="font-size:0.6rem; background:#e8f4fd; padding:2px 8px; border-radius:10px; color:#1e293b;">(tú)</span>' : ''}
                        </td>
                        <td style="padding:8px 10px; text-align:center;">
                            <select class="cambiar-rol" data-uid="${uid}" style="padding:4px 8px; border:1px solid #d1d9e6; border-radius:4px; font-size:0.75rem; ${esUsuarioActual ? 'disabled' : ''}">
                                <option value="usuario" ${rol === 'usuario' ? 'selected' : ''}>Usuario</option>
                                <option value="administrador" ${rol === 'administrador' ? 'selected' : ''}>Administrador</option>
                                <option value="superadministrador" ${rol === 'superadministrador' ? 'selected' : ''}>👑 Superadministrador</option>
                            </select>
                        </td>
                        <td style="padding:8px 10px; text-align:center;">
                            ${esUsuarioActual ?
                                '<span style="color:#64748b;">-</span>' :
                                `<button class="btn-toggle-estado" data-uid="${uid}" data-activo="${activo}" style="padding:4px 12px; border:none; border-radius:20px; cursor:pointer; font-size:0.7rem; font-weight:500; ${activo ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#991b1b;'}">
                                    ${activo ? '✅ Activo' : '❌ Bloqueado'}
                                </button>`
                            }
                        </td>
                        <td style="padding:8px 10px; text-align:center;">
                            ${rol === 'administrador' || rol === 'superadministrador' ?
                                '<span style="color:#94a3b8; font-size:0.7rem;">Acceso total</span>' :
                                `<button class="btn-editar-permisos" data-uid="${uid}" style="background:transparent; border:1px solid #1a6d8a; border-radius:4px; padding:2px 10px; cursor:pointer; color:#1a6d8a; font-size:0.75rem;">🔐 Permisos</button>`
                            }
                        </td>
                        <td style="padding:8px 10px; text-align:center; white-space:nowrap;">
                            <button class="btn-ver-bitacora" data-uid="${uid}" data-email="${email}" title="Ver bitácora de accesos" style="background:transparent; border:1px solid #64748b; border-radius:4px; padding:2px 8px; cursor:pointer; color:#64748b; font-size:0.8rem; margin-right:4px;">🕐</button>
                            ${esUsuarioActual ?
                                '<span style="color:#94a3b8; font-size:0.7rem;">No puedes modificarte</span>' :
                                `<button class="btn-eliminar-usuario" data-uid="${uid}" data-email="${email}" style="background:transparent; border:1px solid #ef4444; border-radius:4px; padding:2px 8px; cursor:pointer; color:#ef4444; font-size:0.8rem;">🗑️</button>`
                            }
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            contenedor.innerHTML = html;

            document.querySelectorAll('.cambiar-rol').forEach(select => {
                select.addEventListener('change', function() {
                    const uid = this.dataset.uid;
                    const nuevoRol = this.value;
                    cambiarRolUsuario(uid, nuevoRol);
                });
            });

            document.querySelectorAll('.btn-toggle-estado').forEach(btn => {
                btn.addEventListener('click', function() {
                    const uid = this.dataset.uid;
                    const estadoActual = this.dataset.activo === 'true';
                    toggleEstadoUsuario(uid, estadoActual);
                });
            });

            document.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
                btn.addEventListener('click', function() {
                    const uid = this.dataset.uid;
                    const email = this.dataset.email;
                    eliminarUsuario(uid, email);
                });
            });

            document.querySelectorAll('.btn-editar-permisos').forEach(btn => {
                btn.addEventListener('click', function() {
                    const uid = this.dataset.uid;
                    const user = usuariosCache[uid] || {};
                    mostrarModalEditarPermisos(uid, user.email || 'Sin email', user.secciones, !!user.soloLecturaTabla);
                });
            });

            document.querySelectorAll('.btn-ver-bitacora').forEach(btn => {
                btn.addEventListener('click', function() {
                    const uid = this.dataset.uid;
                    const email = this.dataset.email;
                    mostrarBitacoraUsuario(uid, email);
                });
            });

        } catch (error) {
            console.error('❌ Error al cargar usuarios:', error);
            contenedor.innerHTML = `
                <p style="color:#dc2626; text-align:center; padding:20px;">Error al cargar usuarios. Intenta nuevamente.</p>
            `;
        }
    }

    async function cambiarRolUsuario(uid, nuevoRol) {
        if (!currentUser || !esSuperAdministrador()) {
            showModal({
                title: '⛔ Acceso denegado',
                message: 'Solo el superadministrador puede cambiar roles.',
                icon: '⛔',
                confirmText: 'Aceptar'
            });
            return;
        }

        try {
            await database.ref('usuarios/' + uid + '/rol').set(nuevoRol);
            showModal({
                title: '✅ Rol actualizado',
                message: `El rol ha sido cambiado a <strong>${nuevoRol}</strong>.`,
                icon: '✅',
                confirmText: 'Aceptar'
            });
            cargarUsuarios();
        } catch (error) {
            console.error('❌ Error al cambiar rol:', error);
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al cambiar el rol.<br>Intenta nuevamente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
    }

    async function toggleEstadoUsuario(uid, estadoActual) {
        if (!currentUser || !esSuperAdministrador()) {
            showModal({
                title: '⛔ Acceso denegado',
                message: 'Solo el superadministrador puede bloquear/activar usuarios.',
                icon: '⛔',
                confirmText: 'Aceptar'
            });
            return;
        }

        const nuevoEstado = !estadoActual;
        const accion = nuevoEstado ? 'activar' : 'bloquear';

        const confirmado = await showModal({
            title: `⚠️ ${accion === 'activar' ? 'Activar' : 'Bloquear'} usuario`,
            message: `¿Estás seguro de que deseas <strong>${accion}</strong> este usuario?`,
            icon: '⚠️',
            confirmText: `✅ ${accion === 'activar' ? 'Activar' : 'Bloquear'}`,
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (!confirmado) return;

        try {
            await database.ref('usuarios/' + uid + '/activo').set(nuevoEstado);
            showModal({
                title: '✅ Usuario actualizado',
                message: `El usuario ha sido <strong>${accion}ado</strong> correctamente.`,
                icon: '✅',
                confirmText: 'Aceptar'
            });
            cargarUsuarios();
        } catch (error) {
            console.error('❌ Error al cambiar estado:', error);
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al cambiar el estado.<br>Intenta nuevamente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
    }

    // =============================================================
    // 🕐 BITÁCORA DE ACCESOS — muestra los últimos inicios de sesión de un
    // usuario (guardados en bitacora_accesos/{uid} por
    // registrarInicioSesionBitacora() en js/15-navegacion-y-autenticacion.js).
    // =============================================================
    async function mostrarBitacoraUsuario(uid, email) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:520px; text-align:left;">
                <span class="modal-icon" style="text-align:center; display:block;">🕐</span>
                <div class="modal-title" style="text-align:center;">Bitácora de Accesos</div>
                <div class="modal-message" style="text-align:center; margin-bottom:12px;">${email}</div>
                <div id="bitacoraListaWrap" style="max-height:360px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:10px; padding:4px;">
                    <p style="text-align:center; color:#94a3b8; padding:20px;">⏳ Cargando...</p>
                </div>
                <div class="modal-actions" style="margin-top:16px;">
                    <button class="modal-btn modal-btn-cancel" id="bitacoraCerrar">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#bitacoraCerrar').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) overlay.remove();
        });

        const wrap = overlay.querySelector('#bitacoraListaWrap');
        try {
            const snapshot = await database.ref('bitacora_accesos/' + uid).limitToLast(50).once('value');
            const data = snapshot.val();

            if (!data) {
                wrap.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">Sin registros de acceso todavía.</p>';
                return;
            }

            const entradas = Object.values(data).sort((a, b) => (b.fecha_hora || 0) - (a.fecha_hora || 0));

            let html = `<table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:6px 8px; text-align:left; border-bottom:1px solid #e2e8f0;">Fecha y hora</th>
                        <th style="padding:6px 8px; text-align:left; border-bottom:1px solid #e2e8f0;">Dispositivo</th>
                    </tr>
                </thead>
                <tbody>`;

            entradas.forEach(entrada => {
                const fecha = entrada.fecha_hora ? new Date(entrada.fecha_hora).toLocaleString('es-CL') : '—';
                const dispositivo = entrada.dispositivo || '—';
                const dispositivoCorto = dispositivo.length > 55 ? dispositivo.slice(0, 55) + '…' : dispositivo;
                html += `<tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:6px 8px; white-space:nowrap;">${fecha}</td>
                    <td style="padding:6px 8px; color:#64748b;" title="${dispositivo.replace(/"/g, '&quot;')}">${dispositivoCorto}</td>
                </tr>`;
            });

            html += `</tbody></table>`;
            wrap.innerHTML = html;

        } catch (error) {
            console.error('❌ Error al cargar la bitácora de accesos:', error);
            wrap.innerHTML = '<p style="text-align:center; color:#dc2626; padding:20px;">Error al cargar la bitácora.</p>';
        }
    }

    async function eliminarUsuario(uid, email) {
        if (!currentUser || !esSuperAdministrador()) {
            showModal({
                title: '⛔ Acceso denegado',
                message: 'Solo el superadministrador puede eliminar usuarios.',
                icon: '⛔',
                confirmText: 'Aceptar'
            });
            return;
        }

        const confirmado = await showModal({
            title: '🗑️ Eliminar usuario',
            message: `¿Estás seguro de que deseas eliminar al usuario <strong>${email}</strong>?<br><br><strong>Esta acción no se puede deshacer.</strong>`,
            icon: '🗑️',
            confirmText: '✅ Eliminar',
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (!confirmado) return;

        try {
            await database.ref('usuarios/' + uid).remove();

            showModal({
                title: '✅ Usuario eliminado',
                message: `El usuario <strong>${email}</strong> ha sido eliminado.`,
                icon: '✅',
                confirmText: 'Aceptar'
            });
            cargarUsuarios();
        } catch (error) {
            console.error('❌ Error al eliminar usuario:', error);
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al eliminar el usuario.<br>Intenta nuevamente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
    }

    function mostrarModalCrearUsuario() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width: 450px;">
                <span class="modal-icon">👤</span>
                <div class="modal-title">Crear Nuevo Usuario</div>
                <div class="modal-message">
                    Ingresa los datos del nuevo usuario:
                </div>
                <div style="text-align:left; margin-bottom:16px;">
                    <label style="font-size:0.8rem; font-weight:600; color:#475569; display:block; margin-bottom:4px;">Correo electrónico</label>
                    <input type="email" id="nuevoUsuarioEmail" placeholder="ejemplo@hospital.cl" style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.95rem; box-sizing:border-box;">
                    
                    <label style="font-size:0.8rem; font-weight:600; color:#475569; display:block; margin-top:12px; margin-bottom:4px;">Contraseña</label>
                    <input type="password" id="nuevoUsuarioPassword" placeholder="Mínimo 6 caracteres" style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.95rem; box-sizing:border-box;">
                    
                    <label style="font-size:0.8rem; font-weight:600; color:#475569; display:block; margin-top:12px; margin-bottom:4px;">Rol</label>
                    <select id="nuevoUsuarioRol" style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; font-size:0.95rem; box-sizing:border-box;">
                        <option value="usuario">Usuario</option>
                        <option value="administrador">Administrador</option>
                        <option value="superadministrador">👑 Superadministrador</option>
                    </select>

                    <div id="nuevoUsuarioPermisosWrap">
                        ${renderCheckboxesPermisos(null, false)}
                    </div>

                    <div id="nuevoUsuarioError" style="color:#dc2626; font-size:0.85rem; margin-top:8px; min-height:20px;"></div>
                </div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="crearUsuarioCancelar">Cancelar</button>
                    <button class="modal-btn modal-btn-success" id="crearUsuarioConfirmar">✅ Crear</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const emailInput = overlay.querySelector('#nuevoUsuarioEmail');
        const passInput = overlay.querySelector('#nuevoUsuarioPassword');
        const rolSelect = overlay.querySelector('#nuevoUsuarioRol');
        const errorDiv = overlay.querySelector('#nuevoUsuarioError');
        const confirmarBtn = overlay.querySelector('#crearUsuarioConfirmar');
        const cancelarBtn = overlay.querySelector('#crearUsuarioCancelar');
        const permisosWrap = overlay.querySelector('#nuevoUsuarioPermisosWrap');

        function actualizarVisibilidadPermisos() {
            permisosWrap.style.display = (rolSelect.value === 'administrador' || rolSelect.value === 'superadministrador') ? 'none' : 'block';
        }
        actualizarVisibilidadPermisos();
        rolSelect.addEventListener('change', actualizarVisibilidadPermisos);

        confirmarBtn.addEventListener('click', async function() {
            const email = emailInput.value.trim();
            const password = passInput.value.trim();
            const rol = rolSelect.value;

            if (!email) {
                errorDiv.textContent = '❌ Ingresa un correo electrónico';
                return;
            }
            if (!password || password.length < 6) {
                errorDiv.textContent = '❌ La contraseña debe tener al menos 6 caracteres';
                return;
            }

            errorDiv.textContent = '⏳ Creando usuario...';
            confirmarBtn.disabled = true;

            try {
                const user = await crearUsuarioSinCerrarSesion(email, password);

                const datosUsuario = {
                    email: email,
                    rol: rol,
                    activo: true,
                    creado_por: currentUserEmail,
                    fecha_creacion: firebase.database.ServerValue.TIMESTAMP
                };

                if (rol === 'usuario') {
                    const permisos = leerPermisosDesdeFormulario();
                    datosUsuario.secciones = permisos.secciones;
                    datosUsuario.soloLecturaTabla = permisos.soloLecturaTabla;
                }

                await database.ref('usuarios/' + user.uid).set(datosUsuario);

                showModal({
                    title: '✅ Usuario creado',
                    message: `El usuario <strong>${email}</strong> ha sido creado con rol <strong>${rol}</strong>.`,
                    icon: '✅',
                    confirmText: 'Aceptar'
                });

                const box = overlay.querySelector('.modal-box');
                box.classList.add('closing');
                overlay.classList.add('closing');
                setTimeout(() => overlay.remove(), 300);

                cargarUsuarios();

            } catch (error) {
                console.error('❌ Error al crear usuario:', error);
                let mensaje = '❌ Error al crear el usuario';
                if (error.code === 'auth/email-already-in-use') {
                    mensaje = '❌ Este correo ya está registrado';
                } else if (error.code === 'auth/invalid-email') {
                    mensaje = '❌ Correo electrónico inválido';
                } else if (error.code === 'auth/weak-password') {
                    mensaje = '❌ La contraseña es muy débil (mínimo 6 caracteres)';
                }
                errorDiv.textContent = mensaje;
                confirmarBtn.disabled = false;
            }
        });

        cancelarBtn.addEventListener('click', function() {
            const box = overlay.querySelector('.modal-box');
            box.classList.add('closing');
            overlay.classList.add('closing');
            setTimeout(() => overlay.remove(), 300);
        });

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                const box = overlay.querySelector('.modal-box');
                box.classList.add('closing');
                overlay.classList.add('closing');
                setTimeout(() => overlay.remove(), 300);
            }
        });
    }

    // =============================================================
    // 🔐 EDITAR PERMISOS DE UN USUARIO EXISTENTE
    // =============================================================
    function mostrarModalEditarPermisos(uid, email, seccionesActuales, soloLecturaActual) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width: 450px;">
                <span class="modal-icon">🔐</span>
                <div class="modal-title">Permisos de ${email}</div>
                <div style="text-align:left; margin-bottom:16px;">
                    ${renderCheckboxesPermisos(seccionesActuales, soloLecturaActual)}
                    <div id="editarPermisosError" style="color:#dc2626; font-size:0.85rem; margin-top:8px; min-height:20px;"></div>
                </div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="editarPermisosCancelar">Cancelar</button>
                    <button class="modal-btn modal-btn-success" id="editarPermisosConfirmar">💾 Guardar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        function cerrar() {
            const box = overlay.querySelector('.modal-box');
            box.classList.add('closing');
            overlay.classList.add('closing');
            setTimeout(() => overlay.remove(), 300);
        }

        overlay.querySelector('#editarPermisosConfirmar').addEventListener('click', async function() {
            const errorDiv = overlay.querySelector('#editarPermisosError');
            const btn = this;
            btn.disabled = true;
            errorDiv.textContent = '⏳ Guardando...';

            try {
                const { secciones, soloLecturaTabla } = leerPermisosDesdeFormulario();
                await guardarPermisosUsuario(uid, secciones, soloLecturaTabla);
                cerrar();
                cargarUsuarios();
            } catch (error) {
                console.error('❌ Error al guardar permisos:', error);
                errorDiv.textContent = '❌ Hubo un problema al guardar. Intenta nuevamente.';
                btn.disabled = false;
            }
        });

        overlay.querySelector('#editarPermisosCancelar').addEventListener('click', cerrar);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) cerrar();
        });
    }

    async function guardarPermisosUsuario(uid, secciones, soloLecturaTabla) {
        if (!currentUser || !esSuperAdministrador()) {
            showModal({
                title: '⛔ Acceso denegado',
                message: 'Solo el superadministrador puede editar permisos.',
                icon: '⛔',
                confirmText: 'Aceptar'
            });
            return;
        }

        await database.ref('usuarios/' + uid).update({
            secciones: secciones,
            soloLecturaTabla: soloLecturaTabla
        });
    }