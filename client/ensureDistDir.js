const fs = require('fs');
const ensure = path => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}
ensure('./dist');
