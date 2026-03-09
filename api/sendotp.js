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

    const postData = JSON.stringify({
      "route": "otp",
      "variables_values": otp.toString(),
      "numbers": mobile,
      "flash": 0
    });

    const options = {
      hostname: 'www.fast2sms.com',
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        'authorization': process.env.FAST2SMS_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const result = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch(e) { resolve({ return: false, message: data }); }
        });
      });
      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    console.log('Fast2SMS response:', JSON.stringify(result));

    if (result.return === true) {
      res.status(200).json({ success: true, message: 'OTP sent!' });
    } else {
      res.status(200).json({ success: false, message: JSON.stringify(result) });
    }
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'OTP send failed', details: error.message });
  }
};
