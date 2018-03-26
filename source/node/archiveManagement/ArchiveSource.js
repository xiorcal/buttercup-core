const VError = require("verror");
const ChannelQueue = require("@buttercup/channel-queue");
const Credentials = require("@buttercup/credentials");
const AsyncEventEmitter = require("../events/AsyncEventEmitter.js");
const getUniqueID = require("../tools/encoding.js").getUniqueID;
const credentialsToSource = require("./marshalling.js").credentialsToSource;

const COLOUR_TEST = /^#([a-f0-9]{3}|[a-f0-9]{6})$/i;

const DefaultColour = "#000000";
const DefaultOrder = 1000;
/**
 * Archive source status
 * @enum ArchiveSourceStatus
 * @memberof ArchiveSource
 * @static
 */
const Status = {
    LOCKED: "locked",
    UNLOCKED: "unlocked",
    PENDING: "pending"
};

/**
 * Rehydrate a dehydrated archive source
 * @param {String} dehydratedString A dehydrated archive source
 * @returns {ArchiveSource} The rehydrated source
 * @memberof ArchiveSource
 * @static
 */
function rehydrate(dehydratedString) {
    const { name, id, sourceCredentials, archiveCredentials, type, colour, order } = JSON.parse(dehydratedString);
    const source = new ArchiveSource(name, sourceCredentials, archiveCredentials, id);
    source.type = type;
    if (colour) {
        source._colour = colour;
    }
    if (order >= 0) {
        source.order = order;
    }
    return source;
}

/**
 * Archive source class
 * @augments AsyncEventEmitter
 */
class ArchiveSource extends AsyncEventEmitter {
    /**
     * Constructor for an archive source
     * @param {String} name The name of the source
     * @param {String} sourceCredentials Encrypted archive source credentials
     * @param {String} archiveCredentials Encrypted archive credentials
     * @param {String=} id Optional source ID (Do not pass for new source)
     */
    constructor(name, sourceCredentials, archiveCredentials, id = getUniqueID()) {
        super();
        if (Credentials.isSecureString(sourceCredentials) !== true) {
            throw new VError("Failed constructing archive source: Source credentials not in encrypted form");
        }
        if (Credentials.isSecureString(archiveCredentials) !== true) {
            throw new VError("Failed constructing archive source: Archive credentials not in encrypted form");
        }
        this._queue = new ChannelQueue();
        this._name = name;
        this._id = id;
        this._status = Status.LOCKED;
        this._sourceCredentials = sourceCredentials;
        this._archiveCredentials = archiveCredentials;
        this._workspace = null;
        this._colour = DefaultColour;
        this.type = "";
        this.order = DefaultOrder;
    }

    /**
     * Source colour
     * @type {String}
     * @memberof ArchiveSource
     */
    get colour() {
        return this._colour;
    }

    /**
     * @typedef ArchiveSourceDescription
     * @property {String} name - The name of the source
     * @property {String} id - The source ID
     * @property {ArchiveSourceStatus} status - Status of the source
     * @property {String} type - The source type
     * @property {String} colour - Colour for the source
     * @property {Number} order - The order of the source
     */

    /**
     * Get the source description
     * @type {ArchiveSourceDescription}
     * @memberof ArchiveSource
     * @readonly
     */
    get description() {
        return {
            name: this.name,
            id: this.id,
            status: this.status,
            type: this.type,
            colour: this.colour,
            order: this.order
        };
    }

    /**
     * Source ID
     * @type {String}
     * @memberof ArchiveSource
     * @readonly
     */
    get id() {
        return this._id;
    }

    /**
     * Source name
     * @type {String}
     * @memberof ArchiveSource
     * @readonly
     */
    get name() {
        return this._name;
    }

    /**
     * Source status
     * @type {ArchiveSourceStatus}
     * @memberof ArchiveSource
     * @readonly
     */
    get status() {
        return this._status;
    }

    /**
     * Workspace instance for the source
     * Is null when the source is locked
     * @type {Workspace|null}
     * @memberof ArchiveSource
     * @readonly
     */
    get workspace() {
        return this._workspace;
    }

    set colour(newColour) {
        if (COLOUR_TEST.test(newColour) !== true) {
            throw new VError(`Failed setting colour: Invalid format (expected hex): ${newColour}`);
        }
        this._colour = newColour;
        this.emit("sourceColourUpdated", this.description);
    }

    /**
     * Dehydrate the source for storage
     * Returns a secure string with locked (encrypted) credentials, even when the
     *  source is in the UNLOCKED state. This method does NOT store the source - 
     *  this must be done separately.
     * @returns {Promise.<String>} A promise that resolves with the dehydrated
     *  source information
     * @memberof ArchiveSource
     * @throws {VError} Rejects is source in PENDING state
     */
    dehydrate() {
        if (this.status === Status.PENDING) {
            return Promise.reject(new VError(`Failed dehydrating source: Source in pending state: ${this.id}`));
        }
        return this._enqueueStateChange(() => {
            return Promise.resolve()
                .then(() => {
                    const payload = {
                        id: this.id,
                        name: this.name,
                        type: this.type,
                        status: Status.LOCKED,
                        colour: this.colour,
                        order: this.order
                    };
                    if (this.status === Status.LOCKED) {
                        payload.sourceCredentials = this._sourceCredentials;
                        payload.archiveCredentials = this._archiveCredentials;
                        return payload;
                    }
                    return Promise.all([
                        this._sourceCredentials.toSecureString(this._archiveCredentials.password),
                        this._archiveCredentials.toSecureString(this._archiveCredentials.password)
                    ]).then(([encSourceCredentials, encArchiveCredentials]) => {
                        payload.sourceCredentials = encSourceCredentials;
                        payload.archiveCredentials = encArchiveCredentials;
                        return payload;
                    });
                })
                .then(payload => JSON.stringify(payload))
                .catch(err => {
                    throw new VError(err, `Failed dehydrating source: ${this.id}`);
                });
        });
    }

