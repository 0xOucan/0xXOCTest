import React, { useState, useRef } from 'react';
import { useWallet } from '../../providers/WalletContext';
import { createBuyingOrder, uploadBuyingOrderImage } from '../../services/marketplaceService';
import { useNotification, NotificationType } from '../../utils/notification';
import { LoadingIcon } from '../Icons';

// Example OXXO Spin QR codes with different amounts
const exampleQrCodes = [
  {
    amount: 100, // 100 MXN
    data: `{"TipoOperacion":"0004","VersionQR":"01.01","FechaExpiracionQR":"25/12/31 23:59:59","FechaCreacionQR":"25/05/15 14:30:25","EmisorQR":"101","Monto":100,"Concepto":"","Operacion":{"Mensaje":"","CR":"1011499855001003","Comisiones":"12","CadenaEncriptada":"","Aux1":"","Aux2":""}}`
  },
  {
    amount: 200, // 200 MXN
    data: `{"TipoOperacion":"0004","VersionQR":"01.01","FechaExpiracionQR":"26/01/15 23:59:59","FechaCreacionQR":"25/05/15 15:20:33","EmisorQR":"101","Monto":200,"Concepto":"","Operacion":{"Mensaje":"","CR":"1012599855002005","Comisiones":"12","CadenaEncriptada":"","Aux1":"","Aux2":""}}`
  },
  {
    amount: 400, // 400 MXN
    data: `{"TipoOperacion":"0004","VersionQR":"01.01","FechaExpiracionQR":"25/09/30 23:59:59","FechaCreacionQR":"25/05/15 16:10:45","EmisorQR":"101","Monto":400,"Concepto":"","Operacion":{"Mensaje":"","CR":"1018899255004007","Comisiones":"12","CadenaEncriptada":"","Aux1":"","Aux2":""}}`
  },
  {
    amount: 1000, // 1000 MXN
    data: `{"TipoOperacion":"0004","VersionQR":"01.01","FechaExpiracionQR":"25/10/31 23:59:59","FechaCreacionQR":"25/05/15 17:05:12","EmisorQR":"101","Monto":1000,"Concepto":"","Operacion":{"Mensaje":"","CR":"1019999855010009","Comisiones":"12","CadenaEncriptada":"","Aux1":"","Aux2":""}}`
  }
];

