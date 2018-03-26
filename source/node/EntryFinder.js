const Fuse = require("fuse.js");
const { getAllEntries } = require("./tools/searching-instance.js");

/**
 * Flatten entries into a searchable structure
 * @param {Array.<Archive>} archives An array of archives
 * @returns {Array.<EntrySearchInfo>} An array of searchable objects
 */
function flattenEntries(archives) {
    return archives.reduce(function _reduceArchiveEntries(items, archive) {
        return [
            ...items,
            ...getAllEntries(archive.getGroups()).map(function _expandEntry(entry) {
                return {
                    entry,
                    archive
                };
            })
        ];
    }, []);
}

/**
 * @typedef {Object} EntrySearchInfo
 * @property {Entry} entry The entry
 * @property {Archive} archive The associated archive
 */

/**
 * Entry searching class
 */
class EntryFinder {
    /**
     * @param {Array.<Archive>|Archive} target The archive or archives to search
     */
    constructor(target) {
        const archives = Array.isArray(target) ? target : [target];
        this._items = flattenEntries(archives);
        this._fuse = null;
        this._lastResult = [];
        this.initSearcher();
    }

    /**
     * All items available for searching
     * @type {Array.<EntrySearchInfo>}
     */
    get items() {
        return this._items;
    }

    /**
     * The last result
     * @type {Array.<EntrySearchInfo>}
     */
    get lastResult() {
        return this._lastResult;
    }

    /**
     * Initialise the searching mechanism
     */
    initSearcher() {
        this._fuse = new Fuse(this.items, {
            keys: ["property.title", "property.username", "meta.url"],
            getFn: function _translateEntryForFuse(item, keyPath) {
                const entry = item.entry;
                const [type, key] = keyPath.split(".");
                switch (type) {
                    case "property": {
                        return entry.getProperty(key);
                    }
                    case "meta": {
                        return entry.getMeta(key);
                    }
                    default:
                        throw new Error(`Unknown entry property type: ${type}`);
                }
            },
            shouldSort: true,
            threshold: 0.5,
            tokenSeparator: /\s+/g
        });
    }

    /**
     * Search and get results
     * @param {String} term The search term
     * @returns {Array.<EntrySearchInfo>} The results
     */
    search(term) {
        this._lastResult = this._fuse.search(term);
        return this.lastResult;
    }
}

module.exports = EntryFinder;
