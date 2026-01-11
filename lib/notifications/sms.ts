import 'server-only';

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
      'SMS provider is not configured. TODO: plug in Twilio (or another provider) and set env vars.'
    );
  }
}

export function createSmsProviderFromEnv(): SmsProvider {
  /**
   * TODO: Implement Twilio provider.
   * Keep this abstract so we can swap providers later.
   */
  const isConfigured =
    Boolean(process.env.TWILIO_ACCOUNT_SID) &&
    Boolean(process.env.TWILIO_AUTH_TOKEN) &&
    Boolean(process.env.TWILIO_PHONE_NUMBER);

  if (!isConfigured) {
    return {
      send: async () => {
        throw new MissingSmsProviderError();
      },
    };
  }

  return {
    send: async () => {
      throw new MissingSmsProviderError();
    },
  };
}

