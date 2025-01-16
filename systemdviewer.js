/**
* @description MeshCentral SystemdViewer plugin - Server Side
*/

"use strict";

module.exports.systemdviewer = function (parent) {
    var obj = {};
    // "parent" is our plugin object, from which we can access the meshServer
    obj.parent = parent;
    obj.meshServer = parent.parent;
    obj.db = null; // Not necessarily needed for this example, but left for reference
    obj.debug = obj.meshServer.debug;
    obj.VIEWS = __dirname + '/views/';
    
    // Which plugin functions we want to be callable from the client side (web UI)
    obj.exports = [
        'onDeviceRefreshEnd'
    ];

    /**
     * Called by MeshCentral each time a device is selected in the web interface.
     * We will register a tab for our plugin.
     */
    obj.onDeviceRefreshEnd = function() {
        // The pluginHandler exists on the parent. We can call registerPluginTab to create a new tab in the device UI.
        pluginHandler.registerPluginTab({
            tabTitle: 'Systemd Viewer',   // Visible name of the tab
            tabId: 'systemdviewer'       // The ID used by the <div> in the UI
        });
        
        // Optionally, add an iFrame or direct HTML content. We'll embed a simple page:
        // The pluginadmin.ashx?pin=systemdviewer&user=1 route is explained below in `handleUserRequest`.
        QA('systemdviewer', '<iframe id="pluginIframeSystemd" style="width: 100%; height: 700px; border: 0px;" src="/pluginadmin.ashx?pin=systemdviewer&user=1"></iframe>');
    };

    /**
     * Called once when the server starts (or plugin is loaded).
     */
    obj.server_startup = function() {
        // If your plugin needs a database or any initialization, do it here
        // For example, obj.db = someDbObject...
    };

    /**
     * Called by MeshCentral for /pluginadmin.ashx requests with ?pin=systemdviewer
     * and the user=1 or admin=1 flag. Here we serve up the views or handle custom logic.
     */
    obj.handleAdminReq = function(req, res, user) {
        // Only handle it if pin=systemdviewer
        // This example does not distinguish admin vs. normal user because we have no admin panel
        if (req.query.user == 1) {
            // Serve a minimal user interface
            return res.render(obj.VIEWS + 'user', {}); 
        }
        // If it's not user=1, or anything else, we simply deny
        return res.sendStatus(401);
    };

    /**
     * Called whenever the server receives a plugin action from the web client or the mesh agent.
     * We'll handle those messages here, bridging the request to the agent or to the UI, etc.
     */
    obj.serveraction = function(command, myparent, grandparent) {
        switch (command.pluginaction) {

            // Sent by the web UI to request the agent to list systemd services
            case 'getServiceList':
                // Send an action down to the agent
                // myparent.dbNodeKey is the node’s unique ID for the agent
                obj.meshServer.webserver.wsagents[myparent.dbNodeKey].send(JSON.stringify({
                    action: "plugin",
                    plugin: "systemdviewer",
                    pluginaction: "getServiceList"
                }));
                break;

            // Agent -> Server: The agent returns the list of systemd services
            case 'serviceListResult':
                // Dispatch the data to all watchers or just the user who requested it
                // Typically, to all users currently viewing
                var targets = ['*', 'server-users'];
                obj.meshServer.DispatchEvent(targets, obj, {
                    action: 'plugin',
                    plugin: 'systemdviewer',
                    pluginaction: 'updateServiceList',
                    services: command.services || []
                });
                break;

            default:
                console.log('SystemdViewer plugin - unknown serveraction:', command.pluginaction);
                break;
        }
    };

    return obj;
};