    /**
     * Lock the source
     * Encrypts the credentials and performs dehydration, placing the source into
     *  a LOCKED state. No saving is performed before locking.
     * @returns {Promise.<String>} A promise that resolves with dehydrated content
     * @throws {VError} Rejects if not in unlocked state
     * @fires ArchiveSource#sourceLocked
     * @memberof ArchiveSource
     */
    lock() {
        if (this.status !== Status.UNLOCKED) {
            return Promise.reject(
                new VError(`Failed locking source: Source in invalid state (${this.status}): ${this.id}`)
            );
        }
        this._status = Status.PENDING;
        return this._enqueueStateChange(() => {
            return Promise.all([
                this._sourceCredentials.toSecureString(this._archiveCredentials.password),
                this._archiveCredentials.toSecureString(this._archiveCredentials.password)
            ])
                .then(([encSourceCredentials, encArchiveCredentials]) => {
                    this._status = Status.LOCKED;
                    this._workspace = null;
                    this._sourceCredentials = encSourceCredentials;
                    this._archiveCredentials = encArchiveCredentials;
                })
                .catch(err => {
                    throw new VError(err, `Failed locking source: ${this.id}`);
                });
        }).then(() => {
            this.emit("sourceLocked", this.description);
            return this.dehydrate();
        });
    }

    /**
     * Unlock the source
     * @param {String} masterPassword The master password
     * @param {Boolean=} initialiseRemote Optionally initialise the remote (replaces
     *  remote archive) (defaults to false)
     * @memberof ArchiveSource
     * @throws {VError} Rejects if not in locked state
     * @throws {VError} Rejects if not able to create the source from the encrypted
     *  credentials
     * @fires ArchiveSource#sourceUnlocked
     */
    unlock(masterPassword, initialiseRemote = false) {
        if (this.status !== Status.LOCKED) {
            return Promise.reject(
                new VError(`Failed unlocking source: Source in invalid state (${this.status}): ${this.id}`)
            );
        }
        this._status = Status.PENDING;
        return this._enqueueStateChange(() => {
            return Promise.all([
                Credentials.fromSecureString(this._sourceCredentials, masterPassword),
                Credentials.fromSecureString(this._archiveCredentials, masterPassword)
            ])
                .then(([sourceCredentials, archiveCredentials] = []) => {
                    return credentialsToSource(sourceCredentials, archiveCredentials, initialiseRemote)
                        .then(sourceInfo => {
                            const { workspace, sourceCredentials, archiveCredentials } = sourceInfo;
                            this._workspace = workspace;
                            this._sourceCredentials = sourceCredentials;
                            this._archiveCredentials = archiveCredentials;
                            this._status = Status.UNLOCKED;
                            this.type = sourceCredentials.type;
                        })
                        .catch(err => {
                            throw new VError(err, "Failed mapping credentials to a source");
                        });
                })
                .then(() => {
                    this.emit("sourceUnlocked", this.description);
                })
                .catch(err => {
                    this._status = Status.LOCKED;
                    throw new VError(err, `Failed unlocking source: ${this.id}`);
                });
        });
    }

    /**
     * Update the password/credentials for the archive
     * The workspace is saved after changing. Responds with dehydrated details
     * which should be SAVED.
     * @param {String} masterPassword New master password
     * @returns {Promise.<String>} A promise that resolves with the dehydrated
     *  source details
     * @memberof ArchiveSource
     * @throws {VError} Rejects if source is not in unlocked state
     */
    updateArchiveCredentials(masterPassword) {
        if (this.status !== Status.UNLOCKED) {
            return Promise.reject(
                new VError(`Failed updating archive credentials: Source is not unlocked: ${this.id}`)
            );
        }
        return this._enqueueStateChange(() => {
            const credentials = Credentials.fromPassword(masterPassword);
            // First update the credentials stored here
            this._archiveCredentials = credentials;
            // Then update the credentials in the workspace
            this.workspace.updatePrimaryCredentials(credentials);
            // Save the workspace to push the new password to destination
            return this.workspace.save();
        });
    }

    _enqueueStateChange(cb) {
        return this._queue.channel("state").enqueue(cb);
    }
}

ArchiveSource.DefaultColour = DefaultColour;
ArchiveSource.DefaultOrder = DefaultOrder;
ArchiveSource.Status = Status;

ArchiveSource.rehydrate = rehydrate;

module.exports = ArchiveSource;
