// Ce fichier contient les styles par défaut pour le système de header
export class HeaderStyles {
    constructor(styleManager) {
        this.styleManager = styleManager;
    }

    addBaseStyles() {
        // Styles de base pour le header
        const headerBaseDeclarations = new Set([
            "background-color: #fff",
            "box-shadow: 0 2px 10px rgba(0,0,0,0.1)",
            "position: relative",
            "width: 100%",
            "z-index: 100",
            "display: flex",
            "flex-wrap: wrap",
            "align-items: center",
            "padding: 0.5rem 1rem",
            "transition: all 0.3s ease",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".header",
            headerBaseDeclarations
        );

        // Container pour le contenu du header
        const headerContainerDeclarations = new Set([
            "display: flex",
            "flex-wrap: wrap",
            "width: 100%",
            "align-items: center",
            "justify-content: space-between",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".header-container",
            headerContainerDeclarations
        );

        // Styles de base pour le logo
        const logoDeclarations = new Set([
            "display: flex",
            "align-items: center",
            "flex: 0 0 auto",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".header-logo",
            logoDeclarations
        );

        // Styles pour l'image du logo
        const logoImgDeclarations = new Set(["height: 40px"]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".header-logo img",
            logoImgDeclarations
        );

        // Styles pour la navbar
        const navbarDeclarations = new Set([
            "display: flex",
            "align-items: center",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".header-navbar",
            navbarDeclarations
        );

        // Styles pour les actions (boutons, login, etc.)
        const actionsDeclarations = new Set([
            "display: flex",
            "align-items: center",
            "margin-left: auto",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".header-actions",
            actionsDeclarations
        );

        // Styles pour les boutons dans les actions
        const actionsButtonDeclarations = new Set([
            "padding: 0.5rem 1rem",
            "background-color: #4a90e2",
            "color: white",
            "border: none",
            "border-radius: 3px",
            "cursor: pointer",
            "text-decoration: none",
            "margin-left: 0.5rem",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".header-actions .btn",
            actionsButtonDeclarations
        );

        // Hover pour les boutons d'actions
        const actionsButtonHoverDeclarations = new Set([
            "background-color: #3a80d2",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".header-actions .btn:hover",
            actionsButtonHoverDeclarations
        );

        // Styles pour la liste de navigation
        const navListDeclarations = new Set([
            "display: flex",
            "padding-left: 0",
            "margin-bottom: 0",
            "list-style: none",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".nav",
            navListDeclarations
        );

        // Styles pour les éléments de navigation
        const navItemDeclarations = new Set([
            "position: relative",
            "margin: 0 0.5rem",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".nav-item",
            navItemDeclarations
        );

        // Styles pour les liens de navigation
        const navLinkDeclarations = new Set([
            "display: block",
            "padding: 0.5rem 1rem",
            "text-decoration: none",
            "cursor: pointer",
            "color: #333",
            "font-weight: 500",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".nav-link",
            navLinkDeclarations
        );

        // Hover pour les liens de navigation
        const navLinkHoverDeclarations = new Set(["color: #4a90e2"]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".nav-link:hover",
            navLinkHoverDeclarations
        );

        // Styles pour les icônes
        const iconBaseDeclarations = new Set([
            "display: inline-block",
            "width: 16px",
            "height: 16px",
            "vertical-align: middle",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".icon",
            iconBaseDeclarations
        );

        // Styles pour la version mobile du menu
        const mobileMenuDeclarations = new Set([
            "display: none",
            "position: fixed",
            "top: 0",
            "bottom: 0",
            "width: 280px",
            "max-width: 80%",
            "background-color: #fff",
            "z-index: 1050",
            "transition: all 0.3s ease",
            "opacity: 0",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-menu.sidebar",
            mobileMenuDeclarations
        );

        // Styles pour la sidebar à gauche
        const leftSidebarDeclarations = new Set([
            "left: 0",
            "transform: translateX(-100%)",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".sidebar-left .mobile-menu",
            leftSidebarDeclarations
        );

        // Styles pour la sidebar à droite
        const rightSidebarDeclarations = new Set([
            "right: 0",
            "transform: translateX(100%)",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".sidebar-right .mobile-menu",
            rightSidebarDeclarations
        );

        // Styles pour le menu en pleine page
        const fullpageMenuDeclarations = new Set([
            "display: none",
            "position: fixed",
            "top: 0",
            "left: 0",
            "right: 0",
            "bottom: 0",
            "background-color: #fff",
            "z-index: 1050",
            "opacity: 0",
            "transition: opacity 0.3s ease",
            "overflow-y: auto",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-menu.fullpage",
            fullpageMenuDeclarations
        );

        // Styles pour le menu sous le header
        const belowMenuDeclarations = new Set([
            "display: none",
            "width: 100%",
            "background-color: #fff",
            "border-top: 1px solid rgba(0, 0, 0, 0.1)",
            "padding: 1rem",
            "opacity: 0",
            "transition: opacity 0.3s ease",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-menu.below",
            belowMenuDeclarations
        );

        // Désactiver complètement l'overlay pour "below"
        const belowOverlayDeclarations = new Set([
            "display: none !important",
            "pointer-events: none !important",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            '[data-mobile-menu-type="below"] .menu-overlay',
            belowOverlayDeclarations
        );

        // Masquer le bouton fermer pour le menu "below"
        const belowCloseButtonDeclarations = new Set([
            "display: none !important",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-menu.below .menu-close",
            belowCloseButtonDeclarations
        );

        // Overlay pour les sidebars et menus plein écran
        const overlayDeclarations = new Set([
            "display: none",
            "position: fixed",
            "top: 0",
            "left: 0",
            "right: 0",
            "bottom: 0",
            "background-color: rgba(0, 0, 0, 0.5)",
            "z-index: 1040",
            "opacity: 0",
            "transition: opacity 0.3s ease",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-overlay",
            overlayDeclarations
        );

        // Activer l'overlay
        const activeOverlayDeclarations = new Set([
            "display: block",
            "opacity: 1",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-open .menu-overlay",
            activeOverlayDeclarations
        );

        // Bouton toggle pour le menu mobile
        const toggleButtonDeclarations = new Set([
            "display: none",
            "background: none",
            "border: none",
            "cursor: pointer",
            "padding: 0.5rem",
            "width: 30px",
            "height: 30px",
            "position: relative",
            "margin-left: 1rem",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-toggle",
            toggleButtonDeclarations
        );

        // Styles pour les barres du bouton toggle
        const toggleButtonBarDeclarations = new Set([
            "display: block",
            "position: absolute",
            "height: 3px",
            "width: 100%",
            "background: #333",
            "border-radius: 9px",
            "opacity: 1",
            "left: 0",
            "transform: rotate(0deg)",
            "transition: .25s ease-in-out",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-toggle span",
            toggleButtonBarDeclarations
        );

        // Position de la première barre
        const toggleButtonBar1Declarations = new Set(["top: 6px"]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-toggle span:nth-child(1)",
            toggleButtonBar1Declarations
        );

        // Position de la deuxième barre
        const toggleButtonBar2Declarations = new Set(["top: 18px"]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-toggle span:nth-child(2)",
            toggleButtonBar2Declarations
        );

        // Position de la troisième barre
        const toggleButtonBar3Declarations = new Set(["top: 30px"]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-toggle span:nth-child(3)",
            toggleButtonBar3Declarations
        );

        // Container pour les boutons mobiles
        const mobileButtonsContainerDeclarations = new Set([
            "position: relative",
            "width: 30px",
            "height: 30px",
            "margin-left: 1rem",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-buttons-container",
            mobileButtonsContainerDeclarations
        );

        // Masquer le bouton close par défaut
        const mobileCloseButtonHiddenDeclarations = new Set([
            "display: none",
            "position: absolute",
            "top: 0",
            "left: 0",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-buttons-container .menu-close",
            mobileCloseButtonHiddenDeclarations
        );

        // Masquer le bouton toggle quand le menu est ouvert
        const mobileToggleButtonHiddenDeclarations = new Set(["display: none"]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-open .mobile-buttons-container .menu-toggle",
            mobileToggleButtonHiddenDeclarations
        );

        // Afficher le bouton close quand le menu est ouvert
        const mobileCloseButtonVisibleDeclarations = new Set([
            "display: block",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-open .mobile-buttons-container .menu-close",
            mobileCloseButtonVisibleDeclarations
        );

        const closeButtonDeclarations = new Set([
            "position: absolute",
            "top: 1rem",
            "right: 1rem",
            "font-size: 1.5rem",
            "background: none",
            "border: none",
            "cursor: pointer",
            "z-index: 1060",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-close",
            closeButtonDeclarations
        );

        // Styles pour le menu mobile actif
        const activeMobileMenuDeclarations = new Set([
            "display: block",
            "opacity: 1",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-open .mobile-menu",
            activeMobileMenuDeclarations
        );

        // Ajuster mieux les styles du menu "below"
        const activeBelowMenuDeclarations = new Set([
            "display: block",
            "opacity: 1",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".menu-open .mobile-menu.below",
            activeBelowMenuDeclarations
        );

        // Styles pour le header en mode mobile
        this.addResponsiveStyles();

        // Styles pour les positions des éléments
        this.addPositioningStyles();
    }

    addResponsiveStyles() {
        // En mode mobile, masquer la navbar et afficher le bouton toggle
        const mobileNavbarDeclarations = new Set(["display: none"]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-view .header-container > .header-navbar",
            mobileNavbarDeclarations
        );

        const mobileToggleDeclarations = new Set(["display: block"]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-view .menu-toggle",
            mobileToggleDeclarations
        );

        // Styles pour la navbar dans le menu mobile
        const mobileSidebarNavDeclarations = new Set([
            "display: block",
            "padding: 1rem",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-menu .header-navbar",
            mobileSidebarNavDeclarations
        );

        const mobileNavDeclarations = new Set([
            "flex-direction: column",
            "align-items: flex-start",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-menu .nav",
            mobileNavDeclarations
        );

        const mobileNavItemDeclarations = new Set(["width: 100%", "margin: 0"]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-menu .nav-item",
            mobileNavItemDeclarations
        );

        const mobileNavLinkDeclarations = new Set([
            "padding: 0.75rem 0",
            "width: 100%",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".mobile-menu .nav-link",
            mobileNavLinkDeclarations
        );

        // Remarque: les styles de dropdown en mode mobile ont été supprimés car maintenant ils sont dans DropdownStyles.js
    }

    addPositioningStyles() {
        // Positionnement du logo
        const logoLeftDeclarations = new Set([
            "justify-content: flex-start",
            "order: 1",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".logo-left .header-logo",
            logoLeftDeclarations
        );

        const logoCenterDeclarations = new Set([
            "justify-content: center",
            "order: 2",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".logo-center .header-logo",
            logoCenterDeclarations
        );

        const logoRightDeclarations = new Set([
            "justify-content: flex-end",
            "order: 3",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".logo-right .header-logo",
            logoRightDeclarations
        );

        // Positionnement de la navbar
        const navLeftDeclarations = new Set([
            "justify-content: flex-start",
            "order: 1",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".nav-left .header-navbar",
            navLeftDeclarations
        );

        const navCenterDeclarations = new Set([
            "justify-content: center",
            "order: 2",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".nav-center .header-navbar",
            navCenterDeclarations
        );

        const navRightDeclarations = new Set([
            "justify-content: flex-end",
            "order: 3",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".nav-right .header-navbar",
            navRightDeclarations
        );

        // Positionnement des actions
        const actionLeftDeclarations = new Set([
            "justify-content: flex-start",
            "order: 1",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".action-left .header-actions",
            actionLeftDeclarations
        );

        const actionCenterDeclarations = new Set([
            "justify-content: center",
            "order: 2",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".action-center .header-actions",
            actionCenterDeclarations
        );

        const actionRightDeclarations = new Set([
            "justify-content: flex-end",
            "order: 3",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".action-right .header-actions",
            actionRightDeclarations
        );

        // Ajustements spécifiques pour les différentes combinaisons
        const logoLeftNavCenterActionsRightDeclarations = new Set([
            "flex: 1 1 auto",
        ]);
        this.styleManager.addDeclarationsWithMediaQuery(
            [],
            ".logo-left.nav-center.action-right .header-navbar",
            logoLeftNavCenterActionsRightDeclarations
        );
    }
}
