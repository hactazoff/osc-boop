const child_process = require('node:child_process');

module.exports = class Updater {
    constructor() { }

    async load() {
        console.log('Installing update...');
        const out = child_process.execSync('npm install');
        console.debug(out.toString());
        console.log('Update done !');
        return 1
    }

    std(data) {
        console.debug(data);
    }
}