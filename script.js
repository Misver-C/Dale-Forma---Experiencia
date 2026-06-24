const canvas = document.getElementById('sky-canvas');
const ctx = canvas.getContext('2d');

const MIN_STARS = 80;
const MAX_STARS = 180;

let emSize = parseFloat(getComputedStyle(document.body).fontSize);
let MIN_DISTANCE_EM = 5;
let MIN_DISTANCE_PX = MIN_DISTANCE_EM * emSize;
let HOVER_DISTANCE_EM = 1;
let HOVER_DISTANCE_PX = HOVER_DISTANCE_EM * emSize;

let width, height;
let stars = [];

let particles = []; 
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

let shapeParticles = [];
const shapeParticleImageSrcs = [
    'assets/piezas/amar1.png',
    'assets/piezas/amar2.png',
    'assets/piezas/azul1.png',
    'assets/piezas/azul2.png',
    'assets/piezas/rojo1.png',
    'assets/piezas/rojo2.png',
    'assets/piezas/verde1.png',
    'assets/piezas/verde2.png'
];
const shapeParticleImages = [];
shapeParticleImageSrcs.forEach(src => {
    let img = new Image();
    img.src = src;
    shapeParticleImages.push(img);
});

let mouse = { x: -1000, y: -1000 };
let isMouseDown = false;
let hoveredStar = null;
let currentPath = []; 
let isLimitWarning = false;
let warningDashOffset = 0;

let inventory = []; 
let fallingShapes = []; 

// Máquina de estados
let gameState = "normal";

let scrollCount = 0;
let lastScrollTime = 0;
let globalScrollY = 0;
let fastFallingStartTime = 0;
let holdingStartTime = 0;
let mergingStartTime = 0;
let fadingStartTime = 0;
let drawingHullStartTime = 0;
let whiteOpacity = 0;
let visibleInventory = []; 
let finalMassHull = []; 
let lastFrameTime = 0;
let globalRotationAngle = 0;
let globalRotationSpeed = 1.5; // Radianes por segundo

// Algoritmo Convex Hull
function getConvexHull(points) {
    if (points.length <= 3) return points;
    let sorted = [...points].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
    let lower = [];
    for (let i = 0; i < sorted.length; i++) {
        while (lower.length >= 2) {
            let p = lower[lower.length - 2];
            let q = lower[lower.length - 1];
            let r = sorted[i];
            if ((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x) <= 0) lower.pop();
            else break;
        }
        lower.push(sorted[i]);
    }
    let upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        while (upper.length >= 2) {
            let p = upper[upper.length - 2];
            let q = upper[upper.length - 1];
            let r = sorted[i];
            if ((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x) <= 0) upper.pop();
            else break;
        }
        upper.push(sorted[i]);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    emSize = parseFloat(getComputedStyle(document.body).fontSize);
    MIN_DISTANCE_PX = MIN_DISTANCE_EM * emSize;
    HOVER_DISTANCE_PX = HOVER_DISTANCE_EM * emSize;
    if (gameState === "normal") generateStars();
}

function generateStars() {
    stars = [];
    const numStars = Math.floor(Math.random() * (MAX_STARS - MIN_STARS + 1)) + MIN_STARS;
    let attempts = 0;
    const maxAttempts = numStars * 100;
    
    while (stars.length < numStars && attempts < maxAttempts) {
        attempts++;
        const x = Math.random() * width;
        const y = Math.random() * height;
        let valid = true;
        for (let star of stars) {
            const dx = star.x - x;
            const dy = star.y - y;
            if (Math.sqrt(dx*dx + dy*dy) < MIN_DISTANCE_PX) {
                valid = false;
                break;
            }
        }
        if (valid) {
            let r = Math.random() * 2.5 + 2; 
            stars.push({
                x: x, y: y, baseX: x, baseY: y,
                radius: r, renderRadius: r, 
                isArrowPart: false, isBackground: false
            });
        }
    }
}

function createShapeFromPath(path) {
    let vertices = path.map(star => ({ x: star.x, y: star.y }));
    inventory.push({ vertices: [...vertices] });
    fallingShapes.push({ vertices: vertices, velocityY: 0, gravity: 0.15 });
    if (inventory.length === 9 && gameState === "normal") triggerArrowEvent();
}

