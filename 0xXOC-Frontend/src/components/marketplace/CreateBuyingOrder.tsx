import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '../../providers/WalletContext';
import { 
  createBuyingOrder, 
  uploadBuyingOrderImage,
  validateOxxoSpinQrData
} from '../../services/marketplaceService';
import { useNotification, NotificationType } from '../../utils/notification';
import { LoadingIcon } from '../Icons';
import QrScanner from 'qr-scanner';

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

// Simple help component to explain OXXO QR scanning
const OxxoQrHelp = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-light-surface dark:bg-dark-surface border-3 border-base-blue shadow-pixel-lg max-w-lg w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base-blue dark:text-base-blue-light font-pixel">OXXO SPIN QR CODE HELP</h3>
          <button 
            onClick={onClose}
            className="text-light-text dark:text-dark-text hover:text-red-500"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4 text-light-text dark:text-dark-text">
          <p>
            This feature allows you to scan OXXO Spin QR codes directly from images.
            Upload an image containing an OXXO Spin QR code, and the system will automatically
            extract the payment information.
          </p>
          
          <div className="bg-light-card/50 dark:bg-dark-card/50 p-3 border border-base-blue/30">
            <h4 className="text-base-blue dark:text-base-blue-light font-pixel mb-2">TEST QR CODE</h4>
            <div className="flex items-center gap-4">
              <a 
                href="/test/test-oxxo-qr.png" 
                target="_blank"
                className="block border-2 border-base-blue/50 hover:border-base-blue transition-colors"
              >
                <img src="/test/test-oxxo-qr.png" alt="Test OXXO Spin QR Code" className="w-32 h-32" />
              </a>
              <div>
                <p className="text-sm">Download this test QR code and upload it to try the feature. It contains valid OXXO Spin data for 100 MXN.</p>
                <a 
                  href="/test/test-oxxo-qr.png" 
                  download="test-oxxo-qr.png"
                  className="mt-2 inline-block bg-base-blue/20 hover:bg-base-blue/30 text-base-blue dark:text-base-blue-light py-1 px-3 text-sm font-pixel"
                >
                  DOWNLOAD TEST QR
                </a>
              </div>
            </div>
          </div>
          
          <p className="text-light-secondary dark:text-dark-secondary text-sm">
            Note: In a real scenario, you would take a screenshot of the OXXO Spin QR code from the OXXO app or website.
            The system will validate the QR code format to ensure it's a legitimate OXXO payment.
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 bg-base-blue text-white font-pixel hover:bg-base-blue-light"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};

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
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Initialize QR Scanner
  useEffect(() => {
    // Make sure QR Scanner worker is ready
    QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';
  }, []);
  
  // Parse MXN amount from QR code data
  const getMxnAmountFromQrCode = (qrData: string): number => {
    const validation = validateOxxoSpinQrData(qrData);
    return validation.mxnAmount || 0;
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
  
  // Scan QR code from image file
  const scanQrCodeFromImage = async (file: File) => {
    try {
      setIsScanning(true);
      setScanError(null);
      
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });
      
      if (result && result.data) {
        // Check if the QR code data is valid OXXO Spin format
        const validation = validateOxxoSpinQrData(result.data);
        
        if (validation.isValid) {
          setQrCodeData(result.data);
          
          // Update token amount based on the extracted MXN amount
          if (validation.mxnAmount && validation.mxnAmount > 0) {
            const calculatedAmount = calculateTokenAmount(validation.mxnAmount);
            setTokenAmount(calculatedAmount);
          }
          
          addNotification(
            'QR code scanned successfully',
            NotificationType.SUCCESS,
            `Detected OXXO Spin QR code for ${validation.mxnAmount} MXN`
          );
        } else {
          setScanError('Invalid OXXO Spin QR code format. Please upload a valid OXXO Spin QR code image.');
          addNotification(
            'Invalid QR code format',
            NotificationType.WARNING,
            'The scanned QR code is not a valid OXXO Spin QR code.'
          );
        }
      } else {
        setScanError('No QR code found in image');
        addNotification(
          'No QR code detected',
          NotificationType.WARNING,
          'No QR code was detected in the uploaded image.'
        );
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      setScanError('Error scanning QR code: ' + (error instanceof Error ? error.message : 'Unknown error'));
      addNotification(
        'QR code scanning error',
        NotificationType.ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsScanning(false);
    }
  };
  
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
      setScanError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Scan QR code from the image
      scanQrCodeFromImage(file);
    }
  };
  
  // Clear selected image
  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setScanError(null);
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
    
    // Validate QR code data
    const validation = validateOxxoSpinQrData(qrCodeData);
    if (!validation.isValid) {
      addNotification(
        'Invalid OXXO Spin QR code data',
        NotificationType.WARNING,
        'Please upload a valid OXXO Spin QR code image or select from the examples'
      );
      return;
    }
    
    // Require an image to be uploaded for verification
    if (!selectedImage) {
      addNotification(
        'QR code image required',
        NotificationType.WARNING,
        'Please upload the OXXO Spin QR code image for verification'
      );
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
    <div className="bg-light-surface dark:bg-dark-surface border-3 border-base-blue shadow-pixel-lg overflow-hidden">
      {showHelp && <OxxoQrHelp onClose={() => setShowHelp(false)} />}
      
      <div className="p-4 bg-light-card dark:bg-dark-card border-b-3 border-base-blue/70">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold font-pixel text-base-blue dark:text-base-blue-light">
            BUY TOKENS WITH OXXO SPIN
          </h2>
          <button 
            onClick={() => setShowHelp(true)}
            className="px-2 py-1 bg-base-blue/20 text-base-blue hover:bg-base-blue/30 text-xs font-pixel border border-base-blue/50"
            title="Learn about QR scanning"
          >
            QR HELP
          </button>
        </div>
        <p className="text-light-secondary dark:text-dark-secondary mt-2 text-sm">
          Create a buying order using an OXXO Spin QR code to exchange Mexican Pesos for tokens
        </p>
      </div>
      
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload - Now the primary focus */}
          <div className="space-y-2">
            <label className="block text-light-text dark:text-dark-text font-pixel text-sm">
              UPLOAD OXXO SPIN QR CODE IMAGE
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
                className="py-2 px-3 bg-light-card dark:bg-dark-card border-2 border-base-blue text-base-blue dark:text-base-blue-light hover:bg-base-blue/20 font-pixel text-sm"
              >
                {isScanning ? 'SCANNING...' : 'SELECT QR CODE IMAGE'}
              </button>
              {selectedImage && (
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  className="ml-2 py-2 px-3 bg-light-card dark:bg-dark-card border-2 border-red-500/50 text-red-500 hover:border-red-500 font-pixel text-sm"
                >
                  CLEAR
                </button>
              )}
              {selectedImage && (
                <span className="ml-3 text-light-secondary dark:text-dark-secondary text-sm truncate max-w-xs">
                  {selectedImage.name} ({Math.round(selectedImage.size / 1024)} KB)
                </span>
              )}
            </div>
            
            {imagePreview && (
              <div className="mt-2 flex flex-col md:flex-row gap-4 items-start">
                <div className="max-w-xs">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="border-2 border-base-blue/30 max-h-40 object-contain"
                  />
                </div>
                <div className="max-w-md">
                  {isScanning ? (
                    <div className="flex items-center gap-2 text-base-blue">
                      <LoadingIcon className="w-4 h-4" />
                      <span>Scanning QR code...</span>
                    </div>
                  ) : scanError ? (
                    <div className="text-red-500 text-sm p-3 border border-red-500/30 bg-red-500/10">
                      {scanError}
                    </div>
                  ) : qrCodeData ? (
                    <div className="text-base-blue text-sm p-3 border border-base-blue/30 bg-base-blue/10">
                      ✓ QR code detected: OXXO Spin code for {getMxnAmountFromQrCode(qrCodeData)} MXN
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            
            <div className="text-light-secondary dark:text-dark-secondary/50 text-xs">
              Upload a PNG or JPG/JPEG image containing an OXXO Spin QR code (max 5MB). The system will automatically extract the QR code data.
            </div>
          </div>
          
          {/* QR Code Data - Now secondary and auto-filled */}
          <div className="space-y-2">
            <label className="block text-light-text dark:text-dark-text font-pixel text-sm">
              OXXO SPIN QR CODE DATA
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                className="ml-2 text-base-blue hover:text-base-blue-light text-xs underline"
              >
                {showExamples ? 'Hide Examples' : 'Show Examples'}
              </button>
            </label>
            <textarea
              value={qrCodeData}
              onChange={(e) => setQrCodeData(e.target.value)}
              className="w-full bg-light-card dark:bg-dark-card border-2 border-base-blue/30 text-base-blue p-2 font-mono text-sm focus:outline-none focus:border-base-blue h-32"
              placeholder='{"TipoOperacion":"0004","VersionQR":"01.01","FechaExpiracionQR":"25/12/31 23:59:59","FechaCreacionQR":"25/05/15 14:30:25","EmisorQR":"101","Monto":100,"Concepto":"","Operacion":{"Mensaje":"","CR":"1011499855001003","Comisiones":"12","CadenaEncriptada":"","Aux1":"","Aux2":""}}'
              required
            />
            
            {showExamples && (
              <div className="border-2 border-base-blue/30 p-3 bg-light-card dark:bg-dark-card/50 mt-2">
                <h3 className="text-base-blue font-pixel text-sm mb-2">EXAMPLE QR CODES</h3>
                <div className="space-y-2">
                  {exampleQrCodes.map((example, index) => (
                    <div key={index} className="border border-base-blue/20 p-2 bg-light-card dark:bg-dark-card flex justify-between items-center">
                      <div>
                        <div className="text-base-blue font-pixel text-xs">
                          {example.amount} MXN = {calculateTokenAmount(example.amount)} {token}
                        </div>
                        <div className="text-base-blue/50 text-xs mt-1 font-mono truncate w-64 overflow-hidden">
                          {example.data.substring(0, 50)}...
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyExample(example.data)}
                        className="px-2 py-1 bg-base-blue/20 text-base-blue hover:bg-base-blue/30 text-xs font-pixel"
                      >
                        USE
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-base-blue/50 text-xs mt-2">
                  These are example QR codes for testing. In a real app, you would scan the QR code from the OXXO Spin app.
                </div>
              </div>
            )}
          </div>
          
          {/* Token Selection */}
          <div className="space-y-2">
            <label className="block text-light-text dark:text-dark-text font-pixel text-sm">
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
                  className="text-base-blue"
                />
                <span className="text-light-secondary dark:text-dark-secondary">🍫 XOC</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="token"
                  value="MXNe"
                  checked={token === 'MXNe'}
                  onChange={() => setToken('MXNe')}
                  className="text-base-blue"
                />
                <span className="text-light-secondary dark:text-dark-secondary">🪙 MXNe</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="token"
                  value="USDC"
                  checked={token === 'USDC'}
                  onChange={() => setToken('USDC')}
                  className="text-base-blue"
                />
                <span className="text-light-secondary dark:text-dark-secondary">💵 USDC</span>
              </label>
            </div>
          </div>
          
          {/* Token Amount (calculated from QR code) */}
          <div className="space-y-2">
            <label className="block text-light-text dark:text-dark-text font-pixel text-sm">
              TOKEN AMOUNT (CALCULATED)
            </label>
            <input
              type="text"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              className="w-full bg-light-card dark:bg-dark-card border-2 border-base-blue/30 text-base-blue p-2 font-pixel focus:outline-none focus:border-base-blue"
              placeholder="0.00"
              readOnly
            />
            <div className="text-light-secondary dark:text-dark-secondary/50 text-xs">
              Exchange rate: 1 USDC = 20 MXN, 1 XOC = 1 MXN, 1 MXNe = 1 MXN
            </div>
          </div>
          
          {/* Memo (optional) */}
          <div className="space-y-2">
            <label className="block text-light-text dark:text-dark-text font-pixel text-sm">
              MEMO (OPTIONAL)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-light-card dark:bg-dark-card border-2 border-base-blue/30 text-base-blue p-2 font-pixel focus:outline-none focus:border-base-blue"
              placeholder="Add a note to your buying order"
            />
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isConnected || !qrCodeData || !tokenAmount}
            className={`w-full py-3 font-pixel text-base-blue ${
              isLoading || !isConnected || !qrCodeData || !tokenAmount
                ? 'bg-base-blue/30 cursor-not-allowed'
                : 'bg-base-blue hover:bg-base-blue/80'
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
            <div className="text-center text-red-500 font-pixel text-sm">
              Please connect your wallet to create a buying order
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 