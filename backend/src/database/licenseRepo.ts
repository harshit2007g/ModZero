import { db } from "./db.js";

export interface LicenseRecord {
  licenseId: string;
  contentId: string;
  licensor: string;
  licensee: string;
  termsHash: string;
  issuedAt: string;
  expiresAt: string | null;
  price: string;
  currency: string;
  termsJson: string;
  ethereumTxHash: string;
}

const insertStmt = db.prepare(`
  INSERT INTO license (licenseId, contentId, licensor, licensee, termsHash, issuedAt, expiresAt,
    price, currency, termsJson, ethereumTxHash)
  VALUES (@licenseId, @contentId, @licensor, @licensee, @termsHash, @issuedAt, @expiresAt,
    @price, @currency, @termsJson, @ethereumTxHash)
`);

const getStmt = db.prepare(`SELECT * FROM license WHERE licenseId = ?`);
const byContentAndLicenseeStmt = db.prepare(
  `SELECT * FROM license WHERE contentId = ? AND licensee = ? ORDER BY issuedAt DESC LIMIT 1`
);
const usedPaymentStmt = db.prepare(`SELECT licenseId FROM used_payment WHERE paymentTxHash = ?`);
const saveUsedStmt = db.prepare(
  `INSERT INTO used_payment (paymentTxHash, licenseId, createdAt) VALUES (?, ?, ?)`
);

export function saveLicense(record: LicenseRecord): void {
  insertStmt.run(record);
}

export function getLicenseById(licenseId: string): LicenseRecord | undefined {
  return getStmt.get(licenseId) as LicenseRecord | undefined;
}

/**
 * Idempotency: the same payment transaction must never mint a second
 * license (and a re-submitted request after a refresh resumes the existing
 * one instead of double-charging or double-issuing).
 */
export function savePaymentUsed(paymentTxHash: string, licenseId: string): void {
  saveUsedStmt.run(paymentTxHash, licenseId, new Date().toISOString());
}

export function getLicenseByPaymentTxHash(paymentTxHash: string): LicenseRecord | undefined {
  const used = usedPaymentStmt.get(paymentTxHash) as { licenseId: string } | undefined;
  return used ? getLicenseById(used.licenseId) : undefined;
}

export function getLicenseByContentAndLicensee(
  contentId: string,
  licensee: string
): LicenseRecord | undefined {
  return byContentAndLicenseeStmt.get(contentId, licensee) as LicenseRecord | undefined;
}