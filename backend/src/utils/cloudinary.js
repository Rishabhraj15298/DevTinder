const cloudinary = require('cloudinary').v2;

// Configure Cloudinary using individual environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64String - Base64 encoded image string
 * @param {string} userId - User ID for naming the file
 * @returns {Promise<string>} - Cloudinary URL of the uploaded image
 */
const uploadBase64ToCloudinary = async (base64String, userId) => {
  try {
    if (!base64String || !base64String.startsWith('data:image')) {
      return null;
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64String, {
      folder: 'devtinder/profiles',
      public_id: `profile_${userId}_${Date.now()}`,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Crop to square, focus on face
        { quality: 'auto:good' }, // Auto optimize quality
        { fetch_format: 'auto' } // Auto format (webp when supported)
      ]
    });

    return result.secure_url; // Return secure HTTPS URL
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
};

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} userId - User ID for naming the file
 * @param {string} mimetype - MIME type of the image
 * @returns {Promise<string>} - Cloudinary URL of the uploaded image
 */
const uploadBufferToCloudinary = async (buffer, userId, mimetype) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'devtinder/profiles',
          public_id: `profile_${userId}_${Date.now()}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Error uploading buffer to Cloudinary:', error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Error uploading buffer to Cloudinary:', error);
    return null;
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} imageUrl - Cloudinary URL or public_id
 * @returns {Promise<boolean>} - True if deleted successfully
 */
const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl) return true;

    // Extract public_id from Cloudinary URL
    // URLs format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{folder}/{public_id}.{format}
    const urlPattern = /\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)$/i;
    const match = imageUrl.match(urlPattern);

    if (match) {
      const publicId = match[1];
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    }

    // If URL doesn't match pattern, try to extract public_id differently
    // Or if it's not a Cloudinary URL, just return true (nothing to delete)
    if (!imageUrl.includes('cloudinary.com')) {
      return true; // Not a Cloudinary URL, nothing to delete
    }

    return false;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

module.exports = {
  uploadBase64ToCloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
};

