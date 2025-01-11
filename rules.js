import {
  action,
  any,
  between,
  char,
  choice,
  equal,
  many,
  not,
  one,
  optional,
  ref,
  sequence,
  string,
  text,
} from "./primitives.js";

import { ruleName } from "./util.js";

const SingleQuotedString = sequence([
  string("'"),
  many(
    choice([
      //
      sequence([string("\\"), any]),
      char([equal("'")], true),
    ])
  ),
  string("'"),
]);

const DoubleQuotedString = sequence([
  string('"'),
  many(
    choice([
      //
      sequence([string("\\"), any]),
      char([equal('"')], true),
    ])
  ),
  string('"'),
]);

const String = text(
  choice([
    //
    SingleQuotedString,
    DoubleQuotedString,
  ])
);

const Id = text(
  one(
    char([
      //
      between("A", "Z"),
      between("a", "z"),
      between("0", "9"),
      equal("_"),
    ])
  )
);

const Any = action(
  //
  string("."),
  () => {
    return `Peg.any`;
  }
);

const SingleLineComment = sequence([
  //
  string("//"),
  many(
    char(
      [
        //
        equal("\r"),
        equal("\n"),
      ],
      true
    )
  ),
]);

const MultiLineComment = sequence([
  //
  string("/*"),
  many(
    sequence([
      //
      not(string("*/")),
      any,
    ])
  ),
  string("*/"),
]);

const Comment = choice([
  //
  SingleLineComment,
  MultiLineComment,
]);

const _ = many(
  choice([
    Comment,
    char([
      //
      equal(" "),
      equal("\t"),
      equal("\r"),
      equal("\n"),
    ]),
  ])
);

const __ = one(
  choice([
    Comment,
    char([
      //
      equal(" "),
      equal("\t"),
      equal("\r"),
      equal("\n"),
    ]),
  ])
);

const Between = action(
  //
  sequence([any, string("-"), any]),
  (result) => {
    return `Peg.between("${result[0]}","${result[2]}")`;
  }
);

const EscapedEqual = action(
  //
  text(sequence([string("\\"), any])),
  (result) => {
    return `Peg.equal("${result}")`;
  }
);

const Equal = action(
  //
  char([equal("]")], true),
  (result) => {
    return `Peg.equal("${result}")`;
  }
);

const Char = action(
  sequence([
    string("["),
    optional(string("^")),
    one(
      choice([
        //
        EscapedEqual,
        Between,
        Equal,
      ])
    ),
    string("]"),
  ]),
  (result) => {
    return `Peg.char([${result[2].join(",")}],${result[1] !== null})`;
  }
);

const StringLiteral = action(
  //
  String,
  (result) => {
    return `Peg.string(${result})`;
  }
);

const Group = action(
  //
  sequence([
    //
    string("("),
    _,
    ref(() => Expr),
    _,
    string(")"),
  ]),
  (result) => {
    return result[2];
  }
);

const Ref = action(
  sequence([
    Id,
    not(
      sequence([
        //
        _,
        string("="),
        _,
      ])
    ),
  ]),
  (result) => {
    return `Peg.ref(()=>${ruleName(result[0])})`;
  }
);

const Term = choice([
  //
  Ref,
  StringLiteral,
  Char,
  Any,
  Group,
]);

const Postfix = choice([
  action(
    sequence([
      Term,
      char([
        //
        equal("*"),
        equal("+"),
        equal("?"),
      ]),
    ]),
    (result) => {
      switch (result[1]) {
        case "*":
          return `Peg.many(${result[0]})`;
        case "+":
          return `Peg.one(${result[0]})`;
        case "?":
          return `Peg.optional(${result[0]})`;
      }
    }
  ),
  Term,
]);

const Prefix = choice([
  action(
    sequence([
      char([
        //
        equal("&"),
        equal("!"),
        equal("$"),
      ]),
      Postfix,
    ]),
    (result) => {
      switch (result[0]) {
        case "&":
          return `Peg.and(${result[1]})`;
        case "!":
          return `Peg.not(${result[1]})`;
        case "$":
          return `Peg.text(${result[1]})`;
      }
    }
  ),
  Postfix,
]);

const Label = choice([
  action(
    sequence([
      //
      Id,
      _,
      string(":"),
      _,
      Prefix,
    ]),
    (result) => {
      return {
        label: result[0],
        toString() {
          return result[4] + "";
        },
      };
    }
  ),
  Prefix,
]);

const Sequence = action(
  sequence([
    Label,
    many(
      action(
        sequence([
          //
          __,
          Label,
        ]),
        (result) => {
          return result[1];
        }
      )
    ),
  ]),
  (result) => {
    if (!result[1].length) {
      return result[0];
    } else {
      return {
        values: [result[0], ...result[1]],
        toString() {
          return `Peg.sequence([${result[0]},${result[1].join(",")}])`;
        },
      };
    }
  }
);

const Content = text(
  sequence([
    string("{"),
    many(
      choice([
        //
        ref(() => Content),
        char([equal("}")], true),
      ])
    ),
    string("}"),
  ])
);

const Code = action(
  sequence([
    string("{"),
    text(
      many(
        choice([
          //
          ref(() => Content),
          char([equal("}")], true),
        ])
      )
    ),
    string("}"),
  ]),
  (result) => {
    return result[1];
  }
);

const Action = choice([
  action(
    sequence([
      //
      Sequence,
      _,
      Code,
    ]),
    (result) => {
      const labels = (
        typeof result[0].label === "string"
          ? [`const ${result[0].label}=Peg$result;`]
          : Array.isArray(result[0].values)
          ? result[0].values
              .map((value, index) => {
                if (typeof value.label === "string") {
                  return [value.label, index];
                } else {
                  return null;
                }
              })
              .filter((value) => {
                return value !== null;
              })
              .map(([name, index]) => {
                return `let ${name}=Peg$result[${index}];`;
              })
          : []
      ).join("");
      return `Peg.action(${result[0]},(Peg$result,context)=>{${labels}${result[2]}})`;
    }
  ),
  Sequence,
]);

const Choice = action(
  sequence([
    Action,
    many(
      action(
        sequence([
          //
          _,
          string("/"),
          _,
          Action,
        ]),
        (result) => {
          return result[3];
        }
      )
    ),
  ]),
  (result) => {
    if (!result[1].length) {
      return result[0];
    } else {
      return `Peg.choice([${result[0]},${result[1].join(",")}])`;
    }
  }
);

const Expr = Choice;

const Rule = action(
  sequence([
    //
    Id,
    _,
    string("="),
    _,
    Expr,
    _,
  ]),
  (result) => {
    return {
      name: result[0],
      toString() {
        return `const ${ruleName(result[0])}=${result[4]};`;
      },
    };
  }
);

const Grammar = action(
  sequence([
    //
    _,
    optional(Code),
    _,
    one(Rule),
  ]),
  (result, context) => {
    return (
      (result[1] ?? "") +
      result[3].join("") +
      (context.module ? "export const parse=" : "return ") +
      `Peg.parser(${ruleName(result[3][0].name)})`
    );
  }
);

export { Grammar };
