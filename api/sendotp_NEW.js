const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ error: 'Mobile and OTP required' });
    if (mobile.length !== 10) return res.status(400).json({ error: 'Invalid mobile number' });

    const apiKey = process.env.TWOFACTOR_KEY;

    // 2Factor.in OTP API
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/${otp}/OTP1`;

    const result = await new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch(e) { resolve({ Status: 'Error', Details: data }); }
        });
      }).on('error', reject);
    });

    console.log('2Factor response:', JSON.stringify(result));

    if (result.Status === 'Success') {
      res.status(200).json({ success: true, message: 'OTP sent!' });
    } else {
      res.status(200).json({ success: false, message: result.Details || 'Failed' });
    }

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'OTP send failed', details: error.message });
  }
};
