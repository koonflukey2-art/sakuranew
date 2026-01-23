try {
  const dns = require("dns");
  if (dns.setDefaultResultOrder) dns.setDefaultResultOrder("ipv4first");
  console.log("[ipv4first] dns result order set to ipv4first");
} catch (e) {
  console.log("[ipv4first] skip:", e?.message || e);
}
