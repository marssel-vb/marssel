/**
 * StyleCache - Persistent cache manager for Marshall styles
 * Allows you to retain generated styles between page navigations
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
     * Check if localStorage is available
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
     * Converts Maps and Sets into serializable objects
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
     * Converts objects back into Maps and Sets
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
     * Simple data compression (optional)
     */
    compress(data) {
        if (!this.compressionEnabled) return data;

        return data
            .replace(/\s*:\s*/g, ":")
            .replace(/\s*;\s*/g, ";")
            .replace(/\s*\{\s*/g, "{")
            .replace(/\s*\}\s*/g, "}")
            .replace(/\s+/g, " ");
    }

    /**
     * Saves styles to localStorage
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
                console.warn("⚠️ Cache too bulky, cleaning of old entrances");
                this.cleanup();
                return false;
            }

            localStorage.setItem(this.storageKey, finalData);

            console.log(
                `✅ Saved cache: ${cacheData.classCount} classes, ${(finalData.length / 1024).toFixed(2)} KB`,
            );
            return true;
        } catch (e) {
            console.error("❌ Error saving cache:", e);
            if (e.name === "QuotaExceededError") {
                this.cleanup();
            }
            return false;
        }
    }

    /**
     * Load styles from localStorage
     */
    load() {
        if (!this.enabled) return null;

        try {
            const cached = localStorage.getItem(this.storageKey);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);

            if (cacheData.version !== this.version) {
                console.log("🔄 Outdated cache version, regeneration");
                this.clear();
                return null;
            }
=
            const age = Date.now() - cacheData.timestamp;
            const maxAge = 24 * 60 * 60 * 1000;
            if (age > maxAge) {
                console.log("🕐 Cache expired, regenerating");
                this.clear();
                return null;
            }

            const selectorDeclarations = this.deserializeStyleData(
                cacheData.styles,
            );

            console.log(
                `📦 Cache loaded: ${cacheData.classCount} classes from ${cacheData.url}`,
            );

            return {
                selectorDeclarations,
                metadata: cacheData.metadata,
                timestamp: cacheData.timestamp,
            };
        } catch (e) {
            console.error("❌ Error loading cache:", e);
            this.clear();
            return null;
        }
    }

    /**
     * Merges new statements with those in the cache
     */
    merge(existingDeclarations, newDeclarations) {
        const merged = new Map(existingDeclarations);

        newDeclarations.forEach((value, key) => {
            if (merged.has(key)) {
                if (value instanceof Map) {
                    const existingMedia = merged.get(key);
                    value.forEach((declarations, selector) => {
                        if (existingMedia.has(selector)) {
                            const existingDecl = existingMedia.get(selector);
                            declarations.forEach((decl) =>
                                existingDecl.add(decl),
                            );
                        } else {
                            existingMedia.set(selector, new Set(declarations));
                        }
                    });
                } else if (value instanceof Set) {
                    const existing = merged.get(key);
                    value.forEach((decl) => existing.add(decl));
                }
            } else {
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
     * Count the number of classes in the declarations
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
     * Clear the cache
     */
    cleanup() {
        if (!this.enabled) return;

        try {
            // For now, we're simply deleting everything.
            // In a more advanced version, we could keep the most frequently used entries.
            this.clear();
            console.log("🧹 Cache cleaned up");
        } catch (e) {
            console.error("❌ Error cleaning up cache:", e);
        }
    }

    /**
     * Completely remove the cache
     */
    clear() {
        if (!this.enabled) return;

        try {
            localStorage.removeItem(this.storageKey);
            console.log("🗑️ Cache deleted");
        } catch (e) {
            console.error("❌ Error deleting cache:", e);
        }
    }

    /**
     * Gets cache statistics
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
