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
let gameState = "intro";

let scrollCount = 0;
let lastScrollTime = 0;
let globalScrollY = 0;
let targetGlobalScrollY = 0;
let fastFallingStartTime = 0;
let holdingStartTime = 0;
let mergingStartTime = 0;
let fadingStartTime = 0;
let drawingHullStartTime = 0;
let introTransitionStartTime = 0;
let whiteOpacity = 0;
let visibleInventory = []; 
let finalMassHull = []; 
let lastFrameTime = 0;
let globalRotationAngle = 0;
let globalRotationSpeed = 1.5; 

// Estructuras 3D Pre-ubicadas
let master3DFaces = [];

function init3DFaces() {
    master3DFaces = [];
    for (let shape of visibleInventory) {
        shape.faceRefs = [];
        
        let fFront = { shape: shape, type: 'front', vertices: [], tVertices: [], color: shape.assignedColor, highlight: false, avgZ: 0 };
        for (let i = 0; i < shape.vertices.length; i++) {
            fFront.vertices.push({x:0, y:0, z:0});
            fFront.tVertices.push({sx:0, sy:0, z:0});
        }
        master3DFaces.push(fFront);
        shape.faceRefs.push(fFront);
        
        let fBack = { shape: shape, type: 'back', vertices: [], tVertices: [], color: shape.assignedColor, highlight: false, avgZ: 0 };
        for (let i = 0; i < shape.vertices.length; i++) {
            fBack.vertices.push({x:0, y:0, z:0});
            fBack.tVertices.push({sx:0, sy:0, z:0});
        }
        master3DFaces.push(fBack);
        shape.faceRefs.push(fBack);
        
        for (let i = 0; i < shape.vertices.length; i++) {
            let fSide = { shape: shape, type: 'side', index: i, vertices: [], tVertices: [], color: shadeColor(shape.assignedColor, -20), highlight: false, avgZ: 0 };
            for (let j = 0; j < 4; j++) {
                fSide.vertices.push({x:0, y:0, z:0});
                fSide.tVertices.push({sx:0, sy:0, z:0});
            }
            master3DFaces.push(fSide);
            shape.faceRefs.push(fSide);
        }
    }
}

// Variables Fases 4 a 7
let phase4ClickCount = 0;
let phase4ShakeEndTime = 0;
let draggedShape = null;
let preChaosStartTime = 0;
let scrollHistory = [];
let arrowOffset = 0;
let arrowCinematicScroll = 0;
let phase5StartTime = 0;
let phase5FillStartTime = 0;

let phase6StartTime = 0;
let globalCamRotX = 0;
let globalCamRotY = 0;
let nucleusShape = null;
let lastMouseX = 0;
let lastMouseY = 0;
let nucRotX = 0;
let nucRotY = 0;

function rotate3D(point, rx, ry, rz) {
    let x = point.x; let y = point.y; let z = point.z;
    if (rx !== 0) {
        let cosX = Math.cos(rx); let sinX = Math.sin(rx);
        let ny = y * cosX - z * sinX; let nz = y * sinX + z * cosX;
        y = ny; z = nz;
    }
    if (ry !== 0) {
        let cosY = Math.cos(ry); let sinY = Math.sin(ry);
        let nx = x * cosY + z * sinY; let nz = -x * sinY + z * cosY;
        x = nx; z = nz;
    }
    if (rz !== 0) {
        let cosZ = Math.cos(rz); let sinZ = Math.sin(rz);
        let nx = x * cosZ - y * sinZ; let ny = x * sinZ + y * cosZ;
        x = nx; y = ny;
    }
    return {x: x, y: y, z: z};
}

function inverseRotate3D(point, rx, ry, rz) {
    let x = point.x; let y = point.y; let z = point.z;
    if (rz !== 0) {
        let cosZ = Math.cos(-rz); let sinZ = Math.sin(-rz);
        let nx = x * cosZ - y * sinZ; let ny = x * sinZ + y * cosZ;
        x = nx; y = ny;
    }
    if (ry !== 0) {
        let cosY = Math.cos(-ry); let sinY = Math.sin(-ry);
        let nx = x * cosY + z * sinY; let nz = -x * sinY + z * cosY;
        x = nx; z = nz;
    }
    if (rx !== 0) {
        let cosX = Math.cos(-rx); let sinX = Math.sin(-rx);
        let ny = y * cosX - z * sinX; let nz = y * sinX + z * cosX;
        y = ny; z = nz;
    }
    return {x: x, y: y, z: z};
}

