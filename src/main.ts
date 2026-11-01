import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import vReveal from './directives/reveal'

// 创建Vue应用实例
const app = createApp(App)

// 滚动显现指令
app.directive('reveal', vReveal)

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app')
