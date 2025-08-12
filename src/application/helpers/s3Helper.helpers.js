const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class S3Helper {
  constructor() {
    // Configure AWS S3 with environment variables
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID, 
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      signatureVersion: 'v4', // Use latest signature version for security
    });

    this.bucketName = process.env.AWS_S3_BUCKET;
    this.cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN; // Optional: for CDN
  }

  /**
   * Generate a unique file name with timestamp and UUID
   * @param {string} originalName - Original file name
   * @param {string} prefix - Folder prefix (e.g., 'providers', 'banners')
   * @param {string} subfolder - Subfolder within the prefix
   * @returns {string} - Unique file name
   */
  generateFileName(originalName, prefix = 'uploads', subfolder = '') {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    // Sanitize the base name (remove special characters)
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    
    const fileName = `${sanitizedName}_${timestamp}_${uuid}${extension}`;
    
    if (subfolder) {
      return `${prefix}/${subfolder}/${fileName}`;
    }
    
    return `${prefix}/${fileName}`;
  }

  /**
   * Upload file to S3 with proper error handling and validation
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Generated file name
   * @param {string} contentType - MIME type
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(fileBuffer, fileName, contentType, options = {}) {
    try {
      // Validate inputs
      if (!fileBuffer || !fileName || !contentType) {
        throw new Error('Missing required parameters: fileBuffer, fileName, or contentType');
      }

      // Validate file size (default 10MB limit)
      const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
      if (fileBuffer.length > maxSize) {
        throw new Error(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`);
      }

      // Validate content type
      const allowedTypes = options.allowedTypes || [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(contentType)) {
        throw new Error(`Invalid content type. Allowed types: ${allowedTypes.join(', ')}`);
      }

      // Prepare upload parameters
      const uploadParams = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
        CacheControl: options.cacheControl || 'max-age=31536000', // 1 year cache
        Metadata: {
          'uploaded-by': options.uploadedBy || 'system',
          'original-name': options.originalName || '',
          'upload-timestamp': new Date().toISOString()
        }
      };

      // Only add ACL if explicitly requested and bucket supports it
      if (options.acl && options.acl !== 'none') {
        uploadParams.ACL = options.acl;
      }

      // Add encryption if specified
      if (options.encrypt) {
        uploadParams.ServerSideEncryption = 'AES256';
      }

      // Upload to S3
      const result = await this.s3.upload(uploadParams).promise();

      // Return standardized response
      return {
        success: true,
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        etag: result.ETag,
        size: fileBuffer.length,
        contentType: contentType
      };

    } catch (error) {
      console.error('S3 upload error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Upload image with automatic optimization and thumbnail generation
   * @param {Buffer} fileBuffer - Image buffer
   * @param {string} originalName - Original file name
   * @param {string} prefix - Folder prefix
   * @param {string} subfolder - Subfolder
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Upload result with main and thumbnail URLs
   */
  async uploadImage(fileBuffer, originalName, prefix = 'images', subfolder = '', options = {}) {
    try {
      const fileName = this.generateFileName(originalName, prefix, subfolder);
      const contentType = options.contentType || this.getContentType(originalName);

      // Upload main image
      const mainResult = await this.uploadFile(fileBuffer, fileName, contentType, options);
      
      if (!mainResult.success) {
        return mainResult;
      }

      // Generate thumbnail if requested
      let thumbnailResult = null;
      if (options.generateThumbnail) {
        const thumbnailBuffer = await this.generateThumbnail(fileBuffer, contentType, options.thumbnailSize);
        const thumbnailName = fileName.replace(path.extname(fileName), '_thumb' + path.extname(fileName));
        
        thumbnailResult = await this.uploadFile(
          thumbnailBuffer, 
          thumbnailName, 
          contentType, 
          { ...options, acl: 'none' }
        );
      }

      return {
        success: true,
        main: mainResult,
        thumbnail: thumbnailResult,
        fileName: fileName
      };

    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete file from S3
   * @param {string} key - S3 object key
   * @returns {Promise<Object>} - Delete result
   */
  async deleteFile(key) {
    try {
      if (!key) {
        throw new Error('File key is required');
      }

      const deleteParams = {
        Bucket: this.bucketName,
        Key: key
      };

      const result = await this.s3.deleteObject(deleteParams).promise();

      return {
        success: true,
        key: key,
        deleteMarker: result.DeleteMarker
      };

    } catch (error) {
      console.error('S3 delete error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Generate presigned URL for secure uploads (for client-side uploads)
   * @param {string} fileName - File name
   * @param {string} contentType - MIME type
   * @param {number} expiresIn - Expiration time in seconds (default: 3600)
   * @returns {Promise<Object>} - Presigned URL result
   */
  async generatePresignedUrl(fileName, contentType, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: fileName,
        ContentType: contentType,
        Expires: expiresIn
      };

      const presignedUrl = await this.s3.getSignedUrlPromise('putObject', params);

      return {
        success: true,
        presignedUrl: presignedUrl,
        fileName: fileName,
        expiresIn: expiresIn
      };

    } catch (error) {
      console.error('Presigned URL generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get content type from file extension
   * @param {string} fileName - File name
   * @returns {string} - MIME type
   */
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Generate thumbnail from image buffer (basic implementation)
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} contentType - MIME type
   * @param {Object} size - Thumbnail size {width, height}
   * @returns {Promise<Buffer>} - Thumbnail buffer
   */
  async generateThumbnail(imageBuffer, contentType, size = { width: 200, height: 200 }) {
    // This is a basic implementation
    // In production, you might want to use sharp or jimp for image processing
    // For now, we'll return the original buffer
    // TODO: Implement proper image resizing with sharp or jimp
    
    return imageBuffer;
  }

  /**
   * Get CDN URL if CloudFront is configured
   * @param {string} s3Url - S3 URL
   * @returns {string} - CDN URL or original S3 URL
   */
  getCdnUrl(s3Url) {
    if (this.cloudFrontDomain && s3Url) {
      // Extract the key from S3 URL and construct CloudFront URL
      const urlParts = s3Url.split('/');
      const key = urlParts.slice(3).join('/'); // Remove bucket and region parts
      return `https://${this.cloudFrontDomain}/${key}`;
    }
    return s3Url;
  }

  /**
   * Validate S3 configuration
   * @returns {boolean} - Configuration validity
   */
  validateConfig() {
    const requiredEnvVars = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY', 
      'AWS_REGION',
      'AWS_S3_BUCKET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required AWS environment variables:', missingVars);
      return false;
    }

    return true;
  }
}

module.exports = S3Helper;
