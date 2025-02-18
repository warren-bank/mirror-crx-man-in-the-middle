'use strict';

class Storage {
    /**
     * @param {(string[]|string|void)} [keys]
     * @return {Promise}
     */
    static syncGet(keys) {
        return browser.storage.sync.get(keys).then(
            data => Array.isArray(keys) || !keys ? data : data[keys],
            Logger.log
        );
    }

    /**
     * @param {(string[]|string|void)} [key]
     * @return {Promise}
     */
    static localGet(key) {
        return browser.storage.local.get(key).then(
            data => Array.isArray(key) || !key ? data : data[key],
            Logger.log
        );
    }

    /**
     * @param {!Object} keys
     * @param {boolean} [silent]
     * @return {void}
     */
    static syncSet(keys, silent = true) {
        browser.storage.sync.set(keys).catch(Logger.log);

        // If 'silent' is set to true,
        // changes made won't trigger storage-changed event listeners.
        silent && this.changes.push(Object.entries(keys));
    }

    /**
     * @param {!Object} keys
     * @return {void}
     */
    static localSet(keys) {
        browser.storage.local.set(keys).catch(Logger.log);
    }

    /**
     * Storage change event listener that triggers user-registered listeners.
     * @callback
     * @param {browser.storage.StorageChange} changes
     * @param {string} areaName
     * @return {void}
     */
    static changedCallback(changes, areaName) {
        if (areaName !== 'sync') {
            return;
        }

        if (this.isSilent(changes)) {
            this.changes.shift();
            return;
        }

        // Remap and filter changes
        const entries = Object.entries(changes)
            .filter(([, {newValue, oldValue}]) => (
                !Utils.compare(newValue, oldValue)
            ));
        if (entries.length) {
            this.listeners.forEach(callback => callback(entries));
        }
    }

    /**
     * Check if the change was made by Storage.set in silent mode.
     * @private
     * @param {Object} changes
     * @return {boolean}
     */
    static isSilent(changes) {
        if (this.changes.length) {
            return Utils.compare(
                Object.entries(changes)
                    .map(([key, {newValue}]) => [key, newValue]),
                this.changes[0]
            );
        }
        return false;
    }

    /**
     * Add a listener for storage-changed events.
     * @param {Function} listener
     * @return {void}
     */
    static addListener(listener) {
        this.listeners.add(listener);
    }
}

/**
 * This stores changes made by Storage.set in silent mode.
 * The storage-changed event listener must ignore those changes.
 * @private
 * @const
 * @type {Array}
 */
Storage.changes = [];

/**
 * @private
 * @const
 * @type {Set<Function>}
 */
Storage.listeners = new Set;

Binder.bindOwn(Storage);

browser.storage.onChanged.addListener(Storage.changedCallback);
