/**
 * ARK Pulse Drop — Leaderboard (Serverless-Ready)
 * Local mode: localStorage
 * Online mode: swap _post/_fetch with Supabase/Firebase calls
 */
const Leaderboard = (() => {
    const STORAGE_KEY = 'arkPD_lb';
    const MAX_ENTRIES = 50;

    let entries = [];
    let playerName = localStorage.getItem('arkPD_name') || '';

    function _load() {
        try {
            entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) { entries = []; }
    }

    function _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    }

    _load();

    // ─── Serverless Integration Points ──────────
    // Replace these with real API calls:
    // Supabase: supabase.from('leaderboard').insert(...)
    // Firebase: firebase.database().ref('scores').push(...)
    // Cloudflare Workers KV, Vercel Edge Functions, etc.

    async function _postScore(entry) {
        // TODO: Replace with serverless POST
        // await fetch('https://your-api.workers.dev/scores', {
        //   method: 'POST', body: JSON.stringify(entry)
        // });
        entries.push(entry);
        entries.sort((a, b) => b.score - a.score);
        entries = entries.slice(0, MAX_ENTRIES);
        _save();
    }

    async function _fetchScores() {
        // TODO: Replace with serverless GET
        // const res = await fetch('https://your-api.workers.dev/scores');
        // return await res.json();
        return [...entries];
    }

    async function submitScore(score, level, maxCombo) {
        if (!playerName) return false;
        const entry = {
            name: playerName,
            score,
            level,
            combo: maxCombo,
            date: new Date().toISOString(),
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        };
        await _postScore(entry);
        return true;
    }

    async function getTopScores(limit = 10) {
        const all = await _fetchScores();
        return all.slice(0, limit);
    }

    function setPlayerName(name) {
        playerName = name.trim().slice(0, 12);
        localStorage.setItem('arkPD_name', playerName);
    }

    function getPlayerName() { return playerName; }
    function hasName() { return playerName.length > 0; }

    function getPlayerRank(score) {
        const idx = entries.findIndex(e => score >= e.score);
        return idx === -1 ? entries.length + 1 : idx + 1;
    }

    return { submitScore, getTopScores, setPlayerName, getPlayerName, hasName, getPlayerRank };
})();

window.Leaderboard = Leaderboard;
