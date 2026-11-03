/* --- DONNÉE DU CATALOGUE PRODUITS --- */
const productsData = [
    { id: 1, name: "Gâteau au Chocolat", category: "gateaux", price: 2000, desc: "Chocolat noir fondant et ganache au cacao pur.", img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80", stock: true },
    { id: 2, name: "Red Velvet", category: "gateaux", price: 2500, desc: "Gâteau moelleux rouge vif avec crème au fromage doux.", img: "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?auto=format&fit=crop&w=500&q=80", stock: true },
    { id: 3, name: "Cheesecake", category: "gateaux", price: 2300, desc: "Onctueux cheesecake new-yorkais sur lit d'amandes.", img: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80", stock: true },
    { id: 4, name: "Cupcake Vanille", category: "cupcakes", price: 300, desc: "Petit gâteau vanille Bourbon avec son topping crémeux.", img: "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&w=500&q=80", stock: true },
    { id: 5, name: "Tarte aux Fraises", category: "tartes", price: 1600, desc: "Fraises fraîches de saison sur crème pâtissière légère.", img: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=500&q=80", stock: true },
    { id: 6, name: "Croissant au Beurre", category: "viennoiseries", price: 200, desc: "Feuilletage artisanal pur beurre AOP d'Echiré.", img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80", stock: true },
    { id: 7, name: "Donut Glacé Chocolat", category: "donuts", price: 250, desc: "Donut ultra mœlleux avec glaçage gourmand.", img: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80", stock: true },
    { id: 8, name: "Cookies Pépites Chocolat", category: "biscuits", price: 150, desc: "Biscuit croustillant au cœur fondant et pépites XL.", img: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80", stock: true }
];

/* Libellés lisibles des catégories (utilisés dans la recherche et la fiche produit) */
const CATEGORY_LABELS = {
    gateaux: "🎂 Gâteaux",
    cupcakes: "🧁 Cupcakes",
    biscuits: "🍪 Biscuits",
    viennoiseries: "🥐 Viennoiseries",
    donuts: "🍩 Donuts",
    tartes: "🍰 Tartes"
};

/* ========================================================= */
/* --- ZONES DE LIVRAISON (facilement modifiable ici) ---     */
/* Ajoutez / modifiez une zone en ajoutant une ligne au format : */
/* { name: "Nom affiché", fee: fraisEnGourdes }                */
/* ========================================================= */
const DELIVERY_ZONES = [
    { name: "Delmas", fee: 200 },
    { name: "Pétion-Ville", fee: 250 },
    { name: "Port-au-Prince (centre)", fee: 300 },
    { name: "Tabarre", fee: 300 },
    { name: "Carrefour", fee: 400 },
    { name: "Croix-des-Bouquets", fee: 500 },
    { name: "Kenscoff / Laboule", fee: 500 },
    { name: "Autre ville d'Haïti (à confirmer)", fee: 800 }
];

/* ========================================================= */
/* --- PAIEMENT MONCASH / NATCASH ---                          */
/* merchantNumber : numéro marchand affiché au client           */
/* verifyUrl      : adresse de VOTRE serveur qui vérifie la     */
/*                  transaction (voir server/moncash-verify.js).*/
/*                  Les clés MonCash ne doivent JAMAIS être mises*/
/*                  dans ce fichier. Vide = vérification manuelle.*/
/* ========================================================= */
const PAYMENT_CONFIG = {
    'MonCash': { merchantNumber: 'À CONFIGURER', verifyUrl: '' },   // ex : 'https://votre-serveur.com/api/moncash/verify'
    'NatCash': { merchantNumber: 'À CONFIGURER', verifyUrl: '' }    // aucune API de vérification NatCash fournie : vérification manuelle
};
const isMobileMoney = (m) => m === 'MonCash' || m === 'NatCash';

/* --- FORMAT DES PRIX : gourdes haïtiennes (HTG) --- */
const fmtHTG = (n) => Number(n).toLocaleString('fr-FR') + ' HTG';

/* --- ÉTAT DU PANIER (LOCALSTORAGE) --- */
let cart = JSON.parse(localStorage.getItem('delices_cart_htg')) || [];

/* --- ÉTAT DE LA RECHERCHE / FILTRE PRODUITS --- */
let currentSearchTerm = '';
let currentCategoryFilter = 'all';

/* --- ÉTAT DE LA FICHE PRODUIT DÉTAILLÉE --- */
let currentDetailProduct = null;
let currentDetailQty = 1;

/* --- ÉTAT DU PROCESSUS DE COMMANDE --- */
let selectedDeliveryMode = 'domicile';
let selectedPaymentMethod = 'Paiement à la livraison';

/* --- INITIALISATION & LOGIQUE DU PANIER --- */
document.addEventListener('DOMContentLoaded', () => {
    renderProducts(productsData);
    updateCartUI();
    populateDeliveryZones();

    // Filtrage des produits (combiné avec la recherche)
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategoryFilter = btn.dataset.filter;
            applyProductFilters();
        });
    });

    // Barre de recherche produits
    const searchInput = id('productSearchInput');
    const searchClearBtn = id('searchClearBtn');
    searchInput.addEventListener('input', () => {
        currentSearchTerm = searchInput.value.trim().toLowerCase();
        searchClearBtn.classList.toggle('visible', currentSearchTerm.length > 0);
        applyProductFilters();
    });
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchTerm = '';
        searchClearBtn.classList.remove('visible');
        applyProductFilters();
        searchInput.focus();
    });

    // Navigation Mobile
    const hamburger = id('hamburgerBtn');
    const navLinks = id('navLinks');
    hamburger.addEventListener('click', () => navLinks.classList.toggle('active'));

    // Fermer le menu mobile lors d'un clic sur un lien
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('active'));
    });

    // Sidebar du panier
    id('openCartBtn').addEventListener('click', () => id('cartSidebar').classList.add('open'));
    id('closeCartBtn').addEventListener('click', () => id('cartSidebar').classList.remove('open'));
    id('clearCartBtn').addEventListener('click', clearCart);

    // Trigger Modal Commande
    id('checkoutBtn').addEventListener('click', () => {
        if(cart.length === 0) return alert('Votre panier est vide !');
        id('cartSidebar').classList.remove('open');
        goToCheckoutStep(1);
        openModal('checkoutModal');
    });

    // Trigger Modal Custom
    id('openCustomModalBtn').addEventListener('click', () => openModal('customModal'));

    // Fiche produit détaillée : ouverture/fermeture
    id('pdQtyMinus').addEventListener('click', () => updateDetailQty(-1));
    id('pdQtyPlus').addEventListener('click', () => updateDetailQty(1));
    id('pdAddToCartBtn').addEventListener('click', addDetailProductToCart);

    // Fermeture des modales en cliquant à l'extérieur
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
    // Fermeture des modales avec la touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(overlay => closeModal(overlay.id));
        }
    });

    // Mode de livraison (domicile / retrait)
    document.querySelectorAll('#deliveryModeOptions .radio-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('#deliveryModeOptions .radio-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            card.querySelector('input').checked = true;
            selectedDeliveryMode = card.dataset.mode;
            id('deliveryAddressFields').style.display = selectedDeliveryMode === 'retrait' ? 'none' : '';
            id('orderAddress').required = selectedDeliveryMode !== 'retrait';
            id('orderZone').required = selectedDeliveryMode !== 'retrait';
        });
    });

    // Mode de paiement
    document.querySelectorAll('#paymentOptions .payment-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('#paymentOptions .payment-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            opt.querySelector('input').checked = true;
            selectedPaymentMethod = opt.dataset.payment;
            id('paymentApiNote').style.display = (selectedPaymentMethod === 'Carte bancaire') ? 'block' : 'none';
            updateMobileMoneyBox();
        });
    });

    // Suivi de commande
    id('trackOrderBtn').addEventListener('click', trackOrder);
    id('trackingInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); trackOrder(); }
    });

    // Slider Témoignages
    startTestimonialSlider();
});

