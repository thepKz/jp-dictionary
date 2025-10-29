#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Server URL - adjust if needed
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

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

function parseCsvFile(filePath) {
  console.log(`Parsing CSV file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }
  
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  if (lines.length === 0) return null;
  
  console.log(`Found ${lines.length} lines in ${path.basename(filePath)}`);
  return text; // Return raw text for API upload
}

async function uploadCsvFile(filePath, adjType, mode = 'replace') {
  const csvText = parseCsvFile(filePath);
  if (!csvText) return false;
  
  try {
    const formData = new FormData();
    formData.append('file', csvText, {
      filename: path.basename(filePath),
      contentType: 'text/csv'
    });
    
    const params = new URLSearchParams();
    params.append('assignType', adjType);
    params.append('mode', mode);
    
    const url = `${SERVER_URL}/api/admin/import?${params.toString()}`;
    
    console.log(`Uploading ${path.basename(filePath)} (${adjType}, ${mode})...`);
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success: ${result.upserted}/${result.count} entries imported`);
      return true;
    } else {
      console.error(`❌ Error: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Upload failed: ${error.message}`);
    return false;
  }
}

async function importData() {
  console.log('Starting CSV import process...');
  console.log(`Server URL: ${SERVER_URL}`);
  
  const CSV_FILES = [
    {
      path: path.join(__dirname, '../data/Copy of Copy of  LIST NGỮ LIỆU - Ngữ liệu (イ).csv'),
      adjType: 'i'
    },
    {
      path: path.join(__dirname, '../data/Copy of Copy of  LIST NGỮ LIỆU - Ngữ liệu（ナ）.csv'),
      adjType: 'na'
    }
  ];
  
  let successCount = 0;
  
  for (const csvFile of CSV_FILES) {
    const success = await uploadCsvFile(csvFile.path, csvFile.adjType, 'replace');
    if (success) successCount++;
    
    // Wait a bit between uploads
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\nImport completed: ${successCount}/${CSV_FILES.length} files processed successfully`);
  
  if (successCount === CSV_FILES.length) {
    console.log('🎉 All files imported successfully!');
  } else {
    console.log('⚠️  Some files failed to import. Please check the errors above.');
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ or a fetch polyfill');
  process.exit(1);
}

// Run the import
importData().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
