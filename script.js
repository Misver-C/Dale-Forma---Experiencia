const canvas = document.getElementById('sky-canvas');
const ctx = canvas.getContext('2d');

// Configuración de cantidades de estrellas
const MIN_STARS = 80;
const MAX_STARS = 180;

let emSize = parseFloat(getComputedStyle(document.body).fontSize);
let MIN_DISTANCE_EM = 5;
let MIN_DISTANCE_PX = MIN_DISTANCE_EM * emSize;
let HOVER_DISTANCE_EM = 1;
let HOVER_DISTANCE_PX = HOVER_DISTANCE_EM * emSize;

let width, height;
let stars = [];
let particles = []; // Partículas para las chispas

// Precargar imágenes de piezas para las partículas
const particleImageSrcs = [
    'assets/piezas blancas/amar1.png',
    'assets/piezas blancas/amar2.png',
    'assets/piezas blancas/azul1.png',
    'assets/piezas blancas/azul2.png',
    'assets/piezas blancas/rojo1.png',
    'assets/piezas blancas/rojo2.png',
    'assets/piezas blancas/verde1.png',
    'assets/piezas blancas/verde2.png'
];
const particleImages = [];
particleImageSrcs.forEach(src => {
    let img = new Image();
    img.src = src;
    particleImages.push(img);
});

// Estado de interacción
let mouse = { x: -1000, y: -1000 };
let isMouseDown = false;
let hoveredStar = null;
let currentPath = []; // Array de estrellas conectadas formando la constelación
let isLimitWarning = false;
let warningDashOffset = 0;

// Inventario y Animaciones
let inventory = []; // Almacena de manera invisible las figuras creadas
let fallingShapes = []; // Almacena las figuras que están cayendo visualmente
let isInventoryFull = false;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Actualizar medida de EM
    emSize = parseFloat(getComputedStyle(document.body).fontSize);
    MIN_DISTANCE_PX = MIN_DISTANCE_EM * emSize;
    HOVER_DISTANCE_PX = HOVER_DISTANCE_EM * emSize;
    
    if (!isInventoryFull) {
        generateStars();
    }
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
            let r = Math.random() * 2.5 + 2; // Estrellas más grandes base
            stars.push({
                x: x,
                y: y,
                baseX: x, 
                baseY: y,
                radius: r, // Radio original
                renderRadius: r, // Radio actual para animaciones
                isArrowPart: false,
                isBackground: false
            });
        }
    }
}

// Lógica de Creación de Figuras
function createShapeFromPath(path) {
    let vertices = path.map(star => ({ x: star.x, y: star.y }));
    
    inventory.push({ vertices: [...vertices] });
    
    fallingShapes.push({
        vertices: vertices,
        velocityY: 0,
        gravity: 0.15 
    });

    if (inventory.length === 9 && !isInventoryFull) {
        isInventoryFull = true;
        triggerArrowEvent();
    }
}

