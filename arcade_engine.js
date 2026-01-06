
/**
 * SKOLE DASHBOARD - ARCADE ENGINE 🕹️
 * Handles all game logic, settings, and high scores.
 */

window.Arcade = {    // Global Settings
    settings: {
        soundEnabled: true, // NEW
        // Snake
        snakeSpeed: 100, // ms
        snakeWalls: true, // Die on wall hit
        snakeTheme: 'classic', // classic, neon, retro
        // Breakout
        breakoutChance: 0.2,
        breakoutMultiball: 'standard',
        breakoutLives: 3,
        breakoutPaddle: 100,
        // Pong
        pongDifficulty: 'normal',
        pongWinScore: 5,
        pongPlayerPaddle: 100,
        pongCpuPaddle: 80
    },
    state: {
        activeGame: null,
        highScores: JSON.parse(localStorage.getItem('arcade_scores')) || {},
        coins: parseInt(localStorage.getItem('arcade_coins')) || 0,
        inventory: JSON.parse(localStorage.getItem('arcade_inventory')) || ['theme-midnight', 'theme-royal', 'theme-crimson', 'theme-emerald', 'theme-frost', 'snake-skin-classic'],
        playerName: localStorage.getItem('arcade_player_name') || '',
        globalScores: {}
    },

    // Player Name Logic
    editName() {
        const current = this.state.playerName || '';
        const newName = prompt("Indtast dit navn (Max 12 tegn):", current);

        if (newName !== null) {
            const cleaned = newName.trim().substring(0, 12);
            if (cleaned.length > 0) {
                this.state.playerName = cleaned;
                localStorage.setItem('arcade_player_name', cleaned);
                alert(`Navn ændret til: ${cleaned} 👤`);
                // Update hidden input if present to sync state
                const input = document.getElementById('player-name-input');
                if (input) input.value = cleaned;
            }
        }
    },

    // Shop Configuration
    shop: [
        // Modifiers
        { id: 'paddle-golden', name: 'Golden Paddle', type: 'mod', cost: 1500, desc: '50% Større bat i Pong & Breakout.' },
        { id: 'life-extra', name: 'Extra Life', type: 'mod', cost: 2000, desc: '+1 Liv i Breakout (Permanent).' },
        { id: 'snake-slow', name: 'Chill Snake', type: 'mod', cost: 1200, desc: '20% Langsommere slange.' },

        // Themes
        { id: 'theme-matrix', name: 'The Matrix', type: 'theme', cost: 1000, desc: 'Digital grøn kode-regn.' },
        { id: 'theme-sunset', name: 'Vapor Sunset', type: 'theme', cost: 850, desc: 'Retro 80er gradients.' },
        { id: 'theme-ocean', name: 'Deep Ocean', type: 'theme', cost: 500, desc: 'Rolig dybhavs blå.' },
        { id: 'snake-skin-neon', name: 'Neon Snake', type: 'skin', cost: 300, desc: 'Selvlysende slange.' }
    ],

    // Real Firebase Leaderboard Logic
    connectLeaderboard() {
        if (typeof firebase === 'undefined' || !firebase.database) return;

        try {
            const db = firebase.database();
            const ref = db.ref('leaderboards');

            // Listen for all changes
            ref.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    if (!this.state.globalScores) this.state.globalScores = {};
                    this.state.globalScores = data;
                    // Update UI if open
                    if (window.renderLeaderboard) window.renderLeaderboard();
                }
            });
        } catch (e) { console.error("Leaderboard connect error", e); }
    },

    getLeaderboard(game) {
        // 1. Try Real Global Data
        if (this.state.globalScores && this.state.globalScores[game]) {
            const rawData = this.state.globalScores[game];
            // Convert Object to Array
            // Convert Object to Array and Deduplicate
            const rawEntries = Object.values(rawData);
            const uniqueScores = {};

            rawEntries.forEach(entry => {
                const name = entry.name;
                const score = parseInt(entry.score) || 0;

                // Keep only highest score for this name
                if (!uniqueScores[name] || score > uniqueScores[name].score) {
                    uniqueScores[name] = {
                        name: name,
                        score: score,
                        isUser: name === (this.state.playerName || 'Mig')
                    };
                }
            });

            // Sort Deduplicated Array
            return Object.values(uniqueScores).sort((a, b) => b.score - a.score);
        }

        // 2. Fallback
        const userScore = this.state.highScores[game] || 0;
        const userName = this.state.playerName || 'Mig';
        return [{ name: userName, score: userScore, isUser: true }];
    },

    Audio: {
        ctx: null,
        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
        },
        play(freq, type, duration) {
            if (!Arcade.settings.soundEnabled) return; // Mute Check

            if (!this.ctx) this.init();
            if (this.ctx.state === 'suspended') this.ctx.resume();

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        },
        // Helpers
        beep() { this.play(600, 'square', 0.1); }, // Paddle
        boop() { this.play(300, 'sine', 0.1); },   // Wall
        ping() { this.play(800, 'triangle', 0.1); }, // Brick
        win() {
            this.play(600, 'sine', 0.1);
            setTimeout(() => this.play(800, 'sine', 0.1), 100);
            setTimeout(() => this.play(1000, 'sine', 0.2), 200);
        },
        die() {
            this.play(200, 'sawtooth', 0.3);
            setTimeout(() => this.play(150, 'sawtooth', 0.3), 200);
        },
        // Wordle Sounds - Refined for "Premium" feel
        type() {
            this.play(400, 'sine', 0.05);    // Soft Thud
            this.play(1200, 'triangle', 0.03); // Crisp Click
        },
        confirm() {
            this.play(180, 'sine', 0.1);
            this.play(220, 'sine', 0.08);
        },
        flip() { this.play(450, 'sine', 0.1); }, // Snappy Whoosh
        wordleWin() {
            // C Major Chord
            this.play(523.25, 'sine', 0.2); // C5
            setTimeout(() => this.play(659.25, 'sine', 0.2), 100); // E5
            setTimeout(() => this.play(783.99, 'sine', 0.4), 200); // G5
        },
        wordleLose() {
            this.play(300, 'sawtooth', 0.2);
            setTimeout(() => this.play(250, 'sawtooth', 0.2), 150);
            setTimeout(() => this.play(200, 'sawtooth', 0.4), 300);
        },
        invalid() {
            this.play(150, 'sawtooth', 0.08);
            setTimeout(() => this.play(150, 'sawtooth', 0.08), 100);
        }
    },

    init() {
        // Load settings if saved
        const savedSettings = localStorage.getItem('arcade_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        this.updateUI();
    },

    saveSettings() {
        localStorage.setItem('arcade_settings', JSON.stringify(this.settings));
    },

    saveScore(game, score) {
        // 1. Local High Score
        let isHigh = false;
        if (!this.state.highScores[game] || score > this.state.highScores[game]) {
            this.state.highScores[game] = score;
            localStorage.setItem('arcade_scores', JSON.stringify(this.state.highScores));
            isHigh = true;
            // CELEBRATION!
            if (window.fireConfetti) window.fireConfetti();
            if (window.showArcadeToast) window.showArcadeToast("NY REKORD! 🎉", "god");
        }

        // 2. Global Firebase Score
        try {
            if (window.liveLinkState && window.liveLinkState.db) {
                const name = this.state.playerName || 'Anonym';
                // Push to DB
                const scoreRef = window.liveLinkState.db.ref('leaderboards/' + game);
                scoreRef.push({
                    name: name,
                    score: score,
                    timestamp: Date.now()
                });
            }
        } catch (e) { console.error("Firebase save error", e); }

        // 3. Economy (Coins)
        let earned = 0;
        if (game === 'snake') earned = Math.floor(score / 5);
        else if (game === 'breakout') earned = Math.floor(score / 50);
        else if (game === 'wordle') earned = 25 + (score * 5);
        else if (game === 'pong') earned = 15;

        if (earned > 0) {
            this.state.coins += earned;
            localStorage.setItem('arcade_coins', this.state.coins);
            if (window.updateCoinDisplay) window.updateCoinDisplay();
        }

        return isHigh;
    },


    buyItem(itemId) {
        const item = this.shop.find(i => i.id === itemId);
        if (!item) return false;
        if (this.state.inventory.includes(itemId)) return true; // Already owned

        if (this.state.coins >= item.cost) {
            this.state.coins -= item.cost;
            this.state.inventory.push(itemId);

            localStorage.setItem('arcade_coins', this.state.coins);
            localStorage.setItem('arcade_inventory', JSON.stringify(this.state.inventory));

            if (window.updateCoinDisplay) window.updateCoinDisplay();
            return true;
        }
        return false;
    },

    equipTheme(themeId) {
        if (!this.state.inventory.includes(themeId)) return false;

        // EXCLUSIVE: Remove ALL old themes first
        const allThemes = this.shop.filter(i => i.type === 'theme').map(i => i.id);
        document.body.classList.remove(...allThemes);

        // Add new
        document.body.classList.add(themeId);
        localStorage.setItem('active_theme', themeId);
        return true;
    },

    updateUI() {
        // Update High Score displays
        const snakeHigh = this.state.highScores['snake'] || 0;
        const shEl = document.getElementById('snake-highscore-display');
        if (shEl) shEl.textContent = `Rekord: ${snakeHigh} `;

        const breakoutHigh = this.state.highScores['breakout'] || 0;
        const bhEl = document.getElementById('breakout-highscore-display');
        if (bhEl) bhEl.textContent = `Rekord: ${breakoutHigh} `;

        const wordleHigh = this.state.highScores['wordle'] || 0;
        const whEl = document.getElementById('wordle-highscore-display');
        if (whEl) whEl.textContent = `Rekord: ${wordleHigh} `;
    },

    // --- GLOBAL OVERLAY HELPER ---
    showSimpleGameOver(title, message, btnText, onRestart, onExit, secondaryBtnText = "Afslut") {
        console.log("DEBUG: showSimpleGameOver called", title);

        // 1. Clean existing
        const old = document.getElementById('global-game-over');
        if (old) old.remove();

        // 2. Create Modal
        const el = document.createElement('div');
        el.id = 'global-game-over';
        el.style.position = 'fixed';
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.zIndex = '999999'; // TO THE MOON 🚀
        el.style.background = 'rgba(0,0,0,0.85)';
        el.style.backdropFilter = 'blur(12px)';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.justifyContent = 'center';
        el.style.alignItems = 'center';
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.4s ease';

        // 3. Content
        el.innerHTML = `
            <div style="
                background: rgba(15, 17, 21, 0.95); 
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                padding: 30px; 
                border-radius: 24px; 
                border: 1px solid rgba(255,255,255,0.08); 
                text-align: center; 
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
                transform: scale(0.95);
                transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                width: 90%;
                max-width: 360px;
            ">
                <h2 style="margin: 0 0 8px 0; font-size: 1.6rem; color: #fff; letter-spacing: -0.5px; font-weight: 800;">${title}</h2>
                <div style="margin: 0 0 24px 0; font-size: 1rem; color: var(--text-secondary); line-height: 1.5;">${message}</div>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="gg-restart" class="btn primary" style="height: 44px; min-height: 44px; padding: 0 24px; font-size: 1rem; border-radius: 12px; font-weight: 800;">${btnText}</button>
                    <button id="gg-exit" class="btn secondary" style="height: 44px; min-height: 44px; padding: 0 24px; font-size: 1rem; border-radius: 12px; font-weight: 700;">${secondaryBtnText}</button>
                </div>
            </div>
        `;

        // 4. Mount
        document.body.appendChild(el);

        // 5. Events
        document.getElementById('gg-restart').onclick = () => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
            onRestart();
        };
        document.getElementById('gg-exit').onclick = () => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
            onExit();
        };

        // 6. Animate In
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.querySelector('div').style.transform = 'scale(1)';
        });
    },

    // --- GAMES ---

    /**
     * SNAKE 2.0 🐍
     */
    Snake: {
        canvas: null,
        ctx: null,
        grid: 20,
        count: 0,
        snake: { x: 160, y: 160, dx: 20, dy: 0, cells: [], maxCells: 4 },
        apple: { x: 320, y: 320 },
        score: 0,
        gameInterval: null,
        isPaused: false,
        waitingForStart: false, // New State
        gameActive: false,
        boundHandleKey: null,

        init() {
            this.canvas = document.getElementById('snake-canvas');
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
            }
        },

        start() {
            this.canvas = document.getElementById('snake-canvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');

            // Settings
            const mode = Arcade.settings.snakeMode || 'classic'; // classic, fast, feast
            const theme = Arcade.settings.snakeTheme || 'classic';
            this.speed = (mode === 'fast') ? 60 : 100;
            const appleCount = (mode === 'feast') ? 5 : 1;

            if (this.loopId) clearInterval(this.loopId);

            // Reset State
            this.gameActive = true;
            this.isPaused = false;
            this.score = 0;
            this.apples = []; // Reset apples array

            this.snake = {
                x: 160, y: 160, dx: this.grid, dy: 0,
                cells: [], maxCells: 4
            };

            // Spawn Apples
            for (let i = 0; i < appleCount; i++) {
                this.placeApple();
            }

            document.getElementById('snake-current-score').textContent = '0';
            document.getElementById('snake-game-over').classList.add('hidden');

            // Listeners
            // Use local bind or global handler? Original used boundHandleKey property.
            document.removeEventListener('keydown', this.boundHandleKey);
            this.boundHandleKey = this.handleKey.bind(this);
            document.addEventListener('keydown', this.boundHandleKey);

            // Initial Draw (Fix blank screen issue)
            this.draw();

            // Start Loop
            this.loopId = setInterval(() => requestAnimationFrame(() => this.loop()), this.speed);
        },

        stop() {
            this.gameActive = false;
            this.isPaused = true;
            if (this.loopId) clearInterval(this.loopId);
            document.removeEventListener('keydown', this.boundHandleKey);
        },

        handleKey(e) {
            // Prevent default browser scrolling for arrow keys
            if ([37, 38, 39, 40].indexOf(e.which) > -1) {
                e.preventDefault();
            }

            if (this.isPaused) return;

            // Left
            if (e.which === 37 && this.snake.dx === 0) {
                this.snake.dx = -this.grid;
                this.snake.dy = 0;
            }
            // Up
            else if (e.which === 38 && this.snake.dy === 0) {
                this.snake.dy = -this.grid;
                this.snake.dx = 0;
            }
            // Right
            else if (e.which === 39 && this.snake.dx === 0) {
                this.snake.dx = this.grid;
                this.snake.dy = 0;
            }
            // Down
            else if (e.which === 40 && this.snake.dy === 0) {
                this.snake.dy = this.grid;
                this.snake.dx = 0;
            }
        },

        drawStartMessage() {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("Tryk på en piletast for at starte", this.canvas.width / 2, this.canvas.height / 2 - 40);
            this.ctx.font = '40px Inter, sans-serif';
            this.ctx.fillText("🐍", this.canvas.width / 2, this.canvas.height / 2 + 10);
        },

        loop() {
            if (this.isPaused) return;

            // Move Snake
            this.snake.x += this.snake.dx;
            this.snake.y += this.snake.dy;

            // Wall Collision Logic (Always Wrap for fun unless Hardcore set? Let's Default Wrap)
            // Or use Arcade.settings.walls
            if (Arcade.settings.snakeWalls) {
                if (this.snake.x < 0 || this.snake.x >= this.canvas.width ||
                    this.snake.y < 0 || this.snake.y >= this.canvas.height) {
                    this.gameOver();
                    return;
                }
            } else {
                if (this.snake.x < 0) this.snake.x = this.canvas.width - this.grid;
                else if (this.snake.x >= this.canvas.width) this.snake.x = 0;
                if (this.snake.y < 0) this.snake.y = this.canvas.height - this.grid;
                else if (this.snake.y >= this.canvas.height) this.snake.y = 0;
            }

            // Track tail
            this.snake.cells.unshift({ x: this.snake.x, y: this.snake.y });
            if (this.snake.cells.length > this.snake.maxCells) {
                this.snake.cells.pop();
            }

            // Apple Collision (Check ALL apples)
            let ate = false;
            // Use reverse loop to allow splicing if we wanted to remove specific apples, 
            // but here we just respawn them.
            this.apples.forEach((apple, index) => {
                if (this.snake.x === apple.x && this.snake.y === apple.y) {
                    this.snake.maxCells++;
                    this.score += 10;
                    document.getElementById('snake-current-score').textContent = this.score;

                    // Respawn THIS apple
                    this.placeApple(index);

                    if (Arcade.Audio) Arcade.Audio.ping();
                    ate = true;
                }
            });

            // Draw
            this.draw();
        },

        draw() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw Apples
            this.ctx.fillStyle = this.getThemeColor('apple');
            this.apples.forEach(apple => {
                this.ctx.fillRect(apple.x, apple.y, this.grid - 1, this.grid - 1);
            });

            // Draw Snake
            this.ctx.fillStyle = this.getThemeColor('snake');
            this.snake.cells.forEach((cell, index) => {
                this.ctx.fillRect(cell.x, cell.y, this.grid - 1, this.grid - 1);
                // Self Collision
                if (index > 0 && cell.x === this.snake.x && cell.y === this.snake.y) {
                    this.gameOver();
                }
            });
        },

        getThemeColor(type) {
            const themes = {
                classic: { snake: '#4ade80', apple: '#ef4444' },
                neon: { snake: '#d946ef', apple: '#22d3ee' },
                retro: { snake: '#ffffff', apple: '#888888' }
            };
            const t = themes[Arcade.settings.snakeTheme] || themes['classic'];
            return t[type];
        },

        placeApple(indexToReplace = -1) {
            // New random pos
            const newApple = {
                x: this.getRandomInt(0, 25) * this.grid,
                y: this.getRandomInt(0, 25) * this.grid
            };

            // Check collision with snake
            if (this.snake.cells.some(c => c.x === newApple.x && c.y === newApple.y)) {
                this.placeApple(indexToReplace); // Retry
                return;
            }

            // Check collision with other apples
            if (this.apples.some(a => a.x === newApple.x && a.y === newApple.y)) {
                this.placeApple(indexToReplace); // Retry
                return;
            }

            if (indexToReplace !== -1) {
                this.apples[indexToReplace] = newApple;
            } else {
                this.apples.push(newApple);
            }
        },

        getRandomInt(min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        },

        gameOver() {
            this.stop();
            if (Arcade.Audio) Arcade.Audio.die();
            const isHigh = Arcade.saveScore('snake', this.score);
            Arcade.updateUI();
            const goScreen = document.getElementById('snake-game-over');
            // Fix: Use correct selector for new structure
            const goTitle = goScreen.querySelector('.game-over-title') || goScreen.querySelector('h2');
            goTitle.textContent = isHigh ? "NY REKORD! 🏆" : "SPILLET ER SLUT";

            const finalScore = document.getElementById('snake-final-score');
            if (finalScore) finalScore.textContent = this.score;

            goScreen.classList.remove('hidden');
            // Force visibility (override inline hide)
            goScreen.style.display = 'flex';
            goScreen.style.visibility = 'visible';
            goScreen.style.opacity = '1';
            goScreen.style.pointerEvents = 'auto';
        },

        // Called when eating apple
        eat() {
            // logic is actually inside update loop usually, let's fix the check
        }
    },

    /**
     * BREAKOUT (Murstens-bryder) 🧱
     */
    Breakout: {
        canvas: null,
        ctx: null,
        loopId: null,
        isPaused: false,
        score: 0,
        lives: 3,
        level: 1,

        // Game Objects
        paddle: { x: 200, y: 460, w: 100, h: 15, dx: 0, speed: 7 },
        balls: [], // Array of balls
        bricks: [],
        powerups: [],
        brickConfig: { r: 5, c: 8, padding: 10, offsetTop: 50, offsetLeft: 35, w: 0, h: 20 },
        rightPressed: false,
        leftPressed: false,
        ballAttached: true,
        gameActive: false, // NEW: Track active state

        start() {
            this.gameActive = true; // LOCK SETTINGS
            this.canvas = document.getElementById('breakout-canvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');

            // HiDPI Scaling (Retina Fix)
            const dpr = window.devicePixelRatio || 1;
            const rect = this.canvas.getBoundingClientRect();

            // Set REAL resolution
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;

            // Scale Context to match logical coordinates
            this.ctx.scale(dpr, dpr);

            // Store Logical Dimensions for Game Logic
            this.width = rect.width;
            this.height = rect.height;

            // Reset Game & Timers
            if (this.wideTimer) clearTimeout(this.wideTimer);
            if (this.superTimer) clearTimeout(this.superTimer);
            this.wideTimer = null;
            this.superTimer = null;

            this.score = 0;
            // Read Setting or Default to 3
            let baseLives = (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutLives)
                ? parseInt(window.Arcade.settings.breakoutLives, 10)
                : 3;

            // Modifier: Extra Life
            if (window.Arcade.state.inventory.includes('life-extra')) baseLives += 1;

            this.lives = baseLives;
            this.level = 1;
            this.isPaused = false;
            this.isTransitioning = false; // New State
            this.rightPressed = false;
            this.leftPressed = false;
            this.ballAttached = true;
            this.powerups = [];
            this.particles = [];
            this.shakeTime = 0;
            this.paddleFlashTimer = 0;
            this.hasWidePaddle = false;
            this.widePaddleTimer = 0; // Initialize Timer

            this.updateLives();
            document.getElementById('breakout-current-score').textContent = "0";
            document.getElementById('breakout-game-over').classList.add('hidden');

            this.resetPositions();
            this.initBricks();

            document.addEventListener('keydown', this.keyDownHandler.bind(this));
            document.addEventListener('keyup', this.keyUpHandler.bind(this));

            if (this.loopId) clearInterval(this.loopId);
            this.loopId = setInterval(() => this.loop(), 16);
        },

        stop() {
            this.gameActive = false; // RELEASE LOCK
            if (this.loopId) clearInterval(this.loopId);
            document.removeEventListener('keydown', this.keyDownHandler.bind(this));
            document.removeEventListener('keyup', this.keyUpHandler.bind(this));
        },

        // Helper to determine paddle width based on upgrades
        getBasePaddleWidth() {
            let width = 100; // Default

            // 1. Check Specific Setting (Most Accurate)
            if (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutPaddle) {
                width = parseInt(window.Arcade.settings.breakoutPaddle);
            }
            // 2. Fallback to Difficulty (Safety Net)
            else if (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutDifficulty) {
                const diff = window.Arcade.settings.breakoutDifficulty;
                if (diff === 'hard') width = 80;
                if (diff === 'medium') width = 100;
                if (diff === 'easy') width = 150;
            }

            // 3. Golden Paddle Upgrade
            if (window.Arcade.state.inventory.includes('paddle-golden')) width *= 1.5;

            return width;
        },

        spawnPowerUp(x, y) {
            let chance = 0.2;
            if (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutChance !== undefined) {
                chance = parseFloat(window.Arcade.settings.breakoutChance);
            }

            if (Math.random() < chance) {
                const types = ['super', 'multiball'];
                if (!this.hasWidePaddle) types.push('wide'); // Only add if not already collected this level

                const type = types[Math.floor(Math.random() * types.length)];
                this.powerups.push({ x, y, type, dy: 2 });
            }
        },

        updatePowerUps() {
            // Iterate backwards to allow splicing
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const p = this.powerups[i];
                p.y += 3; // Fall speed

                // Remove if off screen
                if (p.y > this.height) {
                    this.powerups.splice(i, 1);
                    continue;
                }

                // Collision with Paddle
                // FIX: Ensure dimensions exist (Default to 24x24 which matches radius 12)
                const pH = p.h || 24;
                const pW = p.w || 24;

                if (p.y + pH >= this.paddle.y &&
                    p.x >= this.paddle.x &&
                    p.x <= this.paddle.x + this.paddle.w) {

                    console.log("💥 POWERUP COLLISION:", p.type); // DEBUG LOG

                    // EFFECT
                    if (p.type === 'wide') {
                        // FIX: Only apply if not already wide (to prevent infinite stacking)
                        if (!this.hasWidePaddle) {
                            const baseW = this.getBasePaddleWidth(); // Get correct base size (Hard: 80, Normal: 100)
                            // User request: Don't scale "too much". Use fixed +50px or 1.3x instead of 1.5x?
                            // Let's go with 1.4x for a noticeable but controlled boost.
                            const newW = baseW * 1.4;

                            // Visual clamp
                            if (newW > this.width * 0.6) {
                                this.paddle.targetW = this.width * 0.6;
                            } else {
                                this.paddle.targetW = newW;
                            }
                            this.hasWidePaddle = true;
                            this.widePaddleTimer = 600; // 10 Seconds (60fps)
                            if (window.Arcade && window.Arcade.showToast) window.Arcade.showToast("BREDT BAT! ↔️");
                        } else {
                            // Refresh Timer if already active
                            this.widePaddleTimer = 600;
                            if (window.Arcade && window.Arcade.showToast) window.Arcade.showToast("BREDT BAT FORLÆNGET! ⏱️");
                        }

                    } else if (p.type === 'life') {
                        // NUCLEAR FIX: Inline Logic + Logging
                        console.log("❤️ APPLYING LIFE. Current:", this.lives);
                        this.lives++;

                        // Inline UI Update (Safety)
                        try {
                            const el = document.getElementById('breakout-lives');
                            if (el) el.textContent = `${this.lives} x ❤️`;
                        } catch (e) { console.error("UI Error:", e); }

                        // Feedback (Safety)
                        try {
                            if (window.Arcade && window.Arcade.showToast) window.Arcade.showToast("EKSTRA LIV! ❤️");
                            if (window.Arcade && window.Arcade.Audio && window.Arcade.Audio.ping) window.Arcade.Audio.ping();
                        } catch (e) { console.error("Feedback Error:", e); }

                    } else if (p.type === 'super') {
                        // Super Ball (Fireball)
                        this.balls.forEach(b => b.super = true);
                        if (window.Arcade && window.Arcade.showToast) window.Arcade.showToast("SUPER BOLD! 🔥");

                    } else if (p.type === 'multiball') {
                        this.spawnMultiball();
                    }

                    this.powerups.splice(i, 1);
                }
            }
        },

        spawnMultiball() {
            let mode = 'standard';
            if (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutMultiball) {
                mode = window.Arcade.settings.breakoutMultiball;
            }

            if (mode === 'kaos') {
                // KAOS: Double active balls
                const newBalls = [];
                this.balls.forEach(b => {
                    if (!b.active) return;
                    newBalls.push({
                        x: b.x, y: b.y, r: b.r,
                        dx: -b.dx + (Math.random() - 0.5), dy: -3 - Math.random(),
                        speed: b.speed, active: true, super: b.super
                    });
                });
                if (this.balls.length < 200) this.balls = this.balls.concat(newBalls);
            } else {
                // STANDARD: Add 2 balls
                const source = this.balls.find(b => b.active) || this.balls[0];
                if (source) {
                    const s = source.speed || 5;
                    const b1 = { ...source, dx: -s * 0.6, dy: -s * 0.8 };
                    const b2 = { ...source, dx: s * 0.6, dy: -s * 0.8 };
                    this.balls.push(b1, b2);
                }
            }
            if (window.Arcade && window.Arcade.showToast) window.Arcade.showToast("MULTIBOLD! 🎱");
        },

        keyDownHandler(e) {
            if (e.key === "Right" || e.key === "ArrowRight") {
                this.rightPressed = true;
                e.preventDefault();
            } else if (e.key === "Left" || e.key === "ArrowLeft") {
                this.leftPressed = true;
                e.preventDefault();
            } else if (e.key === "ArrowUp" || e.key === " " || e.key === "Up") {
                if (this.ballAttached && !this.isTransitioning) this.ballAttached = false;
                e.preventDefault();
            }
        },

        keyUpHandler(e) {
            if (e.key === "Right" || e.key === "ArrowRight") this.rightPressed = false;
            else if (e.key === "Left" || e.key === "ArrowLeft") this.leftPressed = false;
        },

        loop() {
            // 1. UPDATE PADDLE (Always Active)
            if (this.rightPressed) this.paddle.dx = this.paddle.speed;
            else if (this.leftPressed) this.paddle.dx = -this.paddle.speed;
            else this.paddle.dx = 0;

            if (this.paddle.targetW !== undefined && Math.abs(this.paddle.w - this.paddle.targetW) > 0.5) {
                const oldW = this.paddle.w;
                this.paddle.w += (this.paddle.targetW - this.paddle.w) * 0.1;
                const newW = this.paddle.w;
                this.paddle.x -= (newW - oldW) / 2;
            } else if (this.paddle.targetW !== undefined) {
                const oldW = this.paddle.w;
                this.paddle.w = this.paddle.targetW;
                const newW = this.paddle.w;
                this.paddle.x -= (newW - oldW) / 2;
            }

            // POWERUP TIMERS
            if (this.hasWidePaddle && this.widePaddleTimer > 0) {
                this.widePaddleTimer--;
                if (this.widePaddleTimer <= 0) {
                    this.hasWidePaddle = false;
                    this.paddle.targetW = this.getBasePaddleWidth(); // Revert to Difficulty Base
                    if (window.Arcade && window.Arcade.showToast) window.Arcade.showToast("Normalt Bat");
                }
            }

            this.paddle.x += this.paddle.dx;
            if (this.paddle.x < 0) this.paddle.x = 0;
            if (this.paddle.x + this.paddle.w > this.width) this.paddle.x = this.width - this.paddle.w;

            // 2. GAME LOGIC (Only if not paused)
            if (!this.isPaused) {
                // UPDATE BALLS
                if (this.ballAttached) {
                    this.balls.forEach(b => {
                        b.x = this.paddle.x + this.paddle.w / 2;
                        b.y = this.paddle.y - b.r;
                    });
                } else {
                    let activeCount = 0;
                    for (let i = this.balls.length - 1; i >= 0; i--) {
                        let b = this.balls[i];
                        if (!b.active) continue;

                        b.x += b.dx;
                        b.y += b.dy;
                        activeCount++;

                        // Paddle Collision
                        if (b.x + b.r > this.paddle.x &&
                            b.x - b.r < this.paddle.x + this.paddle.w &&
                            b.y + b.r > this.paddle.y &&
                            b.y - b.r < this.paddle.y + this.paddle.h) {

                            if (b.dy > 0) {
                                b.y = this.paddle.y - b.r;
                                let hitPoint = b.x - (this.paddle.x + this.paddle.w / 2);
                                hitPoint = hitPoint / (this.paddle.w / 2);
                                let angle = hitPoint * (Math.PI / 3);

                                b.dx = b.speed * Math.sin(angle);
                                b.dy = -b.speed * Math.cos(angle);

                                if (Arcade.Audio) Arcade.Audio.boop();
                                this.paddleFlashTimer = 15;

                                // DYNAMIC SPEED INCREASE (Per Bounce)
                                // Increase speed based on difficulty: Easy (2%), Medium (3%), Hard (4%)
                                let speedMult = 1.03; // Default Medium
                                if (window.Arcade && window.Arcade.settings) {
                                    if (window.Arcade.settings.breakoutDifficulty === 'easy') speedMult = 1.02;
                                    if (window.Arcade.settings.breakoutDifficulty === 'hard') speedMult = 1.04;
                                }

                                // Cap it at 2x initial speed or Max 15
                                let maxSpeed = (this.level < 5) ? 10 : 15;
                                if (b.speed < maxSpeed) {
                                    b.speed *= speedMult;
                                    console.log("🚀 Ball Speed Up:", b.speed);
                                }
                            }
                        }

                        // Wall Collision
                        if (b.x + b.dx > this.width - b.r || b.x + b.dx < b.r) {
                            b.dx = -b.dx;
                            if (Arcade.Audio) Arcade.Audio.boop();
                        }
                        if (b.y + b.dy < b.r) {
                            b.dy = -b.dy;
                            if (Arcade.Audio) Arcade.Audio.boop();
                        } else if (b.y + b.dy > this.height - b.r) {
                            // Shatter Ball
                            this.createParticles(b.x, b.y, "#ffffff");
                            // Remove Ball
                            this.balls.splice(i, 1);
                        }
                    }

                    // IF NO BALLS LEFT -> LOSE LIFE
                    if (this.balls.length === 0) {
                        this.lives--;
                        this.updateLives();
                        if (!this.lives) {
                            this.gameOver();
                        } else {
                            this.isPaused = true;
                            if (Arcade.Audio) Arcade.Audio.die();
                            this.canvas.style.transform = "translateX(5px)";
                            setTimeout(() => this.canvas.style.transform = "translateX(-5px)", 50);
                            setTimeout(() => this.canvas.style.transform = "translateX(5px)", 100);
                            setTimeout(() => this.canvas.style.transform = "none", 150);
                            setTimeout(() => {
                                this.resetPositions(true);
                                this.isPaused = false;
                            }, 500);
                        }
                    }
                }

                this.updatePowerUps();
                this.collisionDetection();
            }

            // 3. VISUALS (Always Update)
            this.updateParticles(); // Let confetti fall even when paused!

            // DRAW
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.drawBricks();

            if (this.ballAttached) {
                this.ctx.font = "16px Inter";
                this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                this.ctx.textAlign = "center";
                this.ctx.fillText("TRYK PIL OP FOR AT STARTE", this.canvas.width / 2, this.canvas.height / 2 + 50);
            }
            this.drawPowerUps();
            this.drawParticles();
            this.drawBalls();
            this.drawPaddle();
            this.drawLevelTransition();
        },

        createParticles(x, y, color) {
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: x,
                    y: y,
                    dx: (Math.random() - 0.5) * 6,
                    dy: (Math.random() - 0.5) * 6,
                    life: 1.0,
                    color: color
                });
            }
        },

        updateParticles() {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                let p = this.particles[i];
                p.x += p.dx;
                p.y += p.dy;
                p.life -= 0.05;
                if (p.life <= 0) this.particles.splice(i, 1);
            }
        },

        drawParticles() {
            this.particles.forEach(p => {
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            });
        },

        drawPowerUps() {
            this.powerups.forEach(p => {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
                if (p.type === 'wide') this.ctx.fillStyle = '#3b82f6'; // Blue
                else if (p.type === 'super') this.ctx.fillStyle = '#a855f7'; // Purple
                else if (p.type === 'life') this.ctx.fillStyle = '#ef4444'; // Red
                else this.ctx.fillStyle = '#eab308'; // Gold (Points)

                this.ctx.fill();
                this.ctx.fillStyle = "white";
                this.ctx.font = "14px sans-serif";
                this.ctx.textAlign = "center";
                this.ctx.textBaseline = "middle"; // FIX: Perfect Vertical Center

                let icon = "?";
                if (p.type === 'wide') icon = "↔";
                else if (p.type === 'super') icon = "⚡";
                else if (p.type === 'life') icon = "♥";
                else if (p.type === 'multiball') icon = "🎱";

                this.ctx.fillText(icon, p.x, p.y + 1); // Minor +1 for visual weight
                this.ctx.closePath();
            });
        },

        drawBalls() {
            this.balls.forEach(b => {
                this.ctx.beginPath();
                this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                let color = getComputedStyle(document.body).getPropertyValue('--accent');
                if (b.super) color = '#a855f7'; // Purple Super Ball

                this.ctx.fillStyle = color;
                // REMOVED SHADOWBLUR FOR PERFORMANCE
                this.ctx.fill();
                this.ctx.closePath();
            });
        },

        drawPaddle() {
            this.ctx.beginPath();
            this.ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, 8);
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            this.ctx.fill();
            this.ctx.closePath();

            // Paddle Flash Effect
            // Paddle Flash Effect
            if (this.paddleFlashTimer > 0) {
                // Use Accent Color for Flash
                const accent = getComputedStyle(document.body).getPropertyValue('--accent');
                this.ctx.fillStyle = accent || "#0ea5e9";
                this.ctx.globalAlpha = this.paddleFlashTimer / 15; // Fade out

                this.ctx.beginPath();
                this.ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, 8); // Match radius
                this.ctx.fill();
                this.ctx.closePath();

                this.ctx.globalAlpha = 1.0; // Reset
                this.paddleFlashTimer--;
            }
        },

        // Initialize Bricks with Animation State
        initBricks() {
            // Ensure basic config exists
            if (!this.brickConfig) {
                this.brickConfig = {
                    r: 5, c: 10, w: 0, h: 20, padding: 4, offsetLeft: 30, offsetTop: 50
                };
            }

            const { c, padding, offsetTop } = this.brickConfig;

            // DYNAMIC DIFFICULTY
            let targetRows = Math.min(4 + Math.floor(this.level / 2), 9);
            this.brickConfig.r = targetRows;
            const r = targetRows;

            const availableWidth = this.width - 40;
            const newW = Math.floor((availableWidth - ((c - 1) * padding)) / c);
            this.brickConfig.w = newW;
            this.brickConfig.h = 20;

            const totalContentWidth = (c * newW) + ((c - 1) * padding);
            this.brickConfig.offsetLeft = (this.width - totalContentWidth) / 2;
            this.brickConfig.offsetTop = 60;

            this.bricks = [];
            this.spawnTime = Date.now(); // START ANIMATION CLOCK

            // Level Pattern Logic
            let patternIndex = (this.level - 1);
            if (patternIndex >= 10) patternIndex = (this.level * 7) % 10;

            for (let i = 0; i < c; i++) {
                this.bricks[i] = [];
                const symI = (i < c / 2) ? i : (c - 1 - i);

                for (let j = 0; j < r; j++) {
                    let active = true;
                    // Simplified Pattern Switch
                    switch (patternIndex) {
                        case 1: if ((symI + j) % 2 !== 0) active = false; break;
                        case 2: if (symI % 2 !== 0) active = false; break;
                        case 3: if (j % 2 !== 0) active = false; break;
                        case 4: { const dist = Math.abs(i - (c - 1) / 2.0); if (dist > (j + 0.5)) active = false; } break;
                        case 5: { const dist = Math.abs(i - (c - 1) / 2.0); if (dist < (r - 1 - j)) active = false; } break;
                        case 6: if (i > 0 && i < c - 1 && j > 0 && j < r - 1) active = false; break;
                        case 7: if ((symI + j) % 3 === 0) active = false; break;
                        case 8: { const cx = (c - 1) / 2; const cy = (r - 1) / 2; if (Math.abs(i - cx) + Math.abs(j - cy) > 3) active = false; } break;
                        case 9: if ((symI * 7 + j * 13 + this.level * 17) % 5 === 0) active = false; else if (Math.random() > 0.7) active = false; break;
                    }

                    if (active) {
                        let health = 1;
                        let isHard = (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutDifficulty === 'hard');

                        // Hard Mode: Chance for tough bricks even on Level 1
                        if (isHard && Math.random() < 0.25) health = 2;

                        if (this.level >= 2 && Math.random() < 0.2) health = 2;
                        if (this.level >= 4 && Math.random() < 0.2) health = 3;

                        // DETERMINE POWERUP
                        let pType = null;

                        // Use Settings if available (Key is 'breakoutChance' in app.js map)
                        let chance = 0.12;

                        // Check 'breakoutChance' (Correct Key) or legacy 'powerupChance'
                        const s = window.Arcade?.settings;
                        if (s) {
                            if (typeof s.breakoutChance !== 'undefined') chance = Number(s.breakoutChance);
                            else if (typeof s.powerupChance !== 'undefined') chance = Number(s.powerupChance);
                        }

                        // Fallback: Check LocalStorage
                        const stored = localStorage.getItem('breakout_powerup_chance');
                        if (stored) chance = parseFloat(stored);

                        // Normalize Percentage (If > 1, assume 0-100 scale)
                        if (chance > 1) chance = chance / 100;

                        // Debug Log (Once per level generation)
                        if (i === 0 && j === 0) console.log("Powerup Chance:", chance);

                        if (Math.random() < chance) {
                            const r = Math.random();
                            // TUNED RARITY (User Feedback v100)
                            // Goal: Multiball/Super common, Wide occasional, Life RARE
                            if (r < 0.45) pType = 'multiball'; // 45%
                            else if (r < 0.80) pType = 'super'; // 35%
                            else if (r < 0.95) pType = 'wide';  // 15%
                            else pType = 'life';               // 5% (Back to Rare)
                        }

                        let delay = (j * 50) + (i * 10);

                        this.bricks[i][j] = {
                            x: 0, y: 0,
                            status: health, maxHealth: health,
                            delay: delay,
                            powerupType: pType // STORE IT
                        };
                    } else {
                        this.bricks[i][j] = { x: 0, y: 0, status: 0, maxHealth: 0, powerupType: null };
                    }
                }
            }
        },

        drawBricks() {
            const { r, c, padding, offsetLeft, offsetTop, w, h } = this.brickConfig;

            // ANIMATION TIMER
            const now = Date.now();
            const timeSinceSpawn = now - (this.spawnTime || 0);

            // VIBRANT PALETTE
            const colors = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

            for (let i = 0; i < c; i++) {
                for (let j = 0; j < r; j++) {
                    const b = this.bricks[i][j];
                    if (b.status > 0) {
                        // TWEEN CALCULATION
                        let animProgress = (timeSinceSpawn - b.delay) / 400; // 400ms duration
                        if (animProgress < 0) animProgress = 0;
                        if (animProgress > 1) animProgress = 1;

                        // Easing (EaseOutBack for pop effect)
                        // const scale = animProgress; 
                        // Let's use simple smooth ease out
                        const scale = 1 - Math.pow(1 - animProgress, 3);

                        if (scale <= 0) continue; // Not visible yet

                        const brickX = (i * (w + padding)) + offsetLeft;
                        const brickY = (j * (h + padding)) + offsetTop;

                        b.x = brickX;
                        b.y = brickY;

                        // Center scaling
                        const drawW = w * scale;
                        const drawH = h * scale;
                        const drawX = brickX + (w - drawW) / 2;
                        const drawY = brickY + (h - drawH) / 2;

                        const baseColor = colors[j % colors.length] || "#fff";

                        this.ctx.globalAlpha = animProgress; // Fade in

                        this.ctx.globalAlpha = animProgress; // Fade in

                        this.ctx.beginPath();
                        const r = 4; // Corner Radius
                        this.ctx.roundRect(drawX, drawY, drawW, drawH, r);

                        // Base Color
                        this.ctx.fillStyle = baseColor;
                        this.ctx.shadowColor = "rgba(0,0,0,0.1)";
                        this.ctx.shadowBlur = 4;
                        this.ctx.shadowOffsetY = 2;
                        this.ctx.fill();

                        this.ctx.shadowColor = "transparent"; // Reset Shadow

                        // "Glassy" Top Highlight (Gradient) for ALL bricks
                        const grad = this.ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
                        grad.addColorStop(0, "rgba(255,255,255,0.3)");
                        grad.addColorStop(0.5, "rgba(255,255,255,0.0)");
                        grad.addColorStop(1, "rgba(0,0,0,0.1)"); // Bottom shadow
                        this.ctx.fillStyle = grad;
                        this.ctx.fill();

                        // --- REINFORCED BRICK REDESIGN (Only for Health > 1) ---
                        if (b.maxHealth > 1) {
                            // "Armored / Gem" Look - No more bolts!

                            // 1. Thick "Metal" Border
                            this.ctx.lineWidth = 3;
                            this.ctx.strokeStyle = "rgba(0,0,0,0.3)";
                            this.ctx.stroke();

                            // 2. Inner Bevel / Crystal Depth
                            this.ctx.save();
                            this.ctx.clip(); // Clip to the brick shape

                            // Inner Shadow (Simulated)
                            this.ctx.fillStyle = "rgba(0,0,0,0.4)";
                            this.ctx.globalCompositeOperation = "overlay"; // Blend it nicely
                            this.ctx.fillRect(drawX, drawY + drawH * 0.7, drawW, drawH * 0.3); // Dark bottom
                            this.ctx.restore();

                            // 3. Health Indicator (Subtle Dots based on health)
                            // Revised: CRACKS/RIFTS if damaged
                            if (b.maxHealth > 1 && b.status < b.maxHealth) {
                                this.ctx.save();
                                this.ctx.beginPath();
                                this.ctx.strokeStyle = "rgba(0,0,0,0.5)";
                                this.ctx.lineWidth = 2;

                                // Deterministic Random "Seed" based on position
                                const seed = (i * 997 + j * 761) % 1000;

                                // Simple Zig-Zag Crack
                                this.ctx.moveTo(drawX + drawW * 0.2, drawY + drawH * 0.2);
                                if (seed % 2 === 0) {
                                    this.ctx.lineTo(drawX + drawW * 0.5, drawY + drawH * 0.6);
                                    this.ctx.lineTo(drawX + drawW * 0.8, drawY + drawH * 0.3);
                                } else {
                                    this.ctx.lineTo(drawX + drawW * 0.4, drawY + drawH * 0.8);
                                    this.ctx.lineTo(drawX + drawW * 0.7, drawY + drawH * 0.5);
                                }

                                // More cracks if critically low (1 life left)
                                if (b.status === 1 && b.maxHealth >= 3) {
                                    this.ctx.moveTo(drawX + drawW * 0.8, drawY + drawH * 0.8);
                                    this.ctx.lineTo(drawX + drawW * 0.5, drawY + drawH * 0.5);
                                }

                                this.ctx.stroke();
                                this.ctx.restore();
                            }

                            this.ctx.globalAlpha = 1.0; // Reset
                        }

                        // POWERUP INDICATOR (Large Generic Star) - VALID FOR ALL BRICKS
                        if (b.powerupType) {
                            this.ctx.font = "bold 16px Inter, sans-serif";
                            this.ctx.textAlign = "center";
                            this.ctx.textBaseline = "middle";

                            // White Glow
                            this.ctx.shadowColor = "white";
                            this.ctx.shadowBlur = 10;
                            this.ctx.fillStyle = "#fff";

                            this.ctx.fillText("★", drawX + drawW / 2, drawY + drawH / 2 + 1);

                            this.ctx.shadowBlur = 0; // Reset
                        }
                    }
                }
            }
        },

        // Helper for darkening hex colors
        adjustColor(color, amount) {
            return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
        },

        collisionDetection() {
            // Guard: Don't check collisions while waiting for next level
            if (this.isTransitioning) return;

            const { r, c, w, h } = this.brickConfig;
            let activeBricks = false;

            for (let i = 0; i < c; i++) {
                for (let j = 0; j < r; j++) {
                    const b = this.bricks[i][j];
                    if (b.status > 0) {
                        activeBricks = true;

                        // Check against ALL balls
                        for (let k = 0; k < this.balls.length; k++) {
                            const ball = this.balls[k];
                            if (!ball.active) continue;

                            if (ball.x + ball.r > b.x &&
                                ball.x - ball.r < b.x + w &&
                                ball.y + ball.r > b.y &&
                                ball.y - ball.r < b.y + h) {

                                if (!ball.super) {
                                    // Normal Bounce
                                    const overlapX = (w / 2 + ball.r) - Math.abs(ball.x - (b.x + w / 2));
                                    const overlapY = (h / 2 + ball.r) - Math.abs(ball.y - (b.y + h / 2));
                                    if (overlapX < overlapY) ball.dx = -ball.dx;
                                    else ball.dy = -ball.dy;

                                    b.status--; // Damage
                                } else {
                                    b.status = 0; // Super Ball Destroys Instantly
                                }

                                if (b.status <= 0) {
                                    // SCORING (Difficulty Multiplier)
                                    let points = 10;
                                    let diff = 'normal';
                                    if (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutDifficulty) {
                                        diff = window.Arcade.settings.breakoutDifficulty;
                                    }

                                    if (diff === 'easy') points = 10;       // 1x
                                    else if (diff === 'medium') points = 15; // 1.5x
                                    else if (diff === 'hard') points = 25;   // 2.5x (High Reward)

                                    this.score += points;

                                    // Juice
                                    const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fde047'];
                                    const color = colors[j] || "#fff";
                                    this.createParticles(b.x + w / 2, b.y + h / 2, color);

                                    // SPAWN POWERUP (Standardized)
                                    if (b.powerupType) {
                                        this.powerups.push({
                                            x: b.x + w / 2, y: b.y + h / 2,
                                            dy: 3, type: b.powerupType,
                                            w: 24, h: 24 // FIX: Add dimensions for collision
                                        });
                                        // Voice/Sound for legendary powerups?
                                        if (b.powerupType === 'multiball' && Arcade.Audio) Arcade.Audio.boop();
                                    }
                                    document.getElementById('breakout-current-score').textContent = this.score;
                                    if (Arcade.Audio) Arcade.Audio.ping();
                                } else {
                                    // Just Hit
                                    if (Arcade.Audio) Arcade.Audio.boop();
                                }

                                if (!ball.super) break; // Break loop if stuck/bounced
                            }
                        }
                    }
                }
            }

            // Check Win Condition
            // (Re-scan simplified: if we found at least one active brick above, we are good. 
            // BUT wait, we just set a brick to status 0 inside the loop. 
            // Ideally we check active count properly. 
            // Simplest: Just count again or rely on score?)
            // Let's do a quick pass or count down.

            let bricksLeft = 0;
            for (let i = 0; i < c; i++) {
                for (let j = 0; j < r; j++) {
                    if (this.bricks[i][j].status > 0) bricksLeft++;
                }
            }

            if (bricksLeft === 0) {
                this.levelUp();
            }
        },

        resetPositions(keepX = false) {
            this.ballAttached = true;
            let startW = this.getBasePaddleWidth();
            this.paddle.w = startW;
            this.paddle.targetW = startW;

            if (!keepX) {
                this.paddle.x = (this.width - this.paddle.w) / 2;
            } else if (this.paddle.x + this.paddle.w > this.width) {
                this.paddle.x = this.width - this.paddle.w;
            }
            this.paddle.dx = 0;

            // FIX BALL SPEED
            // Base speed depends on Difficulty
            let baseSpeed = 4;
            let cap = 9;

            if (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutDifficulty) {
                const diff = window.Arcade.settings.breakoutDifficulty;
                if (diff === 'medium') baseSpeed = 4.5;
                if (diff === 'hard') {
                    baseSpeed = 6; // Starts 50% faster!
                    cap = 12; // Allow higher max speed in Hard Mode
                }
            }

            // Calculate speed: FIXED Base (Dynamic increase during gameplay)
            // Removes level scaling to prevent impossible starts
            let speed = Math.min(baseSpeed, cap);

            // Normalize Launch Vector (45 degrees)
            // 45 deg = 0.707
            let launchDx = speed * 0.707;
            let launchDy = -speed * 0.707;

            this.balls = [{
                x: this.paddle.x + this.paddle.w / 2, y: this.paddle.y - 8, r: 8,
                dx: launchDx * (Math.random() > 0.5 ? 1 : -1),
                dy: launchDy,
                speed: speed,
                active: true
            }];
        },

        spawnConfetti() {
            const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fde047'];
            for (let i = 0; i < 50; i++) {
                this.particles.push({
                    x: this.width / 2, y: this.height / 2,
                    dx: (Math.random() - 0.5) * 15, dy: (Math.random() - 0.5) * 15,
                    life: 2.0, color: colors[Math.floor(Math.random() * colors.length)]
                });
            }
        },

        drawLevelTransition() {
            if (!this.isTransitioning) return;

            const now = Date.now();
            const elapsed = now - (this.transitionStartTime || now);

            // CINEMATIC ANIMATION: Blur + Slide + Fade
            // Duration: 2000ms total
            // 0 -> 800ms: Focus In (Blur 20->0, Offset 30->0, Alpha 0->1)
            // 800 -> 1500ms: Hold
            // 1500 -> 1800ms: Fade Out

            let alpha = 0;
            let blur = 0;
            let yOffset = 0;
            let scale = 1;

            if (elapsed < 800) {
                // Focus In (Quart Ease Out)
                const t = elapsed / 800;
                const p = 1 - Math.pow(1 - t, 4);

                alpha = p;
                blur = 20 * (1 - p);
                yOffset = 30 * (1 - p);
                scale = 1; // NO ZOOM (Fix)
            } else if (elapsed > 1500) {
                // Fade Out
                let outProgress = (elapsed - 1500) / 300;
                if (outProgress > 1) outProgress = 1;
                alpha = 1 - outProgress;
            } else {
                // Hold
                alpha = 1;
            }

            if (alpha <= 0) return;

            this.ctx.save();
            this.ctx.translate(this.width / 2, this.height / 3 + yOffset);
            // this.ctx.scale(scale, scale); // REMOVED
            this.ctx.globalAlpha = alpha;

            // BLUR REMOVED

            // APPLE STYLE: Thin, Elegant, Spaced
            this.ctx.font = "800 72px Inter, sans-serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";

            const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#22d3ee';

            // Text Gradient
            const gradient = this.ctx.createLinearGradient(-150, 0, 150, 0);
            gradient.addColorStop(0, accent);
            gradient.addColorStop(1, this.adjustColor(accent, 40));
            this.ctx.fillStyle = gradient;

            // NO GLOW - Just very subtle depth
            this.ctx.shadowColor = "rgba(0,0,0,0.15)";
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetY = 4;

            this.ctx.fillText("LEVEL " + this.level, 0, 0);

            this.ctx.restore();
        },

        levelUp() {
            this.level++;
            Arcade.Audio.win();
            this.powerups = [];
            this.hasWidePaddle = false;
            this.widePaddleTimer = 0; // Explicitly kill timer

            // INSTANT LEVEL UP (No Text)
            this.isTransitioning = false;
            this.ballAttached = true;
            this.spawnConfetti();
            this.resetPositions(true);

            this.initBricks();
        },

        updateLives() {
            const el = document.getElementById('breakout-lives');
            if (!el) return;
            // User Preference: Revert to "Number x Heart"
            el.textContent = `${this.lives} x ❤️`;
        },

        gameOver() {
            this.stop();
            // Audio Feedback for Death
            if (Arcade.Audio && Arcade.Audio.die) Arcade.Audio.die(); // or lose() if available, die() is confirmed

            const isHigh = Arcade.saveScore('breakout', this.score);
            Arcade.updateUI();

            // DELAY GAME OVER SCREEN (1 Second Pause for "Drama")
            setTimeout(() => {
                const goScreen = document.getElementById('breakout-game-over');
                const goTitle = goScreen.querySelector('h2');
                goTitle.textContent = isHigh ? "NY REKORD! 🏆" : "GAME OVER";

                // Update Score Display
                const scoreDisplay = document.getElementById('bo-final-score');
                if (scoreDisplay) scoreDisplay.textContent = this.score;

                goScreen.classList.remove('hidden');
                // Allow CSS transition to handle fade-in if set
                void goScreen.offsetWidth; // Force reflow
                goScreen.classList.add('active'); // Use active class for opacity transition
            }, 600);
        }
    },

    /**
     * WORDLE 🔤
     */
    Wordle: {
        currentRow: 0,
        currentCol: 0,
        guess: [], // Available letters in current row
        solution: "",
        gridState: [], // 6 rows of 5 tiles
        gameActive: false,
        isAnimating: false,
        streak: 0,

        // DUEL STATE
        duelMode: false,
        onProgress: null, // Callback for UI updates
        onFinish: null,   // Callback for Win/Loss logging

        start(forcedWord = null, duelMode = false) {
            this.gameActive = true;
            this.duelMode = duelMode;
            this.currentRow = 0;
            this.currentCol = 0;
            this.guess = [];
            this.isAnimating = false;
            this.gridState = Array(6).fill().map(() => Array(5).fill('')); // Empty Grid

            // Pick Word
            if (forcedWord) {
                this.solution = forcedWord.toUpperCase();
                console.log("Duel Word Set:", this.solution);
            } else {
                const list = window.WordleData.solutions;
                this.solution = list[Math.floor(Math.random() * list.length)].toUpperCase();
                console.log("Solution:", this.solution); // Debug
            }

            // UI
            this.renderBoard();
            this.renderKeyboard();
            // Reset Duel UI if present
            const duelHeader = document.getElementById('wordle-duel-header');
            if (duelHeader) duelHeader.classList.add('hidden');

            document.getElementById('wordle-game-over').classList.add('hidden');

            // Listeners
            if (this.boundHandleKey) {
                document.removeEventListener('keydown', this.boundHandleKey);
            }
            this.boundHandleKey = this.handleKey.bind(this);
            document.addEventListener('keydown', this.boundHandleKey);
        },

        stop() {
            this.gameActive = false;
            this.duelMode = false;
            if (this.boundHandleKey) {
                document.removeEventListener('keydown', this.boundHandleKey);
                this.boundHandleKey = null;
            }
        },

        onGuess: null, // Callback for FULL word submission

        handleKey(e) {
            if (!this.gameActive || this.isAnimating) return;
            const key = e.key ? e.key.toUpperCase() : e.toUpperCase();

            // Prevent shortcuts
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            if (key === 'ENTER') this.submitGuess();
            else if (key === 'BACKSPACE') this.deleteLetter();
            else if (/^[A-Z]$/.test(key)) this.addLetter(key);
        },

        // New Helper for Remote Play
        playRemoteGuess(word) {
            if (!this.gameActive) return;
            // Clear current row first to avoid conflicts
            this.guess = [];
            for (let i = 0; i < 5; i++) {
                this.updateTile(this.currentRow, i, '');
            }

            // Type the word safely with stagger
            const letters = word.split('');
            let delay = 0;

            letters.forEach((l, index) => {
                setTimeout(() => {
                    this.addLetter(l, true); // true = silent
                }, delay);
                delay += 250; // 250ms stagger (Slower as requested)
            });

            // Force Submit after typing
            setTimeout(() => {
                this.submitGuess(true); // true = isRemote
            }, delay + 50);
        },

        addLetter(letter, silent = false) {
            if (this.guess.length < 5) {
                this.guess.push(letter);
                this.updateTile(this.currentRow, this.guess.length - 1, letter);
                if (!silent && Arcade.Audio) Arcade.Audio.type();
            }
        },

        deleteLetter() {
            if (this.guess.length > 0) {
                this.guess.pop();
                this.updateTile(this.currentRow, this.guess.length, '');
                if (Arcade.Audio) Arcade.Audio.type();
            }
        },

        submitGuess(isRemote = false) {
            if (this.guess.length !== 5) {
                if (!isRemote) { // Only shake for local errors
                    this.shakeRow();
                    if (Arcade.Audio) Arcade.Audio.invalid();
                }
                return;
            }

            const word = this.guess.join('');

            // Dictionary Check (skip if remote, assume valid?)
            // actually keep it for safety, but maybe remote is always valid
            const validList = window.WordleDictionary || window.WordleData.valid;
            const solList = window.WordleData.solutions;

            if (!validList.includes(word) && !solList.includes(word)) {
                this.shakeRow();
                if (Arcade.Audio) Arcade.Audio.invalid();
                return;
            }

            // Valid Guess - Broadcast if Local
            if (!isRemote && this.onGuess) {
                this.onGuess(word);
            }

            // Check
            this.revealRow();
        },

        shakeRow() {
            const row = document.querySelectorAll('#wordle-board .wordle-row')[this.currentRow];
            row.classList.add('shake');
            setTimeout(() => row.classList.remove('shake'), 500);
        },

        revealRow() {
            this.isAnimating = true;
            const row = this.currentRow;
            const guessWord = this.guess.join('');
            const solutionChars = this.solution.split('');
            const guessChars = guessWord.split('');

            // States: 0=absent, 1=present, 2=correct
            const states = Array(5).fill('absent');

            // 1. Check Correct (Green)
            guessChars.forEach((char, i) => {
                if (char === solutionChars[i]) {
                    states[i] = 'correct';
                    solutionChars[i] = null; // Consume
                    guessChars[i] = null;
                }
            });

            // 2. Check Present (Yellow)
            guessChars.forEach((char, i) => {
                if (char !== null && solutionChars.includes(char)) {
                    states[i] = 'present';
                    // Remove one instance
                    solutionChars[solutionChars.indexOf(char)] = null;
                }
            });

            // Animate & Update
            const tiles = document.querySelectorAll('#wordle-board .wordle-row')[row].children;

            states.forEach((state, i) => {
                setTimeout(() => {
                    tiles[i].classList.add('flip');
                    tiles[i].setAttribute('data-state', state);
                    // Update Keyboard
                    const key = document.querySelector(`.key[data-key="${this.guess[i]}"]`);
                    if (key) {
                        const priorities = { 'correct': 3, 'present': 2, 'absent': 1 };
                        const current = key.getAttribute('data-state') || '';
                        // Only upgrade color
                        if ((priorities[state] || 0) > (priorities[current] || 0)) {
                            key.setAttribute('data-state', state);
                        }
                    }
                    if (Arcade.Audio) Arcade.Audio.flip();
                }, i * 250);
            });

            setTimeout(() => {
                // REPORT PROGRESS (DUEL MODE)
                if (this.duelMode && this.onProgress) {
                    this.onProgress(this.currentRow + 1);
                }

                // Win/Loss Check
                // Win/Loss Check
                if (guessWord === this.solution) {

                    // Win Logic
                    if (!this.duelMode) {
                        this.streak++;
                        const streakEl = document.getElementById('wordle-current-streak');
                        if (streakEl) streakEl.textContent = this.streak;
                        Arcade.saveScore('wordle', this.streak);
                    }

                    // Trigger External Hook (Confetti, etc.)
                    if (this.onFinish) this.onFinish(true, this.currentRow + 1);

                    if (Arcade.Audio) Arcade.Audio.wordleWin();
                    this.gameOver(true);

                } else if (this.currentRow === 5) {
                    // Loss Logic
                    if (!this.duelMode) {
                        this.streak = 0;
                        const streakEl = document.getElementById('wordle-current-streak');
                        if (streakEl) streakEl.textContent = this.streak;
                    } else {
                        // Duel Loss
                        if (this.onFinish) this.onFinish(false, 6);
                    }

                    if (Arcade.Audio) Arcade.Audio.wordleLose();
                    this.gameOver(false);
                } else {
                    this.currentRow++;
                    this.guess = [];
                }
                this.isAnimating = false;
            }, 5 * 250 + 200);
        },

        renderBoard() {
            const board = document.getElementById('wordle-board');
            board.innerHTML = '';
            for (let i = 0; i < 6; i++) {
                const row = document.createElement('div');
                row.className = 'wordle-row';
                for (let j = 0; j < 5; j++) {
                    const tile = document.createElement('div');
                    tile.className = 'tile';
                    row.appendChild(tile);
                }
                board.appendChild(row);
            }
        },

        updateTile(row, col, char) {
            const board = document.getElementById('wordle-board');
            const tiles = board.children[row].children;
            const tile = tiles[col];
            tile.textContent = char;
            tile.setAttribute('data-state', char ? 'active' : '');
        },

        renderKeyboard() {
            const kb = document.getElementById('wordle-keyboard');
            kb.innerHTML = '';
            const rows = [
                "QWERTYUIOP",
                "ASDFGHJKL",
                "ZXCVBNM"
            ];

            rows.forEach((rStr, i) => {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'keyboard-row';

                if (i === 2) {
                    // Enter
                    const enter = document.createElement('div');
                    enter.className = 'key big';
                    enter.textContent = 'ENTER';
                    enter.onclick = () => this.handleKey({ key: 'Enter' });
                    rowDiv.appendChild(enter);
                }

                rStr.split('').forEach(char => {
                    const key = document.createElement('div');
                    key.className = 'key';
                    key.textContent = char;
                    key.setAttribute('data-key', char);
                    key.onclick = () => this.handleKey({ key: char });
                    rowDiv.appendChild(key);
                });

                if (i === 2) {
                    // Backspace
                    const back = document.createElement('div');
                    back.className = 'key big';
                    back.textContent = '⌫';
                    back.onclick = () => this.handleKey({ key: 'Backspace' });
                    rowDiv.appendChild(back);
                }
                kb.appendChild(rowDiv);
            });
        },

        gameOver(won) {
            this.gameActive = false;

            const title = won ? "GODT GÅET!" : "ÆV!";
            const msg = won ? `Ordet var: <strong style="color:var(--accent)">${this.solution}</strong>` : `Ordet var: <strong>${this.solution}</strong>`;

            if (Arcade.showSimpleGameOver) {
                Arcade.showSimpleGameOver(
                    title,
                    msg,
                    "Nyt Ord",
                    () => window.restartWordle(),
                    () => window.closeWordle()
                );
            }

            // Direct Trigger for Juice
            if (won && window.fireConfetti) window.fireConfetti();
        }
    },

    // --- PONG ---
    Pong: {
        canvas: null,
        ctx: null,
        animationId: null,
        gameActive: false,
        waitingToServe: true, // NEW
        width: 600,
        height: 400,
        lastTime: 0, // For delta time

        // State
        player: { y: 150, h: 100, targetH: 100, w: 12, score: 0, dy: 0, speed: 6 }, // Added targetH
        cpu: { y: 150, h: 80, targetH: 80, w: 12, score: 0, speed: 2.85 }, // Added targetH
        ball: { x: 300, y: 200, r: 8, dx: 4, dy: 4, speed: 3.5 }, // Slower ball start
        winScore: 5, // Default win score

        init() {
            this.canvas = document.getElementById('pong-canvas');
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;

            // Input
            window.addEventListener('keydown', (e) => this.handleKey(e, true));
            window.addEventListener('keyup', (e) => this.handleKey(e, false));
        },

        start() {
            this.init();
            this.resetGame();
            this.applySettings(); // NEW
            this.gameActive = true;
            this.lastTime = 0;
            this.loop(0);
        },

        applySettings() {
            if (!Arcade.settings) return;
            const s = Arcade.settings;

            // Difficulty (CPU Speed)
            if (s.pongDifficulty === 'easy') this.cpu.speed = 2.0;
            else if (s.pongDifficulty === 'normal') this.cpu.speed = 2.85;
            else if (s.pongDifficulty === 'hard') this.cpu.speed = 4.5;
            else if (s.pongDifficulty === 'impossible') this.cpu.speed = 6.5;

            // Score
            this.winScore = s.pongWinScore || 5;

            // Modifier: Golden Paddle (Pong)
            if (window.Arcade.state.inventory.includes('paddle-golden')) {
                this.player.h = 150; // 50% bigger (default 100)
            } else {
                this.player.h = 100;
            }

            // Paddles
            this.player.targetH = s.pongPlayerPaddle || 100; // Use targetH for anim
            this.cpu.targetH = s.pongCpuPaddle || 80;
            // Snapping on start to avoid weirdness if not animating live
            if (!this.gameActive) {
                this.player.h = this.player.targetH;
                this.cpu.h = this.cpu.targetH;
            }
        },

        stop() {
            this.gameActive = false;
            cancelAnimationFrame(this.animationId);
        },

        resetGame() {
            this.player.score = 0;
            this.cpu.score = 0;
            this.waitingToServe = true; // Wait at start
            this.resetBall();
            this.updateScoreUI();
            this.hideGameOver();
        },

        resetBall() {
            this.ball.x = this.width / 2;
            this.ball.y = this.height / 2;
            this.ball.speed = 5;
            this.ball.dx = 0; // Stop ball
            this.ball.dy = 0;
            this.waitingToServe = true; // Wait for space
        },

        serveBall() {
            this.waitingToServe = false;
            this.ball.speed = 3.5; // Slow start
            // Always serve towards CPU (Right) so player isn't surprised
            this.ball.dx = this.ball.speed;
            this.ball.dy = (Math.random() * 2 - 1) * this.ball.speed;
        },

        handleKey(e, isDown) {
            if (!this.gameActive) return;
            if (e.key === 'ArrowRight' && isDown && this.waitingToServe) {
                this.serveBall();
            }
            if (e.key === 'ArrowUp') this.player.dy = isDown ? -this.player.speed : 0;
            if (e.key === 'ArrowDown') this.player.dy = isDown ? this.player.speed : 0;
        },

        update() {
            // Player Move
            this.player.y += this.player.dy;
            if (this.player.y < 0) this.player.y = 0;
            if (this.player.y + this.player.h > this.height) this.player.y = this.height - this.player.h;

            // AI Move
            const center = this.cpu.y + this.cpu.h / 2;
            if (center < this.ball.y - 10) this.cpu.y += this.cpu.speed;
            else if (center > this.ball.y + 10) this.cpu.y -= this.cpu.speed;

            if (this.cpu.y < 0) this.cpu.y = 0;
            if (this.cpu.y + this.cpu.h > this.height) this.cpu.y = this.height - this.cpu.h;

            // Ball Move
            if (!this.waitingToServe) {
                this.ball.x += this.ball.dx;
                this.ball.y += this.ball.dy;
            }

            // Paddle Resize Animation (Lerp) - Grows from center
            if (this.player.targetH !== undefined && Math.abs(this.player.h - this.player.targetH) > 0.5) {
                const oldH = this.player.h;
                this.player.h += (this.player.targetH - this.player.h) * 0.1;
                this.player.y -= (this.player.h - oldH) / 2; // Center fix
            }
            if (this.cpu.targetH !== undefined && Math.abs(this.cpu.h - this.cpu.targetH) > 0.5) {
                const oldH = this.cpu.h;
                this.cpu.h += (this.cpu.targetH - this.cpu.h) * 0.1;
                this.cpu.y -= (this.cpu.h - oldH) / 2; // Center fix
            }

            // Wall Collision (Top/Bottom)
            if (this.ball.y - this.ball.r < 0) {
                this.ball.y = this.ball.r; // Clamp to top
                this.ball.dy *= -1;
                if (Arcade.Audio) Arcade.Audio.boop();
            } else if (this.ball.y + this.ball.r > this.height) {
                this.ball.y = this.height - this.ball.r; // Clamp to bottom
                this.ball.dy *= -1;
                if (Arcade.Audio) Arcade.Audio.boop();
            }

            // Paddle Collision
            // Player
            if (this.ball.dx < 0 &&
                this.ball.x - this.ball.r < 20 + this.player.w &&
                this.ball.y > this.player.y &&
                this.ball.y < this.player.y + this.player.h) {

                this.hitPaddle(this.player.y, this.player.h);
            }

            // CPU
            if (this.ball.dx > 0 &&
                this.ball.x + this.ball.r > this.width - 20 - this.cpu.w &&
                this.ball.y > this.cpu.y &&
                this.ball.y < this.cpu.y + this.cpu.h) {

                this.hitPaddle(this.cpu.y, this.cpu.h);
            }

            // Score
            if (this.ball.x < 0) {
                this.cpu.score++;
                this.checkWin();
                this.resetBall();
                if (Arcade.Audio) Arcade.Audio.invalid(); // Bad sound
            } else if (this.ball.x > this.width) {
                this.player.score++;
                this.checkWin();
                this.resetBall();
                if (Arcade.Audio) Arcade.Audio.confirm(); // Point sound
            }
        },

        hitPaddle(y, h) {
            // Angle based on where we hit the paddle
            let relativeIntersectY = (y + (h / 2)) - this.ball.y;
            let normalized = (relativeIntersectY / (h / 2));
            let bounceAngle = normalized * Math.PI / 4; // Max 45 deg

            this.ball.speed += 0.5; // Speed up
            let direction = (this.ball.x < this.width / 2) ? 1 : -1;

            this.ball.dx = direction * this.ball.speed * Math.cos(bounceAngle);
            this.ball.dy = this.ball.speed * -Math.sin(bounceAngle);

            if (Arcade.Audio) Arcade.Audio.type(); // Click sound
        },

        checkWin() {
            this.updateScoreUI();
            if (this.player.score >= 5 || this.cpu.score >= 5) {
                this.gameOver(this.player.score >= 5);
            }
        },

        updateScoreUI() {
            document.getElementById('pong-score-player').textContent = this.player.score;
            document.getElementById('pong-score-cpu').textContent = this.cpu.score;
            // Also update High Score on menu?
            // "Score" on menu usually means high score. For Pong, maybe "Wins"?
            // Let's count Total Wins as the "High Score" metric for now.
            if (this.gameActive) { // Only during game
                const current = document.getElementById('pong-highscore-display');
                // For now, don't update menu live, just the HUD
            }
        },

        draw() {
            // Access theme color
            const root = document.body; // Fix: Theme class is on body, not html
            const accent = getComputedStyle(root).getPropertyValue('--accent').trim();
            const accentRGB = this.hexToRgb(accent);
            // We use standard colors for "Apple Style"

            this.ctx.clearRect(0, 0, this.width, this.height);

            // Center Line
            this.ctx.beginPath();
            this.ctx.setLineDash([10, 15]);
            this.ctx.moveTo(this.width / 2, 20);
            this.ctx.lineTo(this.width / 2, this.height - 20);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.setLineDash([]);

            // Shadows logic
            this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowOffsetY = 5;

            // Player (Left) - Accent Color
            this.ctx.fillStyle = accent;
            this.ctx.beginPath();
            this.ctx.roundRect(20, this.player.y, this.player.w, this.player.h, 6);
            this.ctx.fill();

            // CPU (Right) - White
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.roundRect(this.width - 20 - this.cpu.w, this.cpu.y, this.cpu.w, this.cpu.h, 6);
            this.ctx.fill();

            // Ball - Theme Color (No Glow)
            this.ctx.fillStyle = accent;
            this.ctx.shadowBlur = 0; // Ensure no glow
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
            this.ctx.fill();

            // Instructions
            if (this.waitingToServe) {
                // Fix: Clear ALL shadows before drawing text
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetY = 0;

                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.font = '700 16px Inter, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText("TRYK PIL TIL HØJRE FOR AT STARTE", this.width / 2, this.height / 2 + 50);
            }

            // Reset Shadows
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetY = 0;
        },

        loop() {
            if (!this.gameActive) return;
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(() => this.loop());
        },

        gameOver(won) {
            this.gameActive = false;

            const title = won ? "DU VANDT! 🏆" : "DU TABTE 💀";
            const msg = won ? "Fedt mand! Vil du spille igen?" : "Bedre held næste gang!";

            if (Arcade.showSimpleGameOver) {
                Arcade.showSimpleGameOver(
                    title,
                    msg,
                    "Spil Igen",
                    () => window.restartPong(),
                    () => window.closePong()
                );
            }

            if (won) {
                try {
                    if (Arcade.Audio) Arcade.Audio.wordleWin();
                } catch (e) { }

                // Update persistent score (Total Wins?)
                let currentWins = Arcade.state.highScores['pong_wins'] || 0;
                currentWins++;
                Arcade.saveScore('pong_wins', currentWins);
                Arcade.updateUI(); // Refresh menu
            } else {
                try {
                    if (Arcade.Audio) Arcade.Audio.wordleLose();
                } catch (e) { }
            }
        },

        hideGameOver() {
            document.getElementById('pong-game-over').classList.add('hidden');
        },

        // Helper
        hexToRgb(hex) {
            // ... simplistic hex parser if needed, but canvas takes hex strings fine
            return hex;
        }
    }
};

