## StayJS
###### Scroll Animation Timeline
[Demo (StayJS + ThreeJS)](https://brycegough.github.io/StayThreeD/)

---
#### Getting Started
```js
window._$ = new Stay({
  absolute: true,
  allowScroll: false,
  navigation: {
    enabled: true,
    speed: 2000
  },
  scroller: document.body,
  wrap: 'main',
  debug: debug.scroll,
  isReady: () => LK.ready,
  hashOpts: {
    smooth: false
  }
});
```

---
#### Options
| Name     | Type | Description                                                                                                                                                                                   | Default |
|----------|------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| absolute | bool | If set to true, sections will be absolutely positioned and translated to the current scroll position via CSS. This helps with scroll events through elements that require pointer events. | false   |
