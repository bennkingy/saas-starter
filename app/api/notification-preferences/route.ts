import { getNotificationPreferencesForUser } from '@/lib/db/queries';

export async function GET() {
  const prefs = await getNotificationPreferencesForUser();
  return Response.json(prefs);
}

