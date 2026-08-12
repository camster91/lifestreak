// RSS feed functionality has been replaced with daily check feature for app store compliance.
// This endpoint now returns an empty array to avoid content aggregation.

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { isOriginAllowed, DEFAULT_PRODUCTION_ORIGINS } = require('../cors-origins.cjs');

export default async function handler(req, res) {
  const requestOrigin = req.headers.origin;
  const allow =
    isOriginAllowed(requestOrigin, {
      allowMissingOrigin: true,
    includeLocalDev: globalThis.process?.env?.NODE_ENV !== 'production',
    }) || !requestOrigin;

  const reflectOrigin = allow && requestOrigin
    ? requestOrigin
    : DEFAULT_PRODUCTION_ORIGINS[0];

  res.setHeader('Access-Control-Allow-Origin', reflectOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');

  if (requestOrigin && !allow) {
    res.status(403).json({ success: false, message: 'Origin not allowed' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'RSS feed functionality has been replaced with daily check feature for app store compliance.',
    items: [],
    source: 'disabled',
    fetchedAt: new Date().toISOString(),
  });
}
