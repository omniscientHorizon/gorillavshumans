// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GORILLA_RADIUS = 30;
const HUMAN_RADIUS = 15;
const GORILLA_SPEED = 5;
const HUMAN_SPEED = 0.69;
const GORILLA_MAX_HEALTH = 1000;
const TOTAL_HUMANS = 100;
const SWIPE_COOLDOWN = 1000; // 1 second in milliseconds
const SWIPE_RADIUS = 100;
const SWIPE_ANGLE = Math.PI / 2; // 90 degrees in radians
const GRAB_COOLDOWN = 2000; // 2 seconds
const GRAB_RADIUS = 50;
const THROW_FORCE = 15;
const JUMP_COOLDOWN = 1500; // 1.5 seconds
const JUMP_RADIUS = 80;
const ARENA_RADIUS = 280;

let bgMusic = new Audio('./assets/bg_song.mp3');
bgMusic.loop = true; // ensures the song repeats
bgMusic.volume = 0.5; // optional: adjust volume (0 to 1)

let difficulty = 'medium';
let humanSpeedMultiplier = 1;
let humanCount = 100;

//load images
let gorillaImage = new Image();
gorillaImage.src = './assets/gorilla.png';

let humanImage = new Image();
humanImage.src = './assets/human.png';

let arenaImage = new Image();
arenaImage.src = './assets/arena.png';


// Game state
let canvas, ctx;
let gorilla = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    radius: GORILLA_RADIUS,
    health: GORILLA_MAX_HEALTH,
    direction: 0, // radians, 0 = right
    lastSwipeTime: 0,
    lastGrabTime: 0,
    lastJumpTime: 0,
    isJumping: false,
    jumpHeight: 0,
    isGrabbing: false,
    grabbedHuman: null
};

let humans = [];
let deadHumans = [];
let gameStartTime = 0;
let gameTime = 0;
let gameOver = false;
let score = 0;
let humansRemaining = TOTAL_HUMANS;

// Sound effects
let swipeSound, jumpSound, grabSound, hitSound, deathSound;
// Game initialization
window.onload = function () {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');

    // Load assets
    loadAssets().then(() => {
        setupEventListeners(); // ✅ Only setup controls now (no game starts yet)
    });

    document.getElementById('music-toggle').addEventListener('click', () => {
        if (bgMusic.paused) {
            bgMusic.play();
            document.getElementById('music-toggle').textContent = '🎵 Music: On';
        } else {
            bgMusic.pause();
            document.getElementById('music-toggle').textContent = '🔇 Music: Off';
        }
    });

    // Start button event listener
    document.getElementById('start-button').addEventListener('click', function () {
        // 👇 Get the selected value from the dropdown

        bgMusic.play();
        document.getElementById('music-toggle').textContent = '🎵 Music: On';


        const selectedDifficulty = document.getElementById('difficulty').value;
        difficulty = selectedDifficulty;
        

        document.getElementById('start-screen').style.display = 'none';
        initGame();
        gameStartTime = Date.now();
        requestAnimationFrame(gameLoop);
    });
    
};

// Load game assets
function loadAssets() {
    return new Promise((resolve) => {
        let assetsToLoad = 3; // gorilla and human images
        let loaded = 0;

        // Create audio elements
        swipeSound = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABMSVNUHAAAAENyZWF0ZWQgd2l0aCBTb3VuZEVkaXRvcg==');
        jumpSound = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABMSVNUHAAAAENyZWF0ZWQgd2l0aCBTb3VuZEVkaXRvcg==');
        grabSound = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABMSVNUHAAAAENyZWF0ZWQgd2l0aCBTb3VuZEVkaXRvcg==');
        hitSound = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABMSVNUHAAAAENyZWF0ZWQgd2l0aCBTb3VuZEVkaXRvcg==');
        deathSound = new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABMSVNUHAAAAENyZWF0ZWQgd2l0aCBTb3VuZEVkaXRvcg==');

        // Load gorilla and human sprites
        gorillaImage = new Image();
        gorillaImage.src = 'assets/gorilla.png';
        gorillaImage.onload = () => {
            loaded++;
            if (loaded === assetsToLoad) resolve();
        };

        humanImage = new Image();
        humanImage.src = 'assets/human.png';
        humanImage.onload = () => {
            loaded++;
            if (loaded === assetsToLoad) resolve();
        };

        arenaImage = new Image();
        arenaImage.src = 'assets/arena.png';
        arenaImage.onload = () => {
            loaded++;
            if (loaded === assetsToLoad) resolve();
        };
    });
}

