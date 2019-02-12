/**
 * @fileoverview Disallows awaiting a value that is not a Promise
 */
'use strict';

import * as ts from 'typescript';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import * as util from '../util';

export default util.createRule({
  name: 'require-await-thenable',
  defaultOptions: [],

  meta: {
    docs: {
      description: 'Disallows awaiting a value that is not a Promise',
      category: 'Best Practices',
      recommended: 'error'
    },
    fixable: undefined,
    messages: {
      requireThenable: "'await' expression requires a Thenable value."
    },
    schema: [],
    type: 'problem'
  },

  create(context) {
    const parserServices = util.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();

    function isThenable(type: ts.Type): boolean {
      // Process each type in the union type because `type.getProperty()` method
      // doesn't return the property if one of those types has the property.
      if (type.isUnion()) {
        return type.types.some(isThenable);
      }

      // - `type.getProperty()` method works for type parameters as well.
      //   But it doesn't work for union types, so if the constraint type is
      //   union type, it doesn't work as expected.
      // - `type.getConstraint()` method doesn't return the constraint type of
      //   type parameters for some reason.
      //   So this gets the constraint type via AST.
      // - `type.isTypeParameter()` method doesn't work properly for some reason.
      if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) {
        const node = type.symbol.declarations[0] as ts.TypeParameterDeclaration;
        return (
          node.constraint != null &&
          isThenable(checker.getTypeFromTypeNode(node.constraint))
        );
      }

      // It's thenable if `then` member exists.
      return type.getProperty('then') != null;
    }

    return {
      AwaitExpression(node: TSESTree.AwaitExpression) {
        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.argument);
        const type = checker.getTypeAtLocation(tsNode);

        if (!isThenable(type)) {
          context.report({ node, messageId: 'requireThenable' });
        }
      }
    };
  }
});
