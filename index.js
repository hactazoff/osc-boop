const Updater = require('osc-boop/util/updater');
const { OSCBOOP } = require('osc-boop/dist/index');
const config = require('./config.json');

(async () => {
    await (new Updater()).load();
    const oscboop = new OSCBOOP(config);

    process.on("SIGINT", function () {
        console.log("\nGracefully shutting down from SIGINT (Crtl-C)");
        oscboop.save();
        process.exit(1);
    });
    
    oscboop.listening();
})();
