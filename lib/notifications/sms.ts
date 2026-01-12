import 'server-only';
import twilio from 'twilio';

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
      'SMS provider is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.'
    );
  }
}

export function createSmsProviderFromEnv(): SmsProvider {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const isConfigured = Boolean(accountSid) && Boolean(authToken) && Boolean(fromNumber);

  if (!isConfigured) {
    return {
      send: async () => {
        throw new MissingSmsProviderError();
      },
    };
  }

  const client = twilio(accountSid, authToken);

  return {
    send: async ({ to, body }) => {
      await client.messages.create({
        body,
        from: fromNumber,
        to,
      });
    },
  };
}

