# Photon Discoverer

Photon Discoverer is an example app for automatic discovery of Photons inside a network.

## Installation

Clone the repository an switch to ionic

```
git clone https://github.com/jnsdbr/PhotonDiscoverer.git
git checkout ionic
git pull origin ionic
```

Add a platform

```
ionic platform add android
```

Add your access token to the app.js on line 28
```
access_token: '<yourtoken>',
```

Build

```
ionic build android
```
