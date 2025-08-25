const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Test data
const testData = {
  providerToken: 'YOUR_PROVIDER_TOKEN_HERE'
};

async function testAnalytics() {
  console.log('🧪 Testing Analytics Routes\n');
  
  try {
    // Test 1: Get overall analytics (no promo code ID)
    console.log('1️⃣ Testing overall analytics...');
    const overallAnalyticsResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/analytics?period=month`,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    console.log('✅ Overall analytics:', overallAnalyticsResponse.data);
    
    // Test 2: Get analytics for specific promo code
    console.log('\n2️⃣ Testing specific promo code analytics...');
    const specificAnalyticsResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/analytics?period=month&promo_code_id=1`,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    console.log('✅ Specific analytics:', specificAnalyticsResponse.data);
    
    // Test 3: Get specific promo code details
    console.log('\n3️⃣ Testing specific promo code details...');
    const promoCodeDetailsResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/1`,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    console.log('✅ Promo code details:', promoCodeDetailsResponse.data);
    
    console.log('\n🎉 All analytics tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAnalytics();
