import 'server-only';

import nodemailer from 'nodemailer';

type SendNewArrivalEmailArgs = {
  to: string;
  productName: string;
  productUrl: string;
  imageUrl?: string | null;
};

function getEmailEnv() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    throw new Error(
      'Missing email env vars. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM.'
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    throw new Error('SMTP_PORT must be a number.');
  }

  return { host, port, user, pass, from };
}

export async function sendNewArrivalEmail({
  to,
  productName,
  productUrl,
  imageUrl,
}: SendNewArrivalEmailArgs) {
  const env = getEmailEnv();

  const transporter = nodemailer.createTransport({
    host: env.host,
    port: env.port,
    secure: env.port === 465,
    auth: { user: env.user, pass: env.pass },
  });

  const subject = `🎉 New Jellycat Alert: ${productName}`;
  const text = `New Jellycat just dropped!\n\n${productName} has just been added to the Jellycat store.\n\nGrab it now: ${productUrl}\n`;
  
  const imageHtml = imageUrl 
    ? `<img src="${imageUrl}" alt="${productName}" style="max-width: 200px; border-radius: 8px; margin-bottom: 16px;" />`
    : '';

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; max-width: 500px;">
      <h2 style="margin: 0 0 8px; color: #1f2937;">🎉 New Jellycat Alert!</h2>
      <p style="margin: 0 0 16px; color: #4b5563;">A brand new Jellycat has just been added to the store.</p>
      ${imageHtml}
      <p style="margin: 0 0 8px;"><strong style="color: #1f2937; font-size: 18px;">${productName}</strong></p>
      <p style="margin: 0 0 20px;">
        <a href="${productUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          View Product →
        </a>
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        You received this email because you subscribed to Jellycat new arrival alerts.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: env.from,
    to,
    subject,
    text,
    html,
  });
}
