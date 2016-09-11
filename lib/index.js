'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.mapModule = mapModule;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _findBabelConfig = require('find-babel-config');

var _findBabelConfig2 = _interopRequireDefault(_findBabelConfig);

var _mapToRelative = require('./mapToRelative');

var _mapToRelative2 = _interopRequireDefault(_mapToRelative);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function createAliasFileMap(pluginOpts) {
    var alias = pluginOpts.alias || {};
    return Object.keys(alias).reduce(function (memo, expose) {
        return Object.assign(memo, _defineProperty({}, expose, alias[expose]));
    }, {});
}

function mapModule(source, file, pluginOpts, cwd) {
    // Do not map source starting with a dot
    if (source[0] === '.') {
        return null;
    }

    // Search the file under the custom root directories
    var rootDirs = pluginOpts.root || [];
    for (var i = 0; i < rootDirs.length; i++) {
        try {
            // check if the file exists (will throw if not)
            var p = _path2.default.resolve(rootDirs[i], source);
            require.resolve(p);
            return (0, _mapToRelative2.default)(cwd, file, p);
        } catch (e) {
            // empty...
        }
    }

    // The source file wasn't found in any of the root directories. Lets try the alias
    var aliasMapping = createAliasFileMap(pluginOpts);
    var moduleSplit = source.split('/');

    var aliasPath = void 0;
    while (moduleSplit.length) {
        var m = moduleSplit.join('/');
        if ({}.hasOwnProperty.call(aliasMapping, m)) {
            aliasPath = aliasMapping[m];
            break;
        }
        moduleSplit.pop();
    }

    // no alias mapping found
    if (!aliasPath) {
        return null;
    }

    var newPath = source.replace(moduleSplit.join('/'), aliasPath);
    return (0, _mapToRelative2.default)(cwd, file, newPath);
}

exports.default = function (_ref) {
    var t = _ref.types;

    function transformRequireCall(nodePath, state, cwd) {
        if (!t.isIdentifier(nodePath.node.callee, { name: 'require' }) && !(t.isMemberExpression(nodePath.node.callee) && t.isIdentifier(nodePath.node.callee.object, { name: 'require' }))) {
            return;
        }

        var moduleArg = nodePath.node.arguments[0];
        if (moduleArg && moduleArg.type === 'StringLiteral') {
            var modulePath = mapModule(moduleArg.value, state.file.opts.filename, state.opts, cwd);
            if (modulePath) {
                nodePath.replaceWith(t.callExpression(nodePath.node.callee, [t.stringLiteral(modulePath)]));
            }
        }
    }

    function transformImportCall(nodePath, state, cwd) {
        var moduleArg = nodePath.node.source;
        if (moduleArg && moduleArg.type === 'StringLiteral') {
            var modulePath = mapModule(moduleArg.value, state.file.opts.filename, state.opts, cwd);
            if (modulePath) {
                nodePath.replaceWith(t.importDeclaration(nodePath.node.specifiers, t.stringLiteral(modulePath)));
            }
        }
    }

    return {
        pre: function pre(file) {
            var startPath = file.opts.filename === 'unknown' ? './' : file.opts.filename;

            var _findBabelConfig$sync = _findBabelConfig2.default.sync(startPath);

            var babelFile = _findBabelConfig$sync.file;

            this.moduleResolverCWD = babelFile ? _path2.default.dirname(babelFile) : process.cwd();
        },


        visitor: {
            CallExpression: {
                exit: function exit(nodePath, state) {
                    return transformRequireCall(nodePath, state, this.moduleResolverCWD);
                }
            },
            ImportDeclaration: {
                exit: function exit(nodePath, state) {
                    return transformImportCall(nodePath, state, this.moduleResolverCWD);
                }
            }
        }
    };
};