/**
 * Marssel - Framework JavaScript frontend modulaire
 * Entry point pour le package npm
 */

// Importation de la classe principale
import { Marssel } from "./core/Marssel.js";

// Importation des managers pour permettre un accès direct si nécessaire
import { FontManager } from "./managers/FontManager.js";
import { IconManager } from "./managers/IconManager.js";
import { StyleManager } from "./managers/StyleManager.js";
import { DomManager } from "./managers/DomManager.js";
import { CarouselManager } from "./managers/CarouselManager.js";
import { ModalManager } from "./managers/ModalManager.js";
import { PopoverManager } from "./managers/PopoverManager.js";
import { ScrollspyManager } from "./managers/ScrollspyManager.js";
import { ToastManager } from "./managers/ToastManager.js";
import { TooltipManager } from "./managers/TooltipManager.js";
import { HeaderManager } from "./managers/HeaderManager.js";
import { DropdownManager } from "./managers/DropdownManager.js";
import { OffcanvasManager } from "./managers/OffcanvasManager.js";

// Importation des utilitaires
import {
    properties,
    breakpoints,
    containerMaxWidths,
    CLASS_REGEX,
    COLOR_REGEX,
} from "./utils/constants.js";

import {
    cleanValue,
    addDieseToHex,
    escapeValue,
    buildMediaQuery,
    buildDeclaration,
} from "./utils/helpers.js";

import {
    buildFinalClassName,
    parseClassName,
    parseClassPart,
    parseGutterValue,
} from "./utils/parsed.js";

import { FontsConfig, IconsConfig } from "./utils/config.mjs";

// Export principal de la classe Marssel
export { Marssel };

// Export des managers individuels
export {
    FontManager,
    IconManager,
    StyleManager,
    DomManager,
    CarouselManager,
    ModalManager,
    PopoverManager,
    ScrollspyManager,
    ToastManager,
    TooltipManager,
    HeaderManager,
    DropdownManager,
    OffcanvasManager,
};

// Export des utilitaires
export {
    // Constants
    properties,
    breakpoints,
    containerMaxWidths,
    CLASS_REGEX,
    COLOR_REGEX,

    // Config
    FontsConfig,
    IconsConfig,

    // Helpers
    cleanValue,
    addDieseToHex,
    escapeValue,
    buildMediaQuery,
    buildDeclaration,

    // Parsed
    buildFinalClassName,
    parseClassName,
    parseClassPart,
    parseGutterValue,
};

// Export des styles
export { CarouselStyles } from "./styles/CarouselStyles.js";
export { DropdownStyles } from "./styles/DropdownStyles.js";
export { HeaderStyles } from "./styles/HeaderStyles.js";
export { OffcanvasStyles } from "./styles/OffcanvasStyles.js";
export { PopoverStyles } from "./styles/PopoverStyles.js";
export { ToastStyles } from "./styles/ToastStyles.js";
export { TooltipStyles } from "./styles/TooltipStyles.js";

/**
 * Export par défaut pour permettre l'import simple:
 * import Marssel from 'marssel';
 */
export default Marssel;
