// Ce fichier contient les styles par défaut pour le système de dropdown
export class DropdownStyles {
  constructor(styleManager) {
    this.styleManager = styleManager;
    this.addBaseStyles();
  }

  addBaseStyles() {
    // Styles pour les dropdowns
    const dropdownDeclarations = new Set([
      "position: relative",
      "display: inline-block",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown",
      dropdownDeclarations
    );

    // Styles pour le bouton toggle des dropdowns
    const dropdownToggleDeclarations = new Set([
      "display: flex",
      "align-items: center",
      "cursor: pointer",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-toggle",
      dropdownToggleDeclarations
    );

    // Styles pour l'icône des dropdowns
    const dropdownIconDeclarations = new Set([
      "margin-left: 0.35rem",
      "transition: transform 0.3s ease",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-toggle .icon",
      dropdownIconDeclarations
    );

    // Rotation de l'icône quand le dropdown est actif
    const activeIconDeclarations = new Set(["transform: rotate(180deg)"]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown.active .dropdown-toggle .icon",
      activeIconDeclarations
    );

    // Styles pour le menu dropdown
    const dropdownMenuDeclarations = new Set([
      "position: absolute",
      "top: 100%",
      "left: 0",
      "z-index: 1000",
      "display: none",
      "min-width: 12rem",
      "padding: 0.5rem 0",
      "margin: 0.125rem 0 0",
      "background-color: #fff",
      "border: 1px solid rgba(0, 0, 0, 0.15)",
      "border-radius: 0.25rem",
      "box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1)",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-menu",
      dropdownMenuDeclarations
    );

    // Styles pour les éléments du menu dropdown
    const dropdownItemDeclarations = new Set([
      "display: block",
      "width: 100%",
      "padding: 0.5rem 1.5rem",
      "clear: both",
      "text-align: inherit",
      "white-space: nowrap",
      "background-color: transparent",
      "border: 0",
      "text-decoration: none",
      "cursor: pointer",
      "color: #333",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-item",
      dropdownItemDeclarations
    );

    // Hover pour les éléments du menu dropdown
    const dropdownItemHoverDeclarations = new Set([
      "background-color: #f5f5f5",
      "color: #4a90e2",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-item:hover",
      dropdownItemHoverDeclarations
    );

    // Styles pour le sous-menu
    const submenuDeclarations = new Set(["position: relative"]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-submenu",
      submenuDeclarations
    );

    // Dropdown pleine largeur
    const dropdownFullwidthDeclarations = new Set([
      "position: static",
      "display: inline-block",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-fullwidth",
      dropdownFullwidthDeclarations
    );

    // Conteneur pour le menu fullwidth
    const dropdownFullwidthContainerDeclarations = new Set([
      "position: static!important", // Important pour le positionnement correct
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-fullwidth",
      dropdownFullwidthContainerDeclarations
    );

    // Styles pour le menu dropdown pleine largeur
    const fullwidthMenuDeclarations = new Set([
      "position: absolute",
      "left: 0", // Centrer par rapport au parent
      "right: 0",
      "transform: none", // Astuce pour centrer un élément absolu
      "width: 100%", // Utiliser la largeur du viewport
      "max-width: 100vw", // S'assurer qu'il ne dépasse pas
      "margin: 0",
      "z-index: 1000",
      "display: none",
      "padding: 1rem",
      "background-color: #fff",
      "border: 1px solid rgba(0, 0, 0, 0.15)",
      "box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1)",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-menu-fullwidth",
      fullwidthMenuDeclarations
    );

    // Styles spécifiques pour le menu dropdown pleine largeur
    const fullwidthMenuStylesDeclarations = new Set(["padding: 2rem"]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".dropdown-menu-fullwidth",
      fullwidthMenuStylesDeclarations
    );

    // Styles pour la grille du mega menu
    const megaMenuGridDeclarations = new Set([
      "grid-template-columns: repeat(4, 1fr)",
      "gap: 1rem",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".mega-menu-grid",
      megaMenuGridDeclarations
    );

    // Styles pour les titres des colonnes du mega menu
    const megaMenuColumnTitleDeclarations = new Set([
      "margin-top: 0",
      "margin-bottom: 1rem",
      "color: #4a90e2",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".mega-menu-column h4",
      megaMenuColumnTitleDeclarations
    );

    // Styles pour les listes du mega menu
    const megaMenuListDeclarations = new Set([
      "list-style: none",
      "padding: 0",
      "margin: 0",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".mega-menu-column ul",
      megaMenuListDeclarations
    );

    // Styles pour les éléments de liste du mega menu
    const megaMenuListItemDeclarations = new Set(["margin-bottom: 0.5rem"]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".mega-menu-column ul li",
      megaMenuListItemDeclarations
    );

    // Styles pour les liens du mega menu
    const megaMenuLinkDeclarations = new Set([
      "color: #333",
      "text-decoration: none",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".mega-menu-column ul li a",
      megaMenuLinkDeclarations
    );

    // Hover pour les liens du mega menu
    const megaMenuLinkHoverDeclarations = new Set(["color: #4a90e2"]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".mega-menu-column ul li a:hover",
      megaMenuLinkHoverDeclarations
    );

    // Style pour l'icône flèche vers le bas
    const iconDownDeclarations = new Set([
      "border: solid #333",
      "border-width: 0 2px 2px 0",
      "display: inline-block",
      "padding: 3px",
      "transform: rotate(45deg)",
      "margin-left: 5px",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".icon-down",
      iconDownDeclarations
    );

    // Style pour l'icône flèche vers la droite
    const iconRightDeclarations = new Set([
      "border: solid #333",
      "border-width: 0 2px 2px 0",
      "display: inline-block",
      "padding: 3px",
      "transform: rotate(-45deg)",
      "margin-left: 5px",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".icon-right",
      iconRightDeclarations
    );

    // Version responsive pour les dropdowns
    this.addResponsiveStyles();
  }

  addResponsiveStyles() {
    // Styles pour les dropdowns en mode mobile
    const mobileDropdownMenuDeclarations = new Set([
      "position: static",
      "box-shadow: none",
      "border: none",
      "border-left: 2px solid rgba(0, 0, 0, 0.1)",
      "margin-left: 1rem",
      "padding-left: 0.5rem",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".mobile-view .dropdown-menu",
      mobileDropdownMenuDeclarations
    );

    // Menu fullwidth en mode mobile
    const mobileFullwidthMenuDeclarations = new Set([
      "position: static",
      "box-shadow: none",
      "border: none",
      "border-left: 2px solid rgba(0, 0, 0, 0.1)",
      "margin-left: 1rem",
    ]);
    this.styleManager.addDeclarationsWithMediaQuery(
      [],
      ".mobile-view .dropdown-menu-fullwidth",
      mobileFullwidthMenuDeclarations
    );
  }
}
