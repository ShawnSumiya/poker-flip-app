// Netlify Forms submission-created trigger → AWS SESでメール送信
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export async function handler(event) {
  try {
    const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    const EMAIL_TO = process.env.EMAIL_TO; // 受信先
    const EMAIL_FROM = process.env.EMAIL_FROM; // 送信元（SESで検証済み）

    if (!AWS_REGION || !EMAIL_TO || !EMAIL_FROM) {
      console.log('Missing required env: AWS_REGION/EMAIL_TO/EMAIL_FROM');
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

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

    const ses = new SESClient({ region: AWS_REGION });
    const cmd = new SendEmailCommand({
      Destination: { ToAddresses: [EMAIL_TO] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: text, Charset: 'UTF-8' },
          Html: { Data: html, Charset: 'UTF-8' },
        },
      },
      Source: EMAIL_FROM,
      ReplyToAddresses: userEmail ? [userEmail] : undefined,
    });
    const resp = await ses.send(cmd);
    console.log('SES sent', resp?.MessageId);

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
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


