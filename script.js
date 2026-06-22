import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// 1. Escena y Cámara
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5; // La cámara está en Z=5 mirando hacia el centro (Z=0 y más allá)

// 2. Renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: true permite fondo transparente
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('main-content').appendChild(renderer.domElement);

// 3. Iluminación
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(0, 0, 10);
scene.add(directionalLight);

const backLight = new THREE.DirectionalLight(0xffffff, 1.5);
backLight.position.set(0, 0, -10);
scene.add(backLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

// 4. Texturas de las cartas
const textureLoader = new THREE.TextureLoader();
const frontTexture = textureLoader.load('assets/cartas/conrev.png'); 

// Precargar las 16 texturas posibles para los reversos
const backTextures = [];
for (let i = 1; i <= 16; i++) {
    // Aquí puedes cambiar a tus archivos locales, por ejemplo:
    // const url = `assets/cartas/reversos/${i}.png`;
    const url = `assets/cartas/contexto/${i}.png`;
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
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true })    // Cara TRASERA (Placeholder)
];

// Función que "crea" una nueva carta
function createCard() {
    if (hoveredCard) return; // Pausar generación en hover

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
let cardInterval = setInterval(createCard, 800);

// Evitar acumulación de elementos al minimizar la ventana
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(cardInterval); // Pausar generación
    } else {
        cardInterval = setInterval(createCard, 1000); // Reanudar con el intervalo original
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
const btnInitialColor = '#000000'; // Color inicial (durante animación de apertura)
const btnFinalColor = '#ffffff';   // Color final (completamente abierto)
const btnTextColor = '#000000';   // Color del texto

const colorInitial = new THREE.Color(btnInitialColor);
const colorFinal = new THREE.Color(btnFinalColor);

const btnGroup = new THREE.Group();

// Función para crear un Shape con bordes redondeados
function createRoundedRectShape(width, height, radius) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);
    return shape;
}

// Fondo del botón con bordes redondeados
const btnWidth = 5;
const btnHeight = 1.5;
const btnRadius = 0.3; // Aprox 15px relativos al tamaño
const btnBgShape = createRoundedRectShape(btnWidth, btnHeight, btnRadius);
const btnBgGeometry = new THREE.ShapeGeometry(btnBgShape);
const btnBgMaterial = new THREE.MeshBasicMaterial({ color: btnInitialColor, transparent: true });
const btnBg = new THREE.Mesh(btnBgGeometry, btnBgMaterial);
btnGroup.add(btnBg);

// Texto del botón
const txtCanvas = document.createElement('canvas');
txtCanvas.width = 1024;
txtCanvas.height = 409; // Ratio 5:2 para que no se deforme
const txtCtx = txtCanvas.getContext('2d');
txtCtx.fillStyle = btnTextColor ;
txtCtx.font = 'bold 160px Arial';
txtCtx.textAlign = 'center';
txtCtx.textBaseline = 'middle';
// Simulamos el padding dibujando el texto en una zona más estrecha
txtCtx.fillText('Seleccionar carta', 512, 204.5, 1024 * 0.6); 
const txtTexture = new THREE.CanvasTexture(txtCanvas);
const txtMaterial = new THREE.MeshBasicMaterial({ map: txtTexture, transparent: true, alphaTest: 0.1 });
const txtGeometry = new THREE.PlaneGeometry(btnWidth, btnHeight);
const txtMesh = new THREE.Mesh(txtGeometry, txtMaterial);
txtMesh.position.z = 0.01; // Ligeramente adelante
btnGroup.add(txtMesh);

btnGroup.visible = false;
btnGroup.scale.x = 0; // Inicializado en 0 para que crezca desde el centro
scene.add(btnGroup);

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

let gameState = 'floating'; // 'floating', 'trivia_transition', 'trivia'
let selectedCard = null;

window.addEventListener('click', () => {
    if (gameState === 'floating' && hoveredCard) {
        gameState = 'trivia_transition';
        selectedCard = hoveredCard;
        
        // Detener la generación de nuevas cartas
        clearInterval(cardInterval);
        
        // Esconder el botón "Seleccionar carta"
        if (btnGroup) btnGroup.visible = false;
        
        // Poner todas las demás cartas en fadeOut
        cards.forEach(card => {
            if (card !== selectedCard) {
                card.userData.state = 'fadeOut';
            }
        });
        
        // Configurar la carta seleccionada para su animación a la izquierda
        selectedCard.userData.targetPosX = -6; // Más alejada hacia la izquierda
        selectedCard.userData.targetPosY = 0;
        selectedCard.userData.targetPosZ = -4; // Más profunda para no acercarse tanto
        selectedCard.userData.targetRotY = Math.PI * 5 + 0.5; // Math.PI * 5 = muestra el reverso (con texto). +0.5 la inclina
        
        // Iniciar transición del fondo tipo cortina
        document.getElementById('trivia-bg').classList.add('active');
        
        // Luego de 2 segundos, mostrar UI y pasar a trivia
        setTimeout(() => {
            gameState = 'trivia';
            document.getElementById('trivia-ui').classList.add('active');
        }, 2000);
    }
});

