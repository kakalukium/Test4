const fs = require('fs');
const path = require('path');

const POSTS_PER_PAGE = 20;

// Read all markdown files from _posts
const postsDir = '_posts';
// Check if the directory exists before proceeding
if (!fs.existsSync(postsDir)) {
    console.error(`Error: Directory ${postsDir} not found. Exiting build.`);
    process.exit(1);
}

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

const allPosts = [];

files.forEach(file => {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const parts = content.split('---');
    
    // Ensure the file has front matter (starts and ends with ---)
    if (parts.length < 3) {
        console.warn(`Skipping post: ${file}. Missing or malformed front matter.`);
        return; // Skip this file
    }
    
    const frontMatter = parts[1];
    const postContent = parts[2];
    
    // === FIX: Use safer matching with null checks ===
    const titleMatch = frontMatter.match(/title: "(.*)"/);
    // Note: date: (.*) is used as date is not quoted in the convert-posts.js script
    const dateMatch = frontMatter.match(/date: (.*)/); 

    const title = titleMatch ? titleMatch[1] : `Untitled Post (${file})`;
    const date = dateMatch ? dateMatch[1].trim() : '2000-01-01'; // Default date to prevent sorting errors
    
    // Check if the title is still the default (meaning conversion failed badly)
    if (!titleMatch) {
        console.warn(`Warning: Could not extract title for ${file}. Using default title.`);
    }

    allPosts.push({
        id: file.replace('.md', ''),
        title,
        date,
        content: postContent.trim()
    });
});

// Sort by date
allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Create paginated files
const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);

// Create target directory if it doesn't exist
const pagesDir = '_data/pages';
if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
}

for (let i = 0; i < totalPages; i++) {
    const start = i * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const pagePosts = allPosts.slice(start, end).map(post => ({
        id: post.id,
        title: post.title,
        date: post.date,
        // Only include a snippet of content for the paginated list
        description: post.content.substring(0, 150) + (post.content.length > 150 ? '...' : '')
    }));
    
    fs.writeFileSync(
        path.join(pagesDir, `page-${i + 1}.json`),
        JSON.stringify(pagePosts, null, 2)
    );
}

// Create search index
const searchIndex = allPosts.map(post => ({
    id: post.id,
    title: post.title,
    date: post.date,
    category: 'essays', // Add default category if not present in front matter
    content: post.content.substring(0, 200) // First 200 chars for search
}));

fs.writeFileSync('_data/search-index.json', JSON.stringify(searchIndex, null, 2));
console.log(`✅ Built ${allPosts.length} posts into ${totalPages} pages and search index.`);