const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Test data
const testData = {
  // Provider token (you'll need to get this from your auth system)
  providerToken: 'YOUR_PROVIDER_TOKEN_HERE',
  
  // Customer token (you'll need to get this from your auth system)
  customerToken: 'YOUR_CUSTOMER_TOKEN_HERE',
  
  // Test promo code data
  promoCode: {
    name: "Test Summer Discount",
    code: "TEST25",
    discount_type: "percentage",
    discount_value: 25,
    minimum_bill_amount: 50,
    max_usage_count: 100,
    valid_from: "2025-01-27T00:00:00.000Z",
    valid_until: "2025-02-27T23:59:59.000Z"
  },
  
  // Test booking data
  booking: {
    provider_id: 1,
    service_ids: [1, 2],
    scheduled_date: "2025-01-27",
    scheduled_time: "10:00:00",
    service_location_id: 1,
    customer_address_id: 1,
    promo_code: "TEST25",
    notes: "Test booking with promo code"
  }
};

async function testPromoCodes() {
  console.log('🧪 Testing Promo Codes Functionality\n');
  
  try {
    // Step 1: Create Promo Code (Provider)
    console.log('1️⃣ Creating promo code...');
    const createResponse = await axios.post(
      `${BASE_URL}/promo-codes/provider`,
      testData.promoCode,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Promo code created:', createResponse.data);
    
    // Step 2: Get Provider's Own Promo Codes (Provider Dashboard)
    console.log('\n2️⃣ Getting provider\'s own promo codes...');
    const providerPromoCodesResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider`,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    console.log('✅ Provider promo codes:', providerPromoCodesResponse.data);
    
    // Step 3: Get Available Promo Codes (Customer App)
    console.log('\n3️⃣ Getting available promo codes for customer...');
    const availableResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/1/available?subtotal=90.00`
    );
    console.log('✅ Available promo codes:', availableResponse.data);
    
    // Step 4: Get Promo Codes for Provider (Hybrid - with provider token)
    console.log('\n4️⃣ Getting promo codes for provider (hybrid with provider token)...');
    const hybridProviderResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/1/promo-codes`,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    console.log('✅ Hybrid provider response:', hybridProviderResponse.data);
    
    // Step 5: Get Promo Codes for Provider (Hybrid - with user token)
    console.log('\n5️⃣ Getting promo codes for provider (hybrid with user token)...');
    const hybridUserResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/1/promo-codes`,
      {
        headers: {
          'Authorization': `Bearer ${testData.customerToken}`
        }
      }
    );
    console.log('✅ Hybrid user response:', hybridUserResponse.data);
    
    // Step 6: Get Promo Codes for Provider (Hybrid - no token)
    console.log('\n6️⃣ Getting promo codes for provider (hybrid without token)...');
    const hybridNoTokenResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/1/promo-codes`
    );
    console.log('✅ Hybrid no token response:', hybridNoTokenResponse.data);
    
    // Step 7: Validate Promo Code (Customer)
    console.log('\n7️⃣ Validating promo code...');
    const validateResponse = await axios.post(
      `${BASE_URL}/promo-codes/validate`,
      {
        promo_code: testData.promoCode.code,
        provider_id: 1,
        service_ids: [1, 2],
        subtotal: 90.00
      }
    );
    console.log('✅ Promo code validation:', validateResponse.data);
    
    // Step 8: Create Booking with Promo Code
    console.log('\n8️⃣ Creating booking with promo code...');
    const bookingResponse = await axios.post(
      `${BASE_URL}/api/bookings`,
      testData.booking,
      {
        headers: {
          'Authorization': `Bearer ${testData.customerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Booking created:', bookingResponse.data);
    
    // Step 9: Get Promo Code Analytics (Provider)
    console.log('\n9️⃣ Getting promo code analytics...');
    const analyticsResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/analytics?period=month`,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    console.log('✅ Analytics:', analyticsResponse.data);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testPromoCodes();