// Initialize game state
function initGame() {
    gorilla = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        radius: GORILLA_RADIUS,
        health: GORILLA_MAX_HEALTH,
        direction: 0,
        lastSwipeTime: 0,
        lastGrabTime: 0,
        lastJumpTime: 0,
        isJumping: false,
        jumpHeight: 0,
        isGrabbing: false,
        grabbedHuman: null,
        jumpVelocity: 0,

    };
    updateScore();

    humans = [];
    deadHumans = [];
    gameOver = false;
    humansRemaining = humanCount;
    
    // Generate humans in a circle around the arena
    for (let i = 0; i < humanCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = ARENA_RADIUS * 0.8 + Math.random() * ARENA_RADIUS * 0.2;
        
        humans.push({
            x: CANVAS_WIDTH / 2 + Math.cos(angle) * distance,
            y: CANVAS_HEIGHT / 2 + Math.sin(angle) * distance,
            radius: HUMAN_RADIUS,
            vx: 0,
            vy: 0,
            stunned: false,
            stunTime: 0,
            dead: false
        });
    }

    switch (difficulty) {
        case 'easy':
            humanSpeedMultiplier = 0.6;
            humanCount = 50;
            break;
        case 'medium':
            humanSpeedMultiplier = 1.0;
            humanCount = 100;
            break;
        case 'hard':
            humanSpeedMultiplier = 1.4;
            humanCount = 150;
            break;
        case 'impossible':
            humanSpeedMultiplier = 2.0;
            humanCount = 300;
            break;
    }
    
    // Update UI
    updateHealthBar();
    updateHumansCounter();
    
    // Start timer
    gameStartTime = Date.now();
}

// Set up keyboard and mouse event listeners
function setupEventListeners() {
    // Keyboard controls for gorilla movement
    window.addEventListener('keydown', function(e) {
        keys[e.code] = true;
    });
    
    window.addEventListener('keyup', function(e) {
        keys[e.code] = false;
    });
    
    // Mouse controls for attacking
    canvas.addEventListener('mousedown', function(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate direction to mouse
        gorilla.direction = Math.atan2(mouseY - gorilla.y, mouseX - gorilla.x);
        
        if (e.button === 0) { // Left click - swipe
            swipeAttack();
        } else if (e.button === 2) { // Right click - grab
            grabHuman();
        }
    });
    
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // Jump on spacebar
    window.addEventListener('keydown', function(e) {
        if (e.code === 'Space') {
            jump();
        }
    });
    
    // Restart button
    document.getElementById('restart-button').addEventListener('click', function() {
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex'; // 👈 Show start screen again
    });
    
}

// main game loop
// Key state tracking
const keys = {};
function gameLoop() {
    const now = Date.now();
    gameTime = (now - gameStartTime) / 1000;

    // Clear entire canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save(); // Optional but safe for transforms

    if (!gameOver) {
        // Update game state
        updateGorilla();
        updateHumans();
        checkCollisions();

        // DRAW ORDER MATTERS
        drawArena();         // 1. Draw background
        drawDeadHumans();    // 2. Draw dead stuff under
        drawHumans();        // 3. Draw humans
        drawGorilla();       // 4. Draw gorilla last, on top

        updateTimer();       // UI update
        checkGameOver();     // Win/lose logic
    }

    ctx.restore(); // Undo any transforms

    requestAnimationFrame(gameLoop);
}


