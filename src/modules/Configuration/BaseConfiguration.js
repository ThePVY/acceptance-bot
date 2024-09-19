import fs from 'fs';
import _ from 'lodash';

class BaseConfiguration {
  configuration;
  path;
  watcher;

  constructor(path) {
    this.path = path;
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '{}');
    }
    this.configuration = JSON.parse(fs.readFileSync(path));

    this.watcher = fs.watch(path, _.debounce(async (eventType) => {
      if (eventType === 'close') {
        return;
      }
      this.configuration = JSON.parse(await fs.promises.readFile(path));
    }, 500));
  }

  get(root) {
    return _.get(this.configuration, root);
  }

  async deleteConfig() {
    this.watcher.close();
    return fs.promises.unlink(this.path);
  }

  async setProperty(root, value) {
    _.set(this.configuration, root, value);
    await fs.promises.writeFile(this.path, JSON.stringify(this.configuration, null, 2));
  }
}

export default BaseConfiguration;