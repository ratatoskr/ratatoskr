
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
	for (var i = 0; i < numCPUs; i++) {
		cluster.fork();
	}
}
else {
	const server = require("..")({ logLevel: "error" });

	server.actor("helloActor", () => {
		return class {
			onMessage(username, context) {
				return "Hello, " + username + " from " + context.api.clusterInfo().localNode.nodeId;
			}
		}
	});

	server.start().then(() => {
		return server.send("helloActor", "Joe").then((result) => {
			console.log(result);
		});
	}
	);
}

