import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      callback(path.join(dirPath));
    }
  });
}

walkDir(path.join(__dirname, 'src'), (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace default blues with blue-700 (#1D4ED8)
  content = content.replace(/blue-600/g, 'blue-700');
  content = content.replace(/blue-500/g, 'blue-700');

  // Replace daisyui primary references to blue-700
  content = content.replace(/text-primary/g, 'text-blue-700');
  content = content.replace(/bg-[#1D4ED8]/g, 'bg-blue-700');
  content = content.replace(/border-primary/g, 'border-blue-700');
  content = content.replace(/ring-primary/g, 'ring-blue-700');
  content = content.replace(/text-primary\/(\d+)/g, 'text-blue-700/$1');
  content = content.replace(/bg-[#1D4ED8]\/(\d+)/g, 'bg-blue-700/$1');

  // Replace btn-primary with specific daisyui combo
  content = content.replace(/btn-primary/g, 'bg-blue-700 text-white font-semibold border-none hover:bg-blue-800');

  // Hardcoded hex
  content = content.replace(/#2563eb/gi, '#1D4ED8'); // blue-600 hex
  content = content.replace(/#3b82f6/gi, '#1D4ED8'); // blue-500 hex

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
