/**
* @description MeshCentral SystemdViewer plugin - Agent Side
*/

"use strict";

var mesh;
var isWsconnection = false;
var wscon = null;

/**
 * The function handling console or plugin actions for this plugin.
 * This is basically what runs on the agent side (node context).
 */
function consoleaction(args, rights, sessionid, parent) {
    // We can store references if needed
    mesh = parent;
    isWsconnection = false;
    wscon = parent;
    // If no subcommand was provided, skip
    if (typeof args['_'] === 'undefined' || args['_'].length < 2) {
        return;
    }

    var fnname = args['_'][1];
    switch (fnname) {
        case 'getServiceList':
            getServiceList();
            break;

        default:
            // Unknown action
            break;
    }
}

/**
 * Called if we want to gather systemd services info on Linux
 */
function getServiceList() {
    // If we're on Windows, or anything else, let's bail out
    if (process.platform !== 'linux') {
        // Return a result with "not supported" message
        mesh.SendCommand({
            action: 'plugin',
            plugin: 'systemdviewer',
            pluginaction: 'serviceListResult',
            services: ['Platform not supported (only Linux)']
        });
        return;
    }

    try {
        // We'll run "systemctl list-units --type=service" and capture the output
        var child = require('child_process').execFile('/bin/sh', ['sh']);
        var outstr = '';
        var errstr = '';

        child.stderr.on('data', function(chunk) { errstr += chunk; });
        child.stdout.on('data', function(chunk) { outstr += chunk; });

        child.on('exit', function(code, signal) {
            if (errstr) {
                // If there's an error, let's return it
                mesh.SendCommand({
                    action: 'plugin',
                    plugin: 'systemdviewer',
                    pluginaction: 'serviceListResult',
                    services: [ 'Error: ' + errstr ]
                });
            } else {
                // Format or parse outstr as an array of lines
                var lines = outstr.split('\n').filter(function(l){ return l.trim() !== ''; });
                mesh.SendCommand({
                    action: 'plugin',
                    plugin: 'systemdviewer',
                    pluginaction: 'serviceListResult',
                    services: lines
                });
            }
        });

        // Run the systemctl command inside our shell
        child.stdin.write('systemctl list-units --type=service\n');
        child.stdin.write('exit\n');
    } catch (e) {
        mesh.SendCommand({
            action: 'plugin',
            plugin: 'systemdviewer',
            pluginaction: 'serviceListResult',
            services: [ 'Error: ' + e.toString() ]
        });
    }
}

/**
 * We must export consoleaction so the agent can handle our plugin's commands.
 */
module.exports = { consoleaction : consoleaction };
