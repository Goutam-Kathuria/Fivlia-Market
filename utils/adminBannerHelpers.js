const mongoose = require("mongoose");
const City = require("../modals/city");
const { normalizeObjectIdInput, parseCoordinateInput } = require("./bannerHelpers");

const parseAdminBannerDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const isValidLatitude = (value) => value >= -90 && value <= 90;
const isValidLongitude = (value) => value >= -180 && value <= 180;

const normalizeCityInputValue = (cityInput) => {
  let value = cityInput;

  if (Array.isArray(value)) {
    value = value.length ? value[0] : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        value = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch (error) {
        return { error: { status: 400, message: "Invalid cityId format" } };
      }
    } else {
      value = trimmed;
    }
  }

  return { value };
};

const resolveAdminBannerLocationFields = async ({
  cityInput,
  latitudeInput,
  longitudeInput,
} = {}) => {
  const fields = {};
  let resolvedCity = null;

  if (cityInput !== undefined) {
    const normalizedCityInput = normalizeCityInputValue(cityInput);
    if (normalizedCityInput.error) {
      return normalizedCityInput;
    }

    const normalizedCityId = normalizeObjectIdInput(normalizedCityInput.value);
    if (normalizedCityId === null) {
      fields.cityId = null;
    } else if (!mongoose.Types.ObjectId.isValid(normalizedCityId)) {
      return { error: { status: 400, message: "Invalid cityId" } };
    } else {
      resolvedCity = await City.findById(normalizedCityId)
        .select("_id latitude longitude")
        .lean();
      if (!resolvedCity) {
        return {
          error: { status: 404, message: `City ${normalizedCityId} not found` },
        };
      }
      fields.cityId = resolvedCity._id;
    }
  }

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

  let latitude = hasLatitudeInput ? parsedLatitude : undefined;
  let longitude = hasLongitudeInput ? parsedLongitude : undefined;

  if ((latitude === undefined || longitude === undefined) && resolvedCity) {
    const cityLatitude = parseCoordinateInput(resolvedCity.latitude);
    const cityLongitude = parseCoordinateInput(resolvedCity.longitude);

    if (
      cityLatitude === undefined ||
      cityLongitude === undefined ||
      cityLatitude === null ||
      cityLongitude === null
    ) {
      return {
        error: {
          status: 400,
          message: `City ${resolvedCity._id} does not have valid latitude/longitude`,
        },
      };
    }

    latitude = cityLatitude;
    longitude = cityLongitude;
  }

  if (latitude === undefined || longitude === undefined) {
    return {
      error: {
        status: 400,
        message:
          "latitude and longitude are required. You can also provide a cityId with valid coordinates",
      },
    };
  }

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return {
      error: {
        status: 400,
        message: "Latitude or longitude is out of valid range",
      },
    };
  }

  fields.latitude = latitude;
  fields.longitude = longitude;
  fields.lat = String(latitude);
  fields.long = String(longitude);

  return { fields };
};

module.exports = {
  parseAdminBannerDate,
  resolveAdminBannerLocationFields,
};

