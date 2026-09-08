import { Client, PrivateKey, TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import dotenv from "dotenv";
import type { HcsEvent } from "../../../hedera/events/schema.js";

dotenv.config({ path: "../.env" });

const accountId = process.env.HEDERA_ACCOUNT_ID as string;
const privateKey = process.env.HEDERA_PRIVATE_KEY as string;
const topicId = process.env.HEDERA_TOPIC_ID as string;

const client = Client.forTestnet();
client.setOperator(accountId, PrivateKey.fromStringECDSA(privateKey));

/**
 * Publishes a structured event to the ModZero HCS topic. Returns the
 * consensus sequence number — this is what gets stored as
 * `hederaSequence` on content/license/claim/post records, per spec §15.
 *
 * Uses the shared HcsEvent type from hedera/events/schema.ts so the
 * publisher can never drift from what the (future) indexer expects.
 */
export async function publishHcsEvent(event: HcsEvent): Promise<number> {
    const tx = await new TopicMessageSubmitTransaction({
        topicId,
        message: JSON.stringify(event),
    }).execute(client);

    const receipt = await tx.getReceipt(client);
    const sequenceNumber = receipt.topicSequenceNumber?.toNumber();

    if (sequenceNumber === undefined) {
        throw new Error("Hedera did not return a topic sequence number");
    }

    return sequenceNumber;
}