/**
 * ARK Pulse Drop — Firebase Configuration & Service Layer
 * Firebase Auth (Anonymous + Google) + Realtime Database (Global Leaderboard)
 * Created: 2026-02-14 | v1.0
 */

// Firebase SDK via CDN (ES Module compat shim for vanilla JS)
const FirebaseService = (() => {
    // ─── Config ─────────────────────────────────
    const CONFIG = {
        apiKey: "AIzaSyD_wMX3L6LO067j2lLJB9eVDZzO8evcD5g",
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
            // Single bundled import — no more CDN round-trips!
            const {
                initializeApp,
                getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut: fbSignOut,
                getDatabase, ref, push, set, get, query, orderByChild, limitToLast, onValue, remove
            } = await import('./firebase-sdk.min.js');

            app = initializeApp(CONFIG);
            auth = getAuth(app);
            db = getDatabase(app);

            // Store module references for later use
            FirebaseService._authModule = { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, fbSignOut };
            FirebaseService._dbModule = { ref, push, set, get, query, orderByChild, limitToLast, onValue, remove };

            // Listen for auth changes
            onAuthStateChanged(auth, (user) => {
                currentUser = user;
                onAuthChangeCbs.forEach(cb => cb(user));
                console.log('[Firebase] Auth state:', user ? `uid=${user.uid}` : 'signed out');
            });

            // Handle redirect result (if user was redirected back after Google sign-in)
            try {
                const redirectResult = await getRedirectResult(auth);
                if (redirectResult && redirectResult.user) {
                    console.log('[Firebase] ✅ Redirect sign-in result:', redirectResult.user.displayName);
                }
            } catch (redirectErr) {
                // Ignore — no redirect pending
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
    // Hybrid: tries popup first, falls back to redirect
    // This fixes the "sometimes works, sometimes doesn't" issue
    async function signInGoogle() {
        if (!auth) return null;
        const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } = FirebaseService._authModule;
        const provider = new GoogleAuthProvider();

        // Detect if we should skip popup entirely
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isInIframe = window !== window.top;
        const isInAppBrowser = /FBAN|FBAV|Instagram|Line|KakaoTalk|NAVER/i.test(navigator.userAgent);

        // Mobile, iframe (itch.io), or in-app browsers → go straight to redirect
        if (isMobile || isInIframe || isInAppBrowser) {
            console.log('[Firebase] 📱 Mobile/iframe/in-app detected → using redirect');
            try {
                await signInWithRedirect(auth, provider);
                return null; // page will redirect, won't reach here
            } catch (err) {
                console.error('[Firebase] Redirect sign-in failed:', err);
                return null;
            }
        }

        // Desktop → try popup first, fallback to redirect
        try {
            const result = await signInWithPopup(auth, provider);
            console.log('[Firebase] ✅ Google popup sign-in OK:', result.user.displayName);
            return result.user;
        } catch (err) {
            // Popup blocked or failed — try redirect
            if (err.code === 'auth/popup-blocked' ||
                err.code === 'auth/popup-closed-by-user' ||
                err.code === 'auth/cancelled-popup-request' ||
                err.code === 'auth/internal-error') {
                console.warn('[Firebase] ⚠️ Popup failed, trying redirect...', err.code);
                try {
                    await signInWithRedirect(auth, provider);
                    return null; // page will redirect
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
            // Sort descending (limitToLast returns ascending)
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

    // ─── Purchase Record (server-side write only in production) ──
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
