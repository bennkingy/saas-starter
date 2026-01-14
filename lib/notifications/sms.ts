import "server-only";

export type SmsSendArgs = {
  to: string;
  body: string;
};

export type SmsProvider = {
  send: (args: SmsSendArgs) => Promise<void>;
};

class MissingSmsProviderError extends Error {
  constructor() {
    super(
      "SMS provider is not configured. Set CLICK_SEND_API_KEY (and optionally CLICK_SEND_USERNAME) in your .env file."
    );
  }
}

export function createSmsProviderFromEnv(): SmsProvider {
  const apiKey = process.env.CLICK_SEND_API_KEY;
  const username = process.env.CLICK_SEND_USERNAME || apiKey;

  const isConfigured = Boolean(apiKey);

  if (!isConfigured) {
    return {
      send: async () => {
        throw new MissingSmsProviderError();
      },
    };
  }

  return {
    send: async ({ to, body }) => {
      const authString = Buffer.from(`${username}:${apiKey}`).toString(
        "base64"
      );

      const response = await fetch("https://rest.clicksend.com/v3/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify({
          messages: [
            {
              source: "sdk",
              body,
              to,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ClickSend API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      if (data.response_code !== "SUCCESS") {
        throw new Error(
          `ClickSend API error: ${data.response_msg || "Unknown error"}`
        );
      }
    },
  };
}
