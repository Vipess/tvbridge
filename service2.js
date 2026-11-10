"use strict";
var net = require("net");
var http = require("http");
var LOG = [];
function note(s) { LOG.push(s); }

function boot() {
    // status server first, so the LAN can see us even if nothing else works
    try {
        http.createServer(function (req, res) {
            res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
            res.end("tvbridge\n" + LOG.join("\n") + "\n");
        }).listen(9098, "0.0.0.0", function () { note("http up on 9098"); });
    } catch (e) { note("http FAIL " + e.message); }

    // relay -> local adb server (sdbd accepts 127.0.0.1 because devIP is 127.0.0.1)
    try {
        net.createServer(function (c) {
            var u = net.connect(26101, "127.0.0.1");
            c.on("error", function () {}); u.on("error", function () {});
            c.pipe(u); u.pipe(c);
            c.on("close", function () { try { u.destroy(); } catch (e) {} });
        }).listen(9097, "0.0.0.0", function () { note("relay up on 9097"); });
    } catch (e) { note("relay FAIL " + e.message); }

    var cp;
    try { cp = require("child_process"); } catch (e) { note("child_process FAIL " + e.message); }
    if (!cp) return;
    var forms = [
        "buxton2ctl set-string system db/sdk/develop/ip 192.168.1.100",
        "buxton2ctl set-str system db/sdk/develop/ip 192.168.1.100",
        "buxton2ctl set-value system db/sdk/develop/ip 192.168.1.100",
        "buxton2ctl set-string db/sdk/develop/ip 192.168.1.100",
        "buxton2ctl get-value system db/sdk/develop/ip"
    ];
    for (var i = 0; i < forms.length; i++) {
        try {
            var out = cp.execSync(forms[i], { encoding: "utf8", timeout: 8000 });
            note("OK " + forms[i] + " => " + String(out).replace(/\s+/g, " ").substring(0, 160));
        } catch (e) {
            note("FAIL " + forms[i] + " => " + (e && e.message ? String(e.message).substring(0, 160) : String(e)));
        }
    }
    try { note("mode => " + cp.execSync("buxton2ctl get-value system db/sdk/develop/mode", { encoding: "utf8" }).replace(/\s+/g, " ")); } catch (e) {}
}

try { boot(); } catch (e) { LOG.push("boot throw " + e.message); }
