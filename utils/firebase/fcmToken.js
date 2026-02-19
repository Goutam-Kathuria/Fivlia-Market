const normalizeFcmToken = (value) => {
  if (value === undefined || value === null) return "";
  let token = String(value).trim();

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  return token;
};

const isJwtLike = (token) => {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
};

const isLikelyFcmToken = (value) => {
  const token = normalizeFcmToken(value);
  if (!token) return false;
  if (/\s/.test(token)) return false;
  if (token.length < 80) return false;
  if (isJwtLike(token)) return false;
  return true;
};

module.exports = {
  normalizeFcmToken,
  isLikelyFcmToken,
};
