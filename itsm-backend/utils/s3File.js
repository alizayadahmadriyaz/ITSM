const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth"); // DOCX
const { exec } = require("child_process"); // for DOC (legacy)
const path = require("path");
const os = require("os");
const fs = require("fs");

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function getFileFromS3(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  const body = await streamToBuffer(response.Body);

  const ext = path.extname(key).toLowerCase();

  if (ext === ".pdf") {
    const data = await pdfParse(body);
    return data.text;
  }

  if (ext === ".docx") {
    const { value } = await mammoth.extractRawText({ buffer: body });
    return value;
  }

  if (ext === ".doc") {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(os.tmpdir(), `${Date.now()}.doc`);
    console.log("path ",path)
    fs.writeFileSync(tempPath, body);

    exec(`antiword "${tempPath}"`, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

  if (ext === ".txt") {
    return body.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

module.exports = { getFileFromS3 };
