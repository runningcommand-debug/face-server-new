export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method !== 'POST') return res.status(405).end();
  const { pin, secret } = req.body;
  if (pin === process.env.ADMIN_PIN && 
      secret === process.env.ADMIN_SECRET) {
    return res.status(200).json({ success: true });
  }
  return res.status(200).json({ success: false });
  }
