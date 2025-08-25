const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Test data - Replace with your actual provider token
const testData = {
  providerToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJmaXJzdF9uYW1lIjoiU2F0ZW5kcmEiLCJsYXN0X25hbWUiOiJQYWwiLCJmdWxsX25hbWUiOiJTYXRlbmRyYSBQYWwiLCJlbWFpbCI6InNhdGVuZHJhcGFsQGV4YW1wbGUuY29tIiwicGhvbmVfY29kZSI6IjkxIiwicGhvbmVfbnVtYmVyIjoiOTMzNTgyODE0MCIsImdlbmRlciI6MSwidmVyaWZpZWRfYXQiOiIyMDI1LTA4LTI1VDA1OjU2OjEyLjExOVoiLCJpc192ZXJpZmllZCI6MSwidXNlcl90eXBlIjoicHJvdmlkZXIiLCJzdGF0dXMiOjEsIm5vdGlmaWNhdGlvbiI6MSwiY3JlYXRlZF9hdCI6IjIwMjUtMDgtMjVUMDU6NTY6MDYuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDI1LTA4LTI1VDA1OjU2OjA2LjAwMFoiLCJ1c2VyVHlwZSI6InByb3ZpZGVyIiwiaWF0IjoxNzU2MTAxMzcyLCJleHAiOjE3NTYxNzMzNzJ9.cItlR0PbcxlcQty4A3Pnaik0sbtWjDjpAHYnuqDDbtk'
};

async function testAnalyticsFix() {
  console.log('🧪 Testing Analytics Fix\n');

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
    console.log('✅ Overall analytics response:', JSON.stringify(overallAnalyticsResponse.data, null, 2));

    // Test 2: Get analytics for specific promo code (if you have one)
    console.log('\n2️⃣ Testing specific promo code analytics...');
    try {
      const specificAnalyticsResponse = await axios.get(
        `${BASE_URL}/promo-codes/provider/analytics?period=month&promo_code_id=1`,
        {
          headers: {
            'Authorization': `Bearer ${testData.providerToken}`
          }
        }
      );
      console.log('✅ Specific analytics response:', JSON.stringify(specificAnalyticsResponse.data, null, 2));
    } catch (error) {
      console.log('⚠️ Specific analytics test failed (expected if no promo code with ID 1):', error.response?.data?.message || error.message);
    }

    // Test 3: Get provider's promo codes to see what's available
    console.log('\n3️⃣ Testing get provider promo codes...');
    const promoCodesResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider`,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    console.log('✅ Provider promo codes:', JSON.stringify(promoCodesResponse.data, null, 2));

    console.log('\n🎉 Analytics fix test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAnalyticsFix();
