const fs = require('fs');
const path = require('path');

const POSTS_PER_PAGE = 20;
const DESCRIPTION_LENGTH = 300;

// Helper function to create URL-safe slugs (must match convert-posts.js)
function createSlug(filename) {
    return filename
        .replace('.md', '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Helper function to parse front matter safely
function parseFrontMatter(frontMatter, filename) {
    const titleMatch = frontMatter.match(/title:\s*"([^"]*)"/) || frontMatter.match(/title:\s*([^\n]+)/);
    const dateMatch = frontMatter.match(/date:\s*([^\n]+)/);
    const descMatch = frontMatter.match(/description:\s*"([^"]*)"/) || frontMatter.match(/description:\s*([^\n]+)/);
    const tagsMatch = frontMatter.match(/tags:\s*([^\n]+)/);
    const categoryMatch = frontMatter.match(/category:\s*"([^"]*)"/) || frontMatter.match(/category:\s*([^\n]+)/);

    // Extract title with fallback
    let title = 'Untitled';
    if (titleMatch && titleMatch[1].trim()) {
        title = titleMatch[1].trim();
    } else {
        // Fallback to filename
        title = filename
            .replace('.md', '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase())
            .replace(/\s+/g, ' ')
            .trim();
        console.warn(`⚠️  Using filename as title for: ${filename}`);
    }

    // Extract date with fallback
    let date = '2000-01-01';
    if (dateMatch && dateMatch[1].trim()) {
        date = dateMatch[1].trim();
    } else {
        console.warn(`⚠️  Using default date for: ${filename}`);
    }

    // Extract description with fallback
    let description = '';
    if (descMatch && descMatch[1].trim()) {
        description = descMatch[1].trim();
    }

    // Parse tags with fallback
    let tags = ['spirituality'];
    if (tagsMatch && tagsMatch[1].trim()) {
        try {
            // Handle both JSON arrays and comma-separated strings
            const tagsValue = tagsMatch[1].trim();
            if (tagsValue.startsWith('[')) {
                tags = JSON.parse(tagsValue);
            } else {
                tags = tagsValue.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
        } catch (e) {
            console.warn(`⚠️  Could not parse tags for ${filename}, using default: ${e.message}`);
        }
    }

    // Extract category with fallback
    let category = 'essays';
    if (categoryMatch && categoryMatch[1].trim()) {
        category = categoryMatch[1].trim();
    }

    return { title, date, description, tags, category };
}

// Read all markdown files from _posts
const postsDir = '_posts';
if (!fs.existsSync(postsDir)) {
    console.error(`❌ Error: Directory ${postsDir} not found. Exiting build.`);
    process.exit(1);
}

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
const allPosts = [];

if (files.length === 0) {
    console.warn('⚠️  No markdown files found in _posts directory.');
}

console.log(`📚 Processing ${files.length} posts...`);

files.forEach(file => {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const parts = content.split('---');
    
    // Skip files with malformed front matter
    if (parts.length < 3) {
        console.warn(`❌ Skipping post: ${file}. Missing or malformed front matter.`);
        return;
    }
    
    const frontMatter = parts[1];
    let postContent = parts[2].trim();
    
    // Parse front matter
    const { title, date, description, tags, category } = parseFrontMatter(frontMatter, file);
    
    // Generate description from content if not provided
    let finalDescription = description;
    if (!finalDescription) {
        finalDescription = postContent
            .replace(/[#*`~>|\[\]\(\)]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, DESCRIPTION_LENGTH)
            .trim() + (postContent.length > DESCRIPTION_LENGTH ? '...' : '');
    }

    const slug = createSlug(file);
    
    allPosts.push({
        id: slug,
        title,
        date,
        description: finalDescription,
        tags,
        category,
        content: postContent
    });
});

// Sort by date (newest first)
allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

console.log(`✅ Processed ${allPosts.length} posts`);

// Create paginated files
const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
const pagesDir = '_data/pages';

if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
}

// Clear existing pages
if (fs.existsSync(pagesDir)) {
    fs.readdirSync(pagesDir).forEach(file => {
        if (file.startsWith('page-') && file.endsWith('.json')) {
            fs.unlinkSync(path.join(pagesDir, file));
        }
    });
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
        category: post.category,
        content: post.content  // Include full content for individual post views
    }));
    
    fs.writeFileSync(
        path.join(pagesDir, `page-${i + 1}.json`),
        JSON.stringify(pagePosts, null, 2)
    );
}

console.log(`📄 Created ${totalPages} paginated pages`);

// Create individual post files for better content loading
const postsDirIndividual = '_data/posts';
if (!fs.existsSync(postsDirIndividual)) {
    fs.mkdirSync(postsDirIndividual, { recursive: true });
}

// Clear existing individual posts
if (fs.existsSync(postsDirIndividual)) {
    fs.readdirSync(postsDirIndividual).forEach(file => {
        if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(postsDirIndividual, file));
        }
    });
}

allPosts.forEach(post => {
    fs.writeFileSync(
        path.join(postsDirIndividual, `${post.id}.json`),
        JSON.stringify(post, null, 2)
    );
});

console.log(`📝 Created ${allPosts.length} individual post files`);

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
console.log(`🔍 Created search index with ${searchIndex.length} entries`);

// Final summary
console.log(`\n🎉 BUILD COMPLETE!`);
console.log(`📊 Summary:`);
console.log(`   • Posts processed: ${allPosts.length}`);
console.log(`   • Paginated pages: ${totalPages}`);
console.log(`   • Individual post files: ${allPosts.length}`);
console.log(`   • Search index entries: ${searchIndex.length}`);
console.log(`\n🚀 Your site is ready for deployment!`);