function shadeColor(color, percent) {
    if (!color) return "#000000";
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = (R<255)?R:255;  G = (G<255)?G:255;  B = (B<255)?B:255;  
    R = (R>0)?R:0; G = (G>0)?G:0; B = (B>0)?B:0;
    let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
    return "#"+RR+GG+BB;
}

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
            let r = Math.random() * 2.5 + 2.0; 
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
    
    // Actualizar UI
    let counterEl = document.getElementById('counter-current');
    if (counterEl) counterEl.innerText = inventory.length;
    
    if (inventory.length === 8 && gameState === "normal") {
        hidePhaseUI(); // Ocultar UI antes de transicionar
        triggerArrowEvent();
    }
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
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    if (gameState === "phase7_free_view" && isMouseDown) {
        let deltaX = e.clientX - lastMouseX;
        let deltaY = e.clientY - lastMouseY;
        globalCamRotY += deltaX * 0.01;
        globalCamRotX += deltaY * 0.01;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        return;
    }
    
    if (gameState !== "normal") return;
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
    isMouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    if (gameState === "normal") {
        if (hoveredStar) currentPath = [hoveredStar];
        else currentPath = [];
    } else if (gameState === "phase4_waiting") {
        const dist = Math.hypot(mouse.x - width/2, mouse.y - height/2);
        if (dist < 12 * emSize) { 
            phase4ClickCount++;
            phase4ShakeEndTime = performance.now() + 150;
            if (phase4ClickCount >= 4) {
                gameState = "phase4_pre_chaos";
                preChaosStartTime = performance.now();
            }
        }
    } else if (gameState === "phase4_chaos" || gameState === "phase4_dragging" || gameState === "phase4_dropping" || gameState === "phase5_interact") {
        for (let i = visibleInventory.length - 1; i >= 0; i--) { 
            let shape = visibleInventory[i];
            if (shape.state === "chaos" || shape.state === "dropping" || shape.state === "locked") {
                if (Math.hypot(mouse.x - shape.centerX, mouse.y - shape.centerY) < shape.radius * 2.0) {
                    shape.state = "dragging";
                    draggedShape = shape;
                    if (gameState.startsWith("phase4_")) {
                        gameState = "phase4_dragging";
                    }
                    break;
                }
            }
        }
    } else if (gameState === "phase6_select_nucleus") {
        for (let shape of visibleInventory) {
            if (Math.hypot(mouse.x - shape.centerX, mouse.y - shape.centerY) < shape.boundingRadius) {
                shape.state = "nucleus";
                nucleusShape = shape;
                shape.localX = 0; shape.localY = 0; shape.localZ = 0;
                gameState = "phase6_assembly";
                break;
            }
        }
    } else if (gameState === "phase6_assembly") {
        for (let i = visibleInventory.length - 1; i >= 0; i--) { 
            let shape = visibleInventory[i];
            if (shape.state === "socketed") {
                if (Math.hypot(mouse.x - shape.centerX, mouse.y - shape.centerY) < shape.boundingRadius) {
                    shape.state = "dragging_3d";
                    draggedShape = shape;
                    break;
                }
            }
        }
    }
});

window.addEventListener('mouseup', () => {
    isMouseDown = false; 
    currentPath = []; 
    isLimitWarning = false;
    hoveredStar = getNearestStar(mouse.x, mouse.y, HOVER_DISTANCE_PX); 
    
    if (draggedShape) {
        if (gameState === "phase5_interact") {
            let dist = Math.hypot(mouse.x - draggedShape.socketTargetX, mouse.y - draggedShape.socketTargetY);
            if (dist < 6 * emSize) {
                draggedShape.state = "snapping";
            } else {
                draggedShape.state = "dropping";
            }
        } else if (gameState === "phase6_assembly") {
            let wx = draggedShape.centerX - width/2;
            let wy = draggedShape.centerY - height/2;
            let wz = 50; 
            
            let localPt = inverseRotate3D({x: wx, y: wy, z: wz}, nucRotX, nucRotY, 0);
            draggedShape.localX = localPt.x;
            draggedShape.localY = localPt.y;
            draggedShape.localZ = localPt.z;
            draggedShape.state = "attached";
            
            let allAttached = visibleInventory.every(s => s.state === "attached" || s.state === "nucleus");
            if (allAttached) {
                gameState = "phase7_free_view";
                globalCamRotX = nucRotX; 
                globalCamRotY = nucRotY;
                
                hidePhaseUI();
                setTimeout(() => {
                    showPhaseUI("¡HAS CONSTRUIDO TU FIGURA!", "");
                    document.getElementById('phase7-ui').classList.add('show');
                }, 500);
            }
        } else {
            draggedShape.state = "dropping";
            let anyDragging = visibleInventory.some(s => s.state === "dragging");
            if (!anyDragging) gameState = "phase4_chaos";
        }
        draggedShape = null;
    }
});

