const mongoose = require("mongoose");

const DEFAULT_BANNER_DURATION_DAYS = 30;
const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
const HOME_BANNER_PLAN_TYPE = "Homepage";
const CATEGORY_BANNER_PLAN_TYPE = "Category";

const parseBooleanInput = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return null;
};

const parseRadius = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeObjectIdInput = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    if (!value.length) return null;
    return normalizeObjectIdInput(value[0]);
  }

  if (typeof value === "object" && value._id !== undefined) {
    return normalizeObjectIdInput(value._id);
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const parseCoordinateInput = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidLatitude = (value) => value >= -90 && value <= 90;
const isValidLongitude = (value) => value >= -180 && value <= 180;

const getCoordinateInputsFromBody = (body = {}) => {
  const latitude = body.latitude !== undefined ? body.latitude : body.lat;
  const longitude =
    body.longitude !== undefined
      ? body.longitude
      : body.lng !== undefined
        ? body.lng
        : body.long;

  return { latitude, longitude };
};

const resolveBannerCoordinates = ({
  latitudeInput,
  longitudeInput,
  requireCoordinates = false,
} = {}) => {
  const parsedLatitude = parseCoordinateInput(latitudeInput);
  const parsedLongitude = parseCoordinateInput(longitudeInput);

  if (parsedLatitude === null || parsedLongitude === null) {
    return {
      error: { status: 400, message: "Invalid latitude or longitude value" },
    };
  }

  const hasLatitudeInput = parsedLatitude !== undefined;
  const hasLongitudeInput = parsedLongitude !== undefined;

  if (hasLatitudeInput !== hasLongitudeInput) {
    return {
      error: {
        status: 400,
        message: "Both latitude and longitude are required together",
      },
    };
  }

  if (requireCoordinates && (!hasLatitudeInput || !hasLongitudeInput)) {
    return {
      error: {
        status: 400,
        message: "latitude and longitude are required",
      },
    };
  }

  if (hasLatitudeInput && hasLongitudeInput) {
    if (!isValidLatitude(parsedLatitude) || !isValidLongitude(parsedLongitude)) {
      return {
        error: {
          status: 400,
          message: "Latitude or longitude is out of valid range",
        },
      };
    }

    return {
      fields: {
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      },
    };
  }

  return { fields: {} };
};

const getCategoryIdString = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const attachSubCategory = (banners = []) =>
  banners.map((banner) => {
    const sub = banner.mainCategory?.subcat?.find(
      (item) => String(item._id) === String(banner.subCategory),
    );

    return {
      ...banner,
      mainCategory: banner.mainCategory
        ? {
            _id: banner.mainCategory._id,
            name: banner.mainCategory.name,
          }
        : null,
      subCategory: sub
        ? {
            _id: sub._id,
            name: sub.name,
          }
        : null,
    };
  });

const normalizePlanType = (value) => {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const lowered = raw.toLowerCase();
  if (
    lowered === HOME_BANNER_PLAN_TYPE.toLowerCase() ||
    lowered === "home" ||
    lowered === "home banner" ||
    lowered === "home-banner" ||
    lowered === "home_banner" ||
    lowered === "homebanner"
  ) {
    return HOME_BANNER_PLAN_TYPE;
  }

  if (
    lowered === CATEGORY_BANNER_PLAN_TYPE.toLowerCase() ||
    lowered === "category" ||
    lowered === "category banner" ||
    lowered === "category-banner" ||
    lowered === "category_banner" ||
    lowered === "categorybanner" ||
    lowered === "subcategory" ||
    lowered === "sub-category" ||
    lowered === "sub_category" ||
    lowered === "subcat"
  ) {
    return CATEGORY_BANNER_PLAN_TYPE;
  }

  return null;
};

const isHomeBannerPlanType = (value) =>
  normalizePlanType(value) === HOME_BANNER_PLAN_TYPE;

const isCategoryBannerPlanType = (value) =>
  normalizePlanType(value) === CATEGORY_BANNER_PLAN_TYPE;

const normalizeArrayInput = (value) => {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        return [trimmed];
      }
    }

    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [trimmed];
  }

  if (typeof value === "object" && value._id !== undefined) {
    return [value._id];
  }

  return [value];
};

const normalizeProductIds = (value, { required = false } = {}) => {
  const rawValues = normalizeArrayInput(value);
  const productIds = rawValues
    .map((item) => {
      if (item && typeof item === "object" && item._id !== undefined) {
        return String(item._id).trim();
      }
      return String(item || "").trim();
    })
    .filter(Boolean);

  if (required && !productIds.length) {
    return { error: { status: 400, message: "productId is required" } };
  }

  if (!productIds.length) {
    return { productIds: [] };
  }

  const invalidId = productIds.find(
    (id) => !mongoose.Types.ObjectId.isValid(id),
  );

  if (invalidId) {
    return { error: { status: 400, message: "Invalid productId" } };
  }

  return { productIds };
};

const getBannerExpiryDate = (fromDate = new Date()) =>
  new Date(fromDate.getTime() + DEFAULT_BANNER_DURATION_DAYS * MILLISECONDS_IN_A_DAY);

module.exports = {
  DEFAULT_BANNER_DURATION_DAYS,
  HOME_BANNER_PLAN_TYPE,
  CATEGORY_BANNER_PLAN_TYPE,
  parseBooleanInput,
  parseRadius,
  normalizeObjectIdInput,
  parseCoordinateInput,
  getCoordinateInputsFromBody,
  resolveBannerCoordinates,
  getCategoryIdString,
  normalizePlanType,
  isHomeBannerPlanType,
  isCategoryBannerPlanType,
  normalizeProductIds,
  getBannerExpiryDate,
  attachSubCategory,
};
