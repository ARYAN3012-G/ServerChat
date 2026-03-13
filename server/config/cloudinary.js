const cloudinary = require('cloudinary').v2;
const { logger } = require('./logger');

const connectCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    logger.info('✅ Cloudinary configured');
};

const uploadToCloudinary = async (filePath, folder = 'serverchat', resourceType = 'auto') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: resourceType,
        });
        return {
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error) {
        logger.error(`❌ Cloudinary upload error: ${error.message || JSON.stringify(error)}`);
        if (error.error) {
           logger.error(`Cloudinary specific error details: ${JSON.stringify(error.error)}`);
        }
        throw error;
    }
};

const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        logger.error(`❌ Cloudinary delete error: ${error.message}`);
    }
};

module.exports = { connectCloudinary, uploadToCloudinary, deleteFromCloudinary };
