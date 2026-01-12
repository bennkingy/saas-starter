import 'server-only';

import { Resend } from 'resend';

type SendNewArrivalEmailArgs = {
  to: string;
  productName: string;
  productUrl: string;
  imageUrl?: string | null;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable.');
  }

  if (!fromEmail) {
    throw new Error('Missing RESEND_FROM_EMAIL environment variable.');
  }

  return {
    client: new Resend(apiKey),
    from: fromEmail,
  };
}

export async function sendNewArrivalEmail({
  to,
  productName,
  productUrl,
  imageUrl,
}: SendNewArrivalEmailArgs) {
  const { client, from } = getResendClient();

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

  const { error } = await client.emails.send({
    from,
    to,
    subject,
    text,
    html,
  });

  if (error) {
    const helpfulMessage = error.message.includes('domain is not verified')
      ? `${error.message}. For testing without a custom domain, use 'onboarding@resend.dev' as RESEND_FROM_EMAIL.`
      : error.message;
    throw new Error(`Failed to send email: ${helpfulMessage}`);
  }
}
