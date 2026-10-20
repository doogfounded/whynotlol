// gate.js - Stage 2: The Gate
// Shunting-yard algorithm with an operator stack.
// Orders tokens into postfix order (Reverse Polish Notation) based on strict precedence gates.

const OPERATORS = {
  '!':   { prec: 5, assoc: 'left',  unary: true,  postfix: true },
  'neg': { prec: 4, assoc: 'right', unary: true,  postfix: false },
  '^':   { prec: 3, assoc: 'right', unary: false, postfix: false },
  '*':   { prec: 2, assoc: 'left',  unary: false, postfix: false },
  '/':   { prec: 2, assoc: 'left',  unary: false, postfix: false },
  '%':   { prec: 2, assoc: 'left',  unary: false, postfix: false },
  '+':   { prec: 1, assoc: 'left',  unary: false, postfix: false },
  '-':   { prec: 1, assoc: 'left',  unary: false, postfix: false },
};

function parseToQueue(tokens) {
  if (!tokens || tokens.length === 0) {
    return { queue: [], error: null };
  }

  const queue = [];
  const opStack = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];

    // Numbers go straight into the output queue
    if (token.type === 'number') {
      queue.push(token);
      continue;
    }

    // Function calls go onto the operator stack
    if (token.type === 'function') {
      opStack.push(token);
      continue;
    }

    // Open bracket goes onto operator stack
    if (token.type === 'open') {
      opStack.push(token);
      continue;
    }

    // Close bracket flushes stack up to open bracket
    if (token.type === 'close') {
      let foundMatchingOpen = false;

      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        if (top.type === 'open') {
          opStack.pop();
          foundMatchingOpen = true;
          break;
        } else {
          queue.push(opStack.pop());
        }
      }

      if (!foundMatchingOpen) {
        return {
          queue: [],
          error: {
            position: token.start,
            message: "Unmatched closing parenthesis"
          }
        };
      }

      // If the top of the operator stack is now a function, pop it to the queue
      if (opStack.length > 0 && opStack[opStack.length - 1].type === 'function') {
        queue.push(opStack.pop());
      }

      continue;
    }

    // Operator handling
    if (token.type === 'operator') {
      const opInfo = OPERATORS[token.op];
      if (!opInfo) {
        return {
          queue: [],
          error: { position: token.start, message: `Unknown operator "${token.op}"` }
        };
      }

      // While top of stack has higher precedence, or equal precedence and left-associative
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];

        if (top.type === 'function') {
          queue.push(opStack.pop());
          continue;
        }

        if (top.type === 'operator') {
          const topInfo = OPERATORS[top.op];
          if (!topInfo) break;

          const hasHigherPrec = topInfo.prec > opInfo.prec;
          const hasEqualPrecLeftAssoc = (topInfo.prec === opInfo.prec && opInfo.assoc === 'left');

          if (hasHigherPrec || hasEqualPrecLeftAssoc) {
            queue.push(opStack.pop());
            continue;
          }
        }

        break;
      }

      opStack.push(token);
      continue;
    }
  }

  // Drain remaining operators from stack
  while (opStack.length > 0) {
    const top = opStack.pop();
    if (top.type === 'open') {
      return {
        queue: [],
        error: {
          position: top.start,
          message: "Unclosed open parenthesis"
        }
      };
    }
    queue.push(top);
  }

  return { queue, error: null };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseToQueue, OPERATORS };
}
