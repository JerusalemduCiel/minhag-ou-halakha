/* ========================================
   SYSTÈME DE MODALES - VERSION SIMPLE
   ======================================== */

console.log('🎯 Modals.js chargé');

// Attendre que le DOM soit prêt
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du système de modales');
    
    // 1. Gérer les clics sur les panneaux hero-third
    initPanelClicks();
    
    // 2. Gérer les boutons dans les modales
    initModalButtons();
    
    // 3. Gérer la fermeture des modales
    initCloseHandlers();
    
    // 4. Initialiser la nouvelle modale "Découvrir le contenu"
    initContentDiscoveryModal();
    
    // 5. Initialiser les carrousels verticaux
    initVerticalCarousels();
    
    console.log('✅ Système de modales initialisé');
    
    /* ========================================
       5. CARROUSEL VERTICAL
       ======================================== */
    
    function initVerticalCarousels() {
        console.log('🎯 Initialisation des carrousels verticaux');
        
        document.querySelectorAll('.vertical-carousel').forEach(carousel => {
            const items = carousel.querySelectorAll('.vertical-carousel-item');
            const prevBtn = carousel.querySelector('.vertical-carousel-nav.prev');
            const nextBtn = carousel.querySelector('.vertical-carousel-nav.next');
            const indicators = carousel.querySelectorAll('.vertical-carousel-indicator');
            
            if (!items.length) return;
            
            let currentIndex = 0;
            
            function updateCarousel(index) {
                // Désactiver tous les items et gérer les vidéos
                items.forEach((item, i) => {
                    item.classList.remove('active');
                    if (indicators[i]) indicators[i].classList.remove('active');
                    
                    // Mettre en pause et réinitialiser les vidéos inactives
                    const video = item.querySelector('video');
                    if (video && i !== index) {
                        video.pause();
                        video.currentTime = 0;
                    }
                });
                
                // Activer l'item courant
                const activeItem = items[index];
                if (activeItem) {
                    activeItem.classList.add('active');
                    if (indicators[index]) indicators[index].classList.add('active');
                    
                    // Charger la vidéo si elle existe dans l'item actif
                    const activeVideo = activeItem.querySelector('video.carousel-video');
                    if (activeVideo) {
                        activeVideo.load();
                    }
                }
                
                currentIndex = index;
                
                // Gérer les boutons disabled
                if (prevBtn) prevBtn.disabled = index === 0;
                if (nextBtn) nextBtn.disabled = index === items.length - 1;
            }
            
            // Bouton précédent
            if (prevBtn) {
                prevBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (currentIndex > 0) {
                        updateCarousel(currentIndex - 1);
                    }
                });
            }
            
            // Bouton suivant
            if (nextBtn) {
                nextBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (currentIndex < items.length - 1) {
                        updateCarousel(currentIndex + 1);
                    }
                });
            }
            
            // Indicateurs
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', function(e) {
                    e.stopPropagation();
                    updateCarousel(index);
                });
            });
            
            // Initialiser
            updateCarousel(0);
            
            // Observer les changements d'item actif pour les vidéos (sécurité supplémentaire)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        items.forEach((item, i) => {
                            const video = item.querySelector('video.carousel-video');
                            if (video) {
                                if (item.classList.contains('active')) {
                                    // Item devient actif : charger la vidéo
                                    video.load();
                                } else {
                                    // Item devient inactif : arrêter et réinitialiser
                                    video.pause();
                                    video.currentTime = 0;
                                }
                            }
                        });
                    }
                });
            });
            
            // Observer tous les items
            items.forEach(item => {
                observer.observe(item, { attributes: true, attributeFilter: ['class'] });
            });
        });
    }
    
    function resetVerticalCarousel(carousel) {
        const items = carousel.querySelectorAll('.vertical-carousel-item');
        const indicators = carousel.querySelectorAll('.vertical-carousel-indicator');
        const prevBtn = carousel.querySelector('.vertical-carousel-nav.prev');
        const nextBtn = carousel.querySelector('.vertical-carousel-nav.next');
        
        items.forEach((item, i) => {
            item.classList.remove('active');
            if (indicators[i]) indicators[i].classList.remove('active');
        });
        
        if (items[0]) items[0].classList.add('active');
        if (indicators[0]) indicators[0].classList.add('active');
        
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = items.length <= 1;
    }
    
    // Exposer les fonctions globalement
    window.initVerticalCarousels = initVerticalCarousels;
    window.resetVerticalCarousel = resetVerticalCarousel;
    
