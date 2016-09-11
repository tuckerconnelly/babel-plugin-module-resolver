'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = mapToRelative;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function resolve(cwd, filename) {
    if (_path2.default.isAbsolute(filename)) return filename;
    return _path2.default.resolve(cwd, filename);
}

function toPosixPath(modulePath) {
    return modulePath.replace(/\\/g, '/');
}

function mapToRelative(cwd, currentFile, module) {
    var from = _path2.default.dirname(currentFile);
    var to = _path2.default.normalize(module);

    from = resolve(cwd, from);
    to = resolve(cwd, to);

    var moduleMapped = _path2.default.relative(from, to);

    moduleMapped = toPosixPath(moduleMapped);

    // Support npm modules instead of directories
    if (moduleMapped.indexOf('npm:') !== -1) {
        var _moduleMapped$split = moduleMapped.split('npm:');

        var _moduleMapped$split2 = _slicedToArray(_moduleMapped$split, 2);

        var npmModuleName = _moduleMapped$split2[1];

        return npmModuleName;
    }

    if (moduleMapped[0] !== '.') moduleMapped = './' + moduleMapped;

    return moduleMapped;
}