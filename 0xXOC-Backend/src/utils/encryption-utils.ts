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
    logger.debug(`Decrypting data with length: ${encryptedData.length} chars`);
    
    // Show a sample of the encrypted data input (first and last 20 chars)
    if (encryptedData.length > 40) {
      logger.debug(`Encrypted input sample: ${encryptedData.substring(0, 20)}...${encryptedData.substring(encryptedData.length - 20)}`);
    } else {
      logger.debug(`Encrypted input: ${encryptedData}`);
    }
    
    logger.debug(`Using passphrase with length: ${passphrase.length} chars`);
    logger.debug(`Passphrase hash: ${CryptoJS.SHA256(passphrase).toString().substring(0, 10)}... (first 10 chars of hash for verification)`);
    
    // Perform the actual decryption
    logger.debug(`Starting AES decryption...`);
    const bytes = CryptoJS.AES.decrypt(encryptedData, passphrase);
    logger.debug(`Decryption complete, result size: ${bytes.sigBytes} bytes`);
    
    // Show the word array as hex for debugging
    const hexBytes = bytes.toString(CryptoJS.enc.Hex);
    if (hexBytes.length > 40) {
      logger.debug(`Decrypted byte array (hex sample): ${hexBytes.substring(0, 20)}...${hexBytes.substring(hexBytes.length - 20)}`);
    } else if (hexBytes.length > 0) {
      logger.debug(`Decrypted byte array (hex): ${hexBytes}`);
    } else {
      logger.debug(`Decrypted byte array is empty`);
    }
    
    // Convert to UTF-8 string
    logger.debug(`Converting bytes to UTF-8 string...`);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      logger.error(`Decryption result is empty - likely incorrect passphrase`);
      throw new Error('Decryption result is empty - likely incorrect passphrase');
    }
    
    logger.debug(`Data decrypted successfully, result length: ${decrypted.length} chars`);
    
    // Show more of the decrypted data for better debugging
    if (decrypted.length > 100) {
      logger.debug(`First 50 chars of decrypted data: ${decrypted.substring(0, 50)}...`);
      logger.debug(`Last 50 chars of decrypted data: ...${decrypted.substring(decrypted.length - 50)}`);
    } else {
      logger.debug(`Full decrypted data: ${decrypted}`);
    }
    
    // Try to parse as JSON for structured output
    try {
      JSON.parse(decrypted);
      logger.debug(`Decrypted data is valid JSON`);
    } catch (e) {
      logger.debug(`Decrypted data is not valid JSON`);
    }
    
    return decrypted;
  } catch (error) {
    logger.error(`Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    logger.debug(`Using public UUID: ${publicUuid}`);
    logger.debug(`Using private UUID: ${privateUuid.substring(0, 4)}...${privateUuid.substring(privateUuid.length - 4)} (partially hidden for security)`);
    
    // Ensure transaction hash has proper 0x prefix
    const formattedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    logger.debug(`Formatted transaction hash: ${formattedTxHash}`);
    
    // Validate that it's a proper transaction hash (should be 0x + 64 hex chars)
    if (!/^0x[a-fA-F0-9]{64}$/.test(formattedTxHash)) {
      throw new Error(`Invalid transaction hash format: ${txHash}`);
    }
    
    // Get transaction from blockchain
    try {
      logger.debug(`Fetching transaction details from blockchain...`);
      const tx = await publicClient.getTransaction({ 
        hash: formattedTxHash as `0x${string}` 
      });
      
      if (!tx) {
        throw new Error(`Transaction not found: ${formattedTxHash}`);
      }
      
      logger.debug(`Transaction found with hash: ${tx.hash}`);
      logger.debug(`Transaction details: from=${tx.from}, to=${tx.to}, blockNumber=${tx.blockNumber || 'pending'}`);
      
      if (!tx.input || tx.input === '0x') {
        throw new Error('Transaction does not contain data in the input field');
      }
      
      logger.debug(`Transaction input data size: ${tx.input.length} bytes`);
      
      // Show a sample of the raw input data (first and last 20 chars)
      if (tx.input.length > 40) {
        logger.debug(`Raw transaction input data sample: ${tx.input.substring(0, 20)}...${tx.input.substring(tx.input.length - 20)}`);
      } else {
        logger.debug(`Raw transaction input data: ${tx.input}`);
      }
      
      // The input field contains the hex-encoded encrypted data
      // We need to remove the '0x' prefix and convert it back to utf8
      const encryptedHex = tx.input.slice(2); // Remove '0x' prefix
      logger.debug(`Extracted encrypted hex data, length: ${encryptedHex.length} chars`);
      
      // Show a sample of the hex data (first and last 20 chars)
      if (encryptedHex.length > 40) {
        logger.debug(`Hex data sample: ${encryptedHex.substring(0, 20)}...${encryptedHex.substring(encryptedHex.length - 20)}`);
      } else {
        logger.debug(`Hex data: ${encryptedHex}`);
      }
      
      // Convert hex back to the original encrypted format
      const encryptedData = Buffer.from(encryptedHex, 'hex').toString('utf8');
      logger.debug(`Converted hex to encrypted data format, length: ${encryptedData.length} chars`);
      
      // Show a sample of the encrypted data (first and last 20 chars)
      if (encryptedData.length > 40) {
        logger.debug(`Encrypted data sample: ${encryptedData.substring(0, 20)}...${encryptedData.substring(encryptedData.length - 20)}`);
      } else {
        logger.debug(`Encrypted data: ${encryptedData}`);
      }
      
      // Reconstruct the passphrase using both UUIDs
      const passphrase = `${publicUuid}-${privateUuid}`;
      logger.debug(`Constructed decryption passphrase using public and private UUIDs`);
      
      // Decrypt the data
      logger.debug(`Attempting to decrypt data with passphrase...`);
      const decrypted = decryptData(encryptedData, passphrase);
      logger.debug(`Data decrypted successfully from blockchain, decrypted length: ${decrypted.length} chars`);
      
      // Show the decrypted data (formatted JSON with line breaks for better readability)
      try {
        // Try to parse as JSON and then stringify with formatting
        const parsedJson = JSON.parse(decrypted);
        logger.debug(`Decrypted data (JSON): ${JSON.stringify(parsedJson, null, 2)}`);
      } catch {
        // If not JSON, just show a sample
        if (decrypted.length > 100) {
          logger.debug(`Decrypted data sample: ${decrypted.substring(0, 50)}...${decrypted.substring(decrypted.length - 50)}`);
        } else {
          logger.debug(`Decrypted data: ${decrypted}`);
        }
      }
      
      return decrypted;
    } catch (error) {
      // If transaction retrieval fails, try getting transaction receipt 
      // Some APIs might provide the data differently
      logger.debug('Direct transaction retrieval failed, trying alternative methods...');
      logger.debug(`Error was: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      logger.debug(`Fetching transaction receipt...`);
      const receipt = await publicClient.getTransactionReceipt({
        hash: formattedTxHash as `0x${string}`
      });
      
      if (!receipt) {
        throw new Error(`Transaction receipt not found: ${formattedTxHash}`);
      }
      
      logger.debug(`Transaction receipt found: blockNumber=${receipt.blockNumber}, status=${receipt.status}`);
      
      if (!receipt.logs || receipt.logs.length === 0) {
        throw new Error('Transaction receipt does not contain any logs with data');
      }
      
      logger.debug(`Transaction has ${receipt.logs.length} logs with data`);
      
      // Log some details about the first log entry
      const firstLog = receipt.logs[0];
      logger.debug(`First log details: address=${firstLog.address}, topics=${firstLog.topics.length}`);
      
      // Show a sample of the log data (first and last 20 chars)
      if (firstLog.data.length > 40) {
        logger.debug(`Log data sample: ${firstLog.data.substring(0, 20)}...${firstLog.data.substring(firstLog.data.length - 20)}`);
      } else {
        logger.debug(`Log data: ${firstLog.data}`);
      }
      
      // Try to extract data from logs (some implementations store data in logs)
      // Usually the first log contains the data we need
      const encryptedHex = receipt.logs[0].data.slice(2); // Remove '0x' prefix
      logger.debug(`Extracted encrypted hex data from logs, length: ${encryptedHex.length} chars`);
      
      // Show a sample of the hex data from logs (first and last 20 chars)
      if (encryptedHex.length > 40) {
        logger.debug(`Hex data from logs sample: ${encryptedHex.substring(0, 20)}...${encryptedHex.substring(encryptedHex.length - 20)}`);
      } else {
        logger.debug(`Hex data from logs: ${encryptedHex}`);
      }
      
      // Convert hex back to the original encrypted format
      const encryptedData = Buffer.from(encryptedHex, 'hex').toString('utf8');
      logger.debug(`Converted hex from logs to encrypted data format, length: ${encryptedData.length} chars`);
      
      // Show a sample of the encrypted data from logs (first and last 20 chars)
      if (encryptedData.length > 40) {
        logger.debug(`Encrypted data from logs sample: ${encryptedData.substring(0, 20)}...${encryptedData.substring(encryptedData.length - 20)}`);
      } else {
        logger.debug(`Encrypted data from logs: ${encryptedData}`);
      }
      
      // Reconstruct the passphrase using both UUIDs
      const passphrase = `${publicUuid}-${privateUuid}`;
      logger.debug(`Constructed decryption passphrase using public and private UUIDs for logs method`);
      
      // Decrypt the data
      logger.debug(`Attempting to decrypt data from logs with passphrase...`);
      const decrypted = decryptData(encryptedData, passphrase);
      logger.debug(`Data decrypted successfully from blockchain logs, decrypted length: ${decrypted.length} chars`);
      
      // Show the decrypted data from logs (formatted JSON with line breaks for better readability)
      try {
        // Try to parse as JSON and then stringify with formatting
        const parsedJson = JSON.parse(decrypted);
        logger.debug(`Decrypted data from logs (JSON): ${JSON.stringify(parsedJson, null, 2)}`);
      } catch {
        // If not JSON, just show a sample
        if (decrypted.length > 100) {
          logger.debug(`Decrypted data from logs sample: ${decrypted.substring(0, 50)}...${decrypted.substring(decrypted.length - 50)}`);
        } else {
          logger.debug(`Decrypted data from logs: ${decrypted}`);
        }
      }
      
      return decrypted;
    }
  } catch (error) {
    logger.error('Failed to decrypt data from blockchain', error);
    throw new Error(`Blockchain decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 