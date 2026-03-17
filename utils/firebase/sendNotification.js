const { initFirebase } = require("./firebase");

const stringifyData = (data = {}) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  const entries = Object.entries(data).map(([key, value]) => {
    if (value === undefined || value === null) {
      return [key, ""];
    }

    if (typeof value === "object") {
      return [key, JSON.stringify(value)];
    }

    return [key, String(value)];
  });

  return Object.fromEntries(entries);
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
};

const toValidImageUrl = (value) => {
  if (!value) return null;

  const imageValue = String(value).trim();
  if (!imageValue) return null;

  if (isHttpUrl(imageValue)) return imageValue;

  const normalizedPath = imageValue.startsWith("/")
    ? imageValue
    : `/${imageValue}`;

  const baseCandidates = [
    process.env.NOTIFICATION_IMAGE_BASE_URL,
    process.env.PUBLIC_IMAGE_BASE_URL,
    process.env.IMAGE_BASE_URL,
  ]
    .filter(Boolean)
    .map((base) => String(base).trim())
    .filter((base) => isHttpUrl(base));

  for (const base of baseCandidates) {
    try {
      return new URL(normalizedPath, base).toString();
    } catch (error) {
      // try next candidate
    }
  }

  if (process.env.AWS_BUCKET_NAME && process.env.AWS_REGION) {
    const key = normalizedPath.replace(/^\/+/, "");
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  return null;
};

const sendFcmPush = async (token, payload = {}) => {
  if (!token) return null;

  const firebaseAdmin = initFirebase();
  const imageUrl = toValidImageUrl(payload.image);

  const message = {
    token,
    notification: {
      title: payload.title || "",
      body: payload.body || "",
    },
    data: stringifyData(payload.data),
  };

  if (imageUrl) {
    message.notification.imageUrl = imageUrl;
  }

  return firebaseAdmin.messaging().send(message);
};

module.exports = sendFcmPush;
