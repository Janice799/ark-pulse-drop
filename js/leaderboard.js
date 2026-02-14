/**
 * ARK Pulse Drop — Leaderboard v2.0 (Firebase Global + Local Fallback)
 * Global mode: Firebase Realtime Database
 * Local fallback: localStorage (offline)
 */
const Leaderboard = (() => {
    const STORAGE_KEY = 'arkPD_lb';
    const MAX_ENTRIES = 50;

    let entries = [];
    let globalEntries = [];
    let playerName = localStorage.getItem('arkPD_name') || '';
    let mode = 'local'; // 'local' | 'global'
    let unsubscribe = null;

    function _loadLocal() {
        try {
            entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) { entries = []; }
    }

    function _saveLocal() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    }

    _loadLocal();

    // ─── Initialize with Firebase ───────────────
    async function initGlobal() {
        if (!window.FirebaseService || !FirebaseService.ready) {
            console.log('[Leaderboard] Firebase not ready, using local mode');
            mode = 'local';
            return;
        }

        try {
            // Auto sign-in anonymously if not signed in
            if (!FirebaseService.isSignedIn()) {
                await FirebaseService.signInAnon();
            }

            // Start real-time listener
            unsubscribe = FirebaseService.onScoresUpdate(50, (scores) => {
                globalEntries = scores;
                console.log('[Leaderboard] 🌐 Global scores updated:', scores.length);
            });

            mode = 'global';
            console.log('[Leaderboard] ✅ Global mode active');
        } catch (err) {
            console.error('[Leaderboard] Global init failed, fallback to local:', err);
            mode = 'local';
        }
    }

    // ─── Submit Score ───────────────────────────
    async function submitScore(score, level, maxCombo, difficulty, accuracy) {
        if (!playerName) return false;

        const entry = {
            name: playerName,
            score,
            level,
            combo: maxCombo,
            difficulty: difficulty || 1,
            accuracy: accuracy || 0,
            date: new Date().toISOString(),
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        };

        // Always save locally
        entries.push(entry);
        entries.sort((a, b) => b.score - a.score);
        entries = entries.slice(0, MAX_ENTRIES);
        _saveLocal();

        // Also submit to Firebase if available
        if (mode === 'global' && window.FirebaseService && FirebaseService.isSignedIn()) {
            try {
                await FirebaseService.submitScore(entry);
                console.log('[Leaderboard] Score submitted globally');
            } catch (err) {
                console.warn('[Leaderboard] Global submit failed, saved locally', err);
            }
        }

        return true;
    }

    // ─── Get Scores ─────────────────────────────
    async function getTopScores(limit = 10) {
        if (mode === 'global' && globalEntries.length > 0) {
            return globalEntries.slice(0, limit);
        }
        return entries.slice(0, limit);
    }

    // ─── Player Name ────────────────────────────
    function setPlayerName(name) {
        playerName = name.trim().slice(0, 12);
        localStorage.setItem('arkPD_name', playerName);
    }

    function getPlayerName() { return playerName; }
    function hasName() { return playerName.length > 0; }

    function getPlayerRank(score) {
        const list = mode === 'global' && globalEntries.length > 0 ? globalEntries : entries;
        const idx = list.findIndex(e => score >= e.score);
        return idx === -1 ? list.length + 1 : idx + 1;
    }

    // ─── Management ─────────────────────────────
    function clearAll() {
        entries = [];
        localStorage.removeItem(STORAGE_KEY);
    }

    function deleteByIndex(index) {
        if (index >= 0 && index < entries.length) {
            entries.splice(index, 1);
            _saveLocal();
        }
    }

    function getMode() { return mode; }
    function isGlobal() { return mode === 'global'; }

    return {
        initGlobal,
        submitScore, getTopScores,
        setPlayerName, getPlayerName, hasName,
        getPlayerRank, clearAll, deleteByIndex,
        getMode, isGlobal
    };
})();

window.Leaderboard = Leaderboard;
