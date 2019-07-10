import { TSESTree } from '@typescript-eslint/typescript-estree';
import ts from 'typescript';
import * as util from '../util';

type Options = [
  {
    ignoredNamesRegex?: string | boolean;
  }
];
type MessageIds = 'unusedVar' | 'unusedVarWithIgnorePattern';

export default util.createRule<Options, MessageIds>({
  name: 'no-unused-vars',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow unused variables',
      category: 'Variables',
      recommended: 'warn',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoredNamesRegex: {
            oneOf: [{ type: 'string' }, { type: 'boolean', enum: ['false'] }],
          },
        },
      },
    ],
    messages: {
      unusedVar: "'{{name}}' is declared but its value is never read.",
      unusedVarWithIgnorePattern:
        "'{{name}}' is declared but its value is never read. Allowed unused vars must match {{pattern}}",
    },
  },
  defaultOptions: [
    {
      ignoredNamesRegex: '^_.+',
    },
  ],
  create(context, [{ ignoredNamesRegex }]) {
    const parserServices = util.getParserServices(context);
    const parserServices = util.getParserServices(context, true);
    const tsProgram = parserServices.program;

    const ignoredNames =
      typeof ignoredNamesRegex === 'string'
        ? new RegExp(ignoredNamesRegex)
        : null;

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

    return {
      'Program:exit'(node: TSESTree.Node) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
        const sourceFile = util.getSourceFileOfNode(tsNode);
        const diagnostics = tsProgram.getSemanticDiagnostics(sourceFile);

        diagnostics.forEach(diag => {
          if (isUnusedDiagnostic(diag.code)) {
            if (diag.start) {
              const diagNode = util.getTokenAtPosition(sourceFile, diag.start);
              if (diagNode.kind === ts.SyntaxKind.Identifier) {
                const identifier = diagNode as ts.Identifier;
                const variableName = identifier.getText();
                if (ignoredNames && ignoredNames.exec(variableName) === null) {
                  context.report({
                    node: parserServices.tsNodeToESTreeNodeMap.get(identifier),
                    messageId: 'unusedVarWithIgnorePattern',
                    data: {
                      name: variableName,
                      pattern: ignoredNamesRegex,
                    },
                  });
                }
              }
            }
          }
        });
      },
    };
  },
});
