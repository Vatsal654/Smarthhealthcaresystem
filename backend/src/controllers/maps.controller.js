const axios = require('axios');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const TYPE_MAP = {
  hospital: '[amenity=hospital]',
  pharmacy: '[amenity=pharmacy]',
  clinic: '[amenity=clinic]',
  doctors: '[amenity=doctors]',
  dentist: '[amenity=dentist]',
};

exports.nearby = asyncHandler(async (req, res) => {
  const { lat, lng, type = 'hospital', radius = 5000 } = req.query;
  if (!lat || !lng) throw ApiError.badRequest('lat and lng are required');

  const tag = TYPE_MAP[type];
  if (!tag) throw ApiError.badRequest('Invalid type');

  const r = Math.min(Number(radius), 20000);

  const query = `
    [out:json][timeout:25];
    (
      node${tag}(around:${r},${lat},${lng});
      way${tag}(around:${r},${lat},${lng});
      relation${tag}(around:${r},${lat},${lng});
    );
    out center 60;
  `;

  try {
    const { data } = await axios.post(OVERPASS_URL, query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 30000,
    });

    const places = (data.elements || [])
      .map((el) => {
        const center = el.center || { lat: el.lat, lon: el.lon };
        if (!center.lat || !center.lon) return null;
        const t = el.tags || {};
        return {
          id: `${el.type}/${el.id}`,
          name: t.name || (type[0].toUpperCase() + type.slice(1)),
          lat: center.lat,
          lng: center.lon,
          phone: t.phone || t['contact:phone'] || null,
          address: [t['addr:housenumber'], t['addr:street'], t['addr:city']]
            .filter(Boolean)
            .join(' '),
          website: t.website || t['contact:website'] || null,
          openingHours: t.opening_hours || null,
          distanceMeters: haversine(Number(lat), Number(lng), center.lat, center.lon),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    res.json({ places });
  } catch (err) {
    if (err.response) {
      return res.status(502).json({ error: { message: 'Overpass API error' } });
    }
    throw err;
  }
});

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}
