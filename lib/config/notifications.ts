export const NOTIFICATIONS_CONFIG = {
  cron: {
    /**
     * The cron endpoint must be protected.
     *
     * Caller must provide header:
     * - x-cron-secret: process.env.CRON_SECRET
     */
    headerName: 'x-cron-secret',
  },
} as const;

