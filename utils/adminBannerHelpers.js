const { parseCoordinateInput } = require("./bannerHelpers");


const isValidLatitude = (value) => value >= -90 && value <= 90;
const isValidLongitude = (value) => value >= -180 && value <= 180;

const resolveAdminBannerLocationFields = async ({
  latitudeInput,
  longitudeInput,
} = {}) => {
  const fields = {};

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

  // Location fields are optional for admin banners
  if (latitude === undefined || longitude === undefined) {
    return { fields };
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
  resolveAdminBannerLocationFields,
};

