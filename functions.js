// functions.js - Pure mathematical operations and constants table

const CONSTANTS = {
  pi: Math.PI,
  e: Math.E,
};

// Factorial with integer check and safe boundary (170! is ~7e308, 171! overflows to Infinity)
function factorial(n) {
  if (!Number.isFinite(n)) return NaN;
  if (n < 0) throw new Error("Factorial of negative number is undefined");
  if (Math.floor(n) !== n) throw new Error("Factorial is only defined for non-negative integers");
  if (n > 170) throw new Error("Factorial exceeds computational limit (> 170!)");
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

// Format numbers nicely: cleans up IEEE 754 float glitches (0.1 + 0.2 -> 0.3)
function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return 'NaN';
  if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
  // Use 12 significant digits and parse back to strip trailing zeros
  const rounded = parseFloat(num.toPrecision(12));
  // If scientific notation is cleaner or number is huge/tiny
  if (Math.abs(rounded) >= 1e14 || (Math.abs(rounded) > 0 && Math.abs(rounded) < 1e-6)) {
    return rounded.toExponential();
  }
  return rounded.toString();
}

// Function registry with arity and execution function
// angleMode is 'deg' or 'rad'
function getFunctionRegistry(angleMode = 'deg') {
  const toRad = (x) => angleMode === 'deg' ? (x * Math.PI) / 180 : x;
  const fromRad = (x) => angleMode === 'deg' ? (x * 180) / Math.PI : x;

  return {
    sin: {
      arity: 1,
      calc: (x) => {
        const r = toRad(x);
        const val = Math.sin(r);
        return Math.abs(val) < 1e-15 ? 0 : val;
      }
    },
    cos: {
      arity: 1,
      calc: (x) => {
        const r = toRad(x);
        const val = Math.cos(r);
        return Math.abs(val) < 1e-15 ? 0 : val;
      }
    },
    tan: {
      arity: 1,
      calc: (x) => {
        const r = toRad(x);
        const c = Math.cos(r);
        if (Math.abs(c) < 1e-15) throw new Error("tan undefined (asymptote)");
        const val = Math.tan(r);
        return Math.abs(val) < 1e-15 ? 0 : val;
      }
    },
    asin: {
      arity: 1,
      calc: (x) => {
        if (x < -1 || x > 1) throw new Error("asin domain is [-1, 1]");
        return fromRad(Math.asin(x));
      }
    },
    acos: {
      arity: 1,
      calc: (x) => {
        if (x < -1 || x > 1) throw new Error("acos domain is [-1, 1]");
        return fromRad(Math.acos(x));
      }
    },
    atan: {
      arity: 1,
      calc: (x) => fromRad(Math.atan(x))
    },
    log: {
      arity: 1,
      calc: (x) => {
        if (x <= 0) throw new Error("log domain is (0, ∞)");
        return Math.log10(x);
      }
    },
    ln: {
      arity: 1,
      calc: (x) => {
        if (x <= 0) throw new Error("ln domain is (0, ∞)");
        return Math.log(x);
      }
    },
    sqrt: {
      arity: 1,
      calc: (x) => {
        if (x < 0) throw new Error("sqrt of negative number requires complex numbers");
        return Math.sqrt(x);
      }
    },
    abs: {
      arity: 1,
      calc: (x) => Math.abs(x)
    },
    fact: {
      arity: 1,
      calc: (x) => factorial(x)
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONSTANTS, factorial, formatNumber, getFunctionRegistry };
}
