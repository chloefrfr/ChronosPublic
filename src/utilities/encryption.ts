import crypto from "node:crypto";

export namespace Encryption {
  export function encrypt(input: string, key: string): string {
    const keyBytes: Buffer = Buffer.from(key, "utf8");
    const inputBytes: Buffer = Buffer.from(input, "utf8");

    const sha256 = crypto.createHash("sha256");
    const hashedKeyBytes = sha256.update(keyBytes).digest();

    const iv = crypto.randomBytes(16);
    const aes = crypto.createCipheriv("aes-256-cbc", hashedKeyBytes, iv);
    aes.setAutoPadding(true);

    const encryptedData = Buffer.concat([aes.update(inputBytes), aes.final()]);

    const combinedData = Buffer.concat([iv, encryptedData]);

    const encryptedBase64: string = combinedData.toString("base64");
    return encryptedBase64;
  }

  export function decrypt(encryptedBase64: string, key: string): string {
    const keyBytes: Buffer = Buffer.from(key, "utf8");
    const sha256 = crypto.createHash("sha256");
    const hashedKeyBytes = sha256.update(keyBytes).digest();

    const encryptedData: Buffer = Buffer.from(encryptedBase64, "base64");

    const iv = encryptedData.slice(0, 16);
    const encryptedText = encryptedData.slice(16);

    const aes = crypto.createDecipheriv("aes-256-cbc", hashedKeyBytes, iv);
    aes.setAutoPadding(true);

    let decryptedData = aes.update(encryptedText);
    decryptedData = Buffer.concat([decryptedData, aes.final()]);

    return decryptedData.toString("utf8");
  }
}
