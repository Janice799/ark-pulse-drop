/**
 * ARK Pulse Drop — Ad Manager (State Machine)
 * Ready for: AdMob, Unity Ads, ironSource, AppLovin
 * Replace mock methods with real SDK calls.
 */
const AdManager = (() => {
  // ─── Ad States ──────────────────────────────
  const AD_STATE = {
    IDLE: 'idle',
    LOADING: 'loading',
    READY: 'ready',
    SHOWING: 'showing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  };

  // ─── Reward Types ───────────────────────────
  const REWARD = { REVIVE: 'revive', DOUBLE: 'double_score' };

  let state = AD_STATE.IDLE;
  let pendingReward = null;
  let reviveUsed = false;
  let onRewardCallback = null;
  let onCloseCallback = null;

  // ─── Mock Ad (replace with real SDK) ────────
  function _mockLoadAd() {
    state = AD_STATE.LOADING;
    return new Promise(resolve => {
      setTimeout(() => { state = AD_STATE.READY; resolve(true); }, 300);
    });
  }

  function _mockShowAd() {
    state = AD_STATE.SHOWING;
    return new Promise(resolve => {
      // Simulate user watching ad for 2 seconds
      setTimeout(() => { state = AD_STATE.COMPLETED; resolve(true); }, 2000);
    });
  }

  // ─── SDK Integration Points ─────────────────
  // TODO: Replace these with real SDK calls
  // AdMob example:
  //   admob.rewardedAd.load(adUnitId).then(...)
  //   admob.rewardedAd.show().then(...)
  // Unity Ads example:
  //   UnityAds.load(placementId, callbacks)
  //   UnityAds.show(placementId, callbacks)

  async function requestRewardedAd(rewardType, onReward, onClose) {
    if (rewardType === REWARD.REVIVE && reviveUsed) return false;
    pendingReward = rewardType;
    onRewardCallback = onReward;
    onCloseCallback = onClose;

    try {
      await _mockLoadAd();
      const watched = await _mockShowAd();
      if (watched && state === AD_STATE.COMPLETED) {
        if (pendingReward === REWARD.REVIVE) reviveUsed = true;
        if (onRewardCallback) onRewardCallback(pendingReward);
      }
    } catch (e) {
      state = AD_STATE.FAILED;
    } finally {
      state = AD_STATE.IDLE;
      if (onCloseCallback) onCloseCallback();
    }
    return true;
  }

  function resetSession() {
    reviveUsed = false;
    state = AD_STATE.IDLE;
    pendingReward = null;
  }

  function canRevive() { return !reviveUsed; }
  function getState() { return state; }
  function isShowing() { return state === AD_STATE.SHOWING || state === AD_STATE.LOADING; }

  return { AD_STATE, REWARD, requestRewardedAd, resetSession, canRevive, getState, isShowing };
})();

window.AdManager = AdManager;
