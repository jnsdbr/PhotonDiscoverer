# Photon Discoverer

Photon Discoverer is an example app for automatic discovery of Photons inside a network.

## Installation

Clone the repository to a temporary directory:

```
git clone https://github.com/jnsdbr/PhotonDiscoverer.git PhotonDiscovererTmp
```

Create a new cordova project

```
cordova create PhotonDiscoverer
```

Copy the files from the repository to the cordova project

```
cd PhotonDiscovererTmp
cp -R * ../PhotonDiscoverer/
cd ../PhotonDiscoverer
```

Add a platform

```
cordova plugin add android
```

Build

```
cordova build android
```