function id(elementId) { return document.getElementById(elementId); }

/* --- AFFICHAGE PRODUITS --- */
function renderProducts(products) {
    const grid = id('productGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="no-results-msg">
                <i class="fa-solid fa-magnifying-glass"></i>
                Aucun produit trouvé.
            </div>
        `;
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card clickable';
        card.onclick = () => openProductDetail(p.id);
        card.innerHTML = `
            <img src="${p.img}" class="product-img" alt="${p.name} — pâtisserie artisanale Délices de Jonathan">
            <div class="product-info">
                <h3 class="product-title">${p.name}</h3>
                <p class="product-desc">${p.desc}</p>
                <div class="product-footer">
                    <span class="product-price">${fmtHTG(p.price)}</span>
                    <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart('${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price})">Ajouter</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* --- RECHERCHE ET FILTRAGE COMBINÉS --- */
function applyProductFilters() {
    const filtered = productsData.filter(p => {
        const matchCategory = (currentCategoryFilter === 'all') || (p.category === currentCategoryFilter);
        const categoryLabel = CATEGORY_LABELS[p.category] || '';
        const matchSearch = !currentSearchTerm || 
            p.name.toLowerCase().includes(currentSearchTerm) ||
            p.desc.toLowerCase().includes(currentSearchTerm) ||
            categoryLabel.toLowerCase().includes(currentSearchTerm);
        return matchCategory && matchSearch;
    });
    renderProducts(filtered);
}

/* --- FICHE PRODUIT DÉTAILLÉE --- */
function openProductDetail(productId) {
    const prod = productsData.find(p => p.id === productId);
    if (!prod) return;
    currentDetailProduct = prod;
    currentDetailQty = 1;

    id('pdImg').src = prod.img;
    id('pdImg').alt = prod.name;
    id('pdCategory').textContent = CATEGORY_LABELS[prod.category] || prod.category;
    id('pdName').textContent = prod.name;
    id('pdDesc').textContent = prod.desc;
    id('pdPrice').textContent = `${fmtHTG(prod.price)}`;
    id('pdQty').textContent = currentDetailQty;

    openModal('productDetailModal');
}

function updateDetailQty(delta) {
    currentDetailQty = Math.max(1, currentDetailQty + delta);
    id('pdQty').textContent = currentDetailQty;
}

function addDetailProductToCart() {
    if (!currentDetailProduct) return;
    for (let i = 0; i < currentDetailQty; i++) {
        addToCart(currentDetailProduct.id, currentDetailProduct.name, currentDetailProduct.price, false);
    }
    closeModal('productDetailModal');
    id('cartSidebar').classList.add('open');
}

/* --- LOGIQUE DE GESTION DU PANIER --- */
function addToCart(idParam, title, price, showSidebar = true) {
    const existing = cart.find(item => item.id == idParam);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ id: idParam, title: title, price: Number(price), qty: 1 });
    }
    saveAndRefreshCart();
    if (showSidebar) id('cartSidebar').classList.add('open');
}

