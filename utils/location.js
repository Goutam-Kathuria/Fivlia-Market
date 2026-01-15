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
    return distanceKm <= 20;
  });
};

function applyLocationFilter(filter, userLat, userLng, radiusKm = 20) {
  filter.$expr = {
    $lte: [
      {
        $multiply: [
          6371,
          {
            $acos: {
              $add: [
                {
                  $multiply: [
                    { $cos: { $degreesToRadians: userLat } },
                    { $cos: { $degreesToRadians: "$latitude" } },
                    {
                      $cos: {
                        $degreesToRadians: {
                          $subtract: ["$longitude", userLng],
                        },
                      },
                    },
                  ],
                },
                {
                  $multiply: [
                    { $sin: { $degreesToRadians: userLat } },
                    { $sin: { $degreesToRadians: "$latitude" } },
                  ],
                },
              ],
            },
          },
        ],
      },
      radiusKm,
    ],
  };
}


module.exports = {
  getBannersWithinRadius,
  applyLocationFilter
};
