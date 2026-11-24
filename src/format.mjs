// Terminal output helpers. Colour is used only on a terminal, and never when
// NO_COLOR is set; FORCE_COLOR turns it on for a pipe.

const CODES = { red: [31, 39], green: [32, 39], yellow: [33, 39], dim: [2, 22], bold: [1, 22] };

export function useColour({ isTTY = false, env = {} } = {}) {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== "0" && env.FORCE_COLOR !== "false") return true;
  return Boolean(isTTY) && env.TERM !== "dumb";
}

export function painter(enabled) {
  const paint = {};
  for (const [name, [open, close]] of Object.entries(CODES)) {
    paint[name] = enabled ? (text) => `\u001b[${open}m${text}\u001b[${close}m` : (text) => String(text);
  }
  return paint;
}

export function bar(percent, width = 20) {
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;
