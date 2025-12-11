require("dotenv").config();
const haversine = require("haversine-distance");
const getBannersWithinRadius = async (userLat, userLng, banners = []) => {
  return banners.filter((banner) => {
    // Banner must have lat/lng + range

    if (!banner.cityId || !banner.cityId.latitude || !banner.cityId.longitude) {
      return false;
    }

    let bannerLat = banner.cityId.latitude;
    let bannerLng = banner.cityId.longitude;

    const userCoord = { lat: userLat, lon: userLng };
    const bannerCoord = { lat: bannerLat, lon: bannerLng };

    // Distance returned in METERS → convert to KM
    const distanceKm = haversine(userCoord, bannerCoord) / 1000;
    console.log(distanceKm);
    return distanceKm <= 10;
  });
};

module.exports = {
  getBannersWithinRadius,
};
