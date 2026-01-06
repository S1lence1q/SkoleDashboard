
/**
 * AETHER AUDIO ENGINE 🌌
 * YouTube Embed + Canvas Visualizer
 */

const Aether = {
    player: null,
    isPlaying: false,
    volume: 50,
    currentTrack: "Ingen musik valgt",
    visualizerActive: false,

    // Config
    presets: {
        'lofi': { id: 'jfKfPfyJRdk', name: 'Lofi Girl ☕' },
        'synth': { id: '4xDxr3qvltg', name: 'Synthwave Radio 🚗' },
        'coding': { id: 'f02mOEt11OQ', name: 'Chillstep Focus 💻' }
    },

    init() {
        console.log("🌌 Aether Init...");

        // Load YouTube Iframe API
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Start Visualizer Loop
        this.initVisualizer();
    },

    // Called by YouTube API when ready
    onPlayerReady(event) {
        console.log("🌌 Player Ready");
        Aether.player = event.target;
        Aether.setVolume(Aether.volume);
    },

    loadVideo(id, name) {
        if (!this.player) return;
        this.currentTrack = name || "YouTube Stream";
        this.player.loadVideoById(id);
        this.isPlaying = true;
        this.updateUI();
        this.startArtAnimation();
    },

    loadFromInput() {
        const input = document.getElementById('aether-input');
        const url = input.value;
        const id = this.extractVideoID(url);

        if (id) {
            this.loadVideo(id, "Custom Track");
            input.value = "";
        } else {
            alert("Kunne ikke finde video ID. Prøv et YouTube link.");
        }
    },

    loadPreset(key) {
        const preset = this.presets[key];
        if (preset) {
            this.loadVideo(preset.id, preset.name);
        }
    },

    extractVideoID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    },

    togglePlay() {
        if (!this.player) return;
        if (this.isPlaying) {
            this.player.pauseVideo();
            this.stopArtAnimation();
        } else {
            this.player.playVideo();
            this.startArtAnimation();
        }
        this.isPlaying = !this.isPlaying;
        this.updateUI();
    },

    setVolume(val) {
        this.volume = val;
        if (this.player) {
            this.player.setVolume(val);
        }
    },

    updateUI() {
        document.getElementById('aether-track-name').textContent = this.currentTrack;
        document.getElementById('aether-status').textContent = this.isPlaying ? "Spiller nu..." : "Pauset";

        const art = document.querySelector('.aether-album-art');
        if (this.isPlaying) art.classList.add('playing');
        else art.classList.remove('playing');
    },

    startArtAnimation() {
        document.querySelector('.aether-album-art').classList.add('playing');
    },

    stopArtAnimation() {
        document.querySelector('.aether-album-art').classList.remove('playing');
    },

    // --- VISUALIZER (Simulated) ---
    initVisualizer() {
        const canvas = document.getElementById('aether-canvas');
        const ctx = canvas.getContext('2d');
        let particles = [];

        // Resize
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2;
                this.speedX = (Math.random() - 0.5) * 0.5;
                this.speedY = (Math.random() - 0.5) * 0.5;
                this.opacity = Math.random() * 0.5;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (Aether.isPlaying) {
                    // React to "music" (Active mode)
                    this.speedX += (Math.random() - 0.5) * 0.1;
                    this.speedY += (Math.random() - 0.5) * 0.1;
                }

                if (this.x > canvas.width) this.x = 0;
                if (this.x < 0) this.x = canvas.width;
                if (this.y > canvas.height) this.y = 0;
                if (this.y < 0) this.y = canvas.height;
            }
            draw() {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Create particles
        for (let i = 0; i < 100; i++) particles.push(new Particle());

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Starfield
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Draw Frequency Waves (Simulated)
            if (Aether.isPlaying) {
                const centerY = canvas.height / 2;
                ctx.beginPath();
                ctx.moveTo(0, centerY);
                for (let i = 0; i < canvas.width; i += 10) {
                    const amplitude = Math.random() * 50;
                    ctx.lineTo(i, centerY + Math.sin(i * 0.01 + Date.now() * 0.002) * amplitude);
                }
                ctx.strokeStyle = `rgba(168, 85, 247, 0.2)`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            requestAnimationFrame(animate);
        }
        animate();
    }
};

// Global Helper
function toggleAether(show) {
    const overlay = document.getElementById('aether-overlay');
    if (show) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');
}

// Global YouTube Callback
function onYouTubeIframeAPIReady() {
    new YT.Player('yt-player-container', {
        height: '0',
        width: '0',
        videoId: '',
        events: {
            'onReady': Aether.onPlayerReady,
            // 'onStateChange': onPlayerStateChange
        }
    });
}

// Auto Init
Aether.init();