function triggerArrowEvent() {
    gameState = "arrow_ready";
    const arrowWidthPX = 12 * emSize;
    const arrowHeightPX = 30 * emSize;
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
    
    let sortedStars = [...stars].sort((a, b) => Math.hypot(a.baseX - cx, a.baseY - cy) - Math.hypot(b.baseX - cx, b.baseY - cy));
    for (let i = 0; i < sortedStars.length; i++) {
        if (i < arrowPoints.length) {
            sortedStars[i].isArrowPart = true;
            sortedStars[i].targetX = arrowPoints[i].x;
            sortedStars[i].targetY = arrowPoints[i].y;
        } else {
            sortedStars[i].isBackground = true;
        }
    }
    currentPath = [];
    isMouseDown = false;
    hoveredStar = null;
    isLimitWarning = false;
    particles = []; 
}

window.addEventListener('mousemove', (e) => {
    if (gameState !== "normal") return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (isMouseDown && currentPath.length > 0) {
        let nearest = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX);
        if (nearest) {
            if (currentPath.length >= 3 && nearest === currentPath[0]) {
                createShapeFromPath(currentPath);
                currentPath = []; isMouseDown = false; isLimitWarning = false;
            } else if (!currentPath.includes(nearest)) {
                if (currentPath.length < 8) { currentPath.push(nearest); isLimitWarning = false; } 
                else { isLimitWarning = true; }
            } else { isLimitWarning = false; }
        } else { isLimitWarning = false; }
        hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX) || currentPath[currentPath.length - 1];
    } else {
        hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX);
    }
});
window.addEventListener('mousedown', (e) => {
    if (gameState !== "normal") return; 
    isMouseDown = true;
    if (hoveredStar) currentPath = [hoveredStar];
    else currentPath = [];
});
window.addEventListener('mouseup', () => {
    if (gameState !== "normal") return;
    isMouseDown = false; currentPath = []; isLimitWarning = false;
    hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX); 
});

window.addEventListener('wheel', (e) => {
    if (gameState === "arrow_ready") {
        if (e.deltaY > 0) { 
            globalScrollY += 30; 
            const now = performance.now();
            if (now - lastScrollTime <= 1300) scrollCount++;
            else scrollCount = 1;
            lastScrollTime = now;
            if (scrollCount >= 3) {
                gameState = "fast_falling";
                fastFallingStartTime = performance.now();
                scrollCount = 0;
            }
        }
    }
});