// Space Invaders Removed 

// Space Logic Fully Removed

// Update UI helper to handle Pong AND Space
const originalUpdateUI2 = Arcade.updateUI;
Arcade.updateUI = function () {
    // Call original (which calls Snake/Breakout/Wordle + Pong patch if chain worked, 
    // but the previous monkey patch might be overwritten depending on exec order. 
    // Safest is to just manually re-implement the full check if possible, or chain carefully.)

    // Actually, `games.js` is loaded once. The previous monkey patch for Pong is seemingly "originalUpdateUI" in THIS scope if I define it below.
    // BUT, I'm editing the file, so I need to be careful not to create a loop or lose Pong.

    // We can just inspect the state object directly.

    // 1. Run Base Update (Snake/Breakout/Wordle) from original definition if accessible
    if (this.updateUI_Base) this.updateUI_Base();

    // Update Pong
    if (document.getElementById('pong-highscore-display')) {
        const pw = this.state.highScores['pong_wins'] || 0;
        document.getElementById('pong-highscore-display').textContent = `Sejre: ${pw}`;
    }

    // Update Space
    if (document.getElementById('space-highscore-display')) {
        const sh = this.state.highScores['space'] || 0;
        document.getElementById('space-highscore-display').textContent = `Rekord: ${sh}`;
    }

    // Update Header Coins
    if (document.getElementById('coin-count')) {
        document.getElementById('coin-count').innerText = this.state.coins;
    }

    // Update Identity Pill Name
    if (document.getElementById('player-name-display')) {
        document.getElementById('player-name-display').innerText = this.state.playerName || 'Gæst';
    }
}; // End updateUI

