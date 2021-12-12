import LifecycleManager from './invoke.js'

const func = ({a,b})=>{throw new Error('try error')}
const func1 = ({a,b})=>{console.log(a+b)}
const params = {a:1, b:2}

const ins = new LifecycleManager({repeatTimes: 2});
ins.invoke(func, params);