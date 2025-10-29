#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Test CSV parsing
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function testCsvFile(filePath) {
  console.log(`\nTesting CSV file: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  if (lines.length === 0) {
    console.error('❌ No lines found in file');
    return false;
  }
  
  console.log(`📄 Total lines: ${lines.length}`);
  
  // Check header
  const header = lines[0].trim();
  console.log(`📋 Header: ${header}`);
  
  const expectedHeaders = [
    "STT,Ngữ liệu,Cách đọc,Nghĩa,Câu ví dụ,Dịch,Link (JP),Link (VN),Ghi chú",
    "STT,Ngữ liệu,Cách đọc,Nghĩa,Câu ví dụ,Dịch (việt),Link (JP),Link (VN),Nổi bật từ vựng ví dụ",
    "STT,Ngữ liệu,Cách đọc,Nghĩa,Câu ví dụ,Dịch,Link (JP),Link (VN),ô đỏ,: bổ sung thông tin"
  ];
  
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const normalizedHeader = norm(header);
  const isMatch = expectedHeaders.some(expected => norm(expected) === normalizedHeader);
  
  if (!isMatch) {
    console.error('❌ Header format not recognized');
    console.log('Expected formats:');
    expectedHeaders.forEach((expected, i) => {
      console.log(`  ${i + 1}. ${expected}`);
    });
    return false;
  }
  
  console.log('✅ Header format is valid');
  
  // Parse sample entries
  let validEntries = 0;
  let invalidEntries = 0;
  
  for (let i = 1; i < Math.min(lines.length, 6); i++) { // Test first 5 entries
    const cols = parseCsvLine(lines[i]);
    
    if (cols.length < 4) {
      console.log(`⚠️  Line ${i + 1}: Insufficient columns (${cols.length})`);
      invalidEntries++;
      continue;
    }
    
    const stt = (cols[0] || '').trim();
    const kanji = (cols[1] || '').trim();
    const reading = (cols[2] || '').trim();
    const meaning = (cols[3] || '').trim();
    
    if (!kanji) {
      console.log(`⚠️  Line ${i + 1}: Missing kanji`);
      invalidEntries++;
      continue;
    }
    
    console.log(`✅ Entry ${i}: ${kanji} (${reading}) - ${meaning.substring(0, 50)}...`);
    validEntries++;
  }
  
  console.log(`📊 Sample results: ${validEntries} valid, ${invalidEntries} invalid`);
  
  if (validEntries > 0) {
    console.log('✅ File appears to be valid for import');
    return true;
  } else {
    console.log('❌ No valid entries found');
    return false;
  }
}

async function testImport() {
  console.log('🧪 Testing CSV Import Functionality\n');
  
  const CSV_FILES = [
    {
      path: path.join(__dirname, '../data/Copy of Copy of  LIST NGỮ LIỆU - Ngữ liệu (イ).csv'),
      adjType: 'i',
      name: 'Tính từ I (イ)'
    },
    {
      path: path.join(__dirname, '../data/Copy of Copy of  LIST NGỮ LIỆU - Ngữ liệu（ナ）.csv'),
      adjType: 'na',
      name: 'Tính từ Na (ナ)'
    }
  ];
  
  let allValid = true;
  
  for (const csvFile of CSV_FILES) {
    const isValid = testCsvFile(csvFile.path);
    if (!isValid) allValid = false;
  }
  
  console.log('\n📋 Summary:');
  if (allValid) {
    console.log('✅ All CSV files are ready for import');
    console.log('\n🚀 Next steps:');
    console.log('1. Start your Next.js development server: npm run dev');
    console.log('2. Run the import script: node scripts/import-via-api.js');
    console.log('3. Check the admin panel to verify the data');
  } else {
    console.log('❌ Some CSV files have issues that need to be fixed');
  }
}

// Run the test
testImport().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
