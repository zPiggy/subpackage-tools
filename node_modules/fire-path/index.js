var Path = require('path');
var FirePath = {};

FirePath.basenameNoExt = function ( path ) {
  return Path.basename(path, Path.extname(path) );
};

FirePath.slash = function ( path ) {
  // var isExtendedLengthPath = /^\\\\\?\\/.test(path);
  // var hasNonAscii = /[^\x00-\x80]+/.test(path);
  // if (isExtendedLengthPath || hasNonAscii) {
  //     return path;
  // }
  return path.replace(/\\/g, '/');
};

FirePath.stripSep = function ( path ) {
  path = Path.normalize(path);
  for ( var i = path.length-1; i >= 0; --i ) {
    if ( path[i] !== Path.sep ) {
      break;
    }
  }
  return path.substring(0,i+1);
};

FirePath.stripExt = function ( path ) {
  var extname = Path.extname(path);
  return path.substring(0, path.length-extname.length);
};

// pathA = foo/bar,         pathB = foo/bar/foobar, return true
// pathA = foo/bar,         pathB = foo/bar,        return true
// pathA = foo/bar/foobar,  pathB = foo/bar,        return false
// pathA = foo/bar/foobar,  pathB = foobar/bar/foo, return false
FirePath.contains = function ( pathA, pathB ) {
  pathA = FirePath.stripSep(pathA);
  pathB = FirePath.stripSep(pathB);

  if ( process.platform === 'win32' ) {
    pathA = pathA.toLowerCase();
    pathB = pathB.toLowerCase();
  }

  //
  if ( pathA === pathB ) {
    return true;
  }

  // never compare files
  if ( Path.dirname(pathA) === Path.dirname(pathB) ) {
    return false;
  }

  if ( pathA.length < pathB.length &&
      pathB.indexOf (pathA + Path.sep) === 0 ) {
        return true;
      }

      return false;
};

//
var _ = {};
var prop;
for ( prop in Path ) {
  _[prop] = Path[prop];
}
for ( prop in FirePath ) {
  _[prop] = FirePath[prop];
}
module.exports = _;
