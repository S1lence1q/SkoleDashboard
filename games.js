/**
 * SKOLE DASHBOARD - ARCADE ENGINE 🕹️
 * Handles all game logic, settings, and high scores.
 */

window.Arcade = {
    settings: {
        soundEnabled: true, // NEW
        snakeSpeed: 100, // ms
        snakeWalls: true, // Die on wall hit
        snakeTheme: 'classic' // classic, neon, retro
    },
    state: {
        activeGame: null,
        highScores: JSON.parse(localStorage.getItem('arcade_scores')) || {}
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
        const currentHigh = this.state.highScores[game] || 0;
        if (score > currentHigh) {
            this.state.highScores[game] = score;
            localStorage.setItem('arcade_scores', JSON.stringify(this.state.highScores));
            return true; // New High Score!
        }
        return false;
    },

    updateUI() {
        // Update High Score displays
        const snakeHigh = this.state.highScores['snake'] || 0;
        const shEl = document.getElementById('snake-highscore-display');
        if (shEl) shEl.textContent = `Rekord: ${snakeHigh}`;

        const breakoutHigh = this.state.highScores['breakout'] || 0;
        const bhEl = document.getElementById('breakout-highscore-display');
        if (bhEl) bhEl.textContent = `Rekord: ${breakoutHigh}`;

        const wordleHigh = this.state.highScores['wordle'] || 0;
        const whEl = document.getElementById('wordle-highscore-display');
        if (whEl) whEl.textContent = `Rekord: ${wordleHigh}`;
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
                    this.gameInterval = setInterval(this.loop.bind(this), Arcade.settings.snakeSpeed);
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

            // Reset Game & Timers
            if (this.wideTimer) clearTimeout(this.wideTimer);
            if (this.superTimer) clearTimeout(this.superTimer);
            this.wideTimer = null;
            this.superTimer = null;

            this.score = 0;
            // Read Setting or Default to 3
            this.lives = (window.Arcade && window.Arcade.settings && window.Arcade.settings.breakoutLives)
                ? window.Arcade.settings.breakoutLives
                : 3;
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
            if (this.paddle.x + this.paddle.w > this.canvas.width) this.paddle.x = this.canvas.width - this.paddle.w;

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
                    if (b.x + b.dx > this.canvas.width - b.r || b.x + b.dx < b.r) {
                        b.dx = -b.dx;
                        if (Arcade.Audio) Arcade.Audio.boop();
                    }
                    if (b.y + b.dy < b.r) {
                        b.dy = -b.dy;
                        if (Arcade.Audio) Arcade.Audio.boop();
                    } else if (b.y + b.dy > this.canvas.height - b.r) {
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
                    c: 8,
                    w: 0,
                    h: 20,
                    padding: 10,
                    offsetLeft: 30,
                    offsetTop: 50
                };
            }

            const { c, padding, offsetTop } = this.brickConfig;

            // DYNAMIC DIFFICULTY: INCREASE ROWS WITH LEVEL
            let targetRows = Math.min(3 + Math.floor(this.level / 2), 8);
            // Level 1: 3 rows, Level 3: 4 rows, Level 5: 5 rows... Max 8.
            this.brickConfig.r = targetRows;
            const r = targetRows;

            // 1. CALCULATE WIDTH & CENTERING
            // We want a fixed width for the "game board" area or just maximize space?
            // Let's maximize space but keep it centered.
            // Available width = Canvas Width - (Margins). Let's say 20px margin each side minimum.
            const availableWidth = this.canvas.width - 40;

            // Calculate brick width based on available space
            // totalW = c * w + (c - 1) * padding
            // w = (totalW - (c-1)*padding) / c
            const newW = Math.floor((availableWidth - ((c - 1) * padding)) / c);
            this.brickConfig.w = newW; // CRITICAL: Assign to config so drawBricks can see it!
            this.brickConfig.h = 20;   // Ensure height is set

            // Calculate exact offsetLeft to center strictly
            const totalContentWidth = (c * newW) + ((c - 1) * padding);
            const centeringOffset = (this.canvas.width - totalContentWidth) / 2;
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

                        this.ctx.beginPath();
                        this.ctx.roundRect(brickX, brickY, w, h, 4);

                        // Base Color
                        const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fde047'];
                        this.ctx.fillStyle = colors[j] || "#fff";
                        this.ctx.fill();

                        // Visuals for Hard Bricks (Reinforced Look)
                        // Visuals for Hard Bricks (Striped Texture)
                        if (b.maxHealth > 1) {
                            this.ctx.save();
                            this.ctx.beginPath();
                            this.ctx.roundRect(brickX, brickY, w, h, 4);
                            this.ctx.clip(); // Clip drawing to brick shape

                            this.ctx.strokeStyle = "rgba(0,0,0,0.15)";
                            this.ctx.lineWidth = 2;

                            // Draw diagonal lines
                            const spacing = 6;
                            for (let x = -h; x < w; x += spacing) {
                                this.ctx.beginPath();
                                this.ctx.moveTo(brickX + x, brickY + h);
                                this.ctx.lineTo(brickX + x + h, brickY);
                                this.ctx.stroke();
                            }

                            // Darker Overlay for Max Level
                            if (b.maxHealth > 2) {
                                this.ctx.fillStyle = "rgba(0,0,0,0.2)";
                                this.ctx.fill();
                            }

                            this.ctx.restore();
                        }

                        // Cracks (If damaged)
                        if (b.status < b.maxHealth) {
                            this.ctx.strokeStyle = "rgba(0,0,0,0.6)";
                            this.ctx.lineWidth = 1.5;
                            this.ctx.beginPath();
                            // Simple Zigzag Crack
                            this.ctx.moveTo(brickX + w * 0.2, brickY + h * 0.2);
                            this.ctx.lineTo(brickX + w * 0.5, brickY + h * 0.5);
                            this.ctx.lineTo(brickX + w * 0.3, brickY + h * 0.8);
                            this.ctx.lineTo(brickX + w * 0.7, brickY + h * 0.6);
                            // Second Crack if very damaged (1 health left on a 3 health brick)
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

        boundHandleKey: null,

        start() {
            this.gameActive = true;
            this.currentRow = 0;
            this.currentCol = 0;
            this.guess = [];
            this.gridState = Array(6).fill().map(() => Array(5).fill('')); // Empty Grid

            // Pick Word
            const list = window.WordleData.solutions;
            this.solution = list[Math.floor(Math.random() * list.length)].toUpperCase();
            console.log("Solution:", this.solution); // Debug

            // UI
            this.renderBoard();
            this.renderKeyboard();
            document.getElementById('wordle-game-over').classList.add('hidden');

            // Listeners
            // Fix: Store reference to remove exact listener later
            if (this.boundHandleKey) {
                document.removeEventListener('keydown', this.boundHandleKey);
            }
            this.boundHandleKey = this.handleKey.bind(this);
            document.addEventListener('keydown', this.boundHandleKey);
        },

        stop() {
            this.gameActive = false;
            if (this.boundHandleKey) {
                document.removeEventListener('keydown', this.boundHandleKey);
                this.boundHandleKey = null;
            }
        },

        handleKey(e) {
            if (!this.gameActive) return;
            const key = e.key.toUpperCase();

            if (key === 'ENTER') this.submitGuess();
            else if (key === 'BACKSPACE') this.deleteLetter();
            else if (/^[A-Z]$/.test(key)) this.addLetter(key);
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

        submitGuess() {
            if (this.guess.length !== 5) {
                this.shakeRow();
                if (Arcade.Audio) Arcade.Audio.invalid();
                return;
            }

            const word = this.guess.join('');

            // Dictionary Check
            const validList = window.WordleDictionary || window.WordleData.valid;
            const solList = window.WordleData.solutions;

            if (!validList.includes(word) && !solList.includes(word)) {
                this.shakeRow();
                // Show "Not in word list" toast? For now just shake/sound
                if (Arcade.Audio) Arcade.Audio.invalid();
                return;
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
                // Win/Loss Check
                if (guessWord === this.solution) {
                    this.streak++;
                    document.getElementById('wordle-current-streak').textContent = this.streak;
                    Arcade.saveScore('wordle', this.streak); // Save Best Streak
                    Arcade.updateUI(); // Force UI update
                    if (Arcade.Audio) Arcade.Audio.wordleWin();
                    this.gameOver(true);
                } else if (this.currentRow === 5) {
                    this.streak = 0; // Reset Streak on loss
                    document.getElementById('wordle-current-streak').textContent = this.streak;
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
        }
    },

    // --- PONG ---
    Pong: {
        canvas: null,
        ctx: null,
        animationId: null,
        animationId: null,
        gameActive: false,
        waitingToServe: true, // NEW
        width: 600,
        height: 400,

        // State
        player: { y: 150, h: 80, w: 12, score: 0, dy: 0, speed: 6 },
        cpu: { y: 150, h: 80, w: 12, score: 0, speed: 3.2 }, // Tuned speed
        ball: { x: 300, y: 200, r: 8, dx: 4, dy: 4, speed: 5 },

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
            if (!this.canvas) this.init();
            this.gameActive = true;
            this.resetGame();

            // Apply Settings
            const s = Arcade.settings;
            // Maybe difficulty setting later?

            this.loop();
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
            this.ball.speed = 5;
            this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
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

            // Wall Collision (Top/Bottom)
            if (this.ball.y - this.ball.r < 0 || this.ball.y + this.ball.r > this.height) {
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
            const root = document.documentElement;
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

            // Ball - White
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
            this.ctx.fill();

            // Instructions
            if (this.waitingToServe) {
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
    }
};

// Update UI helper to handle Pong
const originalUpdateUI = Arcade.updateUI;
Arcade.updateUI = function () {
    // Call original logic (Snake, Breakout, Wordle)
    originalUpdateUI.call(Arcade);

    // Pong logic
    const pongWins = this.state.highScores['pong_wins'] || 0;
    const el = document.getElementById('pong-highscore-display');
    if (el) el.textContent = `Sejre: ${pongWins}`;
};
