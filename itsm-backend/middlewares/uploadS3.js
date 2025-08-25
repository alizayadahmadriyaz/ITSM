
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../config/s3");

const uploadToS3 = (keyPrefix = "uploads") =>
  multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_S3_BUCKET,
      acl: "private",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const userId = req.user?._id?.toString() || "anonymous";
        const ts = Date.now();
        cb(null, `${keyPrefix}/${userId}/${ts}-${file.originalname}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

module.exports = uploadToS3;

