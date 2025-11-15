// scripts/convert-posts.js
const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.resolve('_posts');
const DATE = '2025-11-13';               // you can change per-file later in CMS
const DEFAULT_TAGS = ['spirituality'];
const DEFAULT_CAT  = 'essays';

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`Directory ${_posts} not found.`);
  process.exit(1);
}

fs.readdirSync(POSTS_DIR).forEach(file => {
  if (!file.endsWith('.md')) return;

  const filePath = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf8');

  // ---- 1. Already has front matter? → skip ----
  if (raw.trimStart().startsWith('---')) {
    console.log(`Skipping (already converted): ${file}`);
    return;
  }

  // ---- 2. Find a heading (any level) ----
  const headingMatch = raw.match(/^(#{1,6})\s+(.+)$/m);
  let title = headingMatch ? headingMatch[2].trim() : null;

  // ---- 3. Fallback to filename (remove extension, replace -_ with space) ----
  if (!title) {
    title = path.basename(file, '.md')
               .replace(/[-_]+/g, ' ')
               .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize words
    console.warn(`No heading in ${file} → using filename: "${title}"`);
  }

  // ---- 4. Body = everything after the heading (or whole file) ----
  let body = headingMatch
    ? raw.slice(raw.indexOf(headingMatch[0]) + headingMatch[0].length).trim()
    : raw.trim();

  // ---- 5. Optional description (first 150 chars, strip markdown) ----
  const description = body
    .replace(/[#*`]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 150)
    .trim() + (body.length > 150 ? '...' : '');

  // ---- 6. Build front matter ----
  const frontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${DATE}
tags: ${JSON.stringify(DEFAULT_TAGS)}
category: "${DEFAULT_CAT}"
description: "${description.replace(/"/g, '\\"')}"
---
`;

  // ---- 7. Write back (heading line removed, front matter added) ----
  const newContent = `${frontMatter}\n${body}\n`;
  fs.writeFileSync(filePath, newContent);
  console.log(`Converted: ${file} → "${title}"`);
});