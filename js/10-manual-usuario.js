

// =============================================================
// 📖 MANUAL DE USUARIO - EBOOK
// =============================================================

// Índice del manual — módulo (no dentro de cargarManual) para que también
// lo use descargarManualPDF() al armar el PDF con índice clicable.
const MANUAL_SECCIONES = [
    { id: 'introduccion', titulo: '1. Introducción', icono: '📋' },
    { id: 'acceso', titulo: '2. Acceso al Sistema', icono: '🔐' },
    { id: 'panel-principal', titulo: '3. Panel Principal - Tabla Quirúrgica', icono: '📊' },
    { id: 'columnas', titulo: '3.1 Columnas de la Tabla', icono: '📋' },
    { id: 'estados', titulo: '3.2 Estados de ESTADO_DE_IQx', icono: '📊' },
    { id: 'botones', titulo: '3.3 Botones de Acción', icono: '🔘' },
    { id: 'presentacion-tabla', titulo: '3.4 Presentación y Descargar PPT', icono: '🎥' },
    { id: 'diferidos', titulo: '4. Pacientes Diferidos', icono: '📤' },
    { id: 'libro', titulo: '5. Libro de Quirófano', icono: '📘' },
    { id: 'estadisticas-manual', titulo: '6. Estadísticas', icono: '📊' },
    { id: 'reunion-tabla', titulo: '6.5 Reunión de Tabla', icono: '🤝' },
    { id: 'analisis-ia', titulo: '6.6 Análisis IA', icono: '🧠' },
    { id: 'admin', titulo: '7. Panel de Administración', icono: '⚙️' },
    { id: 'avanzadas', titulo: '8. Funciones Avanzadas', icono: '🚀' },
    { id: 'lista-espera', titulo: '9. Lista de Espera', icono: '🩺' },
    { id: 'cargar-a-tabla', titulo: '10. Cargar a la Tabla', icono: '📋' },
    { id: 'whatsapp', titulo: '11. Mensajería WhatsApp', icono: '💬' },
    { id: 'problemas', titulo: '12. Solución de Problemas', icono: '🔧' },
    { id: 'faq', titulo: '13. Preguntas Frecuentes', icono: '❓' }
];

// Se llena con TODO el contenido (todas las secciones) la primera vez que
// corre cargarContenidoManual() — ver ahí. descargarManualPDF() lo usa para
// armar el PDF completo sin duplicar los ~600 líneas de contenido HTML.
let MANUAL_CONTENIDOS = {};

function cargarManual() {
    const indiceLista = document.getElementById('manualIndiceLista');
    const contenidoInner = document.getElementById('manualContenidoInner');
    const secciones = MANUAL_SECCIONES;

    // Generar índice
    let indiceHTML = '';
    secciones.forEach(sec => {
        indiceHTML += `
            <div class="manual-indice-item" data-seccion="${sec.id}" style="padding:10px 20px; cursor:pointer; border-left:3px solid transparent; transition:all 0.2s; font-size:0.85rem; color:#475569; display:flex; align-items:center; gap:10px;">
                <span>${sec.icono}</span>
                <span>${sec.titulo}</span>
            </div>
        `;
    });
    indiceLista.innerHTML = indiceHTML;

    // Eventos de clic en el índice
    document.querySelectorAll('.manual-indice-item').forEach(item => {
        item.addEventListener('click', function() {
            const seccionId = this.dataset.seccion;
            // Resaltar elemento seleccionado
            document.querySelectorAll('.manual-indice-item').forEach(el => {
                el.style.background = 'transparent';
                el.style.borderLeftColor = 'transparent';
                el.style.fontWeight = '400';
            });
            this.style.background = '#e8f4fd';
            this.style.borderLeftColor = '#0b2a4f';
            this.style.fontWeight = '600';
            // Cargar contenido
            cargarContenidoManual(seccionId);
        });
    });

    // Seleccionar primera sección por defecto
    const primerItem = document.querySelector('.manual-indice-item');
    if (primerItem) {
        primerItem.click();
    }

    const btnPDF = document.getElementById('btnDescargarManualPDF');
    if (btnPDF && !btnPDF.dataset._listener) {
        btnPDF.dataset._listener = 'true';
        btnPDF.addEventListener('click', descargarManualPDF);
    }
}

