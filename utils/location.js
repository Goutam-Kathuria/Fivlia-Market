require("dotenv").config();
const haversine = require("haversine-distance");

const getBannersWithinRadius = async (userLat, userLng, banners = []) => {
  return banners.filter((banner) => {
    if (!banner.cityId || !banner.cityId.latitude || !banner.cityId.longitude) {
      return false;
    }

    const userCoord = { lat: userLat, lon: userLng };
    const bannerCoord = {
      lat: banner.cityId.latitude,
      lon: banner.cityId.longitude,
    };

    const distanceKm = haversine(userCoord, bannerCoord) / 1000;
    return distanceKm <= 20;
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
