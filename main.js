import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// 1. Escena y Cámara
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5; // La cámara está en Z=5 mirando hacia el centro (Z=0 y más allá)

// 2. Renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: true permite fondo transparente
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 3. Iluminación
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(0, 0, 10);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

// 4. Texturas de las cartas
const textureLoader = new THREE.TextureLoader();

// ==========================================
// IMPORTANTE: Aquí pones tus archivos PNG
// Reemplaza estas URLs por el nombre de tus archivos
// ==========================================
const frontTexture = textureLoader.load('assets/cartas/conrev.png'); 

// Precargar las 32 texturas posibles para los reversos
const backTextures = [];
for (let i = 1; i <= 32; i++) {
    // Aquí puedes cambiar a tus archivos locales, por ejemplo:
    // const url = `assets/cartas/reversos/${i}.png`;
    const url = `https://picsum.photos/seed/${i + 100}/400/600`; // Imágenes de prueba distintas
    backTextures.push(textureLoader.load(url));
}

// 5. Sistema de Cartas
const cards = []; 

// Geometría: Una caja muy delgada simulando una carta (Ancho, Alto, Grosor)
const cardGeometry = new THREE.BoxGeometry(5, 8, 0.05);

// Materiales base (el material 5 se reemplazará al azar por carta)
const baseMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true }), // Borde derecho
    new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true }), // Borde izquierdo
    new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true }), // Borde superior
    new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true }), // Borde inferior
    new THREE.MeshStandardMaterial({ map: frontTexture, transparent: true }), // Cara FRONTAL
    new THREE.MeshStandardMaterial({ color: 0x222222, transparent: true })    // Cara TRASERA (Placeholder)
];

// Función que "crea" una nueva carta
function createCard() {
    // Clonamos materiales para opacidad independiente
    const uniqueMaterials = baseMaterials.map(mat => mat.clone());
    
    // Asignar reverso aleatorio de entre las 32 variables
    const randomBack = backTextures[Math.floor(Math.random() * backTextures.length)];
    uniqueMaterials[5].map = randomBack;
    uniqueMaterials[5].needsUpdate = true;

    const card = new THREE.Mesh(cardGeometry, uniqueMaterials);

    // Nace en el centro, pero muy al fondo
    const range = 10;

card.position.set(
  (Math.random() - 0.5) * range,
  (Math.random() - 0.5) * range,
  -30
);

    // Calcular trayectoria hacia los bordes o esquinas (evitar el centro vertical o frontal)
    const dirX = Math.random() > 0.5 ? 1 : -1; // Ir siempre hacia derecha (1) o izquierda (-1)
    
    // Garantiza una velocidad horizontal mínima para escapar hacia los lados
    const baseVelX = dirX * (0.08 + Math.random() * 0.08);
    
    // velY determina si va a las esquinas (alto/bajo) o se queda en el borde medio
    const baseVelY = (Math.random() - 0.05) * 0.05;

    // Física personalizada
    card.userData = {
        velX: baseVelX,
        velY: baseVelY,
        velZ: 0.1 + Math.random() * 0.02, 

        // Rotación exclusiva en Z (como volante) para no mostrar atrás
        rotX: 0.001,
        rotY: 0,
        rotZ: (Math.random() - 0.5) * 0.03,

        // Rotación base para poder volver a ella tras el hover
        baseRotX: 0,
        baseRotY: 0,
        baseRotZ: 0,

        opacity: 0.0, // Fade-in inicial
        state: 'fadeIn'
    };

    card.material.forEach(mat => mat.opacity = 0);

    scene.add(card);
    cards.push(card);
}

// Generar carta cada 250ms
let cardInterval = setInterval(createCard, 1000);

// Evitar acumulación de elementos al minimizar la ventana
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(cardInterval); // Pausar generación
    } else {
        cardInterval = setInterval(createCard, 250); // Reanudar
    }
});

// -- SISTEMA DE HOVER DINÁMICO --
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-2, -2);
let hoveredCard = null;
let globalSpeedMultiplier = 1.0;
let targetGlobalSpeed = 1.0;

// Hitbox invisible (5x8) para estabilizar el hover durante las rotaciones
const hoverHitboxGeometry = new THREE.PlaneGeometry(5, 8);
const hoverHitboxMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const hoverHitbox = new THREE.Mesh(hoverHitboxGeometry, hoverHitboxMaterial);
scene.add(hoverHitbox);

// Variables configurables del botón
const btnInitialColor = 0xff5555; // Color inicial (durante animación de apertura)
const btnFinalColor = 0x55ff55;   // Color final (completamente abierto)
const btnTextColor = '#ffffff';   // Color del texto

const btnGroup = new THREE.Group();

// Fondo del botón
const btnBgGeometry = new THREE.PlaneGeometry(5, 2);
const btnBgMaterial = new THREE.MeshBasicMaterial({ color: btnInitialColor, transparent: true });
const btnBg = new THREE.Mesh(btnBgGeometry, btnBgMaterial);
btnGroup.add(btnBg);

