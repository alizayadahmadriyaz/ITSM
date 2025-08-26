// // utils/s3Upload.js
const { S3Client, PutObjectCommand,GetObjectCommand } = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.AWS_REGION, // e.g. "us-east-1"
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
// const s3=require("../config/s3")
/**
 * Upload JSON data to S3
 * @param {string} key - The S3 object key (path + filename)
 * @param {object} data - JSON object to upload
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
async function uploadJsonToS3(key, data) {
  try {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      throw new Error("Missing AWS_S3_BUCKET env variable");
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    });

    await s3.send(command);

    return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (err) {
    console.error("S3 upload failed:", err);
    throw err;
  }
}


const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

async function getJsonFromS3(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  const body = await streamToBuffer(response.Body);
  return JSON.parse(body.toString("utf-8"));
}

async function getFileFromS3(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  return streamToBuffer(response.Body); // return raw buffer
}

module.exports = { uploadJsonToS3, getJsonFromS3, getFileFromS3 };



