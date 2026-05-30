const fs = require('fs');
const transcriptPath = "C:\\Users\\saiso\\.gemini\\antigravity\\brain\\5de87d84-5d26-4e8a-8bae-a6f7e91d6104\\.system_generated\\logs\\transcript.jsonl";

try {
  const content = fs.readFileSync(transcriptPath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const data = JSON.parse(line);
      if (data.type === 'USER_INPUT') {
        console.log(`Step ${data.step_index}:`);
        console.log(data.content);
        console.log("=".repeat(60));
      }
    } catch (e) {}
  });
} catch (err) {
  console.error("Error:", err);
}
