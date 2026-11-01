import type { Directive } from 'vue'

/**
 * v-reveal：元素进入视口时，从模糊里"浮"上来。
 * 用法：v-reveal 或 v-reveal="120"（延迟毫秒）
 */
const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal')

    const delay = typeof binding.value === 'number' ? binding.value : 0
    if (delay > 0) el.style.transitionDelay = `${delay}ms`

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('is-in')
            observer.disconnect()
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    observer.observe(el)

    // 首屏元素可能已经可见，直接触发不会闪一下
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.92) {
      requestAnimationFrame(() => el.classList.add('is-in'))
      observer.disconnect()
    }
  },
  unmounted(el) {
    el.classList.remove('reveal', 'is-in')
  },
}

export default vReveal
