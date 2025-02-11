import { is, NodePath, traverse } from 'estree-toolkit';
import MagicString from 'magic-string';
import path from 'node:path';
import { ProgramNode, SourceMap, TransformPluginContext } from 'rollup';
import { SourceMapConsumer } from 'source-map';

import { assertAstLocation } from '../../utility/implementation/assertAstLocation.js';
import { getLocation } from '../../utility/implementation/getLocation.js';

import { constants } from './constants.js';

export type TransformResult =
    | { code: string; map: SourceMap; ast?: ProgramNode }
    | undefined;

export type Transformer = (
    code: string,
    id: string,
    context: TransformPluginContext,
    log: (message: string) => void,
) => TransformResult | Promise<TransformResult>;

export interface TransformSetup {
    identifiableSigils: readonly string[];
    roots: readonly string[];
    projectName: string;
}

export function createTransform({
    identifiableSigils,
    roots: rawRoots,
    projectName,
}: TransformSetup): Transformer {
    const identifiableFunctions = new Set(identifiableSigils);

    const roots = rawRoots.map((x) =>
        path.isAbsolute(x) ? x : path.resolve(x),
    );

    return async (
        code: string,
        id: string,
        context: TransformPluginContext,
        log: (message: string) => void,
    ) => {
        const ast = context.parse(code);

        log(`== Transforming code == \n${code}\n== End code ==`);

        const rawSourceMap = context.getCombinedSourcemap();
        const sourceMap = await new SourceMapConsumer(rawSourceMap);

        const magicString = new MagicString(code);

        // This is used for assigning incremental identifiers when the signal
        // doesn't have an obvious name.
        const counters = new Map<string, number>();
        const next = (sigil: string) => {
            const found = counters.get(sigil);
            if (found !== undefined) {
                const next = found + 1;
                counters.set(sigil, next);
                return next;
            } else {
                counters.set(sigil, 1);
                return 1;
            }
        };

        const filename = getUsefulFilenameFromId(id, roots, projectName + ':');

        traverse(ast, {
            CallExpression(path) {
                if (!path.node) {
                    return;
                }
                assertAstLocation(path.node);

                if (is.identifier(path.node.callee)) {
                    if (identifiableFunctions.has(path.node.callee.name)) {
                        const ignore = shouldIgnore(path);
                        if (ignore) {
                            log('Removing ignore marker');
                            magicString.remove(...ignore);
                        } else {
                            const name = getVariableOrPropertyName(
                                path,
                                path.node.callee.name,
                                next,
                            );

                            log(
                                `Found ${path.node.callee.name} named ${name} at offset ${path.node.start}`,
                            );

                            const [funcName, mappedLine, mappedColumn] =
                                getLocation(code, path, path.node);

                            log(
                                `Transformed location ${mappedLine}:${mappedColumn} function ${funcName}`,
                            );

                            const { line, column: columnZeroBased } =
                                sourceMap.originalPositionFor({
                                    line: mappedLine,
                                    column:
                                        mappedColumn -
                                        1 /* We're using 1-based, but the library is 0-based */,
                                });
                            const column =
                                columnZeroBased === null
                                    ? null
                                    : columnZeroBased + 1; // The SourceMap library uses 0-based columns, and we want 1-based

                            log(`Original location ${line}:${column}`);

                            magicString.appendRight(
                                path.node.end,
                                `./* rollup-plugin-ptolemy: */${constants.identify}(${JSON.stringify(name)}, ${JSON.stringify(filename)}, ${JSON.stringify(funcName)}, ${JSON.stringify(line)}, ${JSON.stringify(column)})`,
                            );
                        }
                    } else if (
                        path.node.callee.name == constants.insertLocation
                    ) {
                        const location = getLocation(code, path, path.node);
                        const toInject = [filename, ...location];

                        magicString.update(
                            path.node.start,
                            path.node.end,
                            '/* rollup-plugin-ptolemy: */' +
                                JSON.stringify(toInject),
                        );
                    }
                }
            },
        });

        if (magicString.hasChanged()) {
            const map = magicString.generateMap({
                source: id,
                file: id + '.map',
                includeContent: true,
            });
            return { code: magicString.toString(), map };
        }

        log('Finished');
        return;
    };
}

function getVariableOrPropertyName(
    path: NodePath,
    sigil: string,
    nextCount: (name: string) => number,
): string | undefined {
    if (is.variableDeclarator(path.parent) && is.identifier(path.parent.id)) {
        return path.parent.id.name;
    } else if (
        is.property(path.parent) &&
        path.parent.kind === 'init' &&
        is.identifier(path.parent.key)
    ) {
        return path.parent.key.name;
    } else {
        return `${sigil}-${nextCount(sigil)}`;
    }
}

function getUsefulFilenameFromId(
    id: string,
    resolvedRoots: readonly string[],
    prefix: string,
) {
    let filePath = path.normalize(id);

    let matched = false;

    for (const root of resolvedRoots) {
        if (filePath.startsWith(root + path.sep)) {
            matched = true;
            // remove matched root prefix
            filePath = filePath.substring(root.length + 1);
        }
    }

    if (!matched) {
        // <unknown>/<filenameOnly>
        filePath = '<unknown>/' + path.basename(filePath);
    }

    return prefix + filePath;
}

function shouldIgnore(
    pathOfSigilCall: NodePath,
): undefined | [start: number, end: number] {
    // $mutable(1).doNotIdentify()
    // in this case the pathOfSigilCall is $mutable(1)
    // where the callee would be a MemberExpression inside
    // a CallExpression

    const memberExpression = pathOfSigilCall.parentPath;
    if (!memberExpression || !is.memberExpression(memberExpression.node)) {
        return undefined;
    }

    if (
        !is.identifier(memberExpression.node.property) ||
        memberExpression.node.property.name !== constants.doNotIdentify
    ) {
        return undefined;
    }

    const callExpression = memberExpression.parentPath;
    if (!callExpression || !is.callExpression(callExpression.node)) {
        return undefined;
    }

    // parent exists and is a MemberExpression
    // the member property is an identify with name 'doNotIdentify'
    // the next parent is a call expression
    // So we should be matching $sigil().doNotIdentify()

    assertAstLocation(memberExpression.node.object);
    assertAstLocation(callExpression.node);

    return [memberExpression.node.object.end, callExpression.node.end];
}
