const { parentPort } = require('worker_threads');

parentPort.on('message', async (workerFunction, params) => {
	const childResult = await workerFunction(params);
	parentPort.postMessage({ data });
});