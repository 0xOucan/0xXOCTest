import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import "reflect-metadata";
import {
  FillSellingOrderSchema,
  CheckFillStatusSchema,
  CancelFillSchema
} from "./schemas";
import {
  BASE_CHAIN_ID,
  FILL_STATUS,
  QR_CODE_VALIDATION,
  ESCROW_WALLET_ADDRESS
} from "./constants";
import {
  TokenSellingOrderFillerError,
  OrderNotFoundError,
  OrderNotActiveError,
  UnauthorizedError,
  FillNotFoundError,
  InvalidQRCodeError,
  QRCodeExpiredError,
  QRCodeAlreadyUsedError,
  AmountMismatchError,
  WrongNetworkError
} from "./errors";
import {
  initializeFill,
  getFillById,
  validateQrCodeForOrder,
  getMostRecentFillForOrder,
  formatFillForDisplay,
  updateFillStatus,
  adaptOxxoSpinQRData
} from "./utils";
import {
  getSellingOrderById
} from "../token-selling-order/utils";
import { createPendingTransaction } from "../../utils/transaction-utils";

/**
 * This action provider enables filling selling orders by uploading a QR code
 */
export class TokenSellingOrderFillerActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("token-selling-order-filler", []);
  }

  /**
   * Check if wallet is on the correct network (Base)
   */
  private async checkNetwork(walletProvider: EvmWalletProvider): Promise<void> {
    const network = await walletProvider.getNetwork();
    
    if (network.chainId !== BASE_CHAIN_ID) {
      throw new WrongNetworkError(network.chainId || 'unknown', 'Base');
    }
  }

  /**
   * Fill a selling order by providing an OXXO Spin QR code
   */
  @CreateAction({
    name: "fill_selling_order",
    description: "Fill a token selling order using an OXXO Spin QR code",
    schema: FillSellingOrderSchema,
  })
  async fillSellingOrder(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof FillSellingOrderSchema>
  ): Promise<string> {
    try {
      // Check network first
      await this.checkNetwork(walletProvider);
      
      const { orderId, qrCodeData } = args;
      const fillerAddress = await walletProvider.getAddress();
      
      // Step 1: Get the order details
      const order = getSellingOrderById(orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }
      
      // Step 2: Validate order status
      if (order.status !== 'active') {
        throw new OrderNotActiveError(orderId, order.status);
      }
      
      // Step 3: Check if the user is trying to fill their own order
      if (order.seller === fillerAddress) {
        throw new UnauthorizedError('You cannot fill your own selling order');
      }
      
      console.log(`Validating QR code data for order ${orderId} with MXN amount ${order.mxnAmount}`);
      
      // Step 4: Validate QR code data
      let qrData;
      try {
        // Parse the QR code data if needed
        const parsedQrData = typeof qrCodeData === 'string' ? JSON.parse(qrCodeData) : qrCodeData;
        
        // Validate the QR code against the order
        const qrDataString = JSON.stringify(parsedQrData);
        const validationResult = validateQrCodeForOrder(qrDataString, order.mxnAmount || '0');
        
        if (!validationResult.isValid) {
          if (validationResult.error instanceof QRCodeExpiredError) {
            throw validationResult.error;
          } else if (validationResult.error instanceof QRCodeAlreadyUsedError) {
            throw validationResult.error;
          } else if (validationResult.error instanceof AmountMismatchError) {
            throw validationResult.error;
          } else {
            throw new InvalidQRCodeError(
              validationResult.error instanceof Error ? validationResult.error.message : 'Invalid QR code'
            );
          }
        }
        
        qrData = validationResult.qrData;
      } catch (error) {
        if (error instanceof TokenSellingOrderFillerError) {
          throw error;
        }
        
        throw new InvalidQRCodeError(
          error instanceof Error ? error.message : 'Unknown QR validation error'
        );
      }
      
      if (!qrData) {
        throw new InvalidQRCodeError('Failed to extract valid QR data');
      }
      
      // Step 5: Initiate the fill
      const fill = initializeFill(
        orderId,
        fillerAddress,
        qrData
      );
      
      // Step 6: Create a pending transaction to track this fill
      const txId = createPendingTransaction(
        ESCROW_WALLET_ADDRESS, // Use escrow wallet address as destination
        "0",  // No value
        "0x", // No data
        fillerAddress,
        'base', // Chain - specify Base network
        {
          type: 'fill_selling_order',
          orderId: orderId,
          fillId: fill.fillId,
          walletAddress: fillerAddress
        }
      );
      
      console.log(`Created pending transaction ${txId} for fill ${fill.fillId} of order ${orderId}`);
      
      // Update fill with transaction ID reference
      updateFillStatus(fill.fillId, 'processing', {
        txHash: txId // Use txHash property instead of txId
      });
      
      // Return success message with fill ID
      return `✅ Order fill initiated successfully!\n\nFill ID: ${fill.fillId}\nOrder: ${orderId}\nAmount: ${order.amount} ${order.token}\nMXN Amount: ${order.mxnAmount} MXN\n\nThe order will be marked as filled once your payment is verified. The tokens will then be automatically transferred to your wallet.`;
    } catch (error) {
      console.error('Error filling selling order:', error);
      
      if (error instanceof TokenSellingOrderFillerError) {
        return `❌ ${error.message}`;
      }
      
      return `❌ Failed to fill order: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Check the status of a fill
   */
  @CreateAction({
    name: "check_fill_status",
    description: "Check the status of a selling order fill",
    schema: CheckFillStatusSchema,
  })
  async checkFillStatus(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CheckFillStatusSchema>
  ): Promise<string> {
    try {
      // Check network first
      await this.checkNetwork(walletProvider);
      
      const { fillId, orderId } = args;
      const userAddress = await walletProvider.getAddress();
      
      // Ensure fillId is defined
      if (!fillId) {
        throw new Error('Fill ID is required');
      }
      
      // Get the fill - fillId is now guaranteed to be a string
      const fill = getFillById(fillId);
      
      if (!fill) {
        throw new FillNotFoundError(fillId, orderId || 'unknown');
      }
      
      // Verify the user is authorized to view this fill
      if (fill.filler !== userAddress && getSellingOrderById(fill.orderId)?.seller !== userAddress) {
        throw new UnauthorizedError('You are not authorized to check this fill status');
      }
      
      // Format the fill details for display
      return formatFillForDisplay(fill);
    } catch (error) {
      console.error('Error checking fill status:', error);
      
      if (error instanceof TokenSellingOrderFillerError) {
        return `❌ ${error.message}`;
      }
      
      return `❌ Failed to check fill status: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Cancel a fill
   */
  @CreateAction({
    name: "cancel_fill",
    description: "Cancel a pending selling order fill",
    schema: CancelFillSchema,
  })
  async cancelFill(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CancelFillSchema>
  ): Promise<string> {
    try {
      // Check network first
      await this.checkNetwork(walletProvider);
      
      const { fillId, orderId } = args;
      const userAddress = await walletProvider.getAddress();
      
      // Get the fill
      const fill = getFillById(fillId);
      
      if (!fill) {
        throw new FillNotFoundError(fillId, typeof orderId === 'string' ? orderId : 'unknown');
      }
      
      // Check if user is the filler
      if (fill.filler !== userAddress) {
        throw new UnauthorizedError('You are not authorized to cancel this fill');
      }
      
      // Check if fill can be cancelled (only pending or processing)
      if (fill.status !== FILL_STATUS.PENDING && fill.status !== FILL_STATUS.PROCESSING) {
        throw new UnauthorizedError(`Cannot cancel fill with status ${fill.status}`);
      }
      
      // Update fill status
      const updatedFill = updateFillStatus(fillId, 'cancelled', {
        error: 'Cancelled by user'
      });
      
      if (!updatedFill) {
        throw new Error(`Failed to update fill ${fillId}`);
      }
      
      return `✅ Fill cancelled successfully.\n\nFill ID: ${updatedFill.fillId}\nOrder ID: ${updatedFill.orderId}\nStatus: ${updatedFill.status.toUpperCase()}`;
    } catch (error) {
      console.error('Error cancelling fill:', error);
      
      if (error instanceof TokenSellingOrderFillerError) {
        return `❌ ${error.message}`;
      }
      
      return `❌ Failed to cancel fill: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Check if the action provider supports a given network
   */
  supportsNetwork = (network: Network): boolean => {
    return network.chainId === BASE_CHAIN_ID;
  };
}

export const tokenSellingOrderFillerActionProvider = () => new TokenSellingOrderFillerActionProvider(); 