function updateQty(idParam, delta) {
    const item = cart.find(i => i.id == idParam);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id != idParam);
    }
    saveAndRefreshCart();
}

function clearCart() {
    cart = [];
    saveAndRefreshCart();
}

function saveAndRefreshCart() {
    localStorage.setItem('delices_cart_htg', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const cartItemsContainer = id('cartItems');
    const cartCountEl = id('cartCount');
    const cartTotalEl = id('cartTotalAmount');

    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:30px;">Votre panier est vide 🍰</p>';
    } else {
        cart.forEach(item => {
            total += item.price * item.qty;
            count += item.qty;

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.title}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">${fmtHTG(item.price)} x ${item.qty}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
                    </div>
                </div>
                <div style="font-weight:600;">${fmtHTG(item.price * item.qty)}</div>
            `;
            cartItemsContainer.appendChild(div);
        });
    }

    cartCountEl.textContent = count;
    cartTotalEl.textContent = `${fmtHTG(total)}`;
}

/* --- ZONES DE LIVRAISON --- */
function populateDeliveryZones() {
    const select = id('orderZone');
    if(!select) return;
    select.innerHTML = '<option value="">-- Sélectionnez une zone --</option>';
    DELIVERY_ZONES.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z.name;
        opt.dataset.fee = z.fee;
        opt.textContent = `${z.name} (+${fmtHTG(z.fee)})`;
        select.appendChild(opt);
    });
    select.addEventListener('change', updateCheckoutSummary);
}

/* --- PROCESSUS DE COMMANDE ET STEPPER --- */
function goToCheckoutStep(stepNumber) {
    if (stepNumber === 2) {
        const form = id('checkoutForm');
        if (selectedDeliveryMode === 'domicile') {
            if (!id('orderName').value.trim() || !id('orderPhone').value.trim() || !id('orderAddress').value.trim() || !id('orderZone').value || !id('orderDate').value || !id('orderTime').value) {
                alert('Veuillez remplir tous les champs obligatoires.');
                return;
            }
        } else {
            if (!id('orderName').value.trim() || !id('orderPhone').value.trim() || !id('orderDate').value || !id('orderTime').value) {
                alert('Veuillez remplir votre nom, téléphone, date et heure de retrait.');
                return;
            }
        }
        updateCheckoutSummary();
    }

    id('checkoutStep1').classList.toggle('active', stepNumber === 1);
    id('checkoutStep2').classList.toggle('active', stepNumber === 2);
    id('stepDot1').classList.toggle('active', stepNumber === 1);
    id('stepDot2').classList.toggle('active', stepNumber === 2);
}

function updateCheckoutSummary() {
    const itemsContainer = id('checkoutSummaryItems');
    itemsContainer.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        subtotal += item.price * item.qty;
        const row = document.createElement('div');
        row.innerHTML = `<span>${item.title} (x${item.qty})</span><span>${fmtHTG(item.price * item.qty)}</span>`;
        itemsContainer.appendChild(row);
    });

    let deliveryFee = 0;
    if (selectedDeliveryMode === 'domicile') {
        const zoneSelect = id('orderZone');
        const selectedOpt = zoneSelect.options[zoneSelect.selectedIndex];
        if (selectedOpt && selectedOpt.dataset.fee) {
            deliveryFee = Number(selectedOpt.dataset.fee);
        }
    }

    id('summarySubtotal').textContent = `${fmtHTG(subtotal)}`;
    id('summaryDeliveryFee').textContent = selectedDeliveryMode === 'retrait' ? '0 HTG (Retrait)' : `${fmtHTG(deliveryFee)}`;
    id('summaryTotal').textContent = `${fmtHTG(subtotal + deliveryFee)}`;
    updateMobileMoneyBox();
}

/* --- TOTAL DE LA COMMANDE EN COURS --- */
function getCheckoutTotals() {
    const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    let deliveryFee = 0;
    if (selectedDeliveryMode === 'domicile') {
        const zoneSelect = id('orderZone');
        const selectedOpt = zoneSelect.options[zoneSelect.selectedIndex];
        if (selectedOpt && selectedOpt.dataset.fee) deliveryFee = Number(selectedOpt.dataset.fee);
    }
    return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

/* --- FORMULAIRE MONCASH / NATCASH --- */
function updateMobileMoneyBox() {
    const box = id('mobileMoneyBox');
    if (!isMobileMoney(selectedPaymentMethod)) { box.style.display = 'none'; hideMmError(); return; }
    const { total } = getCheckoutTotals();
    const merchant = PAYMENT_CONFIG[selectedPaymentMethod].merchantNumber;
    id('mmTitle').innerHTML = `<i class="fa-solid fa-mobile-screen-button"></i> Paiement ${selectedPaymentMethod}`;
    id('mmInstructions').innerHTML =
        `1. Envoyez <strong>${fmtHTG(total)}</strong> par ${selectedPaymentMethod} au numéro marchand <strong>${merchant}</strong>.<br>` +
        `2. Recopiez ci-dessous votre numéro, le montant envoyé et le <strong>code de confirmation</strong> reçu par SMS.`;
    id('mmAmount').value = total;
    if (!id('mmPhone').value) id('mmPhone').value = id('orderPhone').value.trim();
    box.style.display = 'block';
}

function showMmError(msg) { const e = id('mmError'); e.textContent = msg; e.style.display = 'block'; e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
function hideMmError() { id('mmError').style.display = 'none'; }

/* Numéro haïtien : 8 chiffres, avec ou sans l'indicatif 509 */
function normalizeHaitiPhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (/^509\d{8}$/.test(digits)) return digits;
    if (/^\d{8}$/.test(digits)) return '509' + digits;
    return null;
}

/* Vérifie les champs saisis ; renvoie { phone, amount, code } ou null */
function validateMobileMoneyFields(total) {
    hideMmError();
    const phone = normalizeHaitiPhone(id('mmPhone').value);
    const amount = Number(id('mmAmount').value);
    const code = id('mmCode').value.trim();
    if (!phone) { showMmError('Numéro de téléphone invalide : saisissez 8 chiffres (ex : 3456 7890).'); return null; }
    if (!amount || amount <= 0) { showMmError('Veuillez saisir le montant payé.'); return null; }
    if (amount !== total) { showMmError(`Le montant saisi (${fmtHTG(amount)}) doit être égal au total de la commande (${fmtHTG(total)}).`); return null; }
    if (!/^[A-Za-z0-9-]{4,30}$/.test(code)) { showMmError('Code de confirmation invalide : 4 à 30 caractères (lettres, chiffres ou tirets).'); return null; }
    if (!id('mmConfirm').checked) { showMmError('Veuillez confirmer que vous avez effectué le paiement.'); return null; }
    const used = (JSON.parse(localStorage.getItem('delices_orders_htg')) || []).some(o => o.paymentDetails && String(o.paymentDetails.code).toUpperCase() === code.toUpperCase());
    if (used) { showMmError('Ce code de confirmation a déjà été utilisé pour une autre commande.'); return null; }
    return { phone, amount, code };
}

/* Appelle VOTRE serveur (qui interroge l'API MonCash avec les clés secrètes) */
async function verifyPaymentOnServer(method, details) {
    const url = PAYMENT_CONFIG[method].verifyUrl;
    if (!url) return { checked: false };
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ method, transactionId: details.code, phone: details.phone, amount: details.amount })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.verified === true) return { checked: true, verified: true };
        return { checked: true, verified: false, message: data.message || 'Paiement introuvable ou non conforme.' };
    } catch (e) {
        return { checked: true, verified: false, message: 'Impossible de joindre le serveur de vérification. Réessayez dans un instant.' };
    }
}

async function processOrder() {
    const totals = getCheckoutTotals();
    let paymentStatus = 'a_regler';        // livraison / retrait / carte : à régler
    let paymentDetails = null;

    if (isMobileMoney(selectedPaymentMethod)) {
        const details = validateMobileMoneyFields(totals.total);
        if (!details) return;
        const btn = id('confirmPaymentBtn');
        const label = btn.textContent;
        btn.classList.add('is-loading'); btn.textContent = 'Vérification…';
        const check = await verifyPaymentOnServer(selectedPaymentMethod, details);
        btn.classList.remove('is-loading'); btn.textContent = label;
        if (check.checked && !check.verified) { showMmError(check.message); return; }   // paiement refusé : aucune commande créée
        paymentStatus = check.verified ? 'paye' : 'en_attente_verification';
        paymentDetails = { phone: details.phone, amount: details.amount, code: details.code, verified: !!check.verified };
    }

    const orderNum = `CMD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    
    let deliveryFee = 0;
    if (selectedDeliveryMode === 'domicile') {
        const zoneSelect = id('orderZone');
        const selectedOpt = zoneSelect.options[zoneSelect.selectedIndex];
        if (selectedOpt && selectedOpt.dataset.fee) deliveryFee = Number(selectedOpt.dataset.fee);
    }

    const orderDetails = {
        number: orderNum,
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        clientName: id('orderName').value.trim(),
        phone: id('orderPhone').value.trim(),
        email: id('orderEmail').value.trim(),
        mode: selectedDeliveryMode,
        address: selectedDeliveryMode === 'domicile' ? id('orderAddress').value.trim() : 'Retrait en boutique',
        zone: selectedDeliveryMode === 'domicile' ? id('orderZone').value : 'N/A',
        desiredDate: id('orderDate').value,
        desiredTime: id('orderTime').value,
        instructions: id('orderInstructions').value.trim(),
        comment: id('orderComment').value.trim(),
        items: [...cart],
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        total: subtotal + deliveryFee,
        paymentMethod: selectedPaymentMethod,
        paymentStatus: paymentStatus,
        paymentDetails: paymentDetails,
        status: 'enregistree'
    };

    let ordersHistory = JSON.parse(localStorage.getItem('delices_orders_htg')) || [];
    ordersHistory.push(orderDetails);
    localStorage.setItem('delices_orders_htg', JSON.stringify(ordersHistory));

    closeModal('checkoutModal');
    showOrderConfirmation(orderDetails);
    clearCart();
}

function paymentStatusLabel(order) {
    if (order.paymentStatus === 'paye') return 'Paiement vérifié ✔';
    if (order.paymentStatus === 'en_attente_verification') return `En attente de vérification (code ${order.paymentDetails.code})`;
    return 'À régler';
}

function showOrderConfirmation(order) {
    id('confirmOrderNumber').textContent = order.number;

    let itemsHtml = order.items.map(i => `<div class="order-confirm-detail-row"><span>${i.title} x ${i.qty}</span><span>${fmtHTG(i.price * i.qty)}</span></div>`).join('');

    id('confirmOrderDetails').innerHTML = `
        <div style="margin-bottom:15px; font-size:0.9rem; color:var(--text-muted);">
            <strong>Client :</strong> ${order.clientName} (${order.phone})<br>
            <strong>Mode :</strong> ${order.mode === 'domicile' ? 'Livraison à domicile' : 'Retrait sur place'}<br>
            ${order.mode === 'domicile' ? `<strong>Adresse :</strong> ${order.address} (${order.zone})<br>` : ''}
            <strong>Date souhaitée :</strong> ${order.desiredDate} à ${order.desiredTime}<br>
            <strong>Mode de paiement :</strong> ${order.paymentMethod}<br>
            <strong>Statut du paiement :</strong> ${paymentStatusLabel(order)}
        </div>
        <div style="background:#fdf6f0; border-radius:10px; padding:12px; margin-bottom:15px;">
            ${itemsHtml}
            <div class="order-confirm-detail-row" style="font-weight:700; border-top:1px solid #e5d9d0; margin-top:8px; padding-top:8px;">
                <span>Total réglé / à régler</span>
                <span>${fmtHTG(order.total)}</span>
            </div>
        </div>
    `;

    openModal('orderConfirmationModal');
}

/* --- SUIVI DE COMMANDE --- */
function trackOrder() {
    const inputVal = id('trackingInput').value.trim().toUpperCase();
    const notFoundEl = id('trackingNotFound');
    const resultEl = id('trackingResult');

    notFoundEl.classList.remove('visible');
    resultEl.classList.remove('visible');

    if (!inputVal) return alert('Veuillez saisir un numéro de commande.');

    const ordersHistory = JSON.parse(localStorage.getItem('delices_orders_htg')) || [];
    const found = ordersHistory.find(o => o.number.toUpperCase() === inputVal);

    if (!found) {
        notFoundEl.classList.add('visible');
        return;
    }

    id('trackingOrderSummary').innerHTML = `
        <strong>Commande :</strong> ${found.number}<br>
        <strong>Client :</strong> ${found.clientName}<br>
        <strong>Date de commande :</strong> ${found.date}<br>
        <strong>Montant total :</strong> ${fmtHTG(found.total)} (${found.paymentMethod})
    `;

    const steps = [
        { key: 'enregistree', label: 'Commande enregistrée', icon: 'fa-file-lines' },
        { key: 'preparation', label: 'En cours de préparation en atelier', icon: 'fa-kitchen-set' },
        { key: 'livraison', label: 'En cours de livraison / Prête au retrait', icon: 'fa-truck-fast' },
        { key: 'livree', label: 'Livrée / Retirée', icon: 'fa-circle-check' }
    ];

    const progressList = id('trackingProgressList');
    progressList.innerHTML = '';

    steps.forEach((s, idx) => {
        const li = document.createElement('li');
        li.className = 'done'; 
        li.innerHTML = `
            <div class="tracking-step-icon"><i class="fa-solid ${s.icon}"></i></div>
            <div class="tracking-step-label">${s.label}</div>
        `;
        progressList.appendChild(li);
    });

    resultEl.classList.add('visible');
}

/* --- IMPRESSION ET TÉLÉCHARGEMENT DE REÇU --- */
function printReceipt() {
    window.print();
}

function downloadReceipt() {
    const receiptText = id('printableReceipt').innerText;
    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Recu-Delices-De-Jonathan.txt`;
    link.click();
}

/* --- MODALES & LIGHTBOX --- */
function openModal(modalId) {
    const target = id(modalId);
    if (target) target.classList.add('open');
}

function closeModal(modalId) {
    const target = id(modalId);
    if (target) target.classList.remove('open');
}

function openLightbox(src) {
    id('lightboxImg').src = src;
    id('lightbox').classList.add('open');
}

function closeLightbox() {
    id('lightbox').classList.remove('open');
}

/* --- FORMULAIRES EXTERNES --- */
function handleContactSubmit(e) {
    e.preventDefault();
    alert('Merci pour votre message ! Notre équipe vous répondra dans les plus brefs délais.');
    id('contactForm').reset();
}

function handleCustomSubmit(e) {
    e.preventDefault();
    alert('Votre demande de gâteau sur-mesure a bien été transmise ! Nous prendrons contact avec vous très rapidement.');
    id('customForm').reset();
    closeModal('customModal');
}

/* --- SLIDER CARROUSEL AVIS --- */
function startTestimonialSlider() {
    const track = id('testimonialTrack');
    if(!track) return;
    let index = 0;
    const total = track.children.length;

    setInterval(() => {
        index = (index + 1) % total;
        track.style.transform = `translateX(-${index * 100}%)`;
    }, 5000);
}
