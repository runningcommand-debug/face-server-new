const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image1, image2 } = req.body;
    if (!image1 || !image2) return res.status(400).json({ error: 'Two images required' });

    const form = new FormData();
    form.append('api_key', process.env.FACEPP_API_KEY);
    form.append('api_secret', process.env.FACEPP_API_SECRET);
    form.append('image_base64_1', image1);
    form.append('image_base64_2', image2);

    const response = await axios.post(
      'https://api-us.faceplusplus.com/facepp/v3/compare',
      form,
      { headers: form.getHeaders() }
    );

    const data = response.data;
    if (data.confidence !== undefined) {
      res.status(200).json({ confidence: data.confidence, thresholds: data.thresholds });
    } else {
      res.status(200).json({ confidence: 0, error: 'No face detected' });
    }
  } catch (error) {
    const msg = error.response?.data || error.message;
    res.status(500).json({ error: 'Face comparison failed', details: msg });
  }
};
  