function triggerArrowEvent() {
    const arrowWidthEM = 12;
    const arrowHeightEM = 30;
    const arrowWidthPX = arrowWidthEM * emSize;
    const arrowHeightPX = arrowHeightEM * emSize;
    
    const cx = width / 2;
    const cy = height / 2;
    
    const shaftWidthPX = 4 * emSize;
    const shaftHeightPX = 20 * emSize;
    const headWidthPX = 12 * emSize;
    const headHeightPX = 10 * emSize;
    
    const topY = cy - arrowHeightPX / 2;
    const bottomY = cy + arrowHeightPX / 2;
    const headTopY = bottomY - headHeightPX;
    
    let arrowPoints = [];
    
    arrowPoints.push({ x: cx - shaftWidthPX/2, y: topY });
    arrowPoints.push({ x: cx + shaftWidthPX/2, y: topY });
    
    for(let i=1; i<5; i++) {
        let y = topY + (shaftHeightPX / 5) * i;
        arrowPoints.push({ x: cx - shaftWidthPX/2, y: y });
        arrowPoints.push({ x: cx + shaftWidthPX/2, y: y });
    }
    
    arrowPoints.push({ x: cx - headWidthPX/2, y: headTopY });
    arrowPoints.push({ x: cx - shaftWidthPX/2, y: headTopY });
    arrowPoints.push({ x: cx + shaftWidthPX/2, y: headTopY });
    arrowPoints.push({ x: cx + headWidthPX/2, y: headTopY });
    
    for(let i=1; i<5; i++) {
        let frac = i / 5;
        let y = headTopY + headHeightPX * frac;
        let halfWidth = (headWidthPX/2) * (1 - frac);
        arrowPoints.push({ x: cx - halfWidth, y: y });
        arrowPoints.push({ x: cx + halfWidth, y: y });
    }
    
    arrowPoints.push({ x: cx, y: bottomY });
    
    let sortedStars = [...stars].sort((a, b) => {
        let distA = Math.hypot(a.baseX - cx, a.baseY - cy);
        let distB = Math.hypot(b.baseX - cx, b.baseY - cy);
        return distA - distB;
    });
    
    for (let i = 0; i < sortedStars.length; i++) {
        let star = sortedStars[i];
        if (i < arrowPoints.length) {
            star.isArrowPart = true;
            star.targetX = arrowPoints[i].x;
            star.targetY = arrowPoints[i].y;
        } else {
            star.isBackground = true;
        }
    }
    
    currentPath = [];
    isMouseDown = false;
    hoveredStar = null;
    isLimitWarning = false;
    particles = []; // Limpiar chispas
}

// Eventos del Mouse
window.addEventListener('mousemove', (e) => {
    if (isInventoryFull) return;

    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    if (isMouseDown && currentPath.length > 0) {
        let nearest = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX);
        
        if (nearest) {
            if (currentPath.length >= 3 && nearest === currentPath[0]) {
                createShapeFromPath(currentPath);
                currentPath = []; 
                isMouseDown = false;
                isLimitWarning = false;
            } 
            else if (!currentPath.includes(nearest)) {
                if (currentPath.length < 8) {
                    currentPath.push(nearest);
                    isLimitWarning = false;
                } else {
                    isLimitWarning = true;
                }
            } else {
                isLimitWarning = false;
            }
        } else {
            isLimitWarning = false;
        }
        
        if (currentPath.length > 0) {
            hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX) || currentPath[currentPath.length - 1];
        } else {
            hoveredStar = null;
        }
    } else {
        hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX);
    }
});

window.addEventListener('mousedown', (e) => {
    if (isInventoryFull) return; 
    isMouseDown = true;
    if (hoveredStar) {
        currentPath = [hoveredStar];
    } else {
        currentPath = [];
    }
});