// Store original base UpdateUI inside Arcade to allow chaining if needed
Arcade.updateUI_Base = originalUpdateUI2;

// Global Helpers for HTML access
// --- SHARED MODAL SYSTEM ---
window.checkBackdrop = () => {
    // Check if ANY modal is currently visible
    const anyVisible = document.querySelectorAll('.modal-overlay:not(.hidden)').length > 0;
    const backdrop = document.getElementById('modal-backdrop');

    if (anyVisible) {
        backdrop.classList.remove('hidden');
    } else {
        backdrop.classList.add('hidden');
    }
};

window.openModal = (id) => {
    document.getElementById(id).classList.remove('hidden');
    window.checkBackdrop();
};

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
    setTimeout(window.checkBackdrop, 10);
};

// Global Helpers for HTML access (Updated with Manager)
window.openProfileHub = () => {
    const hub = document.getElementById('profile-hub');
    const nameInput = document.getElementById('hub-name-input');

    // Populate Data
    nameInput.value = Arcade.state.playerName || '';
    if (document.getElementById('hub-coin-count')) {
        document.getElementById('hub-coin-count').innerText = Arcade.state.coins;
    }

    openModal('profile-hub');
};

window.closeProfileHub = () => {
    closeModal('profile-hub');
};

window.saveNameFromHub = () => {
    const input = document.getElementById('hub-name-input');
    const newName = input.value.trim().substring(0, 12);

    if (newName.length > 0) {
        Arcade.state.playerName = newName;
        localStorage.setItem('arcade_player_name', newName);
        Arcade.updateUI();
        input.blur();
    }
};

