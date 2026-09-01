const RADIUS_METERS = 500;

const ALLOWED_LOCATIONS = [
  {
    name: "बीरगांव",
    pincode: "493221",
    latitude: 21.3012,
    longitude: 81.6287,
  },
  {
    name: "जागृति नगर (बीरगांव / उरकुरा क्षेत्र)",
    pincode: null,
    latitude: 21.306,
    longitude: 81.6506,
  },
  // Ghar (Nava Raipur) — commented out, didn't match the device's actual GPS reading.
  // {
  //   name: "Ghar (Nava Raipur)",
  //   pincode: null,
  //   latitude: 21.164993,
  //   longitude: 81.775307,
  // },
  {
    name: "Office (Nava Raipur)",
    pincode: null,
    latitude: 21.16,
    longitude: 81.7979,
  },
];

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function isWithinAllowedLocation(latitude, longitude) {
  return ALLOWED_LOCATIONS.some(
    (location) =>
      getDistanceMeters(
        latitude,
        longitude,
        location.latitude,
        location.longitude
      ) <= RADIUS_METERS
  );
}

module.exports = {
  ALLOWED_LOCATIONS,
  RADIUS_METERS,
  getDistanceMeters,
  isWithinAllowedLocation,
};
