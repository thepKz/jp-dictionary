#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'jp_econ_dict';

// CSV file paths
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

function parseCsvFile(filePath, adjType) {
  console.log(`Parsing CSV file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return [];
  }
  
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  if (lines.length === 0) return [];
  
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 4) continue;
    
    const stt = (cols[0] || '').trim();
    const kanji = (cols[1] || '').trim();
    const reading = (cols[2] || '').trim();
    const meaning = (cols[3] || '').trim();
    const example = (cols[4] || '').trim();
    const translation = (cols[5] || '').trim();
    const linkJP = (cols[6] || '').trim();
    const linkVN = (cols[7] || '').trim();
    const highlightTerm = (cols[8] || '').trim();
    
    if (!kanji) continue;
    
    entries.push({
      kanji,
      reading,
      meaning,
      example,
      translation,
      linkJP,
      linkVN,
      highlightTerm,
      adjType,
      stt: stt ? parseInt(stt) : undefined
    });
  }
  
  console.log(`Parsed ${entries.length} entries from ${path.basename(filePath)}`);
  return entries;
}

async function importData() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const entriesCollection = db.collection('entries');
    
    console.log('Clearing existing data...');
    await entriesCollection.deleteMany({});
    console.log('Existing data cleared.');
    
    let totalImported = 0;
    
    for (const csvFile of CSV_FILES) {
      const entries = parseCsvFile(csvFile.path, csvFile.adjType);
      
      if (entries.length > 0) {
        console.log(`Importing ${entries.length} entries (${csvFile.adjType})...`);
        const result = await entriesCollection.insertMany(entries);
        console.log(`Imported ${result.insertedCount} entries successfully.`);
        totalImported += result.insertedCount;
      }
    }
    
    console.log(`\nTotal imported: ${totalImported} entries`);
    
    // Create indexes
    console.log('Creating indexes...');
    await entriesCollection.createIndex({ kanji: 1 }, { unique: true });
    await entriesCollection.createIndex({ reading: 1 });
    await entriesCollection.createIndex({ meaning: 'text' });
    await entriesCollection.createIndex({ adjType: 1 });
    await entriesCollection.createIndex({ stt: 1 });
    console.log('Indexes created successfully.');
    
    // Show statistics
    const stats = await entriesCollection.aggregate([
      {
        $group: {
          _id: '$adjType',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\nStatistics:');
    stats.forEach(stat => {
      console.log(`  ${stat._id || 'untyped'}: ${stat.count} entries`);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed.');
    }
  }
}

// Run the import
importData().then(() => {
  console.log('Import completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
