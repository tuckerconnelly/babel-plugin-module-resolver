import path from 'path';
import findBabelConfig from 'find-babel-config';
import mapToRelative from './mapToRelative';

function createAliasFileMap(pluginOpts) {
    const alias = pluginOpts.alias || {};
    return Object.keys(alias).reduce((memo, expose) => (
        Object.assign(memo, {
            [expose]: alias[expose]
        })
    ), {});
}

export function mapModule(source, file, pluginOpts, cwd) {
    // Do not map source starting with a dot
    if (source[0] === '.') {
        return null;
    }

    // Search the file under the custom root directories
    const rootDirs = pluginOpts.root || [];
    for (let i = 0; i < rootDirs.length; i++) {
        try {
            // check if the file exists (will throw if not)
            const p = path.resolve(rootDirs[i], source);
            require.resolve(p);
            return mapToRelative(cwd, file, p);
        } catch (e) {
            // empty...
        }
    }

    // The source file wasn't found in any of the root directories. Lets try the alias
    const aliasMapping = createAliasFileMap(pluginOpts);
    const moduleSplit = source.split('/');

    let aliasPath;
    while (moduleSplit.length) {
        const m = moduleSplit.join('/');
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

    const newPath = source.replace(moduleSplit.join('/'), aliasPath);
    return mapToRelative(cwd, file, newPath);
}

export default ({ types: t }) => {
    function transformRequireCall(nodePath, state, cwd) {
        if (
            !t.isIdentifier(nodePath.node.callee, { name: 'require' }) &&
                !(
                    t.isMemberExpression(nodePath.node.callee) &&
                    t.isIdentifier(nodePath.node.callee.object, { name: 'require' })
                )
        ) {
            return;
        }

        const moduleArg = nodePath.node.arguments[0];
        if (moduleArg && moduleArg.type === 'StringLiteral') {
            const modulePath = mapModule(moduleArg.value, state.file.opts.filename, state.opts, cwd);
            if (modulePath) {
                nodePath.replaceWith(t.callExpression(
                    nodePath.node.callee, [t.stringLiteral(modulePath)]
                ));
            }
        }
    }

    function transformImportCall(nodePath, state, cwd) {
        const moduleArg = nodePath.node.source;
        if (moduleArg && moduleArg.type === 'StringLiteral') {
            const modulePath = mapModule(moduleArg.value, state.file.opts.filename, state.opts, cwd);
            if (modulePath) {
                nodePath.replaceWith(t.importDeclaration(
                    nodePath.node.specifiers,
                    t.stringLiteral(modulePath)
                ));
            }
        }
    }

    return {
        pre(file) {
            const startPath = (file.opts.filename === 'unknown')
                ? './'
                : file.opts.filename;

            const { file: babelFile } = findBabelConfig.sync(startPath);
            this.moduleResolverCWD = babelFile
                ? path.dirname(babelFile)
                : process.cwd();
        },

        visitor: {
            CallExpression: {
                exit(nodePath, state) {
                    return transformRequireCall(nodePath, state, this.moduleResolverCWD);
                }
            },
            ImportDeclaration: {
                exit(nodePath, state) {
                    return transformImportCall(nodePath, state, this.moduleResolverCWD);
                }
            }
        }
    };
};
