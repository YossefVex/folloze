/**
 * install: npm i node-worker-threads-pool
 *
 */

 const { randomUUID } = await import('crypto');
 /**
  *
  * @param {*} invokeFunctionsArray = [invoke: function, params: json]
  * @param {*} repeats
  */
 function InvokeObjectCreator(invokeFunctionsArray = [], repeats = []) {
	 this.invokeArr = invokeFunctionsArray;
	 this.repeats = repeats;
 }
 class LifecycleManager {
	 #beforeInvokingObject;
	 #afterInvokingObject;
	 #mainInvokingFuncObject;
	 #handleErrorObject;
	 max_concurrent;
	 workerPool = this.workerPoolFunc;
 
	 constructor({
		 beforeInvokingObject = new InvokeObjectCreator(),
		 afterInvokingObject = new InvokeObjectCreator(),
		 mainInvokingFuncObject = new InvokeObjectCreator(),
		 handleErrorObject = null,
		 workerPool = null,
		 max_concurrent = 2
	 }) {
		 this.#beforeInvokingObject = beforeInvokingObject;
		 this.#afterInvokingObject = afterInvokingObject;
		 this.#mainInvokingFuncObject = mainInvokingFuncObject;
		 this.#handleErrorObject = handleErrorObject;
		 this.max_concurrent = max_concurrent;
		 if (workerPool) {
			 this.workerPool = workerPool;
		 }
	 }
 
	 async workerPoolFunc(workerFunction, params) {
		 const { StaticPool } = import('node-worker-threads-pool');
 
		 const pool = new StaticPool({
			 size: this.max_concurrent,
			 task: './file_worker.js'
		 });
		 const result = await pool.exec(workerFunction, params);
		 return result.data;
	 }
 
	 isFunction = (func) => {
		 return func instanceof Function;
	 };
 
	 isPromise = (obj) => {
		 return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
	 };
 
	 prepareInvokeArrForExecution(invokingObject) {
		 let invokeArrRefactordForExecution;
		 if (invokingObject.invokeArr.length === 1 && this.this.workerPool) {
			 invokeArrRefactordForExecution = [this.workerPool(invokingObject.invokeArr.invoke, invokingObject.invokeArr.params)];
		 } else {
			 invokeArrRefactordForExecution = invokingObject.invokeArr.map((invokeObj) => {
				 const { invoke } = invokeObj;
				 const { params } = invokeObj;
				 if (!this.isPromise(invokeObj.invoke)) {
					 return new Promise((resolve, reject) => {
						 resolve(invoke(params));
					 });
				 }
				 return invoke(params);
			 });
		 }
		 return invokeArrRefactordForExecution;
	 }
 
	 invokeFunctionInvocation = async (invokingObject, repeatTime) => {
		 /** i could make recurtion with different repeatsrepeats for every single callback - i choose not to;
		  * 	could also make repeats only for the callbacks that failed but didn't want to go too far with it;
		  */
		 let results = null;
		 let retrySuccessFlag = false;
		 await new Promise((resolve, reject) => {
			 setTimeout(async () => {
				 const invokeArrRefactordForExecution = this.prepareInvokeArrForExecution(invokingObject);
				 results = await Promise.allSettled(invokeArrRefactordForExecution);
				 if (!results.some((result) => result.status === 'rejected')) {
					 retrySuccessFlag = true;
				 }
				 resolve();
			 }, repeatTime);
		 });
		 return [retrySuccessFlag, results];
	 };
 
	 checkFunctionsArrayValidy = (functionObject) => {
		 let notValid = false;
		 if (Array.isArray(functionObject.invokeArr)) {
			 notValid = functionObject.invokeArr.some((func) => !this.isFunction(func));
		 } else if (this.isFunction(functionObject.invokeArr)) {
			 /** single_function to [single_function] */
			 functionObject.invokeArr = [functionObject.invokeArr];
		 } else {
			 notValid = true;
		 }
		 return notValid;
	 };
 
	 invokeFunctionWithRepeats = async ({ invokingObject, functionName = 'someFunction', uuid }) => {
		 if (!this.checkFunctionsArrayValidy(this.beforeInvokingObject)) {
			 console.error(`${functionName} is not a Function Array!`);
		 }
		 if (!Array.isArray(invokingObject.repeats)) {
			 return invokingObject.invoke();
		 }
		 let retrySuccessFlag = false;
		 let results = null;
		 for (const repeatTime of invokingObject.repeats) {
			 // eslint-disable-next-line no-loop-func
			 [retrySuccessFlag, results] = this.invokeFunctionInvocation(invokingObject, repeatTime);
			 if (retrySuccessFlag) {
				 /** stop looping, function successfully invoked */
				 console.log(`Retry of uuid: ${uuid} with function named: ${functionName} succeeded after ${repeatTime}s !`);
				 break;
			 }
		 }
		 if (!retrySuccessFlag) {
			 if (this.#handleErrorObject) {
				 this.#handleErrorObject({ uuid, invokingObject, functionName, results });
			 } else {
				 console.log(`Retry of uuid: ${uuid} with function named: ${functionName} failed to execute ${invokingObject.repeats.length} attemps !`);
			 }
		 }
		 return results;
	 };
 
	 beforeInvoke = async (uuid) => {
		 console.log(`Task Received with id: ${uuid}`);
		 const params = {
			 invokingObject: this.#beforeInvokingObject,
			 functionName: 'before-Invoking-Function',
			 uuid
		 };
		 await this.invokeFunctionWithRepeats(params);
	 };
 
	 mainInvoke = async (uuid) => {
		 const params = {
			 invokingObject: this.#mainInvokingFuncObject,
			 functionName: 'main-Invoking-Function',
			 uuid
		 };
		 await this.invokeFunctionWithRepeats(params);
	 };
 
	 afterInvoke = async (uuid) => {
		 const params = {
			 invokingObject: this.#afterInvokingObject,
			 functionName: 'after-Invoking-Function',
			 uuid
		 };
		 await this.invokeFunctionWithRepeats(params);
		 console.log(`Task Finished with id: ${uuid}`);
	 };
 
	 invoke = async (cb, args) => {
		 const uuid = randomUUID();
		 /** i made this 3 function explicit invoked and not only with defferent params for future mutation / addons for each one of them; */
		 const beforeInvokeResult = this.beforeInvoke(uuid);
		 const mainInvokeResult = this.mainInvoke(uuid);
		 const afterInvokeResult = this.afterInvoke(uuid);
		 return {
			 beforeInvokeResult,
			 mainInvokeResult,
			 afterInvokeResult
		 };
	 };
 }
 
 export default LifecycleManager;
 