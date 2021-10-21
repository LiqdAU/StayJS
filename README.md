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
| Name        | Type           | Description                                                  | Default                  |
| ----------- | -------------- | ------------------------------------------------------------ | ------------------------ |
| sections    | Array<Object>  | An array of objects to define the sections on the page that will be controlled by StayJS. | {}                       |
| absolute    | Boolean        | If set to true, sections will be absolutely positioned and translated to the current scroll position via CSS. This helps with scroll events through elements that require pointer events. | false                    |
| allowScroll | Boolean        | If disabled, the document body's overflow property will be set to hidden, disabling scroll capabilities. | true                     |
| navigation  | Object/Boolean | Whether to enable navigation, or an optional settings object - see Navigation below for details. | false                    |
| scroller    | Node/Selector  | The element to use for DOM scrolling capabilities.           | document.documentElement |
| wrap        | Node/Selector  | The element to use as the main wrap for any elements added to the page by the plugin. | document.body            |
| debug       | Boolean        | Whether to enable the debugger by default.                   | false                    |
| isReady     | Callback       | A callback that returns whether the page is ready for animations to be triggered. | () => true               |
| hashOpts    | Object         | Options to pass to the scrollTo method when clicking on anchor links. | {}                       |

