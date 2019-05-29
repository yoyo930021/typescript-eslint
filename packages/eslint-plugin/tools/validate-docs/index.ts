import chalk from 'chalk';
import plugin from '../../src/index';
import { checkForRuleDocs } from './check-for-rule-docs';
import { parseReadme } from './parse-readme';
import { validateTableStructure } from './validate-table-structure';
import { validateTableRules } from './validate-table-rules';
import { validateRuleDocs } from './validate-rule-docs';

const { rules } = plugin;

let hasErrors = false;

console.log();
console.log(chalk.underline('Checking rule docs'));

console.log();
console.log(chalk.italic('Checking for existance'));
hasErrors = checkForRuleDocs(rules) || hasErrors;

console.log();
console.log(chalk.italic('Checking content'));
hasErrors = validateRuleDocs(rules) || hasErrors;

console.log();
console.log(chalk.underline('Validating README.md'));
const rulesTable = parseReadme();

console.log();
console.log(chalk.italic('Checking table structure...'));
hasErrors = validateTableStructure(rules, rulesTable) || hasErrors;

console.log();
console.log(chalk.italic('Checking rules...'));
hasErrors = validateTableRules(rules, rulesTable) || hasErrors;

if (hasErrors) {
  console.log('\n\n');
  console.error(
    chalk.bold.bgRed.white('There were errors found in the documentation.'),
  );
  console.log('\n\n');
  // eslint-disable-next-line no-process-exit
  process.exit(1);
}
