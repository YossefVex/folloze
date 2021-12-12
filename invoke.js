/**
 * install: npm i node-worker-threads-pool
 * 
 */

 const { randomUUID } = await import('crypto');

class LifecycleManager {
	max_concurrent = 2;
	repeat = 0;
	repeatTime = 0;
	repeatedTimes = 0;
	beforeInvokingFunc;
	handleErrorFunc;;
	afterInvokingFunc;

	constructor({ repeat = false, repeatTime = 60000, beforeInvokingFunc = null, afterInvokingFunc= null, 
		handleErrorFunc= null, max_concurrent = 2, workerPool = false  }) {
		if (typeof repeat == 'number' && +repeat > 0)
			this.repeat = repeat;
		if (!isNaN(repeatTime) && +repeatTime > 0)
			this.repeatTime = repeatTime;
		this.beforeInvokingFunc =beforeInvokingFunc;
		this.afterInvokingFunc = afterInvokingFunc;
		this.handleErrorFunc = handleErrorFunc;
		this.workerPool = workerPool;;
		this.max_concurrent = max_concurrent;
	}

	async workerPool(workerFunction, params){
		const { StaticPool } = import('node-worker-threads-pool');
		
		const pool = new StaticPool({
			size: this.max_concurrent,
			task: './file_worker.js'
		});
		const result = await pool.exec(workerFunction, params);
		return result.data;
		}

	invoke = async (cb, args) => {
		const uuid = randomUUID();
		console.log(`Task Received with id: ${uuid}`);
		let result;
		try {
			if(this.beforeInvokingFunc){
				try {
					await this.beforeInvokingFunc();
				} catch (error) {
					console.error(`Error in 'before-Invoking-Function' of Task id: ${uuid}`);
				}
			}
			console.log(`Task Running with id: ${uuid}`);
			
			if(this.workerPool){
				result = await this.workerPool(cb, args);
			} else {
				result = await cb(args);
			}
			if(this.afterInvokingFunc){
				try{
					await this.afterInvokingFunc()
				} catch(error){
					console.error(`Error in 'after-Invoking-Function' of Task id: ${uuid}`);
				}
			}
			console.log(`Task Finished with id: ${uuid}`);
		} catch (error) {
			if(this.handleErrorFunc){
				this.handleErrorFunc(error);
			}
			if(this.repeat && this.repeat > this.repeatedTimes) {
				this.repeatedTimes -= 1;
				setTimeout(async () => this.invoke(cb, args), this.repeatTime)
			}
		}
	}


}

export default LifecycleManager;