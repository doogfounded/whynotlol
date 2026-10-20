// gearbox.js - Stage 3: The Gearbox
// Evaluates the ordered queue with a number stack.
// Logs every mechanical gear turn into a visible, human-readable step trail.

function _resolveFuncRegistry(angleMode) {
  if (typeof getFunctionRegistry === 'function') return getFunctionRegistry(angleMode);
  if (typeof require !== 'undefined') return require('./functions.js').getFunctionRegistry(angleMode);
  return {};
}

function _resolveFactorial(n) {
  if (typeof factorial === 'function') return factorial(n);
  if (typeof require !== 'undefined') return require('./functions.js').factorial(n);
  return n;
}

function _resolveFormatNumber(num) {
  if (typeof formatNumber === 'function') return formatNumber(num);
  if (typeof require !== 'undefined') return require('./functions.js').formatNumber(num);
  return String(num);
}

function evaluateQueue(queue, angleMode = 'deg') {
  if (!queue || queue.length === 0) {
    return { answer: null, formattedAnswer: "", steps: [], error: null };
  }

  const stack = [];
  const steps = [];
  const funcRegistry = _resolveFuncRegistry(angleMode);

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    // 1. Number: place on stack
    if (item.type === 'number') {
      stack.push({
        value: item.value,
        repr: item.raw || _resolveFormatNumber(item.value),
        token: item
      });
      continue;
    }

    // 2. Operator
    if (item.type === 'operator') {
      const op = item.op;

      // Unary operators
      if (op === 'neg') {
        if (stack.length < 1) {
          return {
            answer: null,
            steps,
            error: { position: item.start, message: "Missing number after negative sign" }
          };
        }
        const a = stack.pop();
        const res = -a.value;
        const resStr = _resolveFormatNumber(res);
        steps.push({
          stepNum: steps.length + 1,
          desc: `-(${a.repr}) → ${resStr}`,
          op: 'neg',
          result: res
        });
        stack.push({ value: res, repr: resStr, token: item });
        continue;
      }

      if (op === '!') {
        if (stack.length < 1) {
          return {
            answer: null,
            steps,
            error: { position: item.start, message: "Missing number before factorial (!)" }
          };
        }
        const a = stack.pop();
        try {
          const res = _resolveFactorial(a.value);
          const resStr = _resolveFormatNumber(res);
          steps.push({
            stepNum: steps.length + 1,
            desc: `${a.repr}! → ${resStr}`,
            op: '!',
            result: res
          });
          stack.push({ value: res, repr: resStr, token: item });
          continue;
        } catch (err) {
          return {
            answer: null,
            steps,
            error: { position: item.start, message: err.message }
          };
        }
      }

      // Binary operators (+, -, *, /, ^, %)
      if (stack.length < 2) {
        return {
          answer: null,
          steps,
          error: {
            position: item.start,
            message: `Operator "${item.raw || op}" needs numbers on both sides`
          }
        };
      }

      const b = stack.pop();
      const a = stack.pop();
      let res = 0;
      let symbol = op;

      if (op === '+') {
        res = a.value + b.value;
        symbol = '+';
      } else if (op === '-') {
        res = a.value - b.value;
        symbol = '−';
      } else if (op === '*') {
        res = a.value * b.value;
        symbol = '×';
      } else if (op === '/') {
        if (b.value === 0) {
          return {
            answer: null,
            steps,
            error: { position: item.start, message: "Division by zero is undefined" }
          };
        }
        res = a.value / b.value;
        symbol = '÷';
      } else if (op === '%') {
        if (b.value === 0) {
          return {
            answer: null,
            steps,
            error: { position: item.start, message: "Modulo by zero is undefined" }
          };
        }
        res = a.value % b.value;
        symbol = 'mod';
      } else if (op === '^') {
        // Safe check for negative bases with fractional powers
        if (a.value < 0 && Math.floor(b.value) !== b.value) {
          return {
            answer: null,
            steps,
            error: { position: item.start, message: "Negative number with fractional exponent produces a complex number" }
          };
        }
        res = Math.pow(a.value, b.value);
        symbol = '^';
      }

      const resStr = _resolveFormatNumber(res);
      steps.push({
        stepNum: steps.length + 1,
        desc: `${a.repr} ${symbol} ${b.repr} = ${resStr}`,
        op: symbol,
        result: res
      });
      stack.push({ value: res, repr: resStr, token: item });
      continue;
    }

    // 3. Function
    if (item.type === 'function') {
      const funcEntry = funcRegistry[item.func];
      if (!funcEntry) {
        return {
          answer: null,
          steps,
          error: { position: item.start, message: `Function "${item.func}" not found` }
        };
      }

      if (stack.length < funcEntry.arity) {
        return {
          answer: null,
          steps,
          error: {
            position: item.start,
            message: `Function "${item.func}" requires an argument`
          }
        };
      }

      const arg = stack.pop();
      try {
        const res = funcEntry.calc(arg.value);
        const resStr = _resolveFormatNumber(res);
        const unitSuffix = (['sin', 'cos', 'tan'].includes(item.func) && angleMode === 'deg') ? '°' : '';
        steps.push({
          stepNum: steps.length + 1,
          desc: `${item.func}(${arg.repr}${unitSuffix}) = ${resStr}`,
          op: item.func,
          result: res
        });
        stack.push({ value: res, repr: resStr, token: item });
        continue;
      } catch (err) {
        return {
          answer: null,
          steps,
          error: { position: item.start, message: err.message }
        };
      }
    }
  }

  if (stack.length === 0) {
    return { answer: null, formattedAnswer: "", steps, error: null };
  }

  if (stack.length > 1) {
    return {
      answer: null,
      steps,
      error: {
        position: stack[1].token ? stack[1].token.start : 0,
        message: "Missing operator between terms"
      }
    };
  }

  const finalVal = stack[0].value;
  return {
    answer: finalVal,
    formattedAnswer: _resolveFormatNumber(finalVal),
    steps,
    error: null
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateQueue };
}
