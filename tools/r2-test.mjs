import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

await s3.send(new PutObjectCommand({
  Bucket: "dart-scans",
  Key: "mss-content-packs/v1/_upload-test.txt",
  Body: await readFile("./r2-test.txt"),
  ContentType: "text/plain"
}));

console.log("✅ R2 UPLOAD OK");
