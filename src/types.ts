export type Result = {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  time: number;
  testsuite: Suite[];
};

export type Suite = {
  name: string;
  errors: number;
  failures: number;
  skipped: number;
  timestamp: string;
  time: number;
  tests: number;
  testcase: TestCase[];
};

export type TestCase = {
  classname: string;
  name: string;
  time: number;
  failure?: [
    {
      inner: string;
    }
  ];
};
