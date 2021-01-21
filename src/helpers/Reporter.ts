import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { Result } from '../types';

const x = ':x:&nbsp;&nbsp;&nbsp;';
const check = ':white_check_mark:&nbsp;&nbsp;&nbsp;';
const unknown = ':question:&nbsp;&nbsp;&nbsp;';

const isDev = process.env.NODE_ENV === 'development';

class Reporter {
  private readonly octokit;

  private readonly files: Result[];

  private hasUnknownStep = false;

  constructor(files: Result[]) {
    const token = process.env.GITHUB_TOKEN;
    if (token === undefined && !isDev) {
      core.error('GITHUB_TOKEN not set.');
      core.setFailed('GITHUB_TOKEN not set.');
      process.exit(1);
    } else if (!isDev) {
      this.octokit = getOctokit(token);
    }

    this.files = files;
  }

  private static getPullRequestId(): number {
    return context.payload.pull_request?.number ?? -1;
  }

  private jsonResultToMarkdown(): string {
    const result: string[] = [];
    result.push('# Test Results are in!');
    result.push('');
    if (process.env.GITHUB_ACTOR) {
      result.push(`Hey ${` ${process.env.GITHUB_ACTOR}` || ''},`);
    } else {
      result.push('Hey,');
    }
    result.push('the tests ran. Here are the results:');
    this.files.forEach((file) => {
      if (file.errors === 0 && file.failures === 0 && file.tests !== 0) {
        result.push(`### ${check}${file.name}`);
      } else if (file.tests !== 0) {
        result.push(`### ${x}${file.name}`);
      } else {
        this.hasUnknownStep = true;
        result.push(`### ${unknown}${file.name}`);
        result.push(
          '#### This Suite did not report any results. This could mean that the tests failed before they even started.'
        );
        return;
      }
      result.push(`Ran ${file.tests} tests. ${file.failures} failed, ${file.errors} errored.`);
      result.push('');

      // Put errors on top
      file.testsuite?.forEach((testsuite) => {
        if (testsuite.failures) {
          testsuite.testcase.forEach((testcase) => {
            if (testcase.failure) {
              const error: string[] = [];
              testcase.failure[0].inner.split('\n').forEach((line) => {
                if (line.includes('node_modules/jest-jasmine2') || line.includes('node:internal')) return;
                if (line === '') return;
                let fixedLine = line;
                if (line.startsWith('                ')) fixedLine = line.replace('                ', '    ');
                error.push(fixedLine);
              });

              result.push(`Test \`${testsuite.name}\` threw:`);
              result.push('```');
              result.push(error.join('\r'));
              result.push('```');
            }
          });
        }
      });

      result.push('<details><summary>View all Tests for this module</summary><blockquote>');
      file.testsuite?.forEach((testsuite) => {
        result.push(`<details><summary>${testsuite.name}</summary>`);
        result.push('');
        result.push('|Suite|Taken|');
        result.push('|:-----|:----:|');
        testsuite.testcase.forEach((testcase) => {
          if (testcase.failure) {
            result.push(`|${x + testcase.name.replace(testsuite.name, '').trimLeft()}|${testcase.time}s|`);
          } else {
            result.push(`|${check + testcase.name.replace(testsuite.name, '').trimLeft()}|${testcase.time}s|`);
          }
        });
        result.push('</details>');
        result.push('');
      });
      result.push('</blockquote></details>');
      result.push('');
    }, this);
    return result.join('\n');
  }

  async report(): Promise<void> {
    const result = this.jsonResultToMarkdown();
    if (isDev) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require
      require('fs').writeFileSync('demo.md', result);
      process.exit(0);
    }
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    console.log(`Reporting to ${owner}/${repo} PR #${Reporter.getPullRequestId()}`);
    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: Reporter.getPullRequestId(),
      body: result,
    });
    if (this.hasUnknownStep) process.exit(78);
  }
}

export default Reporter;
