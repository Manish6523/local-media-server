const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "app");

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith(".tsx")) {
      let content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes("interface MediaEntry {")) {
        // Find the interface block and replace it
        // The block looks like:
        // interface MediaEntry {
        //   ...
        // }
        // We'll use a regex to match the interface block
        const regex = /interface MediaEntry \{[\s\S]*?\}/;
        if (regex.test(content)) {
          console.log("Replacing in", fullPath);
          content = content.replace(regex, 'import type { MediaEntry } from "@/lib/db";');
          fs.writeFileSync(fullPath, content);
        }
      }
    }
  }
}

walk(root);
