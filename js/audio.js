/**
 * ARK Pulse Drop — Audio Engine
 */
const Audio = (() => {
    let ctx = null;
    function init() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    function tone(freq, dur, type = 'sine', vol = 0.12) {
        if (!ctx) return;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
    }
    return {
        init,
        perfect() { tone(880, .15, 'sine', .13); setTimeout(() => tone(1320, .12, 'sine', .1), 60); setTimeout(() => tone(1760, .18, 'sine', .08), 120); },
        good() { tone(660, .12, 'sine', .1); setTimeout(() => tone(880, .14, 'sine', .08), 80); },
        ok() { tone(440, .12, 'triangle', .08); },
        miss() { tone(220, .2, 'sawtooth', .06); tone(180, .25, 'sawtooth', .04); },
        levelUp() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .2, 'sine', .1), i * 100)); },
        gameOver() { [440, 370, 330, 220].forEach((f, i) => setTimeout(() => tone(f, .3, 'sawtooth', .06), i * 150)); },
        coin() { tone(1200, .08, 'sine', .08); setTimeout(() => tone(1500, .1, 'sine', .06), 50); },
        buy() { [800, 1000, 1200, 1600].forEach((f, i) => setTimeout(() => tone(f, .1, 'sine', .08), i * 60)); },
        ui() { tone(600, .06, 'sine', .05); },
    };
})();

window.Audio = Audio;
