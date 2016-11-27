<img src="http://www.ratatoskr.io/logos/logo-text-regular.png" alt="ratatoskr logo"/>
============
[![Build Status](https://secure.travis-ci.org/JoeHegarty/ratatoskr.svg?branch=master)](https://travis-ci.org/JoeHegarty/ratatoskr)
[![Dependency Status](https://david-dm.org/JoeHegarty/ratatoskr.svg)](https://david-dm.org/JoeHegarty/ratatoskr)
[![devDependency Status](https://david-dm.org/JoeHegarty/ratatoskr/dev-status.svg)](https://david-dm.org/JoeHegarty/ratatoskr#info=devDependencies)
[![NPM version](https://badge.fury.io/js/ratatoskr.svg)](https://www.npmjs.com/package/ratatoskr)

*Note: This library is highly experimental*

Ratatoskr is a lightweight virtual actor framework for node.js. It aims to make writing realtime distributed systems easier by leveraging the advantage of virtual actors to allow developers to focus on application logic instead of how their application will be distributed.

Basic Example
=====
1. `npm install --save ratatoskr`
2. Start redis locally

```javascript
const ratatoskr = require("ratatoskr")();

ratatoskr.actor("helloActor", () => {
    return class {
        onMessage(username) {
            return "Hello, " + username;
        }
    }
});

ratatoskr.start().then(() => {
    return ratatoskr.send("helloActor", "Joe").then((result) => {
        console.log(result);
    });
});
```

Documentation
=====
Visit the [wiki](https://github.com/JoeHegarty/ratatoskr/wiki) for more documentation.