window.openLeaderboard = () => {
    // 1. Open first (Visual feedback)
    openModal('arcade-leaderboard');

    // 2. Render content safely
    if (window.renderLeaderboard) {
        try {
            window.renderLeaderboard();
        } catch (e) {
            console.error("Leaderboard render error:", e);
        }
    }
};

window.closeLeaderboard = () => {
    const modal = document.getElementById('arcade-leaderboard');
    if (!modal) return;

    // Add Exit Transition
    const panel = modal.querySelector('.glass-panel');
    if (panel) {
        panel.classList.remove('pop-in-animation');
        panel.classList.add('pop-out-animation');

        setTimeout(() => {
            closeModal('arcade-leaderboard');
            panel.classList.remove('pop-out-animation');
        }, 300);
    } else {
        closeModal('arcade-leaderboard');
    }
};

// --- NEW CLEAN SHOP RENDERER (Step 8450) ---
// --- FINAL SHOP IMPLEMENTATION (aligned with arcade-shop-final) ---
// --- FINAL SHOP IMPLEMENTATION (Native games.js Control) ---
// --- FINAL SHOP IMPLEMENTATION (Native games.js Control) ---
// --- FINAL SHOP IMPLEMENTATION (Native games.js Control) ---
// RENAMED TO AVOID CONFLICTS
window.renderShopItemsFinal = function () {
    console.log("Rendering Shop (Final Unique)...");

    const list = document.getElementById('shop-items-final');
    if (!list) {
        console.error("Shop List Not Found");
        return;
    }

    // DEBUG PROBE
    // DEBUG PROBE - REMOVED
    // list.innerHTML = '<div style="color:red; padding:20px;">LOADING SHOP v27...</div>';

    // FORCE GRID & PADDING
    list.style.display = 'grid';
    list.style.gridTemplateColumns = '1fr 1fr';
    list.style.gap = '15px';
    list.style.padding = '10px';

    // 1. Guaranteed Data (Hardcoded Only)
    const items = [
        { id: 'paddle-golden', name: 'Golden Paddle', type: 'mod', cost: 1500, desc: '50% Større bat i Pong.' },
        { id: 'life-extra', name: 'Extra Life', type: 'mod', cost: 2000, desc: '+1 Liv i Breakout.' },
        { id: 'snake-slow', name: 'Chill Snake', type: 'mod', cost: 1200, desc: '20% Langsommere slange.' },
        { id: 'theme-matrix', name: 'The Matrix', type: 'theme', cost: 1000, desc: 'Digital grøn kode-regn.' },
        { id: 'theme-sunset', name: 'Vapor Sunset', type: 'theme', cost: 850, desc: 'Retro 80er gradients.' },
        { id: 'theme-ocean', name: 'Deep Ocean', type: 'theme', cost: 500, desc: 'Rolig dybhavs blå.' },
        { id: 'snake-skin-neon', name: 'Neon Snake', type: 'skin', cost: 300, desc: 'Selvlysende slange.' }
    ];

    // Update Header to show count (Visual Debug) - REMOVED for clean UI
    // const header = document.querySelector('#arcade-shop-final h2');
    // if (header) header.textContent = `Arcade Shop 🛒 v27 (${items.length})`;

    let inventory = [];
    let coins = 0;

    // Safely get wallet
    try {
        if (window.Arcade && window.Arcade.state) {
            inventory = window.Arcade.state.inventory || [];
            coins = window.Arcade.state.coins || 0;
        }
    } catch (e) { }

    const coinEl = document.getElementById('shop-coin-count');
    if (coinEl) coinEl.textContent = coins;

    // Clear Probe
    list.innerHTML = '';

    // 2. Render Cards
    items.forEach(item => {
        const owned = inventory.includes(item.id);
        const card = document.createElement('div');

        // FORCE INLINE STYLES (No CSS reliance)
        card.style.background = 'rgba(255,255,255,0.05)';
        card.style.border = '1px solid rgba(255,255,255,0.1)';
        card.style.borderRadius = '16px';
        card.style.padding = '15px';
        card.style.color = 'white';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '10px';
        card.style.minHeight = '140px';

        let btnHTML = `<button style="background:#fbbf24; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-weight:bold;">${item.cost} 🪙</button>`;
        if (owned) btnHTML = `<button disabled style="background:rgba(255,255,255,0.2); border:none; padding:5px 10px; border-radius:5px; color:white;">Ejet</button>`;

        card.innerHTML = `
            <div style="font-size:2rem;">📦</div>
            <div>
                <h3 style="margin:0; font-size:1.1rem;">${item.name}</h3>
                <p style="margin:5px 0 0 0; font-size:0.8rem; opacity:0.7;">${item.desc}</p>
            </div>
            <div style="margin-top:auto;">${btnHTML}</div>
        `;

        // Interactive Button Logic
        if (!owned) {
            const btn = card.querySelector('button');
            btn.onclick = () => {
                if (window.Arcade && window.Arcade.buyItem) {
                    window.Arcade.buyItem(item.id);
                    // Rerender to show "Ejet" state
                    window.renderShopItemsFinal();
                }
            };
        } else if (item.type === 'theme') {
            // Theme Selection Logic
            // Check if active logic would go here, removed for simplicity to match previous working state
            // Actually, let's just make it select
            const btn = card.querySelector('button');
            if (btn && !btn.disabled) {
                btn.onclick = () => {
                    window.Arcade.equipTheme(item.id);
                    window.renderShopItemsFinal();
                }
            }
        }

        list.appendChild(card);
    });
    console.log("Render Complete. Items: ", items.length);
};

