import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Starting migration: template -> adjustment...");
  
  // Find all transactions with category "template"
  const templateCount = await prisma.transaction.count({
    where: { category: "template" },
  });
  
  console.log(`Found ${templateCount} transaction(s) with category "template".`);
  
  if (templateCount === 0) {
    console.log("No transactions to migrate.");
    return;
  }

  // Update them to category "adjustment"
  const result = await prisma.transaction.updateMany({
    where: { category: "template" },
    data: { category: "adjustment" },
  });

  console.log(`Successfully migrated ${result.count} transaction(s) to "adjustment".`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