// Texto del botón
const txtCanvas = document.createElement('canvas');
txtCanvas.width = 1024;
txtCanvas.height = 409; // Ratio 5:2 para que no se deforme
const txtCtx = txtCanvas.getContext('2d');
txtCtx.fillStyle = btnTextColor ;
txtCtx.font = 'bold 110px Arial';
txtCtx.textAlign = 'center';
txtCtx.textBaseline = 'middle';
// Simulamos el padding dibujando el texto en una zona más estrecha
txtCtx.fillText('Seleccionar carta', 512, 204.5, 1024 * 0.6); 
const txtTexture = new THREE.CanvasTexture(txtCanvas);
const txtMaterial = new THREE.MeshBasicMaterial({ map: txtTexture, transparent: true, alphaTest: 0.1 });
const txtMesh = new THREE.Mesh(btnBgGeometry, txtMaterial);
txtMesh.position.z = 0.01; // Ligeramente adelante
btnGroup.add(txtMesh);

btnGroup.visible = false;
btnGroup.scale.x = 0; // Inicializado en 0 para que crezca desde el centro
scene.add(btnGroup);

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// 6. Bucle de Animación
function animate() {
    requestAnimationFrame(animate);

    raycaster.setFromCamera(mouse, camera);

    let keepHover = false;

    if (hoveredCard) {
        // El hitbox invisible sigue a la carta seleccionada para dar un área de contacto estable
        hoverHitbox.position.copy(hoveredCard.position);
        hoverHitbox.rotation.z = hoveredCard.rotation.z;

        // Comprobar colisión SÓLO contra el hitbox estable para evitar parpadeos
        const hits = raycaster.intersectObject(hoverHitbox);
        if (hits.length > 0) {
            keepHover = true;
        } else {
            hoveredCard = null;
        }
    }

    if (!keepHover) {
        // Si no estamos manteniendo un hover, buscamos una carta nueva
        const intersects = raycaster.intersectObjects(cards);
        if (intersects.length > 0) {
            hoveredCard = intersects[0].object;
            targetGlobalSpeed = 0.0;
            
            // Colocar hitbox de inmediato
            hoverHitbox.position.copy(hoveredCard.position);
            hoverHitbox.rotation.z = hoveredCard.rotation.z;
            
            // Preparar el botón
            btnGroup.visible = true;
            btnGroup.position.copy(hoveredCard.position);
            btnGroup.position.y -= 5; // Abajo de la carta
            btnGroup.position.z += 0.1;
            btnGroup.rotation.z = hoveredCard.rotation.z;
        } else {
            hoveredCard = null;
            targetGlobalSpeed = 1.0;
        }
    } else {
        // Mantener velocidad en 0 mientras el hitbox siga tocado
        targetGlobalSpeed = 0.0;
    }

    // Interpolar velocidad global (Toma ~0.5s)
    if (globalSpeedMultiplier < targetGlobalSpeed) {
        globalSpeedMultiplier = Math.min(targetGlobalSpeed, globalSpeedMultiplier + 0.033);
    } else if (globalSpeedMultiplier > targetGlobalSpeed) {
        globalSpeedMultiplier = Math.max(targetGlobalSpeed, globalSpeedMultiplier - 0.033);
    }

    // Animación del botón y sus colores
    if (hoveredCard) {
        if (btnGroup.scale.x < 1) {
            btnGroup.scale.x += 0.06; // Apertura
            btnBgMaterial.color.setHex(btnInitialColor);
        } else {
            btnGroup.scale.x = 1;
            btnBgMaterial.color.setHex(btnFinalColor); // Cambia al color final cuando abre
        }
    } else {
        if (btnGroup.scale.x > 0) {
            btnGroup.scale.x -= 0.06; // Cierre inverso
            btnBgMaterial.color.setHex(btnInitialColor); // Vuelve al color inicial
        } else {
            btnGroup.scale.x = 0;
            btnGroup.visible = false;
        }
    }

    for (let i = cards.length - 1; i >= 0; i--) {
        const card = cards[i];
        const data = card.userData;

        // Movimiento afectado por pausa
        card.position.x += data.velX * globalSpeedMultiplier;
        card.position.y += data.velY * globalSpeedMultiplier;
        card.position.z += data.velZ * globalSpeedMultiplier;

        data.baseRotX += data.rotX * globalSpeedMultiplier;
        data.baseRotY += data.rotY * globalSpeedMultiplier;
        data.baseRotZ += data.rotZ * globalSpeedMultiplier;

        // Giro hacia posición estándar de reverso si está hovered
        if (card === hoveredCard) {
            card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, 0, 0.1);
            card.rotation.y = THREE.MathUtils.lerp(card.rotation.y, Math.PI, 0.1);
            card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, 0, 0.1);
        } else {
            card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, data.baseRotX, 0.1);
            card.rotation.y = THREE.MathUtils.lerp(card.rotation.y, data.baseRotY, 0.1);
            card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, data.baseRotZ, 0.1);
        }

        // Fade-In y Fade-Out
        const distanceFromCenter = Math.sqrt(card.position.x**2 + card.position.y**2);

        if (data.state === 'fadeIn') {
            data.opacity += 0.08 * globalSpeedMultiplier; 
            if (data.opacity >= 1.0) {
                data.opacity = 1.0;
                data.state = 'traveling';
            }
        } else if (distanceFromCenter > 20 || card.position.z > 3) {
            data.opacity -= 0.03 * globalSpeedMultiplier; 
            
            if (data.opacity <= 0) {
                card.material.forEach(mat => mat.dispose());
                scene.remove(card); 
                cards.splice(i, 1); 
                continue; 
            }
        }

        // Aplicar opacidad
        card.material.forEach(mat => mat.opacity = Math.max(0, data.opacity));
    }

    renderer.render(scene, camera);
}

animate();

// 7. Tamaño responsivo
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});