window.addEventListener('mouseup', () => {
    if (isInventoryFull) return;
    isMouseDown = false;
    currentPath = [];
    isLimitWarning = false;
    hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX); 
});

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
    ctx.setLineDash([2, 5]); 
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255, 255, 255, 1)'; 
    ctx.stroke();
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Conexiones de hover
    if (hoveredStar && !isMouseDown && !isInventoryFull) {
        for (let star of stars) {
            if (star === hoveredStar) continue;
            const dx = star.x - hoveredStar.x;
            const dy = star.y - hoveredStar.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist <= MIN_DISTANCE_PX) {
                drawGlowingDottedLine(hoveredStar.x, hoveredStar.y, star.x, star.y);
            }
        }
    }
    
    // Dibujar la constelación trazada por el usuario
    if (isMouseDown && currentPath.length > 0 && !isInventoryFull) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
            ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        ctx.lineTo(mouse.x, mouse.y);
        
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffffff';
        ctx.stroke();

        // Contorno rojo de advertencia
        if (isLimitWarning) {
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.lineTo(mouse.x, mouse.y);
            
            ctx.strokeStyle = 'rgba(255, 50, 50, 1)';
            ctx.lineWidth = 1.5; 
            ctx.setLineDash([8, 8]);
            warningDashOffset -= 0.5; 
            ctx.lineDashOffset = warningDashOffset;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.stroke();
        }
        ctx.restore();

        // Generar partículas (chispas) en el cursor
        for (let i = 0; i < 2; i++) { // Más chispas por fotograma
            particles.push({
                x: mouse.x,
                y: mouse.y,
                vx: (Math.random() - 0.5) * 3, // Salto hacia los lados
                vy: Math.random() * 2 + 1, // Hacia abajo
                life: 1.0,
                decay: Math.random() * 0.05 + 0.02, // Desvanecimiento rápido
                size: Math.random() * 4 + 4, // Ajustado para que el png se aprecie bien como chispa
                img: particleImages[Math.floor(Math.random() * particleImages.length)]
            });
        }
    }

    // Dibujar partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life); // Desvanecimiento
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff'; // Resplandor cálido como antes
        
        if (p.img && p.img.complete) {
            // Dibujar la imagen de la partícula centrada en su coordenada
            ctx.drawImage(p.img, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        }
        
        ctx.restore();
    }
    
    // Procesar y dibujar cada estrella
    for (let star of stars) {
        let isHovered = false;
        let targetRadius = star.radius;

        if (isInventoryFull) {
            if (star.isArrowPart) {
                star.x += (star.targetX - star.x) * 0.05;
                star.y += (star.targetY - star.y) * 0.05;
                targetRadius = star.radius * 1.5;
            } else if (star.isBackground) {
                star.x += (star.baseX - star.x) * 0.1;
                star.y += (star.baseY - star.y) * 0.1;
                targetRadius = star.radius * 0.2; 
            }
            // Transición suave (0.015 equivale aprox a 2 segundos en llegar al objetivo a 60FPS)
            star.renderRadius += (targetRadius - star.renderRadius) * 0.015;
        } else {
            const dx = mouse.x - star.baseX;
            const dy = mouse.y - star.baseY;
            const distToMouse = Math.sqrt(dx*dx + dy*dy);
            
            isHovered = (star === hoveredStar || currentPath.includes(star));
            
            if (isHovered && distToMouse < HOVER_DISTANCE_PX) {
                star.x += (mouse.x - star.x) * 0.15;
                star.y += (mouse.y - star.y) * 0.15;
            } else {
                star.x += (star.baseX - star.x) * 0.1;
                star.y += (star.baseY - star.y) * 0.1;
            }

            if (isHovered) {
                targetRadius = star.radius * 2;
            }
            // Respuesta rápida en hover normal
            star.renderRadius += (targetRadius - star.renderRadius) * 0.2;
        }
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(star.x, star.y, Math.max(0, star.renderRadius), 0, Math.PI * 2);
        
        if (isInventoryFull) {
            if (star.isArrowPart) {
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffffff';
            } else {
                let opacity = Math.max(0.1, star.renderRadius / star.radius) * 0.6;
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`; 
                ctx.shadowBlur = 0;
            }
        } else {
            ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
            if (isHovered) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffffff';
            }
        }

        ctx.fill();
        ctx.restore();
    }

    // Dibujar y animar figuras cayendo
    for (let i = fallingShapes.length - 1; i >= 0; i--) {
        let shape = fallingShapes[i];
        
        shape.velocityY += shape.gravity; 
        
        let allBelowScreen = true;
        
        ctx.save();
        ctx.beginPath();
        for (let j = 0; j < shape.vertices.length; j++) {
            let v = shape.vertices[j];
            v.y += shape.velocityY; 
            
            if (j === 0) {
                ctx.moveTo(v.x, v.y);
            } else {
                ctx.lineTo(v.x, v.y);
            }
            
            if (v.y < height + 100) { 
                allBelowScreen = false;
            }
        }
        ctx.closePath();
        
        ctx.fillStyle = 'rgba(200, 230, 255, 0.15)'; 
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        
        if (allBelowScreen) {
            fallingShapes.splice(i, 1);
        }
    }
    
    requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize();
draw();
