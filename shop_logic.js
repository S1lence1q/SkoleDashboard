/**
 * SHOP LOGIC OVERRIDE 🛒
 * v20: SIMPLIFIED MODE (Leaderboard Copy)
 * We removed the manual animation logic because it was causing conflicts.
 * Now we just "Open" and let CSS handle the rest.
 */

console.log("🚀 SHOP LOGIC OVERRIDE LOADED v20 (Simple)");

// 1. DATA: Hardcoded Fallback
const FINAL_SHOP_ITEMS = [
    { id: 'paddle-golden', name: 'Golden Paddle', type: 'mod', cost: 1500, desc: '50% Større bat i Pong.' },
    { id: 'life-extra', name: 'Extra Life', type: 'mod', cost: 2000, desc: '+1 Liv i Breakout.' },
    { id: 'snake-slow', name: 'Chill Snake', type: 'mod', cost: 1200, desc: '20% Langsommere slange.' },
    { id: 'theme-matrix', name: 'The Matrix', type: 'theme', cost: 1000, desc: 'Digital grøn kode-regn.' },
    { id: 'theme-sunset', name: 'Vapor Sunset', type: 'theme', cost: 850, desc: 'Retro 80er gradients.' },
    { id: 'theme-ocean', name: 'Deep Ocean', type: 'theme', cost: 500, desc: 'Rolig dybhavs blå.' },
    { id: 'snake-skin-neon', name: 'Neon Snake', type: 'skin', cost: 300, desc: 'Selvlysende slange.' }
];

// Helper to update version tag immediately
function updateVersionDisplay() {
    const vTag = document.getElementById('version-display');
    if (vTag) vTag.textContent = "v22 (Overlap Fix)";
}

// 2. OPEN FUNCTION (Controls Transition)
window.openShop = function () {
    console.log("🛒 Opening Shop (Simple)...");

    const modalId = 'arcade-shop-final';
    const modal = document.getElementById(modalId);

    if (!modal) {
        alert("CRITICAL: Shop Modal '" + modalId + "' not found!");
        return;
    }

    // A. RESET ANIMATION STATE (Crucial Step)
    // We must ensure the 'pop-out' class is gone, so the default 'popIn' from CSS plays.
    const panel = modal.querySelector('.glass-panel');
    if (panel) {
        panel.classList.remove('pop-out-animation');
        // We do NOT add pop-in manually. .glass-panel has it in CSS.
    }

    // B. Show Modal (Just like Leaderboard)
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    // C. Re-trigger Animation (The Leaderboard Trick)
    // If the element was already in DOM, CSS keyframes might not replay.
    // Leaderboard works because it likely toggles display:none which resets animation.
    // Here we force a "Re-Mount" feel by removing/adding the panel's animation class IF needed.
    // BUT the user said Leaderboard works perfectly. Leaderboard calls openModal -> classList.remove('hidden').

    // D. Render Items
    window.renderShopItemsOverride();
    updateVersionDisplay();
};

// 3. CLOSE FUNCTION (Animated)
// We still keep the specific Close logic because we want the smooth exit.
window.closeShop = function () {
    const modal = document.getElementById('arcade-shop-final');
    if (!modal) return;

    const panel = modal.querySelector('.glass-panel');
    if (panel) {
        // Force Exit Anim
        panel.classList.add('pop-out-animation');

        // Wait for animation (150ms)
        setTimeout(() => {
            modal.classList.add('hidden');
            panel.classList.remove('pop-out-animation');
        }, 150);
    } else {
        modal.classList.add('hidden');
    }
};

// 4. RENDER FUNCTION
window.renderShopItemsOverride = function () {
    const list = document.getElementById('shop-items-final');
    if (!list) return;

    list.innerHTML = '';
    list.style.display = 'grid';
    list.style.gridTemplateColumns = '1fr 1fr';
    list.style.gap = '15px';
    list.style.padding = '10px';

    let coins = 0;
    let inventory = [];
    try {
        if (window.Arcade && window.Arcade.state) {
            coins = window.Arcade.state.coins || 0;
            inventory = window.Arcade.state.inventory || [];
        }
    } catch (e) { }

    const coinEl = document.getElementById('shop-coin-count');
    if (coinEl) coinEl.textContent = coins;

    FINAL_SHOP_ITEMS.forEach(item => {
        const owned = inventory.includes(item.id);
        const card = document.createElement('div');

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

        if (!owned) {
            const btn = card.querySelector('button');
            btn.onclick = () => {
                if (window.Arcade && window.Arcade.buyItem) {
                    window.Arcade.buyItem(item.id);
                    window.renderShopItemsOverride();
                }
            };
        }
        list.appendChild(card);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    updateVersionDisplay();
    console.log("Shop Override v20 Ready");
});
