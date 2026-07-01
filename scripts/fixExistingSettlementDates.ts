import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Starting script: Fixing existing settlement transaction dates...");

  // Find all transactions starting with "Settled Bill with"
  const transactions = await prisma.transaction.findMany({
    where: {
      description: {
        startsWith: "Settled Bill with",
      },
    },
  });

  console.log(`Found ${transactions.length} settlement transaction(s) in total.`);

  let updatedCount = 0;

  for (const tx of transactions) {
    // Resolve splitGroupId
    let splitGroupId = tx.splitGroupId;
    const match = tx.description ? tx.description.match(/\[tx_id:([^\]]+)\]/) : null;
    if (match) {
      splitGroupId = match[1];
    }

    if (!splitGroupId) {
      console.log(`Skipping transaction ${tx.id}: No splitGroupId or tx_id found in description.`);
      continue;
    }

    // Find the corresponding BillFriend
    let billFriend = null;
    if (splitGroupId.startsWith("split_")) {
      // Template split bill: find by matching tx_id in description
      billFriend = await prisma.billFriend.findFirst({
        where: {
          userId: tx.userId,
          description: {
            contains: `[tx_id:${splitGroupId}]`,
          },
        },
      });
    } else {
      // Manual split bill: splitGroupId is the billId
      billFriend = await prisma.billFriend.findFirst({
        where: {
          id: splitGroupId,
          userId: tx.userId,
        },
      });
    }

    if (!billFriend) {
      console.log(`Skipping transaction ${tx.id}: Associated BillFriend not found for splitGroupId ${splitGroupId}.`);
      continue;
    }

    // Check if dates are already aligned (same month/day)
    const txTime = tx.date.getTime();
    const billTime = billFriend.createdAt.getTime();

    if (Math.abs(txTime - billTime) < 1000) {
      // Already aligned
      continue;
    }

    console.log(`Updating transaction ${tx.id} ("${tx.description}"):`);
    console.log(`  Current Date: ${tx.date.toISOString()}`);
    console.log(`  New Date (Bill CreatedAt): ${billFriend.createdAt.toISOString()}`);

    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        date: billFriend.createdAt,
      },
    });

    // Also align the billFriend's settledAt date if it is settled
    if (billFriend.isSettled && billFriend.settledAt) {
      await prisma.billFriend.update({
        where: { id: billFriend.id },
        data: {
          settledAt: billFriend.createdAt,
        },
      });
    }

    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} transaction(s) to match their original bill dates.`);
}

main()
  .catch((e) => {
    console.error("Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