// 6. Bucle de Animación
function animate() {
    requestAnimationFrame(animate);

    raycaster.setFromCamera(mouse, camera);

    let keepHover = false;

    if (gameState === 'floating') {
        if (hoveredCard) {
            hoverHitbox.position.copy(hoveredCard.position);
            hoverHitbox.rotation.z = hoveredCard.rotation.z;

            const hits = raycaster.intersectObject(hoverHitbox);
            if (hits.length > 0) {
                keepHover = true;
            } else {
                hoveredCard = null;
            }
        }

        if (!keepHover) {
            const intersects = raycaster.intersectObjects(cards);
            if (intersects.length > 0) {
                hoveredCard = intersects[0].object;
                targetGlobalSpeed = 0.0;
                
                hoverHitbox.position.copy(hoveredCard.position);
                hoverHitbox.rotation.z = hoveredCard.rotation.z;
                
                btnGroup.visible = true;
                btnGroup.position.copy(hoverHitbox.position);
                btnGroup.position.y -= 5;
                btnGroup.position.z += 0.1;
                btnGroup.rotation.z = 0;
            } else {
                hoveredCard = null;
                targetGlobalSpeed = 1.0;
            }
        } else {
            targetGlobalSpeed = 0.0;
        }
    } else {
        hoveredCard = null;
        if (btnGroup) btnGroup.visible = false;
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
        // Asegurar que siga siempre a la hitbox
        btnGroup.position.copy(hoverHitbox.position);
        btnGroup.position.y -= 5;
        btnGroup.position.z += 0.1;

        // Apertura con easing suave
        btnGroup.scale.x = THREE.MathUtils.lerp(btnGroup.scale.x, 1, 0.15);
        if (btnGroup.scale.x > 0.99) btnGroup.scale.x = 1;
        
        btnBgMaterial.color.lerp(colorFinal, 0.1); // Transición de color suave
    } else {
        // Cierre inverso con easing suave
        btnGroup.scale.x = THREE.MathUtils.lerp(btnGroup.scale.x, 0, 0.15);
        if (btnGroup.scale.x < 0.01) {
            btnGroup.scale.x = 0;
            btnGroup.visible = false;
        }
        btnBgMaterial.color.lerp(colorInitial, 0.2); // Regreso al color inicial
    }

    for (let i = cards.length - 1; i >= 0; i--) {
        const card = cards[i];
        const data = card.userData;

        if (gameState === 'floating') {
            card.position.x += data.velX * globalSpeedMultiplier;
            card.position.y += data.velY * globalSpeedMultiplier;
            card.position.z += data.velZ * globalSpeedMultiplier;

            data.baseRotX += data.rotX * globalSpeedMultiplier;
            data.baseRotY += data.rotY * globalSpeedMultiplier;
            data.baseRotZ += data.rotZ * globalSpeedMultiplier;

            if (card === hoveredCard) {
                card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, 0, 0.1);
                card.rotation.y = THREE.MathUtils.lerp(card.rotation.y, Math.PI, 0.1);
                card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, 0, 0.1);
            } else {
                card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, data.baseRotX, 0.1);
                card.rotation.y = THREE.MathUtils.lerp(card.rotation.y, data.baseRotY, 0.1);
                card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, data.baseRotZ, 0.1);
            }
        } else {
            if (card === selectedCard) {
                // Interpolación suave hacia la izquierda (dura ~2 segundos)
                card.position.x = THREE.MathUtils.lerp(card.position.x, data.targetPosX, 0.02);
                card.position.y = THREE.MathUtils.lerp(card.position.y, data.targetPosY, 0.02);
                card.position.z = THREE.MathUtils.lerp(card.position.z, data.targetPosZ, 0.02);
                
                card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, 0, 0.02);
                card.rotation.y = THREE.MathUtils.lerp(card.rotation.y, data.targetRotY, 0.02);
                card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, 0, 0.02);
            } else {
                // Las demás cartas continúan un movimiento lento mientras se desvanecen
                card.position.x += data.velX * 0.2;
                card.position.y += data.velY * 0.2;
                card.position.z += data.velZ * 0.2;
                card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, data.baseRotX, 0.1);
                card.rotation.y = THREE.MathUtils.lerp(card.rotation.y, data.baseRotY, 0.1);
                card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, data.baseRotZ, 0.1);
            }
        }

        // Fade-In y Fade-Out
        const distanceFromCenter = Math.sqrt(card.position.x**2 + card.position.y**2);

        if (data.state === 'fadeIn') {
            data.opacity += 0.08 * globalSpeedMultiplier; 
            if (data.opacity >= 1.0) {
                data.opacity = 1.0;
                data.state = 'traveling';
            }
        } else if (data.state === 'fadeOut') {
            data.opacity -= 0.015; // Suave fade out (~2 segundos)
            if (data.opacity <= 0) {
                card.material.forEach(mat => mat.dispose());
                scene.remove(card); 
                cards.splice(i, 1); 
                continue; 
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

// --- Visualizador 3D Secundario (Trivia) ---
const viewerContainer = document.getElementById('model-viewer');
const viewerScene = new THREE.Scene();
const viewerCamera = new THREE.PerspectiveCamera(50, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 100);
viewerCamera.position.z = 5;

const viewerRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
viewerRenderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
viewerContainer.appendChild(viewerRenderer.domElement);

const viewerLight = new THREE.DirectionalLight(0xffffff, 1.5);
viewerLight.position.set(2, 2, 5);
viewerScene.add(viewerLight);
viewerScene.add(new THREE.AmbientLight(0xffffff, 1.0));

// Objeto de prueba (hasta que se importe uno de Blender)
const testGeometry = new THREE.TorusKnotGeometry(0.8, 0.3, 100, 16);
const testMaterial = new THREE.MeshStandardMaterial({ color: 0x55ff55, metalness: 0.5, roughness: 0.2 });
const testMesh = new THREE.Mesh(testGeometry, testMaterial);
viewerScene.add(testMesh);

/*
// INSTRUCCIONES PARA BLENDER:
// 1. Importa GLTFLoader al inicio del archivo:
// import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
// 2. Crea una instancia del loader:
// const gltfLoader = new GLTFLoader();
// 3. Usa la función para cargar tu modelo y reemplazar 'testMesh':
// gltfLoader.load('assets/tu_modelo.glb', (gltf) => {
//     const modelo = gltf.scene;
//     // Ajusta la escala y posición del modelo si es necesario:
//     modelo.scale.set(1, 1, 1);
//     modelo.position.set(0, 0, 0);
//     viewerScene.remove(testMesh);
//     testMesh = modelo; // Reasignar referencia para interactuar
//     viewerScene.add(modelo);
// });
*/

// Interacción del visor 3D
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

viewerContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    if (isDragging && gameState === 'trivia') {
        const deltaMove = {
            x: e.offsetX - previousMousePosition.x,
            y: e.offsetY - previousMousePosition.y
        };
        
        testMesh.rotation.y += deltaMove.x * 0.01;
        testMesh.rotation.x += deltaMove.y * 0.01;
    }
    previousMousePosition = { x: e.offsetX, y: e.offsetY };
});

