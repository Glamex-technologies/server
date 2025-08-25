const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Test data - Replace with your actual provider token
const testData = {
  providerToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJmaXJzdF9uYW1lIjoiU2F0ZW5kcmEiLCJsYXN0X25hbWUiOiJQYWwiLCJmdWxsX25hbWUiOiJTYXRlbmRyYSBQYWwiLCJlbWFpbCI6InNhdGVuZHJhcGFsQGV4YW1wbGUuY29tIiwicGhvbmVfY29kZSI6IjkxIiwicGhvbmVfbnVtYmVyIjoiOTMzNTgyODE0MCIsImdlbmRlciI6MSwidmVyaWZpZWRfYXQiOiIyMDI1LTA4LTI1VDA1OjU2OjEyLjExOVoiLCJpc192ZXJpZmllZCI6MSwidXNlcl90eXBlIjoicHJvdmlkZXIiLCJzdGF0dXMiOjEsIm5vdGlmaWNhdGlvbiI6MSwiY3JlYXRlZF9hdCI6IjIwMjUtMDgtMjVUMDU6NTY6MDYuMDAwWiIsInVwZGF0ZWRfYXQiOiIyMDI1LTA4LTI1VDA1OjU2OjA2LjAwMFoiLCJ1c2VyVHlwZSI6InByb3ZpZGVyIiwiaWF0IjoxNzU2MTAxMzcyLCJleHAiOjE3NTYxNzMzNzJ9.cItlR0PbcxlcQty4A3Pnaik0sbtWjDjpAHYnuqDDbtk'
};

async function testAnalyticsSimple() {
  console.log('🧪 Testing Analytics with No Usage Records\n');

  try {
    // Test 1: Get overall analytics (should work even with no usage)
    console.log('1️⃣ Testing overall analytics...');
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
    console.log('Message:', overallAnalyticsResponse.data.message);
    console.log('Data:', JSON.stringify(overallAnalyticsResponse.data.data, null, 2));

    console.log('\n🎉 Analytics test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run the test
testAnalyticsSimple();
