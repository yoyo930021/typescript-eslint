/* eslint-disable no-fallthrough */

import { TSESTree } from '@typescript-eslint/typescript-estree';
import ts from 'typescript';
import * as util from '../util';

export type Options = [
  {
    variables?: {
      ignoredNamesRegex?: string | boolean;
    };
    arguments?: {
      ignoreIfArgsAfterAreUsed?: boolean;
    };
  }
];
export type MessageIds = 'unused' | 'unusedWithIgnorePattern' | 'unusedImport';

export const DEFAULT_IGNORED_REGEX_STRING = '^_';
const IGNORED_NAMES_REGEX = {
  oneOf: [
    {
      type: 'string',
    },
    {
      type: 'boolean',
      enum: [false],
    },
  ],
};
export default util.createRule<Options, MessageIds>({
  name: 'no-unused-vars',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow unused variables and arguments.',
      category: 'Best Practices',
      recommended: 'warn',
    },
    schema: [
      {
        type: 'object',
        properties: {
          variables: {
            type: 'object',
            properties: {
              ignoredNamesRegex: IGNORED_NAMES_REGEX,
            },
            additionalProperties: false,
          },
          arguments: {
            properties: {
              ignoredNamesRegex: IGNORED_NAMES_REGEX,
              ignoreIfArgsAfterAreUsed: {
                type: 'boolean',
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unused: "{{type}} '{{name}}' is declared but its value is never read.",
      unusedWithIgnorePattern:
        "{{type}} '{{name}}' is declared but its value is never read. Allowed unused names must match {{pattern}}",
      unusedImport: 'All imports in import declaration are unused.',
    },
  },
  defaultOptions: [
    {
      variables: {
        ignoredNamesRegex: DEFAULT_IGNORED_REGEX_STRING,
      },
      arguments: {
        ignoreIfArgsAfterAreUsed: false,
      },
    },
  ],
  create(context, [userOptions]) {
    const parserServices = util.getParserServices(context, true);
    const tsProgram = parserServices.program;
    const afterAllDiagnosticsCallbacks: (() => void)[] = [];

    function getIgnoredNames(opt?: { ignoredNamesRegex?: string | boolean }) {
      return opt && typeof opt.ignoredNamesRegex === 'string'
        ? new RegExp(opt.ignoredNamesRegex)
        : null;
    }
    const options = {
      variables: {
        ignoredNames: getIgnoredNames(userOptions.variables),
      },
      arguments: {
        ignoreIfArgsAfterAreUsed:
          userOptions.arguments!.ignoreIfArgsAfterAreUsed || false,
      },
    };

    function handleIdentifier(identifier: ts.Identifier): void {
      function report(type: string): void {
        const node = parserServices.tsNodeToESTreeNodeMap.get(identifier);
        const regex = options.variables.ignoredNames;
        const name = identifier.getText();
        if (regex) {
          if (!regex.test(name)) {
            context.report({
              node,
              messageId: 'unusedWithIgnorePattern',
              data: {
                name,
                type,
                pattern: regex.toString(),
              },
            });
          }
        } else {
          context.report({
            node,
            messageId: 'unused',
            data: {
              name,
              type,
            },
          });
        }
      }

      const parent = identifier.parent;

      // is a single variable diagnostic
      switch (parent.kind) {
        case ts.SyntaxKind.BindingElement:
        case ts.SyntaxKind.ObjectBindingPattern:
          report('Destructured Variable');
          break;

        case ts.SyntaxKind.ClassDeclaration:
          report('Class');
          break;

        case ts.SyntaxKind.EnumDeclaration:
          report('Enum');
          break;

        case ts.SyntaxKind.FunctionDeclaration:
          report('Function');
          break;

        // this won't happen because there are specific nodes that wrap up named/default import identifiers
        // case ts.SyntaxKind.ImportDeclaration:
        // import equals is always treated as a variable
        case ts.SyntaxKind.ImportEqualsDeclaration:
        // the default import is NOT used, but a named import is used
        case ts.SyntaxKind.ImportClause:
        // a named import is NOT used, but either another named import, or the default import is used
        case ts.SyntaxKind.ImportSpecifier:
        // a namespace import is NOT used, but the default import is used
        case ts.SyntaxKind.NamespaceImport:
          report('Import');
          break;

        case ts.SyntaxKind.InterfaceDeclaration:
          report('Interface');
          break;

        case ts.SyntaxKind.MethodDeclaration:
          report('Method');
          break;

        case ts.SyntaxKind.Parameter:
          handleParameterDeclaration(
            identifier,
            parent as ts.ParameterDeclaration,
          );
          break;

        case ts.SyntaxKind.PropertyDeclaration:
          report('Property');
          break;

        case ts.SyntaxKind.TypeAliasDeclaration:
          report('Type');
          break;

        case ts.SyntaxKind.VariableDeclaration:
          report('Variable');
          break;

        default:
          throw new Error(`Unknown node with kind ${parent.kind}.`);
        // TODO - should we just handle this gracefully?
        // report('Unknown Node');
        // break;
      }
    }

    const unusedParameters = new Set<ts.Identifier>();
    function handleParameterDeclaration(
      identifier: ts.Identifier,
      parent: ts.ParameterDeclaration,
    ): void {
      const name = identifier.getText();
      // regardless of if the paramter is ignored, track that it had a diagnostic fired on it
      unusedParameters.add(identifier);

      /*
      NOTE - Typescript will automatically ignore parameters that have a
             leading underscore in their name. We cannot do anything about this.
      */

      function report() {
        const node = parserServices.tsNodeToESTreeNodeMap.get(identifier);
        context.report({
          node,
          messageId: 'unused',
          data: {
            name,
            type: 'Parameter',
          },
        });
      }

      const isLastParameter =
        parent.parent.parameters.indexOf(parent) ===
        parent.parent.parameters.length - 1;
      if (!isLastParameter && options.arguments.ignoreIfArgsAfterAreUsed) {
        // once all diagnostics are processed, we can check if the following args are unused
        afterAllDiagnosticsCallbacks.push(() => {
          for (const param of parent.parent.parameters) {
            if (isDestructure(param.name)) {
              // TODO - support destructuring
              return;
            }

            if (!unusedParameters.has(param.name as ts.Identifier)) {
              return;
            }
          }

          // none of the following params were unused, so report
          report();
        });
      } else {
        report();
      }
    }

    function handleImportDeclaration(parent: ts.ImportDeclaration): void {
      // the entire import statement is unused

      /*
      NOTE - Typescript will automatically ignore imports that have a
            leading underscore in their name. We cannot do anything about this.
      */

      context.report({
        messageId: 'unusedImport',
        node: parserServices.tsNodeToESTreeNodeMap.get(parent),
      });
    }

    function handleDestructure(parent: ts.BindingPattern): void {
      // the entire desctructure is unused
      // note that this case only ever triggers for simple, single-level destructured objects
      // i.e. these will not trigger it:
      // - const {a:_a, b, c: {d}} = z;
      // - const [a, b] = c;

      parent.elements.forEach(element => {
        if (element.kind === ts.SyntaxKind.BindingElement) {
          const name = element.name;
          if (name.kind === ts.SyntaxKind.Identifier) {
            handleIdentifier(name);
          }
        }
      });
    }

    return {
      'Program:exit'(program: TSESTree.Node) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(program);
        const sourceFile = util.getSourceFileOfNode(tsNode);
        const diagnostics = tsProgram.getSemanticDiagnostics(sourceFile);

        diagnostics.forEach(diag => {
          if (isUnusedDiagnostic(diag.code)) {
            if (diag.start !== undefined) {
              const node = util.getTokenAtPosition(sourceFile, diag.start);
              const parent = node.parent;
              if (isIdentifier(node)) {
                handleIdentifier(node);
              } else if (isImport(parent)) {
                handleImportDeclaration(parent);
              } else if (isDestructure(parent)) {
                handleDestructure(parent);
              }
            }
          }
        });

        // trigger all the checks to be done after all the diagnostics have been evaluated
        afterAllDiagnosticsCallbacks.forEach(cb => cb());
      },
    };
  },
});

/**
 * Checks if the diagnostic code is one of the expected "unused var" codes
 */
function isUnusedDiagnostic(code: number): boolean {
  return [
    6133, // '{0}' is declared but never used.
    6138, // Property '{0}' is declared but its value is never read.
    6192, // All imports in import declaration are unused.
    6196, // '{0}' is declared but its value is never read.
    6198, // All destructured elements are unused.
    6199, // All variables are unused.
    6205, // All type parameters are unused.
  ].includes(code);
}

/**
 * Checks if the given node is a destructuring pattern
 */
function isDestructure(node: ts.Node): node is ts.BindingPattern {
  return (
    node.kind === ts.SyntaxKind.ObjectBindingPattern ||
    node.kind === ts.SyntaxKind.ArrayBindingPattern
  );
}

function isImport(node: ts.Node): node is ts.ImportDeclaration {
  return node.kind === ts.SyntaxKind.ImportDeclaration;
}

function isIdentifier(node: ts.Node): node is ts.Identifier {
  return node.kind === ts.SyntaxKind.Identifier;
}
