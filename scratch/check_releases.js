const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/Manish6523/local-media-server/releases',
  headers: { 'User-Agent': 'NodeJS' }
};

https.get(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const releases = JSON.parse(body);
      console.log("Latest Releases:");
      releases.slice(0, 3).forEach(r => {
        console.log(`- Tag: ${r.tag_name}, Name: ${r.name}, Draft: ${r.draft}, Prerelease: ${r.prerelease}, Created: ${r.created_at}`);
        console.log(`  Assets:`);
        r.assets.forEach(a => {
          console.log(`    * ${a.name} (${a.size} bytes)`);
        });
      });
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      console.log("Raw Response body:", body);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
