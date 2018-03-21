const encodingTools = require("../source/node/tools/encoding.js");

const { ENCODED_STRING_PREFIX } = encodingTools;

module.exports = {
    setUp: function(cb) {
        cb();
    },

    compress: {
        compressesText: function(test) {
            var controlText =
                    "This is some control text, it has some certain content to it of no meaning.\n" +
                    "This is some control text, it has some certain content to it of no meaning.\n" +
                    "This is some control text, it has some certain content to it of no meaning.",
                compressed = encodingTools.compress(controlText);
            test.notStrictEqual(compressed, controlText, "Text should not match");
            test.strictEqual(typeof compressed, "string", "Should be a string");
            test.ok(compressed.length < controlText.length, "Compressed should be shorter");
            test.done();
        }
    },

    decompress: {
        decompressesText: function(test) {
            var controlText =
                    "A mean-spirited scooby snack gives the last beer to a polar bear beer related to a wanker. The incinerated burglar ale daydreams, and the blood clot flies into a rage; however, another fried Dos Equis reaches an understanding with a Hops Alligator Ale. A hammered coors light, a bud light behind the Citra Ninja, and another Imperial Stout are what made America great! Another sake bomb teaches some shot.",
                compressed = encodingTools.compress(controlText),
                decompressed = encodingTools.decompress(compressed);
            test.strictEqual(decompressed, controlText, "Decompressed text should match");
            test.done();
        }
    },

    isEncoded: {
        detectsNonEmptyText: function(test) {
            const str = ENCODED_STRING_PREFIX + "dGVzdGluZw==";
            test.ok(encodingTools.isEncoded(str), "String should be detected as being encoded");
            test.done();
        },

        detectsEmptyText: function(test) {
            const str = ENCODED_STRING_PREFIX;
            test.ok(encodingTools.isEncoded(str), "String should be detected as being encoded");
            test.done();
        },

        detectsIncorrectText: function(test) {
            const str = "dGVzdGluZw==";
            test.ok(!encodingTools.isEncoded(str), "String should be detected as being not encoded");
            test.done();
        }
    }
};
