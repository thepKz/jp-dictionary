const fs = require('fs');
const path = require('path');

// Test CSV content
const testCsvContent = `STT,Ngữ liệu,Cách đọc,Nghĩa,Câu ví dụ,Dịch (việt),Link (JP),Link (VN),Nổi bật từ vựng ví dụ
1,経済的,けいざいてき,tính kinh tế,"非経済的, 無駄な","có tính kinh tế",,,"非経済的, 無駄な"
2,安全な,あんぜんな,an toàn,危険な,"an toàn",,,"危険な, 安心な, 無事な"`;

// Create test CSV file
const testCsvPath = path.join(__dirname, 'test-import.csv');
fs.writeFileSync(testCsvPath, testCsvContent);

console.log('Test CSV file created:', testCsvPath);

// Test the API endpoint with authentication
async function testImportAPI() {
  try {
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    
    // First, login to get authentication
    console.log('🔐 Logging in...');
    const loginResponse = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: '1234567'
      })
    });
    
    const loginResult = await loginResponse.json();
    console.log('Login response:', loginResult);
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResult.error);
      return;
    }
    
    // Extract cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies received:', cookies);
    
    // Now test the import API
    console.log('📤 Testing CSV import...');
    const form = new FormData();
    form.append('file', fs.createReadStream(testCsvPath));
    
    const importResponse = await fetch('http://localhost:3000/api/admin/import?mode=append&assignType=auto', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Cookie': cookies || 'adminAuth=true' // Use the cookie from login response
      }
    });
    
    const importResult = await importResponse.json();
    
    console.log('Import response status:', importResponse.status);
    console.log('Import response body:', JSON.stringify(importResult, null, 2));
    
    if (importResponse.ok) {
      console.log('✅ CSV import API test passed!');
      console.log(`📊 Imported ${importResult.upserted}/${importResult.count} entries`);
    } else {
      console.log('❌ CSV import API test failed:', importResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing CSV import API:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up
    fs.unlinkSync(testCsvPath);
    console.log('🧹 Test file cleaned up.');
  }
}

// Check if server is running
async function checkServer() {
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'test' })
    });
    console.log('✅ Server is running on port 3000');
    return true;
  } catch (error) {
    console.log('❌ Server is not running on port 3000');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testImportAPI();
  } else {
    console.log('Please start the development server first with: npm run dev');
  }
}

main();
