const fs = require("fs");
const { uploadFile, deleteFile } = require("../services/awsS3Service");

// Controller for processing file uploads
exports.addFile = async (req, res) => {
  const filePath = req.file.path; // Path to the uploaded file
  const fileName = req.file.filename;
  const folderName = req.body.folderName;
  
  const auth = req.auth;
  const appId = auth?.currentApp?.id;
  try {
    // Upload file to S3
    const contentType = req.file.mimetype || 'application/octet-stream';
    const isInlineType = /^image\//.test(contentType) || contentType === 'application/pdf';
    const s3Response = await uploadFile('nexsense',
      (appId ? (appId + '/') : '') + folderName,
      filePath,
      fileName,// Default bucket name
      {
        contentType,
        contentDisposition: isInlineType ? 'inline' : undefined
      }
    );

    // Send response with S3 URL
    res.status(201).json({ 
      message: "File uploaded successfully to S3",
      data: {
        fileUrl: s3Response,
        fileName: fileName
      }
    });

  } catch (err) {
    console.error("Error processing file:", err);
    res.status(500).json({ error: err.message });
  } finally {
    // Clean up the temporary uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error("Failed to delete uploaded file:", err);
    });
  }
};

exports.deleteFile = async (req, res) => {
  const fileName = req.body.fileName;
  const folderName = req.body.folderName;
  const s3Response = await deleteFile('nexsense', folderName, fileName);
  if( s3Response ) {  
    res.status(200).json({ message: "File deleted successfully from S3" });
  } else {
    res.status(500).json({ message: "File not found in S3" });
  }
}

exports.deleteMultipleFiles = async (req, res) => {
  const fileNames = req.body.fileNames;
  const folderName = req.body.folderName;
  const s3Response = await deleteMultipleFiles('nexsense', folderName, fileNames);
  if( s3Response ) {
    res.status(200).json({ message: "Files deleted successfully from S3" });
  } else {
    res.status(500).json({ message: "Files not found in S3" });
  }
} 


