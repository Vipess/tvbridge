"use strict";
var net = require("net");
var http = require("http");
var cp = require("child_process");
var LOG = [];

function run(cmd) {
    try {
        var out = cp.execSync(cmd, { encoding: "utf8" });
        LOG.push("OK   " + cmd + " => " + String(out).replace(/\s+$/, "").substring(0, 200));
        return true;
    } catch (e) {
        LOG.push("FAIL " + cmd + " => " + (e && e.message ? e.message : String(e)));
        return false;
    }
}

function setDevIP(ip) {
    var cmds = [
        "buxton2ctl set-string system db/sdk/develop/ip " + ip,
        "buxton2ctl set-value system db/sdk/develop/ip " + ip,
        "buxton2ctl set-str system db/sdk/develop/ip " + ip
    ];
    for (var i = 0; i < cmds.length; i++) { if (run(cmds[i])) break; }
    run("buxton2ctl get-value system db/sdk/develop/ip");
    run("buxton2ctl get-value system db/sdk/develop/mode");
}

setDevIP("192.168.1.100");

var relay = net.createServer(function (client) {
    var upstream = net.connect(26101, "127.0.0.1");
    client.on("error", function () {});
    upstream.on("error", function () {});
    client.pipe(upstream);
    upstream.pipe(client);
    client.on("close", function () { try { upstream.destroy(); } catch (e) {} });
});
relay.on("error", function (e) { LOG.push("relay listen FAIL " + e.message); });
relay.listen(9099, "0.0.0.0", function () { LOG.push("relay listening on 0.0.0.0:9099"); });

http.createServer(function (req, res) {
    res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
    res.end("tvbridge up\n" + LOG.join("\n") + "\n");
}).on("error", function () {}).listen(9098, "0.0.0.0");
