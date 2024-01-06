const fs = require('fs/promises');

(async () => {
  await fs.rmdir('./dist/template/.git', { recursive: true })
})();