function animateViewer() {
    requestAnimationFrame(animateViewer);
    if (gameState === 'trivia') {
        if (!isDragging) {
            // Rotación constante a la izquierda
            testMesh.rotation.y -= 0.01;
            // Retorno a rotación vertical base (X y Z = 0)
            testMesh.rotation.x = THREE.MathUtils.lerp(testMesh.rotation.x, 0, 0.05);
            testMesh.rotation.z = THREE.MathUtils.lerp(testMesh.rotation.z, 0, 0.05);
        }
        viewerRenderer.render(viewerScene, viewerCamera);
    }
}
animateViewer();


// 7. Tamaño responsivo
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// 8. Orquestación de Animación de Introducción
window.addEventListener('DOMContentLoaded', () => {
    const logoWrapper = document.querySelector('.logo-wrapper');
    const subtitleWrapper = document.querySelector('.subtitle-wrapper');
    const mainContent = document.getElementById('main-content');
    const introScreen = document.getElementById('intro-screen');

    // 1. Inicia animación del logo (0.8s)
    setTimeout(() => {
        logoWrapper.classList.add('animate');
    }, 100);

    // 2. Inicia animación del ícono justo al terminar el logo
    setTimeout(() => {
        subtitleWrapper.classList.add('animate-icon');
    }, 900); // 100 + 800ms

    // 3. Inicia revelado del subtítulo (1s) al terminar el ícono
    setTimeout(() => {
        subtitleWrapper.classList.add('animate-text');
    }, 1700); // 900 + 800ms

    // 4. Transición de círculo revelando pantalla principal
    setTimeout(() => {
        mainContent.classList.add('reveal');
    }, 2800); // 1700 + 1000ms + 100ms pausa

    // 5. Limpieza del DOM tras la transición
    setTimeout(() => {
        if (introScreen) introScreen.remove();
        mainContent.style.clipPath = 'none'; // Mejora de rendimiento
    }, 3400); // 2800 + 500ms + 100ms
});
