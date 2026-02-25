/**
 * ARK Pulse Drop — Energy System
 * Daily free play limiter with ad bonus
 */
const EnergySystem = (() => {
    const STORAGE_KEY = 'arkPD_energy';

    const LIMITS = {
        guest: { maxPlays: 3, maxAdBonus: 5 },
        login: { maxPlays: 5, maxAdBonus: 5 },
        google: { maxPlays: 5, maxAdBonus: 5 },
        vip: { maxPlays: Infinity, maxAdBonus: 0 }
    };

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return _newDay();
            const d = JSON.parse(raw);
            if (d.date !== _today()) return _newDay();
            return d;
        } catch { return _newDay(); }
    }

    function _save(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function _today() {
        return new Date().toISOString().slice(0, 10);
    }

    function _newDay() {
        const d = { date: _today(), plays: 0, adBonus: 0 };
        _save(d);
        return d;
    }

    function _getConfig(userType) {
        return LIMITS[userType] || LIMITS.guest;
    }

    return {
        /** Check if user has plays remaining */
        canPlay(userType) {
            const cfg = _getConfig(userType);
            if (cfg.maxPlays === Infinity) return true;
            const d = _load();
            return d.plays < cfg.maxPlays;
        },

        /** Consume one play. Returns true if successful */
        consumePlay(userType) {
            const cfg = _getConfig(userType);
            if (cfg.maxPlays === Infinity) return true;
            const d = _load();
            if (d.plays >= cfg.maxPlays) return false;
            d.plays++;
            _save(d);
            return true;
        },

        /** Add +1 play via ad bonus. Returns true if successful */
        addAdBonus(userType) {
            const cfg = _getConfig(userType);
            const d = _load();
            if (d.adBonus >= cfg.maxAdBonus) return false;
            d.adBonus++;
            // Reduce play count by 1 (give back a play)
            if (d.plays > 0) d.plays--;
            _save(d);
            return true;
        },

        /** Get remaining plays */
        getRemainingPlays(userType) {
            const cfg = _getConfig(userType);
            if (cfg.maxPlays === Infinity) return Infinity;
            const d = _load();
            return Math.max(0, cfg.maxPlays - d.plays);
        },

        /** Get remaining ad bonuses */
        getRemainingAdBonuses(userType) {
            const cfg = _getConfig(userType);
            const d = _load();
            return Math.max(0, cfg.maxAdBonus - d.adBonus);
        },

        /** Check if user type has unlimited plays */
        isUnlimited(userType) {
            return _getConfig(userType).maxPlays === Infinity;
        },

        /** Max plays for this user type */
        getMaxPlays(userType) {
            return _getConfig(userType).maxPlays;
        },

        /** Get time until midnight reset (ms) */
        getResetTimeMs() {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            return midnight - now;
        },

        /** Format reset time as HH:MM:SS */
        getResetTimeFormatted() {
            const ms = this.getResetTimeMs();
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    };
})();

// Export for global access
window.EnergySystem = EnergySystem;
