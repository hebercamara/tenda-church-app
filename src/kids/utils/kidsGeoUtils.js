/**
 * Calcula a distancia em metros entre dois pontos GPS usando formula de Haversine
 */
export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // raio da Terra em metros
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Verifica se o usuario esta dentro do raio permitido
 */
export function isWithinRadius(userLat, userLng, churchLat, churchLng, radiusMeters) {
  const dist = getDistanceMeters(userLat, userLng, churchLat, churchLng);
  return { ok: dist <= radiusMeters, distanceMeters: Math.round(dist) };
}

/**
 * Obtem a geolocalizacao do dispositivo (Promise)
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não suportada pelo dispositivo."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    });
  });
}
