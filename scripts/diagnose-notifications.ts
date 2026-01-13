import { db } from "../lib/db/drizzle";
import { users, notificationPreferences, products } from "../lib/db/schema";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

async function main() {
  // Check who would receive notifications (users with notification preferences)
  const recipients = await db
    .select({
      userId: users.id,
      email: users.email,
      emailEnabled: notificationPreferences.emailEnabled,
    })
    .from(notificationPreferences)
    .innerJoin(users, eq(users.id, notificationPreferences.userId));

  const allProducts = await db
    .select()
    .from(products)
    .where(isNotNull(products.lastCheckedAt));
  const pendingProducts = await db
    .select()
    .from(products)
    .where(and(isNotNull(products.lastCheckedAt), isNull(products.notifiedAt)));

  const activeRecipients = recipients.filter((r) => {
    const emailEnabled = r.emailEnabled ?? true;
    return emailEnabled;
  });

  console.log(
    `📧 Recipients: ${activeRecipients.length} (${recipients.length} total with preferences)`
  );
  activeRecipients.forEach((r) => {
    console.log(`   ${r.email} (email: ✓)`);
  });

  console.log(`\n📦 Products: ${allProducts.length}`);
  console.log(
    `📬 Pending products (notifiedAt = null): ${pendingProducts.length}`
  );

  if (activeRecipients.length === 0) {
    console.log(
      "\n⚠️  No recipients found. Users need to save notification preferences to receive emails."
    );
  } else if (pendingProducts.length > 0) {
    console.log(
      `\n💡 ${pendingProducts.length} pending products ready to notify.`
    );
  }
}

main().catch((error) => {
  console.error("Failed to diagnose:", error);
  process.exit(1);
});