// =============================================================
// 📖 CARGAR CONTENIDO DEL MANUAL
// =============================================================
// Puebla MANUAL_CONTENIDOS con el HTML de TODAS las secciones (no solo una).
// Función propia — separada de cargarContenidoManual() — para que
// descargarManualPDF() pueda llamarla sin tocar lo que se ve en pantalla.
function construirManualContenidos() {
    MANUAL_CONTENIDOS = {
        'introduccion': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">📋 Manual de Usuario - Tabla Quirúrgica</h1>
            <p style="font-size:1.1rem; color:#475569; margin-bottom:24px;">Hospital Dr. Humberto Elorza Cortés · Illapel, Chile</p>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">1.1 ¿Qué es la Tabla Quirúrgica?</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">La Tabla Quirúrgica es un sistema de registro digital diseñado para el Hospital Dr. Humberto Elorza Cortés. Permite:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>📝 Registrar pacientes quirúrgicos por día y pabellón</li>
                <li>📤 Diferir pacientes a una lista de espera</li>
                <li>📘 Generar el Libro de Quirófano (registro definitivo)</li>
                <li>🔄 Sincronizar datos en tiempo real entre múltiples usuarios</li>
                <li>⚙️ Administrar usuarios y opciones de desplegables</li>
            </ul>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">1.2 Beneficios</h2>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>✅ <strong>Sin pérdida de datos</strong>: Guardado automático cada 10 minutos</li>
                <li>✅ <strong>Sincronización en tiempo real</strong>: Todos los usuarios ven los mismos datos</li>
                <li>✅ <strong>Rápido y eficiente</strong>: Optimizado para funcionar sin demoras</li>
                <li>✅ <strong>Acceso seguro</strong>: Autenticación con usuario y contraseña</li>
                <li>✅ <strong>Roles diferenciados</strong>: Administradores y usuarios</li>
            </ul>
        `,
        
        'acceso': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">🔐 Acceso al Sistema</h1>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">2.1 Pantalla de Login</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Para acceder al sistema:</p>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li><strong>Correo electrónico</strong>: Ingresa tu correo institucional</li>
                <li><strong>Contraseña</strong>: Ingresa tu contraseña asignada</li>
                <li>Haz clic en <strong>"Ingresar"</strong> o presiona <strong>Enter</strong></li>
            </ol>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">2.2 Mensajes de Error</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Mensaje</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Significado</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Solución</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">❌ Usuario no encontrado</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">El correo no está registrado</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Contacta al administrador</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">❌ Contraseña incorrecta</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">La contraseña no coincide</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Verifica que la contraseña sea correcta</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">❌ Demasiados intentos</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Se superó el límite de intentos</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Espera unos minutos e intenta nuevamente</td>
                    </tr>
                </tbody>
            </table>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">2.3 Recuperar Contraseña</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Escribe tu correo en el campo <strong>"Correo electrónico"</strong> de la pantalla de inicio de sesión</li>
                <li>Haz clic en <strong>"¿Olvidaste tu contraseña?"</strong></li>
                <li>Revisa tu correo y sigue las instrucciones del mensaje que te llega para elegir una contraseña nueva</li>
            </ol>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">2.4 Cerrar Sesión</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en <strong>"🚪 Cerrar Sesión"</strong> en la esquina superior derecha</li>
                <li>Confirma la acción en el mensaje de advertencia</li>
            </ol>
        `,
        
        'panel-principal': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">📊 Panel Principal - Tabla Quirúrgica</h1>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">3.1 Estructura General</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">La pantalla principal tiene las siguientes secciones:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li><strong>🏥 Header</strong>: Logo y título de la aplicación</li>
                <li><strong>🍔 Menú</strong>: Navegación entre secciones y semanas</li>
                <li><strong>📅 Días</strong>: Selección del día de la semana (LUN-DOM)</li>
                <li><strong>📋 Tabla</strong>: Registro de pacientes quirúrgicos</li>
                <li><strong>🔘 Botones de acción</strong>: Guardar, limpiar, agregar filas</li>
            </ul>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">3.2 Cabecera</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Elemento</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Función</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">🍔 Menú</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Navegación entre secciones</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;"><strong>Semana 1-5</strong></td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Seleccionar la semana de trabajo</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">👤 Usuario</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Muestra tu correo y botón de cierre de sesión</td>
                    </tr>
                </tbody>
            </table>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">3.3 Días de la Semana</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Haz clic en un día para ver los registros de ese día:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li><strong>LUN</strong> - Lunes</li>
                <li><strong>MAR</strong> - Martes</li>
                <li><strong>MIE</strong> - Miércoles</li>
                <li><strong>JUE</strong> - Jueves</li>
                <li><strong>VIE</strong> - Viernes</li>
                <li><strong>SAB</strong> - Sábado</li>
                <li><strong>DOM</strong> - Domingo</li>
            </ul>
            <p style="color:#64748b; font-style:italic; margin-top:8px;">💡 El día activo se muestra con fondo oscuro</p>
        `,
        
        'columnas': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">📋 Columnas de la Tabla</h1>
            
            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:6px 10px; text-align:left; border:1px solid #e2e8f0;">Columna</th>
                        <th style="padding:6px 10px; text-align:left; border:1px solid #e2e8f0;">Descripción</th>
                        <th style="padding:6px 10px; text-align:left; border:1px solid #e2e8f0;">Tipo</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">🎨 Color</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Marcar fila con color</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Selector de color</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">⏩ Diferir</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Enviar paciente a lista de espera</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Botón</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">🔄 Reubicar</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Mover paciente a otra fila</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Botón</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>FECHA</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Fecha de la cirugía</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Date Picker</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>T_Qx</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Tiempo quirúrgico programado</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Hora</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Jornada</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">AM o PM</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Select</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Cirujano</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Nombre del cirujano (lista según la Especialidad elegida)</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Select</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Especialidad</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Especialidad médica</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Select</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Anestesista</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Nombre del anestesista</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Select</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Nombre_Paciente</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Nombre completo del paciente</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Texto</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>RUT</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">RUT del paciente</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Texto (con validación)</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Edad</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Edad del paciente</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Texto</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>FICHA</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Número de ficha</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Texto</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Diagnostico</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Diagnóstico del paciente</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Texto</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Intervencion_propuesta</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Cirugía programada</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Combobox con búsqueda</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Condicion_LE</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Condición de lista de espera</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Texto</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>ESTADO_DE_IQx</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Estado de la intervención</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Select</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>1ra_Intervencion_Qx_Realizada</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Primera cirugía realizada</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Combobox</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Tipo_Actividad</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Tipo de actividad (Cmay/Cmen/Proc)</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Auto-completado</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>2da_Intervencion_Qx_Realizada</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Segunda cirugía realizada</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Combobox</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Tipo_Actividad_2</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Tipo de actividad 2</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Auto-completado</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>3ra_Intervencion_Realizada</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Tercera cirugía realizada</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Combobox</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Tipo_Actividad_3</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Tipo de actividad 3</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Auto-completado</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Causal_de_suspension</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Motivo de suspensión</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Select</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Motivo</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Detalle del motivo</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Select (dependiente)</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Observaciones</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Notas adicionales</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Textarea</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>T_Retraso</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Tiempo de retraso</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Hora</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Hora_de_entrada</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Hora de entrada a pabellón</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Hora</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>Hora_de_salida</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Hora de salida de pabellón</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Hora</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>T_QX</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Tiempo quirúrgico real</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Auto-calculado</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;"><strong>DESTINO</strong></td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Destino del paciente</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Select</td></tr>
                    <tr><td style="padding:6px 10px; border:1px solid #e2e8f0;">🗑️ Eliminar</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Eliminar la fila</td><td style="padding:6px 10px; border:1px solid #e2e8f0;">Botón</td></tr>
                </tbody>
            </table>
        `,
        
        'estados': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">📊 Estados de ESTADO_DE_IQx</h1>
            
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Opción</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">OPERADO (PROGRAMADO)</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Cirugía programada realizada</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">OPERADO (AGREGADO)</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Cirugía agregada realizada</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">OPERADO (CONDICIONAL)</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Cirugía condicional realizada</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">OPERADO (PAD)</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Cirugía PAD realizada</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0; background:#fef2f2;"><strong>SUSPENDIDO</strong></td><td style="padding:8px 12px; border:1px solid #e2e8f0; background:#fef2f2;">⚠️ Cirugía suspendida (excepción: SÍ permite Diferir/Reubicar, ver nota abajo)</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">URGENCIA</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Cirugía de urgencia</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0; background:#fef2f2;"><strong>CONDICIONAL (NO OPERADO)</strong></td><td style="padding:8px 12px; border:1px solid #e2e8f0; background:#fef2f2;">⚠️ Condicional no operado (excepción: SÍ permite Diferir/Reubicar, ver nota abajo)</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">PERIANALGESIA (PARTO)</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Parto con analgesia</td></tr>
                </tbody>
            </table>
            <p style="color:#dc2626; font-weight:500; margin-top:8px;">⚠️ <strong>Importante:</strong> Al elegir CUALQUIER estado en ESTADO_DE_IQx, los botones Diferir y Reubicar de esa fila se deshabilitan (solo quedan habilitados cuando el campo está vacío, "Seleccione").</p>
            <p style="color:#dc2626; font-weight:500; margin-top:8px;">⚠️ <strong>Excepción:</strong> SUSPENDIDO y CONDICIONAL (NO OPERADO) sí permiten usar Diferir o Reubicar — el paciente permanece visible en su fila original (no desaparece), a diferencia del resto de los estados. Pero apenas se usa uno de los dos botones una vez, ambos quedan bloqueados para esa fila en particular, para evitar que el paciente termine duplicado.</p>
        `,
        
        'botones': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">🔘 Botones de Acción</h1>
            
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Botón</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Función</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Visual</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">💾 Guardar Día</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Guarda todas las filas del día en Firebase</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Verde</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">💾 Guardar Pabellón</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Guarda solo el pabellón actual</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Verde</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">📋 Registrar Día</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Archiva el día en el Libro de Quirófano <strong>(solo admin)</strong></td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Morado</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">🗑️ Limpiar Día</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Elimina todos los datos del día</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Rojo</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">🗑️ Limpiar Pabellón</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Elimina datos del pabellón actual</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Rojo</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">➕ Agregar Fila</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Agrega una fila nueva</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Azul</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">🗑️ Eliminar Fila</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Elimina la fila seleccionada</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Rojo</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">🖨️ Imprimir Día</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Imprime el resumen del día</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Azul oscuro</td></tr>
                </tbody>
            </table>
        `,

        'presentacion-tabla': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">🎥 Presentación y Descargar PPT</h1>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">En la parte superior de cada semana (justo debajo de "📅 Semana X") hay una barra con tres controles para generar una presentación de la tabla, una lámina por cada día:</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">3.4.1 Elegir Semanas</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en <strong>"📅 Semanas (N) ▾"</strong></li>
                <li>Marca las semanas que quieres incluir (por ejemplo, solo la Semana 1, o la 1 y la 2 juntas)</li>
                <li>Usa <strong>"Todas"</strong> para seleccionarlas/deseleccionarlas todas de una vez</li>
            </ol>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">3.4.2 Presentación en Pantalla Completa</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en <strong>"🎥 Presentación"</strong></li>
                <li>Se genera una lámina por cada día (Lunes a Domingo) de cada semana elegida, con Pabellón 1 y Pabellón 2 por separado</li>
                <li>Navega con las flechas <strong>← →</strong> del teclado o los botones <strong>‹ ›</strong></li>
                <li>Cierra con <strong>Esc</strong> o el botón "✕ Cerrar"</li>
            </ol>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">3.4.3 Descargar PPT</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">El botón <strong>"⬇️ Descargar PPT"</strong> genera un archivo <strong>.pptx</strong> con esas mismas láminas (una diapositiva por día), listo para compartir o proyectar fuera de la app.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">3.4.4 Columnas que Muestra</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Cada lámina usa las mismas columnas que <strong>🖨️ Imprimir Día</strong>, sin la columna FICHA: #, Fecha, Especialidad, Nombre Paciente, RUT, Edad, Diagnóstico, Intervención Propuesta y Condición LE. Si un pabellón no tiene registros ese día, se indica "No hay registros en este pabellón".</p>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Si tu cuenta está en modo <strong>solo lectura</strong> (ver sección 7), estos tres botones no aparecen.</p>
        `,

        'diferidos': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">📤 Pacientes Diferidos</h1>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">4.1 ¿Qué son los Pacientes Diferidos?</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Son pacientes que han sido <strong>diferidos</strong> (movidos) desde la tabla principal a una lista de espera. Esto puede ocurrir cuando:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>El paciente no se presenta</li>
                <li>Falta de disponibilidad de quirófano</li>
                <li>El paciente rechaza la operación</li>
                <li>Otras causales administrativas o médicas</li>
            </ul>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">4.2 Acceso a la Sección</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en el menú 🍔 (hamburguesa)</li>
                <li>Selecciona <strong>"📤 Pacientes Diferidos"</strong></li>
            </ol>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">4.3 Funcionalidades</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Acción</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">↩️ Reintegrar</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Devuelve el paciente a la tabla principal</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">🗑️ Eliminar</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Elimina el registro de diferidos (permanentemente)</td></tr>
                </tbody>
            </table>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">4.4 Reintegrar un Paciente</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en <strong>↩️</strong> (Reintegrar) en el paciente deseado</li>
                <li>Selecciona: <strong>Semana</strong>, <strong>Día</strong>, <strong>Pabellón</strong> y <strong>Fila</strong></li>
                <li>Haz clic en <strong>"✅ Reintegrar"</strong></li>
                <li>El paciente aparecerá en la tabla seleccionada</li>
            </ol>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Si la fila destino tiene datos, se te preguntará si deseas sobrescribir</p>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">4.5 Eliminar un Paciente Diferido</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en <strong>🗑️</strong> (Eliminar) en el paciente deseado</li>
                <li>Confirma la acción en el mensaje de advertencia</li>
            </ol>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Esta acción es permanente y no se puede deshacer</p>
        `,
        
        'libro': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">📘 Libro de Quirófano</h1>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">5.1 ¿Qué es el Libro de Quirófano?</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Es el <strong>registro definitivo</strong> de todas las cirugías realizadas. Una vez que los datos se archivan aquí:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>✅ Quedan registrados permanentemente</li>
                <li>✅ No se pueden modificar (solo administradores pueden editar)</li>
                <li>✅ Se pueden filtrar y exportar a Excel</li>
            </ul>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">5.2 Acceso a la Sección</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en el menú 🍔 (hamburguesa)</li>
                <li>Selecciona <strong>"📘 Libro de Quirófano"</strong></li>
            </ol>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">5.3 Filtros Disponibles</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Filtro</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">📅 Rango de Fechas</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Filtra por período de tiempo</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">🏥 Pabellón</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Filtra por pabellón</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Jornada</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Filtra por AM/PM</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Especialidad</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Filtra por especialidad</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">ESTADO DE IQx</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Filtra por estado</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Cirujano</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Filtra por cirujano</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Nombre Paciente</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Filtra por nombre</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">RUT</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Filtra por RUT</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Intervención</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Filtra por intervención realizada</td></tr>
                </tbody>
            </table>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">5.4 Acciones</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Acción</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">👁️ Ver Detalle</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Muestra todos los datos del registro</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">📊 Exportar a Excel</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Descarga los datos filtrados en formato Excel</td></tr>
                </tbody>
            </table>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">5.5 Ver Detalle de un Registro</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en <strong>👁️</strong> (Ver Detalle)</li>
                <li>Se abrirá un modal con todos los datos del registro</li>
                <li>También verás información de registro (quién y cuándo)</li>
            </ol>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;"><strong>Si eres administrador</strong>, también puedes:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>✏️ <strong>Editar</strong> el registro</li>
                <li>🗑️ <strong>Eliminar</strong> el registro</li>
            </ul>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Los botones Editar y Eliminar solo se muestran a administradores; el resto de los usuarios solo ve "✅ Cerrar".</p>
        `,

        'estadisticas-manual': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">📊 Estadísticas</h1>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Se accede desde el menú 🍔 → <strong>"📊 Estadísticas"</strong>. Toma los datos del Libro de Quirófano (registro definitivo) y los organiza en 8 páginas navegables, con un selector de página en la parte inferior.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">6.1 Las 8 Páginas</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Página</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Contenido</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Programación / Suspensiones</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">KPIs generales, tabla de causales de suspensión (con filtros por columna) y gráficos por especialidad</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">REM (Cmay)</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Producción por especialidad quirúrgica, en intervenciones y en pacientes</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Comportamiento de Producción por Especialidad</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Evolución mensual de cada especialidad (Cmay), en gráfico y tabla</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Proceso Ambulatorio</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Índice de ambulatorización general, ranking por especialidad y desglose mensual</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Ocupación y Rendimiento Pabellón</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Días hábiles, horas habilitadas/trabajadas/urgencia, gauges de ocupación y rendimiento, horario inhábil</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Tiempos por Intervención</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Buscador de intervenciones con duración promedio, mínima, máxima y número de casos</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Perianalgesia (Parto)</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Casos por mes en el año, con calendario detallado al hacer clic en un mes</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Cumplimiento de Metas</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Metas de producción (general/Cmay, por intervenciones y por pacientes) y % de ambulatorización, con gauges de avance</td></tr>
                </tbody>
            </table>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">6.2 Filtro de Fecha</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Hay un filtro de fecha global (arriba de todo) que afecta a la mayoría de las páginas. Las páginas basadas en comportamiento anual — Comportamiento por Especialidad, Desglose del Proceso Ambulatorio, Perianalgesia y Cumplimiento de Metas — usan en cambio su propio selector de <strong>Año</strong>, independiente del filtro de fecha global.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">6.3 Presentación y Descargar PPT</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">En la barra de navegación de páginas (abajo) están los botones <strong>"🎥 Presentación"</strong> y <strong>"⬇️ Descargar PPT"</strong>, que generan las 9 láminas de Estadísticas (una página se divide en dos láminas) en pantalla completa o como archivo .pptx descargable — misma lógica que la Presentación de la Tabla Quirúrgica (sección 3.4).</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">6.4 Parámetros Editables Solo por Administrador</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Algunos valores de Estadísticas solo pueden verse o modificarse siendo administrador:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>La <strong>disponibilidad de pabellón</strong> (horario habilitado por bloque) en Ocupación y Rendimiento Pabellón</li>
                <li>Las <strong>metas de producción</strong> y de ambulatorización en Cumplimiento de Metas</li>
            </ul>
        `,

        'reunion-tabla': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">🤝 Reunión de Tabla</h1>
            <p style="color:#475569; line-height:1.7; margin-bottom:16px;">Genera, en un solo archivo, una presentación combinada que integra láminas de <strong>Estadísticas</strong> (según un rango de fechas) y láminas de la <strong>Tabla Quirúrgica</strong> (según una semana), pensada para exponer en una reunión de tabla sin tener que armar dos presentaciones por separado.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">6.5.1 Cómo generarla</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Abre el menú 🍔 (hamburguesa) y selecciona <strong>"🤝 Reunión de Tabla"</strong></li>
                <li>Elige el <strong>rango de fechas</strong> para las láminas de Estadísticas a incluir</li>
                <li>Elige la <strong>semana</strong> de la Tabla Quirúrgica a incluir</li>
                <li>Marca qué láminas de cada bloque quieres incluir</li>
                <li>Genera la presentación en pantalla completa, o descárgala como archivo <strong>.pptx</strong></li>
            </ol>
            <p style="color:#64748b; font-style:italic;">💡 Usa la misma lógica de captura de láminas que "Presentación"/"Descargar PPT" de Estadísticas y de Tabla Quirúrgica — no crea datos nuevos, solo las combina en un archivo.</p>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Solo aparece en el menú si tu cuenta tiene habilitado el acceso a "Reunión de Tabla" (ver 7.4)</p>
        `,

        'analisis-ia': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">🧠 Análisis IA</h1>
            <p style="color:#475569; line-height:1.7; margin-bottom:16px;">Genera un informe ejecutivo automático a partir de los datos ya cargados en la aplicación (Libro de Quirófano y Estadísticas), enfocado en productividad, ocupación de pabellón, tiempos muertos y horarios de inicio/término AM/PM, con conclusiones, recomendaciones, plan de mejora y metas sugeridas.</p>
            <p style="color:#64748b; font-style:italic; margin-bottom:16px;">💡 El análisis se genera con reglas internas de la aplicación sobre tus propios datos (no envía información a ningún servicio externo de inteligencia artificial).</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">6.6.1 Cómo generarlo</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Abre el menú 🍔 (hamburguesa) y selecciona <strong>"🧠 Análisis IA"</strong></li>
                <li>Elige el <strong>rango de fechas</strong> a analizar (aplica tanto al Libro de Quirófano como a los bloques de Estadísticas)</li>
                <li>Marca los <strong>bloques de Estadísticas</strong> que quieras incluir en el informe (opcional)</li>
                <li>Haz clic en <strong>"👁️ Generar Vista Previa"</strong> para revisar el informe antes de descargarlo</li>
            </ol>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">6.6.2 Formatos de descarga</h2>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li><strong>📄 Texto / PDF</strong>: abre una ventana lista para imprimir o guardar como PDF</li>
                <li><strong>📝 Word</strong>: descarga un archivo .doc con el mismo contenido e imágenes</li>
                <li><strong>⬇️ PPT</strong>: descarga una presentación .pptx con gráficos y tablas</li>
            </ul>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Solo aparece en el menú si tu cuenta tiene habilitado el acceso a "Análisis IA" (ver 7.4)</p>
        `,

        'admin': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">⚙️ Panel de Administración</h1>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">7.1 Acceso</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en el menú 🍔 (hamburguesa)</li>
                <li>Selecciona <strong>"⚙️ Administrador"</strong></li>
            </ol>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Esta sección solo está disponible para usuarios con rol <strong>Superadministrador</strong>. Un <strong>Administrador</strong> tiene acceso total al resto de la aplicación, pero no puede entrar al Panel de Administración</p>
            <p style="color:#64748b; font-style:italic; margin-top:8px;">💡 Si la aplicación se instala desde cero (sin ningún usuario todavía), la primera persona en iniciar sesión se convierte automáticamente en superadministrador.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">7.2 Gestión de Usuarios</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Acción</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Crear Usuario</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Agrega un nuevo usuario al sistema</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Cambiar Rol</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Asigna rol (Usuario / Administrador / 👑 Superadministrador)</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Bloquear/Activar</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Bloquea o activa el acceso de un usuario. Un usuario bloqueado no puede iniciar sesión mientras dure el bloqueo, aunque su contraseña siga siendo correcta</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">🕐 Bitácora</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Muestra los últimos inicios de sesión de ese usuario: fecha, hora y dispositivo</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">🔐 Permisos</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Edita las secciones a las que accede un usuario y el modo solo lectura (ver 7.4)</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">Eliminar</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Elimina un usuario del sistema</td></tr>
                </tbody>
            </table>
            <p style="color:#64748b; font-style:italic; margin-top:8px;">💡 Puede haber más de un superadministrador. Cualquier superadministrador puede ascender o degradar el rol de otro usuario, incluso convertir a otro en superadministrador — con la única excepción de que nadie puede modificar su propio rol.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">7.3 Crear Usuario</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en <strong>"+ Crear Usuario"</strong></li>
                <li>Completa los campos: <strong>Correo electrónico</strong>, <strong>Contraseña</strong> y <strong>Rol</strong></li>
                <li>Si el rol es <strong>Usuario</strong>, marca las secciones a las que podrá acceder y, si corresponde, el modo solo lectura (ver 7.4). Si el rol es <strong>Administrador</strong> o <strong>Superadministrador</strong>, estas opciones no aparecen porque el acceso ya es total</li>
                <li>Haz clic en <strong>"✅ Crear"</strong></li>
            </ol>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">7.4 Permisos de Usuario</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Los administradores y superadministradores siempre tienen acceso completo a toda la aplicación — esto no se puede restringir. Para usuarios con rol <strong>Usuario</strong> se puede configurar, al crearlos o después desde el botón <strong>"🔐 Permisos"</strong> en la lista de usuarios:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:12px;">
                <li><strong>Secciones accesibles</strong>: Tabla Quirúrgica, Pacientes Diferidos, Libro de Quirófano, Estadísticas y Manual de Usuario. Las secciones no marcadas desaparecen del menú de ese usuario; si intenta entrar igual, se le deniega el acceso</li>
                <li><strong>Accesos adicionales</strong>: "Reunión de Tabla" y "Análisis IA" (ver 6.5 y 6.6) se habilitan por separado, de forma independiente al acceso a Estadísticas — un usuario puede tener Estadísticas sin estas funciones, o al revés</li>
                <li><strong>Solo lectura en Tabla Quirúrgica</strong>: el usuario puede navegar semanas y días e Imprimir Día, pero no puede editar campos, agregar/eliminar filas, guardar, limpiar, registrar día, diferir, reubicar, cambiar colores, ni usar Presentación/Descargar PPT de esa sección</li>
                <li><strong>Botones dentro de cada sección</strong>: debajo del checkbox de cada sección aparece una lista más chica con sus botones (ej. en Tabla Quirúrgica: Guardar, Limpiar, Agregar Fila, Imprimir, Presentación/PPT, Diferir, Reubicar, Eliminar Fila, Enviar WhatsApp; en Libro de Quirófano: Exportar a Excel; en Pacientes Diferidos: Reintegrar y Eliminar; en Estadísticas: Presentación/PPT; en Lista de Espera: Guardar/Editar/Eliminar Paciente, Exportar/Imprimir, Registrar Llamada, Cargar a la Tabla e Histórico RDLL). Se pueden destildar por separado sin quitarle el acceso a toda la sección — los filtros de cada sección nunca se restringen, siempre quedan disponibles. "Ver Detalle" (👁️, en Libro y Lista de Espera) es de solo lectura y nunca se restringe</li>
            </ul>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Los permisos se pueden editar todas las veces que sea necesario, y los cambios se aplican la próxima vez que ese usuario inicie sesión (o al recargar la página si ya la tiene abierta).</p>
            <p style="color:#64748b; font-style:italic; margin-top:8px;">💡 Un usuario creado antes de que existiera este sistema de permisos conserva acceso total mientras no se le configure ninguna restricción explícita — esto también aplica a los permisos por botón agregados después.</p>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Quitar "Guardar" no desactiva el guardado automático (cada 60 segundos de inactividad y cada 10 minutos) — solo oculta el botón de guardado manual/inmediato. "Limpiar", en cambio, es una acción exclusivamente manual: quitar ese permiso sí la bloquea por completo.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">7.5 Gestión de Desplegables</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Puedes gestionar las opciones de los siguientes desplegables:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li><strong>Jornada</strong>: Opciones AM / PM</li>
                <li><strong>ESTADO DE IQx</strong>: Estados de intervención</li>
                <li><strong>DESTINO</strong>: Destinos del paciente</li>
                <li><strong>Especialidad</strong>: Especialidades médicas</li>
                <li><strong>Anestesista</strong>: Lista de anestesistas (independiente de la especialidad)</li>
            </ul>
            <p style="color:#475569; line-height:1.7; margin-bottom:8px;"><strong>Agregar una opción:</strong></p>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:8px;">
                <li>Escribe la nueva opción en el campo</li>
                <li>Haz clic en <strong>"+"</strong></li>
            </ol>
            <p style="color:#475569; line-height:1.7; margin-bottom:8px;"><strong>Eliminar una opción:</strong></p>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:8px;">
                <li>Haz clic en <strong>"✕"</strong> junto a la opción que deseas eliminar</li>
            </ol>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Eliminar una opción puede afectar registros existentes</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">7.6 Médicos por Especialidad (campo Cirujano)</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">El campo <strong>Cirujano</strong> de la Tabla Quirúrgica es un desplegable que carga los médicos según la <strong>Especialidad</strong> elegida en esa misma fila. Cada especialidad tiene su propia lista de médicos, administrada por separado en <strong>"👨‍⚕️ Médicos por Especialidad"</strong>:</p>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:8px;">
                <li>Elige la especialidad en el selector</li>
                <li>Escribe el nombre del médico y haz clic en <strong>"+"</strong> para agregarlo</li>
                <li>Haz clic en <strong>"✕"</strong> junto a un médico para eliminarlo de esa especialidad</li>
            </ol>
            <p style="color:#64748b; font-style:italic; margin-top:8px;">💡 Si cambias la Especialidad de una fila, el campo Cirujano de esa fila se reinicia para que elijas un médico de la nueva lista.</p>
        `,
        
        'avanzadas': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">🚀 Funciones Avanzadas</h1>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">8.1 Guardado Automático</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">El sistema guarda automáticamente los datos de dos maneras:</p>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li><strong>Debounce (60 segundos)</strong>: Después de 60 segundos sin escribir, se guarda automáticamente. Este guardado nunca se salta por falta de FECHA</li>
                <li><strong>Intervalo (10 minutos)</strong>: Cada 10 minutos se guarda automáticamente. Si hay filas con datos de paciente pero sin FECHA, muestra una alerta recordatorio (sin dejar de guardar)</li>
            </ol>
            <p style="color:#64748b; font-style:italic;">💡 Puedes ver los guardados automáticos en la consola del navegador (F12)</p>
            <p style="color:#475569; line-height:1.7; margin-top:8px;">Mientras tengas algo escrito sin guardar todavía, el sistema protege esa edición: ignora temporalmente los cambios que otras personas guarden en cualquier otra fila de la tabla, para que no te pisen lo que estás escribiendo. Apenas tu cambio se guarda (automático o manual), vuelve a mostrar los cambios de los demás con normalidad.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">8.2 Color de Filas</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Puedes marcar filas con colores para organizar visualmente:</p>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en el círculo 🎨 de la fila</li>
                <li>Selecciona un color de la paleta</li>
                <li>La fila se resaltará con ese color</li>
            </ol>
            <p style="color:#64748b; font-style:italic;">💡 Útil para marcar urgencias o casos especiales</p>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">8.3 Validación de RUT</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">El sistema valida automáticamente el RUT mientras escribes:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>✅ <strong>Verde</strong>: RUT válido</li>
                <li>❌ <strong>Rojo</strong>: RUT inválido</li>
            </ul>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">8.4 Búsqueda de Intervenciones</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">El campo de intervención tiene un buscador integrado:</p>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Escribe parte del nombre de la intervención</li>
                <li>Aparecerán sugerencias</li>
                <li>Selecciona la intervención deseada</li>
                <li>El campo <strong>Tipo_Actividad</strong> se llenará automáticamente</li>
            </ol>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">8.5 Cálculo Automático de T_QX</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">El tiempo quirúrgico real se calcula automáticamente:</p>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Ingresa <strong>Hora_de_entrada</strong></li>
                <li>Ingresa <strong>Hora_de_salida</strong></li>
                <li>El campo <strong>T_QX</strong> se actualiza automáticamente</li>
            </ol>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">8.6 Impresión de Día</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en <strong>"🖨️ Imprimir Día"</strong></li>
                <li>Se abrirá una ventana con el resumen del día</li>
                <li>Puedes imprimir o guardar como PDF</li>
            </ol>
        `,

        'lista-espera': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">🩺 Lista de Espera</h1>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Es el módulo de gestión de pacientes preoperatorios: registra a cada paciente desde que se indica la cirugía hasta que se programa en la Tabla Quirúrgica, con sus datos clínicos y administrativos, prioridad, GES, indicaciones del anestesista y seguimiento de llamados.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">9.1 Acceso a la Sección</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en el menú 🍔 (hamburguesa)</li>
                <li>Selecciona <strong>"🩺 Lista de Espera"</strong></li>
            </ol>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Solo aparece en el menú si tu cuenta tiene habilitado el acceso a esta sección (ver 7.4)</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">9.2 Pestañas del Módulo</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Pestaña</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Contenido</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">🏠 Dashboard</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Indicadores generales y gráficos (ver 9.3)</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">➕ Nuevo Paciente</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Formulario de ingreso de un paciente nuevo (ver 9.4)</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">📋 Lista de Pacientes</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Tabla maestra con todos los pacientes, filtros y acciones (ver 9.5)</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">📜 Histórico RDLL</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Registro Diario de Lista de Espera y gestión de llamados (ver 9.6)</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">⚙️ Administrar Listas</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">CRUD de especialidades, médicos, estatus, anestesiólogos y comunas <strong>(solo superadministrador)</strong></td></tr>
                </tbody>
            </table>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">9.3 Dashboard</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Muestra, sobre el total de pacientes gestionables:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Mediana de espera general y de espera hasta programación</li>
                <li>Percentiles 25 / 50 / 75 / 90 y "Mayor Espera", calculables desde <strong>Fecha Indicación Qx</strong> o desde <strong>Fecha Estatus Programable</strong></li>
                <li>Pacientes por <strong>Prioridad</strong> (P1 / P2 / P3) y por <strong>GES</strong> (SI / NO)</li>
                <li>Gráficos por especialidad y por estatus de tabla, ingresos por mes, medianas por especialidad</li>
                <li>Listado de pacientes con mayor tiempo de espera y de los últimos 5 registrados</li>
                <li><strong>📞 Pacientes para Llamar (Fecha Programada)</strong>: cada fila se colorea según cuántos días faltan para el llamado (o si ya está atrasado)</li>
                <li><strong>⏳ Pacientes que Superaron el Plazo de Espera</strong>: pacientes gestionables cuya <strong>Fecha Estatus Programable</strong> ya superó los 6 meses (fila amarilla) o el año (fila roja). Tiene un filtro para ver solo "entre 6 meses y 1 año" o solo "más de 1 año", muestra el total de pacientes encontrados, cada fila tiene su botón 👁️ Ver, y la lista se pagina de a 15 registros</li>
            </ul>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">9.4 Nuevo Paciente</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Formulario con los datos del paciente: identificación, fechas (indicación, nacimiento), diagnóstico, intervención, especialidad, médico tratante, GES, Prioridad, exámenes preoperatorios (TACO/ASA/EKG/RX/ECO), indicaciones del anestesista, teléfono, comuna y observaciones. Al guardar, el paciente queda con estatus inicial <strong>"En Lista de Espera"</strong>.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">9.5 Lista de Pacientes</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Tabla con todos los pacientes registrados, con filtros por especialidad, estatus, prioridad, GES y búsqueda por nombre/RUT. Cada fila tiene dos acciones posibles:</p>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Botón</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Función</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">👁️ Ver</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Muestra la ficha completa del paciente y permite editarla</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;">📋 Cargar a la Tabla</td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Ver sección 10. Solo aparece si el paciente es gestionable y todavía no está cargado en la Tabla Quirúrgica</td></tr>
                </tbody>
            </table>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">9.6 Histórico RDLL</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Visor del Registro Diario de Lista de Espera: una colección separada de registros de llamados (migrados o ingresados manualmente), con edición, eliminación, importación desde Excel y exportación a Excel. Es distinto del historial de llamados de cada paciente individual, que se gestiona desde su propia ficha (👁️ Ver, en Lista de Pacientes).</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">9.7 Administrar Listas</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Pestaña exclusiva de superadministrador para gestionar las opciones de los desplegables propios de Lista de Espera: especialidades y médicos por especialidad, estatus tabla, estatus EPA, anestesiólogos y comunas — mismo patrón de agregar/eliminar que en 7.5.</p>
        `,

        'cargar-a-tabla': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">📋 Cargar a la Tabla</h1>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Es el puente entre Lista de Espera y Tabla Quirúrgica: copia los datos de un paciente en espera a una fila de la tabla, sin borrarlo de Lista de Espera — sigue apareciendo ahí, con su estatus actualizado, para el seguimiento clínico posterior.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">10.1 Cómo Usarlo</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>En <strong>Lista de Espera → Lista de Pacientes</strong>, haz clic en <strong>📋</strong> ("Cargar a la Tabla") en el paciente deseado</li>
                <li>Elige <strong>Semana</strong>, <strong>Día</strong>, <strong>Pabellón</strong> y <strong>Fila</strong> de destino</li>
                <li>Confirma. Si la fila destino ya tiene datos, se te preguntará si deseas sobrescribirla</li>
            </ol>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">10.2 Qué Datos se Copian</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Nombre, RUT, Edad, Diagnóstico, Intervención Propuesta, Especialidad y Cirujano (médico tratante). El campo <strong>FICHA</strong> queda vacío y <strong>Condición_LE</strong> se marca como "Ingresado desde Lista de Espera".</p>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ El <strong>Anestesista</strong> NO se copia automáticamente — se asigna aparte, directamente en la fila de la tabla, al momento de programar.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">10.3 Qué Pasa en Lista de Espera</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">El registro del paciente permanece en Lista de Espera. Su estatus cambia a <strong>"Programado en Tabla"</strong> y queda vinculado a esa fila específica de la tabla, así que a partir de ahí se actualiza solo, sin que tengas que hacer nada más:</p>
            <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Si en la tabla cambias el <strong>ESTADO_DE_IQx</strong> de esa fila (por ejemplo a OPERADO, SUSPENDIDO, CONDICIONAL, etc.), el estatus en Lista de Espera se actualiza automáticamente para reflejarlo</li>
                <li>Si el paciente se <strong>difiere</strong> o se <strong>reubica</strong> (incluyendo el caso SUSPENDIDO/CONDICIONAL que preserva la fila, ver 3.2), el vínculo sigue al paciente</li>
                <li>Si la fila se <strong>elimina</strong> o se <strong>limpia</strong> (Limpiar Pabellón/Día) sin transferir el paciente a otro lado, su estatus en Lista de Espera vuelve a <strong>"En Lista de Espera"</strong> — nunca se pierde el registro</li>
                <li>Cada uno de estos cambios queda además registrado en el <strong>historial</strong> de la ficha del paciente</li>
            </ul>
            <p style="color:#64748b; font-style:italic; margin-top:8px;">💡 Mientras un paciente esté cargado en la tabla, el botón 📋 desaparece de su fila en Lista de Pacientes (para no cargarlo dos veces). Vuelve a aparecer si el vínculo se libera por alguno de los motivos de arriba.</p>
        `,

        'whatsapp': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">💬 Mensajería WhatsApp</h1>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Permite enviar a un paciente un mensaje de WhatsApp con datos precargados (nombre, fecha, hora, especialidad, cirujano, pabellón, indicaciones del anestesista), a partir de plantillas predefinidas, directamente desde su fila en la Tabla Quirúrgica.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">11.1 Enviar un Mensaje</h2>
            <ol style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:16px;">
                <li>Haz clic en el botón <strong>💬</strong> de la fila del paciente</li>
                <li>Si el paciente no tiene teléfono registrado en Lista de Espera, se te pedirá que lo ingreses</li>
                <li>Elige, de la lista de títulos, qué plantilla quieres enviar</li>
                <li>Se abre WhatsApp Web con el chat y el mensaje ya escritos — solo tienes que enviarlo ahí</li>
                <li>Vuelve a la app y confirma <strong>"✅ Sí, se envió"</strong> para marcar la fila como contactada</li>
            </ol>
            <p style="color:#64748b; font-style:italic; margin-top:8px;">💡 Una vez confirmado el envío, el botón muestra un check ✅ junto al 💬. Si vuelves a enviar otro mensaje a la misma fila, la ventana de WhatsApp Web se reutiliza en vez de abrir una pestaña nueva.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">11.2 Origen del Teléfono</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Si el paciente fue cargado a la tabla con <strong>"📋 Cargar a la Tabla"</strong> (sección 10), su teléfono se busca automáticamente en su ficha de Lista de Espera. Si no hay vínculo, se busca por coincidencia de RUT. Si de todas formas no se encuentra, la app pide ingresarlo manualmente para ese envío.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">11.3 Variables Disponibles en las Plantillas</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Variable</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Se reemplaza por</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;"><code>{nombre}</code></td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Nombre del paciente</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;"><code>{fecha}</code></td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Fecha de la cirugía</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;"><code>{hora}</code></td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Hora / T_Qx programado</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;"><code>{especialidad}</code></td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Especialidad de la fila</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;"><code>{cirujano}</code></td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Cirujano de la fila</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;"><code>{pabellon}</code></td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Pabellón (PAB 1 / PAB 2)</td></tr>
                    <tr><td style="padding:8px 12px; border:1px solid #e2e8f0;"><code>{indicaciones_anestesiologo}</code></td><td style="padding:8px 12px; border:1px solid #e2e8f0;">Indicaciones del anestesista, tomadas de la ficha en Lista de Espera</td></tr>
                </tbody>
            </table>
            <p style="color:#dc2626; font-size:0.9rem; margin-top:8px;">⚠️ Una variable solo se rellena si está escrita exactamente así, con llaves, dentro del texto de la plantilla. Si falta en una plantilla, no aparecerá en el mensaje enviado con ella.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">11.4 Administrar Plantillas</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Desde <strong>Panel de Administración → 💬 Plantillas de WhatsApp</strong> (superadministrador) puedes agregar una plantilla nueva, editar el título/mensaje de una existente directamente en su tarjeta, o eliminarla.</p>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">11.5 Registro del Envío</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Al confirmar el envío, queda registrado en la fila (plantilla usada, fecha/hora y usuario) y, si el paciente está vinculado a Lista de Espera, se agrega también una entrada al historial de su ficha.</p>
        `,

        'problemas': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">🔧 Solución de Problemas</h1>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">12.1 Problemas Comunes</h2>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Problema</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Posible Causa</th>
                        <th style="padding:8px 12px; text-align:left; border:1px solid #e2e8f0;">Solución</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">No puedo iniciar sesión</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Contraseña incorrecta</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Contacta al administrador</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Los datos no se guardan</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Sin conexión a Internet</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Verifica tu conexión</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Error de permisos</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Rol insuficiente</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Contacta al administrador</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">La tabla no carga</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Error de sincronización</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Recarga la página (F5)</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Los botones Diferir/Reubicar están deshabilitados</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">ESTADO_DE_IQx tiene un estado elegido (que no sea SUSPENDIDO o CONDICIONAL (NO OPERADO)), o esa fila ya fue diferida/reubicada antes</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Es el comportamiento esperado (ver sección 3.2); vuelve el campo a "Seleccione" si corresponde</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">No veo una sección en el menú (Estadísticas, Libro, etc.)</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Tu cuenta no tiene permiso para esa sección</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Pide al administrador que te dé acceso desde "🔐 Permisos" (sección 7.4)</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">No puedo editar ni guardar nada en Tabla Quirúrgica</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Tu cuenta está en modo solo lectura</td>
                        <td style="padding:8px 12px; border:1px solid #e2e8f0;">Es el comportamiento esperado; solo un administrador puede desactivarlo</td>
                    </tr>
                </tbody>
            </table>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">12.2 Verificar Conexión a Firebase</h2>
            <p style="color:#475569; line-height:1.7; margin-bottom:12px;">Abre la consola (F12) y escribe:</p>
            <pre style="background:#1e293b; color:#e2e8f0; padding:12px 16px; border-radius:8px; overflow-x:auto; font-size:0.85rem; margin-bottom:16px;">
database.ref('.info/connected').on('value', function(snap) {
    console.log(snap.val() ? '✅ Conectado a Firebase' : '❌ Sin conexión');
});</pre>
            
            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">12.3 Forzar Sincronización</h2>
            <pre style="background:#1e293b; color:#e2e8f0; padding:12px 16px; border-radius:8px; overflow-x:auto; font-size:0.85rem; margin-bottom:16px;">
cargarDatosDesdeFirebase();</pre>

            <h2 style="font-size:1.3rem; color:#0b2a4f; margin-top:24px; margin-bottom:12px;">12.4 Recargar Datos</h2>
            <pre style="background:#1e293b; color:#e2e8f0; padding:12px 16px; border-radius:8px; overflow-x:auto; font-size:0.85rem; margin-bottom:16px;">
location.reload();</pre>
        `,
        
        'faq': `
            <h1 style="font-size:1.8rem; color:#0b2a4f; margin-bottom:16px;">❓ Preguntas Frecuentes</h1>
            
            <div style="margin-bottom:20px;">
                <h3 style="color:#0b2a4f; font-size:1.1rem; margin-bottom:6px;">❓ ¿Cómo sé que mis datos se guardaron correctamente?</h3>
                <p style="color:#475569; line-height:1.7;">Verás un mensaje en la parte inferior o un modal de confirmación. También puedes verificar en la consola (F12) el mensaje <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px;">✅ X filas guardadas</code></p>
            </div>
            
            <div style="margin-bottom:20px;">
                <h3 style="color:#0b2a4f; font-size:1.1rem; margin-bottom:6px;">❓ ¿Qué hago si cierro la página sin guardar?</h3>
                <p style="color:#475569; line-height:1.7;">El sistema tiene guardado automático 60 segundos después del último cambio, por lo que la mayoría de los datos ya estarán guardados.</p>
            </div>
            
            <div style="margin-bottom:20px;">
                <h3 style="color:#0b2a4f; font-size:1.1rem; margin-bottom:6px;">❓ ¿Cómo recupero un dato eliminado?</h3>
                <p style="color:#475569; line-height:1.7;">Los datos eliminados no se pueden recuperar. Sin embargo, si estaban en el Libro de Quirófano, permanecen allí.</p>
            </div>
            
            <div style="margin-bottom:20px;">
                <h3 style="color:#0b2a4f; font-size:1.1rem; margin-bottom:6px;">❓ ¿Qué significa "SUSPENDIDO" en ESTADO_DE_IQx?</h3>
                <p style="color:#475569; line-height:1.7;">Un paciente SUSPENDIDO es aquel cuya cirugía fue suspendida. Junto con CONDICIONAL (NO OPERADO), es una excepción a la regla general de bloqueo:</p>
                <ul style="color:#475569; line-height:1.8; padding-left:24px; margin-bottom:8px;">
                    <li>Los botones Diferir y Reubicar SÍ quedan habilitados (a diferencia de cualquier otro estado elegido)</li>
                    <li>Si se difiere o reubica, la fila original NO se elimina — el paciente sigue visible ahí</li>
                    <li>Una vez usado Diferir o Reubicar en esa fila, ambos botones se bloquean para no duplicar al paciente</li>
                </ul>
            </div>
            
            <div style="margin-bottom:20px;">
                <h3 style="color:#0b2a4f; font-size:1.1rem; margin-bottom:6px;">❓ ¿Puedo acceder desde mi celular?</h3>
                <p style="color:#475569; line-height:1.7;">Sí, la aplicación es responsive y funciona en dispositivos móviles.</p>
            </div>
            
            <div style="margin-bottom:20px;">
                <h3 style="color:#0b2a4f; font-size:1.1rem; margin-bottom:6px;">❓ ¿Los datos se sincronizan en tiempo real?</h3>
                <p style="color:#475569; line-height:1.7;">Sí, todos los usuarios conectados ven los mismos datos en tiempo real.</p>
            </div>

            <div style="margin-bottom:20px;">
                <h3 style="color:#0b2a4f; font-size:1.1rem; margin-bottom:6px;">❓ ¿Puedo restringir a qué secciones accede un usuario?</h3>
                <p style="color:#475569; line-height:1.7;">Sí, si eres administrador. Al crear un usuario (o después, desde "🔐 Permisos" en la lista de usuarios) puedes elegir exactamente qué secciones puede ver. Ver sección 7.4.</p>
            </div>

            <div style="margin-bottom:20px;">
                <h3 style="color:#0b2a4f; font-size:1.1rem; margin-bottom:6px;">❓ ¿Qué es el modo "solo lectura" en Tabla Quirúrgica?</h3>
                <p style="color:#475569; line-height:1.7;">Un usuario en ese modo puede navegar semanas y días, e Imprimir Día, pero no puede editar, guardar, agregar/eliminar filas ni usar ninguna otra función de esa sección. Lo activa un administrador desde "🔐 Permisos". Ver sección 7.4.</p>
            </div>
        `
    };
}

