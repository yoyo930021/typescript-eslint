import { TSESLint } from '@typescript-eslint/experimental-utils';
import fs from 'fs';
import path from 'path';
import marked from 'marked';
import { logError, logRule } from './log';

const docsFolder = path.resolve(__dirname, '../../docs/rules');
const REQUIRED_TITLE = 1;
const OPTIONAL_TITLE = 1 << 1;
// defines all of the required sections and their expected ordering in the document
let i = 1;
enum TitleType {
  RuleTitle = (i++ << 2) | REQUIRED_TITLE,
  Options = (i++ << 2) | REQUIRED_TITLE,
  HowToConfigure = (i++ << 2) | OPTIONAL_TITLE,
  Examples = (i++ << 2) | REQUIRED_TITLE,
  WhenNotToUseIt = (i++ << 2) | REQUIRED_TITLE,
  RelatedTo = (i++ << 2) | OPTIONAL_TITLE,
}
export function getTitleTypeValue(key: string): number {
  return (TitleType[key as any] as any) as number;
}

const expectedTitleOrder: TitleType[] = Object.keys(TitleType)
  .filter(k => typeof TitleType[k as any] === 'string')
  .map(k => parseInt(k));

type Rule = TSESLint.RuleModule<any, any> & { name: string };

function validateRuleDoc(rule: Rule, ruleDoc: marked.TokensList): boolean {
  let hasErrors = false;
  const titleOrder: TitleType[] = [];
  const sections: Map<TitleType, marked.Token[]> = new Map();
  let lastSeenTitle: TitleType;

  function assertDepth(token: marked.Tokens.Heading, depth: number): void {
    if (token.depth !== depth) {
      hasErrors = true;
      logError(
        `Expected ${
          token.text
        } to have heading level ${depth}, but instead found ${token.depth}.`,
      );
    }
  }
  function assertOnlyOne(type: TitleType, name: string): boolean {
    if (sections.has(type)) {
      hasErrors = true;
      logError(
        `Detected multiple ${name} headings when there should be only one.`,
      );

      return false;
    }

    return true;
  }

  ruleDoc.forEach(token => {
    if (token.type === 'heading') {
      if (token.depth === 1) {
        // assume it's the rule title
        if (!assertOnlyOne(TitleType.RuleTitle, 'level 1')) {
          return;
        }

        titleOrder.push(TitleType.RuleTitle);
        lastSeenTitle = TitleType.RuleTitle;
        sections.set(TitleType.RuleTitle, []);

        const expectedText = `${rule.meta.docs.description} (${rule.name})`;
        if (token.text !== expectedText) {
          hasErrors = true;
          logError(
            'Invalid rule title content found.',
            `- expected: "${expectedText}"`,
            `- received: "${token.text}"`,
          );
        }
        return;
      }

      if (token.text === 'Options') {
        if (!assertOnlyOne(TitleType.Options, token.text)) {
          return;
        }

        titleOrder.push(TitleType.Options);
        lastSeenTitle = TitleType.Options;
        sections.set(TitleType.Options, []);

        assertDepth(token, 2);
        return;
      }

      if (token.text === 'How to Configure') {
        if (!assertOnlyOne(TitleType.HowToConfigure, token.text)) {
          return;
        }

        titleOrder.push(TitleType.HowToConfigure);
        lastSeenTitle = TitleType.HowToConfigure;
        sections.set(TitleType.HowToConfigure, []);

        assertDepth(token, 2);
        return;
      }

      if (token.text === 'Examples') {
        if (!assertOnlyOne(TitleType.Examples, token.text)) {
          return;
        }

        titleOrder.push(TitleType.Examples);
        lastSeenTitle = TitleType.Examples;
        sections.set(TitleType.Examples, []);

        assertDepth(token, 2);
        return;
      }

      if (token.text === 'When Not To Use It') {
        if (!assertOnlyOne(TitleType.WhenNotToUseIt, token.text)) {
          return;
        }

        titleOrder.push(TitleType.WhenNotToUseIt);
        lastSeenTitle = TitleType.WhenNotToUseIt;
        sections.set(TitleType.WhenNotToUseIt, []);

        assertDepth(token, 2);
        return;
      }

      if (token.text === 'RelatedTo') {
        if (!assertOnlyOne(TitleType.RelatedTo, token.text)) {
          return;
        }

        titleOrder.push(TitleType.RelatedTo);
        lastSeenTitle = TitleType.RelatedTo;
        sections.set(TitleType.RelatedTo, []);

        assertDepth(token, 2);
        return;
      }

      // block other level 2 headers
      if (token.depth === 2) {
        hasErrors = true;
        logRule(false, rule.name, `Unexpected level 2 header: ${token.text}`);
        return;
      }
    }

    sections.get(lastSeenTitle)!.push(token);
  });

  // expect the section order is correct
  const sortedTitles = [...titleOrder].sort((a, b) => a - b);
  const isIncorrectlySorted = sortedTitles.some(
    (title, i) => titleOrder[i] !== title,
  );
  if (isIncorrectlySorted) {
    hasErrors = true;
    logRule(
      false,
      rule.name,
      'Sections are in the wrong order.',
      `    Expected ${sortedTitles.map(t => TitleType[t]).join(', ')}.`,
      `    Received ${titleOrder.map(t => TitleType[t]).join(', ')}.`,
    );
  }

  expectedTitleOrder
    .filter(t => (t & OPTIONAL_TITLE) === 0)
    .forEach(title => {
      if (!titleOrder.includes(title)) {
        hasErrors = true;
        logRule(false, rule.name, `Missing title ${TitleType[title]}`);
      }
    });

  if (!hasErrors) {
    logRule(true, rule.name);
  }

  return hasErrors;
}

function validateRuleDocs(
  rules: Record<string, TSESLint.RuleModule<any, any>>,
): boolean {
  let hasErrors = false;
  Object.entries(rules).forEach(([ruleName, rule]) => {
    try {
      const fileContents = fs.readFileSync(
        path.resolve(docsFolder, `${ruleName}.md`),
        'utf8',
      );
      const parsed = marked.lexer(fileContents, {
        gfm: true,
        tables: true,
        silent: false,
      });

      hasErrors =
        validateRuleDoc({ name: ruleName, ...rule }, parsed) || hasErrors;
    } catch (e) {
      hasErrors = true;
      console.error(`Error occurred whilst reading docs for ${ruleName}:`, e);
    }
  });

  return hasErrors;
}

export { validateRuleDocs };
