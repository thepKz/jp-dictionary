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
console.log('Content:');
console.log(testCsvContent);

// Test the CSV parsing logic
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  
  // Strict Vietnamese header
  const header = lines[0].trim();
  const expected = "STT,Ngữ liệu,Cách đọc,Nghĩa,Câu ví dụ,Dịch (việt),Link (JP),Link (VN),Nổi bật từ vựng ví dụ";
  
  if (!header.startsWith("STT")) {
    // tolerate BOM
    const hdr = header.replace(/^\uFEFF/, "");
    if (hdr !== expected) {
      // try relaxed compare by removing spaces diff
      const norm = (s) => s.replace(/\s+/g, " ").trim();
      if (norm(hdr) !== norm(expected)) {
        throw new Error("CSV header không đúng định dạng yêu cầu");
      }
    }
  } else if (header !== expected) {
    const norm = (s) => s.replace(/\s+/g, " ").trim();
    if (norm(header) !== norm(expected)) {
      throw new Error("CSV header không đúng định dạng yêu cầu");
    }
  }
  
  const out = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 4) continue;
    
    const kanji = (cols[1] || "").trim();
    const reading = (cols[2] || "").trim();
    const meaning = (cols[3] || "").trim();
    const example = (cols[4] || "").trim();
    const translation = (cols[5] || "").trim();
    const linkJP = (cols[6] || "").trim();
    const linkVN = (cols[7] || "").trim();
    const highlightTerm = (cols[8] || "").trim();
    
    if (!kanji) continue;
    out.push({ kanji, reading, meaning, example, translation, linkJP, linkVN, highlightTerm });
  }
  return out;
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Test parsing
try {
  const parsed = parseCsv(testCsvContent);
  console.log('\nParsed entries:');
  console.log(JSON.stringify(parsed, null, 2));
  console.log('\n✅ CSV parsing test passed!');
} catch (error) {
  console.error('❌ CSV parsing test failed:', error.message);
}

// Clean up
fs.unlinkSync(testCsvPath);
console.log('\nTest file cleaned up.');
