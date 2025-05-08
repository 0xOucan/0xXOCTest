import { apiUrl } from '../config';

/**
 * Send the connected wallet address to the backend
 * @param walletAddress The Ethereum address of the connected wallet
 * @returns Success status and any error message
 */
export const sendWalletAddress = async (walletAddress: string): Promise<{ success: boolean, message: string }> => {
  try {
    if (!walletAddress) {
      return { success: false, message: 'No wallet address provided' };
    }

    // Make sure wallet address is properly formatted
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      return { 
        success: false, 
        message: 'Invalid wallet address format. Must be a 0x-prefixed 20-byte hex string (42 characters total)' 
      };
    }

    // Send the wallet address to the backend
    const response = await fetch(`${apiUrl}/api/wallet/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ walletAddress })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error sending wallet address to backend:', error);
      return { success: false, message: `Failed to send wallet address: ${error}` };
    }

    const data = await response.json();
    return { success: true, message: data.message || 'Wallet address sent successfully' };
  } catch (error) {
    console.error('Error connecting wallet to backend:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error connecting wallet to backend' 
    };
  }
};

/**
 * Types of agent responses
 */
export enum AgentResponseType {
  INFO = 'info',         // General informational response
  ERROR = 'error',       // Error message
  TRANSACTION = 'tx',    // Requires a transaction signature
  APPROVAL = 'approval', // Requires token approval
  SUCCESS = 'success',   // Operation completed successfully
}

/**
 * Parsed agent response
 */
export interface ParsedAgentResponse {
  type: AgentResponseType;
  message: string;
  data?: any;
  rawResponse: string;
}

/**
 * Parse the agent response to determine what action is needed
 */
export const parseAgentResponse = (response: string): ParsedAgentResponse => {
  // Default to info type
  let type = AgentResponseType.INFO;
  let data = undefined;
  
  // Check for transaction requests
  if (
    response.includes('needs to be approved') || 
    response.includes('Please approve this transaction') ||
    response.includes('Please sign the transaction') ||
    response.includes('waiting for your approval')
  ) {
    type = AgentResponseType.TRANSACTION;
    
    // Try to extract transaction details if present
    const txMatch = response.match(/Transaction details:[\s\S]*?({[\s\S]*?})/);
    if (txMatch && txMatch[1]) {
      try {
        data = JSON.parse(txMatch[1]);
      } catch (e) {
        console.warn('Could not parse transaction details', e);
      }
    }
  }
  
  // Check for token approvals
  else if (
    response.includes('approve token') || 
    response.includes('token approval') ||
    response.includes('needs your approval')
  ) {
    type = AgentResponseType.APPROVAL;
  }
  
  // Check for errors
  else if (
    response.includes('Error:') || 
    response.includes('Failed') ||
    response.includes('Cannot proceed') ||
    response.includes('something went wrong')
  ) {
    type = AgentResponseType.ERROR;
  }
  
  // Check for success
  else if (
    response.includes('Success!') || 
    response.includes('Transaction completed') ||
    response.includes('successfully completed')
  ) {
    type = AgentResponseType.SUCCESS;
  }
  
  return {
    type,
    message: response,
    data,
    rawResponse: response
  };
};

/**
 * Send a chat message to the agent API
 * @param userInput The message to send to the agent
 * @returns The agent's response
 */
export const sendChatMessage = async (userInput: string): Promise<ParsedAgentResponse> => {
  try {
    const response = await fetch(`${apiUrl}/api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userInput })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${await response.text()}`);
    }

    const data = await response.json();
    // Parse the response to determine what action is needed
    return parseAgentResponse(data.response || '');
  } catch (error) {
    console.error('Error sending message to agent:', error);
    return {
      type: AgentResponseType.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error sending message to agent',
      rawResponse: ''
    };
  }
}; 