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
    return distanceKm <= 20;
  });
};

function applyLocationFilter(filter, userLat, userLng, radiusKm = 20) {

  filter.location = {
    $geoWithin: {
      $centerSphere: [
        [userLng, userLat], // lng, lat
        radiusKm / 6378.1, // km → radians
      ],
    },
  };
}

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

module.exports = {
  getBannersWithinRadius,
  applyLocationFilter,
  getDistanceKm
};
