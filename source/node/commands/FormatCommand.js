const BaseCommand = require("./BaseCommand.js");

/**
 * Command for setting the archive format
 * @class FormatCommand
 * @augments BaseCommand
 */
class FormatCommand extends BaseCommand {
    /**
     * Execute the setting of the format
     * @param {ArchiveDataset} obj The archive dataset
     * @param {String} format The archive format
     */
    execute(obj, format) {
        if (obj.format) {
            throw new Error("Format already set");
        }
        obj.format = format;
    }
}

module.exports = FormatCommand;
