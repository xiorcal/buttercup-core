var cmm = require("../../source/node/system/commands/CommentCommand.js");

module.exports = {
    setUp: function(cb) {
        this.command = new cmm();
        cb();
    },

    callbackInjected: {
        callsToCallback: function(test) {
            var callbackCalled = false;
            var callback = function(comment) {
                callbackCalled = true;
            };

            this.command.setCallback("comment", callback);
            this.command.execute({}, "");

            test.strictEqual(callbackCalled, true, "Calls into callback");
            test.done();
        },

        callsToCallbackWithCommentTestCaseOne: function(test) {
            var providedComment = "I am the first test case";

            var callbackCalled = false;
            var callback = function(comment) {
                if (comment === providedComment) {
                    callbackCalled = true;
                }
            };

            this.command.setCallback("comment", callback);
            this.command.execute({}, providedComment);

            test.strictEqual(callbackCalled, true, "Calls into callback with correct comment (test case one)");
            test.done();
        },

        callsToCallbackWithCommentTestCaseTwo: function(test) {
            var providedComment = "The second test case, that is what I am";

            var callbackCalled = false;
            var callback = function(comment) {
                if (comment === providedComment) {
                    callbackCalled = true;
                }
            };

            this.command.setCallback("comment", callback);
            this.command.execute({}, providedComment);

            test.strictEqual(callbackCalled, true, "Calls into callback with correct comment (test case two)");
            test.done();
        }
    }
};
