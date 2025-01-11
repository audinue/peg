import {
  action,
  and,
  any,
  between,
  char,
  choice,
  equal,
  many,
  not,
  one,
  optional,
  parser,
  ref,
  sequence,
  string,
  text,
} from "./primitives.js";

import { Grammar } from "./rules.js";

const Peg = {
  action,
  and,
  any,
  between,
  char,
  choice,
  equal,
  many,
  not,
  one,
  optional,
  parser,
  ref,
  sequence,
  string,
  text,
};

/**
 * @param {string} input
 * @returns {import('./primitives.js').FrontendParser}
 */
const generate = (input) =>
  new Function("Peg", Grammar({ input, offset: 0 }))(Peg);

/**
 * @param {string} input
 * @returns {string}
 */
const generateModule = (input) =>
  "import*as Peg from'@audinue/peg/primitives.js';" +
  Grammar({ input, offset: 0, module: true });

export { generate, generateModule };
