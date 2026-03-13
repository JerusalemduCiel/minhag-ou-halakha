/* ========================================
   POPUP PRELAUNCH - INTERCEPTION BOUTONS ACHAT
   ======================================== */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        formspreeEndpoint: 'https://formspree.io/f/xwpkkgvp',
        localStorageKey: 'prelaunch_email_submitted',
        // Sélecteurs des boutons à intercepter
        buttonSelectors: [
            // Classes CSS
            '.btn-commander',
            '.btn-acheter',
            '.btn-add-to-cart',
            '.btn-ajouter-panier',
            '.btn-checkout',
            '.btn-precommander',
            '.btn-store',
            '.buy-button',
            // Attributs data
            '[data-stripe]',
            '[data-price-id]',
            // Liens Stripe
            'a[href*="stripe.com"]',
            'a[href*="buy.stripe.com"]',
            // Boutons avec texte spécifique
            'button:contains("Commander")',
            'button:contains("Acheter")',
            'button:contains("Précommander")',
            'a:contains("Commander")',
            'a:contains("Acheter")',
            'a:contains("Précommander")'
        ]
    };

    // État du popup
    let popupInitialized = false;
    let popupElement = null;

    /* ========================================
       INITIALISATION
       ======================================== */

    function init() {
        // Vérifier si l'utilisateur a déjà soumis son email
        if (hasSubmittedEmail()) {
            console.log('✅ Email déjà soumis, popup désactivé');
            return;
        }

        // Créer le popup dans le DOM
        createPopup();

        // Intercepter les clics sur les boutons d'achat
        interceptPurchaseButtons();

        // Intercepter les fonctions globales
        interceptGlobalFunctions();

        popupInitialized = true;
        console.log('✅ Popup prelaunch initialisé');
    }

    /* ========================================
       CRÉATION DU POPUP
       ======================================== */

    function createPopup() {
        // Créer l'overlay
        const overlay = document.createElement('div');
        overlay.className = 'prelaunch-overlay';
        overlay.id = 'prelaunch-overlay';

        // Créer le popup
        const popup = document.createElement('div');
        popup.className = 'prelaunch-popup';

        popup.innerHTML = `
            <button class="prelaunch-close" aria-label="Fermer" type="button">×</button>
            
            <div class="prelaunch-content">
                <h2 class="prelaunch-title">Bientôt disponible !</h2>
                <p class="prelaunch-message">
                    Nos jeux sont en cours de production et seront disponibles très prochainement. 
                    Laissez-nous votre adresse email pour être prévenu(e) dès leur sortie et bénéficier d'une offre de lancement exclusive.
                </p>
                
                <form class="prelaunch-form" id="prelaunch-form">
                    <div class="prelaunch-input-group">
                        <input 
                            type="email" 
                            class="prelaunch-input" 
                            id="prelaunch-email" 
                            name="email" 
                            placeholder="Votre adresse email" 
                            required 
                            autocomplete="email"
                        >
                        <div class="prelaunch-error" id="prelaunch-error"></div>
                    </div>
                    
                    <button type="submit" class="prelaunch-submit" id="prelaunch-submit">
                        Me prévenir
                    </button>
                    
                    <a href="#" class="prelaunch-cancel" id="prelaunch-cancel">Non merci</a>
                </form>
                
                <div class="prelaunch-success" id="prelaunch-success">
                    <span class="prelaunch-success-icon">✓</span>
                    <p class="prelaunch-success-message">
                        Merci ! Vous serez prévenu(e) dès que nos jeux seront disponibles.
                    </p>
                </div>
            </div>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        popupElement = overlay;

        // Gérer la soumission du formulaire
        const form = popup.querySelector('#prelaunch-form');
        form.addEventListener('submit', handleFormSubmit);

        // Gérer la fermeture
        setupCloseHandlers(overlay);
    }

    /* ========================================
       INTERCEPTION DES BOUTONS
       ======================================== */

    function interceptPurchaseButtons() {
        // Sélecteurs CSS valides (sans :contains qui n'existe pas en CSS)
        // NOTE: .btn-store et [data-action="store"] sont exclus - ils scrollent vers la boutique
        const validSelectors = [
            '.btn-commander',
            '.btn-acheter',
            '.btn-add-to-cart',
            '.btn-ajouter-panier',
            '.btn-checkout',
            '.btn-precommander',
            // '.btn-store', // DÉSACTIVÉ - scroll vers boutique au lieu de modale
            '.buy-button',
            '[data-stripe]',
            '[data-price-id]',
            'a[href*="stripe.com"]',
            'a[href*="buy.stripe.com"]'
        ];

        // Intercepter par sélecteur CSS
        validSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(button => {
                if (shouldIntercept(button)) {
                    button.addEventListener('click', handlePurchaseClick, true);
                }
            });
        });

        // Intercepter par texte (pour les boutons avec texte "Commander", "Acheter", etc.)
        interceptByText();

        // Observer les nouveaux éléments ajoutés dynamiquement
        observeNewElements();
    }

    function interceptByText() {
        // Chercher tous les boutons et liens
        const allButtons = document.querySelectorAll('button, a, [role="button"]');
        
        allButtons.forEach(element => {
            // Ne pas intercepter les boutons "Découvrir le contenu"
            if (element.getAttribute('data-action') === 'content') {
                return;
            }
            
            const text = element.textContent.trim().toLowerCase();
            const purchaseKeywords = ['commander', 'acheter', 'précommander', 'ajouter au panier'];
            
            if (purchaseKeywords.some(keyword => text.includes(keyword))) {
                if (shouldIntercept(element)) {
                    element.addEventListener('click', handlePurchaseClick, true);
                }
            }
        });
    }

    function shouldIntercept(element) {
        // Ne pas intercepter si :
        // - L'élément a déjà un handler prelaunch
        // - C'est un lien vers une ancre (#) qui n'est pas Stripe
        // - C'est un bouton "Découvrir le contenu" (data-action="content")
        // - C'est un bouton "Commander" (data-action="store" ou .btn-store) - désactivé pour scroll vers boutique
        if (element.dataset.prelaunchHandled) {
            return false;
        }

        // Ne pas intercepter les boutons "Découvrir le contenu"
        if (element.getAttribute('data-action') === 'content') {
            return false;
        }

        // Ne pas intercepter les boutons "Commander" (data-action="store" ou .btn-store)
        // Ils doivent scroller vers la boutique au lieu d'afficher la modale
        if (element.getAttribute('data-action') === 'store' || element.classList.contains('btn-store')) {
            return false;
        }

        // Vérifier si c'est un lien vers Stripe
        if (element.tagName === 'A' && element.href) {
            if (element.href.includes('stripe.com') || element.href.includes('buy.stripe.com')) {
                return true;
            }
            // Ne pas intercepter les liens d'ancres internes (sauf si c'est vers la boutique)
            if (element.href.includes('#') && !element.href.includes('boutique')) {
                return false;
            }
        }

        element.dataset.prelaunchHandled = 'true';
        return true;
    }

    function observeNewElements() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Vérifier le nœud lui-même
                        if (node.matches && shouldIntercept(node)) {
                            node.addEventListener('click', handlePurchaseClick, true);
                        }
                        
                        // Vérifier les descendants
                        // NOTE: .btn-store et [data-action="store"] sont exclus - ils scrollent vers la boutique
                        const purchaseButtons = node.querySelectorAll && node.querySelectorAll(
                            '.btn-commander, .btn-acheter, .btn-add-to-cart, .btn-checkout, .btn-precommander, [data-stripe], [data-price-id]'
                        );
                        
                        if (purchaseButtons) {
                            purchaseButtons.forEach(button => {
                                if (shouldIntercept(button)) {
                                    button.addEventListener('click', handlePurchaseClick, true);
                                }
                            });
                        }

                        // Intercepter par texte dans les nouveaux éléments
                        const allButtons = node.querySelectorAll && node.querySelectorAll('button, a, [role="button"]');
                        if (allButtons) {
                            allButtons.forEach(element => {
                                // Ne pas intercepter les boutons "Découvrir le contenu"
                                if (element.getAttribute('data-action') === 'content') {
                                    return;
                                }
                                
                                const text = element.textContent.trim().toLowerCase();
                                const purchaseKeywords = ['commander', 'acheter', 'précommander', 'ajouter au panier'];
                                
                                if (purchaseKeywords.some(keyword => text.includes(keyword))) {
                                    if (shouldIntercept(element)) {
                                        element.addEventListener('click', handlePurchaseClick, true);
                                    }
                                }
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /* ========================================
       INTERCEPTION DES FONCTIONS GLOBALES
       ======================================== */

    function interceptGlobalFunctions() {
        // DÉSACTIVÉ - Interception addToCart et proceedToCheckout
        // Ces fonctions causaient des conflits "Cannot redefine property"
        // Commenté pour éviter les erreurs
        
        /*
        // Intercepter addToCart (même si défini plus tard)
        // Vérifier d'abord si addToCart existe déjà pour éviter les conflits
        if (!window.addToCart) {
            window.addToCart = function(...args) {
                handlePurchaseClick({ 
                    preventDefault: () => {}, 
                    stopPropagation: () => {}, 
                    stopImmediatePropagation: () => {} 
                });
            };
        } else {
            // Si addToCart existe déjà, sauvegarder l'original et le remplacer
            const addToCartOriginal = window.addToCart;
            window.addToCart = function(...args) {
                handlePurchaseClick({ 
                    preventDefault: () => {}, 
                    stopPropagation: () => {}, 
                    stopImmediatePropagation: () => {} 
                });
            };
        }

        // Intercepter proceedToCheckout (même si défini plus tard)
        // Vérifier d'abord si proceedToCheckout existe déjà pour éviter les conflits
        if (!window.proceedToCheckout) {
            window.proceedToCheckout = function(...args) {
                handlePurchaseClick({ 
                    preventDefault: () => {}, 
                    stopPropagation: () => {}, 
                    stopImmediatePropagation: () => {} 
                });
            };
        } else {
            // Si proceedToCheckout existe déjà, sauvegarder l'original et le remplacer
            const proceedToCheckoutOriginal = window.proceedToCheckout;
            window.proceedToCheckout = function(...args) {
                handlePurchaseClick({ 
                    preventDefault: () => {}, 
                    stopPropagation: () => {}, 
                    stopImmediatePropagation: () => {} 
                });
            };
        }
        */
    }

    /* ========================================
       GESTION DES CLICS
       ======================================== */

    function handlePurchaseClick(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // Afficher le popup
        showPopup();

        return false;
    }

    /* ========================================
       AFFICHAGE/FERMETURE DU POPUP
       ======================================== */

    function showPopup() {
        if (!popupElement) {
            createPopup();
        }

        // Réinitialiser le formulaire
        const form = popupElement.querySelector('#prelaunch-form');
        const success = popupElement.querySelector('#prelaunch-success');
        const emailInput = popupElement.querySelector('#prelaunch-email');
        const errorDiv = popupElement.querySelector('#prelaunch-error');

        form.classList.remove('hidden');
        success.classList.remove('active');
        emailInput.value = '';
        errorDiv.classList.remove('active');
        errorDiv.textContent = '';

        // Afficher avec animation
        popupElement.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            popupElement.classList.add('active');
            emailInput.focus();
        }, 10);
    }

    function closePopup() {
        if (!popupElement) return;

        popupElement.classList.remove('active');
        document.body.style.overflow = '';

        setTimeout(() => {
            popupElement.style.display = 'none';
        }, 300);
    }

    function setupCloseHandlers(overlay) {
        // Bouton X
        const closeBtn = overlay.querySelector('.prelaunch-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closePopup);
        }

        // Lien "Non merci"
        const cancelLink = overlay.querySelector('#prelaunch-cancel');
        if (cancelLink) {
            cancelLink.addEventListener('click', (e) => {
                e.preventDefault();
                closePopup();
            });
        }

        // Clic sur l'overlay (hors du popup)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePopup();
            }
        });

        // Touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                closePopup();
            }
        });
    }

    /* ========================================
       GESTION DU FORMULAIRE
       ======================================== */

    async function handleFormSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        const form = event.target;
        const emailInput = form.querySelector('#prelaunch-email');
        const submitBtn = form.querySelector('#prelaunch-submit');
        const errorDiv = form.querySelector('#prelaunch-error');
        const successDiv = popupElement.querySelector('#prelaunch-success');

        const email = emailInput.value.trim();

        // Validation
        if (!email || !isValidEmail(email)) {
            errorDiv.textContent = 'Veuillez entrer une adresse email valide';
            errorDiv.classList.add('active');
            return;
        }

        // Désactiver le bouton
        submitBtn.disabled = true;
        submitBtn.textContent = 'Envoi en cours...';
        errorDiv.classList.remove('active');

        try {
            // Envoyer à Formspree
            const response = await fetch(CONFIG.formspreeEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    _subject: 'Nouvelle inscription prelaunch - Ora Shel Torah',
                    _replyto: email
                })
            });

            if (response.ok) {
                // Succès
                form.classList.add('hidden');
                successDiv.classList.add('active');

                // Sauvegarder dans localStorage
                saveSubmittedEmail(email);

                // Fermer après 3 secondes
                setTimeout(() => {
                    closePopup();
                }, 3000);
            } else {
                throw new Error('Erreur lors de l\'envoi');
            }
        } catch (error) {
            console.error('Erreur Formspree:', error);
            errorDiv.textContent = 'Une erreur est survenue. Veuillez réessayer plus tard.';
            errorDiv.classList.add('active');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Me prévenir';
        }
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /* ========================================
       LOCALSTORAGE
       ======================================== */

    function hasSubmittedEmail() {
        return localStorage.getItem(CONFIG.localStorageKey) === 'true';
    }

    function saveSubmittedEmail(email) {
        localStorage.setItem(CONFIG.localStorageKey, 'true');
        localStorage.setItem(CONFIG.localStorageKey + '_email', email);
    }

    /* ========================================
       DÉMARRAGE
       ======================================== */

    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

