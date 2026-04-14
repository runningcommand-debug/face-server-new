const axios = require('axios');
const FormData = require('form-data');

// 11 Face++ API Keys — Auto Rotate
const FACEPP_KEYS = [
  { key: '5_LTM97SZR4psSW5uJmelX66TvHjvT3X', secret: 'bFlVMyhmuNdw8R7FKiu49s-5S82B2FnH' },
  { key: 'Px5XFD780ms_LyhqYFDwtAdEE7acyG67', secret: 'i_51i3D7FgruSn6eqgk8ROXMc_saXKsh' },
  { key: 'b2wNhCI-J8dYbsdApT9ig0vpKNVjF8Nb', secret: 'QouuBlrjaDbQUJC8Y4l-OOIbjhxYb74A' },
  { key: 'sAoQf2Kz4QIO4-gJR4hxwzmpC9TOTGE_', secret: '8QlKc4Qvc8af-gQKzQsafB-OvjVFm-z8' },
  { key: 'tyn0KUxz1KbnMFW4fLQ5vf1Zo3cnQIMZ', secret: 'YKCWzdDDP6hJlLBGUMxte14856oDDXr4' },
  { key: 'giD2WAo2niwyFJbk3Z5pTdfgIsxc__QE', secret: 'h4hiyb2JV7oTtha7fmAC2WZKG5xXn7S4' },
  { key: 'plOn9XoDTkQtIOVheDOekQ85ST7QTdEV', secret: 'wH-UO_4WSv_OyMNAJrelhy0QAFdgIErC' },
  { key: 'UUXzu8wraoChcJ7NPD8UWVF-CrxT0AVt', secret: 'q8rbGEITLjwHYc97vN8yFy-dGqKvwFm0' },
  { key: '1VkD_a2hISGjCfLtPAsXwqcCahtuIGyB', secret: 'vrW8wZQOl41fRiwysveNL81C0VJxjldp' },
  { key: 'R79hEfEYbFEsjtQilgIJX8B9kuuyYT0-', secret: 'uBfHdebRk_V-STGUZCqMtD3hbUqJAgBR' },
  { key: 'bgoVbMQ4l9rtL2KJP_wOgFlmZpPqJSJQ', secret: 'nn9aOe0NSr7eDznjNN7gCYQsFXoUv2vl' },
];

let currentKeyIndex = 0;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image1, image2 } = req.body;
    if (!image1 || !image2) return res.status(400).json({ error: 'Two images required' });

    let lastError = null;
    for (let attempt = 0; attempt < FACEPP_KEYS.length; attempt++) {
      const keyObj = FACEPP_KEYS[currentKeyIndex];
      currentKeyIndex = (currentKeyIndex + 1) % FACEPP_KEYS.length;

      try {
        const form = new FormData();
        form.append('api_key', keyObj.key);
        form.append('api_secret', keyObj.secret);
        form.append('image_base64_1', image1);
        form.append('image_base64_2', image2);

        const response = await axios.post(
          'https://api-us.faceplusplus.com/facepp/v3/compare',
          form,
          { headers: form.getHeaders() }
        );

        const data = response.data;
        if (data.confidence !== undefined) {
          return res.status(200).json({ confidence: data.confidence, thresholds: data.thresholds });
        } else {
          return res.status(200).json({ confidence: 0, error: 'No face detected' });
        }

      } catch (err) {
        const errData = err.response?.data;
        if (errData && (errData.error_message === 'CONCURRENCY_LIMIT_EXCEEDED' || errData.error_message === 'RATE_LIMIT_EXCEEDED' || errData.error_message === 'AUTHORIZATION_ERROR')) {
          lastError = errData;
          continue;
        }
        throw err;
      }
    }

    res.status(500).json({ error: 'All API keys exhausted', details: lastError });

  } catch (error) {
    const msg = error.response?.data || error.message;
    res.status(500).json({ error: 'Face comparison failed', details: msg });
  }
};
      
