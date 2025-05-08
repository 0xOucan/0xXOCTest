import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, LoadingIcon, SkullIcon, FireIcon } from './Icons';
import { apiUrl } from '../config';
import { sendChatMessage, AgentResponseType, ParsedAgentResponse as ImportedAgentResponse } from '../services/agentService';
import { useWallet } from '../providers/WalletContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getPendingTransactions, PendingTransaction } from '../services/transactionService';

// Define an interface that extends ImportedAgentResponse with the additional fields we need
interface EnhancedAgentResponse extends ImportedAgentResponse {
  text?: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: number;
  type?: AgentResponseType;
  requiresAction?: boolean;
  data?: any;
}

// Update the interface to match the updated API
export interface ParsedAgentResponse {
  type: AgentResponseType;
  message?: string;
  text?: string;
  data?: any;
  rawResponse?: string;
}

// Component to dynamically update transaction links when they are confirmed
const TransactionLink = ({ txId }: { txId: string }) => {
  const [transaction, setTransaction] = useState<PendingTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const transactions = await getPendingTransactions();
        const tx = transactions.find(t => t.id === txId) || 
                   transactions.find(t => t.id.includes(txId.substring(3, 10)));
        
        if (tx) {
          setTransaction(tx);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching transaction:', error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchTransaction();
    
    // Poll for updates
    const intervalId = setInterval(fetchTransaction, 3000);
    
    return () => clearInterval(intervalId);
  }, [txId]);

  if (isLoading) {
    return <span className="text-mictlai-turquoise font-pixel">LOADING TRANSACTION...</span>;
  }

  if (!transaction) {
    return <span className="text-mictlai-turquoise font-pixel">CHECK TRANSACTION PANEL</span>;
  }

  if (transaction.status === 'confirmed' && transaction.hash) {
    // Determine which explorer to use based on chain
    let explorerUrl = `https://celoscan.io/tx/${transaction.hash}`;
    let explorerName = 'Celoscan';
    
    if (transaction.metadata?.chain) {
      switch(transaction.metadata.chain) {
        case 'base':
          explorerUrl = `https://basescan.org/tx/${transaction.hash}`;
          explorerName = 'Basescan';
          break;
        case 'arbitrum':
          explorerUrl = `https://arbiscan.io/tx/${transaction.hash}`;
          explorerName = 'Arbiscan';
          break;
        case 'mantle':
          explorerUrl = `https://explorer.mantle.xyz/tx/${transaction.hash}`;
          explorerName = 'Mantle Explorer';
          break;
        case 'zksync':
          explorerUrl = `https://explorer.zksync.io/tx/${transaction.hash}`;
          explorerName = 'zkSync Explorer';
          break;
      }
    }
    
    return (
      <a 
        href={explorerUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-mictlai-turquoise hover:text-mictlai-gold border-b border-mictlai-turquoise hover:border-mictlai-gold font-pixel"
      >
        VIEW ON {explorerName}: {transaction.hash.substring(0, 6)}...{transaction.hash.substring(transaction.hash.length - 4)}
      </a>
    );
  }

  if (transaction.status === 'pending') {
    return <span className="text-mictlai-gold font-pixel pixel-pulse">WAITING FOR WALLET SIGNATURE...</span>;
  }
  
  if (transaction.status === 'submitted') {
    return <span className="text-mictlai-turquoise font-pixel pixel-pulse">TRANSACTION SUBMITTED, WAITING FOR CONFIRMATION...</span>;
  }

  if (transaction.status === 'rejected') {
    return <span className="text-mictlai-blood font-pixel">TRANSACTION REJECTED BY USER</span>;
  }

  if (transaction.status === 'failed') {
    return <span className="text-mictlai-blood font-pixel">TRANSACTION FAILED</span>;
  }

  return <span className="text-mictlai-turquoise font-pixel">CHECK TRANSACTION PANEL FOR STATUS</span>;
};

