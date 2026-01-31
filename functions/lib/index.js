"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarData = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.getCalendarData = functions.https.onCall(async (data, context) => {
    // your logic here
    return { message: "This is a placeholder for calendar data." };
});
//# sourceMappingURL=index.js.map