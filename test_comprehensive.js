const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Test data - Replace with your actual tokens
const testData = {
  providerToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJmaXJzdF9uYW1lIjoiU2F0ZW5kcmEiLCJsYXN0X25hbWUiOiJQYWwiLCJmdWxsX25hbWUiOiJTYXRlbmRyYSBQYWwiLCJlbWFpbCI6InNhdGVuZHJhcGFsQGV4YW1wbGUuY29tIiwicGhvbmVfY29kZSI6IjkxIiwicGhvbmVfbnVtYmVyIjoiOTMzNTgyODE0MCIsImdlbmRlciI6MSwidmVyaWZpZWRfYXQiOiIyMDI1LTA4LTI1VDA1OjU2OjEyLjExOVoiLCJpc192ZXJpZmllZCI6MSwidXNlcl90eXBlIjoicHJvdmlkZXIiLCJzdGF0dXMiOjEsIm5vdGlmaWNhdGlvbiI6MSwiY3JlYXRlZF9hdCI6IjIwMjUtMDgtMjVUMDU6NTY6MDYuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDI1LTA4LTI1VDA1OjU2OjA2LjAwMFoiLCJ1c2VyVHlwZSI6InByb3ZpZGVyIiwiaWF0IjoxNzU2MTAxMzcyLCJleHAiOjE3NTYxNzMzNzJ9.cItlR0PbcxlcQty4A3Pnaik0sbtWjDjpAHYnuqDDbtk',
  userToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJmaXJzdF9uYW1lIjoiU2F0ZW5kcmEiLCJsYXN0X25hbWUiOiJQYWwiLCJmdWxsX25hbWUiOiJTYXRlbmRyYSBQYWwiLCJlbWFpbCI6InNhdGVuZHJhcGFsQGV4YW1wbGUuY29tIiwicGhvbmVfY29kZSI6IjkxIiwicGhvbmVfbnVtYmVyIjoiOTMzNTgyODE0MCIsImdlbmRlciI6MSwidmVyaWZpZWRfYXQiOiIyMDI1LTA4LTI1VDA1OjU2OjEyLjExOVoiLCJpc192ZXJpZmllZCI6MSwidXNlcl90eXBlIjoidXNlciIsInN0YXR1cyI6MSwibm90aWZpY2F0aW9uIjoxLCJjcmVhdGVkX2F0IjoiMjAyNS0wOC0yNVQwNTo1NjowNi4wMDBaIiwidXBkYXRlZF9hdCI6IjIwMjUtMDgtMjVUMDU6NTY6MDYuMDAwWiIsInVzZXJUeXBlIjoidXNlciIsImlhdCI6MTc1NjEwMTM3MiwiZXhwIjoxNzU2MTczMzcyfQ.example'
};

async function testComprehensive() {
  console.log('🧪 Comprehensive Promo Code Testing\n');

  try {
    // Test 1: Create a promo code for testing
    console.log('1️⃣ Creating test promo code...');
    const createResponse = await axios.post(
      `${BASE_URL}/promo-codes/provider`,
      {
        code: 'TEST25',
        name: 'Test Promo Code',
        description: 'Test promo code for validation',
        discount_type: 'percentage',
        discount_value: 25,
        minimum_bill_amount: 50,
        max_usage_count: 100,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        is_active: true
      },
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    
    console.log('✅ Promo code created:', createResponse.data.data.id);
    const promoCodeId = createResponse.data.data.id;

    // Test 2: Test promo code validation (this should work now)
    console.log('\n2️⃣ Testing promo code validation...');
    try {
      const validationResponse = await axios.post(
        `${BASE_URL}/bookings/validate-promo-code`,
        {
          promo_code: 'TEST25',
          provider_id: 1,
          service_ids: [1, 2],
          subtotal: 100
        },
        {
          headers: {
            'Authorization': `Bearer ${testData.userToken}`
          }
        }
      );
      
      console.log('✅ Validation successful:', JSON.stringify(validationResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Validation failed:', error.response?.data?.message || error.message);
    }

    // Test 3: Get overall analytics
    console.log('\n3️⃣ Testing overall analytics...');
    const overallAnalyticsResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/analytics?period=month`,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    
    console.log('✅ Overall analytics response:');
    console.log('Status:', overallAnalyticsResponse.status);
    console.log('Success:', overallAnalyticsResponse.data.success);
    console.log('Total promo codes:', overallAnalyticsResponse.data.data.total_promo_codes);
    console.log('Active promo codes:', overallAnalyticsResponse.data.data.active_promo_codes);
    console.log('Total usage:', overallAnalyticsResponse.data.data.total_usage);
    console.log('Total discount given:', overallAnalyticsResponse.data.data.total_discount_given);
    console.log('Number of promo codes in response:', overallAnalyticsResponse.data.data.promo_codes.length);

    // Test 4: Get specific promo code analytics
    console.log('\n4️⃣ Testing specific promo code analytics...');
    const specificAnalyticsResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/analytics?period=month&promo_code_id=${promoCodeId}`,
      {
        headers: {
          'Authorization': `Bearer ${testData.providerToken}`
        }
      }
    );
    
    console.log('✅ Specific analytics response:');
    console.log('Status:', specificAnalyticsResponse.status);
    console.log('Success:', specificAnalyticsResponse.data.success);
    console.log('Total usage for this promo code:', specificAnalyticsResponse.data.data.total_usage);
    console.log('Total discount given for this promo code:', specificAnalyticsResponse.data.data.total_discount_given);
    console.log('Number of promo codes in response (should be 1):', specificAnalyticsResponse.data.data.promo_codes.length);
    
    if (specificAnalyticsResponse.data.data.promo_codes.length === 1) {
      const promoCode = specificAnalyticsResponse.data.data.promo_codes[0];
      console.log('Promo code details:');
      console.log('- ID:', promoCode.id);
      console.log('- Code:', promoCode.code);
      console.log('- Name:', promoCode.name);
      console.log('- Usage count:', promoCode.usage_count);
      console.log('- Total discount:', promoCode.total_discount);
      console.log('- Usage percentage:', promoCode.usage_percentage);
      console.log('- Is active:', promoCode.is_active);
      console.log('- Valid from:', promoCode.valid_from);
      console.log('- Valid until:', promoCode.valid_until);
      
      if (promoCode.recent_usage_records) {
        console.log('- Recent usage records:', promoCode.recent_usage_records.length);
      }
      
      if (promoCode.usage_by_date) {
        console.log('- Usage by date records:', promoCode.usage_by_date.length);
      }
    }

    // Test 5: Get available promo codes for customer
    console.log('\n5️⃣ Testing available promo codes for customer...');
    const availableResponse = await axios.get(
      `${BASE_URL}/promo-codes/provider/1/available?subtotal=100`,
      {
        headers: {
          'Authorization': `Bearer ${testData.userToken}`
        }
      }
    );
    
    console.log('✅ Available promo codes response:');
    console.log('Status:', availableResponse.status);
    console.log('Success:', availableResponse.data.success);
    console.log('Available promo codes count:', availableResponse.data.data.count);
    console.log('Subtotal:', availableResponse.data.data.subtotal);

    console.log('\n🎉 Comprehensive test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run the test
testComprehensive();
