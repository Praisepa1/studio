import { searchManager } from './src/core/search/manager';

async function main() {
  const queries = [
    "team",
    '"founder" london',
    '"speaker" CTO fintech london'
  ];

  for (const query of queries) {
    console.log(`\n\n=== Benchmarking Query: ${query} ===`);
    try {
      const results = await searchManager.search({
        term: query,
        limit: 10,
        targetType: 'company',
        category: 'company_site'
      });
      console.log(`Found ${results.length} results.`);
      results.forEach((r, i) => {
        console.log(`\n[Result ${i + 1}]`);
        console.log(`Title: ${r.title}`);
        console.log(`URL: ${r.url}`);
        console.log(`Snippet: ${r.snippet}`);
      });
    } catch (error) {
      console.error(`Error for query "${query}":`, error);
    }
  }
}

main().catch(console.error);
