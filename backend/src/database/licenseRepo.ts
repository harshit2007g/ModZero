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

export function saveLicense(record: LicenseRecord): void {
  insertStmt.run(record);
}

export function getLicenseById(licenseId: string): LicenseRecord | undefined {
  return getStmt.get(licenseId) as LicenseRecord | undefined;
}