const cp = require("node:child_process");

function wrap(name) {
  const orig = cp[name];
  if (typeof orig !== "function") return;
  cp[name] = function (...args) {
    try {
      console.error(`\n[TRACE child_process.${name}] cmd:`, args[0]);
      console.error(new Error("stack").stack);
      console.error("[TRACE args]", args.slice(1));
    } catch (e) {
      console.error("[TRACE wrap error]", e);
    }
    return orig.apply(this, args);
  };
}

["exec","execSync","spawn","spawnSync","execFile","execFileSync"].forEach(wrap);
