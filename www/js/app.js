angular.module('photonDiscoverer', ['ionic', 'ui.router'])

.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/')

    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'home.html'
    })
    .state('poll', {
        url: '/poll',
        templateUrl: 'poll.html'
    })
})

.run(function($ionicPlatform, discoveryService) {
    $ionicPlatform.ready(function() {
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            StatusBar.styleDefault();
        }
    });
})

.controller('pollController', ['$scope', '$interval', '$http', 'discoveryService', function($scope, $interval, $http, discoveryService, listController) {
    var accessToken = '';
    var api_url = 'https://api.particle.io/v1/devices/';

    var pollInterval;
    $scope.pollButtonText = 'Start';
    $scope.polling = false;

    // List items
    $scope.items = [];

    var apiRequest = function(url, callback) {
        if (callback) {
            $http.get(url).then(callback(response));
        }
        else {
            $http.get(url).then(function(response) {
                console.log(response.data);
                $scope.addItem(JSON.stringify(response.data, null, 4));
            });
        }
    };

    var clearPollInterval = function() {
        if (angular.isDefined(pollInterval)) {
            $interval.cancel(pollInterval);
            pollInterval = undefined;
        }

        $scope.polling = false;
        $scope.pollButtonText = 'Start';
    };

    $scope.poll = function() {
        var deviceIDs = discoveryService.getDeviceIDs();
        if (!angular.isDefined(pollInterval)) {
            $scope.polling = true;

            pollInterval = $interval(function() {
                for (var i = 0; i < deviceIDs.length; i++) {
                    var url = api_url + deviceIDs[i] + '?access_token=' + accessToken;
                    apiRequest(url);
                }
            }, 3000);

            $scope.pollButtonText = 'Stop';
        }
        else {
            clearPollInterval();
        }
    };

    $scope.addItem = function(item) {
        $scope.items.push(item);
    };
}])

.controller('searchController', ['$scope', '$interval', '$state', 'discoveryService', function($scope, $interval, $state, discoveryService) {
    var searchInterval;
    var interValCounter = 0;
    $scope.searchButtonText = 'Search';
    $scope.searching = false;

    var listenPort = 51014;
    var multiCastIP = '239.13.10.13';
    var port = 51013;


    var clearSearchInterval = function() {
        // Stop interval
        if (angular.isDefined(searchInterval)) {
            $interval.cancel(searchInterval);
            searchInterval = undefined;
        }

        $scope.searchButtonText = 'Search';
        $scope.searching = false;

        if (discoveryService.getDeviceIDs().length > 0) {
            discoveryService.closePort();
            $state.go('poll');
        }
    };

    $scope.search = function() {
        if (!angular.isDefined(searchInterval)) {
            $scope.searching = true;

            discoveryService.bindPort(listenPort, function(result) {
                var id = discoveryService.arrayBuffer2String(result.data);
                if (!discoveryService.isIdDiscovered(id)) {
                    discoveryService.addDeviceId(id);
                }
            });

            discoveryService.clearDeviceIDs();
            discoveryService.sendMessage(multiCastIP, port, 'HELLOPHOTON');

            // Start interval
            interValCounter = 0;
            searchInterval = $interval(function() {
                if (interValCounter < 2) {
                    discoveryService.sendMessage(multiCastIP, port, 'HELLOPHOTON');
                    interValCounter++;
                }
                else {
                    clearSearchInterval();

                    // Log ids
                    if (discoveryService.getDeviceIDs().length > 0) {
                        console.log(discoveryService.getDeviceIDs());
                    }

                    $scope.searchButtonText = 'Search';
                }
            }, 5000);

            $scope.searchButtonText = 'Stop';
        }
        else {
            clearSearchInterval();

            // Log ids
            if (discoveryService.getDeviceIDs().length > 0) {
                console.log(discoveryService.getDeviceIDs());
            }

            $scope.searchButtonText = 'Search';
        }
    };
}])

/**
 * Discovery Service
 *
 * Provides methods to communicate over the network
 */
.factory('discoveryService', function() {
    // Id of the socket
    var socketId = -1;

    // Array of deviceIDs
    var deviceIDs = [];

    var methods = {
        /**
         * Binds a Port
         *
         * @param portNumber Port to listen on
         * @param receiveCallback Callback to handle received data
         */
        bindPort: function(portNumber, receiveCallback) {
            chrome.sockets.udp.create({}, function(socketInfo) {
              socketId = socketInfo.socketId;

               // Bind socket
               chrome.sockets.udp.bind(socketId, '0.0.0.0', portNumber, function(result) {
                   if (result < 0) {
                       console.log('Error binding socket!');
                       return;
                   }

                   // Listener
                   chrome.sockets.udp.onReceive.addListener(function(result) {
                       if (result.socketId !== socketId) {
                           return;
                       }
                       else {
                            receiveCallback(result);
                        }
                    });
               });
           });
        },

        /**
         * Closes the socket/port
         */
        closePort: function() {
            // Close the UDP socket
            chrome.sockets.udp.close(socketId);
            socketId = -1;
        },

        /**
         * Sends a message to a designated ip + port
         *
         * @param ip Target ip
         * @param port Target port
         * @param message Message to send
         */
        sendMessage: function(ip, port, message) {
            chrome.sockets.udp.getSockets(function(socketInfos) {
                if (socketInfos.length > 0) {
                    chrome.sockets.udp.send(socketId, methods.string2ArrayBuffer(message), ip, port, function(sendInfo) {
                        console.log(sendInfo);
                    });
                }
            });
        },

        /**
         * Converts a string to an ArrayBuffer
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
          * Converts an ArrayBuffer to String
          *
          * @param buffer ArrayBuffer to Convert
          * @return String
          */
        arrayBuffer2String: function(buffer) {
            return String.fromCharCode.apply(null, new Uint8Array(buffer));
        },

        /**
         * Adds a device id
         *
         * @param id Device id to add
         */
        addDeviceId: function(id) {
            deviceIDs.push(id);
        },

        /**
         * Get a device id
         *
         * @param id Position in the deviceIDs array
         *
         * @return String
         */
        getDeviceId: function(id) {
            return deviceIDs[id];
        },

        /**
         * Returns the deviceIDs
         *
         * @return Array
         */
        getDeviceIDs: function() {
            return deviceIDs;
        },

        /**
         * Checks if a device id is already in the deviceIDs array
         *
         * @return boolean
         */
        isIdDiscovered: function(id) {
            for (var i = 0; i < deviceIDs.length; i++) {
                if (id == deviceIDs[i]) {
                    return true;
                }
            }

            return false;
        },

        /**
         * Clears the deviceIDs array
         */
        clearDeviceIDs: function() {
            deviceIDs = [];
        }
    }

    return methods;
})
