var lib = require("../source/node/index.js"),
    encoding = require("../source/node/tools/encoding.js");

const E = encoding.encodeStringValue;

var describe = lib.Descriptor,
    getUniqueID = encoding.getUniqueID;

module.exports = {
    setUp: function(cb) {
        cb();
    },

    basicStructures: {
        testDescribesBasicStructures: function(test) {
            var groupID = getUniqueID(),
                subGroupID = getUniqueID(),
                entryID = getUniqueID(),
                archiveID = getUniqueID();
            var dataset = {
                archiveID: archiveID,
                attributes: {
                    status: "ro"
                },
                groups: [
                    {
                        id: groupID,
                        title: "Main",
                        entries: [
                            {
                                id: entryID,
                                title: "Website",
                                username: "name",
                                password: "code",
                                meta: {
                                    metaItem1: "123 456"
                                },
                                attributes: {
                                    "my attribute": "attr value"
                                }
                            }
                        ],
                        groups: [
                            {
                                id: subGroupID,
                                title: "Sub"
                            }
                        ],
                        attributes: {
                            testAttr: "groupAttrValue"
                        }
                    }
                ]
            };
            var description = describe(dataset);
            // console.log(description, "\n", "tgr " + groupID + " " + E("Main"));
            test.ok(description.indexOf(`cgr 0 ${groupID}`) >= 0, "Group should be created");
            test.ok(description.indexOf(`tgr ${groupID} ${E("Main")}`) >= 0, "Group should be titled");
            test.ok(description.indexOf(`cen ${groupID} ${entryID}`) >= 0, "Entry should be created");
            test.ok(
                description.indexOf(`sep ${entryID} ${E("title")} ${E("Website")}`) >= 0,
                "Entry should have title"
            );
            test.ok(
                description.indexOf(`sep ${entryID} ${E("username")} ${E("name")}`) >= 0,
                "Entry should have username"
            );
            test.ok(
                description.indexOf(`sep ${entryID} ${E("password")} ${E("code")}`) >= 0,
                "Entry should have password"
            );
            test.ok(
                description.indexOf(`sem ${entryID} ${E("metaItem1")} ${E("123 456")}`) >= 0,
                "Entry should have meta"
            );
            test.ok(
                description.indexOf(`sea ${entryID} ${E("my attribute")} ${E("attr value")}`) >= 0,
                "Entry should have attribute"
            );
            test.ok(description.indexOf(`cgr ${groupID} ${subGroupID}`) >= 0, "Sub-group should be created");
            test.ok(description.indexOf(`tgr ${subGroupID} ${E("Sub")}`) >= 0, "Sub-group should be titled");
            test.ok(
                description.indexOf(`sga ${groupID} ${E("testAttr")} ${E("groupAttrValue")}`) >= 0,
                "Group should have an attribute"
            );
            test.ok(description.indexOf(`saa ${E("status")} ${E("ro")}`) >= 0, "Archive should have attributes");
            test.ok(description.indexOf(`aid ${archiveID}`) >= 0, "Archive ID should be set");
            test.done();
        }
    }
};
