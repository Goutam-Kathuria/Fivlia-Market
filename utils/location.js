require("dotenv").config();
const haversine = require("haversine-distance");

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getBannerCoordinates = (banner = {}) => {
  const latitude = toNumber(
    banner.latitude !== undefined ? banner.latitude : banner.lat,
  );
  const longitude = toNumber(
    banner.longitude !== undefined ? banner.longitude : banner.long,
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    lat: latitude,
    lon: longitude,
  };
};

const getBannersWithinRadius = async (
  userLat,
  userLng,
  banners = [],
  radiusKm = 20,
) => {
  const normalizedUserLat = toNumber(userLat);
  const normalizedUserLng = toNumber(userLng);

  if (normalizedUserLat === null || normalizedUserLng === null) {
    return [];
  }

  const userCoord = { lat: normalizedUserLat, lon: normalizedUserLng };

  return banners.filter((banner) => {
    const bannerCoord = getBannerCoordinates(banner);
    if (!bannerCoord) return false;

    const distanceKm = haversine(userCoord, bannerCoord) / 1000;
    return distanceKm <= radiusKm;
  });
};

function applyLocationFilter(filter, userLat, userLng, radiusKm = 20) {
  filter.location = {
    $geoWithin: {
      $centerSphere: [[userLng, userLat], radiusKm / 6378.1],
    },
  };
}

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const points = [lat1, lon1, lat2, lon2];
  if (points.some((value) => typeof value !== "number" || Number.isNaN(value))) {
    return Infinity;
  }

  return haversine({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 }) / 1000;
};

module.exports = {
  getBannersWithinRadius,
  applyLocationFilter,
  getDistanceKm,
};