function getNearestStar(mx, my, maxDist) {
    let nearest = null;
    let minDist = maxDist;
    for (let star of stars) {
        const dx = star.x - mx;
        const dy = star.y - my;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) { minDist = dist; nearest = star; }
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
    const now = performance.now();
    let timeDelta = 0;
    if (lastFrameTime > 0) timeDelta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    
    // Damping Global
    let damping = 1.0;
    if (gameState === "fading_lines" || gameState === "drawing_hull" || gameState === "phase3_solid") {
        let dampingElapsed = (now - fadingStartTime) / 1000;
        let linearDamping = 1.0 - (dampingElapsed / 3.0);
        if (linearDamping < 0) linearDamping = 0;
        // Ease-out cúbico para asegurar que se detenga aterizando a 0 velocidad
        damping = linearDamping * linearDamping * linearDamping;
    }
    
    // Incremento de la rotación global de la masa afectada por el damping
    if (gameState === "fading_lines" || gameState === "drawing_hull" || gameState === "phase3_solid") {
        globalRotationAngle += globalRotationSpeed * damping * timeDelta;
    }
    
    // Lógica Máquina de Estados
    if (gameState === "arrow_ready") {
        globalScrollY += (0 - globalScrollY) * 0.05;
    } else if (gameState === "fast_falling") {
        globalScrollY += 60; 
        const elapsed = (now - fastFallingStartTime) / 1000;
        whiteOpacity = Math.min(1, elapsed / 4.0); 
        
        if (elapsed >= 4.0) {
            gameState = "holding_shapes";
            holdingStartTime = performance.now();
            
            const minSpacePX = 8 * emSize;
            const validPositions = [];
            const shapeScale = 0.4;
            
            visibleInventory = inventory.map(shape => {
                let destX, destY;
                let attempts = 0;
                let placed = false;
                while (!placed && attempts < 1000) {
                    attempts++;
                    destX = (Math.random() - 0.5) * (width - 15 * emSize);
                    destY = (Math.random() - 0.5) * (height - 15 * emSize);
                    let conflict = false;
                    for (let pos of validPositions) {
                        if (Math.hypot(pos.x - destX, pos.y - destY) < minSpacePX) { conflict = true; break; }
                    }
                    if (!conflict) { validPositions.push({ x: destX, y: destY }); placed = true; }
                }
                
                let centerX = shape.vertices.reduce((sum, v) => sum + v.x, 0) / shape.vertices.length;
                let centerY = shape.vertices.reduce((sum, v) => sum + v.y, 0) / shape.vertices.length;
                
                return {
                    wobbleSpeedX: Math.random() * 2 + 1,
                    wobbleSpeedY: Math.random() * 3 + 2,
                    wobbleOffsetX: Math.random() * Math.PI * 2,
                    initialAngle: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 3, // Radianes por seg
                    vertices: shape.vertices.map(v => {
                        let relX = (v.x - centerX) * shapeScale;
                        let relY = (v.y - centerY) * shapeScale;
                        return {
                            relX: relX, relY: relY,
                            currentX: (width/2) + relX + destX,
                            currentY: height + 300 + relY,
                            targetX: (width/2) + destX,
                            targetY: (height/2) + destY
                        };
                    })
                };
            });
        }
    } else if (gameState === "holding_shapes") {
        globalScrollY += 60; 
        const elapsed = (now - holdingStartTime) / 1000;
        if (elapsed >= 3.0) {
            gameState = "merging";
            mergingStartTime = performance.now();
        }
    } else if (gameState === "merging") {
        globalScrollY += 60;
        const elapsed = (now - mergingStartTime) / 1000;
        if (elapsed >= 2.0) { 
            gameState = "fading_lines"; 
            fadingStartTime = performance.now();
            
            let allMergedVertices = [];
            const mergeTimeSec = now / 1000;
            for(let shape of visibleInventory) {
                let angle = shape.initialAngle + shape.rotationSpeed * mergeTimeSec;
                let cosA = Math.cos(angle);
                let sinA = Math.sin(angle);
                
                for(let v of shape.vertices) {
                    let rotX = v.relX * cosA - v.relY * sinA;
                    let rotY = v.relX * sinA + v.relY * cosA;
                    allMergedVertices.push({ x: rotX, y: rotY }); 
                }
            }
            finalMassHull = getConvexHull(allMergedVertices);
        }
    } else if (gameState === "fading_lines") {
        globalScrollY += 60;
        const elapsed = (now - fadingStartTime) / 1000;
        if (elapsed >= 1.5) { 
            gameState = "drawing_hull";
            drawingHullStartTime = performance.now();
        }
    } else if (gameState === "drawing_hull") {
        globalScrollY += 60;
        const elapsed = (now - drawingHullStartTime) / 1000;
        if (elapsed >= 0.5) { 
            gameState = "phase3_solid"; 
        }
    } else if (gameState === "phase3_solid") {
        globalScrollY += 60;
    }
    
    // Render base
    ctx.clearRect(0, 0, width, height);
    if (whiteOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${whiteOpacity})`;
        ctx.fillRect(0, 0, width, height);
    }
    
    // Hover y Trazado (Fase 1)
    if (hoveredStar && !isMouseDown && gameState === "normal") {
        for (let star of stars) {
            if (star === hoveredStar) continue;
            const dx = star.x - hoveredStar.x; const dy = star.y - hoveredStar.y;
            if (Math.sqrt(dx*dx + dy*dy) <= MIN_DISTANCE_PX) drawGlowingDottedLine(hoveredStar.x, hoveredStar.y, star.x, star.y);
        }
    }
    
    if (isMouseDown && currentPath.length > 0 && gameState === "normal") {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i].x, currentPath[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)';
        ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = '#ffffff';
        ctx.stroke();

        if (isLimitWarning) {
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i].x, currentPath[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = 'rgba(255, 50, 50, 1)';
            ctx.lineWidth = 1.5; ctx.setLineDash([8, 8]);
            warningDashOffset -= 0.5; ctx.lineDashOffset = warningDashOffset;
            ctx.shadowBlur = 10; ctx.shadowColor = '#ff0000';
            ctx.stroke();
        }
        ctx.restore();

        for (let i = 0; i < 2; i++) { 
            particles.push({
                x: mouse.x, y: mouse.y,
                vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2 + 1, 
                life: 1.0, decay: Math.random() * 0.05 + 0.02, size: Math.random() * 4 + 4, 
                img: particleImages[Math.floor(Math.random() * particleImages.length)]
            });
        }
    }

    // Chispas del Cursor
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life); ctx.shadowBlur = 5; ctx.shadowColor = '#ffffff';
        if (p.img && p.img.complete) ctx.drawImage(p.img, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        ctx.restore();
    }
    
    // Estrellas
    for (let star of stars) {
        let targetRadius = star.radius;
        let finalY = star.y;
        let isHovered = false;

        if (gameState !== "normal") {
            if (star.isArrowPart) {
                star.x += (star.targetX - star.x) * 0.05; star.y += (star.targetY - star.y) * 0.05;
                targetRadius = star.radius * 1.5; finalY = star.y - globalScrollY * 0.1;
            } else if (star.isBackground) {
                star.x += (star.baseX - star.x) * 0.1; star.y += (star.baseY - star.y) * 0.1;
                targetRadius = star.radius * 0.2; finalY = star.y - globalScrollY * 0.7;
            }
            star.renderRadius += (targetRadius - star.renderRadius) * 0.015;
        } else {
            const distToMouse = Math.sqrt(Math.pow(mouse.x - star.baseX, 2) + Math.pow(mouse.y - star.baseY, 2));
            isHovered = (star === hoveredStar || currentPath.includes(star));
            if (isHovered && distToMouse < HOVER_DISTANCE_PX) {
                star.x += (mouse.x - star.x) * 0.15; star.y += (mouse.y - star.y) * 0.15;
            } else {
                star.x += (star.baseX - star.x) * 0.1; star.y += (star.baseY - star.y) * 0.1;
            }
            if (isHovered) targetRadius = star.radius * 2;
            star.renderRadius += (targetRadius - star.renderRadius) * 0.2;
        }
        
        if (finalY < -50 || finalY > height + 50) continue;

        ctx.save();
        ctx.beginPath();
        ctx.arc(star.x, finalY, Math.max(0, star.renderRadius), 0, Math.PI * 2);
        
        if (gameState !== "normal") {
            if (star.isArrowPart) {
                ctx.fillStyle = `rgba(255, 255, 255, ${1 - whiteOpacity})`; ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff';
            } else {
                let opacity = Math.max(0, Math.max(0.1, star.renderRadius / star.radius) * 0.6 * (1 - whiteOpacity * 1.5)); 
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`; ctx.shadowBlur = 0;
            }
        } else {
            ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
            if (isHovered) { ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff'; }
        }
        ctx.fill(); ctx.restore();
    }

    // Figuras cayendo al hacer trazado (Fase 1)
    if (gameState === "normal") {
        for (let i = fallingShapes.length - 1; i >= 0; i--) {
            let shape = fallingShapes[i];
            shape.velocityY += shape.gravity; 
            let allBelowScreen = true;
            ctx.save(); ctx.beginPath();
            for (let j = 0; j < shape.vertices.length; j++) {
                let v = shape.vertices[j];
                v.y += shape.velocityY; 
                if (j === 0) ctx.moveTo(v.x, v.y); else ctx.lineTo(v.x, v.y);
                if (v.y < height + 100) allBelowScreen = false;
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(200, 230, 255, 0.15)'; ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)';
            ctx.lineWidth = 2; ctx.shadowBlur = 15; ctx.shadowColor = '#ffffff';
            ctx.fill(); ctx.stroke(); ctx.restore();
            if (allBelowScreen) fallingShapes.splice(i, 1);
        }
    }

    // Dibujar formas individuales con ROTACIÓN
    if (visibleInventory.length > 0 && gameState !== "phase3_solid") {
        for (let shape of visibleInventory) {
            let wobbleX = 0; let wobbleY = 0;
            const tSec = now / 1000;
            
            // Lógica Wobble individual vs Global
            if (gameState === "holding_shapes" || gameState === "merging") {
                wobbleX = Math.sin(tSec * shape.wobbleSpeedX + shape.wobbleOffsetX) * (1 * emSize);
                wobbleY = Math.cos(tSec * shape.wobbleSpeedY) * (3 * emSize);
            } else if (gameState === "fading_lines" || gameState === "drawing_hull") {
                wobbleX = Math.sin(tSec * 2) * (1.5 * emSize) * damping;
                wobbleY = Math.cos(tSec * 3) * (3.5 * emSize) * damping;
            }
            
            let angle = shape.initialAngle + shape.rotationSpeed * tSec;
            if (gameState === "fading_lines" || gameState === "drawing_hull") {
                // Durante la fase estática, usamos el ángulo global sincronizado
                angle = shape.initialAngle + shape.rotationSpeed * (mergingStartTime + 2000)/1000 + globalRotationAngle;
            }
            
            let cosA = Math.cos(angle);
            let sinA = Math.sin(angle);
            
            // Calculamos currentX, Y basándonos en la rotación
            for (let j = 0; j < shape.vertices.length; j++) {
                let v = shape.vertices[j];
                
                let rotX = v.relX * cosA - v.relY * sinA;
                let rotY = v.relX * sinA + v.relY * cosA;
                
                if (gameState === "holding_shapes") {
                    v.currentX += (v.targetX + rotX + wobbleX - v.currentX) * 0.05;
                    v.currentY += (v.targetY + rotY + wobbleY - v.currentY) * 0.05;
                } else if (gameState === "merging") {
                    let elapsedM = (now - mergingStartTime) / 1000;
                    let progress = elapsedM / 2.0;
                    if (progress > 1) progress = 1;
                    
                    // Curva Ease-In-Out para iniciar sin salto y acelerar
                    let tSmooth = progress < 0.5 
                        ? 4 * progress * progress * progress 
                        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                    
                    let blendedTargetX = v.targetX + (width/2 - v.targetX) * tSmooth;
                    let blendedTargetY = v.targetY + (height/2 - v.targetY) * tSmooth;
                    
                    let centerDestX = blendedTargetX + rotX; 
                    let centerDestY = blendedTargetY + rotY;
                    // Mantenemos el factor de LERP local (0.05) para no alterar la física
                    v.currentX += (centerDestX + wobbleX - v.currentX) * 0.05;
                    v.currentY += (centerDestY + wobbleY - v.currentY) * 0.05;
                } else if (gameState === "fading_lines" || gameState === "drawing_hull") {
                    let centerDestX = (width/2) + rotX; 
                    let centerDestY = (height/2) + rotY;
                    v.currentX += (centerDestX + wobbleX - v.currentX) * 0.1;
                    v.currentY += (centerDestY + wobbleY - v.currentY) * 0.1;
                }
            }
            
            let drawLines = true;
            let fadeAlpha = 1.0;
            if (gameState === "fading_lines") {
                const fadingElapsed = (now - fadingStartTime) / 1000;
                fadeAlpha = 1.0 - (fadingElapsed / 1.5);
                if (fadeAlpha < 0) fadeAlpha = 0;
            } else if (gameState === "drawing_hull") {
                drawLines = false;
                fadeAlpha = 0;
            }

            if (drawLines) {
                ctx.save(); ctx.beginPath();
                for (let j = 0; j < shape.vertices.length; j++) {
                    let v = shape.vertices[j];
                    if (j === 0) ctx.moveTo(v.currentX, v.currentY); else ctx.lineTo(v.currentX, v.currentY);
                }
                ctx.closePath();
                
                let r = Math.floor(200 - 200 * whiteOpacity); 
                let g = Math.floor(230 - 230 * whiteOpacity); 
                let b = Math.floor(255 - 255 * whiteOpacity); 
                
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.5 * fadeAlpha})`;
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.9 * fadeAlpha})`;
                ctx.lineWidth = 2;
                ctx.fill(); ctx.stroke(); ctx.restore();
            }

            // Vértices puros (estrellas base) visibles siempre
            if (gameState === "fading_lines" || gameState === "drawing_hull") {
                ctx.save();
                for (let j = 0; j < shape.vertices.length; j++) {
                    let v = shape.vertices[j];
                    ctx.beginPath();
                    ctx.arc(v.currentX, v.currentY, 3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fill();
                }
                ctx.restore();
            }
        }
    }

    // Estelas (Con decaimiento de emision)
    let emitChance = 0.6 * damping;
    if (gameState === "holding_shapes" || gameState === "merging") {
        for (let shape of visibleInventory) {
            if (Math.random() < emitChance) { 
                let sortedVertices = [...shape.vertices].sort((a, b) => a.currentY - b.currentY);
                let top1 = sortedVertices[0];
                let top2 = sortedVertices[1] || sortedVertices[0]; 
                let t = Math.random();
                let emitX = top1.currentX + (top2.currentX - top1.currentX) * t;
                let emitY = top1.currentY + (top2.currentY - top1.currentY) * t;
                
                shapeParticles.push({
                    x: emitX, y: emitY, 
                    vx: (Math.random() - 0.5) * 8, 
                    vy: Math.random() * -5 - 3, 
                    life: 1.0, decay: Math.random() * 0.03 + 0.01, size: Math.random() * 5 + 4,
                    img: shapeParticleImages[Math.floor(Math.random() * shapeParticleImages.length)]
                });
            }
        }
    }

    for (let i = shapeParticles.length - 1; i >= 0; i--) {
        let p = shapeParticles[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { shapeParticles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life); 
        if (p.img && p.img.complete) ctx.drawImage(p.img, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        ctx.restore();
    }

    // Contorno del Convex Hull trazándose progresivamente
    if (gameState === "drawing_hull") {
        const elapsed = (now - drawingHullStartTime) / 1000;
        let progress = elapsed / 0.5;
        if (progress > 1) progress = 1;
        
        const tSec = now / 1000;
        let globalWobbleX = Math.sin(tSec * 2) * (1.5 * emSize) * damping;
        let globalWobbleY = Math.cos(tSec * 3) * (3.5 * emSize) * damping;
        
        ctx.save();
        ctx.beginPath();
        let totalPoints = finalMassHull.length;
        let pointsToDraw = Math.floor(progress * totalPoints);
        
        let cosA = Math.cos(globalRotationAngle);
        let sinA = Math.sin(globalRotationAngle);

        for (let j = 0; j <= pointsToDraw; j++) {
            let v = finalMassHull[j % totalPoints];
            
            // Rotación global sobre el hull
            let rotX = v.x * cosA - v.y * sinA;
            let rotY = v.x * sinA + v.y * cosA;

            let drawX = (width/2) + rotX + globalWobbleX;
            let drawY = (height/2) + rotY + globalWobbleY;
            if (j === 0) ctx.moveTo(drawX, drawY);
            else ctx.lineTo(drawX, drawY);
        }
        ctx.strokeStyle = `rgba(0, 0, 0, 0.9)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    
    // Masa única sólida total (rotando)
    if (gameState === "phase3_solid") {
        const tSec = now / 1000;
        let globalWobbleX = Math.sin(tSec * 2) * (1.5 * emSize) * damping;
        let globalWobbleY = Math.cos(tSec * 3) * (3.5 * emSize) * damping;
        
        ctx.save();
        ctx.beginPath();
        let cosA = Math.cos(globalRotationAngle);
        let sinA = Math.sin(globalRotationAngle);

        for (let j = 0; j < finalMassHull.length; j++) {
            let v = finalMassHull[j];
            let rotX = v.x * cosA - v.y * sinA;
            let rotY = v.x * sinA + v.y * cosA;

            let drawX = (width/2) + rotX + globalWobbleX;
            let drawY = (height/2) + rotY + globalWobbleY;
            if (j === 0) ctx.moveTo(drawX, drawY);
            else ctx.lineTo(drawX, drawY);
        }
        ctx.closePath();
        
        ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
        ctx.strokeStyle = `rgba(0, 0, 0, 0.9)`;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    
    requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize();
draw();
