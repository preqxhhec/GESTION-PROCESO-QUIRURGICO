// firebase-config.js

// 🔥 CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDev4ZgPnltWMKLHbrk-IQCyFHqFBF49zw",
    authDomain: "gestion-proceso-quirurgico.firebaseapp.com",
    databaseURL: "https://gestion-proceso-quirurgico-default-rtdb.firebaseio.com",
    projectId: "gestion-proceso-quirurgico",
    storageBucket: "gestion-proceso-quirurgico.firebasestorage.app",
    messagingSenderId: "316500976369",
    appId: "1:316500976369:web:254eb8df56de2d2c1abf50",
    measurementId: "G-VZKJ9Q7712"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener referencias a los servicios
const database = firebase.database();
const auth = firebase.auth();

// ✅ Hacer firebase accesible globalmente (NUEVA LÍNEA)
window.firebase = firebase;