import { TSESTree } from '@typescript-eslint/typescript-estree';
import ts from 'typescript';
import * as util from '../util';

type Options = [
  {
    variables?: {
      ignoredNamesRegex?: string | boolean;
    };
    arguments?: {
      ignoredNamesRegex?: string | boolean;
      ignoreIfArgsAfterAreUsed?: boolean;
    };
  }
];
type MessageIds = 'unused' | 'unusedWithIgnorePattern';

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
      description: 'Disallow unused variables and arguments',
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
      unused: "'{{name}}' is declared but its value is never read.",
      unusedWithIgnorePattern:
        "'{{name}}' is declared but its value is never read. Allowed unused names must match {{pattern}}",
    },
  },
  defaultOptions: [
    {
      variables: {
        ignoredNamesRegex: DEFAULT_IGNORED_REGEX_STRING,
      },
      arguments: {
        ignoredNamesRegex: DEFAULT_IGNORED_REGEX_STRING,
        ignoreIfArgsAfterAreUsed: false,
      },
    },
  ],
  create(context, [userOptions]) {
    const parserServices = util.getParserServices(context, true);
    const tsProgram = parserServices.program;

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
        ignoredNames: getIgnoredNames(userOptions.arguments),
        ignoreIfArgsAfterAreUsed:
          userOptions.arguments!.ignoreIfArgsAfterAreUsed || false,
      },
    };

    function handleVariable(identifier: ts.Identifier): void {
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
          },
        });
      }
    }

    const unusedParameters = new Set<ts.Identifier>();
    function handleParameter(
      identifier: ts.Identifier,
      parent: ts.ParameterDeclaration,
    ): void {
      const name = identifier.getText();
      // regardless of if the paramter is ignored, track that it had a diagnostic fired on it
      unusedParameters.add(identifier);
      const regex = options.arguments.ignoredNames;
      if (regex && regex.test(name)) {
        // is an ignored name
        return;
      }

      function report() {
        const node = parserServices.tsNodeToESTreeNodeMap.get(identifier);
        if (regex) {
          context.report({
            node,
            messageId: 'unusedWithIgnorePattern',
            data: {
              name,
              pattern: regex.toString(),
            },
          });
        } else {
          context.report({
            node,
            messageId: 'unused',
            data: {
              name,
            },
          });
        }
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

    const afterAllDiagnosticsCallbacks: (() => void)[] = [];
    return {
      'Program:exit'(program: TSESTree.Node) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(program);
        const sourceFile = util.getSourceFileOfNode(tsNode);
        const diagnostics = tsProgram.getSemanticDiagnostics(sourceFile);

        diagnostics.forEach(diag => {
          if (isUnusedDiagnostic(diag.code)) {
            if (diag.start) {
              const node = util.getTokenAtPosition(sourceFile, diag.start);
              const parent = node.parent;
              if (parent && node.kind === ts.SyntaxKind.Identifier) {
                // is a single variable diagnostic
                switch (parent.kind) {
                  case ts.SyntaxKind.VariableDeclaration:
                    handleVariable(node as ts.Identifier);
                    break;

                  case ts.SyntaxKind.Parameter:
                    handleParameter(
                      node as ts.Identifier,
                      parent as ts.ParameterDeclaration,
                    );
                    break;
                }
              } else if (parent && isDestructure(node)) {
                // TODO - support destructuring
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
function isDestructure(node: ts.Node): boolean {
  return (
    node.kind === ts.SyntaxKind.ObjectBindingPattern ||
    node.kind === ts.SyntaxKind.ArrayBindingPattern
  );
}
