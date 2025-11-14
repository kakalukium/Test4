const fs = require('fs');
const path = require('path');

// Convert all Obsidian files in _posts to Decap CMS format
const postsDir = '_posts';
const files = fs.readdirSync(postsDir);

files.forEach(file => {
    if (file.endsWith('.md')) {
        const content = fs.readFileSync(path.join(postsDir, file), 'utf8');
        
        // Extract title from first line
        const firstLine = content.split('\n')[0];
        const title = firstLine.replace('#', '').trim();
        
        // Create front matter
        const frontMatter = `---
title: "${title}"
date: 2025-11-13
tags: ["spirituality"]
category: "essays"
---\n\n`;
        
        // Remove title from content and add front matter
        const newContent = frontMatter + content.replace(firstLine, '').trim();
        
        fs.writeFileSync(path.join(postsDir, file), newContent);
    }
});