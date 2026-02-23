/**
 * ARK Pulse Drop — Ad Manager (H5 Games Ads / Ad Placement API)
 * Uses Google AdSense H5 Games Ads for Interstitial & Rewarded ads.
 * Publisher: ca-pub-3355425794806318
 */
const AdManager = (() => {
  // ─── Config ───────────────────────────────────
  const INTERSTITIAL_FREQUENCY = 3; // show ad every N games

  // ─── State ────────────────────────────────────
  let gameCount = parseInt(localStorage.getItem('arkPD_adcount') || '0');
  let reviveUsed = false;
  let isShowingAd = false;
  let sdkReady = false;

  // ─── SDK Check ────────────────────────────────
  function checkSDK() {
    if (typeof adBreak === 'function' && typeof adConfig === 'function') {
      sdkReady = true;
      // Configure the SDK
      adConfig({
        preloadAdBreaks: 'on',
        sound: 'on',
        onReady: () => {
          console.log('[AdManager] H5 Games Ads SDK ready');
          sdkReady = true;
        }
      });
      return true;
    }
    return false;
  }

  // Init on load
  setTimeout(() => checkSDK(), 1000);

  // ─── Interstitial (between games) ─────────────
  function showInterstitial(callbacks = {}) {
    if (!sdkReady && !checkSDK()) {
      console.log('[AdManager] SDK not ready — skip interstitial');
      if (callbacks.afterAd) callbacks.afterAd();
      return;
    }

    isShowingAd = true;
    adBreak({
      type: 'next',           // between levels/games
      name: 'game-over',
      beforeAd: () => {
        console.log('[AdManager] Interstitial showing');
        if (callbacks.beforeAd) callbacks.beforeAd();
      },
      afterAd: () => {
        console.log('[AdManager] Interstitial done');
        isShowingAd = false;
        if (callbacks.afterAd) callbacks.afterAd();
      },
      adBreakDone: (info) => {
        console.log('[AdManager] adBreakDone:', info.breakStatus);
        isShowingAd = false;
        // If no ad was shown, still call afterAd
        if (info.breakStatus !== 'viewed' && callbacks.afterAd) {
          callbacks.afterAd();
        }
      }
    });
  }

  // Called on every game over — decides whether to show
  function onGameOver(callbacks = {}) {
    gameCount++;
    localStorage.setItem('arkPD_adcount', String(gameCount));

    if (gameCount % INTERSTITIAL_FREQUENCY !== 0) {
      console.log(`[AdManager] Game #${gameCount} — skip interstitial`);
      if (callbacks.afterAd) callbacks.afterAd();
      return;
    }

    console.log(`[AdManager] Game #${gameCount} — showing interstitial`);
    showInterstitial(callbacks);
  }

  // ─── Rewarded Ad ──────────────────────────────
  function requestRewardedAd(rewardType, onReward, onClose) {
    if (rewardType === 'revive' && reviveUsed) {
      if (onClose) onClose();
      return false;
    }

    if (!sdkReady && !checkSDK()) {
      console.log('[AdManager] SDK not ready — granting reward (dev mode)');
      if (rewardType === 'revive') reviveUsed = true;
      if (onReward) onReward(rewardType);
      if (onClose) onClose();
      return true;
    }

    isShowingAd = true;
    adBreak({
      type: 'reward',
      name: rewardType === 'revive' ? 'reward-revive' : 'reward-bonus',
      beforeAd: () => {
        console.log('[AdManager] Rewarded ad showing');
      },
      afterAd: () => {
        console.log('[AdManager] Rewarded ad finished');
        isShowingAd = false;
      },
      beforeReward: (showAdFn) => {
        showAdFn(); // actually show the ad
      },
      adDismissed: () => {
        console.log('[AdManager] Rewarded ad dismissed (no reward)');
        isShowingAd = false;
        if (onClose) onClose();
      },
      adViewed: () => {
        console.log('[AdManager] Rewarded ad watched — granting reward!');
        isShowingAd = false;
        if (rewardType === 'revive') reviveUsed = true;
        if (onReward) onReward(rewardType);
        if (onClose) onClose();
      },
      adBreakDone: (info) => {
        console.log('[AdManager] Rewarded adBreakDone:', info.breakStatus);
        isShowingAd = false;
        if (info.breakStatus === 'notReady' || info.breakStatus === 'other') {
          // No ad available — grant reward anyway (dev/test)
          console.log('[AdManager] No rewarded ad available — granting reward');
          if (rewardType === 'revive') reviveUsed = true;
          if (onReward) onReward(rewardType);
          if (onClose) onClose();
        }
      }
    });

    return true;
  }

  function resetSession() {
    reviveUsed = false;
    isShowingAd = false;
  }

  function canRevive() { return !reviveUsed; }
  function isShowing() { return isShowingAd; }

  // Legacy compat
  const AD_STATE = { IDLE: 'idle', LOADING: 'loading', READY: 'ready', SHOWING: 'showing', COMPLETED: 'completed', FAILED: 'failed' };
  const REWARD = { REVIVE: 'revive', DOUBLE: 'double_score' };
  function getState() { return isShowingAd ? AD_STATE.SHOWING : AD_STATE.IDLE; }

  return {
    AD_STATE, REWARD,
    requestRewardedAd, resetSession, canRevive, getState, isShowing,
    onGameOver, showInterstitial
  };
})();

window.AdManager = AdManager;
