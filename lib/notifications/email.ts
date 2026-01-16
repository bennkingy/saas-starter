import "server-only";

import { Resend } from "resend";

type Product = {
  name: string;
  url: string;
  imageUrl?: string | null;
};

type SendNewArrivalEmailArgs = {
  to: string;
  products: Product[];
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  console.log(`[email] Checking Resend configuration...`);
  console.log(`[email] RESEND_API_KEY present: ${!!apiKey}`);
  console.log(`[email] RESEND_FROM_EMAIL: ${fromEmail || "MISSING"}`);

  if (!apiKey) {
    console.error(`[email] ❌ RESEND_API_KEY is missing`);
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  if (!fromEmail) {
    console.error(`[email] ❌ RESEND_FROM_EMAIL is missing`);
    throw new Error("Missing RESEND_FROM_EMAIL environment variable.");
  }

  console.log(`[email] ✅ Resend configuration valid`);
  return {
    client: new Resend(apiKey),
    from: fromEmail,
  };
}

export async function sendNewArrivalEmail({
  to,
  products,
}: SendNewArrivalEmailArgs) {
  console.log(
    `[email] sendNewArrivalEmail called for: ${to}, products: ${products.length}`
  );

  if (products.length === 0) {
    console.log(`[email] No products to send, skipping email`);
    return;
  }

  const { client, from } = getResendClient();
  console.log(`[email] Resend client initialized, from: ${from}`);

  const productCount = products.length;
  const subject =
    productCount === 1
      ? `🎉 New Jellycat Alert: ${products[0].name}`
      : `🎉 ${productCount} New Jellycats Just Dropped!`;

  const text =
    productCount === 1
      ? `New Jellycat just dropped!\n\n${products[0].name} has just been added to the Jellycat store.\n\nGrab it now: ${products[0].url}\n`
      : `${productCount} new Jellycats just dropped!\n\n${products
          .map((p, i) => `${i + 1}. ${p.name}\n   ${p.url}\n`)
          .join("\n")}\n`;

  const productsHtml = products
    .map(
      (product) => `
      <div style="margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #e5e7eb;">
        ${
          product.imageUrl
            ? `<img src="${product.imageUrl}" alt="${product.name}" style="max-width: 200px; width: 100%; border-radius: 8px; margin: 0 0 16px 0; display: block;" />`
            : ""
        }
        <p style="margin: 0 0 8px;"><strong style="color: #1f2937; font-size: 18px;">${
          product.name
        }</strong></p>
        <p style="margin: 0 0 16px;">
          <a href="${
            product.url
          }" style="display: inline-block; background-color: #33cee5; color: #1f2937; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
            View Product →
          </a>
        </p>
      </div>
    `
    )
    .join("");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; max-width: 600px; padding: 0 16px;">
      <h2 style="margin: 0 0 8px; color: #1f2937;">🎉 New Jellycat Alert${
        productCount > 1 ? "s" : ""
      }!</h2>
      <p style="margin: 0 0 24px; color: #4b5563;">
        ${
          productCount === 1
            ? "A brand new Jellycat has just been added to the store."
            : `${productCount} brand new Jellycats have just been added to the store.`
        }
      </p>
      ${productsHtml}
      <p style="margin: 32px 0 0; color: #9ca3af; font-size: 12px;">
        You received this email because you subscribed to Jellycat new arrival alerts.
      </p>
    </div>
  `;

  console.log(`[email] Preparing to send email via Resend API...`);
  console.log(`[email] Email details:`, {
    from,
    to,
    subject,
    productCount: products.length,
  });

  try {
    const { error, data } = await client.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });

    if (error) {
      console.error(`[email] ❌ Resend API error:`, error);
      console.error(`[email] Error type:`, typeof error);
      console.error(`[email] Error details:`, JSON.stringify(error, null, 2));
      const helpfulMessage = error.message?.includes("domain is not verified")
        ? `${error.message}. For testing without a custom domain, use 'onboarding@resend.dev' as RESEND_FROM_EMAIL.`
        : error.message || "Unknown error from Resend API";
      throw new Error(`Failed to send email: ${helpfulMessage}`);
    }

    console.log(`[email] ✅ Email sent successfully via Resend`);
    console.log(`[email] Resend response data:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`[email] ❌ Exception while sending email:`, error);
    console.error(`[email] Exception details:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    throw error;
  }
}

type SendPasswordResetEmailArgs = {
  to: string;
  resetToken: string;
};

export async function sendPasswordResetEmail({
  to,
  resetToken,
}: SendPasswordResetEmailArgs) {
  console.log(`[email] sendPasswordResetEmail called for: ${to}`);

  const { client, from } = getResendClient();
  console.log(`[email] Resend client initialized, from: ${from}`);

  const resetUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/reset-password?token=${resetToken}`;

  const subject = "Reset your password";

  const text = `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; max-width: 600px; padding: 0 16px;">
      <h2 style="margin: 0 0 8px; color: #1f2937;">Reset your password</h2>
      <p style="margin: 0 0 24px; color: #4b5563;">
        You requested a password reset. Click the button below to reset your password:
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #33cee5; color: #1f2937; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          Reset Password →
        </a>
      </p>
      <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">
        This link will expire in 1 hour.
      </p>
      <p style="margin: 0 0 0; color: #9ca3af; font-size: 12px;">
        If you didn't request this password reset, please ignore this email.
      </p>
    </div>
  `;

  console.log(`[email] Sending password reset email via Resend API...`);
  const { error, data } = await client.emails.send({
    from,
    to,
    subject,
    text,
    html,
  });

  if (error) {
    console.error(`[email] ❌ Resend API error:`, error);
    const helpfulMessage = error.message.includes("domain is not verified")
      ? `${error.message}. For testing without a custom domain, use 'onboarding@resend.dev' as RESEND_FROM_EMAIL.`
      : error.message;
    throw new Error(`Failed to send email: ${helpfulMessage}`);
  }

  console.log(
    `[email] ✅ Password reset email sent successfully via Resend, response:`,
    data
  );
}
