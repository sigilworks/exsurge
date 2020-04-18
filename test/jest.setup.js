import 'jest-extended';

// stub out `fetch` globally
global.fetch = jest.fn(jest.fn(() => Promise.resolve({})));

// set up `context` as a synonym for `describe`
global.context = describe;
global.xcontext = xdescribe;

