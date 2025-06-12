/**
 * Marssel - Framework JavaScript frontend modulaire
 * Entry point pour le package npm
 */

// Importation de la classe principale
import { Marssel } from "./core/Marssel.js";

// Importation des managers pour permettre un accès direct si nécessaire
import { FontManager } from "./managers/FontManager.js";
import { IconManager } from "./managers/IconManager.js";
import { ThemeManager } from "./managers/ThemeManager.js";
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
    defaultThemes,
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

// Importation des styles
import { CarouselStyles } from "./styles/CarouselStyles.js";
import { DropdownStyles } from "./styles/DropdownStyles.js";
import { HeaderStyles } from "./styles/HeaderStyles.js";
import { OffcanvasStyles } from "./styles/OffcanvasStyles.js";
import { PopoverStyles } from "./styles/PopoverStyles.js";
import { ToastStyles } from "./styles/ToastStyles.js";
import { TooltipStyles } from "./styles/TooltipStyles.js";

// Export par défaut uniquement avec tout regroupé
export default {
    // Classe principale
    Marssel,

    // Managers
    FontManager,
    IconManager,
    ThemeManager,
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

    // Constants
    properties,
    breakpoints,
    containerMaxWidths,
    CLASS_REGEX,
    COLOR_REGEX,
    defaultThemes,

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

    // Styles
    CarouselStyles,
    DropdownStyles,
    HeaderStyles,
    OffcanvasStyles,
    PopoverStyles,
    ToastStyles,
    TooltipStyles,
};
