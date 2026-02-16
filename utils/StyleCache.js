/**
 * StyleCache - Gestionnaire de cache persistant pour les styles Marssel
 * Permet de conserver les styles générés entre les navigations de pages
 */
import { MARSSEL_VERSION } from "./version.js";

export class StyleCache {
    constructor(options = {}) {
        this.storageKey = options.storageKey || "marssel-style-cache";
        this.version = options.version || MARSSEL_VERSION;
        this.maxCacheSize = options.maxCacheSize || 5 * 1024 * 1024; // 5MB par défaut
        this.compressionEnabled = options.compression !== false;
        this.enabled = this.checkStorageAvailability();
    }

    /**
     * Vérifie si localStorage est disponible
     */
    checkStorageAvailability() {
        try {
            const test = "__marssel_storage_test__";
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn("⚠️ localStorage non disponible, cache désactivé:", e);
            return false;
        }
    }

    /**
     * Convertit les Map et Set en objets sérialisables
     */
    serializeStyleData(selectorDeclarations) {
        const serialized = {};

        selectorDeclarations.forEach((value, key) => {
            if (value instanceof Map) {
                // Pour les media queries
                const mediaSelectors = {};
                value.forEach((declarations, selector) => {
                    mediaSelectors[selector] = Array.from(declarations);
                });
                serialized[key] = mediaSelectors;
            } else if (value instanceof Set) {
                // Pour les sélecteurs normaux
                serialized[key] = Array.from(value);
            }
        });

        return serialized;
    }

    /**
     * Reconvertit les objets en Map et Set
     */
    deserializeStyleData(serialized) {
        const selectorDeclarations = new Map();

        Object.entries(serialized).forEach(([key, value]) => {
            if (key.startsWith("@media")) {
                // C'est une media query
                const mediaSelectors = new Map();
                Object.entries(value).forEach(([selector, declarations]) => {
                    mediaSelectors.set(selector, new Set(declarations));
                });
                selectorDeclarations.set(key, mediaSelectors);
            } else {
                // C'est un sélecteur normal
                selectorDeclarations.set(key, new Set(value));
            }
        });

        return selectorDeclarations;
    }

    /**
     * Compression simple des données (optionnelle)
     */
    compress(data) {
        if (!this.compressionEnabled) return data;

        // Compression basique: suppression des espaces inutiles
        return data
            .replace(/\s*:\s*/g, ":")
            .replace(/\s*;\s*/g, ";")
            .replace(/\s*\{\s*/g, "{")
            .replace(/\s*\}\s*/g, "}")
            .replace(/\s+/g, " ");
    }

    /**
     * Sauvegarde les styles dans localStorage
     */
    save(selectorDeclarations, metadata = {}) {
        if (!this.enabled) return false;

        try {
            const serialized = this.serializeStyleData(selectorDeclarations);

            const cacheData = {
                version: this.version,
                timestamp: Date.now(),
                url: window.location.pathname,
                classCount: this.countClasses(selectorDeclarations),
                metadata,
                styles: serialized,
            };

            const jsonData = JSON.stringify(cacheData);
            const finalData = this.compress(jsonData);

            // Vérifier la taille
            if (finalData.length > this.maxCacheSize) {
                console.warn(
                    "⚠️ Cache trop volumineux, nettoyage des anciennes entrées",
                );
                this.cleanup();
                return false;
            }

            localStorage.setItem(this.storageKey, finalData);

            console.log(
                `✅ Cache sauvegardé: ${cacheData.classCount} classes, ${(finalData.length / 1024).toFixed(2)} KB`,
            );
            return true;
        } catch (e) {
            console.error("❌ Erreur sauvegarde cache:", e);
            // Si quota dépassé, nettoyer et réessayer
            if (e.name === "QuotaExceededError") {
                this.cleanup();
            }
            return false;
        }
    }

