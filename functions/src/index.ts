import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const getCalendarData = functions.https.onCall(async (data, context) => {
  // your logic here
  return { message: "This is a placeholder for calendar data." };
});
