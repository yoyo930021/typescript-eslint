import { TSESLint } from '@typescript-eslint/experimental-utils';
import path from 'path';
import rule, {
  MessageIds,
  Options,
} from '../../src/rules/prefer-nullish-coalescing';
import { RuleTester } from '../RuleTester';

const rootPath = path.join(process.cwd(), 'tests/fixtures/');

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: rootPath,
    project: './tsconfig.json',
  },
});

const types = ['string', 'number', 'boolean', 'object'];
const nullishTypes = ['null', 'undefined', 'null | undefined'];
ruleTester.run('prefer-nullish-coalescing', rule, {
  valid: [
    ...types.map(
      type => `
declare const x: ${type};
x || 'foo';
      `,
    ),
    ...types.map(
      type => `
declare const x: ${type} | null;
x ?? 'foo';
      `,
    ),

    ...types.map<TSESLint.ValidTestCase<Options>>(type => ({
      code: `
declare const x: ${type} | null;
x || 'foo' ? null : null;
      `,
      options: [{ ignoreConditionalTests: true }],
    })),
    ...types.map<TSESLint.ValidTestCase<Options>>(type => ({
      code: `
declare const x: ${type} | null;
if (x || 'foo') {}
      `,
      options: [{ ignoreConditionalTests: true }],
    })),
    ...types.map<TSESLint.ValidTestCase<Options>>(type => ({
      code: `
declare const x: ${type} | null;
do {} while (x || 'foo')
      `,
      options: [{ ignoreConditionalTests: true }],
    })),
    ...types.map<TSESLint.ValidTestCase<Options>>(type => ({
      code: `
declare const x: ${type} | null;
for (;x || 'foo';) {}
      `,
      options: [{ ignoreConditionalTests: true }],
    })),
    ...types.map<TSESLint.ValidTestCase<Options>>(type => ({
      code: `
declare const x: ${type} | null;
while (x || 'foo') {}
      `,
      options: [{ ignoreConditionalTests: true }],
    })),
  ],
  invalid: [
    ...nullishTypes.reduce<TSESLint.InvalidTestCase<MessageIds, Options>[]>(
      (acc, nullish) => {
        const cases = types.map(type => ({
          code: `
declare const x: ${type} | ${nullish};
x || 'foo';
          `,
          output: `
declare const x: ${type} | ${nullish};
x ?? 'foo';
          `,
          errors: [
            {
              messageId: 'preferNullish',
              line: 3,
              column: 3,
              endLine: 3,
              endColumn: 5,
            } as const,
          ],
        }));
        acc.push(...cases);

        return acc;
      },
      [],
    ),

    ...nullishTypes.reduce<TSESLint.InvalidTestCase<MessageIds, Options>[]>(
      (acc, nullish) => {
        acc.push(
          ...types.map<TSESLint.InvalidTestCase<MessageIds, Options>>(type => ({
            code: `
declare const x: ${type} | ${nullish};
x || 'foo' ? null : null;
            `,
            output: `
declare const x: ${type} | ${nullish};
x ?? 'foo' ? null : null;
            `,
            options: [{ ignoreConditionalTests: false }],
            errors: [
              {
                messageId: 'preferNullish',
                line: 3,
                column: 3,
                endLine: 3,
                endColumn: 5,
              },
            ],
          })),
          ...types.map<TSESLint.InvalidTestCase<MessageIds, Options>>(type => ({
            code: `
declare const x: ${type} | ${nullish};
if (x || 'foo') {}
            `,
            output: `
declare const x: ${type} | ${nullish};
if (x ?? 'foo') {}
            `,
            options: [{ ignoreConditionalTests: false }],
            errors: [
              {
                messageId: 'preferNullish',
                line: 3,
                column: 7,
                endLine: 3,
                endColumn: 9,
              },
            ],
          })),
          ...types.map<TSESLint.InvalidTestCase<MessageIds, Options>>(type => ({
            code: `
declare const x: ${type} | ${nullish};
do {} while (x || 'foo')
            `,
            output: `
declare const x: ${type} | ${nullish};
do {} while (x ?? 'foo')
            `,
            options: [{ ignoreConditionalTests: false }],
            errors: [
              {
                messageId: 'preferNullish',
                line: 3,
                column: 16,
                endLine: 3,
                endColumn: 18,
              },
            ],
          })),
          ...types.map<TSESLint.InvalidTestCase<MessageIds, Options>>(type => ({
            code: `
declare const x: ${type} | ${nullish};
for (;x || 'foo';) {}
            `,
            output: `
declare const x: ${type} | ${nullish};
for (;x ?? 'foo';) {}
            `,
            options: [{ ignoreConditionalTests: false }],
            errors: [
              {
                messageId: 'preferNullish',
                line: 3,
                column: 9,
                endLine: 3,
                endColumn: 11,
              },
            ],
          })),
          ...types.map<TSESLint.InvalidTestCase<MessageIds, Options>>(type => ({
            code: `
declare const x: ${type} | ${nullish};
while (x || 'foo') {}
            `,
            output: `
declare const x: ${type} | ${nullish};
while (x ?? 'foo') {}
            `,
            options: [{ ignoreConditionalTests: false }],
            errors: [
              {
                messageId: 'preferNullish',
                line: 3,
                column: 10,
                endLine: 3,
                endColumn: 12,
              },
            ],
          })),
        );

        return acc;
      },
      [],
    ),
  ],
});
