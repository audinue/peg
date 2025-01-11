/**
 * @typedef {{ input: string, offset: number }} Context
 * @typedef {null | string | Node[]} Node
 * @typedef {(context: Context) => symbol | Node} Parser
 * @typedef {(result: any, context: Context) => any} Mapper
 * @typedef {() => Parser} Factory
 * @typedef {(char: string) => boolean} Predicate
 * @typedef {(input: string, more?: Record<string, any>) => any} FrontendParser
 */

/** */
const error = Symbol();

/** @type {Parser} */
const any = (context) => {
  if (context.offset < context.input.length) {
    return context.input.charAt(context.offset++);
  } else {
    return error;
  }
};

/**
 * @param {string} value
 * @returns {Predicate}
 */
const equal = (value) => {
  return (char) => {
    return char === value;
  };
};

/**
 * @param {string} min
 * @param {string} max
 * @returns {Predicate}
 */
const between = (min, max) => {
  return (char) => {
    return char >= min && char <= max;
  };
};

/**
 * @param {Predicate[]} predicates
 * @param {boolean} negative
 * @returns {Parser}
 */
const char = (predicates, negative) => {
  return (context) => {
    if (
      negative
        ? context.offset < context.input.length &&
          !predicates.some((predicate) =>
            predicate(context.input.charAt(context.offset))
          )
        : predicates.some((predicate) =>
            predicate(context.input.charAt(context.offset))
          )
    ) {
      return context.input.charAt(context.offset++);
    } else {
      return error;
    }
  };
};

/**
 * @param {string} value
 * @returns {Parser}
 */
const string = (value) => {
  return (context) => {
    if (
      context.input.substring(context.offset, context.offset + value.length) ===
      value
    ) {
      context.offset += value.length;
      return value;
    } else {
      return error;
    }
  };
};

/**
 * @param {Parser[]} parsers
 * @returns {Parser}
 */
const sequence = (parsers) => {
  return (context) => {
    const results = [];
    for (const parser of parsers) {
      const result = parser(context);
      if (result === error) {
        return error;
      } else {
        results.push(result);
      }
    }
    return results;
  };
};

/**
 * @param {Parser[]} parsers
 * @returns {Parser}
 */
const choice = (parsers) => {
  return (context) => {
    const offset = context.offset;
    for (const parser of parsers) {
      const result = parser(context);
      if (result === error) {
        context.offset = offset;
      } else {
        return result;
      }
    }
    return error;
  };
};

/**
 * @param {Parser} parser
 * @returns {Parser}
 */
const many = (parser) => {
  return (context) => {
    const results = [];
    while (true) {
      const offset = context.offset;
      const result = parser(context);
      if (result === error) {
        context.offset = offset;
        break;
      } else {
        results.push(result);
      }
    }
    return results;
  };
};

/**
 * @param {Parser} parser
 * @returns {Parser}
 */
const one = (parser) => {
  return (context) => {
    const result = parser(context);
    if (result === error) {
      return error;
    }
    const results = [result];
    while (true) {
      const offset = context.offset;
      const result = parser(context);
      if (result === error) {
        context.offset = offset;
        break;
      } else {
        results.push(result);
      }
    }
    return results;
  };
};

/**
 * @param {Parser} parser
 * @returns {Parser}
 */
const text = (parser) => {
  return (context) => {
    const offset = context.offset;
    const result = parser(context);
    if (result === error) {
      return error;
    } else {
      return context.input.substring(offset, context.offset);
    }
  };
};

/**
 * @param {Parser} parser
 * @returns {Parser}
 */
const optional = (parser) => {
  return (context) => {
    const offset = context.offset;
    const result = parser(context);
    if (result === error) {
      context.offset = offset;
      return null;
    } else {
      return result;
    }
  };
};

/**
 * @param {Parser} parser
 * @returns {Parser}
 */
const and = (parser) => {
  return (context) => {
    const offset = context.offset;
    const result = parser(context);
    context.offset = offset;
    if (result === error) {
      return error;
    } else {
      return null;
    }
  };
};

/**
 * @param {Parser} parser
 * @returns {Parser}
 */
const not = (parser) => {
  return (context) => {
    const offset = context.offset;
    const result = parser(context);
    context.offset = offset;
    if (result === error) {
      return null;
    } else {
      return error;
    }
  };
};

/**
 * @param {Parser} parser
 * @param {Mapper} mapper
 * @returns {Parser}
 */
const action = (parser, mapper) => {
  return (context) => {
    const result = parser(context);
    if (result === error) {
      return error;
    } else {
      return mapper(result, context);
    }
  };
};

/**
 * @param {Factory} factory
 * @returns {Parser}
 */
const ref = (factory) => {
  return (context) => {
    return factory()(context);
  };
};

/**
 * @param {Parser} first
 * @returns {FrontendParser}
 */
const parser = (first) => {
  return (input, more) => {
    const context = { input, offset: 0, ...more };
    const result = first(context);
    if (result === error || context.offset !== input.length) {
      throw new Error("Syntax error");
    } else {
      return result;
    }
  };
};

export {
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
