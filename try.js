import LifecycleManager from './invoke.js'

const func = ({a,b})=>{console.log(a+b)}
const params = {a:1, b:2}

const ins = new LifecycleManager({});
ins.invoke(func, params);