import { db } from '../lib/db/drizzle';
import { users, notificationPreferences, teamMembers } from '../lib/db/schema';
import { eq, ne, inArray } from 'drizzle-orm';

async function main() {
  const KEEP_EMAIL = 'bennkingy@gmail.com';

  console.log(`🗑️  Removing all users except ${KEEP_EMAIL}...`);

  // Find all users except the one we want to keep
  const testUsers = await db
    .select()
    .from(users)
    .where(ne(users.email, KEEP_EMAIL));

  if (testUsers.length === 0) {
    console.log('✅ No test users found. All clean!');
    return;
  }

  console.log(`Found ${testUsers.length} test users to remove:`);
  testUsers.forEach((u) => {
    console.log(`   - ${u.email} (ID: ${u.id})`);
  });

  const testUserIds = testUsers.map((u) => u.id);

  // Delete notification preferences first (foreign key constraint)
  const deletedPrefs = await db
    .delete(notificationPreferences)
    .where(inArray(notificationPreferences.userId, testUserIds))
    .returning({ id: notificationPreferences.id });

  console.log(`   Deleted ${deletedPrefs.length} notification preferences`);

  // Delete team members (if any)
  const deletedMembers = await db
    .delete(teamMembers)
    .where(inArray(teamMembers.userId, testUserIds))
    .returning({ id: teamMembers.id });

  console.log(`   Deleted ${deletedMembers.length} team members`);

  // Delete the users
  const deletedUsers = await db
    .delete(users)
    .where(ne(users.email, KEEP_EMAIL))
    .returning({ id: users.id, email: users.email });

  console.log(`\n✅ Removed ${deletedUsers.length} test users:`);
  deletedUsers.forEach((u) => {
    console.log(`   - ${u.email}`);
  });

  console.log(`\n✅ Only ${KEEP_EMAIL} remains.`);
}

main().catch((error) => {
  console.error('Failed to remove test emails:', error);
  process.exit(1);
});
