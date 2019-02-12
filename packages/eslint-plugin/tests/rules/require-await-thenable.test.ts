import path from 'path';
import rule from '../../src/rules/require-await-thenable';
import { RuleTester } from '../RuleTester';

const rootPath = path.join(process.cwd(), 'tests/fixtures/');

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: rootPath,
    project: './tsconfig.json'
  }
});

ruleTester.run('require-await-thenable', rule, {
  valid: [
    `
      async function wrap(a: Promise<any>) {
        await a
      }
    `,
    `
      class A extends Promise<any> {}
      async function wrap(a: A) {
        await a
      }
    `,
    `
      type PromiseString = Promise<string>
      async function wrap(a: PromiseString) {
        await a
      }
    `,
    `
      async function wrap(a: { then: () => Promise<any> }) {
        await a
      }
    `,
    `
      async function wrap(a: number | Promise<number>) {
        await a
      }
    `,
    `
      async function wrap(a: {value: number} & Promise<number>) {
        await a
      }
    `,
    `
      async function wrap<T extends Promise<any>>(a: T) {
        await a
      }
    `,
    `
      async function wrap<T, U extends T | Promise<T>>(a: U) {
        await a
      }
    `
  ],
  invalid: [
    {
      code: `
        async function wrap(a: number) {
          await a
        }
      `,
      errors: [{ messageId: 'requireThenable' }]
    },
    {
      code: `
        async function wrap(a: number | string | { value: number | string }) {
          await a
        }
      `,
      errors: [{ messageId: 'requireThenable' }]
    },
    {
      code: `
        async function wrap<T>(a: T) {
          await a
        }
      `,
      errors: [{ messageId: 'requireThenable' }]
    },
    {
      code: `
        class A { catch() {} }
        async function wrap(a: A) {
          await a
        }
      `,
      errors: [{ messageId: 'requireThenable' }]
    }
  ]
});
