// Vercel API: /api/check-status
// Server-side IP lock for status code checking

const attempts = {}; // In-memory store

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

  const { code, token } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const now = Date.now();
  const LOCK_DURATION = 48 * 60 * 60 * 1000;
  const MAX_TRIES = 3;
  const DB_URL = process.env.FIREBASE_DB_URL || 'https://gumshuda-mila-new-default-rtdb.asia-southeast1.firebasedatabase.app';

  // Init IP record
  if (!attempts[ip]) attempts[ip] = { tries: 0, lockedUntil: 0 };
  const rec = attempts[ip];

  // Check if locked
  if (rec.lockedUntil > now) {
    const hoursLeft = Math.ceil((rec.lockedUntil - now) / (1000 * 60 * 60));
    return res.status(200).json({ locked: true, hoursLeft });
  }

  // Validate code format
  const codeClean = code.trim().toUpperCase();
  if (!/^GL-[A-Z0-9]{6}$/.test(codeClean)) {
    rec.tries++;
    if (rec.tries >= MAX_TRIES) {
      rec.lockedUntil = now + LOCK_DURATION;
      rec.tries = 0;
      return res.status(200).json({ locked: true, hoursLeft: 48 });
    }
    return res.status(200).json({ found: false, wrongCode: true, remaining: MAX_TRIES - rec.tries });
  }

  // Fetch from Firebase using auth token from client
  try {
    // Use token if provided (anonymous auth token from client)
    const authParam = token ? `?auth=${token}` : '';
    const fbRes = await fetch(`${DB_URL}/lost.json${authParam}`);

    if (!fbRes.ok) {
      // Firebase rejected — token issue
      return res.status(200).json({ found: false, wrongCode: false, error: 'auth_failed' });
    }

    const allLost = await fbRes.json();

    if (!allLost || typeof allLost !== 'object') {
      return res.status(200).json({ found: false, wrongCode: true });
    }

    // Find matching code
    const entry = Object.entries(allLost).find(([k, v]) => v.code === codeClean);

    if (!entry) {
      rec.tries++;
      if (rec.tries >= MAX_TRIES) {
        rec.lockedUntil = now + LOCK_DURATION;
        rec.tries = 0;
        return res.status(200).json({ locked: true, hoursLeft: 48 });
      }
      const remaining = MAX_TRIES - rec.tries;
      return res.status(200).json({ found: false, wrongCode: true, remaining });
    }

    // Correct code — reset
    rec.tries = 0;
    rec.lockedUntil = 0;
    const [lostKey, lostData] = entry;

    // Get match
    let matchData = null;
    if (lostData.matched) {
      const matchRes = await fetch(`${DB_URL}/matches.json${authParam}`);
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
  
