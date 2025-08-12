const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

// S3 Configuration - Initialize only when needed
let s3 = null;
let bucketName = null;

const initializeS3 = () => {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    bucketName = process.env.AWS_S3_BUCKET;
  }
  return { s3, bucketName };
};

/**
 * Returns multer middleware for S3 upload with dynamic folder
 */
const uploadFileToS3 = (type = /jpg|jpeg|png|pdf/, fileSize = 20 * 1024 * 1024) => {
  const folder = (req) => req.query.folder_name || "uploads"; 
  
  return (req, res, next) => {
    try {
      const { s3, bucketName } = initializeS3();
      
      if (!bucketName) {
        return res.status(500).json({ error: "AWS S3 bucket not configured" });
      }
      
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

      return upload.single("file")(req, res, next);
    } catch (error) {
      console.error("S3 upload error:", error);
      return res.status(500).json({ error: "File upload configuration error" });
    }
  };
};

module.exports = {
  uploadFileToS3,
};
