"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
const x = ':x:&nbsp;&nbsp;&nbsp;';
const check = ':white_check_mark:&nbsp;&nbsp;&nbsp;';
class Reporter {
    constructor(files) {
        const token = process.env.GITHUB_TOKEN;
        if (token === undefined) {
            core.error('GITHUB_TOKEN not set.');
            core.setFailed('GITHUB_TOKEN not set.');
            process.exit(1);
        }
        this.files = files;
        this.octokit = github_1.getOctokit(token);
    }
    static getPullRequestId() {
        var _a, _b, _c;
        console.log((_a = github_1.context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.number);
        return (_c = (_b = github_1.context.payload.pull_request) === null || _b === void 0 ? void 0 : _b.number) !== null && _c !== void 0 ? _c : -1;
    }
    jsonResultToMarkdown() {
        const result = [];
        result.push('# Test Results are in!');
        result.push('');
        result.push(`Hey${` ${process.env.GITHUB_ACTOR}` || ''},`);
        result.push('the tests ran. Here are the results:');
        this.files.forEach((file) => {
            if (file.errors === 0 && file.failures === 0) {
                result.push(`### :white_check_mark:&nbsp;&nbsp;&nbsp;${file.name}`);
            }
            else {
                result.push(`### :x:&nbsp;&nbsp;&nbsp;${file.name}`);
            }
            result.push(`Ran ${file.tests} tests. ${file.failures} failed, ${file.errors} errored.`);
            result.push('');
            file.testsuite.forEach((testsuite) => {
                if (testsuite.failures) {
                    testsuite.testcase.forEach((testcase) => {
                        if (testcase.failure) {
                            const error = [];
                            testcase.failure[0].inner.split('\n').forEach((line) => {
                                if (line.includes('node_modules/jest-jasmine2') || line.includes('node:internal'))
                                    return;
                                if (line === '')
                                    return;
                                let fixedLine = line;
                                if (line.startsWith('                '))
                                    fixedLine = line.replace('                ', '    ');
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
            file.testsuite.forEach((testsuite) => {
                result.push(`<details><summary>${testsuite.name}</summary>`);
                result.push('');
                result.push('|Suite|Taken|');
                result.push('|:-----|:----:|');
                testsuite.testcase.forEach((testcase) => {
                    if (testcase.failure) {
                        result.push(`|${x + testcase.name.replace(testsuite.name, '').trimLeft()}|${testcase.time}s|`);
                    }
                    else {
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
    report() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = this.jsonResultToMarkdown();
            const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
            console.log(`Reporting to ${owner}/${repo} PR #${Reporter.getPullRequestId()}`);
            yield this.octokit.issues.createComment({
                owner,
                repo,
                issue_number: Reporter.getPullRequestId(),
                body: result,
            });
        });
    }
}
exports.default = Reporter;
