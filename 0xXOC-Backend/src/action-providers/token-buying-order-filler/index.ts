import { TokenBuyingOrderFillerActionProvider } from './tokenBuyingOrderFillerActionProvider';
export { TokenBuyingOrderFillerActionProvider } from './tokenBuyingOrderFillerActionProvider';

// Export a factory function to create action provider instance
export const tokenBuyingOrderFillerActionProvider = () => {
  return new TokenBuyingOrderFillerActionProvider();
}; 