import { InvalidQRCodeError, ExpiredQRCodeError } from './errors';

/**
 * Interface for parsed OXXO QR code data
 */
export interface OxxoQrData {
  monto: number;                // Amount in MXN
  fechaExpiracion: Date;        // Expiration date
  tipoOperacion: string;        // Operation type
  operacion: string;            // Operation reference
  concepto: string;             // Description
  emisor: string;               // Issuer
  fechaCreacion: Date;          // Creation date
}

/**
 * Parse OXXO Spin QR code content
 * 
 * Example QR code:
 * {"TipoOperacion":"0004","VersionQR":"01.01","FechaExpiracionQR":"25/04/22 00:00:00","FechaCreacionQR":"25/04/15 14:39:50","EmisorQR":"101","Monto":100,"Concepto":"","Operacion":{"Mensaje":"","CR":"1011499855001003","Comisiones":"12","CadenaEncriptada":"","Aux1":"","Aux2":""}}
 */
export function parseOxxoQrCode(qrCodeContent: string): OxxoQrData {
  try {
    // Parse JSON content
    const data = JSON.parse(qrCodeContent);
    
    // Extract operation reference from nested object if present
    const operacionRef = data.Operacion?.CR || '';
    
    // Parse Mexican date format DD/MM/YY to JS Date
    // Format is typically "DD/MM/YY HH:MM:SS"
    const parseDate = (dateStr: string): Date => {
      if (!dateStr) return new Date();
      
      try {
        // Extract day, month, year, time
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        
        // Construct full year (assuming 20XX for YY format)
        const fullYear = year.length === 2 ? `20${year}` : year;
        
        // Create date object (handling both with and without time component)
        if (timePart) {
          const [hours, minutes, seconds] = timePart.split(':');
          return new Date(
            parseInt(fullYear), 
            parseInt(month) - 1, // JS months are 0-indexed
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            parseInt(seconds)
          );
        } else {
          return new Date(
            parseInt(fullYear), 
            parseInt(month) - 1, 
            parseInt(day)
          );
        }
      } catch (error) {
        console.error('Error parsing date:', error);
        return new Date(); // Return current date as fallback
      }
    };
    
    // Return parsed data
    return {
      monto: Number(data.Monto || 0),
      fechaExpiracion: parseDate(data.FechaExpiracionQR),
      tipoOperacion: data.TipoOperacion || '',
      operacion: operacionRef,
      concepto: data.Concepto || '',
      emisor: data.EmisorQR || '',
      fechaCreacion: parseDate(data.FechaCreacionQR)
    };
  } catch (error) {
    console.error('Error parsing QR code:', error);
    throw new InvalidQRCodeError('Could not parse QR code JSON content.');
  }
}

/**
 * Validate QR code data
 * Checks that the QR code is valid and not expired
 */
export function validateQrCode(qrData: OxxoQrData): boolean {
  const now = new Date();
  
  // Check amount is positive
  if (!qrData.monto || qrData.monto <= 0) {
    throw new InvalidQRCodeError('QR code has invalid amount value.');
  }
  
  // Check if QR code is expired
  if (qrData.fechaExpiracion < now) {
    // Format date for error message
    const expDateStr = qrData.fechaExpiracion.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    throw new ExpiredQRCodeError(expDateStr);
  }
  
  // Additional validations could be added here
  
  return true;
} 