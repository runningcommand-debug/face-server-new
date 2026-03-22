export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: 'No token' });
  }

  const secret = '6Lex7IssAAAAAHdYTJHpzkdkKWdU-6srqNwwa4JQ';

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secret}&response=${token}`
      }
    );
    const data = await response.json();
    return res.status(200).json({ success: data.success });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