// --- FINAL SHOP IMPLEMENTATION (Native games.js Control) ---
// Identical logic to Leaderboard to handle transitions perfectly
window.openShop = () => {
    // 1. Open Modal (Standard Way)
    openModal('arcade-shop-final');

    // Force Clean Title (Immediate)
    const titleEl = document.querySelector('#arcade-shop-final .modal-header h2');
    if (titleEl) titleEl.textContent = "Arcade Shop 🛒";

    // 2. Render Content (Using the Override Logic if available)
    if (window.renderShopItemsOverride) {
        window.renderShopItemsOverride();
    } else if (window.renderShopItems) {
        window.renderShopItems();
    }

    // 3. FORCE CLEAN TITLE AGAIN (Async) - No longer needed as source is fixed
    // setTimeout(() => {
    //     if (titleEl) titleEl.textContent = "Arcade Shop 🛒";
    // }, 10);
};

window.closeShop = () => {
    const modal = document.getElementById('arcade-shop-final');
    if (!modal) return;

    // Add Exit Transition (Standard Way)
    const panel = modal.querySelector('.glass-panel');
    if (panel) {
        panel.classList.remove('pop-in-animation');
        panel.classList.add('pop-out-animation');

        setTimeout(() => {
            closeModal('arcade-shop-final');
            panel.classList.remove('pop-out-animation');
        }, 200); // Match CSS 0.2s or 0.15s
    } else {
        closeModal('arcade-shop-final');
    }
};

window.editPlayerName = window.openProfileHub; // Legacy mapping


// VERSION CHECK (Safe)
document.addEventListener('DOMContentLoaded', () => {
    const vTag = document.getElementById('version-display');
    if (vTag) vTag.textContent = "v55";
    console.log("Version v55 Loaded");
});