function cargarContenidoManual(seccionId) {
    const contenidoInner = document.getElementById('manualContenidoInner');
    construirManualContenidos();

    // Obtener el contenido de la sección seleccionada
    const contenido = MANUAL_CONTENIDOS[seccionId] || `
        <p style="color:#94a3b8; text-align:center; padding:60px 20px; font-size:1.1rem;">
            Contenido no disponible
        </p>
    `;

    contenidoInner.innerHTML = contenido;

    // Scroll al inicio del contenido
    const contenedor = document.getElementById('manualContenido');
    if (contenedor) {
        contenedor.scrollTop = 0;
    }
}

// =============================================================
// 📄 DESCARGA: manual completo en PDF (portada + índice clicable)
// Misma técnica de "ventana de impresión" que Análisis IA/Estadísticas:
// arma un documento HTML completo y llama a window.print() — el usuario
// elige "Guardar como PDF" en el diálogo de impresión del navegador.
// =============================================================
async function descargarManualPDF() {
    construirManualContenidos();
    const logoDataUrl = await obtenerLogoDataUrl();
    const fechaGeneracion = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL');

    let indiceHtml = '';
    MANUAL_SECCIONES.forEach(sec => {
        indiceHtml += `<li><a href="#manualpdf-${sec.id}">${sec.icono} ${sec.titulo}</a></li>`;
    });

    let seccionesHtml = '';
    MANUAL_SECCIONES.forEach(sec => {
        seccionesHtml += `<section id="manualpdf-${sec.id}" class="manualpdf-seccion">${MANUAL_CONTENIDOS[sec.id] || ''}</section>`;
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Sistema de Gestión Proceso Quirúrgico - Manual de Usuario</title>
            <style>
                * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
                html, body { width:100%; max-width:100%; }
                body { font-family:'Segoe UI', Arial, sans-serif; background:white; color:#1e293b; }
                @page { size:A4 portrait; margin:15mm; }
                img, table { max-width:100%; }
                h1, h2, h3 { page-break-after: avoid; }
                table, .manualpdf-seccion > div { page-break-inside: avoid; }

                .manualpdf-portada {
                    min-height: 247mm;
                    display:flex; flex-direction:column; align-items:center; justify-content:center;
                    text-align:center;
                    background:linear-gradient(135deg, #0b2a4f 0%, #1a6d8a 100%);
                    color:white;
                    padding:40px;
                    page-break-after: always;
                }
                .manualpdf-portada img { height:90px; width:auto; background:rgba(255,255,255,0.9); padding:10px; border-radius:12px; margin-bottom:28px; }
                .manualpdf-portada h1 { font-size:2rem; font-weight:800; margin-bottom:10px; letter-spacing:0.3px; }
                .manualpdf-portada h2 { font-size:1.2rem; font-weight:500; opacity:0.9; margin-bottom:30px; }
                .manualpdf-portada .sub { font-size:0.95rem; opacity:0.85; margin-bottom:6px; }
                .manualpdf-portada .fecha { font-size:0.8rem; opacity:0.7; margin-top:40px; }
                .manualpdf-portada .copyright { font-size:0.78rem; opacity:0.75; margin-top:6px; }

                .manualpdf-indice { page-break-after: always; padding-top:10px; }
                .manualpdf-indice h1 { font-size:1.5rem; color:#0b2a4f; margin-bottom:20px; border-bottom:2px solid #e2e8f0; padding-bottom:10px; }
                .manualpdf-indice ol { list-style:none; padding:0; counter-reset: indice; }
                .manualpdf-indice li { margin-bottom:12px; font-size:0.95rem; }
                .manualpdf-indice a { color:#0b2a4f; text-decoration:none; }
                .manualpdf-indice a:hover { text-decoration:underline; }

                .manualpdf-seccion { padding-top:4px; }

                .manualpdf-footer { margin-top:40px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:0.7rem; color:#94a3b8; text-align:center; }

                @media print {
                    .no-print { display:none; }
                }
            </style>
        </head>
        <body>
            <div class="manualpdf-portada">
                ${logoDataUrl ? `<img src="${logoDataUrl.dataUrl}" alt="Hospital de Illapel">` : ''}
                <h1>Sistema de Gestión Proceso Quirúrgico</h1>
                <h2>Manual de Usuario</h2>
                <div class="sub">Hospital Dr. Humberto Elorza Cortés · Illapel, Chile</div>
                <div class="fecha">Generado el ${fechaGeneracion}</div>
                <div class="copyright">© Dr. Danilo A. Nava La C. · Jefe del Proceso Quirúrgico</div>
            </div>

            <div class="manualpdf-indice">
                <h1>📖 Índice</h1>
                <ol>${indiceHtml}</ol>
            </div>

            ${seccionesHtml}

            <div class="manualpdf-footer">© Dr. Danilo A. Nava La C. · Sistema de Gestión Proceso Quirúrgico</div>
        </body>
        </html>
    `;

    const ventana = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
    if (ventana) {
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();
        let yaImpreso = false;
        ventana.addEventListener('load', function() {
            if (!yaImpreso) { yaImpreso = true; ventana.print(); }
        });
        setTimeout(function() {
            if (!yaImpreso) { yaImpreso = true; ventana.print(); }
        }, 2000);
    } else {
        showModal({
            title: '⚠️ Error',
            message: 'No se pudo abrir la ventana de impresión.<br>Verifica que los pop-ups estén habilitados.',
            icon: '⚠️',
            confirmText: 'Aceptar'
        });
    }
}