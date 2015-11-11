var app = {
    socketId: 0,
    photonId: 0,
    apiURL: 'https://api.particle.io/v1/devices/',
    access_token: '',
    pollInterval: null,
    state: 0,
    keyWord: 'HELLOPHOTON',

    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },

    /**
     * Bind Event Listeners
     *
     * Bind any events that are required on startup. Common events are:
     * 'load', 'deviceready', 'offline', and 'online'.
     */
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },

    /**
     * deviceready Event Handler
     *
     * The scope of 'this' is the event. In order to call the 'receivedEvent'
     * function, we must explicitly call 'app.receivedEvent(...);'
    */
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
        app.setupUDP();

        // Convert keyWord to ArrayBuffer
        app.keyWord = app.string2ArrayBuffer(app.keyWord);

        // Bind Send button
        document.getElementById('action').addEventListener('click', function(e) {

            if (app.state == 0) {
                // Check if there is any socket
                chrome.sockets.udp.getSockets(function(socketInfos) {
                    if (socketInfos.length > 0) {
                        chrome.sockets.udp.send(app.socketId, app.keyWord, '239.13.10.13', 51013, function(sendInfo) {
                            console.log(sendInfo);
                        });
                    }
                });
            }
            else if (app.state == 1) {
                app.startPolling();
                app.receivedEvent('startpolling');
                app.state = 2;
            }
            else if (app.state == 2) {
                app.stopPolling();
                app.receivedEvent('stoppolling');
                app.state = 1;
            }
        });
    },

    /**
     * Setup the UDP connection
     */
    setupUDP: function() {
        chrome.sockets.udp.create({}, function(socketInfo) {
            app.socketId = socketInfo.socketId;

            // Bind socket
            chrome.sockets.udp.bind(app.socketId, '0.0.0.0', 51014, function(result) {
                if (result < 0) {
                    console.log('Error binding socket!');
                    return;
                }
            });

            // Listener
            chrome.sockets.udp.onReceive.addListener(function(result) {
                if (result.socketId !== app.socketId) {
                    return;
                }
                else {
                    app.photonId = app.arrayBuffer2String(result.data);
                    app.receivedEvent('foundPhoton');
                    // Close the UDP socket
                    chrome.sockets.udp.close(app.socketId);
                    app.getDeviceInfo(app.photonId);
                    app.state = 1;
                }
            });
        });
    },

    /**
     * Update the DOM according to a received Event
     *
     * @param id eventId
     */
    receivedEvent: function(id) {
        if (id == 'deviceready') {
            var parentElement = document.getElementById(id);
            var receivedElement = parentElement.querySelector('.received');
            var listeningElement = parentElement.querySelector('.listening');

            listeningElement.setAttribute('style', 'display:none;');
            receivedElement.setAttribute('style', 'display:block;');
        }
        if (id == 'foundPhoton') {
            document.getElementById('headline').innerHTML = 'Photon found';
            document.querySelector('.received').innerHTML = 'id: ' + app.photonId;
            document.querySelector('.app img').src = 'img/found.png';
            document.getElementById('action').innerHTML = 'Start Polling';
        }
        if (id == 'startpolling') {
            document.getElementById('action').innerHTML = 'Stop Polling';
        }
        if (id == 'stoppolling') {
            document.getElementById('action').innerHTML = 'Start Polling';
        }

        console.log('Received Event: ' + id);
    },

    /**
     * Convert string to ArrayBuffer
     *
     * @param string String to Convert
     * @return ArrayBuffer
     */
    string2ArrayBuffer: function(string) {
        var buffer = new ArrayBuffer(string.length);
        var bufferView = new Uint8Array(buffer);
        for (var i = 0; i < string.length; i++) {
            bufferView[i] = string.charCodeAt(i);
        }
        return buffer;
    },

    /**
     * Convert an ArrayBuffer to String
     *
     * @param buffer ArrayBuffer to Convert
     * @return String
     */
    arrayBuffer2String: function(buffer) {
        return String.fromCharCode.apply(null, new Uint8Array(buffer));
    },

    /**
     * Creates an interval for polling data from the cloud
     */
    startPolling: function() {
        app.pollInterval = setInterval(function() {
            app.getDeviceVar('number1', function(response) {
                var json = JSON.parse(response);
                console.log(json);
                document.querySelector('.received').innerHTML = 'value: ' + json.result;
            });
        }, 5000);
    },

    /**
     * Stops the polling interval
     */
    stopPolling: function() {
        clearInterval(app.pollInterval);
    },

    /**
     * Generate the device url
     *
     * @param id Id of the device
     * @return URL
     */
    getDeviceURL: function(id) {
        return app.apiURL + id + '?access_token=' + app.access_token;
    },

    /**
     * Returns the json for a var
     *
     * @param varname Name of the var
     * @param callback function to execute when the request is finished
     */
    getDeviceVar: function(varname, callback) {
        var varURL = app.apiURL + app.photonId + '/' + varname + '?access_token=' + app.access_token;
        app.apiRequest(varURL, function(response) {
            if (response.readyState == 4 && response.status == 200) {
                // Output response
                //console.log(response.responseText);

                if (callback) {
                    callback(response.responseText);
                }
            }
        });
    },

    /**
     * Returns the device info
     *
     * @param id Id of the device to look for
     * @param callback function to execute when the request is finished
     */
    getDeviceInfo: function(id, callback) {
        app.apiRequest(app.getDeviceURL(id), function(response) {
            if (response.readyState == 4 && response.status == 200) {
                // Output response
                console.log(response.responseText);

                if (callback) {
                    callback(response.responseText);
                }
            }
        });
    },

    /**
     * Creates a HTTP request
     *
     * @param url URL for the request
     * @param callback function to execute when the request is finished
     */
    apiRequest: function(url, callback) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            callback(xhttp);
        };
        xhttp.open('GET', url, true);
        xhttp.send();
    }
};

app.initialize();
