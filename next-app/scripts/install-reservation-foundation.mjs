import { spawnSync } from 'node:child_process';
import { buildInstallCommands } from './foundation-dependencies.mjs';

function renderCommand(step) {
  return [step.command, ...step.args].join(' ');
}

function printPlan(steps) {
  for (const step of steps) {
    console.log(renderCommand(step));
  }
}

function runStep(step) {
  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  });

  if (result.status === 0) return;

  process.exit(result.status ?? 1);
}

function install(steps) {
  for (const step of steps) {
    runStep(step);
  }
}

const steps = buildInstallCommands();
const dryRun = process.argv.includes('--dry-run');

if (dryRun) {
  printPlan(steps);
} else {
  install(steps);
}
