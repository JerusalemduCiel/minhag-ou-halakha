/* ========================================
   ORA SHEL TORAH - GESTION DU PANIER (SIMPLIFIÉ)
   ======================================== */

// Panier minimal
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Fonction pour ouvrir/fermer le panier
function toggleCart() {
    const panel = document.getElementById('panier-sidebar');
    if (panel) {
        panel.classList.toggle('open');
        document.body.style.overflow = panel.classList.contains('open') ? 'hidden' : '';
    }
}

// Fonction pour fermer le panier
function closeCart() {
    const panel = document.getElementById('panier-sidebar');
    if (panel) {
        panel.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Mettre à jour l'affichage du panier
function updateCartDisplay() {
    // Compteur
    const count = document.querySelector('.cart-count');
    if (count) {
        const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        count.textContent = total;
        if (total > 0) {
            count.style.display = 'flex';
        } else {
            count.style.display = 'none';
        }
    }
    
    // Articles dans le panier
    const itemsDiv = document.querySelector('.cart-items');
    if (!itemsDiv) return;
    
    if (cart.length === 0) {
        itemsDiv.innerHTML = '<p class="cart-empty">Votre panier est vide</p>';
        return;
    }
    
    itemsDiv.innerHTML = cart.map(item => `
        <div class="cart-item" data-product="${item.id || ''}">
            ${item.image ? `<img src="${item.image}" alt="${item.name || ''}" loading="lazy">` : ''}
            <div class="cart-item-info">
                <h4>${item.name || 'Produit'}</h4>
                <p class="cart-item-price">${formatPrice(item.price || 0)}</p>
            </div>
            <div class="cart-item-quantity">
                <button class="qty-minus" onclick="updateQuantity('${item.id}', ${(item.quantity || 1) - 1})">-</button>
                <input type="number" value="${item.quantity || 1}" min="1" max="10" 
                       onchange="updateQuantity('${item.id}', this.value)">
                <button class="qty-plus" onclick="updateQuantity('${item.id}', ${(item.quantity || 1) + 1})">+</button>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Supprimer">🗑️</button>
        </div>
    `).join('');
    
    // Total
    updateCartTotal();
}

// Mettre à jour le total
function updateCartTotal() {
    const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    const shippingCost = 7.59;
    const total = subtotal + shippingCost;
    
    const subtotalEl = document.querySelector('.subtotal-amount');
    const shippingEl = document.querySelector('.shipping-amount');
    const totalEl = document.querySelector('.total-amount');
    
    // Afficher la ligne frais de port
    if (shippingEl) {
        const shippingRow = shippingEl.closest('.shipping-row, .summary-line');
        if (shippingRow) {
            shippingRow.style.display = '';
        }
        shippingEl.style.display = '';
        shippingEl.textContent = 'Livraison Colissimo : 7,59 €';
    }
    
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (totalEl) {
        totalEl.textContent = formatPrice(total);
        
        // Supprimer l'ancienne mention "Frais de port calculés à la commande"
        const notice = document.querySelector('.shipping-notice');
        if (notice) notice.remove();
    }
}

// Formater le prix
function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

// Notification d'ajout au panier
function showCartNotification(productName) {
    // Supprimer les notifications existantes
    const existing = document.querySelectorAll('.cart-notification');
    existing.forEach(n => n.remove());
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <div class="notification-content">
            ✓ ${productName} ajouté au panier
            <button onclick="toggleCart()">Voir le panier</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Afficher
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Masquer après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Ajouter au panier (version avec paramètres directs)
function addToCart(productId, productName, price, image) {
    // Recharger le panier depuis localStorage
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ 
            id: productId, 
            name: productName, 
            price: parseFloat(price), 
            image: image || '', 
            quantity: 1 
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    showCartNotification(productName);
}

// Retirer du panier
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartDisplay();
}

// Mettre à jour la quantité
function updateQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = Math.max(1, parseInt(quantity) || 1);
        item.quantity = newQuantity;
        saveCart();
        updateCartDisplay();
    }
}

// Sauvegarder le panier
function saveCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch (e) {
        console.error('Erreur lors de la sauvegarde du panier:', e);
    }
}

// Initialiser le panier
function initCart() {
    // Charger depuis localStorage
    try {
        const saved = localStorage.getItem('cart');
        if (saved) {
            cart = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Erreur lors du chargement du panier:', e);
        cart = [];
    }
    
    // Mettre à jour l'affichage
    updateCartDisplay();
    
    // Écouter les clics sur l'icône du panier
    const cartIcon = document.querySelector('.cart-icon');
    if (cartIcon) {
        cartIcon.addEventListener('click', function(e) {
            e.preventDefault();
            toggleCart();
        });
    }
    
    // Écouter les clics sur le bouton fermer
    const closeBtn = document.querySelector('.close-cart');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            closeCart();
        });
    }
}

// Fonction pour passer commande
function proceedToCheckout() {
    if (cart.length === 0) {
        alert('Votre panier est vide');
        return;
    }
    
    // Rediriger vers la page de commande ou Stripe
    alert('Fonctionnalité de commande en cours de développement');
    // TODO: Implémenter l'intégration Stripe
}

// Exporter les fonctions globales
window.toggleCart = toggleCart;
window.closeCart = closeCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.proceedToCheckout = proceedToCheckout;
window.showCartNotification = showCartNotification;
window.cart = cart;

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', initCart);
