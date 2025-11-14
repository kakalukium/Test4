/*G:\Main Files\Workspaces\Site2\Test4\scripts\build-content.js*/
const fs = require('fs');
const path = require('path');

const POSTS_PER_PAGE = 20;

// Read all markdown files from _posts
const postsDir = '_posts';
if (!fs.existsSync(postsDir)) {
    console.error(`Error: Directory ${postsDir} not found. Exiting build.`);
    process.exit(1);
}

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
const allPosts = [];

files.forEach(file => {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const parts = content.split('---');
    
    // Skip files with malformed front matter
    if (parts.length < 3) {
        console.warn(`Skipping post: ${file}. Missing or malformed front matter.`);
        return;
    }
    
    const frontMatter = parts[1];
    const postContent = parts[2].trim();
    
    // === IMPROVED PARSING WITH BETTER REGEX ===
    const titleMatch = frontMatter.match(/title:\s*"(.*)"/);
    const dateMatch = frontMatter.match(/date:\s*(.+)/);
    const descMatch = frontMatter.match(/description:\s*"(.*)"/);
    const tagsMatch = frontMatter.match(/tags:\s*(.+)/);
    const categoryMatch = frontMatter.match(/category:\s*"(.+)"/);

    const title = titleMatch ? titleMatch[1] : `Untitled – ${file.replace('.md', '')}`;
    const date = dateMatch ? dateMatch[1].trim() : '2000-01-01';
    
    // Use description from front matter or generate from content
    let description = descMatch ? descMatch[1] : postContent.substring(0, 150).replace(/[#*`]/g, '').replace(/\s+/g, ' ').trim() + (postContent.length > 150 ? '...' : '');
    
    // Parse tags and category with fallbacks
    let tags = ['spirituality'];
    if (tagsMatch) {
        try {
            tags = JSON.parse(tagsMatch[1]);
        } catch (e) {
            console.warn(`Could not parse tags for ${file}, using default`);
        }
    }
    
    const category = categoryMatch ? categoryMatch[1] : 'essays';

    allPosts.push({
        id: file.replace('.md', ''),
        title,
        date,
        description,
        tags,
        category,
        content: postContent
    });
});

// Sort by date (newest first)
allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Create paginated files
const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
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
        description: post.description,
        date: post.date,
        tags: post.tags,
        category: post.category
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
    description: post.description,
    date: post.date,
    tags: post.tags,
    category: post.category,
    content: post.content.substring(0, 200) // First 200 chars for search
}));

if (!fs.existsSync('_data')) {
    fs.mkdirSync('_data', { recursive: true });
}

fs.writeFileSync('_data/search-index.json', JSON.stringify(searchIndex, null, 2));
console.log(`✅ Built ${allPosts.length} posts into ${totalPages} pages and search index.`);