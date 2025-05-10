/**
 * Encryption utilities for secure data handling
 */
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import { createLogger } from './logger';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const logger = createLogger('encryption-utils');

// Set up viem public client for Base blockchain
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

/**
 * Generate a new UUID for encryption
 */
export function generateEncryptionUuid(): string {
  return uuidv4();
}

/**
 * Encrypt data using AES with a passphrase
 * @param data The data to encrypt
 * @param passphrase The passphrase to use for encryption
 * @returns The encrypted data in base64 format
 */
export function encryptData(data: string, passphrase: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, passphrase).toString();
    logger.debug('Data encrypted successfully');
    return encrypted;
  } catch (error) {
    logger.error('Failed to encrypt data', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Convert encrypted data to hex format for blockchain storage
 * @param encryptedData The encrypted data in base64 format
 * @returns The encrypted data in hex format
 */
export function encryptedDataToHex(encryptedData: string): string {
  try {
    const dataBuffer = Buffer.from(encryptedData, 'utf8');
    const hexData = dataBuffer.toString('hex');
    return hexData;
  } catch (error) {
    logger.error('Failed to convert encrypted data to hex', error);
    throw new Error('Hex conversion failed');
  }
}

/**
 * Convert hex data back to encrypted format (base64)
 * @param hexData The encrypted data in hex format
 * @returns The encrypted data in base64 format
 */
export function hexToEncryptedData(hexData: string): string {
  try {
    const dataBuffer = Buffer.from(hexData, 'hex');
    const encryptedData = dataBuffer.toString('utf8');
    return encryptedData;
  } catch (error) {
    logger.error('Failed to convert hex to encrypted data', error);
    throw new Error('Hex conversion failed');
  }
}

/**
 * Decrypt data using AES with a passphrase
 * @param encryptedData The encrypted data in base64 format
 * @param passphrase The passphrase used for encryption
 * @returns The decrypted data
 */
export function decryptData(encryptedData: string, passphrase: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, passphrase);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption result is empty - likely incorrect passphrase');
    }
    
    logger.debug('Data decrypted successfully');
    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt data', error);
    throw new Error('Decryption failed - check if passphrase is correct');
  }
}

/**
 * Create a secure data bundle for storing sensitive information on-chain
 * @param data The sensitive data to encrypt
 * @returns Object containing public and private UUIDs and encrypted data in hex format
 */
export function createSecureDataBundle(data: string): { 
  publicUuid: string; 
  privateUuid: string; 
  encryptedHexData: string;
} {
  // Generate UUIDs
  const publicUuid = generateEncryptionUuid();
  const privateUuid = generateEncryptionUuid();
  
  // Use both UUIDs combined as the encryption passphrase for additional security
  const passphrase = `${publicUuid}-${privateUuid}`;
  
  // Encrypt the data
  const encryptedData = encryptData(data, passphrase);
  
  // Convert to hex for blockchain storage
  const encryptedHexData = encryptedDataToHex(encryptedData);
  
  return {
    publicUuid,
    privateUuid,
    encryptedHexData
  };
}

/**
 * Decrypt a secure data bundle
 * @param encryptedHexData The encrypted data in hex format
 * @param publicUuid The public UUID
 * @param privateUuid The private UUID
 * @returns The decrypted data
 */
export function decryptSecureDataBundle(
  encryptedHexData: string,
  publicUuid: string,
  privateUuid: string
): string {
  // Convert hex back to encrypted base64 data
  const encryptedData = hexToEncryptedData(encryptedHexData);
  
  // Reconstruct the passphrase using both UUIDs
  const passphrase = `${publicUuid}-${privateUuid}`;
  
  // Decrypt the data
  return decryptData(encryptedData, passphrase);
}

/**
 * Decrypt secure data directly from blockchain transaction
 * @param txHash Transaction hash containing the encrypted data
 * @param publicUuid The public UUID
 * @param privateUuid The private UUID
 * @returns Promise containing the decrypted data
 */
export async function decryptSecureDataFromBlockchain(
  txHash: string,
  publicUuid: string,
  privateUuid: string
): Promise<string> {
  try {
    logger.debug(`Attempting to retrieve and decrypt data from transaction ${txHash}`);
    
    // Ensure transaction hash has proper 0x prefix
    const formattedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    
    // Validate that it's a proper transaction hash (should be 0x + 64 hex chars)
    if (!/^0x[a-fA-F0-9]{64}$/.test(formattedTxHash)) {
      throw new Error(`Invalid transaction hash format: ${txHash}`);
    }
    
    // Get transaction from blockchain
    try {
      const tx = await publicClient.getTransaction({ 
        hash: formattedTxHash as `0x${string}` 
      });
      
      if (!tx) {
        throw new Error(`Transaction not found: ${formattedTxHash}`);
      }
      
      if (!tx.input || tx.input === '0x') {
        throw new Error('Transaction does not contain data in the input field');
      }
      
      // The input field contains the hex-encoded encrypted data
      // We need to remove the '0x' prefix and convert it back to utf8
      const encryptedHex = tx.input.slice(2); // Remove '0x' prefix
      
      // Convert hex back to the original encrypted format
      const encryptedData = Buffer.from(encryptedHex, 'hex').toString('utf8');
      
      // Reconstruct the passphrase using both UUIDs
      const passphrase = `${publicUuid}-${privateUuid}`;
      
      // Decrypt the data
      const decrypted = decryptData(encryptedData, passphrase);
      logger.debug('Data decrypted successfully from blockchain');
      
      return decrypted;
    } catch (error) {
      // If transaction retrieval fails, try getting transaction receipt 
      // Some APIs might provide the data differently
      logger.debug('Direct transaction retrieval failed, trying alternative methods...');
      
      const receipt = await publicClient.getTransactionReceipt({
        hash: formattedTxHash as `0x${string}`
      });
      
      if (!receipt) {
        throw new Error(`Transaction receipt not found: ${formattedTxHash}`);
      }
      
      if (!receipt.logs || receipt.logs.length === 0) {
        throw new Error('Transaction receipt does not contain any logs with data');
      }
      
      // Try to extract data from logs (some implementations store data in logs)
      // Usually the first log contains the data we need
      const encryptedHex = receipt.logs[0].data.slice(2); // Remove '0x' prefix
      
      // Convert hex back to the original encrypted format
      const encryptedData = Buffer.from(encryptedHex, 'hex').toString('utf8');
      
      // Reconstruct the passphrase using both UUIDs
      const passphrase = `${publicUuid}-${privateUuid}`;
      
      // Decrypt the data
      const decrypted = decryptData(encryptedData, passphrase);
      logger.debug('Data decrypted successfully from blockchain logs');
      
      return decrypted;
    }
  } catch (error) {
    logger.error('Failed to decrypt data from blockchain', error);
    throw new Error(`Blockchain decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 