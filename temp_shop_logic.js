window.renderShopInternal = function () {
    console.log("Rendering Shop Internal...");
    const list = document.getElementById('shop-items');
    if (!list) {
        console.error("Shop list element not found!");
        return;
    }

    list.innerHTML = '';
    list.className = 'shop-grid';

    // 1. Guaranteed Data
    const fallbackShop = [
        { id: 'paddle-golden', name: 'Golden Paddle', type: 'mod', cost: 1500, desc: '50% Større bat i Pong & Breakout.' },
        { id: 'life-extra', name: 'Extra Life', type: 'mod', cost: 2000, desc: '+1 Liv i Breakout (Permanent).' },
        { id: 'snake-slow', name: 'Chill Snake', type: 'mod', cost: 1200, desc: '20% Langsommere slange.' },
        { id: 'theme-matrix', name: 'The Matrix', type: 'theme', cost: 1000, desc: 'Digital grøn kode-regn.' },
        { id: 'theme-sunset', name: 'Vapor Sunset', type: 'theme', cost: 850, desc: 'Retro 80er gradients.' },
        { id: 'theme-ocean', name: 'Deep Ocean', type: 'theme', cost: 500, desc: 'Rolig dybhavs blå.' },
        { id: 'snake-skin-neon', name: 'Neon Snake', type: 'skin', cost: 300, desc: 'Selvlysende slange.' }
    ];

    let items = fallbackShop;
    let inventory = [];
    let coins = 0;

    // 2. Try to get Real Data
    if (window.Arcade && window.Arcade.shop && window.Arcade.shop.length > 0) {
        items = window.Arcade.shop;
    }
    if (window.Arcade && window.Arcade.state) {
        inventory = window.Arcade.state.inventory || [];
        coins = window.Arcade.state.coins || 0;
    }

    // 3. Render
    items.forEach(item => {
        const owned = inventory.includes(item.id);
        const canAfford = coins >= item.cost;
        const isActive = document.body.classList.contains(item.id);

        const card = document.createElement('div');
        card.className = 'shop-card ' + (owned ? 'owned' : '') + (isActive ? ' active-theme' : '');

        let icon = "📦";
        if (item.id.includes('matrix')) icon = "💻";
        else if (item.id.includes('sunset')) icon = "🌅";
        else if (item.id.includes('ocean')) icon = "🌊";
        else if (item.id.includes('golden')) icon = "🏏";
        else if (item.id.includes('life')) icon = "❤️";
        else if (item.id.includes('slow')) icon = "🐌";
        else if (item.id.includes('neon')) icon = "🌟";
        else if (item.id.includes('paddle')) icon = "🏓";

        let btnHTML = "";

        if (owned) {
            if (item.type === 'theme') {
                if (isActive) {
                    btnHTML = `<button class="btn small disabled active-btn">Valgt</button>`;
                } else {
                    btnHTML = `<button class="btn secondary small" onclick="window.Arcade.equipTheme('${item.id}'); window.renderShopInternal();">Vælg</button>`;
                }
            } else if (item.type === 'mod') {
                btnHTML = `<button class="btn small disabled mod-active">Aktiv</button>`;
            } else {
                btnHTML = `<button class="btn small disabled">Ejet</button>`;
            }
        } else {
            if (canAfford) {
                btnHTML = `<button class="btn primary small buy-btn" onclick="if(window.Arcade.buyItem('${item.id}')) window.renderShopInternal();">${item.cost} 🪙</button>`;
            } else {
                btnHTML = `<button class="btn small disabled">${item.cost} 🪙</button>`;
            }
        }

        card.innerHTML = `
            <div class="shop-icon">${icon}</div>
            <div class="shop-info">
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
            </div>
            <div class="shop-actions">
                ${btnHTML}
            </div>
        `;
        list.appendChild(card);
    });
};

// Override openShop to use Internal Renders
window.openShop = () => {
    openModal('arcade-shop');
    setTimeout(window.renderShopInternal, 50); // Slight delay to ensure DOM is ready
};
