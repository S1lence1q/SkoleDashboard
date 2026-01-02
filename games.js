
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
            const allScores = Object.values(rawData).map(entry => ({
                name: entry.name,
                score: entry.score,
                isUser: entry.name === (this.state.playerName || 'Mig')
            }));

            // Sort
            return allScores.sort((a, b) => b.score - a.score);
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
        // Wordle Sounds
        type() { this.play(800, 'triangle', 0.05); }, // Crisp Click
        confirm() { this.play(150, 'square', 0.1); }, // Thud
        flip() { this.play(400, 'sine', 0.15); }, // Whoosh
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
            if (!this.ctx) this.init();
            if (this.gameInterval) clearInterval(this.gameInterval);

            // Reset State
            this.gameActive = true;
            this.waitingForStart = true; // Wait for input
            this.score = 0;
            this.snake = {
                x: 160, y: 160, dx: 0, dy: 0,
                cells: [], maxCells: 4
            };
            this.apple = { x: 320, y: 320 };

            document.getElementById('snake-current-score').textContent = '0';
            document.getElementById('snake-game-over').classList.add('hidden');

            // Draw Initial State
            this.placeApple();
            this.draw();
            this.drawStartMessage(); // Show "Press Key"

            // Listeners
            document.removeEventListener('keydown', this.boundHandleKey); // Clean old
            this.boundHandleKey = this.handleKey.bind(this);
            document.addEventListener('keydown', this.boundHandleKey);
        },

        stop() {
            this.gameActive = false;
            clearInterval(this.gameInterval);
            document.removeEventListener('keydown', this.boundHandleKey);
        },

        handleKey(e) {
            // Prevent default browser scrolling for arrow keys
            if ([37, 38, 39, 40].indexOf(e.which) > -1) {
                e.preventDefault();
            }

            if (!this.gameActive || this.isPaused) return;

            // First Keypress Starts Game
            if (this.waitingForStart) {
                if ([37, 38, 39, 40].includes(e.which)) {
                    this.waitingForStart = false;
                    // Modifier: Snake Slow
                    let speed = Arcade.settings.snakeSpeed;
                    if (Arcade.state.inventory.includes('snake-slow')) speed = speed * 1.2; // 20% slower

                    this.gameInterval = setInterval(this.loop.bind(this), speed);
                } else {
                    return; // Ignore non-arrow keys
                }
            }

            // Prevent reversing
            if (e.which === 37 && this.snake.dx === 0) { this.snake.dx = -this.grid; this.snake.dy = 0; }
            else if (e.which === 38 && this.snake.dy === 0) { this.snake.dy = -this.grid; this.snake.dx = 0; }
            else if (e.which === 39 && this.snake.dx === 0) { this.snake.dx = this.grid; this.snake.dy = 0; }
            else if (e.which === 40 && this.snake.dy === 0) { this.snake.dy = this.grid; this.snake.dx = 0; }
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

            // Wall Collision Logic
            if (Arcade.settings.snakeWalls) {
                // Hard Walls
                if (this.snake.x < 0 || this.snake.x >= this.canvas.width ||
                    this.snake.y < 0 || this.snake.y >= this.canvas.height) {
                    this.gameOver();
                    return;
                }
            } else {
                // Wrap Walls
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

            // Apple Collision
            if (this.snake.x === this.apple.x && this.snake.y === this.apple.y) {
                this.snake.maxCells++;
                this.score += 10;
                document.getElementById('snake-current-score').textContent = this.score;
                this.placeApple();
                if (Arcade.Audio) Arcade.Audio.ping();
            }

            // Draw
            this.draw();
        },

        draw() {
            // Clear
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw Apple
            this.ctx.fillStyle = this.getThemeColor('apple');
            this.ctx.fillRect(this.apple.x, this.apple.y, this.grid - 1, this.grid - 1);

            // Draw Snake
            this.ctx.fillStyle = this.getThemeColor('snake');
            this.snake.cells.forEach((cell, index) => {
                this.ctx.fillRect(cell.x, cell.y, this.grid - 1, this.grid - 1);

                // Self Collision Check
                if (index > 0 && cell.x === this.snake.x && cell.y === this.snake.y) {
                    this.gameOver();
                }
            });
        },

        getThemeColor(type) {
            // Theme Colors
            const themes = {
                classic: { snake: '#4ade80', apple: '#ef4444' }, // Green/Red
                neon: { snake: '#d946ef', apple: '#22d3ee' },    // Pink/Cyan
                retro: { snake: '#ffffff', apple: '#ffffff' }    // Monochrome
            };
            return themes[Arcade.settings.snakeTheme][type];
        },

        placeApple() {
            this.apple.x = this.getRandomInt(0, 25) * this.grid;
            this.apple.y = this.getRandomInt(0, 25) * this.grid;
            // Ensure not on snake
            if (this.snake.cells.some(c => c.x === this.apple.x && c.y === this.apple.y)) {
                this.placeApple();
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

            // Show Game Over Screen
            const goScreen = document.getElementById('snake-game-over');
            const goTitle = goScreen.querySelector('h2');
            goTitle.textContent = isHigh ? "NY REKORD! 🏆" : "SPILLET ER SLUT";
            goScreen.classList.remove('hidden');
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

        start() {
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
            this.rightPressed = false;
            this.leftPressed = false;
            this.ballAttached = true;
            this.powerups = [];
            this.particles = [];
            this.shakeTime = 0;
            this.paddleFlashTimer = 0;
            this.hasWidePaddle = false;

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
            if (this.loopId) clearInterval(this.loopId);
            document.removeEventListener('keydown', this.keyDownHandler.bind(this));
            document.removeEventListener('keyup', this.keyUpHandler.bind(this));
        },

        resetPositions() {
            this.ballAttached = true;
            let startW = 100;
            if (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutPaddle) {
                startW = window.Arcade.settings.breakoutPaddle;
            }

            // Modifier: Golden Paddle
            if (window.Arcade.state.inventory.includes('paddle-golden')) startW = startW * 1.5;

            this.paddle.w = startW;
            this.paddle.targetW = startW;

            this.paddle.x = (this.canvas.width - this.paddle.w) / 2;
            this.paddle.dx = 0;

            // Initialize single ball
            this.balls = [{
                x: this.paddle.x + this.paddle.w / 2,
                y: this.paddle.y - 6,
                r: 6,
                dx: 4 * (Math.random() > 0.5 ? 1 : -1),
                dy: -4,
                speed: 4,
                active: true
            }];
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
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const p = this.powerups[i];
                p.y += p.dy;

                if (p.x >= this.paddle.x && p.x <= this.paddle.x + this.paddle.w &&
                    p.y >= this.paddle.y && p.y <= this.paddle.y + this.paddle.h) {

                    if (p.type === 'wide') {
                        this.hasWidePaddle = true;

                        this.powerups = this.powerups.filter(pu => pu.type !== 'wide' || pu === p);

                        if (this.wideTimer) clearTimeout(this.wideTimer);

                        this.paddle.targetW = 150;
                        if (Arcade.Audio) Arcade.Audio.boop();
                        this.paddleFlashTimer = 15; // Trigger Flash (Longer)

                        this.wideTimer = setTimeout(() => {
                            let defaultW = 100;
                            if (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutPaddle) {
                                defaultW = window.Arcade.settings.breakoutPaddle;
                            }
                            this.paddle.targetW = defaultW;
                            this.wideTimer = null;
                        }, 10000);
                    } else if (p.type === 'super') {
                        if (this.superTimer) clearTimeout(this.superTimer);
                        this.balls.forEach(b => b.super = true);
                        if (Arcade.Audio) Arcade.Audio.win();

                        this.superTimer = setTimeout(() => {
                            this.balls.forEach(b => b.super = false);
                            this.superTimer = null;
                        }, 5000);
                    } else if (p.type === 'multiball') {
                        let mode = 'standard';
                        if (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutMultiball) {
                            mode = window.Arcade.settings.breakoutMultiball;
                        }

                        if (mode === 'kaos') {
                            // KAOS: Double active balls
                            const newBalls = [];
                            this.balls.forEach(b => {
                                if (b.active) {
                                    newBalls.push({ ...b, dx: -b.dx + (Math.random() - 0.5), dy: -3 - Math.random(), super: b.super });
                                }
                            });
                            if (this.balls.length < 200) this.balls = this.balls.concat(newBalls);
                        } else {
                            // Standard: Add 2 balls (No Limit)
                            const source = this.balls.find(b => b.active) || this.balls[0];
                            if (source) {
                                const b1 = { ...source, dx: -source.dx + 1, dy: -4, super: source.super };
                                const b2 = { ...source, dx: source.dx + 1, dy: -3, super: source.super };
                                this.balls.push(b1, b2);
                            }
                        }

                        this.ballAttached = false;
                        if (Arcade.Audio) Arcade.Audio.ping();
                    }

                    this.powerups.splice(i, 1);
                    continue;
                }

                if (p.y > this.canvas.height) this.powerups.splice(i, 1);
            }
        },

        keyDownHandler(e) {
            if (e.key === "Right" || e.key === "ArrowRight") {
                this.rightPressed = true;
                e.preventDefault();
            } else if (e.key === "Left" || e.key === "ArrowLeft") {
                this.leftPressed = true;
                e.preventDefault();
            } else if (e.key === "ArrowUp" || e.key === " " || e.key === "Up") {
                if (this.ballAttached) this.ballAttached = false;
                e.preventDefault();
            }
        },

        keyUpHandler(e) {
            if (e.key === "Right" || e.key === "ArrowRight") this.rightPressed = false;
            else if (e.key === "Left" || e.key === "ArrowLeft") this.leftPressed = false;
        },

        loop() {
            if (this.isPaused) return;

            // UPDATE PADDLE
            if (this.rightPressed) this.paddle.dx = this.paddle.speed;
            else if (this.leftPressed) this.paddle.dx = -this.paddle.speed;
            else this.paddle.dx = 0;

            // Animation for Width
            // Animation for Width
            // Animation for Width
            if (this.paddle.targetW !== undefined && Math.abs(this.paddle.w - this.paddle.targetW) > 0.5) {
                const oldW = this.paddle.w;
                this.paddle.w += (this.paddle.targetW - this.paddle.w) * 0.1;
                const newW = this.paddle.w;

                // Adjust X to keep center stable relative to the WIDTH CHANGE only
                this.paddle.x -= (newW - oldW) / 2;

            } else if (this.paddle.targetW !== undefined) {
                const oldW = this.paddle.w;
                this.paddle.w = this.paddle.targetW;
                const newW = this.paddle.w;
                this.paddle.x -= (newW - oldW) / 2;
            }

            this.paddle.x += this.paddle.dx;
            if (this.paddle.x < 0) this.paddle.x = 0;
            if (this.paddle.x + this.paddle.w > this.width) this.paddle.x = this.width - this.paddle.w;

            // UPDATE BALLS
            if (this.ballAttached) {
                // All balls stick to paddle (usually just one)
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
                            let speed = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
                            speed = Math.min(speed + 0.2, 9);
                            b.dx = speed * Math.sin(angle);
                            b.dy = -speed * Math.cos(angle);
                            if (Arcade.Audio) Arcade.Audio.boop();
                            this.paddleFlashTimer = 15; // Trigger Flash
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
                            this.resetPositions();
                            this.isPaused = false;
                        }, 500);
                    }
                }
            }

            this.updatePowerUps();
            this.updateParticles();
            this.collisionDetection();

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
                this.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
                if (p.type === 'wide') this.ctx.fillStyle = '#3b82f6'; // Blue
                else if (p.type === 'super') this.ctx.fillStyle = '#a855f7'; // Purple
                else if (p.type === 'life') this.ctx.fillStyle = '#ef4444'; // Red
                else this.ctx.fillStyle = '#eab308'; // Gold (Points)

                this.ctx.fill();
                this.ctx.fillStyle = "white";
                this.ctx.font = "10px sans-serif";
                this.ctx.textAlign = "center";

                let icon = "?";
                if (p.type === 'wide') icon = "↔";
                else if (p.type === 'super') icon = "⚡";
                else if (p.type === 'life') icon = "♥";
                else if (p.type === 'multiball') icon = "🎱";

                this.ctx.fillText(icon, p.x, p.y + 4);
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
                this.ctx.shadowBlur = b.super ? 25 : 15;
                this.ctx.shadowColor = color;
                this.ctx.fill();
                this.ctx.closePath();
                this.ctx.shadowBlur = 0;
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

        initBricks() {
            // Ensure basic config exists
            if (!this.brickConfig) {
                this.brickConfig = {
                    r: 5,
                    c: 10,  // Increased density
                    w: 0,
                    h: 20,
                    padding: 4, // Tighter spacing
                    offsetLeft: 30,
                    offsetTop: 50
                };
            }

            const { c, padding, offsetTop } = this.brickConfig;

            // DYNAMIC DIFFICULTY: INCREASE ROWS WITH LEVEL
            let targetRows = Math.min(4 + Math.floor(this.level / 2), 9);
            // Level 1: 4 rows, Level 3: 5 rows... Max 9.
            this.brickConfig.r = targetRows;
            const r = targetRows;

            // 1. CALCULATE WIDTH & CENTERING
            // We want a fixed width for the "game board" area or just maximize space?
            // Let's maximize space but keep it centered.
            // Available width = Canvas Width - (Margins). Let's say 20px margin each side minimum.
            const availableWidth = this.width - 40;

            // Calculate brick width based on available space
            // totalW = c * w + (c - 1) * padding
            // w = (totalW - (c-1)*padding) / c
            const newW = Math.floor((availableWidth - ((c - 1) * padding)) / c);
            this.brickConfig.w = newW; // CRITICAL: Assign to config so drawBricks can see it!
            this.brickConfig.h = 20;   // Ensure height is set

            // Calculate exact offsetLeft to center strictly
            const totalContentWidth = (c * newW) + ((c - 1) * padding);
            const centeringOffset = (this.width - totalContentWidth) / 2;
            this.brickConfig.offsetLeft = centeringOffset;
            this.brickConfig.offsetTop = 60; // Fixed top offset

            this.bricks = [];

            // Level Pattern Logic
            let patternIndex = (this.level - 1);
            if (patternIndex >= 10) patternIndex = (this.level * 7) % 10;
            // Override for testing specific levels if needed:
            // patternIndex = 3; 

            for (let i = 0; i < c; i++) {
                this.bricks[i] = [];
                // Symmetry Helper: 0->0, 1->1, ... 6->1, 7->0 (for c=8)
                const symI = (i < c / 2) ? i : (c - 1 - i);

                for (let j = 0; j < r; j++) {
                    let active = true;

                    // 10 PATTERNS
                    switch (patternIndex) {
                        case 0: // Standard (Full)
                            active = true;
                            break;
                        case 1: // Checkerboard (Sym)
                            if ((symI + j) % 2 !== 0) active = false;
                            break;
                        case 2: // Columns (Sym)
                            if (symI % 2 !== 0) active = false;
                            break;
                        case 3: // Rows
                            if (j % 2 !== 0) active = false;
                            break;
                        case 4: // Pyramid
                            // Center is around index 3.5 for 8 cols
                            // active if distance from center <= j
                            if ((c / 2 - 0.5 - symI) > (j + 0.5)) active = false;
                            // This is complex, let's simplify for Pyramid:
                            // Row 0: Only center 2 bricks
                            // Row 1: Center 4 bricks
                            // i.e. dist from center < ...
                            // simple: if symI is small, it's far from center.
                            // if symI < (something - j) -> nope
                            // j=0 (top), we want only symI=3 (center-ish).
                            // Let's use standard pyramid logic:
                            // Active if i is within range [center - j, center + j] roughly
                            // For 8 cols (0..7), center is 3.5. 
                            // j=0: need 3,4. 
                            // j=1: need 2,3,4,5.
                            {
                                const dist = Math.abs(i - (c - 1) / 2.0);
                                if (dist > (j + 0.5)) active = false;
                            }
                            break;
                        case 5: // Inverted Pyramid
                            {
                                const dist = Math.abs(i - (c - 1) / 2.0);
                                if (dist < (r - 1 - j)) active = false;
                            }
                            break;
                        case 6: // Frame
                            if (i > 0 && i < c - 1 && j > 0 && j < r - 1) active = false;
                            break;
                        case 7: // Diagonals (Sym)
                            // X . . X . . X (Asym)
                            // Sym:
                            if ((symI + j) % 3 === 0) active = false;
                            break;
                        case 8: // Diamond
                            {
                                const cx = (c - 1) / 2.0;
                                const cy = (r - 1) / 2.0;
                                const dist = Math.abs(i - cx) + Math.abs(j - cy);
                                if (dist > 3) active = false;
                            }
                            break;
                        case 9: // Symmetric Random Scatter
                            // allow logic to generate consistently for the same level? 
                            // Math.random() is fine for "random", but let's make it symmetric.
                            // We need a seeded random or just pre-decide for this pair (i, c-1-i).
                            // Simplest: just random each time but mirrored? No, that looks weird if they change.
                            // Just random scatter is fine, but user asked for symmetry.
                            // Let's do:
                            if ((symI * 7 + j * 13 + this.level * 17) % 5 === 0) active = false; // Deterministic pseudo-random
                            else if (Math.random() > 0.7) active = false; // Plus some pure chaos
                            break;
                    }

                    if (active) {
                        let health = 1;
                        if (this.level >= 2 && Math.random() < 0.2) health = 2;
                        if (this.level >= 4) {
                            if (Math.random() < 0.2) health = 3;
                            else if (Math.random() < 0.4) health = 2;
                        }
                        this.bricks[i][j] = { x: 0, y: 0, status: health, maxHealth: health };
                    } else {
                        this.bricks[i][j] = { x: 0, y: 0, status: 0, maxHealth: 0 };
                    }
                }
            }
        },
        drawBricks() {
            const { r, c, padding, offsetLeft, offsetTop, w, h } = this.brickConfig;
            for (let i = 0; i < c; i++) {
                for (let j = 0; j < r; j++) {
                    if (this.bricks[i][j].status > 0) {
                        const brickX = (i * (w + padding)) + offsetLeft;
                        const brickY = (j * (h + padding)) + offsetTop;
                        const b = this.bricks[i][j];

                        b.x = brickX;
                        b.y = brickY;

                        // MATERIAL DESIGN: VIBRANT CERAMIC (Apple Pop)
                        // A curated, "happy" but premium palette (iMac tones).
                        // MATERIAL DESIGN: VIBRANT CERAMIC (Apple Pop)
                        // A curated, "happy" but premium palette (iMac tones).
                        const colors = [
                            '#a78bfa', // Soft Violet (Start with Purple)
                            '#22d3ee', // Cyan
                            '#fbbf24', // Warm Amber
                            '#fb7185', // Soft Rose
                            '#60a5fa', // Vivid Blue
                            '#34d399', // Smooth Emerald
                            '#f472b6'  // Candy Pink
                        ];
                        const baseColor = colors[j % colors.length] || "#fff";

                        this.ctx.save();

                        // 1. Soft Ambient Shadow (Floating)
                        this.ctx.shadowBlur = 12;
                        this.ctx.shadowOffsetX = 0;
                        this.ctx.shadowOffsetY = 4;
                        this.ctx.shadowColor = "rgba(0,0,0,0.2)"; // Slightly stronger text shadow for contrast

                        // 2. Shape Path
                        this.ctx.beginPath();
                        this.ctx.roundRect(brickX, brickY, w, h, 6);

                        // 3. Volumetric Gradient (Body)
                        // Lighter Top -> Darker Bottom to suggest curvature
                        const bodyGrad = this.ctx.createLinearGradient(brickX, brickY, brickX, brickY + h);
                        bodyGrad.addColorStop(0, baseColor);
                        bodyGrad.addColorStop(1, this.adjustColor(baseColor, -25)); // Stronger gradient for volume

                        this.ctx.globalAlpha = 0.9; // Semi-transparent glass/plastic
                        this.ctx.fillStyle = bodyGrad;
                        this.ctx.fill();

                        // 4. Soft Top Highlight (The "Sheen")
                        // Simulates overhead light hitting a curved matte surface
                        const sheenGrad = this.ctx.createLinearGradient(brickX, brickY, brickX, brickY + h * 0.6);
                        sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0.25)"); // High sheen
                        sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0)"); // Fade out

                        this.ctx.fillStyle = sheenGrad;
                        this.ctx.fill();

                        // 5. No Outline (Pure Shape)
                        // Removed stroke to avoid "button" look.

                        this.ctx.restore();

                        // Visuals for Hard Bricks (Clean / No Stripes)
                        if (b.maxHealth > 1) {
                            this.ctx.save();
                            this.ctx.beginPath();
                            this.ctx.roundRect(brickX, brickY, w, h, 6);
                            this.ctx.fillStyle = "rgba(0,0,0,0.1)"; // Slight darkening for hard blocks
                            this.ctx.fill();
                            this.ctx.restore();
                        }

                        // Cracks (If damaged)
                        if (b.status < b.maxHealth) {
                            this.ctx.strokeStyle = "rgba(255,255,255,0.3)"; // White cracks for glass look
                            this.ctx.lineWidth = 1.0;
                            this.ctx.beginPath();
                            // Simple Zigzag Crack
                            this.ctx.moveTo(brickX + w * 0.2, brickY + h * 0.2);
                            this.ctx.lineTo(brickX + w * 0.5, brickY + h * 0.5);
                            this.ctx.lineTo(brickX + w * 0.3, brickY + h * 0.8);
                            this.ctx.lineTo(brickX + w * 0.7, brickY + h * 0.6);
                            // Second Crack
                            if (b.status === 1 && b.maxHealth === 3) {
                                this.ctx.moveTo(brickX + w * 0.8, brickY + h * 0.2);
                                this.ctx.lineTo(brickX + w * 0.5, brickY + h * 0.5);
                            }
                            this.ctx.stroke();
                        }

                        this.ctx.closePath();
                    }
                }
            }
        },

        // Helper for darkening hex colors
        adjustColor(color, amount) {
            return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
        },

        collisionDetection() {
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
                                    // Destroy
                                    this.score += 10;

                                    // Juice
                                    const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fde047'];
                                    const color = colors[j] || "#fff";
                                    this.createParticles(b.x + w / 2, b.y + h / 2, color);

                                    this.spawnPowerUp(b.x + w / 2, b.y + h / 2);
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

        levelUp() {
            this.level++;
            this.balls.forEach(b => b.speed += 0.5);
            Arcade.Audio.win();
            this.powerups = []; // Clear falling powerups
            this.hasWidePaddle = false; // Allow one new wide powerup next level

            // Show Level Up Message (HTML Overlay)
            this.isPaused = true;
            this.ballAttached = true;

            const overlay = document.getElementById('breakout-level-overlay');
            const num = document.getElementById('level-display-num');
            if (num) num.textContent = this.level;

            // Fade In
            if (overlay) overlay.style.opacity = "1";

            // Wait 2s then resume
            setTimeout(() => {
                // Fade Out
                if (overlay) overlay.style.opacity = "0";

                this.initBricks();
                this.resetPositions();
                this.isPaused = false;
            }, 2000);
        },

        updateLives() {
            const el = document.getElementById('breakout-lives');
            if (!el) return;
            el.textContent = `${this.lives} x ❤️`;
        },

        gameOver() {
            this.stop();
            const isHigh = Arcade.saveScore('breakout', this.score);
            Arcade.updateUI();

            const goScreen = document.getElementById('breakout-game-over');
            const goTitle = goScreen.querySelector('h2');
            goTitle.textContent = isHigh ? "NY REKORD! 🏆" : "SPILLET ER SLUT";
            goScreen.classList.remove('hidden');
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
            if (!this.gameActive) return;
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

            // Type the word safely
            const letters = word.split('');
            letters.forEach(l => this.addLetter(l));

            // Force Submit (bypass validation if needed, or just call submit)
            this.submitGuess(true); // true = isRemote
        },

        addLetter(letter) {
            if (this.guess.length < 5) {
                this.guess.push(letter);
                this.updateTile(this.currentRow, this.guess.length - 1, letter);
                if (Arcade.Audio) Arcade.Audio.type();
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
            const overlay = document.getElementById('wordle-game-over');
            const msg = document.getElementById('wordle-msg');
            const res = document.getElementById('wordle-result-word');

            msg.textContent = won ? "GODT GÅET!" : "ÆV, NÆSTE GANG!";
            res.textContent = this.solution;

            overlay.classList.remove('hidden');

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
            const overlay = document.getElementById('pong-game-over');
            const msg = document.getElementById('pong-msg');
            msg.textContent = won ? "DU VANDT!" : "DU TABTE!";
            if (won) {
                if (Arcade.Audio) Arcade.Audio.wordleWin(); // Recycle celebratory sound
                // Update persistent score (Total Wins?)
                let currentWins = Arcade.state.highScores['pong_wins'] || 0;
                currentWins++;
                Arcade.saveScore('pong_wins', currentWins);
                Arcade.updateUI(); // Refresh menu
            } else {
                if (Arcade.Audio) Arcade.Audio.wordleLose();
            }
            overlay.classList.remove('hidden');
        },

        hideGameOver() {
            document.getElementById('pong-game-over').classList.add('hidden');
        },

        // Helper
        hexToRgb(hex) {
            // ... simplistic hex parser if needed, but canvas takes hex strings fine
            return hex;
        }
    },

    Space: {
        canvas: null,
        ctx: null,
        animationId: null,
        width: 0,
        height: 0,
        isPaused: false,
        gameActive: false,
        lastTime: 0,

        // Game State
        score: 0,
        lives: 3,
        level: 1,

        // Entities
        player: { x: 0, y: 0, w: 40, h: 40, speed: 5, movingLeft: false, movingRight: false, cooldown: 0, invulnerable: 0 },
        bullets: [], // {x, y, vy, type: 'player'|'enemy'}
        enemies: [], // {x, y, w, h, type, row, col}
        particles: [],

        // Enemy Config
        enemyRows: 4,
        enemyCols: 8,
        enemyDir: 1, // 1 = right, -1 = left
        enemySpeed: 1, // Increases not level
        enemyDropAmount: 20,
        enemyFireRate: 0.0005,

        init() {
            this.canvas = document.getElementById('space-canvas');
            if (this.canvas) {
                this.ctx = this.canvas.getContext('2d');
                this.width = this.canvas.width;
                this.height = this.canvas.height;
            }

            // Keyboard Listeners
            window.addEventListener('keydown', e => {
                if (!this.gameActive || this.isPaused) return;
                if (e.key === 'ArrowLeft') this.player.movingLeft = true;
                if (e.key === 'ArrowRight') this.player.movingRight = true;
                if (e.key === ' ' || e.key === 'ArrowUp') this.fireBullet();
            });

            window.addEventListener('keyup', e => {
                if (e.key === 'ArrowLeft') this.player.movingLeft = false;
                if (e.key === 'ArrowRight') this.player.movingRight = false;
            });

            // Mobile Controls
            const btnLeft = document.getElementById('btn-space-left');
            const btnRight = document.getElementById('btn-space-right');
            const btnFire = document.getElementById('btn-space-fire');

            if (btnLeft) {
                btnLeft.ontouchstart = (e) => { e.preventDefault(); this.player.movingLeft = true; };
                btnLeft.ontouchend = (e) => { e.preventDefault(); this.player.movingLeft = false; };
                // Mouse fallback
                btnLeft.onmousedown = (e) => { this.player.movingLeft = true; };
                btnLeft.onmouseup = (e) => { this.player.movingLeft = false; };
            }
            if (btnRight) {
                btnRight.ontouchstart = (e) => { e.preventDefault(); this.player.movingRight = true; };
                btnRight.ontouchend = (e) => { e.preventDefault(); this.player.movingRight = false; };
                btnRight.onmousedown = (e) => { this.player.movingRight = true; };
                btnRight.onmouseup = (e) => { this.player.movingRight = false; };
            }
            if (btnFire) {
                btnFire.ontouchstart = (e) => { e.preventDefault(); this.fireBullet(); btnFire.classList.add('active'); };
                btnFire.ontouchend = (e) => { e.preventDefault(); btnFire.classList.remove('active'); };
                btnFire.onmousedown = (e) => { this.fireBullet(); };
            }
        },

        start() {
            if (!this.canvas) this.init();
            this.resetGame();
            this.gameActive = true;
            this.isPaused = false;
            this.lastTime = performance.now();
            this.hideGameOver();
            this.loop(this.lastTime);
            // Focus canvas for keyboard
            this.canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },

        stop() {
            this.gameActive = false;
            cancelAnimationFrame(this.animationId);
        },

        resetGame() {
            this.score = 0;
            this.lives = 3;
            this.level = 1;
            this.resetLevel();
            this.updateHUD();
        },

        resetLevel() {
            this.bullets = [];
            this.particles = [];

            // Player Pos
            this.player.x = this.width / 2 - this.player.w / 2;
            this.player.y = this.height - 60;
            this.player.movingLeft = false;
            this.player.movingRight = false;

            // Spawn Enemies
            this.enemies = [];
            const startX = 50;
            const startY = 50;
            const gap = 15;
            const w = 30;
            const h = 20;

            // Difficulty config from settings
            let difficulty = 'normal';
            if (window.Arcade && window.Arcade.settings) difficulty = window.Arcade.settings.spaceDifficulty || 'normal';

            this.enemySpeed = (difficulty === 'easy' ? 0.3 : difficulty === 'hard' ? 1.0 : 0.6) + (this.level * 0.1);
            this.enemyFireRate = (difficulty === 'easy' ? 0.0001 : difficulty === 'hard' ? 0.001 : 0.0003) + (this.level * 0.0001);

            for (let r = 0; r < this.enemyRows; r++) {
                for (let c = 0; c < this.enemyCols; c++) {
                    this.enemies.push({
                        x: startX + c * (w + gap),
                        y: startY + r * (h + gap),
                        w: w,
                        h: h,
                        row: r,
                        col: c,
                        active: true
                    });
                }
            }
        },

        fireBullet() {
            if (!this.gameActive || this.player.cooldown > 0) return;

            this.bullets.push({
                x: this.player.x + this.player.w / 2,
                y: this.player.y,
                vy: -8,
                type: 'player'
            });

            // Sound
            if (window.Arcade.Audio) window.Arcade.Audio.pop(); // Reuse pop sound
            this.player.cooldown = 15;
        },

        update(dt) {
            if (this.isPaused) return;

            // Player Cooldown
            if (this.player.cooldown > 0) this.player.cooldown--;
            if (this.player.invulnerable > 0) this.player.invulnerable--;

            // Player Move
            if (this.player.movingLeft && this.player.x > 0) this.player.x -= this.player.speed;
            if (this.player.movingRight && this.player.x + this.player.w < this.width) this.player.x += this.player.speed;

            // Bullets
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const b = this.bullets[i];
                b.y += b.vy;

                // Off screen
                if (b.y < 0 || b.y > this.height) {
                    this.bullets.splice(i, 1);
                    continue;
                }

                // Collisions
                if (b.type === 'player') {
                    // Check Enemies
                    let hit = false;
                    for (let e of this.enemies) {
                        if (e.active && b.x >= e.x && b.x <= e.x + e.w && b.y >= e.y && b.y <= e.y + e.h) {
                            e.active = false;
                            this.bullets.splice(i, 1);
                            this.createExplosion(e.x + e.w / 2, e.y + e.h / 2, '#c084fc');
                            this.score += 10 * this.level;
                            this.updateHUD();
                            hit = true;

                            // Check Win Level
                            if (this.enemies.every(en => !en.active)) {
                                this.level++;
                                setTimeout(() => this.resetLevel(), 1000);
                            }
                            break;
                        }
                    }
                    if (hit) continue;
                } else if (b.type === 'enemy') {
                    // Check Player
                    if (this.player.invulnerable <= 0 &&
                        b.x >= this.player.x && b.x <= this.player.x + this.player.w &&
                        b.y >= this.player.y && b.y <= this.player.y + this.player.h) {
                        this.bullets.splice(i, 1);
                        this.lives--;
                        this.player.invulnerable = 120; // 2 seconds i-frames
                        this.createExplosion(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#ef4444');
                        this.updateHUD();
                        if (this.lives <= 0) this.gameOver();
                        continue;
                    }
                }
            }

            // Enemy Logic (March)
            let hitEdge = false;
            let activeCount = 0;
            // Find rightmost and leftmost active
            for (let e of this.enemies) {
                if (!e.active) continue;
                activeCount++;
                if (this.enemyDir === 1 && e.x + e.w > this.width - 10) hitEdge = true;
                if (this.enemyDir === -1 && e.x < 10) hitEdge = true;

                // Random Fire
                if (Math.random() < this.enemyFireRate) {
                    this.bullets.push({
                        x: e.x + e.w / 2,
                        y: e.y + e.h,
                        vy: 4 + (this.level * 0.5),
                        type: 'enemy'
                    });
                }

                // Lose condition: Touch bottom
                if (e.y + e.h >= this.player.y) {
                    this.gameOver();
                }
            }

            if (hitEdge) {
                this.enemyDir *= -1;
                this.enemies.forEach(e => e.y += this.enemyDropAmount);
            } else {
                this.enemies.forEach(e => {
                    if (e.active) e.x += this.enemySpeed * this.enemyDir;
                });
            }

            // Particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
                if (p.life <= 0) this.particles.splice(i, 1);
            }
        },

        draw() {
            // Bg
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Access theme
            const root = document.body;
            const accent = getComputedStyle(root).getPropertyValue('--accent').trim();

            // Player (Triangle)
            if (this.player.invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
                this.ctx.globalAlpha = 0.5;
            } else {
                this.ctx.globalAlpha = 1.0;
            }

            this.ctx.fillStyle = accent;
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x + this.player.w / 2, this.player.y);
            this.ctx.lineTo(this.player.x + this.player.w, this.player.y + this.player.h);
            this.ctx.lineTo(this.player.x, this.player.y + this.player.h);
            this.ctx.closePath();
            this.ctx.fill();

            // Engines
            if (this.gameActive) {
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.beginPath();
                this.ctx.moveTo(this.player.x + 10, this.player.y + this.player.h);
                this.ctx.lineTo(this.player.x + 20, this.player.y + this.player.h + (Math.random() * 10 + 5));
                this.ctx.lineTo(this.player.x + 30, this.player.y + this.player.h);
                this.ctx.fill();
            }

            this.ctx.globalAlpha = 1.0; // Reset

            // Enemies
            this.enemies.forEach(e => {
                if (!e.active) return;
                // Color based on row
                this.ctx.fillStyle = e.row % 2 === 0 ? '#ff79c6' : '#bd93f9'; // Pink/Purple
                this.ctx.fillRect(e.x, e.y, e.w, e.h);

                // Eyes
                this.ctx.fillStyle = '#282a36';
                this.ctx.fillRect(e.x + 5, e.y + 5, 5, 5);
                this.ctx.fillRect(e.x + e.w - 10, e.y + 5, 5, 5);
            });

            // Bullets
            this.bullets.forEach(b => {
                this.ctx.fillStyle = b.type === 'player' ? '#f8f8f2' : '#ff5555';
                this.ctx.fillRect(b.x - 2, b.y, 4, 10);
            });

            // Particles
            this.particles.forEach(p => {
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.life / 20;
                this.ctx.fillRect(p.x, p.y, 3, 3);
                this.ctx.globalAlpha = 1;
            });
        },

        createExplosion(x, y, color) {
            for (let i = 0; i < 10; i++) {
                this.particles.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 20,
                    color: color
                });
            }
        },

        updateHUD() {
            document.getElementById('space-score').textContent = this.score;
            document.getElementById('space-lives').textContent = "❤️".repeat(Math.max(0, this.lives));
        },

        gameOver() {
            this.gameActive = false;
            document.getElementById('space-game-over').classList.remove('hidden');

            // Save Score
            const oldHigh = window.Arcade.state.highScores['space'] || 0;
            if (this.score > oldHigh) {
                window.Arcade.saveScore('space', this.score);
                window.Arcade.updateUI(); // Updates menu display via monkey patch
            }
        },

        hideGameOver() {
            document.getElementById('space-game-over').classList.add('hidden');
        },

        loop(timestamp) {
            if (!this.gameActive) return;
            const dt = timestamp - this.lastTime;
            this.lastTime = timestamp;

            this.update(dt);
            this.draw();
            this.animationId = requestAnimationFrame((t) => this.loop(t));
        }
    }
};

// Update UI helper to handle Pong AND Space
const originalUpdateUI2 = Arcade.updateUI;
Arcade.updateUI = function () {
    // Call original (which calls Snake/Breakout/Wordle + Pong patch if chain worked, 
    // but the previous monkey patch might be overwritten depending on exec order. 
    // Safest is to just manually re-implement the full check if possible, or chain carefully.)

    // Actually, `games.js` is loaded once. The previous monkey patch for Pong is seemingly "originalUpdateUI" in THIS scope if I define it below.
    // BUT, I'm editing the file, so I need to be careful not to create a loop or lose Pong.

    // We can just inspect the state object directly.

    // 1. Run Base Update (Snake/Breakout/Wordle) from original definition if accessible, 
    // but `Arcade` object was just defined above.
    // The previous Pong patch was at the bottom of the file.

    // Let's just write a clean updateUI that covers ALL games.
    if (this.updateUI_Base) this.updateUI_Base(); // If we saved it

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
};

// Store original base UpdateUI inside Arcade to allow chaining if needed
Arcade.updateUI_Base = originalUpdateUI;

