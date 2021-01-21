/* eslint-disable no-restricted-syntax, no-await-in-loop */
import * as core from '@actions/core';
import * as fs from 'fs';
import * as glob from 'glob';
import { parse } from 'junit2json';
import Reporter from './helpers/Reporter';
import { Result } from './types';

const results: Result[] = [];

(async function action() {
  core.info('Getting files matching glob');
  const filesMatchedGlob = glob.sync(core.getInput('glob') || '**/junit.xml', {
    cwd: process.env.GITHUB_WORKSPACE || '.',
    dot: true,
  });

  core.info(`Found ${filesMatchedGlob.length} file(s) matching glob.`);

  const files: string[] = [];
  filesMatchedGlob.forEach((file) => {
    if (fs.existsSync(file) && !fs.statSync(file).isSymbolicLink()) {
      files.push(file);
    } else {
      core.info(`Skipping ${file} because it either does not exist or is a symlink`);
    }
  });

  core.info(`Found ${files.length} file(s) after filtering.`);

  for (const file of files) {
    const content = fs.readFileSync(file).toString();
    const result = await parse(content);
    results.push((result as unknown) as Result);
  }
  const reporter = new Reporter(results);
  await reporter.report();
  core.info('Done!');
})();
