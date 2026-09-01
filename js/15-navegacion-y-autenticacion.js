    // =============================================================
    // 🧭 NAVEGACIÓN ENTRE SECCIONES
    // =============================================================

    function cambiarSeccion(seccion) {
        if (!weekContent || !diferidosContent || !libroContent) {
            console.error('❌ Elementos del DOM no encontrados');
            return;
        }

        if (!usuarioTieneAccesoSeccion(seccion)) {
            showModal({
                title: '⛔ Acceso denegado',
                message: 'No tienes permiso para acceder a esta sección.<br>Contacta al administrador si crees que esto es un error.',
                icon: '⛔',
                confirmText: 'Aceptar'
            });
            return;
        }

        // 🪟 Si vista dividida estaba activa (ej. el usuario hizo clic en una
        // sección normal del menú sin pasar por "Salir de Vista Dividida"),
        // hay que devolver los contenedores a su lugar ANTES de seguir —
        // si no, quedan atrapados dentro de los paneles mientras esta
        // función intenta mostrarlos/ocultarlos en su posición normal.
        if (vistaDivididaActiva) {
            restaurarContenedoresVistaDividida();
        }

        // 🔄 Solo la Tabla Quirúrgica y el Libro de Quirófano necesitan el
        // ancho de la vista horizontal (son las tablas con muchas columnas).
        // El resto de las secciones (Estadísticas, Diferidos, Admin, Manual,
        // Lista de Espera) ya se adaptan bien en vertical, así que no se les
        // exige girar — ver ".rotate-overlay" en styles.css, que solo se
        // muestra cuando este atributo coincide.
        document.body.setAttribute('data-seccion', seccion);

        weekContent.style.display = 'none';
        diferidosContent.style.display = 'none';
        libroContent.style.display = 'none';
        if (estadisticasContent) estadisticasContent.style.display = 'none';
        adminContent.style.display = 'none';
        manualContent.style.display = 'none';
        if (listaEsperaContent) listaEsperaContent.style.display = 'none';

        const tabContainer = document.getElementById('tabContainer');
        const daysGrid = document.querySelector('.days-grid');
        const weekContainer = document.querySelector('.week-container');

        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        if (seccion === 'registro') {
            weekContent.style.display = 'block';
            if (navRegistro) navRegistro.classList.add('active');
            seccionActiva = 'registro';
            if (tabContainer) tabContainer.style.display = 'flex';
            if (daysGrid) daysGrid.style.display = 'grid';
            if (weekContainer) weekContainer.style.display = 'block';
            renderWeekView();

        } else if (seccion === 'diferidos') {
            diferidosContent.style.display = 'block';
            if (navDiferidos) navDiferidos.classList.add('active');
            seccionActiva = 'diferidos';
            if (tabContainer) tabContainer.style.display = 'none';
            if (daysGrid) daysGrid.style.display = 'none';
            if (weekContainer) weekContainer.style.display = 'none';
            cargarPacientesDiferidos();

        } else if (seccion === 'libro') {
            libroContent.style.display = 'block';
            if (navLibro) navLibro.classList.add('active');
            seccionActiva = 'libro';
            if (tabContainer) tabContainer.style.display = 'none';
            if (daysGrid) daysGrid.style.display = 'none';
            if (weekContainer) weekContainer.style.display = 'none';
            cargarLibroQuirofano();

        } else if (seccion === 'estadisticas') {
            estadisticasContent.style.display = 'block';
            if (navEstadisticas) navEstadisticas.classList.add('active');
            seccionActiva = 'estadisticas';
            if (tabContainer) tabContainer.style.display = 'none';
            if (daysGrid) daysGrid.style.display = 'none';
            if (weekContainer) weekContainer.style.display = 'none';
            cargarEstadisticas();

        } else if (seccion === 'admin') {
            adminContent.style.display = 'block';
            if (navAdmin) navAdmin.classList.add('active');
            seccionActiva = 'admin';
            if (tabContainer) tabContainer.style.display = 'none';
            if (daysGrid) daysGrid.style.display = 'none';
            if (weekContainer) weekContainer.style.display = 'none';
            cargarAdmin();

        } else if (seccion === 'manual') {
            manualContent.style.display = 'block';
            if (navManual) navManual.classList.add('active');
            seccionActiva = 'manual';
            if (tabContainer) tabContainer.style.display = 'none';
            if (daysGrid) daysGrid.style.display = 'none';
            if (weekContainer) weekContainer.style.display = 'none';
            cargarManual();

        } else if (seccion === 'listaEspera') {
            if (listaEsperaContent) listaEsperaContent.style.display = 'block';
            if (navListaEspera) navListaEspera.classList.add('active');
            seccionActiva = 'listaEspera';
            if (tabContainer) tabContainer.style.display = 'none';
            if (daysGrid) daysGrid.style.display = 'none';
            if (weekContainer) weekContainer.style.display = 'none';
            leMostrarSeccionListaEspera();
}



        if (menuDropdown && menuToggle) {
            menuDropdown.classList.remove('open');
            menuToggle.classList.remove('active');
        }
    }

    // =============================================================
    // 🛡️ VERIFICAR SI EL USUARIO ES ADMINISTRADOR / SUPERADMINISTRADOR
    // El superadministrador conserva TODO lo que ya podía hacer un
    // administrador (por eso esAdministrador() es true para ambos) — lo
    // único exclusivo del superadministrador es el panel Administrador en
    // sí (ver usuarioTieneAccesoSeccion('admin') en js/20-permisos-usuario.js
    // y cargarAdmin() en js/09-diferidos-libro-admin.js).
    // =============================================================
    function esAdministrador() {
        if (typeof currentUserRol === 'undefined' || !currentUserRol) {
            return false;
        }
        return currentUserRol === 'administrador' || currentUserRol === 'superadministrador';
    }

    function esSuperAdministrador() {
        return currentUserRol === 'superadministrador';
    }

    // =============================================================
    // 🚪 CERRAR SESIÓN
    // =============================================================
    // Lógica real de cierre, sin el modal de confirmación — la usan tanto el
    // botón manual como el cierre automático por inactividad (más abajo),
    // para no duplicarla.
    async function cerrarSesionInterna() {
        detenerSincronizacionTiempoReal();
        detenerAutoSave();
        detenerTemporizadoresInactividad();
        await liberarSesionActiva();
        await auth.signOut();

        currentUser = null;
        currentUserEmail = '';
        currentUserRol = '';

        document.getElementById('userInfo').style.display = 'none';
        loginContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        appContainer.classList.remove('visible');
        loginEmail.value = '';
        loginPassword.value = '';
        loginStatus.textContent = '';

        document.getElementById('weekContent').innerHTML = '';
    }

    document.getElementById('logoutBtn').addEventListener('click', async function() {
        const confirmed = await showModal({
            title: '🚪 Cerrar Sesión',
            message: '¿Estás seguro de que deseas cerrar la sesión?<br>Los cambios no guardados se perderán.',
            icon: '🚪',
            confirmText: 'Sí, cerrar sesión',
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            await cerrarSesionInterna();
            console.log('✅ Sesión cerrada');
        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
            showModal({
                title: '❌ Error',
                message: 'Hubo un problema al cerrar la sesión. Intenta nuevamente.',
                icon: '❌',
                confirmText: 'Aceptar'
            });
        }
    });

    // =============================================================
    // 🔒 SESIÓN ÚNICA POR USUARIO
    // =============================================================
    // Cada pestaña/equipo se identifica con un ID propio guardado en
    // sessionStorage (sobrevive a una RECARGA de la misma pestaña, pero no
    // a cerrarla ni a abrir una nueva) — evita que refrescar la página se
    // interprete como "otra sesión" compitiendo consigo misma.
    let miSessionId = null;
    let refSesionActiva = null;

    function obtenerMiSessionId() {
        let id = sessionStorage.getItem('sesionQuirurgicaId');
        if (!id) {
            id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            sessionStorage.setItem('sesionQuirurgicaId', id);
        }
        return id;
    }

    // Se llama justo después de autenticar (ver auth.onAuthStateChanged más
    // abajo). Si ya hay una sesión activa de OTRA pestaña/equipo, cierra
    // esta sesión recién iniciada y avisa — si no, reclama la sesión para
    // esta pestaña. Retorna true si se puede continuar.
    async function verificarYReclamarSesionUnica(uid) {
        miSessionId = obtenerMiSessionId();
        const ref = database.ref('usuarios/' + uid + '/sesionActiva');
        const snapshot = await ref.once('value');
        const existente = snapshot.val();

        if (existente && existente.sessionId && existente.sessionId !== miSessionId) {
            await auth.signOut();
            currentUser = null;
            currentUserEmail = '';
            currentUserRol = '';
            mostrarLoginStatus('⛔ Esta cuenta ya tiene una sesión activa en otro equipo o pestaña. Ciérrala primero, o pide a un superadministrador que la libere desde el Panel de Administrador.', 'error');
            return false;
        }

        await ref.set({
            sessionId: miSessionId,
            dispositivo: navigator.userAgent || 'Desconocido',
            ts: firebase.database.ServerValue.TIMESTAMP
        });
        refSesionActiva = ref;

        // 🛟 Patrón estándar de "presencia" de Firebase: onDisconnect() se
        // borra automáticamente tras dispararse una vez y hay que volver a
        // registrarlo cada vez que la conexión se restablece — así, si se
        // corta la red un momento y vuelve, la sesión sigue liberándose
        // sola al cerrar la pestaña de verdad. Cubre cerrar la pestaña,
        // perder la red, o apagar el equipo — no hay riesgo real de quedar
        // bloqueado para siempre (y el superadministrador puede liberarla
        // a mano desde el Panel de Administrador de todos modos).
        database.ref('.info/connected').on('value', function(snap) {
            if (snap.val() === true && refSesionActiva) {
                refSesionActiva.onDisconnect().remove();
            }
        });

        return true;
    }

    async function liberarSesionActiva() {
        if (!refSesionActiva) return;
        try {
            await refSesionActiva.remove();
        } catch (error) {
            console.error('❌ Error al liberar la sesión activa:', error);
        }
    }

    // =============================================================
    // ⏱️ CIERRE AUTOMÁTICO POR INACTIVIDAD (30 minutos) Y AL CERRAR LA PESTAÑA
    // =============================================================
    const INACTIVIDAD_AVISO_MS = 25 * 60 * 1000;
    const INACTIVIDAD_LOGOUT_MS = 30 * 60 * 1000;
    let temporizadorAvisoInactividad = null;
    let temporizadorLogoutInactividad = null;
    let ultimoReinicioInactividad = 0;

    function detenerTemporizadoresInactividad() {
        if (temporizadorAvisoInactividad) { clearTimeout(temporizadorAvisoInactividad); temporizadorAvisoInactividad = null; }
        if (temporizadorLogoutInactividad) { clearTimeout(temporizadorLogoutInactividad); temporizadorLogoutInactividad = null; }
    }

    function reiniciarTemporizadoresInactividad() {
        detenerTemporizadoresInactividad();
        if (!currentUser) return;
        temporizadorAvisoInactividad = setTimeout(mostrarAvisoInactividad, INACTIVIDAD_AVISO_MS);
        temporizadorLogoutInactividad = setTimeout(cerrarSesionPorInactividad, INACTIVIDAD_LOGOUT_MS);
    }

    // Throttle: sin esto, cada mousemove reiniciaría 2 temporizadores —
    // alcanza con chequear la actividad una vez cada 10 segundos como mucho.
    function marcarActividadReciente() {
        if (!currentUser) return;
        const ahora = Date.now();
        if (ahora - ultimoReinicioInactividad < 10000) return;
        ultimoReinicioInactividad = ahora;
        reiniciarTemporizadoresInactividad();
    }
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evento => {
        document.addEventListener(evento, marcarActividadReciente, { passive: true });
    });

    function mostrarAvisoInactividad() {
        if (!currentUser) return;
        document.getElementById('avisoInactividadOverlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'avisoInactividadOverlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box" style="max-width:420px; text-align:center;">
                <span class="modal-icon">⏳</span>
                <div class="modal-title">¿Sigues ahí?</div>
                <div class="modal-message">Tu sesión se cerrará en 5 minutos por inactividad.</div>
                <div class="modal-actions">
                    <button class="modal-btn" id="seguirConectadoBtn" style="background:#0b2a4f; color:white; box-shadow:0 4px 12px rgba(11,42,79,0.35);">✅ Seguir conectado</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('seguirConectadoBtn').addEventListener('click', function() {
            overlay.remove();
            reiniciarTemporizadoresInactividad();
        });
    }

    async function cerrarSesionPorInactividad() {
        document.getElementById('avisoInactividadOverlay')?.remove();
        if (!currentUser) return;
        try {
            await cerrarSesionInterna();
            mostrarLoginStatus('Tu sesión se cerró automáticamente por inactividad.', 'success');
        } catch (error) {
            console.error('❌ Error al cerrar sesión por inactividad:', error);
        }
    }

    // Mejor esfuerzo al cerrar la pestaña: la garantía real de que la
    // sesión queda libre la da onDisconnect() (arriba) — esto es una
    // limpieza adicional para que este navegador pida iniciar sesión de
    // nuevo la próxima vez, en vez de reanudar la sesión sola. Los
    // navegadores no garantizan que código asíncrono termine de correr acá,
    // así que no se espera el resultado.
    window.addEventListener('pagehide', function() {
        if (currentUser) {
            auth.signOut().catch(() => {});
        }
    });

    // =============================================================
    // 🔐 AUTENTICACIÓN DE USUARIOS
    // =============================================================

    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('app');
    const loginBtn = document.getElementById('loginBtn');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginStatus = document.getElementById('loginStatus');

    function mostrarLoginStatus(mensaje, tipo = 'error') {
        loginStatus.textContent = mensaje;
        loginStatus.className = 'login-status ' + tipo;
    }

    async function iniciarSesion(email, password) {
        try {
            mostrarLoginStatus('⏳ Verificando credenciales...', '');

            // Solo autenticamos aquí. Firebase disparará automáticamente
            // auth.onAuthStateChanged() justo después de un login exitoso,
            // y es ESE listener el único responsable de inicializar la app
            // (cargar datos, desplegables, sincronización, autoguardado y render).
            // Antes esta función duplicaba toda esa inicialización, causando
            // que se registraran listeners y temporizadores dos veces.
            await auth.signInWithEmailAndPassword(email, password);

        } catch (error) {
            console.error('❌ Error al iniciar sesión:', error);
            let mensaje = '❌ Error al iniciar sesión';
            if (error.code === 'auth/user-not-found') {
                mensaje = '❌ Usuario no encontrado';
            } else if (error.code === 'auth/wrong-password') {
                mensaje = '❌ Contraseña incorrecta';
            } else if (error.code === 'auth/invalid-email') {
                mensaje = '❌ Correo electrónico inválido';
            } else if (error.code === 'auth/too-many-requests') {
                mensaje = '❌ Demasiados intentos. Espera un momento.';
            }
            mostrarLoginStatus(mensaje, 'error');
        }
    }

    loginBtn.addEventListener('click', function() {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();

        if (!email || !password) {
            mostrarLoginStatus('❌ Ingresa tu correo y contraseña', 'error');
            return;
        }

        iniciarSesion(email, password);
    });

    loginEmail.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            loginPassword.focus();
        }
    });

    loginPassword.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });

    // 🔑 "¿Olvidaste tu contraseña?" — usa el correo ya escrito en el campo
    // de email si hay uno; si no, pide que lo escriba primero ahí mismo.
    const linkOlvideContrasena = document.getElementById('linkOlvideContrasena');
    if (linkOlvideContrasena) {
        linkOlvideContrasena.addEventListener('click', function(e) {
            e.preventDefault();
            const email = loginEmail.value.trim();
            if (!email) {
                mostrarLoginStatus('❌ Escribe tu correo electrónico arriba y vuelve a hacer clic en "¿Olvidaste tu contraseña?"', 'error');
                loginEmail.focus();
                return;
            }
            mostrarLoginStatus('⏳ Enviando correo de recuperación...', '');
            auth.sendPasswordResetEmail(email)
                .then(function() {
                    mostrarLoginStatus(`✅ Te enviamos un correo a ${email} con instrucciones para recuperar tu contraseña.`, 'success');
                })
                .catch(function(error) {
                    console.error('❌ Error al enviar correo de recuperación:', error);
                    let mensaje = '❌ No se pudo enviar el correo de recuperación';
                    if (error.code === 'auth/user-not-found') {
                        mensaje = '❌ No hay ninguna cuenta con ese correo';
                    } else if (error.code === 'auth/invalid-email') {
                        mensaje = '❌ Correo electrónico inválido';
                    } else if (error.code === 'auth/too-many-requests') {
                        mensaje = '❌ Demasiados intentos. Espera un momento.';
                    }
                    mostrarLoginStatus(mensaje, 'error');
                });
        });
    }

    // =============================================================
    // 🕐 BITÁCORA DE ACCESOS — un registro por cada inicio de sesión exitoso,
    // guardado en bitacora_accesos/{uid}. Se consulta desde Administrador
    // (ver mostrarBitacoraUsuario() en js/11-admin-usuarios.js).
    // =============================================================
    async function registrarInicioSesionBitacora(uid, email) {
        try {
            await database.ref('bitacora_accesos/' + uid).push({
                email: email || '',
                fecha_hora: firebase.database.ServerValue.TIMESTAMP,
                dispositivo: (typeof navigator !== 'undefined' && navigator.userAgent) || ''
            });
        } catch (error) {
            console.error('❌ Error al registrar en la bitácora de accesos:', error);
        }
    }

    auth.onAuthStateChanged(async function(user) {
        if (user) {
            currentUser = user;
            currentUserEmail = user.email;

            const userRef = database.ref('usuarios/' + user.uid);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();

            // 🔒 Usuario bloqueado por un administrador (usuarios/{uid}.activo
            // === false, ver toggleEstadoUsuario() en js/11): sus credenciales
            // de Firebase siguen siendo válidas, pero la app le niega el
            // acceso igual — se cierra la sesión de inmediato, antes de
            // mostrar nada de la app.
            if (userData && userData.activo === false) {
                console.warn('⛔ Usuario bloqueado, cerrando sesión:', currentUserEmail);
                await auth.signOut();
                currentUser = null;
                currentUserEmail = '';
                currentUserRol = '';
                mostrarLoginStatus('⛔ Tu cuenta ha sido bloqueada. Contacta al administrador del sistema.', 'error');
                return;
            }

            // 🔒 Sesión única: si esta cuenta ya tiene una sesión activa en
            // otro equipo/pestaña, se bloquea acá (ver
            // verificarYReclamarSesionUnica más arriba) antes de mostrar
            // nada de la app.
            const puedeContinuar = await verificarYReclamarSesionUnica(user.uid);
            if (!puedeContinuar) return;

            // 🕐 Bitácora de inicio de sesión — no bloquea el login si falla.
            registrarInicioSesionBitacora(user.uid, currentUserEmail);

            if (userData && userData.rol) {
                currentUserRol = userData.rol;
            } else {
                // Usuario nuevo sin rol asignado. Caso especial: si la app está
                // recién instalada y todavía no existe NINGÚN superadministrador,
                // la primera persona en iniciar sesión se convierte
                // automáticamente en superadministrador, para poder arrancar
                // sin depender de editar Firebase a mano. Una vez que exista
                // al menos un superadministrador, los siguientes usuarios
                // nuevos vuelven a crearse con rol "usuario" como siempre.
                let rolInicial = 'usuario';
                try {
                    const superadminSnapshot = await database.ref('usuarios')
                        .orderByChild('rol')
                        .equalTo('superadministrador')
                        .limitToFirst(1)
                        .once('value');
                    if (!superadminSnapshot.exists()) {
                        rolInicial = 'superadministrador';
                        console.log('👑 No hay superadministrador todavía — asignando automáticamente a', currentUserEmail);
                    }
                } catch (error) {
                    console.error('❌ No se pudo verificar si existe un superadministrador (se usará rol "usuario"):', error);
                }

                currentUserRol = rolInicial;
                await userRef.update({ rol: rolInicial, email: currentUserEmail });
            }

            // secciones === null (campo nunca definido) se interpreta como
            // "sin restricción" para no bloquear retroactivamente a usuarios
            // creados antes de que existiera este sistema de permisos.
            currentUserSecciones = (userData && userData.secciones) || null;
            currentUserSoloLecturaTabla = !!(userData && userData.soloLecturaTabla);

            console.log('✅ Usuario autenticado:', currentUserEmail, 'Rol:', currentUserRol);

            loginContainer.style.display = 'none';
            appContainer.style.display = 'block';
            appContainer.classList.add('visible');

            const userInfoDiv = document.getElementById('userInfo');
            const userDisplaySpan = document.getElementById('userDisplayName');
            userInfoDiv.style.display = 'flex';
            userDisplaySpan.textContent = '👤 ' + currentUserEmail;

            cargarDatosDesdeFirebase();
            await cargarDesplegablesCache();
            await cargarMedicosPorEspecialidadCache();
            await cargarWhatsappPlantillasCache();
            iniciarSincronizacionTiempoReal();
            iniciarAutoSave();
            reiniciarTemporizadoresInactividad();

            // 🩺 Lista de Espera: carga su propia taxonomía administrable y
            // abre su listener de pacientes en tiempo real, solo si el
            // usuario tiene acceso a la sección (mismo guardado que ya usa
            // el resto de las secciones opcionales de este bloque).
            if (usuarioTieneAccesoSeccion('listaEspera')) {
                await leInicializarModulo();
            }

            // 🪟 Por si quedó una vista dividida a medio armar de una sesión
            // anterior en esta misma pestaña (ej. otro usuario se
            // desconectó estando en vista dividida) — el aterrizaje directo
            // en "registro" más abajo NO pasa por cambiarSeccion(), así que
            // sin esto la vista dividida podría quedar visualmente atascada.
            if (vistaDivididaActiva) {
                restaurarContenedoresVistaDividida();
            }

            aplicarPermisosNavegacion();
            const seccionInicial = obtenerPrimeraSeccionAccesible();
            if (!seccionInicial) {
                mostrarSinAccesoSecciones();
            } else if (seccionInicial !== 'registro') {
                cambiarSeccion(seccionInicial);
            } else {
                // El aterrizaje directo en "registro" (el caso más común: es
                // la sección por defecto) no pasa por cambiarSeccion(), así
                // que hay que marcar el atributo acá también — si no, el
                // aviso de girar pantalla (ver styles.css) nunca se activa
                // para quien entra directo a la Tabla Quirúrgica.
                document.body.setAttribute('data-seccion', 'registro');
                render();
            }

        } else {
            currentUser = null;
            currentUserEmail = '';
            currentUserRol = '';
            currentUserSecciones = null;
            currentUserSoloLecturaTabla = false;
            detenerTemporizadoresInactividad();
            loginContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            appContainer.classList.remove('visible');
            loginEmail.value = '';
            loginPassword.value = '';
            loginStatus.textContent = '';

            document.getElementById('userInfo').style.display = 'none';
        }
    });

    // =============================================================
    // EVENTOS DE NAVEGACIÓN DEL MENÚ
    // =============================================================
    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        menuDropdown.classList.toggle('open');
        this.classList.toggle('active');
    });

    document.addEventListener('click', function(e) {
        const menu = document.querySelector('.menu-hamburguesa');
        if (menu && !menu.contains(e.target)) {
            menuDropdown.classList.remove('open');
            menuToggle.classList.remove('active');
        }
    });

    navRegistro.addEventListener('click', function() {
        cambiarSeccion('registro');
    });

    navDiferidos.addEventListener('click', function() {
        cambiarSeccion('diferidos');
    });

    if (navLibro) {
        navLibro.addEventListener('click', function() {
            cambiarSeccion('libro');
        });
    }

    if (navEstadisticas) {
        navEstadisticas.addEventListener('click', function() {
            cambiarSeccion('estadisticas');
        });
    }

    if (navAdmin) {
        navAdmin.addEventListener('click', function() {
            cambiarSeccion('admin');
        });
    }

    if (navManual) {
    navManual.addEventListener('click', function() {
        cambiarSeccion('manual');
    });
}

    if (navListaEspera) {
        navListaEspera.addEventListener('click', function() {
            cambiarSeccion('listaEspera');
        });
    }

    // "Reunión de Tabla" no cambia de sección: abre un modal para elegir
    // semanas (Tabla Quirúrgica) y rango de fechas (Estadísticas) y generar
    // con eso una Presentación/PPT combinada (ver js/21-reunion-tabla.js).
    const navReunionTabla = document.getElementById('navReunionTabla');
    if (navReunionTabla) {
        navReunionTabla.addEventListener('click', function() {
            if (menuDropdown && menuToggle) {
                menuDropdown.classList.remove('open');
                menuToggle.classList.remove('active');
            }
            abrirModalReunionTabla();
        });
    }

    // "Análisis IA" tampoco cambia de sección: abre un modal para elegir
    // qué datos incluir y arma un informe ejecutivo (ver js/22-analisis-ia.js).
    const navAnalisisIA = document.getElementById('navAnalisisIA');
    if (navAnalisisIA) {
        navAnalisisIA.addEventListener('click', function() {
            if (menuDropdown && menuToggle) {
                menuDropdown.classList.remove('open');
                menuToggle.classList.remove('active');
            }
            abrirModalAnalisisIA();
        });
    }

    // "Generador de PPT" tampoco cambia de sección: abre un modal para
    // elegir qué fuentes combinar en un solo PPT (ver
    // js/34-generador-ppt-combinado.js).
    const navGeneradorPpt = document.getElementById('navGeneradorPpt');
    if (navGeneradorPpt) {
        navGeneradorPpt.addEventListener('click', function() {
            if (menuDropdown && menuToggle) {
                menuDropdown.classList.remove('open');
                menuToggle.classList.remove('active');
            }
            abrirModalGeneradorPpt();
        });
    }

    // =============================================================
    // 🪟 VISTA DIVIDIDA: dos secciones distintas a la vez, lado a lado.
    // No duplica ninguna función de carga — MUEVE (appendChild) el mismo
    // contenedor de cada sección dentro del panel elegido, así que todo su
    // estado y sus event listeners ya enganchados siguen funcionando sin
    // cambios. vistaDivididaActiva/vistaDivididaSecciones están declaradas en
    // js/09-diferidos-libro-admin.js (las usa seccionEstaVisible() para que
    // los listeners de tiempo real de js/02, js/03 y js/12 sepan
    // re-renderizar la sección correcta aunque haya DOS visibles a la vez).
    // =============================================================
    const SECCIONES_VISTA_DIVIDIDA = [
        { key: 'registro', label: '📋 Tabla Quirúrgica', grupoIds: ['tabContainer', 'weekContent'], cargar: () => renderWeekView() },
        { key: 'diferidos', label: '📤 Pacientes Diferidos', grupoIds: ['diferidosContent'], cargar: () => cargarPacientesDiferidos() },
        { key: 'libro', label: '📘 Libro de Quirófano', grupoIds: ['libroContent'], cargar: () => cargarLibroQuirofano() },
        { key: 'estadisticas', label: '📊 Estadísticas', grupoIds: ['estadisticasContent'], cargar: () => cargarEstadisticas() },
        { key: 'admin', label: '⚙️ Administrador', grupoIds: ['adminContent'], cargar: () => cargarAdmin() },
        { key: 'manual', label: '📖 Manual de Usuario', grupoIds: ['manualContent'], cargar: () => cargarManual() },
        { key: 'listaEspera', label: '🩺 Lista de Espera', grupoIds: ['listaEsperaContent'], cargar: () => leMostrarSeccionListaEspera() }
    ];

    let seccionAntesDeVistaDividida = null;

    // Recuerda dónde vivía cada contenedor ANTES de moverlo por primera vez,
    // para poder devolverlo a su lugar exacto al salir de vista dividida.
    const posicionOriginalVistaDividida = new Map();

    function recordarPosicionOriginal(elementId) {
        if (posicionOriginalVistaDividida.has(elementId)) return;
        const el = document.getElementById(elementId);
        if (!el) return;
        posicionOriginalVistaDividida.set(elementId, { padre: el.parentNode, siguienteHermano: el.nextSibling });
    }

    function devolverATuLugar(elementId) {
        const pos = posicionOriginalVistaDividida.get(elementId);
        const el = document.getElementById(elementId);
        if (!pos || !el) return;
        if (pos.siguienteHermano && pos.siguienteHermano.parentNode === pos.padre) {
            pos.padre.insertBefore(el, pos.siguienteHermano);
        } else {
            pos.padre.appendChild(el);
        }
    }

    function montarSeccionEnPanel(panel, seccion) {
        const otroPanel = panel === 'izquierda' ? 'derecha' : 'izquierda';
        const selectorId = panel === 'izquierda' ? 'selectorPanelIzquierdo' : 'selectorPanelDerecho';

        if (vistaDivididaSecciones[otroPanel] === seccion) {
            showModal({
                title: '⚠️ Sección repetida',
                message: 'Esa sección ya está abierta en el otro panel — elige una distinta.',
                icon: '⚠️',
                confirmText: 'Aceptar'
            });
            const selector = document.getElementById(selectorId);
            if (selector) selector.value = vistaDivididaSecciones[panel] || '';
            return;
        }

        const config = SECCIONES_VISTA_DIVIDIDA.find(s => s.key === seccion);
        if (!config) return;

        // Oculta lo que hubiera antes en ESTE panel — appendChild solo
        // agrega, no saca lo anterior, así que sin esto la sección previa
        // se queda apilada debajo de la nueva en vez de ser reemplazada.
        const seccionAnteriorEnPanel = vistaDivididaSecciones[panel];
        if (seccionAnteriorEnPanel && seccionAnteriorEnPanel !== seccion) {
            const configAnterior = SECCIONES_VISTA_DIVIDIDA.find(s => s.key === seccionAnteriorEnPanel);
            if (configAnterior) {
                configAnterior.grupoIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
            }
        }

        config.grupoIds.forEach(recordarPosicionOriginal);

        const contenedorPanel = document.getElementById(panel === 'izquierda' ? 'contenidoPanelIzquierdo' : 'contenidoPanelDerecho');
        if (!contenedorPanel) return;

        config.grupoIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = id === 'tabContainer' ? 'flex' : 'block';
                contenedorPanel.appendChild(el);
            }
        });

        vistaDivididaSecciones[panel] = seccion;
        config.cargar();
    }

    function poblarSelectoresVistaDividida() {
        const disponibles = SECCIONES_VISTA_DIVIDIDA.filter(s => usuarioTieneAccesoSeccion(s.key));
        ['selectorPanelIzquierdo', 'selectorPanelDerecho'].forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            select.innerHTML = disponibles.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
            if (!select.dataset.listenerVistaDividida) {
                select.dataset.listenerVistaDividida = '1';
                select.addEventListener('change', function() {
                    const panel = selectId === 'selectorPanelIzquierdo' ? 'izquierda' : 'derecha';
                    montarSeccionEnPanel(panel, this.value);
                });
            }
        });
    }

    function activarVistaDividida() {
        seccionAntesDeVistaDividida = seccionActiva;

        // 🖥️ Con dos secciones lado a lado (sobre todo con la Tabla
        // Quirúrgica, que ya es ancha de por sí) el máximo de 1600px de
        // ".app" se queda corto — ver ".vista-dividida-modo .app" en
        // styles.css.
        document.body.classList.add('vista-dividida-modo');

        weekContent.style.display = 'none';
        diferidosContent.style.display = 'none';
        libroContent.style.display = 'none';
        if (estadisticasContent) estadisticasContent.style.display = 'none';
        adminContent.style.display = 'none';
        manualContent.style.display = 'none';
        if (listaEsperaContent) listaEsperaContent.style.display = 'none';
        const tabContainer = document.getElementById('tabContainer');
        const daysGrid = document.querySelector('.days-grid');
        const weekContainer = document.querySelector('.week-container');
        if (tabContainer) tabContainer.style.display = 'none';
        if (daysGrid) daysGrid.style.display = 'none';
        if (weekContainer) weekContainer.style.display = 'none';

        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        document.body.removeAttribute('data-seccion');

        vistaDivididaActiva = true;
        vistaDivididaSecciones = { izquierda: null, derecha: null };
        document.getElementById('vistaDivididaContainer').style.display = 'block';

        poblarSelectoresVistaDividida();

        const disponibles = SECCIONES_VISTA_DIVIDIDA.filter(s => usuarioTieneAccesoSeccion(s.key));
        const izqDefault = disponibles.find(s => s.key === seccionAntesDeVistaDividida) || disponibles[0];
        const derDefault = disponibles.find(s => !izqDefault || s.key !== izqDefault.key);

        if (izqDefault) {
            const selIzq = document.getElementById('selectorPanelIzquierdo');
            if (selIzq) selIzq.value = izqDefault.key;
            montarSeccionEnPanel('izquierda', izqDefault.key);
        }
        if (derDefault) {
            const selDer = document.getElementById('selectorPanelDerecho');
            if (selDer) selDer.value = derDefault.key;
            montarSeccionEnPanel('derecha', derDefault.key);
        }
    }

    // Devuelve ambos paneles a su lugar original en el HTML y apaga vista
    // dividida — sin volver a mostrar ninguna sección (eso lo decide quien
    // llama: salirDeVistaDividida() sigue con cambiarSeccion(), pero el
    // guard de cambiarSeccion() y el reset al iniciar sesión solo necesitan
    // la limpieza, no una sección específica después).
    function restaurarContenedoresVistaDividida() {
        ['izquierda', 'derecha'].forEach(panel => {
            const seccion = vistaDivididaSecciones[panel];
            if (!seccion) return;
            const config = SECCIONES_VISTA_DIVIDIDA.find(s => s.key === seccion);
            if (config) config.grupoIds.forEach(devolverATuLugar);
        });

        vistaDivididaActiva = false;
        vistaDivididaSecciones = { izquierda: null, derecha: null };
        document.body.classList.remove('vista-dividida-modo');
        const cont = document.getElementById('vistaDivididaContainer');
        if (cont) cont.style.display = 'none';
    }

    function salirDeVistaDividida() {
        restaurarContenedoresVistaDividida();
        cambiarSeccion(seccionAntesDeVistaDividida || 'registro');
    }

    const navVistaDividida = document.getElementById('navVistaDividida');
    if (navVistaDividida) {
        navVistaDividida.addEventListener('click', function() {
            if (menuDropdown && menuToggle) {
                menuDropdown.classList.remove('open');
                menuToggle.classList.remove('active');
            }
            activarVistaDividida();
        });
    }

    const btnSalirVistaDividida = document.getElementById('btnSalirVistaDividida');
    if (btnSalirVistaDividida) {
        btnSalirVistaDividida.addEventListener('click', salirDeVistaDividida);
    }
