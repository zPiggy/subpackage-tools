var Fs = require('fs');
var FsExtra = require('fs-extra');
var FireFs = {};

/**
 * check if a given path exists
 * @method exists
 * @param {string} path
 * @param {function} callback
 */

function exists (path, callback) {
    Fs.stat(path, function (err) {
        callback(checkErr(err));
    });
}

FireFs.exists = exists;

/**
 * check if a given path exists, this is the sync version of FireFs.exists
 * @method existsSync
 * @param {string} path
 * @return {boolean}
 */
function existsSync(path) {
    if ( path === null || path === undefined )
        return false;

    try {
        Fs.statSync(path);
        return true;
    } catch (err) {
        return checkErr(err);
    }
}

FireFs.existsSync = existsSync;

/**
* @function checkErr
* @param {Error|null} err The error value.
* @return {Boolean} A boolean representing if the file exists or not.
*/
function checkErr(err) {
    return err && (err.code === "ENOENT" || err.code === "ENOTDIR") ? false : true;
}

/**
 * check if a given path exists and is a directory
 * @method isDir
 * @param {string} path
 * @param {function} callback
 */

FireFs.isDir = function (path, callback) {
    if ( !path ) {
        callback( null, false );
        return;
    }

    Fs.stat(path, function (err, stats) {
        if (err && err.code === "ENOENT") return callback( null, false );
        else {
            if (stats.isDirectory()) return callback( null, true );
            else return callback( null, false );
        }
    });
};

/**
 * check if a given path exists and is directory synchronously
 * @method isDirSync
 * @param {string} path
 * @return {boolean}
 */
FireFs.isDirSync = function (path) {
    if ( !path )
        return false;

    try {
        var stats = Fs.statSync(path);
        if (stats.isDirectory()) return true;
        else return false;
    } catch (err) {
        return checkErr(err);
    }
};

//
var _ = {};
var prop;
for ( prop in Fs ) {
    _[prop] = Fs[prop];
}
for ( prop in FsExtra ) {
    _[prop] = FsExtra[prop];
}
for ( prop in FireFs ) {
    _[prop] = FireFs[prop];
}
module.exports = _;