/* ========================================
   1. OUVERTURE DES MODALES
   ======================================== */

function initPanelClicks() {
    console.log('🎯 Initialisation des clics sur les panneaux');
    
    document.querySelectorAll('.split-panel').forEach(panel => {
        panel.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const target = this.getAttribute('data-target');
            console.log('🎯 Clic sur panneau, target:', target);
            
            // Trouver la section hero-bis correspondante
            const heroSection = document.getElementById(target);
            
            if (heroSection) {
                console.log('✅ Section hero trouvée:', target);
                
                // Scroll vers le centre de la section (et non le haut)
                const headerHeight = document.getElementById('main-header')?.offsetHeight || 0;
                const heroSectionHeight = heroSection.offsetHeight;
                const viewportHeight = window.innerHeight;
                
                // Calculer la position pour centrer la section dans la fenêtre
                const targetPosition = heroSection.offsetTop - headerHeight - (viewportHeight / 2) + (heroSectionHeight / 2);
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                console.log('✅ Scroll vers hero déployé (centré)');
            } else {
                console.error('❌ Section hero introuvable:', target);
            }
        });
    });
}

/* ========================================
   2. BOUTONS DANS LES MODALES
   ======================================== */

function initModalButtons() {
    // Bouton "Voir le teaser"
    document.querySelectorAll('[data-action="video"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showSection(this, 'video-section');
        });
    });
    
    // Bouton "Essayer la démo"
    document.querySelectorAll('[data-action="demo"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Pour la démo, on ouvre dans un nouvel onglet
            const heroSection = this.closest('section[id^="hero-bis-"]');
            const sectionId = heroSection ? heroSection.id : '';
            
            let url = '';
            if (sectionId === 'hero-bis-jdc') url = 'https://jerusalemduciel.netlify.app';
            if (sectionId === 'hero-bis-moh') url = 'https://minhagouhalakha.netlify.app';
            if (sectionId === 'hero-bis-poz') url = 'https://poztamitzvah.netlify.app';
            
            if (url) {
                window.open(url, '_blank');
                console.log('🎮 Démo ouverte:', url);
            }
        });
    });
    
    // Bouton "Découvrir le contenu" - NOUVELLE MODALE
    document.querySelectorAll('[data-action="content"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Déterminer quel jeu
            const modalId = this.getAttribute('data-modal') || '';
            const heroSection = this.closest('section[id^="hero-bis-"]');
            let gameId = '';
            
            if (modalId === 'modal-jdc' || (heroSection && heroSection.id === 'hero-bis-jdc')) {
                gameId = 'jdc';
            } else if (modalId === 'modal-moh' || (heroSection && heroSection.id === 'hero-bis-moh')) {
                gameId = 'moh';
            } else if (modalId === 'modal-poz' || (heroSection && heroSection.id === 'hero-bis-poz')) {
                gameId = 'poz';
            }
            
            if (gameId) {
                openContentDiscoveryModal(gameId);
            } else {
                // Fallback vers l'ancien système
                showSection(this, 'content-section');
            }
        });
    });
    
    // Bouton "Store / Shop" - Scroll vers la boutique (modale prelaunch désactivée)
    document.querySelectorAll('[data-action="store"], .btn-store, .btn-modal.btn-store').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Scroll vers la boutique
            const target = document.getElementById('boutique') 
                || document.getElementById('cta-final')
                || document.getElementById('precommande')
                || document.querySelector('.cart-section');
            
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Boutons "← Retour"
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔙 Clic sur bouton retour');
            
            // Retour à l'état initial (afficher background + content)
            const heroSection = this.closest('section[id^="hero-bis-"]');
            if (heroSection) {
                const heroBackground = heroSection.querySelector('.hero-bis-background');
                const heroContent = heroSection.querySelector('.hero-bis-content');
                const contentSections = heroSection.querySelectorAll('.video-section, .demo-section, .content-section');
                
                if (heroBackground) heroBackground.style.display = 'block';
                if (heroContent) heroContent.style.display = 'block';
                contentSections.forEach(section => section.style.display = 'none');
                
                console.log('✅ Retour à l\'état initial');
            }
        });
    });
}