window.addEventListener('wheel', (e) => {
    if (gameState === "arrow_ready") {
        if (e.deltaY <= 0) return; 
        
        targetGlobalScrollY += e.deltaY;
        
        arrowOffset -= e.deltaY * 0.2;
        if (arrowOffset < -300) arrowOffset = -300;
        if (arrowOffset > 300) arrowOffset = 300;
        
        const now = performance.now();
        scrollHistory.push({ time: now, delta: Math.abs(e.deltaY) });
        scrollHistory = scrollHistory.filter(evt => now - evt.time <= 1300);
        let recentScroll = scrollHistory.reduce((sum, evt) => sum + evt.delta, 0);
        
        if (recentScroll >= 2000) {
            gameState = "fast_falling";
            fastFallingStartTime = performance.now();
            scrollHistory = [];
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
    if (timeDelta > 0.1) timeDelta = 0.1;
    lastFrameTime = now;
    
    if (gameState === "intro_transition") {
        let wElapsed = (now - introTransitionStartTime) / 1000;
        if (wElapsed < 2.5) {
            let speed = 40 * Math.pow(1 - wElapsed / 2.5, 2); 
            for (let star of stars) {
                star.y += speed * 60 * timeDelta;
                star.baseY += speed * 60 * timeDelta;
                if (star.y > height) {
                    star.y -= height;
                    star.baseY -= height;
                    star.x = Math.random() * width;
                    star.baseX = star.x;
                }
            }
        }
    }

    if (fastFallingStartTime > 0) {
        let wElapsed = (now - fastFallingStartTime) / 1000;
        whiteOpacity = Math.min(1, wElapsed / 2.5);
    }
    
    let damping = 1.0;
    if (gameState === "fading_lines" || gameState === "drawing_hull" || gameState === "phase3_solid") {
        let dampingElapsed = (now - fadingStartTime) / 1000;
        let linearDamping = 1.0 - (dampingElapsed / 3.0);
        if (linearDamping < 0) linearDamping = 0;
        damping = linearDamping * linearDamping * linearDamping;
    } else if (gameState === "phase4_waiting" || gameState === "phase4_pre_chaos") {
        damping = 0.0; 
    }
    
    if (gameState === "fading_lines" || gameState === "drawing_hull" || gameState === "phase3_solid") {
        globalRotationAngle += globalRotationSpeed * damping * timeDelta;
    }
    
    if (gameState === "arrow_ready") {
        arrowOffset += (0 - arrowOffset) * 0.05; 
        globalScrollY += (targetGlobalScrollY - globalScrollY) * 0.05; 
        if (globalScrollY < 0) globalScrollY = 0;
    } else if (gameState === "fast_falling") {
        globalScrollY += 60; arrowCinematicScroll += 60;
        const elapsed = (now - fastFallingStartTime) / 1000;
        
        if (elapsed >= 1.5) { 
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
                    rotationSpeed: (Math.random() - 0.5) * 3, 
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
        globalScrollY += 60; arrowCinematicScroll += 60;
        const elapsed = (now - holdingStartTime) / 1000;
        if (elapsed >= 3.0) {
            gameState = "merging";
            mergingStartTime = performance.now();
        }
    } else if (gameState === "merging") {
        globalScrollY += 60; arrowCinematicScroll += 60;
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
        globalScrollY += 60; arrowCinematicScroll += 60;
        const elapsed = (now - fadingStartTime) / 1000;
        if (elapsed >= 1.5) { 
            gameState = "drawing_hull";
            drawingHullStartTime = performance.now();
        }
    } else if (gameState === "drawing_hull") {
        globalScrollY += 60; arrowCinematicScroll += 60;
        const elapsed = (now - drawingHullStartTime) / 1000;
        if (elapsed >= 0.5) { 
            gameState = "phase3_solid"; 
        }
    } else if (gameState === "phase3_solid") {
        globalScrollY += 60; arrowCinematicScroll += 60;
        const elapsed = (now - fadingStartTime) / 1000;
        if (elapsed >= 3.0) {
            gameState = "phase4_waiting";
            phase4ClickCount = 0;
            phase4ShakeEndTime = 0;
            
            let phaseTextWrapper = document.getElementById('phase-text-wrapper');
            phaseTextWrapper.classList.remove('top-pos');
            phaseTextWrapper.classList.add('text-black');
            showPhaseUI("RÓMPELA", "Clickea para golpear la figura");
        }
    } else if (gameState === "phase4_pre_chaos") {
        globalScrollY += 60; arrowCinematicScroll += 60;
        const elapsed = (now - preChaosStartTime) / 1000;
        if (elapsed >= 0.3) {
            gameState = "phase4_chaos";
            
            hidePhaseUI();
            setTimeout(() => {
                document.getElementById('phase-text-wrapper').classList.add('top-pos');
                showPhaseUI("AGARRALAS", "Para frenar su movimiento");
            }, 500);
            
            for (let shape of visibleInventory) {
                shape.state = "chaos";
                shape.centerX = width/2;
                shape.centerY = height/2;
                shape.vx = (Math.random() - 0.5) * 32; 
                shape.vy = (Math.random() - 0.5) * 32;
                shape.radius = 4 * emSize; 
                shape.angle = shape.initialAngle + globalRotationAngle;
            }
        }
    } else if (gameState.startsWith("phase4_") || gameState.startsWith("phase5_")) {
        globalScrollY += 60; arrowCinematicScroll += 60;
    }
    
    // Disparador a Fase 6
    if (gameState === "phase5_interact") {
        let allReady = visibleInventory.every(s => s.state === "socketed" && (now - (s.socketedTime || 0)) >= 1000);
        if (allReady && visibleInventory.length > 0) {
            gameState = "phase6_extruding";
            phase6StartTime = performance.now();
            init3DFaces();
            
            hidePhaseUI();
            setTimeout(() => {
                showPhaseUI("CONSTRUYE", "Selecciona una forma como núcleo y arrastra el resto a su órbita.");
            }, 500);
        }
    }
    
    let depthProgress = 0;
    if (gameState.startsWith("phase6_") || gameState.startsWith("phase7_")) {
        depthProgress = Math.min(1.0, (now - phase6StartTime) / 1000);
        if (gameState === "phase6_extruding" && depthProgress >= 1.0) {
            gameState = "phase6_select_nucleus";
        }
        
        if (gameState === "phase6_assembly") {
            nucRotY = (now - phase6StartTime) / 1500;
            nucRotX = Math.sin((now - phase6StartTime) / 2000) * 0.3; 
        } else if (gameState === "phase7_free_view") {
            nucRotX = globalCamRotX;
            nucRotY = globalCamRotY;
        }
    }
    
    if ((gameState.startsWith("phase4_") || gameState.startsWith("phase5_") || gameState.startsWith("phase6_") || gameState.startsWith("phase7_")) && gameState !== "phase4_waiting" && gameState !== "phase4_pre_chaos") {
        ctx.fillStyle = `rgba(255, 255, 255, 0.65)`;
        ctx.fillRect(0, 0, width, height);
    } else {
        ctx.clearRect(0, 0, width, height);
        if (whiteOpacity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${whiteOpacity})`;
            ctx.fillRect(0, 0, width, height);
        }
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

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life); ctx.shadowBlur = 5; ctx.shadowColor = '#ffcc00';
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
                targetRadius = star.radius * 1.5; 
                finalY = star.y - arrowCinematicScroll * 0.1 + arrowOffset;
            } else if (star.isBackground) {
                star.x += (star.baseX - star.x) * 0.1; star.y += (star.baseY - star.y) * 0.1;
                targetRadius = star.radius * 0.4; 
                let parallaxSpeed = star.radius * 0.2; 
                finalY = star.y - globalScrollY * parallaxSpeed;
            }
            star.renderRadius += (targetRadius - star.renderRadius) * 0.015;
            
            if (finalY < -50) {
                if (!star.isArrowPart) {
                    star.baseY += height + 100;
                    star.y += height + 100;
                    star.baseX = Math.random() * width;
                    star.x = star.baseX;
                    continue; 
                }
            } else if (finalY > height + 50) {
                if (!star.isArrowPart) {
                    star.baseY -= height + 100;
                    star.y -= height + 100;
                    star.baseX = Math.random() * width;
                    star.x = star.baseX;
                    continue; 
                }
            }
            
            if (star.isArrowPart && (gameState.startsWith("phase4_") || gameState.startsWith("phase5_") || gameState.startsWith("phase6_") || gameState.startsWith("phase7_")) && (finalY < -50 || finalY > height + 50)) {
                continue;
            }
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

    if (visibleInventory.length > 0 && gameState !== "phase3_solid" && gameState !== "phase4_waiting" && !gameState.startsWith("phase4_") && !gameState.startsWith("phase5_") && !gameState.startsWith("phase6_") && !gameState.startsWith("phase7_")) {
        for (let shape of visibleInventory) {
            let wobbleX = 0; let wobbleY = 0;
            const tSec = now / 1000;
            
            if (gameState === "holding_shapes" || gameState === "merging") {
                wobbleX = Math.sin(tSec * shape.wobbleSpeedX + shape.wobbleOffsetX) * (1 * emSize);
                wobbleY = Math.cos(tSec * shape.wobbleSpeedY) * (3 * emSize);
            } else if (gameState === "fading_lines" || gameState === "drawing_hull") {
                wobbleX = Math.sin(tSec * 2) * (1.5 * emSize) * damping;
                wobbleY = Math.cos(tSec * 3) * (3.5 * emSize) * damping;
            }
            
            let angle = shape.initialAngle + shape.rotationSpeed * tSec;
            if (gameState === "fading_lines" || gameState === "drawing_hull") {
                angle = shape.initialAngle + shape.rotationSpeed * (mergingStartTime + 2000)/1000 + globalRotationAngle;
            }
            
            let cosA = Math.cos(angle);
            let sinA = Math.sin(angle);
            
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
                    
                    let tSmooth = progress < 0.5 
                        ? 4 * progress * progress * progress 
                        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                    
                    let blendedTargetX = v.targetX + (width/2 - v.targetX) * tSmooth;
                    let blendedTargetY = v.targetY + (height/2 - v.targetY) * tSmooth;
                    
                    let centerDestX = blendedTargetX + rotX; 
                    let centerDestY = blendedTargetY + rotY;
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
    
    if (gameState === "phase3_solid" || gameState === "phase4_waiting" || gameState === "phase4_pre_chaos") {
        const tSec = now / 1000;
        let globalWobbleX = Math.sin(tSec * 2) * (1.5 * emSize) * damping;
        let globalWobbleY = Math.cos(tSec * 3) * (3.5 * emSize) * damping;
        
        let hitShakeX = 0; let hitShakeY = 0;
        if (gameState === "phase4_waiting" && now < phase4ShakeEndTime) {
            hitShakeX = (Math.random() - 0.5) * 15;
            hitShakeY = (Math.random() - 0.5) * 15;
        }
        
        ctx.save();
        ctx.beginPath();
        let cosA = Math.cos(globalRotationAngle);
        let sinA = Math.sin(globalRotationAngle);

        for (let j = 0; j < finalMassHull.length; j++) {
            let v = finalMassHull[j];
            let rotX = v.x * cosA - v.y * sinA;
            let rotY = v.x * sinA + v.y * cosA;

            let drawX = (width/2) + rotX + globalWobbleX + hitShakeX;
            let drawY = (height/2) + rotY + globalWobbleY + hitShakeY;
            if (j === 0) ctx.moveTo(drawX, drawY);
            else ctx.lineTo(drawX, drawY);
        }
        ctx.closePath();
        
        ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
        ctx.strokeStyle = `rgba(0, 0, 0, 0.9)`;
        ctx.lineWidth = 2;
        
        if (now < phase4ShakeEndTime) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
            ctx.strokeStyle = `rgba(255, 100, 100, 1)`;
        }
        
        ctx.fill(); ctx.stroke();
        
        if (gameState === "phase4_pre_chaos") {
            ctx.fillStyle = `rgba(255, 255, 255, 0.8)`; 
            ctx.fill();
            
            for (let shape of visibleInventory) {
                let angle = shape.initialAngle + shape.rotationSpeed * (mergingStartTime + 2000)/1000 + globalRotationAngle;
                
                ctx.save();
                ctx.translate(width/2, height/2);
                ctx.rotate(angle);
                
                ctx.beginPath();
                for (let j = 0; j < shape.vertices.length; j++) {
                    let v = shape.vertices[j];
                    if (j === 0) ctx.moveTo(v.relX, v.relY);
                    else ctx.lineTo(v.relX, v.relY);
                }
                ctx.closePath();
                
                ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`;
                ctx.lineWidth = 3;
                ctx.stroke(); 
                
                for(let v of shape.vertices) {
                    ctx.beginPath();
                    ctx.arc(v.relX, v.relY, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#000000';
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#ffffff';
                    ctx.fill();
                }
                ctx.restore();
            }
        }
        
        ctx.restore();
    }

    if (gameState.startsWith("phase4_") || gameState.startsWith("phase5_")) {
        const bottomRowY = height - 100;
        const rowWidth = 30 * emSize;
        const slotsCount = visibleInventory.length;
        const startX = (width/2) - (rowWidth/2);
        
        if (gameState === "phase4_chaos" || gameState === "phase4_dragging" || gameState === "phase4_dropping") {
            let allLocked = visibleInventory.every(s => s.state === "locked");
            if (allLocked && visibleInventory.length > 0) {
                gameState = "phase5_drawing_sockets";
                phase5StartTime = performance.now();
                
                hidePhaseUI();
                setTimeout(() => {
                    showPhaseUI("ENCAJALAS", "");
                }, 500);
                
                const minX = 10 * emSize;
                const maxX = width - 10 * emSize;
                const minY = 10 * emSize;
                const maxY = bottomRowY - 7 * emSize;
                const usableWidth = maxX - minX;
                const usableHeight = maxY - minY;
                
                const minSpace = 7 * emSize;
                
                for (let shape of visibleInventory) {
                    let maxR = 0;
                    for (let v of shape.vertices) {
                        let r = Math.hypot(v.relX, v.relY);
                        if (r > maxR) maxR = r;
                    }
                    shape.boundingRadius = maxR;
                }

                let rows = [];
                let currentRow = [];
                let currentWidth = 0;
                
                for (let i = 0; i < slotsCount; i++) {
                    let shape = visibleInventory[i];
                    let shapeSpace = shape.boundingRadius * 2;
                    
                    if (currentRow.length > 0 && (currentWidth + minSpace + shapeSpace > usableWidth)) {
                        rows.push({ items: currentRow, width: currentWidth });
                        currentRow = [shape];
                        currentWidth = shapeSpace;
                    } else {
                        if (currentRow.length > 0) currentWidth += minSpace;
                        currentRow.push(shape);
                        currentWidth += shapeSpace;
                    }
                }
                if (currentRow.length > 0) {
                    rows.push({ items: currentRow, width: currentWidth });
                }
                
                let rowsToUse = rows.length;
                for (let r = 0; r < rowsToUse; r++) {
                    let rowY = rowsToUse === 1 
                        ? minY + usableHeight / 2 
                        : minY + (usableHeight / (rowsToUse + 1)) * (r + 1);
                        
                    let startX = minX + (usableWidth - rows[r].width) / 2;
                    let currentX = startX;
                    
                    for (let shape of rows[r].items) {
                        currentX += shape.boundingRadius;
                        shape.socketTargetX = currentX;
                        shape.socketTargetY = rowY;
                        shape.socketAngle = shape.initialAngle;
                        currentX += shape.boundingRadius + minSpace;
                    }
                }
                
                let availableColors = ['#d12539', '#138f38', '#f5a02d', '#87cde8'];
                let pool = [];
                while(pool.length < slotsCount) {
                    pool = pool.concat([...availableColors]);
                }
                pool = pool.sort(() => Math.random() - 0.5);
                
                for (let i = 0; i < slotsCount; i++) {
                    visibleInventory[i].assignedColor = pool[i];
                }
            }
        }
        
        if (gameState.startsWith("phase5_")) {
            const elapsed = (now - phase5StartTime) / 1000;
            let progress = elapsed / 1.5;
            if (progress > 1) progress = 1;
            
            if (gameState === "phase5_drawing_sockets" && progress >= 1.0) {
                gameState = "phase5_filling_sockets";
                phase5FillStartTime = performance.now();
            } else if (gameState === "phase5_filling_sockets") {
                let fillElapsed = (now - phase5FillStartTime) / 1000;
                if (fillElapsed >= 0.5) {
                    gameState = "phase5_interact";
                }
            }
            
            for (let shape of visibleInventory) {
                ctx.save();
                ctx.translate(shape.socketTargetX, shape.socketTargetY);
                ctx.rotate(shape.socketAngle);
                
                ctx.beginPath();
                let totalVertices = shape.vertices.length;
                let pointsToDraw = Math.max(1, Math.floor(progress * totalVertices));
                
                for (let j = 0; j <= pointsToDraw; j++) {
                    let v = shape.vertices[j % totalVertices];
                    if (j === 0) ctx.moveTo(v.relX, v.relY);
                    else ctx.lineTo(v.relX, v.relY);
                }
                
                if (progress >= 1.0) ctx.closePath();
                
                ctx.lineWidth = 2;
                ctx.strokeStyle = `rgba(150, 150, 150, 0.8)`;
                ctx.setLineDash([8, 8]);
                ctx.stroke();
                ctx.setLineDash([]);
                
                if (gameState === "phase5_filling_sockets" || gameState === "phase5_interact") {
                    let fillOpacity = 1.0;
                    if (gameState === "phase5_filling_sockets") {
                        fillOpacity = Math.min(1.0, (now - phase5FillStartTime)/1000 / 0.5);
                    }
                    ctx.fillStyle = `rgba(200, 200, 200, ${0.4 * fillOpacity})`;
                    ctx.fill();
                }
                ctx.restore();
            }
        }
        
        for (let i = 0; i < visibleInventory.length; i++) {
            let shape = visibleInventory[i];
            
            if (shape.state === "chaos") {
                shape.centerX += shape.vx;
                shape.centerY += shape.vy;
                
                if (shape.centerX < shape.radius) { shape.centerX = shape.radius; shape.vx *= -1; }
                if (shape.centerX > width - shape.radius) { shape.centerX = width - shape.radius; shape.vx *= -1; }
                if (shape.centerY < shape.radius) { shape.centerY = shape.radius; shape.vy *= -1; }
                if (shape.centerY > height - shape.radius) { shape.centerY = height - shape.radius; shape.vy *= -1; }
                
            } else if (shape.state === "dragging") {
                const forceX = (mouse.x - shape.centerX) * 0.2;
                const forceY = (mouse.y - shape.centerY) * 0.2;
                shape.vx = (shape.vx + forceX) * 0.8; 
                shape.vy = (shape.vy + forceY) * 0.8;
                shape.centerX += shape.vx;
                shape.centerY += shape.vy;
                
            } else if (shape.state === "dropping") {
                shape.vy += 0.8; 
                shape.centerX += shape.vx;
                shape.centerY += shape.vy;
                
                if (shape.centerX < shape.radius) { shape.centerX = shape.radius; shape.vx *= -0.5; }
                if (shape.centerX > width - shape.radius) { shape.centerX = width - shape.radius; shape.vx *= -0.5; }
                
                if (shape.centerY >= bottomRowY) {
                    shape.centerY = bottomRowY;
                    shape.vy = 0;
                    shape.vx = 0;
                    shape.state = "locked";
                    if (slotsCount > 1) {
                        shape.slotTargetX = startX + (i * (rowWidth / (slotsCount - 1)));
                    } else {
                        shape.slotTargetX = width/2;
                    }
                }
            } else if (shape.state === "locked") {
                shape.centerX += (shape.slotTargetX - shape.centerX) * 0.1;
            } else if (shape.state === "snapping") { 
                shape.centerX += (shape.socketTargetX - shape.centerX) * 0.15;
                shape.centerY += (shape.socketTargetY - shape.centerY) * 0.15;
                
                let diff = (shape.socketAngle - shape.angle) % (Math.PI * 2);
                if (diff !== diff % Math.PI) {
                    diff = (diff < 0) ? diff + Math.PI * 2 : diff - Math.PI * 2;
                }
                shape.angle += diff * 0.15;
                
                let dist = Math.hypot(shape.socketTargetX - shape.centerX, shape.socketTargetY - shape.centerY);
                if (dist < 1) {
                    shape.state = "socketed";
                    shape.socketedTime = performance.now();
                    shape.centerX = shape.socketTargetX;
                    shape.centerY = shape.socketTargetY;
                    shape.angle = shape.socketAngle;
                }
            } else if (shape.state === "socketed") {
                shape.centerX = shape.socketTargetX;
                shape.centerY = shape.socketTargetY;
                shape.angle = shape.socketAngle;
            }
        }
        
        for (let i = 0; i < visibleInventory.length; i++) {
            for (let j = i + 1; j < visibleInventory.length; j++) {
                let s1 = visibleInventory[i];
                let s2 = visibleInventory[j];
                if (s1.state === "chaos" && s2.state === "chaos") {
                    let dx = s2.centerX - s1.centerX;
                    let dy = s2.centerY - s1.centerY;
                    let dist = Math.hypot(dx, dy);
                    let minDist = s1.radius + s2.radius;
                    if (dist < minDist && dist > 0) {
                        let overlap = minDist - dist;
                        let nx = dx / dist;
                        let ny = dy / dist;
                        s1.centerX -= nx * overlap / 2; s1.centerY -= ny * overlap / 2;
                        s2.centerX += nx * overlap / 2; s2.centerY += ny * overlap / 2;
                        
                        let kx = (s1.vx - s2.vx);
                        let ky = (s1.vy - s2.vy);
                        let p = 2.0 * (nx * kx + ny * ky) / 2.0; 
                        s1.vx -= p * nx; s1.vy -= p * ny;
                        s2.vx += p * nx; s2.vy += p * ny;
                    }
                }
            }
        }
        
        for (let shape of visibleInventory) {
            if (gameState === "phase3_solid" || gameState === "phase4_waiting" || gameState === "phase4_pre_chaos") continue;
            
            let currentScale = 1.0;
            if (shape.state === "locked" || (shape.state === "dropping" && !gameState.startsWith("phase5_"))) {
                let minX = Math.min(...shape.vertices.map(v => v.relX));
                let maxX = Math.max(...shape.vertices.map(v => v.relX));
                let currentWidth = maxX - minX;
                if (currentWidth > 0) {
                    let targetScale = (3 * emSize) / currentWidth;
                    shape.currentScale = shape.currentScale || 1.0;
                    shape.currentScale += (targetScale - shape.currentScale) * 0.1;
                    currentScale = shape.currentScale;
                }
            } else {
                shape.currentScale = shape.currentScale || 1.0;
                shape.currentScale += (1.0 - shape.currentScale) * 0.1;
                currentScale = shape.currentScale;
            }

            if (shape.state !== "snapping" && shape.state !== "socketed") {
                shape.angle = (shape.angle || shape.initialAngle) + shape.rotationSpeed * timeDelta;
            }
            let renderAngle = shape.angle;
            
            if (shape.state === "dragging") {
                renderAngle = (shape.vx * 0.05); 
            } else if (shape.state === "locked") {
                shape.angle *= 0.9; 
                renderAngle = shape.angle;
            }

            ctx.save();
            ctx.translate(shape.centerX, shape.centerY);
            ctx.rotate(renderAngle);
            ctx.scale(currentScale, currentScale);

            ctx.beginPath();
            for (let j = 0; j < shape.vertices.length; j++) {
                let v = shape.vertices[j];
                if (j === 0) ctx.moveTo(v.relX, v.relY);
                else ctx.lineTo(v.relX, v.relY);
            }
            ctx.closePath();
            
            if (shape.state === "socketed") {
                let elapsed = (now - shape.socketedTime) / 1000;
                let progress = Math.min(1.0, elapsed / 0.8); 
                
                ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * (1 - progress)})`;
                ctx.strokeStyle = `rgba(0, 0, 0, ${0.9 * (1 - progress)})`;
                ctx.lineWidth = 2;
                if (progress < 1.0) {
                    ctx.fill(); ctx.stroke();
                }
                
                if (progress > 0) {
                    ctx.fillStyle = shape.assignedColor;
                    ctx.globalAlpha = progress;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }
            } else {
                ctx.fillStyle = `rgba(0, 0, 0, 0.8)`;
                ctx.strokeStyle = `rgba(0, 0, 0, 0.9)`;
                ctx.lineWidth = 2;
                
                if (shape.state === "dragging") {
                    ctx.strokeStyle = `rgba(255, 150, 150, 1)`;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = 'rgba(255, 50, 50, 0.5)';
                }
                
                ctx.fill(); ctx.stroke();
            }
            
            ctx.restore();
        }
    }
    
    // Motor 3D Fases 6 y 7
    if (gameState.startsWith("phase6_") || gameState.startsWith("phase7_")) {
        let maxDepth = 4 * emSize;
        
        for (let shape of visibleInventory) {
            let depth = maxDepth * depthProgress;
            
            if (shape.state === "nucleus") {
                shape.centerX += (width/2 - shape.centerX) * 0.1;
                shape.centerY += (height/2 - shape.centerY) * 0.1;
            }
            if (shape.state === "dragging_3d") {
                shape.centerX += (mouse.x - shape.centerX) * 0.3;
                shape.centerY += (mouse.y - shape.centerY) * 0.3;
            }
            
            for (let face of shape.faceRefs) {
                if (face.type === 'front') {
                    for(let i = 0; i < shape.vertices.length; i++) {
                        face.vertices[i].x = shape.vertices[i].relX;
                        face.vertices[i].y = shape.vertices[i].relY;
                        face.vertices[i].z = depth/2;
                    }
                } else if (face.type === 'back') {
                    let len = shape.vertices.length;
                    for(let i = 0; i < len; i++) {
                        let v = shape.vertices[len - 1 - i];
                        face.vertices[i].x = v.relX;
                        face.vertices[i].y = v.relY;
                        face.vertices[i].z = -depth/2;
                    }
                } else if (face.type === 'side') {
                    let i = face.index;
                    let nextI = (i + 1) % shape.vertices.length;
                    let v1 = shape.vertices[i];
                    let v2 = shape.vertices[nextI];
                    
                    face.vertices[0].x = v1.relX; face.vertices[0].y = v1.relY; face.vertices[0].z = depth/2;
                    face.vertices[1].x = v2.relX; face.vertices[1].y = v2.relY; face.vertices[1].z = depth/2;
                    face.vertices[2].x = v2.relX; face.vertices[2].y = v2.relY; face.vertices[2].z = -depth/2;
                    face.vertices[3].x = v1.relX; face.vertices[3].y = v1.relY; face.vertices[3].z = -depth/2;
                }
                
                let avgZ = 0;
                for (let i = 0; i < face.vertices.length; i++) {
                    let pt = {x: face.vertices[i].x, y: face.vertices[i].y, z: face.vertices[i].z};
                    pt = rotate3D(pt, 0, 0, shape.socketAngle || 0);
                    
                    if (shape.state === "attached" || shape.state === "nucleus") {
                        pt.x += shape.localX || 0;
                        pt.y += shape.localY || 0;
                        pt.z += shape.localZ || 0;
                        
                        pt = rotate3D(pt, nucRotX, nucRotY, 0);
                        
                        if (shape.state === "nucleus") {
                            pt.x += (shape.centerX - width/2);
                            pt.y += (shape.centerY - height/2);
                        } else if (shape.state === "attached") {
                            pt.x += (nucleusShape.centerX - width/2);
                            pt.y += (nucleusShape.centerY - height/2);
                        }
                    } else {
                        pt.x += (shape.centerX - width/2);
                        pt.y += (shape.centerY - height/2);
                        if (shape.state === "dragging_3d") pt.z += 50;
                    }
                    
                    face.tVertices[i].sx = width/2 + pt.x;
                    face.tVertices[i].sy = height/2 + pt.y;
                    face.tVertices[i].z = pt.z;
                    avgZ += pt.z;
                }
                
                face.avgZ = avgZ / face.vertices.length;
                face.highlight = (shape.state === "dragging_3d" || shape.state === "nucleus");
            }
        }
        
        master3DFaces.sort((a, b) => a.avgZ - b.avgZ); 
        
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
        
        for (let face of master3DFaces) {
            if (face.highlight && gameState !== "phase7_free_view") continue;
            
            ctx.beginPath();
            for (let i = 0; i < face.tVertices.length; i++) {
                let v = face.tVertices[i];
                if (i === 0) ctx.moveTo(v.sx, v.sy);
                else ctx.lineTo(v.sx, v.sy);
            }
            ctx.closePath();
            
            ctx.fillStyle = face.color;
            ctx.strokeStyle = `rgba(0,0,0,0.5)`;
            ctx.fill(); ctx.stroke();
        }
        
        if (gameState !== "phase7_free_view") {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            for (let face of master3DFaces) {
                if (!face.highlight) continue;
                
                ctx.beginPath();
                for (let i = 0; i < face.tVertices.length; i++) {
                    let v = face.tVertices[i];
                    if (i === 0) ctx.moveTo(v.sx, v.sy);
                    else ctx.lineTo(v.sx, v.sy);
                }
                ctx.closePath();
                
                ctx.fillStyle = face.color;
                ctx.strokeStyle = `rgba(0,0,0,0.5)`;
                ctx.fill(); ctx.stroke();
            }
            ctx.shadowBlur = 0; 
        }
    }
    
    requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize();
draw();

// Lógica de la pantalla de introducción
const startBtn = document.getElementById('start-btn');
if(startBtn) {
    startBtn.addEventListener('click', () => {
        // Esconder elementos con animación inversa
        document.getElementById('word-dale').classList.add('hide');
        document.getElementById('word-forma').classList.add('hide');
        startBtn.classList.add('hide');
        
        // Iniciar la transición del espacio de inmediato
        gameState = "intro_transition";
        introTransitionStartTime = performance.now();
        generateStars(); // Inicializar estrellas para que se muevan
        
        // Esperar la animación de ocultación (0.5s) para hacer el fade del fondo
        setTimeout(() => {
            document.getElementById('intro-screen').classList.add('fade-bg');
            
            // Esperar a que termine el fade (2.5s) para iniciar la fase 1
            setTimeout(() => {
                gameState = "normal";
                document.getElementById('intro-screen').style.display = 'none'; // Desaparecer por completo
                showPhaseUI("CREA", "Distintas formas trazando estrellas", true);
            }, 2500);
        }, 500); // 0.5s, ajustado al nuevo tiempo de animaciones
    });
}

// Funciones de UI Reutilizables
function showPhaseUI(titleText, subtitleText, showCounter = false) {
    if (showCounter) {
        document.getElementById('counter-current').innerText = inventory.length;
        document.getElementById('shape-counter').classList.add('show');
    }
    
    document.getElementById('phase-title').innerText = titleText;
    document.getElementById('phase-title').classList.add('show');
    
    document.getElementById('phase-subtitle').innerText = subtitleText;
    setTimeout(() => {
        document.getElementById('phase-subtitle').classList.add('show');
    }, 500);
}

function hidePhaseUI() {
    document.getElementById('shape-counter').classList.remove('show');
    document.getElementById('phase-title').classList.remove('show');
    document.getElementById('phase-subtitle').classList.remove('show');
}

// Botones de Fase 7
const btnReiniciar = document.getElementById('btn-reiniciar');
if (btnReiniciar) {
    btnReiniciar.addEventListener('click', () => {
        let overlay = document.getElementById('fade-overlay');
        overlay.style.opacity = '1';
        
        setTimeout(() => {
            inventory = [];
            fallingShapes = [];
            visibleInventory = [];
            master3DFaces = [];
            phase4ClickCount = 0;
            nucleusShape = null;
            globalScrollY = 0;
            arrowCinematicScroll = 0;
            globalRotationAngle = 0;
            whiteOpacity = 0;
            
            gameState = "intro";
            
            let introScreen = document.getElementById('intro-screen');
            introScreen.style.display = 'flex';
            introScreen.classList.remove('fade-bg');
            document.getElementById('word-dale').classList.remove('hide');
            document.getElementById('word-forma').classList.remove('hide');
            document.getElementById('start-btn').classList.remove('hide');
            
            document.getElementById('phase7-ui').classList.remove('show');
            document.getElementById('phase-text-wrapper').classList.remove('top-pos', 'text-black');
            hidePhaseUI();
            
            stars = [];
            
            overlay.style.opacity = '0';
        }, 1000);
    });
}

const btnVolver = document.getElementById('btn-volver');
if (btnVolver) {
    btnVolver.addEventListener('click', () => {
        window.location.href = "https://misver-c.github.io/Dale-Forma---Misael-Vergara-2026/";
    });
}
