const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.resolve('_posts');
const DEFAULT_DATE = new Date().toISOString().split('T')[0]; // Current date
const DEFAULT_TAGS = ['spirituality'];
const DEFAULT_CAT = 'essays';
const DESCRIPTION_LENGTH = 300;

// Helper function to create URL-safe slugs
function createSlug(filename) {
    return filename
        .replace('.md', '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Helper function to extract title from content
function extractTitle(content, filename) {
    // Try to find ANY heading in the file (not just at start)
    const headingMatch = content.match(/^#{1,6}\s+(.+)$/m);
    if (headingMatch) {
        return headingMatch[1].trim();
    }
    
    // Fallback: clean up filename
    return filename
        .replace('.md', '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/\s+/g, ' ')
        .trim();
}

// Helper function to extract description from content
function extractDescription(content) {
    // Remove front matter if present
    let cleanContent = content;
    if (content.trimStart().startsWith('---')) {
        const parts = content.split('---');
        cleanContent = parts.length >= 3 ? parts[2] : content;
    }
    
    // Remove markdown formatting and extract first 300 chars
    return cleanContent
        .replace(/[#*`~>|\[\]\(\)]/g, '') // Remove more markdown symbols
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, DESCRIPTION_LENGTH)
        .trim() + (cleanContent.length > DESCRIPTION_LENGTH ? '...' : '');
}

// Helper function to parse existing front matter
function parseExistingFrontMatter(frontMatter) {
    const titleMatch = frontMatter.match(/title:\s*"([^"]*)"/) || frontMatter.match(/title:\s*([^\n]+)/);
    const dateMatch = frontMatter.match(/date:\s*([^\n]+)/);
    const tagsMatch = frontMatter.match(/tags:\s*([^\n]+)/);
    const categoryMatch = frontMatter.match(/category:\s*"([^"]*)"/) || frontMatter.match(/category:\s*([^\n]+)/);
    const descMatch = frontMatter.match(/description:\s*"([^"]*)"/) || frontMatter.match(/description:\s*([^\n]+)/);

    return {
        title: titleMatch ? titleMatch[1].trim() : null,
        date: dateMatch ? dateMatch[1].trim() : null,
        tags: tagsMatch ? tagsMatch[1].trim() : null,
        category: categoryMatch ? categoryMatch[1].trim() : null,
        description: descMatch ? descMatch[1].trim() : null
    };
}

if (!fs.existsSync(POSTS_DIR)) {
    console.error(`❌ Directory ${POSTS_DIR} not found.`);
    process.exit(1);
}

const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
let convertedCount = 0;
let fixedCount = 0;
let skippedCount = 0;

console.log(`🔄 Processing ${files.length} markdown files...\n`);

files.forEach(file => {
    const filePath = path.join(POSTS_DIR, file);
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const slug = createSlug(file);

    // Check if file already has front matter
    if (rawContent.trimStart().startsWith('---')) {
        const parts = rawContent.split('---');
        
        if (parts.length >= 3) {
            const existing = parseExistingFrontMatter(parts[1]);
            const body = parts[2].trim();
            let needsUpdate = false;
            
            const updates = { ...existing };
            
            // Fix empty or missing title
            if (!updates.title || updates.title === '""' || updates.title === '') {
                updates.title = extractTitle(rawContent, file);
                needsUpdate = true;
                console.log(`🔧 Fixed empty title: ${file} → "${updates.title}"`);
            }
            
            // Fix empty or missing date
            if (!updates.date || updates.date === '""' || updates.date === '') {
                updates.date = DEFAULT_DATE;
                needsUpdate = true;
            }
            
            // Fix empty or missing description
            if (!updates.description || updates.description === '""' || updates.description === '') {
                updates.description = extractDescription(rawContent);
                needsUpdate = true;
            }
            
            // Fix empty or missing tags
            if (!updates.tags || updates.tags === '[]' || updates.tags === '""') {
                updates.tags = JSON.stringify(DEFAULT_TAGS);
                needsUpdate = true;
            }
            
            // Fix empty or missing category
            if (!updates.category || updates.category === '""' || updates.category === '') {
                updates.category = DEFAULT_CAT;
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                // Rebuild front matter with fixes
                const newFrontMatter = `---
title: "${updates.title.replace(/"/g, '\\"')}"
date: ${updates.date}
tags: ${updates.tags}
category: "${updates.category}"
description: "${updates.description.replace(/"/g, '\\"')}"
---
`;
                const newContent = `${newFrontMatter}\n${body}\n`;
                fs.writeFileSync(filePath, newContent);
                fixedCount++;
                console.log(`✅ Fixed front matter: ${file}`);
            } else {
                skippedCount++;
                console.log(`⏭️  Skipped (properly formatted): ${file}`);
            }
            return;
        }
    }

    // No front matter - convert from scratch
    const title = extractTitle(rawContent, file);
    const body = rawContent.trim();
    const description = extractDescription(rawContent);

    const frontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${DEFAULT_DATE}
tags: ${JSON.stringify(DEFAULT_TAGS)}
category: "${DEFAULT_CAT}"
description: "${description.replace(/"/g, '\\"')}"
---
`;

    const newContent = `${frontMatter}\n${body}\n`;
    fs.writeFileSync(filePath, newContent);
    convertedCount++;
    console.log(`✅ Converted: ${file} → "${title}"`);
});

console.log(`\n📊 Summary:`);
console.log(`✅ Converted: ${convertedCount} files`);
console.log(`🔧 Fixed: ${fixedCount} files`);
console.log(`⏭️ Skipped: ${skippedCount} files`);
console.log(`🎉 Total processed: ${convertedCount + fixedCount + skippedCount} files`);