// Update gorilla position and state
function updateGorilla() {
    // Handle keyboard movement
    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp'] || keys['KeyW']) dy -= GORILLA_SPEED;
    if (keys['ArrowDown'] || keys['KeyS']) dy += GORILLA_SPEED;
    if (keys['ArrowLeft'] || keys['KeyA']) dx -= GORILLA_SPEED;
    if (keys['ArrowRight'] || keys['KeyD']) dx += GORILLA_SPEED;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = dx / length * GORILLA_SPEED;
        dy = dy / length * GORILLA_SPEED;
    }

    // Update position
    gorilla.x += dx;
    gorilla.y += dy;

    // Update direction if moving
    if (dx !== 0 || dy !== 0) {
        gorilla.direction = Math.atan2(dy, dx);
    }

    // Keep gorilla within arena
    const distanceFromCenter = Math.sqrt(
        Math.pow(gorilla.x - CANVAS_WIDTH / 2, 2) +
        Math.pow(gorilla.y - CANVAS_HEIGHT / 2, 2)
    );

    if (distanceFromCenter + gorilla.radius > ARENA_RADIUS) {
        const angle = Math.atan2(gorilla.y - CANVAS_HEIGHT / 2, gorilla.x - CANVAS_WIDTH / 2);
        gorilla.x = CANVAS_WIDTH / 2 + Math.cos(angle) * (ARENA_RADIUS - gorilla.radius);
        gorilla.y = CANVAS_HEIGHT / 2 + Math.sin(angle) * (ARENA_RADIUS - gorilla.radius);
    }

    // Handle jumping (better smooth curve with gravity)
    if (gorilla.isJumping) {
        gorilla.jumpHeight += gorilla.jumpVelocity;
        gorilla.jumpVelocity -= 1; // gravity effect

        if (gorilla.jumpHeight <= 0) {
            gorilla.jumpHeight = 0;
            gorilla.isJumping = false;

            // 💥 Landing impact
            for (let i = 0; i < humans.length; i++) {
                if (humans[i].dead) continue;

                const distance = Math.hypot(humans[i].x - gorilla.x, humans[i].y - gorilla.y);

                if (distance < JUMP_RADIUS) {
                    killHuman(i);
                    addScreenShake(6);

                    // Optional: play shockwave/dust visual
                    // Can also add `createShockwave(gorilla.x, gorilla.y);`
                }
            }
        }
    }

    // Update grabbed human position
    if (gorilla.isGrabbing && gorilla.grabbedHuman !== null) {
        const grabbedHuman = humans[gorilla.grabbedHuman];
        if (grabbedHuman) {
            grabbedHuman.x = gorilla.x + Math.cos(gorilla.direction) * gorilla.radius * 1.5;
            grabbedHuman.y = gorilla.y + Math.sin(gorilla.direction) * gorilla.radius * 1.5;

            // Auto-throw after cooldown
            if (Date.now() - gorilla.lastGrabTime >= GRAB_COOLDOWN) {
                throwHuman();
            }
        }
    }
}


// Update humans position and behavior
function updateHumans() {
    for (let i = 0; i < humans.length; i++) {
        const human = humans[i];
        
        if (human.dead) continue;
        if (i === gorilla.grabbedHuman) continue;
        
        // Apply physics if stunned
        if (human.stunned) {
            human.x += human.vx;
            human.y += human.vy;
            human.vx *= 0.9;
            human.vy *= 0.9;
            
            // Recover from stun
            if (Date.now() > human.stunTime) {
                human.stunned = false;
            }
            
            continue;
        }
        
        // Basic AI: move toward gorilla
        const dx = gorilla.x - human.x;
        const dy = gorilla.y - human.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only move if not too close to gorilla
        if (distance > gorilla.radius + human.radius) {
            // Normalize and apply speed
            const angle = Math.atan2(dy, dx);
            human.x += Math.cos(angle) * HUMAN_SPEED;
            human.y += Math.sin(angle) * HUMAN_SPEED;
        }
        
        // Keep humans within arena
        const distanceFromCenter = Math.sqrt(
            Math.pow(human.x - CANVAS_WIDTH / 2, 2) + 
            Math.pow(human.y - CANVAS_HEIGHT / 2, 2)
        );

        // Repel from other nearby humans
for (let j = 0; j < humans.length; j++) {
    if (i === j || humans[j].dead) continue;

    const dx = human.x - humans[j].x;
    const dy = human.y - humans[j].y;
    const dist = Math.hypot(dx, dy);

    if (dist < HUMAN_RADIUS * 2 && dist > 0) {
        const repulsion = (HUMAN_RADIUS * 2 - dist) * 0.05;
        human.x += (dx / dist) * repulsion;
        human.y += (dy / dist) * repulsion;
    }
}

        
        if (distanceFromCenter + human.radius > ARENA_RADIUS) {
            const angle = Math.atan2(human.y - CANVAS_HEIGHT / 2, human.x - CANVAS_WIDTH / 2);
            human.x = CANVAS_WIDTH / 2 + Math.cos(angle) * (ARENA_RADIUS - human.radius);
            human.y = CANVAS_HEIGHT / 2 + Math.sin(angle) * (ARENA_RADIUS - human.radius);
        }
    }
}

// Check for collisions between gorilla and humans
function checkCollisions() {
    const now = Date.now();

    for (let i = 0; i < humans.length; i++) {
        const human = humans[i];

        if (human.dead || human.stunned || i === gorilla.grabbedHuman) continue;

        const dx = gorilla.x - human.x;
        const dy = gorilla.y - human.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if human is close enough to attack
        if (distance < gorilla.radius + human.radius) {
            // Add damage cooldown per human
            if (!human.lastAttackTime || now - human.lastAttackTime > 1000) {
                gorilla.health -= 5; // adjust damage per hit
                human.lastAttackTime = now;
                updateHealthBar();
            }

            // Small knockback
            const angle = Math.atan2(dy, dx);
            human.x -= Math.cos(angle) * 5;
            human.y -= Math.sin(angle) * 5;
        }
    }
}


