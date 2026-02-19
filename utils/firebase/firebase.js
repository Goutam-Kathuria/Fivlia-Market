const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const tryParseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = tryParseJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (parsed) return parsed;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");
    const parsed = tryParseJson(decoded);
    if (parsed) return parsed;
  }

  const fromEnvPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (fromEnvPath && fs.existsSync(fromEnvPath)) {
    const file = fs.readFileSync(fromEnvPath, "utf8");
    const parsed = tryParseJson(file);
    if (parsed) return parsed;
  }

  const localCandidates = [
    "fivlia-market.json",
    "fivlia.json",
    "service-account.json",
  ];
  for (const fileName of localCandidates) {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) continue;

    const file = fs.readFileSync(filePath, "utf8");
    const parsed = tryParseJson(file);
    if (parsed) return parsed;
  }

  const dynamicCandidates = fs
    .readdirSync(__dirname)
    .filter((name) => /\.json$/i.test(name))
    .filter((name) => name.toLowerCase().includes("firebase-adminsdk"));

  for (const fileName of dynamicCandidates) {
    const filePath = path.join(__dirname, fileName);
    const file = fs.readFileSync(filePath, "utf8");
    const parsed = tryParseJson(file);
    if (parsed) return parsed;
  }

  return null;
};

const initFirebase = () => {
  if (admin.apps.length) return admin;

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    const error = new Error("Firebase service account credentials are missing");
    error.code = "FIREBASE_CONFIG_MISSING";
    throw error;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin;
};

module.exports = {
  admin,
  initFirebase,
};
