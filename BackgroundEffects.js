
/**
 * BACKGROUND EFFECTS ENGINE 🌤️✨
 * A subtle, high-performance canvas layer for weather and theme-based visuals.
 */

const BackgroundEffects = {
    canvas: null,
    ctx: null,
    weatherParticles: [],
    animationId: null,

    // State
    enabled: localStorage.getItem('bg_effects_enabled') !== 'false',
    currentWeather: 'clear', // 'clear', 'rain', 'snow', 'cloudy'
    currentTheme: 'theme-midnight',
    isDay: true,
    isForced: false, // Flag for God Mode testing

    init() {
        console.log("🌤️ Background Effects Init...");
        this.canvas = document.getElementById('bg-effects-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // Resize
        window.addEventListener('resize', () => this.resize());
        this.resize();

        // Start Loop
        this.render();
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.createParticles();
    },

    setWeather(code, isDay, force = false) {
        if (this.isForced && !force) return; // Ignore real updates if forced
        if (force) this.isForced = true;

        this.isDay = isDay;
        // Map Open-Meteo codes to our states
        if (code === 0) this.currentWeather = 'clear';
        else if (code >= 1 && code <= 3) this.currentWeather = 'cloudy';
        else if (code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95) this.currentWeather = 'rain';
        else if (code >= 71 && code <= 77) this.currentWeather = 'snow';
        else this.currentWeather = 'cloudy';

        this.createParticles();
    },

    setTheme(themeName, force = false) {
        if (this.isForced && !force) return;
        if (force) this.isForced = true;

        this.currentTheme = themeName;
        this.createParticles();
    },

    toggle(state) {
        this.enabled = state !== undefined ? state : !this.enabled;
        localStorage.setItem('bg_effects_enabled', this.enabled);
        if (!this.enabled) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.createParticles();
        }
    },

    resetForce() {
        this.isForced = false;
        // Re-trigger from real states
        if (window.fetchWeather) window.fetchWeather();
        if (window.currentState && window.currentState.currentTheme) {
            this.setTheme(window.currentState.currentTheme);
        }
    },

    createParticles() {
        this.weatherParticles = [];
        const count = 60; // Clean density for weather only

        for (let i = 0; i < count; i++) {
            this.weatherParticles.push(this.getParticleType());
        }
    },

    getParticleType() {
        const base = {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 2 + 1,
            speedX: (Math.random() - 0.5) * 0.1,
            speedY: Math.random() * 0.3 + 0.1,
            opacity: Math.random() * 0.15 + 0.05,
            color: 'rgba(255, 255, 255, ' // Natural White/Translucent
        };

        // WEATHER LOGIC
        if (this.currentWeather === 'rain') {
            base.speedY = Math.random() * 5 + 5;
            base.speedX = -1;
            base.size = 1;
            base.isRain = true;
        } else if (this.currentWeather === 'snow') {
            base.speedY = Math.random() * 1 + 0.2;
            base.speedX = (Math.random() - 0.5) * 0.5;
            base.size = Math.random() * 3 + 1;
            base.isSnow = true;
        } else if (this.currentWeather === 'clear' && this.isDay) {
            base.isSun = true;
            base.speedY = -0.05;
        }

        return base;
    },

    update() {
        if (!this.enabled) return;
        this.weatherParticles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;

            // Loop screen
            if (p.y > this.canvas.height) {
                p.y = -10;
                p.x = Math.random() * this.canvas.width;
            }
            if (p.x > this.canvas.width) p.x = 0;
            if (p.x < 0) p.x = this.canvas.width;
        });
    },

    draw() {
        if (!this.enabled) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.weatherParticles.forEach(p => {
            this.ctx.fillStyle = p.color + p.opacity + ')';

            if (p.isRain) {
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x + 1, p.y + 10);
                this.ctx.strokeStyle = p.color + (p.opacity * 0.5) + ')';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            } else if (p.isMatrix) {
                this.ctx.font = '10px monospace';
                this.ctx.fillText(Math.floor(Math.random() * 2), p.x, p.y);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Subtle "Light Shafts" for sun (Draw only a few)
            if (p.isSun && Math.random() > 0.998) {
                const gradient = this.ctx.createLinearGradient(p.x, 0, p.x + 50, this.canvas.height);
                gradient.addColorStop(0, 'rgba(255, 230, 150, 0.03)');
                gradient.addColorStop(0.5, 'rgba(255, 230, 150, 0.01)');
                gradient.addColorStop(1, 'rgba(255, 230, 150, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.moveTo(p.x - 100, 0);
                this.ctx.lineTo(p.x + 100, 0);
                this.ctx.lineTo(p.x + 400, this.canvas.height);
                this.ctx.lineTo(p.x + 100, this.canvas.height);
                this.ctx.fill();
            }
        });
    },

    render() {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.render());
    }
};

// Export to window
window.BackgroundEffects = BackgroundEffects;

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BackgroundEffects.init());
} else {
    BackgroundEffects.init();
}
