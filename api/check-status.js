// Vercel API: /api/check-status
// Server-side IP lock for status code checking

const attempts = {}; // In-memory store (resets on redeploy)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Get IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.headers['x-real-ip'] 
    || req.socket?.remoteAddress 
    || 'unknown';

  const { code, firebaseUrl } = req.body;
  if (!code || !firebaseUrl) return res.status(400).json({ error: 'Missing params' });

  const now = Date.now();
  const LOCK_DURATION = 48 * 60 * 60 * 1000; // 48 hours
  const MAX_TRIES = 3;

  // Init IP record
  if (!attempts[ip]) attempts[ip] = { tries: 0, lockedUntil: 0 };
  const rec = attempts[ip];

  // Check if locked
  if (rec.lockedUntil > now) {
    const hoursLeft = Math.ceil((rec.lockedUntil - now) / (1000 * 60 * 60));
    return res.status(200).json({ 
      locked: true, 
      hoursLeft,
      message: `3 baar galat code! ${hoursLeft} ghante baad try karein.`
    });
  }

  // Validate code format GL-XXXXXX
  const codeClean = code.trim().toUpperCase();
  if (!/^GL-[A-Z0-9]{6}$/.test(codeClean)) {
    return res.status(200).json({ found: false, wrongCode: true });
  }

  // Fetch from Firebase
  try {
    const fbRes = await fetch(`${firebaseUrl}/lost.json?auth=skip`);
    const allLost = await fbRes.json();

    if (!allLost || typeof allLost !== 'object') {
      return res.status(200).json({ found: false, wrongCode: true });
    }

    // Find matching code
    const entry = Object.entries(allLost).find(([k, v]) => v.code === codeClean);

    if (!entry) {
      // Wrong code - increment tries
      rec.tries++;
      if (rec.tries >= MAX_TRIES) {
        rec.lockedUntil = now + LOCK_DURATION;
        rec.tries = 0;
        return res.status(200).json({ 
          locked: true, 
          hoursLeft: 48,
          message: '3 baar galat code! 48 ghante ke liye band ho gaya.'
        });
      }
      const remaining = MAX_TRIES - rec.tries;
      return res.status(200).json({ 
        found: false, 
        wrongCode: true,
        remaining,
        message: `Galat code! ${remaining} aur try bacha hai.`
      });
    }

    // Correct code - reset tries
    rec.tries = 0;
    rec.lockedUntil = 0;

    const [lostKey, lostData] = entry;

    // Get match if any
    let matchData = null;
    if (lostData.matched) {
      const matchRes = await fetch(`${firebaseUrl}/matches.json`);
      const allMatches = await matchRes.json();
      if (allMatches) {
        matchData = Object.values(allMatches).find(m => m.lostId === lostKey) || null;
      }
    }

    return res.status(200).json({
      found: true,
      matched: lostData.matched || false,
      lostData: {
        name: lostData.name,
        age: lostData.age,
        address: lostData.address,
        mobile: lostData.mobile,
        photo: lostData.photo,
        date: lostData.date
      },
      matchData: matchData ? {
        date: matchData.date,
        foundPerson: matchData.foundPerson
      } : null
    });

  } catch (e) {
    return res.status(500).json({ error: 'Server error', message: e.message });
  }
}
  
