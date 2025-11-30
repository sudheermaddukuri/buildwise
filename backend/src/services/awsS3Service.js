const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

class AwsS3Service {
  /**
   * Upload a file to S3
   * @param {string} folderName - The folder name in S3
   * @param {string} filePath - Local path of the file to upload
   * @param {string} fileName - Name to be used in S3 (optional)
   * @returns {Promise<string>} - Returns the S3 URL of the uploaded file
   */
  async uploadFile(bucketName, folderName, filePath, fileName = null, options = {}) {
    try {
      const fileContent = fs.readFileSync(filePath);
      const uploadFileName = fileName || path.basename(filePath);
      const key = `${folderName}/${uploadFileName}`;

      const params = {
        Bucket: bucketName,
        Key: key,
        Body: fileContent,
        // Ensure files can be viewed inline when possible
        ContentType: options.contentType || undefined,
        ContentDisposition: options.contentDisposition || undefined,
      };

      const result = await s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  /**
   * List files in a specific folder in S3
   * @param {string} folderName - The folder name to list files from
   * @returns {Promise<Array>} - Returns array of file information
   */
  async listFiles(bucketName, folderName) {
    try {
      const params = {
        Bucket: bucketName,
        Prefix: folderName ? `${folderName}/` : ''
      };

      const result = await s3.listObjectsV2(params).promise();
      return result.Contents.map(file => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
        url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`
      }));
    } catch (error) {
      console.error('Error listing files from S3:', error);
      throw error;
    }
  }

  /**
   * Delete a file from S3
   * @param {string} folderName - The folder name in S3
   * @param {string} fileName - Name of the file to delete
   * @returns {Promise<boolean>} - Returns true if deletion was successful
   */
  async deleteFile(bucketName, folderName, fileName) {
    try {
      const params = {
        Bucket: bucketName,
        Key: `${folderName}/${fileName}`
      };

      await s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files from S3
   * @param {string} folderName - The folder name in S3
   * @param {Array<string>} fileNames - Array of file names to delete
   * @returns {Promise<boolean>} - Returns true if deletion was successful
   */
  async deleteMultipleFiles(bucketName, folderName, fileNames) {
    try {
      const params = {
        Bucket: bucketName,
        Delete: {
          Objects: fileNames.map(fileName => ({
            Key: `${folderName}/${fileName}`
          })),
          Quiet: false
        }
      };

      await s3.deleteObjects(params).promise();
      return true;
    } catch (error) {
      console.error('Error deleting multiple files from S3:', error);
      throw error;
    }
  }
}

module.exports = new AwsS3Service();