export default function CreateBuyingOrder() {
  const { isConnected } = useWallet();
  const { addNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State variables
  const [qrCodeData, setQrCodeData] = useState('');
  const [token, setToken] = useState<'XOC' | 'MXNe' | 'USDC'>('XOC');
  const [tokenAmount, setTokenAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Parse MXN amount from QR code data
  const getMxnAmountFromQrCode = (qrData: string): number => {
    try {
      const parsedData = JSON.parse(qrData);
      return parseFloat(parsedData.Monto) || 0;
    } catch (e) {
      return 0;
    }
  };
  
  // Calculate token amount based on MXN amount and selected token
  // Exchange rate: 1 USDC = 20 MXN, 1 XOC = 1 MXN, 1 MXNe = 1 MXN
  const calculateTokenAmount = (mxnAmount: number): string => {
    if (isNaN(mxnAmount) || mxnAmount <= 0) return '';
    
    switch (token) {
      case 'XOC':
      case 'MXNe':
        // 1 MXN = 1 XOC/MXNe
        return mxnAmount.toFixed(2);
      case 'USDC':
        // 20 MXN = 1 USDC
        return (mxnAmount / 20).toFixed(2);
      default:
        return '';
    }
  };
  
  // Update token amount when QR code data or token changes
  React.useEffect(() => {
    const mxnAmount = getMxnAmountFromQrCode(qrCodeData);
    if (mxnAmount > 0) {
      const calculatedAmount = calculateTokenAmount(mxnAmount);
      setTokenAmount(calculatedAmount);
    }
  }, [qrCodeData, token]);
  
  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        addNotification('Please select a valid image file (JPG, JPEG, or PNG)', NotificationType.WARNING);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        addNotification('Image file is too large. Maximum size is 5MB', NotificationType.WARNING);
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Clear selected image
  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      addNotification('Please connect your wallet first', NotificationType.WARNING);
      return;
    }
    
    if (!qrCodeData) {
      addNotification('Please enter the QR code data', NotificationType.WARNING);
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await createBuyingOrder({
        qrCodeData,
        token,
        tokenAmount,
        memo
      });
      
      // Extract order ID from the response
      // The response might be in format "Order created: buyorder-1234567890-1234"
      const orderIdMatch = response.match(/buyorder-[0-9]+-[0-9]+/);
      if (orderIdMatch && selectedImage) {
        const orderId = orderIdMatch[0];
        try {
          // Upload the image if one is selected
          await uploadBuyingOrderImage(orderId, selectedImage);
          addNotification(
            'Image uploaded successfully',
            NotificationType.SUCCESS,
            'Your image has been securely stored and will be available for download after QR decryption.'
          );
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          addNotification(
            'Failed to upload image',
            NotificationType.WARNING,
            'Your order was created but the image upload failed.'
          );
        }
      }
      
      addNotification(
        'Buy order created successfully',
        NotificationType.SUCCESS,
        'Your OXXO Spin QR code has been registered and your buying order is now active.'
      );
      
      // Reset form
      setQrCodeData('');
      setTokenAmount('');
      setMemo('');
      clearSelectedImage();
    } catch (error) {
      console.error('Error creating buying order:', error);
      addNotification(
        'Failed to create buying order',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // Copy example QR code to clipboard
  const handleCopyExample = (qrData: string) => {
    setQrCodeData(qrData);
    navigator.clipboard.writeText(qrData)
      .then(() => {
        addNotification('QR code data copied to clipboard', NotificationType.SUCCESS);
      })
      .catch(() => {
        addNotification('Failed to copy QR code data', NotificationType.ERROR);
      });
  };
  
  return (
    <div className="bg-mictlai-obsidian border-3 border-mictlai-gold shadow-pixel-lg overflow-hidden">
      <div className="p-4 bg-black border-b-3 border-mictlai-gold/70">
        <h2 className="text-lg font-bold font-pixel text-mictlai-gold">
          BUY TOKENS WITH OXXO SPIN
        </h2>
        <p className="text-mictlai-bone/70 mt-2 text-sm">
          Create a buying order using an OXXO Spin QR code to exchange Mexican Pesos for tokens
        </p>
      </div>
      
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* QR Code Data */}
          <div className="space-y-2">
            <label className="block text-mictlai-bone font-pixel text-sm">
              OXXO SPIN QR CODE DATA
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                className="ml-2 text-mictlai-turquoise hover:text-mictlai-gold text-xs underline"
              >
                {showExamples ? 'Hide Examples' : 'Show Examples'}
              </button>
            </label>
            <textarea
              value={qrCodeData}
              onChange={(e) => setQrCodeData(e.target.value)}
              className="w-full bg-black border-2 border-mictlai-bone/30 text-mictlai-bone p-2 font-mono text-sm focus:outline-none focus:border-mictlai-gold h-32"
              placeholder='{"TipoOperacion":"0004","VersionQR":"01.01","FechaExpiracionQR":"25/12/31 23:59:59","FechaCreacionQR":"25/05/15 14:30:25","EmisorQR":"101","Monto":100,"Concepto":"","Operacion":{"Mensaje":"","CR":"1011499855001003","Comisiones":"12","CadenaEncriptada":"","Aux1":"","Aux2":""}}'
              required
            />
            
            {showExamples && (
              <div className="border-2 border-mictlai-gold/30 p-3 bg-black/50 mt-2">
                <h3 className="text-mictlai-gold font-pixel text-sm mb-2">EXAMPLE QR CODES</h3>
                <div className="space-y-2">
                  {exampleQrCodes.map((example, index) => (
                    <div key={index} className="border border-mictlai-bone/20 p-2 bg-black flex justify-between items-center">
                      <div>
                        <div className="text-mictlai-bone font-pixel text-xs">
                          {example.amount} MXN = {calculateTokenAmount(example.amount)} {token}
                        </div>
                        <div className="text-mictlai-bone/50 text-xs mt-1 font-mono truncate w-64 overflow-hidden">
                          {example.data.substring(0, 50)}...
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyExample(example.data)}
                        className="px-2 py-1 bg-mictlai-gold/20 text-mictlai-gold hover:bg-mictlai-gold/30 text-xs font-pixel"
                      >
                        USE
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-mictlai-bone/50 text-xs mt-2">
                  These are example QR codes for testing. In a real app, you would scan the QR code from the OXXO Spin app.
                </div>
              </div>
            )}
          </div>
          
          {/* Token Selection */}
          <div className="space-y-2">
            <label className="block text-mictlai-bone font-pixel text-sm">
              TOKEN TO RECEIVE
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="token"
                  value="XOC"
                  checked={token === 'XOC'}
                  onChange={() => setToken('XOC')}
                  className="text-mictlai-gold"
                />
                <span className="text-mictlai-bone">🍫 XOC</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="token"
                  value="MXNe"
                  checked={token === 'MXNe'}
                  onChange={() => setToken('MXNe')}
                  className="text-mictlai-gold"
                />
                <span className="text-mictlai-bone">🪙 MXNe</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="token"
                  value="USDC"
                  checked={token === 'USDC'}
                  onChange={() => setToken('USDC')}
                  className="text-mictlai-gold"
                />
                <span className="text-mictlai-bone">💵 USDC</span>
              </label>
            </div>
          </div>
          
          {/* Token Amount (calculated from QR code) */}
          <div className="space-y-2">
            <label className="block text-mictlai-bone font-pixel text-sm">
              TOKEN AMOUNT (CALCULATED)
            </label>
            <input
              type="text"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              className="w-full bg-black border-2 border-mictlai-bone/30 text-mictlai-bone p-2 font-pixel focus:outline-none focus:border-mictlai-gold"
              placeholder="0.00"
              readOnly
            />
            <div className="text-mictlai-bone/50 text-xs">
              Exchange rate: 1 USDC = 20 MXN, 1 XOC = 1 MXN, 1 MXNe = 1 MXN
            </div>
          </div>
          
          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-mictlai-bone font-pixel text-sm">
              UPLOAD QR CODE IMAGE (OPTIONAL)
            </label>
            <div className="flex items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept=".jpg,.jpeg,.png"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 bg-black border-2 border-mictlai-bone/30 text-mictlai-bone hover:border-mictlai-gold font-pixel text-sm"
              >
                SELECT IMAGE
              </button>
              {selectedImage && (
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  className="ml-2 py-2 px-3 bg-black border-2 border-mictlai-blood/50 text-mictlai-blood hover:border-mictlai-blood font-pixel text-sm"
                >
                  CLEAR
                </button>
              )}
              {selectedImage && (
                <span className="ml-3 text-mictlai-bone/70 text-sm truncate max-w-xs">
                  {selectedImage.name} ({Math.round(selectedImage.size / 1024)} KB)
                </span>
              )}
            </div>
            
            {imagePreview && (
              <div className="mt-2 max-w-xs">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="border-2 border-mictlai-gold/30 max-h-40 object-contain"
                />
                <p className="text-mictlai-bone/50 text-xs mt-1">
                  This image will be stored securely and can only be downloaded after QR code decryption.
                </p>
              </div>
            )}
            
            <div className="text-mictlai-bone/50 text-xs">
              Upload a PNG or JPG/JPEG image (max 5MB). This image will be securely stored and only accessible to users who can decrypt the QR code data.
            </div>
          </div>
          
          {/* Memo (optional) */}
          <div className="space-y-2">
            <label className="block text-mictlai-bone font-pixel text-sm">
              MEMO (OPTIONAL)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-black border-2 border-mictlai-bone/30 text-mictlai-bone p-2 font-pixel focus:outline-none focus:border-mictlai-gold"
              placeholder="Add a note to your buying order"
            />
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isConnected || !qrCodeData || !tokenAmount}
            className={`w-full py-3 font-pixel text-black ${
              isLoading || !isConnected || !qrCodeData || !tokenAmount
                ? 'bg-mictlai-gold/30 cursor-not-allowed'
                : 'bg-mictlai-gold hover:bg-mictlai-gold/80'
            } transition-colors flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <LoadingIcon className="w-5 h-5" />
                CREATING ORDER...
              </>
            ) : (
              'CREATE BUYING ORDER'
            )}
          </button>
          
          {!isConnected && (
            <div className="text-center text-mictlai-blood font-pixel text-sm">
              Please connect your wallet to create a buying order
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 