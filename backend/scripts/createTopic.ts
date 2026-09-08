import { Client, TopicCreateTransaction, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

async function main() {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error("HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env");
  }

  const client = Client.forTestnet();
client.setOperator(accountId, PrivateKey.fromStringECDSA(privateKey));

  console.log("Creating HCS topic...");

  const tx = await new TopicCreateTransaction()
    .setTopicMemo("ModZero provenance events")
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const topicId = receipt.topicId;

  console.log("\nTopic created successfully!");
  console.log("Topic ID:", topicId?.toString());
  console.log("\nAdd this to your .env:");
  console.log(`HEDERA_TOPIC_ID=${topicId?.toString()}`);

  client.close();
}

main().catch((err) => {
  console.error("Failed to create topic:", err);
  process.exit(1);
});