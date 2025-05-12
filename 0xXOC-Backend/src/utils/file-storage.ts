import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises } from 'fs';
import { createLogger } from './logger';

// Create a logger instance for this module
const logger = createLogger('file-storage');

// Directory to store uploaded files
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    logger.info(`Created uploads directory at ${UPLOADS_DIR}`);
  }
} catch (err) {
  logger.error('Failed to create uploads directory:', err);
}

/**
 * Save an uploaded file to disk
 * @param file File buffer
 * @param originalFilename Original filename
 * @returns Object with fileId and path
 */
export const saveUploadedFile = async (
  file: Buffer,
  originalFilename: string
): Promise<{ fileId: string; path: string; filename: string }> => {
  try {
    // Create a unique ID for the file
    const fileId = uuidv4();
    
    // Get file extension from original filename
    const fileExt = path.extname(originalFilename).toLowerCase();
    
    // Validate file extension
    if (!['.png', '.jpg', '.jpeg'].includes(fileExt)) {
      throw new Error('Invalid file type. Only PNG, JPG, and JPEG are allowed.');
    }
    
    // Create filename with UUID to ensure uniqueness
    const filename = `${fileId}${fileExt}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    
    // Write file to disk
    await fsPromises.writeFile(filePath, file);
    
    logger.info(`File saved: ${filePath}`);
    
    return {
      fileId,
      path: filePath,
      filename
    };
  } catch (error) {
    logger.error('Error saving uploaded file:', error);
    throw error;
  }
};

/**
 * Get a file from storage by its ID and extension
 * @param fileId File ID
 * @param fileExt File extension (with dot)
 * @returns File path and buffer
 */
export const getFileById = async (
  fileId: string,
  fileExt: string
): Promise<{ path: string; buffer: Buffer; filename: string }> => {
  try {
    // Ensure extension starts with a dot
    const ext = fileExt.startsWith('.') ? fileExt : `.${fileExt}`;
    
    // Create full filename
    const filename = `${fileId}${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file
    const buffer = await fsPromises.readFile(filePath);
    
    return {
      path: filePath,
      buffer,
      filename
    };
  } catch (error) {
    logger.error('Error retrieving file:', error);
    throw error;
  }
};

/**
 * Delete a file from storage after download
 * @param filePath Path to the file
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn(`File not found for deletion: ${filePath}`);
      return;
    }
    
    // Delete file
    await fsPromises.unlink(filePath);
    logger.info(`File deleted: ${filePath}`);
  } catch (error) {
    logger.error('Error deleting file:', error);
    throw error;
  }
}; 