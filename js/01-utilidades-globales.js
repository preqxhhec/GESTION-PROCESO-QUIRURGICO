// =============================================================
// VARIABLES GLOBALES
// =============================================================
let currentUser = null;
let currentUserEmail = '';
let currentUserRol = '';



// =============================================================
// 🔄 ACTUALIZAR DÍA ACTIVO EN EL DOM
// =============================================================
function actualizarDiaActivo() {
    document.querySelectorAll('.day-btn').forEach((btn, idx) => {
        if (idx === currentDay) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}



// =============================================================
// 📅 FECHA OBLIGATORIA — una fila con datos de paciente cargados NO se
// puede guardar (temporal ni definitivo), diferir, reubicar ni registrar
// definitivamente si le falta FECHA. Reutilizado por js/02 (guardado),
// js/03 (registrar definitivo) y js/08 (diferir/reubicar).
// =============================================================
const CAMPOS_DATOS_PACIENTE = [
    'T_Qx', 'Jornada', 'Cirujano', 'Especialidad', 'Anestesista',
    'Nombre_Paciente', 'RUT', 'Edad', 'FICHA', 'Diagnostico',
    'Intervencion_propuesta', 'Condicion_LE', 'ESTADO_DE_IQx'
];

// true si la fila tiene un paciente cargado (sin contar FECHA, que es
// justo el campo que estamos validando por separado).
function filaTienePacienteCargado(fila) {
    return CAMPOS_DATOS_PACIENTE.some(campo => {
        const v = fila[campo] || '';
        return v !== '' && v !== 'Seleccione';
    });
}

function filaFechaVacia(fila) {
    const v = fila['FECHA'] || '';
    return v === '' || v === 'Seleccione';
}

// Filas (de la lista dada) que tienen paciente cargado pero les falta FECHA.
function obtenerFilasSinFechaObligatoria(filas) {
    return filas.filter(fila => filaTienePacienteCargado(fila) && filaFechaVacia(fila));
}

function mostrarAlertaFechaFaltante(cantidad) {
    showModal({
        title: '📅 Falta la fecha',
        message: cantidad === 1
            ? 'Hay una fila con datos de paciente pero sin <strong>FECHA</strong>.<br><br>Ingresa la fecha antes de continuar.'
            : `Hay <strong>${cantidad} filas</strong> con datos de paciente pero sin <strong>FECHA</strong>.<br><br>Ingresa la fecha en todas antes de continuar.`,
        icon: '📅',
        confirmText: 'Aceptar'
    });
}

// =============================================================
// 📋 CAUSALES DE SUSPENSIÓN Y MOTIVOS
// =============================================================
const CAUSALES_SUSPENSION = {
    '1': {
        label: '1.- Atribuidas al paciente',
        motivos: [
            '1.1- Patología aguda.',
            '1.2- No se presenta.',
            '1.3- Rechaza operación.',
            '1.4- Falta de ayuno.',
            '1.5- Descompensación en pabellón.',
            '1.6- Anticipación de cirugía por agudización de patología.',
            '1.7- Paciente fallece.',
            '1.8- Atraso al ingreso.'
        ]
    },
    '2': {
        label: '2.- Administrativas',
        motivos: [
            '2.1- Patología no informada, no conocida.',
            '2.2- Estudio incompleto.',
            '2.3- Documentación incompleta.',
            '2.4- Falta de preparación de piel, intestinal, antibiótica, suspensión de anticoagulantes u otra especificada.',
            '2.5- Falta de disponibilidad de cama básica.',
            '2.6- Falta de disponibilidad de cama media.',
            '2.7- Falta de disponibilidad de cama UTI.',
            '2.8- Falta de disponibilidad de cama UCI.',
            '2.9- Sin cupo en recuperación.',
            '2.10- Sin consentimiento informado firmado/ Falta de tutor legal consignado.'
        ]
    },
    '3': {
        label: '3.- Unidades de Apoyo Clínico',
        motivos: [
            '3.1- Falta de sangre o hemoderivados.',
            '3.2- Falla de coordinación con Unidad de Imagenología.',
            '3.3- Falla de coordinación con Unidad de Anatomía patológica (biopsia rápida).'
        ]
    },
    '4': {
        label: '4.- Unidades de Apoyo Logístico',
        motivos: [
            '4.1- Instrumental y/o material con falla de esterilización.',
            '4.2- Instrumental incompleto o no disponible.',
            '4.3- Equipamiento médico no operativo.',
            '4.4- Falta de equipo, insumos y/o cajas quirúrgicas por parte de proveedor externo.',
            '4.5- Falta de medicamentos o stock insuficiente.',
            '4.6- Falta de insumos o stock insuficiente.',
            '4.7- Falta de ropa quirúrgica o stock insuficiente.'
        ]
    },
    '5': {
        label: '5.- Equipo Quirúrgico',
        motivos: [
            '5.1- Falta / Disponibilidad de Cirujano/a.',
            '5.2- Falta / Disponibilidad de Anestesiólogo/a.',
            '5.3- Falta / Disponibilidad de Técnico de enfermería de nivel superior o técnico paramédico.',
            '5.4- Falta / Disponibilidad profesional no médico.',
            '5.5- Error de programación.',
            '5.6- Reemplazo por urgencia.'
        ]
    },
    '6': {
        label: '6.- Infraestructura',
        motivos: [
            '6.1- Falla energía eléctrica.',
            '6.2- Falla de climatización.',
            '6.3- Falla de red húmeda.',
            '6.4- Falla Ascensor.',
            '6.5- Falla gases clínicos.'
        ]
    },
    '7': {
        label: '7.- Emergencias',
        motivos: [
            '7.1- Desastres naturales: terremotos, aluviones, tsunamis, inundaciones, erupciones volcánicas, etc.',
            '7.2- Destrucción repentina e irrecuperable de la infraestructura del hospital.',
            '7.3- Accidentes múltiples.',
            '7.4- Incendios o amago de incendio.',
            '7.5- Derrame de productos químicos.',
            '7.6- Aviso de bomba.',
            '7.7- Actos delictuales.',
            '7.8- Emergencia sanitaria.'
        ]
    },
    '8': {
        label: '8.- Gremiales',
        motivos: [
            '8.1- Gremiales.'
        ]
    }
};



// =============================================================
// 🧮 FUNCIÓN DE FORMATEO DE RUT (DEFINITIVA Y A PRUEBA DE TODO)
// =============================================================
function formatearRut(rut) {
    // 1. Convertir a string de forma segura
    const rutStr = typeof rut === 'number' ? String(rut) : (rut || '');
    if (!rutStr) return '';

    // 2. Limpiar SIEMPRE (eliminar puntos, guiones y caracteres no válidos)
    let limpio = rutStr.replace(/[.\-]/g, '').replace(/[^0-9kK]/g, '').toUpperCase();

    // 3. Si es muy corto, devolver tal cual
    if (limpio.length <= 1) return limpio;

    // 4. Separar cuerpo y dígito verificador
    let cuerpo = limpio.slice(0, -1);
    let dv = limpio.slice(-1);

    // 5. Formatear el cuerpo con puntos (de derecha a izquierda)
    let formateado = '';
    for (let i = 0; i < cuerpo.length; i++) {
        if (i > 0 && (cuerpo.length - i) % 3 === 0) {
            formateado += '.';
        }
        formateado += cuerpo[i];
    }

    // 6. Retornar con guion
    return `${formateado}-${dv}`;
}

function validarRut(rutCompleto) {
    if (!rutCompleto) return false;

    const rutStr = typeof rutCompleto === 'number' ? String(rutCompleto) : rutCompleto;
    const limpio = rutStr.replace(/[.\-]/g, '').replace(/[^0-9Kk]/g, '').toUpperCase();
    
    if (limpio.length < 2) return false;

    const cuerpo = limpio.slice(0, -1);
    const dvIngresado = limpio.slice(-1);
    const dvCalculado = calcularDV(cuerpo);
    
    return dvIngresado === dvCalculado;
}

function calcularDV(rut) {
    // Asegurar que solo lleguen dígitos
    const cuerpo = String(rut).replace(/[^0-9]/g, '');
    if (!cuerpo) return null;

    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        const digito = parseInt(cuerpo.charAt(i), 10);
        suma += digito * multiplo;
        multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }

    const resto = 11 - (suma % 11);
    if (resto === 11) return '0';
    if (resto === 10) return 'K';
    return String(resto);
}
