// sorter.js - Stage 1: The Sorting Tray
// Reads raw characters left to right and separates them into discrete categorized tokens
// Tracks character positions for pin-point error visualization.

function tokenize(input, ansValue = 0) {
  if (typeof input !== 'string') {
    return { tokens: [], error: { position: 0, message: "Invalid input type" } };
  }

  const raw = input;
  const len = raw.length;
  let i = 0;
  const rawTokens = [];

  const isDigit = (ch) => ch >= '0' && ch <= '9';
  const isAlpha = (ch) => (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
  const isWhitespace = (ch) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

  while (i < len) {
    const ch = raw[i];

    if (isWhitespace(ch)) {
      i++;
      continue;
    }

    // 1. Numbers (including decimal point and optional exponent like 1e5 or 2.5e-3)
    if (isDigit(ch) || (ch === '.' && i + 1 < len && isDigit(raw[i + 1]))) {
      const start = i;
      let numStr = "";
      let hasDot = false;

      while (i < len) {
        const c = raw[i];
        if (isDigit(c)) {
          numStr += c;
          i++;
        } else if (c === '.' && !hasDot) {
          hasDot = true;
          numStr += c;
          i++;
        } else if ((c === 'e' || c === 'E') && i + 1 < len) {
          // Check if valid exponent
          const next = raw[i + 1];
          if (isDigit(next) || ((next === '+' || next === '-') && i + 2 < len && isDigit(raw[i + 2]))) {
            numStr += c;
            i++;
            if (raw[i] === '+' || raw[i] === '-') {
              numStr += raw[i];
              i++;
            }
            while (i < len && isDigit(raw[i])) {
              numStr += raw[i];
              i++;
            }
            break;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      const val = parseFloat(numStr);
      if (isNaN(val)) {
        return {
          tokens: [],
          error: { position: start, message: `Malformed number "${numStr}"` }
        };
      }

      rawTokens.push({
        type: 'number',
        value: val,
        raw: numStr,
        start,
        end: i
      });
      continue;
    }

    // 2. Parentheses / brackets
    if (ch === '(' || ch === '[') {
      rawTokens.push({
        type: 'open',
        raw: ch,
        start: i,
        end: i + 1
      });
      i++;
      continue;
    }

    if (ch === ')' || ch === ']') {
      rawTokens.push({
        type: 'close',
        raw: ch,
        start: i,
        end: i + 1
      });
      i++;
      continue;
    }

    // 3. Operators
    // Support standard *, /, +, -, ^, %, and factorial postfix !
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^' || ch === '%' || ch === '!') {
      // Check for unary minus vs binary minus
      let opType = 'operator';
      let opName = ch;

      if (ch === '-') {
        // Unary minus if it's the very first token, or comes right after an open bracket or non-postfix operator
        const prev = rawTokens[rawTokens.length - 1];
        const isPrevOp = prev && prev.type === 'operator' && prev.op !== '!';
        if (!prev || isPrevOp || prev.type === 'open') {
          opType = 'operator';
          opName = 'neg'; // Unary negation
        }
      } else if (ch === '+') {
        // Unary plus (e.g. +5) can simply be ignored or treated as unary identity
        const prev = rawTokens[rawTokens.length - 1];
        const isPrevOp = prev && prev.type === 'operator' && prev.op !== '!';
        if (!prev || isPrevOp || prev.type === 'open') {
          i++;
          continue; // Discard redundant leading/unary '+'
        }
      }

      rawTokens.push({
        type: opType,
        op: opName,
        raw: ch,
        start: i,
        end: i + 1
      });
      i++;
      continue;
    }

    // 4. Multi-character symbols, functions, constants
    if (isAlpha(ch)) {
      const start = i;
      let word = "";
      while (i < len && isAlpha(raw[i])) {
        word += raw[i];
        i++;
      }
      const lower = word.toLowerCase();

      // Check constants
      if (lower === 'pi' || lower === 'e') {
        const val = lower === 'pi' ? Math.PI : Math.E;
        rawTokens.push({
          type: 'number',
          value: val,
          raw: word,
          start,
          end: i
        });
        continue;
      }

      // Check ans (previous answer)
      if (lower === 'ans') {
        rawTokens.push({
          type: 'number',
          value: ansValue,
          raw: word,
          start,
          end: i
        });
        continue;
      }

      // Check supported functions
      const recognizedFuncs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'abs', 'fact'];
      if (recognizedFuncs.includes(lower)) {
        rawTokens.push({
          type: 'function',
          func: lower,
          raw: word,
          start,
          end: i
        });
        continue;
      }

      // Unknown identifier
      return {
        tokens: [],
        error: {
          position: start,
          message: `Unknown identifier "${word}". Recognized: sin, cos, tan, log, ln, sqrt, abs, pi, e, ans.`
        }
      };
    }

    // Unexpected character
    return {
      tokens: [],
      error: {
        position: i,
        message: `Unexpected character "${ch}" at index ${i}`
      }
    };
  }

  // 5. Insert implicit multiplication where natural:
  // e.g.: number open (2(3) -> 2 * (3))
  //       close open ((2)(3) -> (2) * (3))
  //       number function (2sin(x) -> 2 * sin(x))
  //       close function ((2)sin(x) -> (2) * sin(x))
  //       close number ((2)3 -> (2) * 3)
  //       factorial number (5! 2 -> 5! * 2)
  //       factorial open (5! (2) -> 5! * (2))
  const tokens = [];
  for (let k = 0; k < rawTokens.length; k++) {
    const cur = rawTokens[k];
    const prev = rawTokens[k - 1];

    if (prev) {
      const isPrevMultiplier = 
        (prev.type === 'number') ||
        (prev.type === 'close') ||
        (prev.type === 'operator' && prev.op === '!');

      const isCurMultiplicand =
        (cur.type === 'number') ||
        (cur.type === 'open') ||
        (cur.type === 'function');

      if (isPrevMultiplier && isCurMultiplicand) {
        tokens.push({
          type: 'operator',
          op: '*',
          raw: '×',
          implicit: true,
          start: cur.start,
          end: cur.start
        });
      }
    }

    tokens.push(cur);
  }

  return { tokens, error: null };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tokenize };
}
