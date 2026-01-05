/**
 * RESCUE SHOP SCRIPT V2 🚑
 * Targets new ID 'arcade-shop-v2'
 */
console.log("🚑 RESCUE SHOP V2 LOADED");

// 0. Inject Guaranteed Styles
const style = document.createElement('style');
style.innerHTML = `
@keyframes popInV2 {
    0% { transform: scale(0.95); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}
.animate-v2 {
    animation: popInV2 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards !important;
}
`;
document.head.appendChild(style);

const RESCUE_SHOP_ITEMS = [
    { id: 'paddle-golden', name: 'Golden Paddle', type: 'mod', cost: 1500, desc: '50% Større bat i Pong & Breakout.' },
    { id: 'life-extra', name: 'Extra Life', type: 'mod', cost: 2000, desc: '+1 Liv i Breakout (Permanent).' },
    { id: 'snake-slow', name: 'Chill Snake', type: 'mod', cost: 1200, desc: '20% Langsommere slange.' },
    { id: 'theme-matrix', name: 'The Matrix', type: 'theme', cost: 1000, desc: 'Digital grøn kode-regn.' },
    { id: 'theme-sunset', name: 'Vapor Sunset', type: 'theme', cost: 850, desc: 'Retro 80er gradients.' },
    { id: 'theme-ocean', name: 'Deep Ocean', type: 'theme', cost: 500, desc: 'Rolig dybhavs blå.' },
    { id: 'snake-skin-neon', name: 'Neon Snake', type: 'skin', cost: 300, desc: 'Selvlysende slange.' }
];

window.openShop = function () {
    console.log("🚑 RESCUE V2: Opening Shop...");

    // TARGET V2 ID
    const modal = document.getElementById('arcade-shop-v2');

    if (modal) {
        modal.classList.remove('hidden');

        // Force Animation V2
        const panel = modal.querySelector('.glass-panel');
        if (panel) {
            panel.classList.remove('animate-v2');
            void panel.offsetWidth; // trigger reflow
            panel.classList.add('animate-v2');
        }
    } else {
        console.error("Shop V2 ID not found");
        // Fallback just in case
        const old = document.getElementById('arcade-shop');
        if (old) old.classList.remove('hidden');
        else alert("Fejl: Shop vindue ikke fundet (V2)");
        return;
    }

    // Check Backdrop
    // Check Backdrop
    if (window.checkBackdrop) {
        window.checkBackdrop();
        // Force check if needed
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop && backdrop.classList.contains('hidden')) backdrop.classList.remove('hidden');
    }

    const list = document.getElementById('shop-items-v2');
    if (!list) {
        alert("CRITICAL ERROR: #shop-items-v2 missing!");
        return;
    }

    // DEBUG PROOF
    // alert("Rescuing Shop..."); // Disable if annoying, but good for first run

    // FORCE STYLES (Ignore CSS file)
    list.style.display = 'grid';
    list.style.gridTemplateColumns = '1fr 1fr';
    list.style.gap = '15px';
    list.style.padding = '10px';
    list.style.height = 'auto';
    list.style.maxHeight = '400px';
    list.style.overflowY = 'auto'; // Ensure scrolling works
    list.style.visibility = 'visible'; // Ensure it's not hidden
    list.style.opacity = '1';

    list.innerHTML = '';
    list.className = 'shop-grid'; // Keep class for shared styles too

    RESCUE_SHOP_ITEMS.forEach(item => {
        let owned = false;
        let coins = 0;
        // Try safe state access
        try {
            if (window.Arcade && window.Arcade.state) {
                owned = window.Arcade.state.inventory.includes(item.id);
                coins = window.Arcade.state.coins;
            }
        } catch (e) { }

        const canAfford = coins >= item.cost;
        const isActive = document.body.classList.contains(item.id);

        const card = document.createElement('div');
        card.className = 'shop-card ' + (owned ? 'owned' : '') + (isActive ? ' active-theme' : '');

        let btnHTML = "";
        if (owned) {
            if (item.type === 'theme') {
                if (isActive) btnHTML = `<button class="btn small disabled active-btn">Valgt</button>`;
                else btnHTML = `<button class="btn secondary small" onclick="window.Arcade.equipTheme('${item.id}'); window.openShop();">Vælg</button>`;
            } else {
                btnHTML = `<button class="btn small disabled">Ejet</button>`;
            }
        } else {
            if (canAfford) {
                btnHTML = `<button class="btn primary small buy-btn" onclick="if(window.Arcade.buyItem('${item.id}')) window.openShop();">${item.cost} 🪙</button>`;
            } else {
                btnHTML = `<button class="btn small disabled">${item.cost} 🪙</button>`;
            }
        }

        let icon = "📦";
        if (item.id.includes('matrix')) icon = "💻";
        else if (item.id.includes('sunset')) icon = "🌅";
        else if (item.id.includes('ocean')) icon = "🌊";
        else if (item.id.includes('golden')) icon = "🏏";
        else if (item.id.includes('life')) icon = "❤️";
        else if (item.id.includes('slow')) icon = "🐌";
        else if (item.id.includes('neon')) icon = "🌟";
        else if (item.id.includes('paddle')) icon = "🏓";

        card.innerHTML = `
            <div class="shop-icon">${icon}</div>
            <div class="shop-info">
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
            </div>
            <div class="shop-actions">${btnHTML}</div>
        `;
        list.appendChild(card);
    });
};

window.closeShop = function () {
    const modal = document.getElementById('arcade-shop-v2');
    if (modal) modal.classList.add('hidden');

    // Fallback close
    const old = document.getElementById('arcade-shop');
    if (old) old.classList.add('hidden');

    if (window.checkBackdrop) setTimeout(window.checkBackdrop, 50);
};
