// Netlify Forms の送信トリガー（submission-created）で呼ばれる関数
// Resend API を使って Gmail 宛にメール通知します

export async function handler(event) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const EMAIL_TO = process.env.EMAIL_TO; // 受信先（あなたのGmailなど）
    const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@poker-flip.app';

    if (!RESEND_API_KEY || !EMAIL_TO) {
      console.log('Missing RESEND_API_KEY or EMAIL_TO');
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // Netlify Forms のペイロード
    const payload = JSON.parse(event.body);
    const formName = payload?.payload?.form_name || 'unknown-form';
    const data = payload?.payload?.data || {};
    const userMsg = (data.message || '').toString();
    const userEmail = (data.email || '').toString();
    const ip = payload?.payload?.ip || '';
    const submitTime = payload?.payload?.created_at || new Date().toISOString();

    const subject = `Form submission: ${formName}`;
    const text = [
      `Form: ${formName}`,
      `Time: ${submitTime}`,
      `IP: ${ip}`,
      `Email: ${userEmail || '(not provided)'}`,
      '',
      'Message:',
      userMsg || '(empty)'
    ].join('\n');

    const html = `
      <div>
        <p><strong>Form:</strong> ${escapeHtml(formName)}</p>
        <p><strong>Time:</strong> ${escapeHtml(submitTime)}</p>
        <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
        <p><strong>Email:</strong> ${escapeHtml(userEmail || '(not provided)')}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap;">${escapeHtml(userMsg || '(empty)')}</pre>
      </div>
    `;

    // Resend API でメール送信
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [EMAIL_TO],
        subject,
        text,
        html
      })
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.log('Resend error', resp.status, body);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.log('Function error', e);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


