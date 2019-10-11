# Enforce the usage of the nullish coalescing operator instead of logical chaining (prefer-nullish-coalescing)

TypeScript 3.7 added support for the nullish coalescing operator.
This operator allows you to safely cascade a value when dealing with `null` or `undefined`.

<!-- prettier-ignore -->
```ts
function myFunc(foo: string | null) {
  return foo ?? 'a string';
}

// is equivalent to

function myFunc(foo: string | null) {
  return (foo !== null && foo !== undefined)
    ? foo
    : 'a string';
}
```

Because the nullish coalescing operator _only_ coalesces when the original value is `null` or `undefined`, it is much safer than relying upon logical OR operator chaining `||`; which coalesces on any _falsey_ value:

<!-- prettier-ignore -->
```ts
const emptyString = '';

const nullish1 = emptyString ?? 'unsafe';
const logical1 = emptyString || 'unsafe';

// nullish1 === ''
// logical1 === 'unsafe'

declare const nullString: string | null;

const nullish2 = nullString ?? 'safe';
const logical2 = nullString || 'safe';

// nullish2 === 'safe'
// logical2 === 'safe'
```

## Rule Details

This rule aims enforce the usage of the safer operator.

## Options

```ts
type Options = [
  {
    ignoreConditionalTests?: boolean;
  },
];

const defaultOptions = [
  {
    ignoreConditionalTests: true,
  },
];
```

### ignoreConditionalTests

Setting this option to `true` (the default) will cause the rule to ignore any logical or expressions that are located within a conditional test.

Generally expressions within conditional tests intentionally use the falsey fallthrough behaviour of the logical or operator, meaning that fixing the operator to the nullish coalesce operator could cause bugs.

If you're looking to enforce stricter conditional tests, you should consider using the `strict-boolean-expressions` rule.

Incorrect code for `ignoreConditionalTests: false`, and correct code for `ignoreConditionalTests: true`:

<!-- prettier-ignore -->
```ts
declare const a: string | null;
declare const b: string | null;

if (a || b) {}
while (a || b) {}
do {} while (a || b);
for (let i = 0; a || b; i += 1) {}
a || b ? true : false;
```

Correct code for `ignoreConditionalTests: false`:

<!-- prettier-ignore -->
```ts
declare const a: string | null;
declare const b: string | null;

if (a ?? b) {}
while (a ?? b) {}
do {} while (a ?? b)
for (let i = 0; a ?? b; i += 1) {}
a ?? b ? true : false;
```

## When Not To Use It

If you are using TypeScript 3.7 (or greater), then you will not be able to use this rule.

## Further Reading

- [TypeScript 3.7 Beta Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-3-7-beta/)
- [Nullish Coalescing Operator Proposal](https://github.com/tc39/proposal-nullish-coalescing/)
