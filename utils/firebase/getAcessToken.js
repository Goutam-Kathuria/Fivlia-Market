const { initFirebase } = require("./firebase");

const getAccessToken = async () => {
  try {
    const firebaseAdmin = initFirebase();
    const credential = firebaseAdmin.app().options.credential;
    if (!credential || typeof credential.getAccessToken !== "function") {
      return null;
    }

    const tokenResponse = await credential.getAccessToken();
    console.log("tokenResponse",tokenResponse)
    return tokenResponse?.access_token || null;
  } catch (error) {
    console.error("Failed to get access token:", error.message);
    return null;
  }
};
getAccessToken()
module.exports = getAccessToken;
