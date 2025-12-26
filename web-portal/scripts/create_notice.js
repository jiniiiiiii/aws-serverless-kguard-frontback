/**
 * Admin Script to Create a New Notice
 * Usage: node scripts/create_notice.js "Title" "Content with newlines"
 * 
 * This script:
 * 1. Reads the current list (page_1.json) to find the latest ID.
 * 2. Generates a new ID (Latest + 1).
 * 3. Creates a detail JSON file: /public/notices/detail/{id}.json
 * 4. Updates the list JSON file: /public/notices/list/page_1.json (Prepends new item)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LIST_FILE_PATH = path.join(PROJECT_ROOT, 'public', 'notices', 'list', 'page_1.json');
const DETAIL_DIR_PATH = path.join(PROJECT_ROOT, 'public', 'notices', 'detail');

// Get Arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Usage: node scripts/create_notice.js "Your Title" "Your Content"');
  process.exit(1);
}

const [title, content] = args;
const today = new Date().toISOString().split('T')[0];

console.log(`📝 Preparing to create notice: "${title}"`);

// 1. Read Current List
let listData = [];
try {
  const fileContent = fs.readFileSync(LIST_FILE_PATH, 'utf-8');
  listData = JSON.parse(fileContent);
} catch (e) {
  console.log('⚠️ Could not read list file, initializing new list.');
}

// 2. Generate New ID
// Find the max ID currently in the list
const maxId = listData.reduce((max, item) => (item.id > max ? item.id : max), 0);
const newId = maxId + 1;

console.log(`🆔 Generated ID: ${newId}`);

// 3. Create Detail File
const detailData = {
  id: newId,
  title: title,
  date: today,
  content: content
};

const detailFilePath = path.join(DETAIL_DIR_PATH, `${newId}.json`);

try {
  // Ensure directory exists
  if (!fs.existsSync(DETAIL_DIR_PATH)) {
    fs.mkdirSync(DETAIL_DIR_PATH, { recursive: true });
  }
  
  fs.writeFileSync(detailFilePath, JSON.stringify(detailData, null, 2), 'utf-8');
  console.log(`✅ Created detail file: public/notices/detail/${newId}.json`);
} catch (e) {
  console.error('❌ Failed to create detail file:', e);
  process.exit(1);
}

// 4. Update List File
const newSummary = {
  id: newId,
  title: title,
  date: today,
  isNew: true
};

// Remove 'isNew' mark from older items (Optional logic)
// listData = listData.map(item => ({ ...item, isNew: false }));

// Add new item to the beginning
listData.unshift(newSummary);

try {
  fs.writeFileSync(LIST_FILE_PATH, JSON.stringify(listData, null, 2), 'utf-8');
  console.log(`✅ Updated list file: public/notices/list/page_1.json`);
} catch (e) {
  console.error('❌ Failed to update list file:', e);
  process.exit(1);
}

console.log('\n🎉 Notice created successfully!');
