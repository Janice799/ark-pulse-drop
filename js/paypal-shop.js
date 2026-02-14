/**
 * ARK Pulse Drop — PayPal Coin Pack Payment System
 * Sandbox → Live ready | PayPal SDK Integration
 * Coin Packs: $0.99 ~ $7.99
 * Created: 2026-02-14 | v1.0
 */
const PayPalShop = (() => {
    // ─── Config ─────────────────────────────────
    const SANDBOX_CLIENT_ID = 'sb'; // Replace with real sandbox client ID
    const LIVE_CLIENT_ID = ''; // Replace with real live client ID
    const IS_SANDBOX = true;
    const CLIENT_ID = IS_SANDBOX ? SANDBOX_CLIENT_ID : LIVE_CLIENT_ID;

    // ─── Coin Packs (synced with SkinShop.COIN_PACKS) ───
    const COIN_PACKS = [
        { id: 'pack_s', coins: 500, price: '0.99', currency: 'USD', label: '500 Coins', bonus: '' },
        { id: 'pack_m', coins: 1200, price: '1.99', currency: 'USD', label: '1,200 Coins', bonus: '+20%' },
        { id: 'pack_l', coins: 3000, price: '3.99', currency: 'USD', label: '3,000 Coins', bonus: '+50%' },
        { id: 'pack_xl', coins: 8000, price: '7.99', currency: 'USD', label: '8,000 Coins', bonus: 'BEST VALUE' }
    ];

    let sdkLoaded = false;
    let isProcessing = false;
    let purchaseCallback = null;

    // ─── Load PayPal SDK ────────────────────────
    function loadSDK() {
        return new Promise((resolve, reject) => {
            if (sdkLoaded) return resolve(true);
            if (document.getElementById('paypal-sdk')) return resolve(true);

            const script = document.createElement('script');
            script.id = 'paypal-sdk';
            script.src = `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&currency=USD&intent=capture`;
            script.addEventListener('load', () => {
                sdkLoaded = true;
                console.log('[PayPal] ✅ SDK loaded');
                resolve(true);
            });
            script.addEventListener('error', () => {
                console.error('[PayPal] ❌ SDK load failed');
                reject(new Error('PayPal SDK failed to load'));
            });
            document.head.appendChild(script);
        });
    }

    // ─── Create Order via MCP (server-side) ─────
    async function createOrder(packId) {
        const pack = COIN_PACKS.find(p => p.id === packId);
        if (!pack) throw new Error('Invalid pack');

        // In production, this would go through your server
        // For now, returns the order structure for PayPal SDK
        return {
            purchase_units: [{
                description: `ARK Pulse Drop - ${pack.label}`,
                amount: {
                    currency_code: pack.currency,
                    value: pack.price,
                    breakdown: {
                        item_total: { currency_code: pack.currency, value: pack.price }
                    }
                },
                items: [{
                    name: pack.label,
                    description: `${pack.coins} coins for ARK Pulse Drop${pack.bonus ? ' (' + pack.bonus + ')' : ''}`,
                    unit_amount: { currency_code: pack.currency, value: pack.price },
                    quantity: '1',
                    category: 'DIGITAL_GOODS'
                }]
            }]
        };
    }

    // ─── Render PayPal Buttons ──────────────────
    function renderButtons(containerId, packId, onSuccess, onError) {
        if (!window.paypal) {
            console.error('[PayPal] SDK not loaded');
            return;
        }

        const pack = COIN_PACKS.find(p => p.id === packId);
        if (!pack) return;

        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        window.paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'black',
                shape: 'pill',
                label: 'pay',
                height: 40
            },
            createOrder: async (data, actions) => {
                isProcessing = true;
                return actions.order.create(await createOrder(packId));
            },
            onApprove: async (data, actions) => {
                try {
                    const details = await actions.order.capture();
                    console.log('[PayPal] ✅ Payment captured:', details.id);

                    // Add coins
                    if (window.SkinShop) {
                        SkinShop.addCoins(pack.coins);
                    }

                    // Record to Firebase
                    if (window.FirebaseService && FirebaseService.isSignedIn()) {
                        await FirebaseService.recordPurchase({
                            orderId: details.id,
                            packId: pack.id,
                            coins: pack.coins,
                            amount: pack.price,
                            currency: pack.currency,
                            payerEmail: details.payer?.email_address || '',
                        });
                    }

                    isProcessing = false;
                    if (onSuccess) onSuccess(pack, details);
                } catch (err) {
                    console.error('[PayPal] Capture failed:', err);
                    isProcessing = false;
                    if (onError) onError(err);
                }
            },
            onCancel: () => {
                isProcessing = false;
                console.log('[PayPal] Payment cancelled');
            },
            onError: (err) => {
                isProcessing = false;
                console.error('[PayPal] Error:', err);
                if (onError) onError(err);
            }
        }).render(`#${containerId}`);
    }

    // ─── Get Packs ──────────────────────────────
    function getPacks() { return COIN_PACKS; }
    function isLoaded() { return sdkLoaded; }
    function processing() { return isProcessing; }

    return {
        loadSDK,
        renderButtons,
        getPacks,
        isLoaded,
        processing,
        createOrder
    };
})();

window.PayPalShop = PayPalShop;