// Component to render message content with clickable links and transaction UI
const MessageDisplay = ({ message }: { message: Message }) => {
  const content = message.content;
  
  // Check if the message contains a transaction ID
  const extractTransactionId = (content: string): string | null => {
    // Look for the temporary transaction ID format in the response
    const txIdMatch = content.match(/Transaction ID: (tx-[\w-]+)/i);
    if (txIdMatch && txIdMatch[1]) {
      return txIdMatch[1];
    }
    
    // Hidden transaction ID in message data
    if (message.data && message.data.transactionId) {
      return message.data.transactionId;
    }
    
    return null;
  };
  
  const transactionId = extractTransactionId(content);
  
  // Process content to make links clickable and handle transaction links
  const processContent = () => {
    let processed = content;
    
    // If we have a transaction ID, replace any "View Transaction" text with a dynamic component
    if (transactionId) {
      // We'll use a special placeholder that will be replaced with the TransactionLink component in the JSX
      processed = processed.replace(/🔍 Transaction: View Transaction|🔍 Transaction: View in transaction panel \(bottom right\)/g, 
        '🔍 Transaction: [[TRANSACTION_LINK_PLACEHOLDER]]');
    } else {
      // Replace "Transaction: View Transaction" with a better message
      // that provides guidance about the transaction panel
      const txViewRegex = /🔍 Transaction: View Transaction/g;
      processed = processed.replace(txViewRegex, '🔍 Transaction: View in transaction panel (bottom right)');
    }
    
    // Replace any remaining Celoscan links with a cleaner format
    const celoscanRegex = /https:\/\/celoscan\.io\/tx\/([a-zA-Z0-9]+)/g;
    processed = processed.replace(celoscanRegex, (match, txHash) => {
      return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="text-mictlai-turquoise hover:text-mictlai-gold border-b border-mictlai-turquoise hover:border-mictlai-gold font-pixel">${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}</a>`;
    });
    
    // Process Markdown-style links [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    processed = processed.replace(markdownLinkRegex, (match, text, url) => {
        // Remove any trailing punctuation from the URL
        const cleanUrl = url.replace(/[,.)]$/, '');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-mictlai-turquoise hover:text-mictlai-gold border-b border-mictlai-turquoise hover:border-mictlai-gold font-pixel">${text}</a>`;
      });
    
    // Process plain URLs that aren't already in HTML tags
    const urlRegex = /(?<!href="|">)(https?:\/\/[^\s),.]+)/g;
    processed = processed.replace(urlRegex, '<a href="$&" target="_blank" rel="noopener noreferrer" class="text-mictlai-turquoise hover:text-mictlai-gold border-b border-mictlai-turquoise hover:border-mictlai-gold font-pixel">$&</a>');
    
    return processed;
  };
  
  const processedContent = processContent();
  
  // If we have a transaction ID, render with the dynamic TransactionLink component
  if (transactionId) {
    const parts = processedContent.split('[[TRANSACTION_LINK_PLACEHOLDER]]');
    
    const contentWithTxLink = (
      <>
        {parts.length > 0 && <span dangerouslySetInnerHTML={{ __html: parts[0] }} />}
        {parts.length > 1 && (
          <>
            <TransactionLink txId={transactionId} />
            <span dangerouslySetInnerHTML={{ __html: parts[1] }} />
          </>
        )}
      </>
    );
    
    // Add special UI for transaction messages
    if (message.type === AgentResponseType.TRANSACTION || message.type === AgentResponseType.APPROVAL) {
      return (
        <div>
          <div className="whitespace-pre-wrap font-pixel">{contentWithTxLink}</div>
          <div className="mt-2 p-2 border-l-3 border-mictlai-gold bg-black border border-mictlai-gold/30 shadow-pixel">
            <p className="text-sm font-pixel text-mictlai-gold">
              THIS OPERATION REQUIRES A WALLET TRANSACTION. CHECK YOUR WALLET FOR A SIGNATURE REQUEST.
            </p>
            <p className="text-xs text-mictlai-bone/70 font-pixel mt-1">
              MONITOR TRANSACTION STATUS IN THE PANEL AT BOTTOM RIGHT.
            </p>
          </div>
        </div>
      );
    }
    
    // Enhanced rendering for cUSD escrow messages 
    if (content.includes('selling order') && content.includes('cUSD') && content.includes('iAmigo P2P')) {
      return (
        <div>
          <div className="whitespace-pre-wrap font-pixel" dangerouslySetInnerHTML={{ __html: processedContent }} />
          <div className="mt-2 p-2 border-l-3 border-mictlai-turquoise bg-black border border-mictlai-turquoise/30 shadow-pixel">
            <p className="text-sm font-pixel text-mictlai-turquoise">
              YOUR TRANSACTION IS BEING PROCESSED. CHECK TRANSACTION PANEL FOR STATUS AND LINK.
            </p>
          </div>
        </div>
      );
    }
    
    // Enhanced rendering for buying order messages
    if (content.includes('buying order') && content.includes('QR') && (content.includes('OXXO') || content.includes('MXN'))) {
      return (
        <div>
          <div className="whitespace-pre-wrap font-pixel" dangerouslySetInnerHTML={{ __html: processedContent }} />
          <div className="mt-2 p-2 border-l-3 border-mictlai-turquoise bg-black border border-mictlai-turquoise/30 shadow-pixel">
            <p className="text-sm font-pixel text-mictlai-turquoise">
              BUYING ORDER PROCESSED. FUNDS TRANSFERRED FROM ESCROW TO BUYER'S WALLET.
            </p>
          </div>
        </div>
      );
    }
    
    return <div className="whitespace-pre-wrap font-pixel">{contentWithTxLink}</div>;
  }
  
  // Add special UI for transaction messages
  if (message.type === AgentResponseType.TRANSACTION || message.type === AgentResponseType.APPROVAL) {
    return (
      <div>
        <div className="whitespace-pre-wrap font-pixel" dangerouslySetInnerHTML={{ __html: processedContent }} />
        <div className="mt-2 p-2 border-l-3 border-mictlai-gold bg-black border border-mictlai-gold/30 shadow-pixel">
          <p className="text-sm font-pixel text-mictlai-gold">
            THIS OPERATION REQUIRES A WALLET TRANSACTION. CHECK YOUR WALLET FOR A SIGNATURE REQUEST.
          </p>
        </div>
      </div>
    );
  }

  return <div className="whitespace-pre-wrap font-pixel" dangerouslySetInnerHTML={{ __html: processedContent }} />;
};