function showSection(button, sectionClass) {
    const heroSection = button.closest('section[id^="hero-bis-"]');
    if (!heroSection) {
        console.error('❌ Section hero parente introuvable');
        return;
    }
    
    console.log('🎯 Affichage de la section:', sectionClass, 'dans:', heroSection.id);
    
    // Cacher le contenu hero initial
    const heroBackground = heroSection.querySelector('.hero-bis-background');
    const heroContent = heroSection.querySelector('.hero-bis-content');
    
    if (heroBackground) heroBackground.style.display = 'none';
    if (heroContent) heroContent.style.display = 'none';
    
    // Cacher toutes les sections
    heroSection.querySelectorAll('.video-section, .demo-section, .content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Afficher la section demandée
    const section = heroSection.querySelector('.' + sectionClass);
    if (section) {
        section.style.display = 'block';
        console.log('✅ Section affichée:', sectionClass);
        
        // Scroll vers le haut de la section
        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } else {
        console.error('❌ Section introuvable:', sectionClass);
    }
}

/* ========================================
   3. FERMETURE DES MODALES
   ======================================== */

function initCloseHandlers() {
    // Gérer les boutons de fermeture (X)
    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('❌ Clic sur bouton fermeture');
            
            // Retour à l'état initial (afficher background + content)
            const heroSection = this.closest('section[id^="hero-bis-"]');
            if (heroSection) {
                const heroBackground = heroSection.querySelector('.hero-bis-background');
                const heroContent = heroSection.querySelector('.hero-bis-content');
                const contentSections = heroSection.querySelectorAll('.video-section, .demo-section, .content-section');
                
                if (heroBackground) heroBackground.style.display = 'block';
                if (heroContent) heroContent.style.display = 'block';
                contentSections.forEach(section => section.style.display = 'none');
                
                console.log('✅ Fermeture effectuée');
            }
        });
    });
}
    
/* ========================================
   4. MODALE DÉCOUVRIR LE CONTENU - NOUVEAU
   ======================================== */

function initContentDiscoveryModal() {
        console.log('🎯 Initialisation modale "Découvrir le contenu"');
    
    // Bouton de fermeture X
    document.querySelectorAll('.content-discovery-close').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const overlay = this.closest('.content-discovery-overlay');
            if (overlay) {
                closeContentDiscoveryModal(overlay);
            }
        });
    });
    
    // Clic sur l'overlay (pas sur la modal)
    document.querySelectorAll('.content-discovery-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeContentDiscoveryModal(this);
            }
        });
    });
    
    // Touche Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.content-discovery-overlay.active');
            if (activeModal) {
                closeContentDiscoveryModal(activeModal);
            }
        }
    });
    
    // Empêcher la propagation des clics dans la modal
    document.querySelectorAll('.content-discovery-modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    function openContentDiscoveryModal(gameId) {
        console.log('🎯 Ouverture modale découverte contenu:', gameId);
    
    const overlay = document.getElementById(`content-discovery-${gameId}`);
    if (!overlay) {
        console.error('❌ Overlay introuvable:', gameId);
        return;
    }
    
    // Désactiver le scroll du body
    document.body.style.overflow = 'hidden';
    
    // Afficher l'overlay avec animation
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
    
    // Réinitialiser le carrousel au premier slide
    const carousel = overlay.querySelector('.vertical-carousel');
    if (carousel) {
        resetVerticalCarousel(carousel);
    }
    }
    
    function closeContentDiscoveryModal(overlay) {
        console.log('❌ Fermeture modale découverte contenu');
        
        // Animation de fermeture
        overlay.classList.remove('active');
        
        // Réactiver le scroll du body
        document.body.style.overflow = '';
        
        // Masquer après l'animation
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
    
    // Exposer les fonctions globalement
    window.openContentDiscoveryModal = openContentDiscoveryModal;
    window.closeContentDiscoveryModal = closeContentDiscoveryModal;
}
});