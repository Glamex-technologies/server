const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

// S3 Configuration
const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.AWS_BUCKET_NAME;

/**
 * Returns multer middleware for S3 upload with dynamic folder
 */
const uploadFileToS3 = (type = /jpg|jpeg|png|pdf/, fileSize = 20 * 1024 * 1024) => {
  const folder = (req) => req.query.folder_name || "uploads"; 
  
  const upload = multer({
    storage: multerS3({
      s3,
      bucket: bucketName,
      // acl: 'public-read',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const filename = `uploads/${folder(req)}/${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, filename);
      },
    }),
    limits: { fileSize },
    fileFilter: (req, file, cb) => {
      const extname = type.test(path.extname(file.originalname).toLowerCase());
      if (extname) cb(null, true);
      else cb(new Error("Only JPG, JPEG, PNG, or PDF files allowed!"));
    },
  });

  return upload.single("file");
};

module.exports = {
  uploadFileToS3,
};