// Gorilla swipe attack
function swipeAttack() {
    const now = Date.now();

    // Cooldown check
    if (now - gorilla.lastSwipeTime < SWIPE_COOLDOWN) return;

    gorilla.lastSwipeTime = now;
    swipeSound.play();

    // Check for humans in swipe area
    for (let i = 0; i < humans.length; i++) {
        const human = humans[i];

        if (human.dead || i === gorilla.grabbedHuman) continue;

        // Vector to human
        const dx = human.x - gorilla.x;
        const dy = human.y - gorilla.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Check if within swipe arc and radius
        const angleDiff = Math.abs(normalizeAngle(angle - gorilla.direction));
        if (distance < SWIPE_RADIUS && angleDiff < SWIPE_ANGLE / 2) {

            // Knockback
            const knockbackAngle = gorilla.direction;
            human.vx = Math.cos(knockbackAngle) * THROW_FORCE;
            human.vy = Math.sin(knockbackAngle) * THROW_FORCE;
            human.stunned = true;
            human.stunTime = now + 1000;

            // Predict new position
            const futureX = human.x + human.vx * 5;
            const futureY = human.y + human.vy * 5;
            const distanceFromCenter = Math.hypot(
                futureX - CANVAS_WIDTH / 2,
                futureY - CANVAS_HEIGHT / 2
            );

            // Check if they'll hit the arena wall hard enough
            if (distanceFromCenter + human.radius > ARENA_RADIUS && THROW_FORCE > 12) {
                killHuman(i); // 💀 KILL!
            }
        }
    }

    // Add feedback
    addScreenShake(3);
}


// Gorilla grab attack
function grabHuman() {
    const now = Date.now();
    
    // Check cooldown
    if (now - gorilla.lastGrabTime < GRAB_COOLDOWN) return;
    if (gorilla.isGrabbing) return;
    
    // Find closest human in grab range
    let closestDistance = GRAB_RADIUS;
    let closestHuman = -1;
    
    for (let i = 0; i < humans.length; i++) {
        const human = humans[i];
        
        if (human.dead) continue;
        
        // Calculate distance to human
        const dx = human.x - gorilla.x;
        const dy = human.y - gorilla.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Check if human is within grab range and in front of gorilla
        const angleDiff = Math.abs(normalizeAngle(angle - gorilla.direction));
        
        if (distance < closestDistance && angleDiff < Math.PI / 4) {
            closestDistance = distance;
            closestHuman = i;
        }
    }
    
    // Grab closest human if found
    if (closestHuman !== -1) {
        gorilla.isGrabbing = true;
        gorilla.grabbedHuman = closestHuman;
        gorilla.lastGrabTime = now;
        grabSound.play();
    }
}

// Throw grabbed human
function throwHuman() {
    if (!gorilla.isGrabbing || gorilla.grabbedHuman === null) return;
    
    const human = humans[gorilla.grabbedHuman];
    
    // Apply throw force
    human.vx = Math.cos(gorilla.direction) * THROW_FORCE * 2;
    human.vy = Math.sin(gorilla.direction) * THROW_FORCE * 2;
    human.stunned = true;
    human.stunTime = Date.now() + 2000;
    
    // Reset grab state
    gorilla.isGrabbing = false;
    gorilla.grabbedHuman = null;
    
    // Check collisions with other humans
    for (let i = 0; i < humans.length; i++) {
        const otherHuman = humans[i];
        
        if (otherHuman.dead || i === gorilla.grabbedHuman) continue;
        
        // Simplified collision detection
        const dx = otherHuman.x - human.x;
        const dy = otherHuman.y - human.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < human.radius * 4) {
            // Apply knockback to other human
            otherHuman.vx = human.vx * 0.7;
            otherHuman.vy = human.vy * 0.7;
            otherHuman.stunned = true;
            otherHuman.stunTime = Date.now() + 1000;
        }
    }
}

// Gorilla jump attack
function jump() {
    const now = Date.now();

    if (now - gorilla.lastJumpTime < JUMP_COOLDOWN) return;
    if (gorilla.isJumping) return;

    gorilla.isJumping = true;
    gorilla.jumpHeight = 0;
    gorilla.jumpVelocity = 20; // initial upward boost
    gorilla.lastJumpTime = now;
    jumpSound.play();
}


