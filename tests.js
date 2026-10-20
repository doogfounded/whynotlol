// tests.js - Comprehensive test suite for the 3-stage mechanical calculator engine
const { CONSTANTS, factorial, formatNumber, getFunctionRegistry } = require('./functions.js');
const { tokenize } = require('./sorter.js');
const { parseToQueue } = require('./gate.js');
const { evaluateQueue } = require('./gearbox.js');

function calc(expr, angleMode = 'deg', ans = 0) {
  const { tokens, error: sortErr } = tokenize(expr, ans);
  if (sortErr) return { answer: null, steps: [], error: sortErr };

  const { queue, error: gateErr } = parseToQueue(tokens);
  if (gateErr) return { answer: null, steps: [], error: gateErr };

  return evaluateQueue(queue, angleMode);
}

const testCases = [
  // Basic Arithmetic & Precedence
  { expr: "2 + 3 * 4", expected: 14, desc: "Operator precedence: * before +" },
  { expr: "(2 + 3) * 4", expected: 20, desc: "Parentheses override precedence" },
  { expr: "10 - 4 - 2", expected: 4, desc: "Left-associative subtraction" },
  { expr: "20 / 4 / 2", expected: 2.5, desc: "Left-associative division" },
  { expr: "2 ^ 3 ^ 2", expected: 512, desc: "Right-associative exponentiation: 2^(3^2) = 2^9 = 512" },
  { expr: "(2 ^ 3) ^ 2", expected: 64, desc: "Parenthesized exponentiation: (2^3)^2 = 8^2 = 64" },

  // Decimals & Floats
  { expr: "0.1 + 0.2", expected: 0.3, desc: "Floating point precision cleanup (0.3)" },
  { expr: "1.5 * 2.5", expected: 3.75, desc: "Decimal multiplication" },
  { expr: ".5 + 1.5", expected: 2, desc: "Leading dot decimal (.5 + 1.5)" },

  // Unary Minus & Plus
  { expr: "-5 + 8", expected: 3, desc: "Leading unary minus" },
  { expr: "3 * -4", expected: -12, desc: "Unary minus after multiplication" },
  { expr: "(-5) * (-2)", expected: 10, desc: "Unary minus inside parentheses" },
  { expr: "-(-7)", expected: 7, desc: "Double negation -(-7)" },

  // Implicit Multiplication
  { expr: "2(3 + 4)", expected: 14, desc: "Implicit mult: number before open parenthesis" },
  { expr: "(2 + 3)(4 + 1)", expected: 25, desc: "Implicit mult: close paren before open paren" },
  { expr: "2pi", expected: 2 * Math.PI, desc: "Implicit mult: number before constant" },
  { expr: "3sin(30)", expected: 1.5, desc: "Implicit mult: number before function" },

  // Factorial (!)
  { expr: "0!", expected: 1, desc: "Factorial 0! = 1" },
  { expr: "5!", expected: 120, desc: "Factorial 5! = 120" },
  { expr: "3! + 4!", expected: 30, desc: "Factorials in arithmetic: 6 + 24 = 30" },
  { expr: "2 * 3!", expected: 12, desc: "Factorial binds tighter than multiplication: 2 * 6 = 12" },

  // Constants
  { expr: "pi", expected: Math.PI, desc: "Constant pi" },
  { expr: "e", expected: Math.E, desc: "Constant e" },

  // Trigonometry (DEG vs RAD)
  { expr: "sin(30)", angle: "deg", expected: 0.5, desc: "sin(30 deg) = 0.5" },
  { expr: "cos(60)", angle: "deg", expected: 0.5, desc: "cos(60 deg) = 0.5" },
  { expr: "tan(45)", angle: "deg", expected: 1, desc: "tan(45 deg) = 1" },
  { expr: "sin(pi / 6)", angle: "rad", expected: 0.5, desc: "sin(pi/6 rad) = 0.5" },
  { expr: "cos(pi)", angle: "rad", expected: -1, desc: "cos(pi rad) = -1" },

  // Logarithms and Roots
  { expr: "log(1000)", expected: 3, desc: "log base 10 of 1000 = 3" },
  { expr: "ln(e ^ 2)", expected: 2, desc: "ln(e^2) = 2" },
  { expr: "sqrt(144)", expected: 12, desc: "sqrt(144) = 12" },
  { expr: "sqrt(3^2 + 4^2)", expected: 5, desc: "Pythagorean sqrt(3^2 + 4^2) = 5" },

  // Previous Answer (ans)
  { expr: "ans * 2", ans: 21, expected: 42, desc: "Reuse previous ans (21 * 2 = 42)" },

  // Complex Nested Expression
  { expr: "2 + sqrt(16) * 3 - sin(90)", angle: "deg", expected: 13, desc: "2 + 4 * 3 - 1 = 13" },
];

const errorCases = [
  { expr: "5 / 0", errorSubstring: "zero", desc: "Division by zero caught" },
  { expr: "sqrt(-4)", errorSubstring: "negative", desc: "Square root of negative number caught" },
  { expr: "(2 + 3", errorSubstring: "Unclosed", desc: "Unclosed parenthesis caught" },
  { expr: "2 + 3)", errorSubstring: "Unmatched", desc: "Unmatched closing parenthesis caught" },
  { expr: "5.2!", errorSubstring: "integer", desc: "Non-integer factorial caught" },
  { expr: "foobar(5)", errorSubstring: "Unknown identifier", desc: "Unknown identifier flagged" },
  { expr: "3 + * 4", errorSubstring: "needs numbers", desc: "Consecutive operators flagged" }
];

let passed = 0;
let failed = 0;

console.log("=== RUNNING CALCULATOR ENGINE TEST SUITE ===");

testCases.forEach((t, idx) => {
  const res = calc(t.expr, t.angle || 'deg', t.ans || 0);
  if (res.error) {
    console.error(`FAIL [${idx + 1}] ${t.desc}: unexpected error "${res.error.message}" for expr: "${t.expr}"`);
    failed++;
  } else {
    const diff = Math.abs(res.answer - t.expected);
    const ok = diff < 1e-10;
    if (ok) {
      console.log(`PASS [${idx + 1}] ${t.desc} -> ${res.formattedAnswer} (${res.steps.length} steps logged)`);
      passed++;
    } else {
      console.error(`FAIL [${idx + 1}] ${t.desc}: got ${res.answer}, expected ${t.expected}`);
      failed++;
    }
  }
});

console.log("\n=== TESTING ERROR CASES ===");
errorCases.forEach((t, idx) => {
  const res = calc(t.expr);
  if (res.error && res.error.message.toLowerCase().includes(t.errorSubstring.toLowerCase())) {
    console.log(`PASS [Err ${idx + 1}] ${t.desc} -> Correctly caught: "${res.error.message}" at position ${res.error.position}`);
    passed++;
  } else {
    console.error(`FAIL [Err ${idx + 1}] ${t.desc}: expected error with "${t.errorSubstring}", got:`, res.error);
    failed++;
  }
});

console.log(`\n========================================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
