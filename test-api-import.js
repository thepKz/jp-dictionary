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

// Test the API endpoint
async function testImportAPI() {
  try {
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(testCsvPath));
    
    const response = await fetch('http://localhost:3000/api/admin/import?mode=append&assignType=auto', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Cookie': 'admin-auth=test' // You might need to adjust this
      }
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ CSV import API test passed!');
    } else {
      console.log('❌ CSV import API test failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing CSV import API:', error.message);
  } finally {
    // Clean up
    fs.unlinkSync(testCsvPath);
    console.log('Test file cleaned up.');
  }
}

// Check if server is running
async function checkServer() {
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3000/api/admin/stats');
    console.log('Server is running on port 3000');
    return true;
  } catch (error) {
    console.log('Server is not running on port 3000');
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
