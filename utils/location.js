require("dotenv").config();
const haversine = require("haversine-distance");

const getBannersWithinRadius = async (userLat, userLng, banners = []) => {
  return banners.filter((banner) => {
    // Banner must have lat/lng + range
    if (!banner.latitude || !banner.longitude || !banner.range) return false;

    const userCoord = { lat: userLat, lon: userLng };
    const bannerCoord = { lat: banner.latitude, lon: banner.longitude };

    // Distance returned in METERS → convert to KM
    const distanceKm = haversine(userCoord, bannerCoord) / 1000;

    return distanceKm <= banner.range;
  });
};

module.exports = {
  getBannersWithinRadius
};