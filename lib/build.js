
function gitCheckoutMaster(appData) {
    return new Promise(function(resolve, reject) {
        var git = require('simple-git')();
        git.checkout(appData.app.dir.public, function(err, data){
            if (err) {reject(err);}
            else {
                console.log('Build: Started');
                resolve();
            }
        });
    });
}
function ignoreUnderscore(file) {
    var path = file.split('/');
    return !path.find(element => element.startsWith('_'));
}
function addFilesToList(appData, dir, obj, list) {
    var name = obj.replace(dir, '');
    var patt = new RegExp("favicon.[^/.]+$")
    if (patt.test(name)) {
        name = name.replace(/\.[^/.]+$/, '');
    }
    var index = list.findIndex(function(element) {
        return element.name == name;
    });
    if (index != -1) {
        list[index].dir = dir;
        list[index].obj = obj;
    }
    else {
        list.push({dir: dir, obj: obj, name: name});
    }
}
function addSiteFile(appData, dir, obj) {
    var ext = obj.split('.').pop();
    if (ext == 'md') {
        addFilesToList(appData, dir, obj, appData.pageSources);
    }
    else if (ext == 'styl') {
        addFilesToList(appData, dir, obj, appData.stylus);
    }
    else {
        addFilesToList(appData, dir, obj, appData.copyFiles);
    }
}
function addLayoutFile(appData, dir, obj, index) {
    addFilesToList(appData, dir, obj, appData.layouts[index]);
}
function loadScripts(dir) {
    if (dir[0] != '/') {
        dir = process.cwd() + '/' + dir;
    }
    var fs = require('fs');
    var result = {};
    if (fs.existsSync(dir)) {
        var files = fs.readdirSync(dir);

        files.forEach(function(file) {
            if (file.endsWith('.js')) {
                var name = file.substr(0, file.length - 3);
                var action = require(dir + name);
                result[name] = action;
            }
        });
    }
    return result;
}
function build(appData, resolve, reject) {

    var avutil = require('../lib/util');
    appData.config = avutil.loadAllConfig(appData);

    /*
     * User Available Data
     */
    appData.site        = {
        pages:      [],
        series:     [],
        categories: [],
        tags:       [],
        dates:      [],
    };

    /*
     * Load Scripts
     */
    var scriptApp   = loadScripts(appData.app.dir.appScript);
    var scriptTheme = loadScripts(appData.app.dir.themeScript);
    var scriptblog  = loadScripts(appData.app.dir.script);

    /*
     * Internal Meta Data
     */
    appData.dirConfigs  = [];
    appData.pageSources = [];
    appData.stylus      = [];
    appData.copyFiles   = [];
    appData.layouts     = [[({dir: appData.app.dir.appLayout,  obj: appData.app.dir.appLayout + 'page.ejs', name: 'page'})],    // global
                           [],          // theme
                           []];         // application
    Object.assign(appData, scriptApp, scriptTheme, scriptblog);

    var avutil = require('../lib/util');
    var processPages = require('../lib/processPages');
    avutil.cleanDirectory(appData, appData.app.dir.public, '/*')
    .then(() => gitCheckoutMaster(appData))
    .then(() => avutil.processesDir(appData, appData.app.dir.themeSource, ignoreUnderscore, addSiteFile, avutil.buildSiteDir))
    .then(() => avutil.processesDir(appData, appData.app.dir.src, ignoreUnderscore, addSiteFile, avutil.buildSiteDir))
    .then(() => avutil.processesDir(appData, appData.app.dir.themeLayout, ignoreUnderscore, function(appData, dir, obj) {addLayoutFile(appData, dir, obj, 1);}, avutil.buildSkelLayoutDir))
    .then(() => avutil.processesDir(appData, appData.app.dir.layout, ignoreUnderscore, function(appData, dir, obj) {addLayoutFile(appData, dir, obj, 2);}, avutil.buildSkelLayoutDir))
    .then(() => processPages(appData))
    .then(() => avutil.cleanDirectory(appData, appData.app.dir.skelLayout, ''))
    .then(() => console.log('Build: Done'))
    .then(() => {if (resolve){resolve();}}, function(err) {if (reject){reject(err);}else{throw err;}});
}

module.exports = build;

