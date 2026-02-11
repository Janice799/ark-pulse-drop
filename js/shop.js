/**
 * ARK Pulse Drop — Skin & Coin System
 * Earn coins by playing → unlock skins → IAP coin packs for conversion ↑
 */
const SkinShop = (() => {
    const STORAGE_KEY = 'arkPD_shop';

    // ─── Skin Definitions ──────────────────────
    const SKINS = [
        {
            id: 'default', name: 'Pulse Blue', price: 0,
            ring: '#7fe0ff', glow: 'rgba(127,224,255,', particle: '#7fe0ff',
            desc: 'Classic pulse',
        },
        {
            id: 'neon_green', name: 'Neon Mint', price: 200,
            ring: '#62ffb3', glow: 'rgba(98,255,179,', particle: '#62ffb3',
            desc: 'Fresh & sharp',
        },
        {
            id: 'violet', name: 'Deep Violet', price: 350,
            ring: '#b07bff', glow: 'rgba(176,123,255,', particle: '#b07bff',
            desc: 'Royal energy',
        },
        {
            id: 'sunset', name: 'Sunset Blaze', price: 500,
            ring: '#ff9a5c', glow: 'rgba(255,154,92,', particle: '#ff9a5c',
            desc: 'Burning rhythm',
        },
        {
            id: 'rose', name: 'Rose Gold', price: 500,
            ring: '#ffb3c6', glow: 'rgba(255,179,198,', particle: '#ffb3c6',
            desc: 'Elegant beats',
        },
        {
            id: 'ice', name: 'Arctic Ice', price: 750,
            ring: '#b3ecff', glow: 'rgba(179,236,255,', particle: '#b3ecff',
            desc: 'Sub-zero focus', trail: true,
        },
        {
            id: 'gold', name: 'Pure Gold', price: 1000,
            ring: '#ffd700', glow: 'rgba(255,215,0,', particle: '#ffd700',
            desc: 'Champion tier', trail: true,
        },
        {
            id: 'rainbow', name: 'Prismatic', price: 2000,
            ring: 'rainbow', glow: 'rgba(255,255,255,', particle: '#ffffff',
            desc: 'Ultimate flex', trail: true, rainbow: true,
        },
    ];

    // ─── State ──────────────────────────────────
    let coins = 0;
    let equippedSkin = 'default';
    let unlockedSkins = ['default'];

    function _load() {
        try {
            const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (d) {
                coins = d.coins || 0;
                equippedSkin = d.equipped || 'default';
                unlockedSkins = d.unlocked || ['default'];
            }
        } catch (e) { }
    }

    function _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            coins, equipped: equippedSkin, unlocked: unlockedSkins,
        }));
    }

    _load();

    function addCoins(amount) { coins += amount; _save(); }
    function getCoins() { return coins; }

    function buySkin(skinId) {
        const skin = SKINS.find(s => s.id === skinId);
        if (!skin) return { ok: false, msg: 'Not found' };
        if (unlockedSkins.includes(skinId)) return { ok: false, msg: 'Already owned' };
        if (coins < skin.price) return { ok: false, msg: 'Not enough coins' };
        coins -= skin.price;
        unlockedSkins.push(skinId);
        _save();
        return { ok: true };
    }

    function equipSkin(skinId) {
        if (!unlockedSkins.includes(skinId)) return false;
        equippedSkin = skinId;
        _save();
        return true;
    }

    function getCurrentSkin() {
        return SKINS.find(s => s.id === equippedSkin) || SKINS[0];
    }

    function isUnlocked(skinId) { return unlockedSkins.includes(skinId); }
    function getSkins() { return SKINS; }
    function getEquippedId() { return equippedSkin; }

    // Coin earning formula per game
    function calcEarnedCoins(score, maxCombo, level) {
        return Math.floor(score * 0.15) + maxCombo * 2 + level * 5;
    }

    // IAP coin packs (for future store integration)
    const COIN_PACKS = [
        { id: 'pack_s', coins: 500, price: '$0.99', bonus: '' },
        { id: 'pack_m', coins: 1200, price: '$1.99', bonus: '+20%' },
        { id: 'pack_l', coins: 3000, price: '$3.99', bonus: '+50%' },
        { id: 'pack_xl', coins: 8000, price: '$7.99', bonus: 'BEST' },
    ];

    function getCoinPacks() { return COIN_PACKS; }

    return {
        addCoins, getCoins, buySkin, equipSkin, getCurrentSkin,
        isUnlocked, getSkins, getEquippedId, calcEarnedCoins, getCoinPacks,
    };
})();

window.SkinShop = SkinShop;
