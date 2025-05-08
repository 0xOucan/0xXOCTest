#!/usr/bin/env node

/**
 * This script tests the buying order functionality in cUSDescrowforiAmigoP2P action provider
 * Usage: node test-buying-order.js
 */

// Force to use the compiled JS version
require('./dist/action-providers/cUSDescrowforiAmigoP2P/test').testBuyingOrder()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 