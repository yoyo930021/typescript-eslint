import chalk from 'chalk';

const TICK = chalk.bold.green('✔');
const CROSS = chalk.bold.red('✗');

const STARTS_WITH_STRING = /^([ ]+)/;
function logRule(
  success: boolean,
  ruleName: string,
  ...messages: string[]
): void {
  if (success) {
    console.log(TICK, chalk.dim(ruleName));
  } else {
    logError(chalk.bold(ruleName));
    messages.forEach(m => {
      const messagePreIndent = STARTS_WITH_STRING.exec(m);
      const indent = messagePreIndent ? `    ${messagePreIndent[1]}` : '    ';
      console.error(chalk.bold.red(`${indent}-`), m.trimLeft());
    });
  }
}

function logError(...messages: string[]): void {
  console.error(CROSS, ...messages);
}

export { logError, logRule, TICK, CROSS };
