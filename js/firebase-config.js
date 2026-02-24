/**
 * ARK Pulse Drop — Firebase Configuration & Service Layer
 * Firebase Auth (Anonymous + Google) + Realtime Database (Global Leaderboard)
 * v2.1 — Mobile-first Google Sign-In (redirect on mobile & in-app browsers)
 */

const FirebaseService = (() => {
    // ─── Config ─────────────────────────────────
    const CONFIG = {
        apiKey: "AIzaSyBmCSRvmrJ_UbjtEPnrN6zkkSZNuGdBWGU",
        authDomain: "ark-pulse-drop.firebaseapp.com",
        databaseURL: "https://ark-pulse-drop-default-rtdb.firebaseio.com",
        projectId: "ark-pulse-drop",
        storageBucket: "ark-pulse-drop.firebasestorage.app",
        messagingSenderId: "544967793997",
        appId: "1:544967793997:web:ac91ec19e5d737a5f12b04"
    };

    // ─── State ──────────────────────────────────
    let app = null;
    let auth = null;
    let db = null;
    let currentUser = null;
    let isReady = false;
    let onAuthChangeCbs = [];

    // ─── Initialize ─────────────────────────────
    async function init() {
        if (isReady) return true;
        try {
            const {
                initializeApp,
                getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut: fbSignOut,
                getDatabase, ref, push, set, get, query, orderByChild, limitToLast, onValue, remove
            } = await import('./firebase-sdk.min.js');

            app = initializeApp(CONFIG);
            auth = getAuth(app);
            db = getDatabase(app);

            FirebaseService._authModule = { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, fbSignOut };
            FirebaseService._dbModule = { ref, push, set, get, query, orderByChild, limitToLast, onValue, remove };

            onAuthStateChanged(auth, (user) => {
                currentUser = user;
                onAuthChangeCbs.forEach(cb => cb(user));
                console.log('[Firebase] Auth state:', user ? `uid=${user.uid}` : 'signed out');
            });

            // Handle redirect result (returning from Google sign-in redirect)
            try {
                const redirectResult = await getRedirectResult(auth);
                if (redirectResult && redirectResult.user) {
                    console.log('[Firebase] ✅ Redirect sign-in result:', redirectResult.user.displayName);
                }
            } catch (redirectErr) {
                console.log('[Firebase] No redirect result pending');
            }

            isReady = true;
            console.log('[Firebase] ✅ Initialized successfully');
            return true;
        } catch (err) {
            console.error('[Firebase] ❌ Init failed:', err);
            return false;
        }
    }

    // ─── Auth: Anonymous ────────────────────────
    async function signInAnon() {
        if (!auth) return null;
        try {
            const { signInAnonymously } = FirebaseService._authModule;
            const result = await signInAnonymously(auth);
            console.log('[Firebase] Anonymous sign-in OK');
            return result.user;
        } catch (err) {
            console.error('[Firebase] Anonymous sign-in failed:', err);
            return null;
        }
    }

    // ─── Auth: Google ───────────────────────────
    // v2.1: Mobile-first — use redirect on ALL mobile browsers
    // Popup only for desktop browsers where it's reliable
    async function signInGoogle() {
        if (!auth) return null;
        const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = FirebaseService._authModule;
        const provider = new GoogleAuthProvider();

        const ua = navigator.userAgent || '';

        // Detect iframe (itch.io embed)
        const isInIframe = window !== window.top;

        // Detect in-app browsers (SNS apps, Reddit, etc.)
        const isInAppBrowser = /FBAN|FBAV|Instagram|Line|KakaoTalk|NAVER|Reddit|Twitter|Snapchat|TikTok|Flipboard|Brave|DuckDuckGo|SamsungBrowser|UCBrowser|MiuiBrowser|wv\b/i.test(ua);

        // Detect mobile devices (phones & tablets)
        const isMobile = /Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

        // Force redirect for: iframes, in-app browsers, ALL mobile browsers
        if (isInIframe || isInAppBrowser || isMobile) {
            const reason = isInIframe ? 'iframe' : isInAppBrowser ? 'in-app browser' : 'mobile';
            console.log(`[Firebase] 🔄 ${reason} detected → using redirect`);
            try {
                await signInWithRedirect(auth, provider);
                return null; // page will redirect
            } catch (err) {
                console.error('[Firebase] Redirect sign-in failed:', err);
                return null;
            }
        }

        // Desktop browsers → popup first, redirect fallback
        try {
            console.log('[Firebase] 🔐 Attempting popup sign-in...');
            const result = await signInWithPopup(auth, provider);
            console.log('[Firebase] ✅ Google sign-in OK:', result.user.displayName);
            return result.user;
        } catch (err) {
            if (err.code === 'auth/popup-blocked' ||
                err.code === 'auth/popup-closed-by-user' ||
                err.code === 'auth/cancelled-popup-request' ||
                err.code === 'auth/internal-error' ||
                err.code === 'auth/network-request-failed') {
                console.warn('[Firebase] ⚠️ Popup failed, trying redirect...', err.code);
                try {
                    await signInWithRedirect(auth, provider);
                    return null;
                } catch (redirectErr) {
                    console.error('[Firebase] Redirect also failed:', redirectErr);
                    return null;
                }
            }
            console.error('[Firebase] Google sign-in failed:', err);
            return null;
        }
    }

    // ─── Auth: Sign Out ─────────────────────────
    async function signOut() {
        if (!auth) return;
        try {
            const { fbSignOut } = FirebaseService._authModule;
            await fbSignOut(auth);
        } catch (err) {
            console.error('[Firebase] Sign out failed:', err);
        }
    }

    // ─── Auth: Callbacks ────────────────────────
    function onAuthChange(cb) { onAuthChangeCbs.push(cb); }
    function getUser() { return currentUser; }
    function isSignedIn() { return currentUser !== null; }
    function getUserName() {
        if (!currentUser) return '';
        return currentUser.displayName || localStorage.getItem('arkPD_name') || '';
    }

    // ─── Daily Attendance Check (출석체크) ──────
    async function dailyAttendanceCheck() {
        if (!db || !currentUser) return { awarded: false };
        try {
            const { ref, get, set } = FirebaseService._dbModule;
            const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const attRef = ref(db, `attendance/${currentUser.uid}/${today}`);
            const snapshot = await get(attRef);
            if (snapshot.exists()) {
                return { awarded: false, reason: 'already_checked' };
            }
            await set(attRef, { timestamp: Date.now() });
            console.log('[Firebase] 📅 Daily attendance recorded');
            return { awarded: true };
        } catch (err) {
            console.error('[Firebase] Attendance check failed:', err);
            return { awarded: false };
        }
    }

    // ─── Leaderboard: Submit Score ──────────────
    async function submitScore(entry) {
        if (!db || !currentUser) return false;
        try {
            const { ref, push, set } = FirebaseService._dbModule;
            const scoreRef = push(ref(db, 'leaderboard'));
            await set(scoreRef, {
                ...entry,
                uid: currentUser.uid,
                displayName: currentUser.displayName || entry.name || 'Anonymous',
                timestamp: Date.now()
            });
            console.log('[Firebase] Score submitted:', entry.score);
            return true;
        } catch (err) {
            console.error('[Firebase] Score submit failed:', err);
            return false;
        }
    }

    // ─── Leaderboard: Get Top Scores ────────────
    async function getTopScores(limit = 20) {
        if (!db) return [];
        try {
            const { ref, query, orderByChild, limitToLast, get } = FirebaseService._dbModule;
            const q = query(ref(db, 'leaderboard'), orderByChild('score'), limitToLast(limit));
            const snapshot = await get(q);
            if (!snapshot.exists()) return [];

            const scores = [];
            snapshot.forEach(child => {
                scores.push({ id: child.key, ...child.val() });
            });
            return scores.sort((a, b) => b.score - a.score);
        } catch (err) {
            console.error('[Firebase] Get scores failed:', err);
            return [];
        }
    }

    // ─── Leaderboard: Real-time Listener ────────
    function onScoresUpdate(limit, callback) {
        if (!db) return () => { };
        const { ref, query, orderByChild, limitToLast, onValue } = FirebaseService._dbModule;
        const q = query(ref(db, 'leaderboard'), orderByChild('score'), limitToLast(limit));
        const unsub = onValue(q, (snapshot) => {
            const scores = [];
            snapshot.forEach(child => {
                scores.push({ id: child.key, ...child.val() });
            });
            callback(scores.sort((a, b) => b.score - a.score));
        });
        return unsub;
    }

    // ─── User Data: Save/Load ───────────────────
    async function saveUserData(data) {
        if (!db || !currentUser) return false;
        try {
            const { ref, set } = FirebaseService._dbModule;
            await set(ref(db, `users/${currentUser.uid}`), {
                ...data,
                lastUpdated: Date.now()
            });
            return true;
        } catch (err) {
            console.error('[Firebase] Save user data failed:', err);
            return false;
        }
    }

    async function loadUserData() {
        if (!db || !currentUser) return null;
        try {
            const { ref, get } = FirebaseService._dbModule;
            const snapshot = await get(ref(db, `users/${currentUser.uid}`));
            return snapshot.exists() ? snapshot.val() : null;
        } catch (err) {
            console.error('[Firebase] Load user data failed:', err);
            return null;
        }
    }

    // ─── Purchase Record ────────────────────────
    async function recordPurchase(purchaseData) {
        if (!db || !currentUser) return false;
        try {
            const { ref, push, set } = FirebaseService._dbModule;
            const purchaseRef = push(ref(db, `purchases/${currentUser.uid}`));
            await set(purchaseRef, {
                ...purchaseData,
                timestamp: Date.now(),
                status: 'pending_verification'
            });
            return true;
        } catch (err) {
            console.error('[Firebase] Record purchase failed:', err);
            return false;
        }
    }

    return {
        init,
        // Auth
        signInAnon, signInGoogle, signOut,
        onAuthChange, getUser, isSignedIn, getUserName,
        // Daily bonus
        dailyAttendanceCheck,
        // Leaderboard
        submitScore, getTopScores, onScoresUpdate,
        // User Data
        saveUserData, loadUserData,
        // Purchases
        recordPurchase,
        // Internal (for module refs)
        _authModule: null, _dbModule: null,
        // Status
        get ready() { return isReady; }
    };
})();

window.FirebaseService = FirebaseService;
