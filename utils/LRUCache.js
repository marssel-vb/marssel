export class LRUCache {
    constructor(maxSize = 500) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    has(key) {
        return this.cache.has(key);
    }

    get(key) {
        return this.cache.get(key);
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    get size() {
        return this.cache.size;
    }

    forEach(callback, thisArg) {
        this.cache.forEach(callback, thisArg);
    }

    entries() {
        return this.cache.entries();
    }

    keys() {
        return this.cache.keys();
    }

    values() {
        return this.cache.values();
    }

    [Symbol.iterator]() {
        return this.cache[Symbol.iterator]();
    }
}
