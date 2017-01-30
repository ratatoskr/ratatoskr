<a href="http://www.ratatoskr.io"><img src="http://www.ratatoskr.io/logos/logo-text-regular.png" alt="ratatoskr logo"/></a>
============
[![Build Status](https://secure.travis-ci.org/ratatoskr/ratatoskr.svg?branch=master)](https://travis-ci.org/ratatoskr/ratatoskr)
[![Dependency Status](https://david-dm.org/ratatoskr/ratatoskr.svg)](https://david-dm.org/ratatoskr/ratatoskr)
[![devDependency Status](https://david-dm.org/ratatoskr/ratatoskr/dev-status.svg)](https://david-dm.org/ratatoskr/ratatoskr?type=dev)
[![NPM version](https://badge.fury.io/js/ratatoskr.svg)](https://www.npmjs.com/package/ratatoskr)

*Note: This library is highly experimental.*

Ratatoskr is a lightweight virtual actor framework for node.js. 

Ratatoskr aims to make writing realtime distributed systems easier by leveraging [virtual actors](https://github.com/JoeHegarty/ratatoskr/wiki/Actor-Behavior) to allow developers to focus on application logic, not how their application will be distributed. 

Visit the [wiki](https://github.com/JoeHegarty/ratatoskr/wiki) for more documentation.

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
