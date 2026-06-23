const canvas = document.getElementById('sky-canvas');
const ctx = canvas.getContext('2d');

// Configuración de cantidades de estrellas
const MIN_STARS = 60;
const MAX_STARS = 150;

let emSize = parseFloat(getComputedStyle(document.body).fontSize);
let MIN_DISTANCE_EM = 5;
let MIN_DISTANCE_PX = MIN_DISTANCE_EM * emSize;
let HOVER_DISTANCE_EM = 1;
let HOVER_DISTANCE_PX = HOVER_DISTANCE_EM * emSize;

let width, height;
let stars = [];

// Estado de interacción
let mouse = { x: -1000, y: -1000 };
let isMouseDown = false;
let hoveredStar = null;
let currentPath = []; // Array de estrellas conectadas formando la constelación

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Actualizar medida de EM
    emSize = parseFloat(getComputedStyle(document.body).fontSize);
    MIN_DISTANCE_PX = MIN_DISTANCE_EM * emSize;
    HOVER_DISTANCE_PX = HOVER_DISTANCE_EM * emSize;
    
    generateStars();
}

function generateStars() {
    stars = [];
    const numStars = Math.floor(Math.random() * (MAX_STARS - MIN_STARS + 1)) + MIN_STARS;
    
    let attempts = 0;
    const maxAttempts = numStars * 100; // Evitar bucles infinitos
    
    while (stars.length < numStars && attempts < maxAttempts) {
        attempts++;
        const x = Math.random() * width;
        const y = Math.random() * height;
        
        let valid = true;
        // Asegurar que no esté muy cerca de otra estrella generada
        for (let star of stars) {
            const dx = star.x - x;
            const dy = star.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < MIN_DISTANCE_PX) {
                valid = false;
                break;
            }
        }
        
        if (valid) {
            stars.push({
                x: x,
                y: y,
                baseX: x, // Guardamos su posición original
                baseY: y,
                radius: Math.random() * 1.5 + 1 // Radio aleatorio pequeño
            });
        }
    }
}

// Eventos del Mouse
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    if (isMouseDown && currentPath.length > 0) {
        // Si estamos trazando una constelación, verificamos si tocamos otra estrella
        let nearest = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX);
        if (nearest && nearest !== currentPath[currentPath.length - 1]) {
            // Evitar duplicados consecutivos
            currentPath.push(nearest);
        }
        // Mantenemos la estrella inicial o la última como "hovered" visualmente
        hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX) || currentPath[currentPath.length - 1];
    } else {
        hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX);
    }
});

window.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    if (hoveredStar) {
        currentPath = [hoveredStar];
    } else {
        currentPath = [];
    }
});

window.addEventListener('mouseup', () => {
    isMouseDown = false;
    currentPath = [];
    hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX); // Re-evaluar hover al soltar
});

// Función para encontrar la estrella más cercana en un radio máximo
function getNearestStar(mx, my, maxDist) {
    let nearest = null;
    let minDist = maxDist;
    
    for (let star of stars) {
        const dx = star.x - mx;
        const dy = star.y - my;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
            minDist = dist;
            nearest = star;
        }
    }
    return nearest;
}

function drawGlowingDottedLine(x1, y1, x2, y2) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 5]); // Puntos separados
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255, 255, 255, 1)'; // Resplandor
    ctx.stroke();
    ctx.restore();
}

function draw() {
    // Limpiar canvas en cada fotograma
    ctx.clearRect(0, 0, width, height);
    
    // Conexiones de hover (si hay estrella activa y no estamos arrastrando)
    if (hoveredStar && !isMouseDown) {
        for (let star of stars) {
            if (star === hoveredStar) continue;
            const dx = star.x - hoveredStar.x;
            const dy = star.y - hoveredStar.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Si la estrella vecina está a 5em o menos
            if (dist <= MIN_DISTANCE_PX) {
                drawGlowingDottedLine(hoveredStar.x, hoveredStar.y, star.x, star.y);
            }
        }
    }
    
    // Dibujar la constelación trazada por el usuario (click and drag)
    if (isMouseDown && currentPath.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
            ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        // Trazar línea hacia donde está el cursor actualmente
        ctx.lineTo(mouse.x, mouse.y);
        
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)'; // Tono ligeramente azulado/brillante para constelación
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffffff';
        ctx.stroke();
        ctx.restore();
    }
    
    // Procesar y dibujar cada estrella
    for (let star of stars) {
        const dx = mouse.x - star.baseX;
        const dy = mouse.y - star.baseY;
        const distToMouse = Math.sqrt(dx*dx + dy*dy);
        
        let isHovered = (star === hoveredStar || currentPath.includes(star));
        
        // Si está hovered o es parte de la constelación y el cursor está cerca, la atraemos
        if (isHovered && distToMouse < HOVER_DISTANCE_PX) {
            star.x += (mouse.x - star.x) * 0.15;
            star.y += (mouse.y - star.y) * 0.15;
        } else {
            // Volver lentamente a su posición original
            star.x += (star.baseX - star.x) * 0.1;
            star.y += (star.baseY - star.y) * 0.1;
        }
        
        // Dibujar la estrella
        ctx.save();
        ctx.beginPath();
        // Se agranda ligeramente si está interactuada
        const currentRadius = isHovered ? star.radius * 2 : star.radius;
        ctx.arc(star.x, star.y, currentRadius, 0, Math.PI * 2);
        
        ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
        if (isHovered) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffffff';
        }
        ctx.fill();
        ctx.restore();
    }
    
    requestAnimationFrame(draw);
}

// Escuchar cambios de tamaño de ventana
window.addEventListener('resize', resize);

// Inicializar
resize();
draw();