// Component to render a chat message
const Message = ({ message }: { message: Message }) => {
  const isAgent = message.sender === 'agent';

  return (
    <div className={`mb-4 ${isAgent ? '' : 'flex justify-end'}`}>
      <div className={`
        inline-block max-w-[85%] lg:max-w-[75%] pb-2 
        ${isAgent 
          ? 'bg-black border-3 border-mictlai-gold/50 shadow-pixel text-mictlai-bone px-4 pt-3' 
          : 'bg-mictlai-gold/20 border-3 border-mictlai-gold shadow-pixel text-mictlai-gold px-4 pt-3'}
      `}>
        {/* User icon and message */}
        <div className="flex items-start">
          {isAgent && (
            <div className="mr-2 mt-1">
              <SkullIcon className="w-6 h-6 text-mictlai-gold" />
            </div>
          )}
          <div className="flex-1">
            <div className="font-pixel text-sm mb-1">
              {isAgent ? (
                <span className="text-mictlai-gold">MICTLAI</span>
              ) : (
                <span className="text-mictlai-turquoise">YOU</span>
              )}
              <span className="text-mictlai-bone/50 text-xs ml-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className={`${isAgent ? 'text-mictlai-bone' : 'text-mictlai-gold'} text-sm`}>
              <MessageDisplay message={message} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ChatInterface component
export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { connectedAddress, isConnected } = useWallet();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastAgentMessageIdRef = useRef<string | null>(null);
  
  // Scroll to bottom of chat when new messages are added
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Add welcome message on mount
  useEffect(() => {
    // Initialize with a system welcome message
    const welcomeMessage: Message = {
      id: `system-welcome-${Date.now()}`,
      content: "Welcome to MictlAI! I can help you bridge tokens between networks. How can I assist you today?",
      sender: 'agent',
      timestamp: Date.now(),
    };
    setMessages([welcomeMessage]);
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Send a message to the agent and handle the response
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't do anything if input is empty or we're already waiting for a response
    if (!inputValue.trim() || isWaiting) return;
    
    // Check if wallet is connected
    if (!isConnected) {
      const errorMessage: Message = {
        id: `system-error-${Date.now()}`,
        content: "⚠️ Please connect your wallet first to use MictlAI's features.",
        sender: 'agent',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsWaiting(true);
    
    // Immediate typing indicator
    const typingIndicatorId = `agent-typing-${Date.now()}`;
    const typingIndicator: Message = {
      id: typingIndicatorId,
      content: "Thinking...",
      sender: 'agent',
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, typingIndicator]);
    
    try {
      // Send message to backend
      const response = await sendChatMessage(inputValue);
      
      if (response) {
        // Remove typing indicator
        setMessages(prev => prev.filter(m => m.id !== typingIndicatorId));
        
        // Add agent response to chat
        const agentMessage: Message = {
          id: `agent-${Date.now()}`,
          content: response.message || "I'm sorry, I couldn't process that request.",
          sender: 'agent',
          timestamp: Date.now(),
          type: response.type,
          data: response.data,
        };
        
        setMessages(prev => [...prev, agentMessage]);
        lastAgentMessageIdRef.current = agentMessage.id;
      } else {
        // Remove typing indicator and show error
        setMessages(prev => prev.filter(m => m.id !== typingIndicatorId));
        
        const errorMessage: Message = {
          id: `agent-error-${Date.now()}`,
          content: "I'm sorry, I'm having trouble connecting to my backend services. Please try again later.",
          sender: 'agent',
          timestamp: Date.now(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove typing indicator and show error
      setMessages(prev => prev.filter(m => m.id !== typingIndicatorId));
      
      const errorMessage: Message = {
        id: `agent-error-${Date.now()}`,
        content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        sender: 'agent',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsWaiting(false);
    }
  };

  // Implement a status check for transaction processing
  const sendStatusCheck = async () => {
    if (isWaiting) return;
    
    setIsWaiting(true);
    
    // Add a status checking message
    const statusMessage: Message = {
      id: `user-${Date.now()}`,
      content: "Check my transaction status",
      sender: 'user',
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, statusMessage]);
    
    // Immediate typing indicator
    const typingIndicatorId = `agent-typing-${Date.now()}`;
    const typingIndicator: Message = {
      id: typingIndicatorId,
      content: "Checking transaction status...",
      sender: 'agent',
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, typingIndicator]);
    
    try {
      // Send status check to backend
      const response = await sendChatMessage("Check my transaction status");
      
      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== typingIndicatorId));
      
      // Add agent response
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        content: response?.message || "I couldn't retrieve your transaction status at this time.",
        sender: 'agent',
        timestamp: Date.now(),
        type: response?.type,
        data: response?.data,
      };
      
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Error checking status:', error);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== typingIndicatorId));
      
      // Add error message
      const errorMessage: Message = {
        id: `agent-error-${Date.now()}`,
        content: "Sorry, I couldn't check your transaction status. Please try again.",
        sender: 'agent',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsWaiting(false);
    }
  };

  return (
    <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg h-[600px] max-h-[calc(100vh-250px)] flex flex-col pixel-panel">
      <div className="p-4 bg-black border-b-3 border-mictlai-gold/70 flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center font-pixel text-mictlai-gold">
          <FireIcon className="w-5 h-5 mr-2 text-mictlai-gold" />
          MICTLAI BRIDGE CHAT
        </h2>
        
        <button 
          onClick={sendStatusCheck}
          disabled={isWaiting || !isConnected}
          className="px-3 py-1.5 border-2 border-mictlai-turquoise/70 text-mictlai-turquoise hover:bg-mictlai-turquoise/20 font-pixel text-xs shadow-pixel disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CHECK TX STATUS
        </button>
      </div>
      
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        ref={chatContainerRef}
      >
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t-3 border-mictlai-gold/50 bg-black">
        <form onSubmit={sendMessage} className="flex">
          <input 
            type="text"
            className="flex-1 bg-mictlai-obsidian text-mictlai-bone border-3 border-mictlai-gold/70 px-4 py-2 shadow-pixel-inner font-pixel"
            placeholder="ASK MICTLAI ABOUT BRIDGING TOKENS..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isWaiting || !isConnected}
          />
          
          <button 
            type="submit"
            className="pixel-btn ml-2 w-12 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isWaiting || !inputValue.trim() || !isConnected}
          >
            {isWaiting ? (
              <LoadingIcon className="w-5 h-5" />
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        </form>
        
        {!isConnected && (
          <div className="mt-2 p-2 border-3 border-mictlai-blood bg-black text-center text-mictlai-blood font-pixel text-sm">
            CONNECT YOUR WALLET TO CHAT WITH MICTLAI
          </div>
        )}
      </div>
    </div>
  );
} 