// Kill a human
function killHuman(index) {
    const human = humans[index];
    human.dead = true;
    
    // Add to dead humans array for rendering
    deadHumans.push({
        x: human.x,
        y: human.y,
        radius: human.radius,
        rotation: Math.random() * Math.PI * 2
    });
    
    //increment score 
    score++;
    updateScore();

    // Update counter
    humansRemaining--;
    updateHumansCounter();
    
    // Add blood splatter effect
    addBloodSplatter(human.x, human.y);
    
    // Play sound
    deathSound.play();
    
    // Screen shake effect
    addScreenShake(2);
}

// Normalize angle to range [-PI, PI]
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

// Screen shake effect
let screenShake = 0;
function addScreenShake(amount) {
    screenShake = Math.max(screenShake, amount);
}

// Blood splatter effect
function addBloodSplatter(x, y) {
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 20;
        
        ctx.fillStyle = 'rgba(139, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance,
            Math.random() * 5 + 2,
            0, Math.PI * 2
        );
        ctx.fill();
    }
}

// Draw game elements
function drawArena() {
    // Apply screen shake
    ctx.save();
    if (screenShake > 0) {
        ctx.translate(
            Math.random() * screenShake * 2 - screenShake,
            Math.random() * screenShake * 2 - screenShake
        );
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }
    
    // Draw arena
    // Draw arena image centered on canvas
    if (arenaImage.complete) {
        ctx.drawImage(
            arenaImage,
            CANVAS_WIDTH / 2 - ARENA_RADIUS,
            CANVAS_HEIGHT / 2 - ARENA_RADIUS,
            ARENA_RADIUS * 2,
            ARENA_RADIUS * 2
        );
    }

    ctx.restore();
  
}

// Draw dead humans
function drawDeadHumans() {
    ctx.fillStyle = '#833';
    for (const deadHuman of deadHumans) {
        ctx.save();
        ctx.translate(deadHuman.x, deadHuman.y);
        ctx.rotate(deadHuman.rotation);
        
        // Draw a simple X shape for dead humans
        ctx.beginPath();
        ctx.moveTo(-deadHuman.radius, -deadHuman.radius);
        ctx.lineTo(deadHuman.radius, deadHuman.radius);
        ctx.moveTo(deadHuman.radius, -deadHuman.radius);
        ctx.lineTo(-deadHuman.radius, deadHuman.radius);
        ctx.strokeStyle = '#833';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.restore();
    }
}

// Draw humans
function drawHumans() {
    for (let i = 0; i < humans.length; i++) {
        const human = humans[i]; // ✅ Fixes the error

        if (human.dead) continue;

        if (humanImage.complete) {
            ctx.drawImage(
                humanImage,
                human.x - human.radius,
                human.y - human.radius,
                human.radius * 2,
                human.radius * 2
            );
        } else {
            // fallback circle
            ctx.fillStyle = human.stunned ? '#a77' : '#a33';
            ctx.beginPath();
            ctx.arc(human.x, human.y, human.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}


// draw gorilla
function drawGorilla() {
    ctx.drawImage(
        gorillaImage,
        gorilla.x - gorilla.radius,
        gorilla.y - gorilla.radius - gorilla.jumpHeight,
        gorilla.radius * 2,
        gorilla.radius * 2
    );
}


// Update the health bar UI
function updateHealthBar() {
    const fill = document.getElementById('health-fill');
    const percent = Math.max(0, gorilla.health / GORILLA_MAX_HEALTH) * 100;
    fill.style.width = percent + '%';
}

// Update the humans remaining counter
function updateHumansCounter() {
    const counter = document.getElementById('humans-counter');
    counter.textContent = 'Humans: ' + humansRemaining;
}

// Update the game timer
function updateTimer() {
    const timer = document.getElementById('timer');
    timer.textContent = 'Time: ' + gameTime.toFixed(1);
}

// Game over check
function checkGameOver() {
    if (gorilla.health <= 0 || humansRemaining <= 0) {
        gameOver = true;

        const message = document.getElementById('final-message');
        if (gorilla.health <= 0) {
            message.textContent = 'GAME OVER';
        } else {
            message.textContent = 'YOU WIN 🎉';
        }

        document.getElementById('final-score').textContent = 'Score: ' + score;
        document.getElementById('game-over').style.display = 'block';
    }
}


function updateScore() {
    const scoreDisplay = document.getElementById('score');
    scoreDisplay.textContent = 'Score: ' + score;
}