    /**
     * Charge les styles depuis localStorage
     */
    load() {
        if (!this.enabled) return null;

        try {
            const cached = localStorage.getItem(this.storageKey);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);

            // Vérifier la version
            if (cacheData.version !== this.version) {
                console.log("🔄 Version du cache obsolète, régénération");
                this.clear();
                return null;
            }

            // Vérifier l'âge du cache (optionnel: 24h max)
            const age = Date.now() - cacheData.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 heures
            if (age > maxAge) {
                console.log("🕐 Cache expiré, régénération");
                this.clear();
                return null;
            }

            const selectorDeclarations = this.deserializeStyleData(
                cacheData.styles,
            );

            console.log(
                `📦 Cache chargé: ${cacheData.classCount} classes depuis ${cacheData.url}`,
            );

            return {
                selectorDeclarations,
                metadata: cacheData.metadata,
                timestamp: cacheData.timestamp,
            };
        } catch (e) {
            console.error("❌ Erreur chargement cache:", e);
            this.clear();
            return null;
        }
    }

    /**
     * Fusionne les nouvelles déclarations avec celles en cache
     */
    merge(existingDeclarations, newDeclarations) {
        const merged = new Map(existingDeclarations);

        newDeclarations.forEach((value, key) => {
            if (merged.has(key)) {
                if (value instanceof Map) {
                    // Fusion de media queries
                    const existingMedia = merged.get(key);
                    value.forEach((declarations, selector) => {
                        if (existingMedia.has(selector)) {
                            // Fusionner les déclarations
                            const existingDecl = existingMedia.get(selector);
                            declarations.forEach((decl) =>
                                existingDecl.add(decl),
                            );
                        } else {
                            existingMedia.set(selector, new Set(declarations));
                        }
                    });
                } else if (value instanceof Set) {
                    // Fusion de sélecteurs normaux
                    const existing = merged.get(key);
                    value.forEach((decl) => existing.add(decl));
                }
            } else {
                // Nouvelle entrée
                if (value instanceof Map) {
                    const newMap = new Map();
                    value.forEach((declarations, selector) => {
                        newMap.set(selector, new Set(declarations));
                    });
                    merged.set(key, newMap);
                } else if (value instanceof Set) {
                    merged.set(key, new Set(value));
                }
            }
        });

        return merged;
    }

    /**
     * Compte le nombre de classes dans les déclarations
     */
    countClasses(selectorDeclarations) {
        let count = 0;
        selectorDeclarations.forEach((value, key) => {
            if (value instanceof Map) {
                count += value.size;
            } else {
                count += 1;
            }
        });
        return count;
    }

    /**
     * Nettoie le cache
     */
    cleanup() {
        if (!this.enabled) return;

        try {
            // Pour l'instant, on supprime tout simplement
            // Dans une version plus avancée, on pourrait garder les entrées les plus utilisées
            this.clear();
            console.log("🧹 Cache nettoyé");
        } catch (e) {
            console.error("❌ Erreur nettoyage cache:", e);
        }
    }

    /**
     * Supprime complètement le cache
     */
    clear() {
        if (!this.enabled) return;

        try {
            localStorage.removeItem(this.storageKey);
            console.log("🗑️ Cache supprimé");
        } catch (e) {
            console.error("❌ Erreur suppression cache:", e);
        }
    }

    /**
     * Obtient des statistiques sur le cache
     */
    getStats() {
        if (!this.enabled) {
            return { enabled: false };
        }

        try {
            const cached = localStorage.getItem(this.storageKey);
            if (!cached) {
                return { enabled: true, cached: false };
            }

            const cacheData = JSON.parse(cached);
            const size = new Blob([cached]).size;

            return {
                enabled: true,
                cached: true,
                version: cacheData.version,
                timestamp: cacheData.timestamp,
                age: Date.now() - cacheData.timestamp,
                url: cacheData.url,
                classCount: cacheData.classCount,
                size: size,
                sizeKB: (size / 1024).toFixed(2),
            };
        } catch (e) {
            return { enabled: true, error: e.message };
        }
    }
}
