(function($) {

  class Stay {
    sections = [];

    classes = {
      wrap: 'stay-wrap',
      scroller: 'stay-scroller',
      hidden: 'stay-hidden',
      section: {
        class: 'stay-section',
        active: 'active-screen',
      },
      clone: {
        class: 'clone-screen',
        window: 'window-clone',
      },
      nav: {
        wrap: 'stay-nav',
        back: 'stay-go-back',
        next: 'stay-go-next'
      }
    }

    options = {}
    is = {
      debug: false,
      absolute: false
    }
    store = {
      nav: {},
      page: {
        distance: 0,
        current: null,
        index: -1,
        previous: false,
        previousIndex: -1,
        info: {}
      },
      elements: {
        wrap: null,
        scroller: null,
        debug: null,
        windowClone: null
      },
      fn: {
        isReady: () => true,
        onScroll: (e) => this.scroll(e),
        hashChange: (e) => this.scrollToHash()
      }

    }

    constructor(opts) {
      // Set classes on construct if passed in
      this.classes = typeof opts.classes === 'object' ? {
        ...this.classes,
        ...opts.classes
      } : this.classes;

      this.store.elements.wrap = $(opts.wrap || $(document.body));
      this.reset(opts);

      // Events
      let scroller = this.store.elements.scroller,
      target = scroller[0] === document.documentElement ? document : scroller;
      $(target).on('scroll', this.store.fn.onScroll);
      window.addEventListener("hashchange", () => {
        if (!this.is.scrolling) {
          this.store.fn.hashChange();
        }
      }, false);
      $(document).on('click', '.' + this.classes.nav.back, () => this.previous());
      $(document).on('click', '.' + this.classes.nav.next, () => this.next());
    }

    dispose() {
      $(this.store.elements.scroller).off('scroll', this.store.fn.onScroll);

      this.debug(false);
      this.removeAll();
    }

    reset(opts) {
      opts = {...this.options, ...opts};

      // Defaults
      opts.debug = !!opts.debug;
      opts.absolute = !!opts.absolute;
      opts.navigation = opts.navigation || {};
      opts.allowScroll = opts.allowScroll !== false;
      opts.isReady = typeof opts.isReady !== 'function' ? this.store.fn.isReady : opts.isReady;

      this.sections = [];
      this.store.elements.scroller = $(opts.scroller || document.documentElement);

      // Remove window clones
      $('.' + this.classes.clone.window).remove();
      this.store.elements.windowClone = null;

      this.store.fn.isReady = opts.isReady;

      // Add classes to wrap/scrollwrap
      this.store.elements.wrap.addClass(this.classes.wrap);
      this.store.elements.scroller.addClass(this.classes.scroller)

      this.setScroll(opts.allowScroll);
      this.setAbsolute(opts.absolute);
      this.setNavigation(opts.navigation);

      if (opts.debug) {
        this.debug();
      }

      // Add sections defined in opts
      if (Array.isArray(opts.sections)) {
        this.add(opts.sections);
      }

      // Save current options for future use
      this.options = opts;
    }

    debug(toggle) {
      this.is.debug = toggle !== false;

      if (!this.is.debug) {
        this.store.elements.debug = false;
        $('.stay-debug').css('opacity', 0);
        setTimeout(() => $('.stay-debug').remove(), 800);
        return;
      }

      // Removing existing
      $('.stay-debug').remove();

      const el = $('<div class="stay-debug"></div>');
      el.append('<div data-debug="s">Current Section: <span></span></div>');
      el.append('<div data-debug="a">Section %: <span></span>%</div>');
      el.append('<div data-debug="sy">Section Y: <span></span>px</div>');
      el.append('<div data-debug="y">Page Y: <span></span>px</div>');

      el.css({
        'position': 'fixed',
        'bottom': '10px',
        'left': '10px',
        'z-index': '9999999',
        'background': '#fff',
        'line-height': '1.6',
        'box-shadow': '#7a7a7a47 0px 0px 8px',
        'padding': '10px',
        'border-radius': '4px',
        'font-size': '12px',
        'min-width': '300px',
        'pointer-events': 'none',
        'opacity': '0.75',
        'transition': 'opacity 0.5s'
      })

      if (!this.sections.length) {
        el.css('display', 'none');
      }

      $(document.body).append(el);

      this.store.elements.debug = el;
      this.scroll();
    }

    updateDebug(vars) {
      if (this.store.elements.debug) {
        Object.entries(vars).forEach((i) => {
          this.store.elements.debug.find(`[data-debug="${i[0]}"] span`).text(i[1]);
        });
      }
    }

    toggleDebug(show) {
      if (typeof show === 'undefined') {
        show = this.store.elements.debug.css('display') === 'none';
      }
      this.store.elements.debug.css('display', show ? 'block' : 'none');
    }

    triggerChange(section, forward, index) {
      if (this.store.nav && !this.is.scrolling) {
        this.setNavigation({ update: true, fadeDelay: 1000 });
      }

      $(this.store.elements.scroller).trigger('stayChange', [ section, index, forward]);
    }

    get(name) {
      if (!Array.isArray(this.sections)) {
        return false;
      }

      // Try return via index
      if (typeof name === 'number') {
        return this.sections[name];
      }
      // Otherwise, lookup via name
      return this.sections.find(s => s.name === name);
    }

    info() {
      return this.store.page.info;
    }

    update (sections) {
      Object.entries(sections).forEach((i) => {
        const [ name, changes ] = i,
        section = this.get(name);

        if (section && changes.distance) {
          section.distance = changes.distance;
          section.clone.height(section.distance);
        }
      });

      this.refresh();
    }

    refresh() {
      // Update section distance
      let newDist = 0, ready = this.store.fn.isReady();
      this.forEach(section => {
        section.top = newDist;
        newDist += section.distance;

        if (typeof section.setup === 'function') {
          section.setup(section);
        }
      });
      this.store.page.distance = newDist;

      if (ready && this.store.page.current && typeof this.store.page.current.before === 'function') {
        this.store.page.current.before(this.store.page.current);
      }

      // Trigger scroll
      this.scroll();
      setTimeout(() => this.scroll(), 500);
    }

    setNavigation(opts) {
      opts = this._options(opts, {
        enabled: opts,
        hidden: false,
        update: true
      }, true)

      // Setup or destroy if enabled is set
      if (opts.hasOwnProperty('enabled')) {
        if (opts.enabled) {
          let wrap = $('<nav>', { class: this.classes.nav.wrap }),
          back = $('<a>', { href: '#', class: this.classes.nav.back }),
          next = $('<a>', { href: '#', class: this.classes.nav.next });

          wrap.append([ back, next ]);
          $(this.store.elements.wrap).append(wrap);

          this.store.nav = {
            wrap,
            back,
            next,
            updateOnChange: true
          };
          opts.update = true;
        } else if (this.store.nav) {
          this.store.nav.wrap.remove();
          this.store.nav = null;
        }
      }

      // Must be enabled to continue
      if (this.store.nav == null) {
        return;
      }

      // Hide navigation by hiding the wrapper
      if (opts.hasOwnProperty('hidden')) {
        this.store.nav.wrap.toggleClass(this.classes.hidden, opts.hidden);
        if (opts.hidden) {
          this.store.nav.back.addClass(this.classes.hidden);
          this.store.nav.next.addClass(this.classes.hidden);
        }
      }

      // Update the labels
      if (opts.hasOwnProperty('update') && opts.update === true && this.store.nav) {
        let show = this.store.page.current && this.store.page.current.showNav !== false,
        next = this.get(this.store.page.index + 1),
        prev = this.get(this.store.page.index - 1),
        delay = opts.fadeDelay || 0;

        if (this.store.nav.prevTimeout) {
          clearTimeout(this.store.nav.prevTimeout);
        }
        if (this.store.nav.nextTimeout) {
          clearTimeout(this.store.nav.nextTimeout);
        }

        if (show && prev && prev.showInNav !== false) {
          let unhide = () => {
            this.store.nav.back
            .text(prev.label || prev.name)
            .attr('href', '#' + prev.name)

            this.store.nav.back.removeClass(this.classes.hidden);
          };
          if (delay) {
            this.store.nav.back.addClass(this.classes.hidden);
          }
          this.store.nav.prevTimeout = delay ? setTimeout(unhide, delay) : unhide();
        } else {
          this.store.nav.back
          .text('')
          .addClass(this.classes.hidden);
        }

        if (show && next && next.showInNav !== false) {
          let unhide = () => {
            this.store.nav.next
            .text(next.label || next.name)
            .attr('href', '#' + next.name)

            this.store.nav.next.removeClass(this.classes.hidden);
          }
          if (delay) {
            this.store.nav.next.addClass(this.classes.hidden);
          }
          this.store.nav.nextTimeout = delay ? setTimeout(unhide, delay) : unhide();
        } else {
          this.store.nav.next
          .text('')
          .addClass(this.classes.hidden);
        }
      }
    }

    setAbsolute(absolute) {
      absolute = !!absolute;
      this.is.absolute = absolute;
      $(this.store.elements.wrap).toggleClass('stay-abs', absolute);

      if (absolute) {
        let y = this.store.elements.scroller[0].scrollTop;
        $('.' + this.classes.section.class + ':visible').css('transform', 'translate3d(0, ' + y + 'px, 0)');
      } else {
        $('.' + this.classes.section.class).css('transform', 'none');
      }
    }

    setActive(name) {
      let active = typeof name === 'string' ? this.sections.find(s => s.name === name) : name;

      if (active) {
        $('.' + this.classes.section.active).removeClass(this.classes.section.active);
        $(active.element).addClass(this.classes.section.active);
      }
    }

    next(args) {
      let next = this.get(this.store.page.index + 1);
      if (next) {
        this.scrollTo(next, args);
      }
    }

    previous(args) {
      let prev = this.get(this.store.page.index - 1);
      if (prev) {
        this.scrollTo(prev, args);
      }
    }

    setScroll(toggle) {
       $(this.store.elements.scroller).css('overflow', toggle ? 'auto' : 'hidden');
    }

    scrollToHash(opts) {
      if (!window.location.hash) {
        return false;
      }

      const hash = window.location.hash.substring(1),
      section = this.get(hash);

      if (section) {
        this.scrollTo(section, opts);
        return true;
      } else {
        return false;
      }
    }

    scrollToTop(args) {
      return this.scrollToY(0, args)
    }

    scrollToY(index, args) {
      args = args || {};
      args.type = 'Y';
      this.scrollTo(index, args);
    }

    scrollTo(to, args) {

      // Allow shorthand duration
      let duration = typeof args === 'number' ? args : false;

      args = typeof args == 'object' ? args : {};
      args.duration = duration ? duration : args.duration || this.options.navigation.speed || 1000;
      args.ease = args.ease || 'swing';
      args.smooth = args.smooth !== false;
      args.type = args.type || 'index';
      args.hideNav = args.hideNav !== false;

      if (typeof to === 'string') {
        to = isNaN(to) ? this.get(to) : parseInt(to);
      }

      // If index is passed, change destination to the section object
      if (typeof to === 'number' && args.type == 'index') {
        to = this.get(to);
      }

      // If destination is an object, assume it's a section and apply modifiers
      if (typeof to === 'object') {
        let section = to,
        percent = section.defaultPercent || 0;
        to = to.top || 0;

        if (typeof args.percent === 'number') {
          percent = args.percent;
        }

        // Scroll to section %
        if (percent) {
          to += ((section.distance / 100) * percent) + 1;
        } else if (args.top) {
          to += args.top;
        }
      }

      this.is.scrolling = true;

      let isAbs = this.is.absolute,
      afterScroll = () => {
        // Set absolute back to true
        if (isAbs) {
          this.setAbsolute(true);
        }

        this.refresh();

        if (args.hideNav) {
          this.setNavigation({
            hidden: false,
            update: true
          });
        }

        // Start updating on change again
        this.is.scrolling = false;

        if (typeof args.complete === 'function') {
          args.complete();
        }
      };

      if (args.hideNav) {
        this.setNavigation({
          hidden: true
        });
      }

      if (isAbs) {
        this.setAbsolute(false)
      }

      if (args.smooth) {
        $(this.store.elements.scroller).stop()
        .animate({
          scrollTop: to
        }, args.duration, args.ease, () => afterScroll());
      } else {
        $(this.store.elements.scroller)[0].scrollTo(0, to);
        let tidyIndex = this.getFromY(to).index;
        this.tidyUntil(tidyIndex - 1);
        afterScroll();
      }
    }

    tidyUntil(to, from) {
      from = from || 0;

      if (to < 0 || to >= this.sections.length) {
        to = this.sections.length - 1;
      }

      if (from < 0) {
        from = 0;
      } else if (from >= this.sections.length) {
        return false;
      }

      const queue = this.queue();
      for (let i = 0; i <= to; i++) {
        let s = this.sections[i];
        if (typeof s.cleanup === 'function') {
          queue.add(s.cleanup(s, true));
        }
      }
      queue.run();
    }

    getFromY(y) {
      for (let i = this.sections.length - 1; i >= 0; i--) {
        let s = this.sections[i];
        if (s.top <= y) {
          return s;
        }
      }
      return undefined;
    }

    scroll(e) {
      const y = this.store.elements.scroller[0].scrollTop,
      ready = this.store.fn.isReady();

      let doneCurrent = false;

      this.store.page.previousIndex = this.store.page.index;
      this.store.page.previous = this.store.page.current;

      for (let i = this.sections.length - 1; i >= 0; i--) {
        let s = this.sections[i];

        if (this.is.absolute) {
          if ($(s.element).is(':visible')) {
            $(s.element).css('transform', 'translate3d(0, ' + y + 'px, 0)');
          }
        }

        if (!doneCurrent && s.top <= y) {
          this.store.page.current = s;
          this.store.page.index = i;

          if (this.store.page.previousIndex !== this.store.page.index) {
            let forward = this.store.page.previousIndex < this.store.page.index;

            this.triggerChange(s, forward, i);

            if (ready && this.store.page.previous) {
              // Run cleanup and queued functions
              this.queue(this.store.page.previous.cleanup(s, forward)).run();
            }

            if (ready && typeof s.before === 'function') {
              this.queue(s.before(s, forward)).run();
            }

            this.setActive(s);
          }

          let sy = y - s.top, a = (sy / s.distance);
          if (ready && typeof s.scroll === 'function') {
            // TODO - OnScroll queuing (if required)
            s.scroll(a, s, sy, y);
          }

          this.store.page.info = {
            section: s,
            amount: a,
            top: sy
          };

          this.updateDebug({
            s: s.name,
            sy,
            y,
            a: Math.floor(a * 100)
          });

          doneCurrent = true;
        }
      }
    }

    queue(q) {
      let queue = {
        fn: new Map(),
        run: (args) => {
          queue.fn.forEach(fn => fn(args));
        },
        add: (q) => {
          if (typeof q === 'object') {
            Object.entries(q).forEach(f => {
              if (typeof f[1] === 'function') {
                queue.fn.set(f[0], f[1]);
              }
            });
          }
        }
      };

      queue.add(q);
      return queue;
    }

    addClone (distance, $el, className) {
      let $clone = $('<section>&nbsp;</section>');
      $clone.height(distance);
      $clone.addClass(this.classes.clone.class);
      $clone.addClass(className);

      if ($el) {
        $el.after($clone);
      }

      return $clone;
    }

    removeAll() {
      this.sections.forEach((s, i) => {


      });
    }

    remove(section) {

    }

    add(section) {
      if (Array.isArray(section)) {
        section.forEach((s) => this.add(s));
        return;
      }

      if (!this.sections.length) {
        $(document.body).addClass('stay-js');
      }

      if (!this.store.elements.windowClone) {
        this.store.elements.windowClone = this.addClone('100vh', false, this.classes.clone.window);
        this.store.elements.wrap.prepend(this.store.elements.windowClone);
      }

      // Show and update debug info if turned on
      if (this.is.debug) {
        this.toggleDebug(true);
        this.scroll();
      }

      let $el = $(section.selector).first();

      if ($el.length) {
        $el.addClass(this.classes.section.class);

        let $clone = this.addClone(section.distance, $el);

        if (section.css) {
          $el.css(section.css);
        }

        if (section.zindex) {
          $el.css('z-index', section.zindex);
        }

        section.top = this.store.page.distance;
        section.element = $el[0];
        section.clone = $clone;
        section.index = this.sections.length;

        if (typeof section.animation === 'object') {
          const ani = section.animation;
          section.setup = ani.setup || section.setup;
          section.before = ani.before || section.before;
          section.scroll = ani.scroll || section.scroll;
          section.cleanup = ani.cleanup || section.cleanup;
        }

        if (typeof section.cleanup !== 'function') {
          section.cleanup = () => {};
        }

        if (typeof section.setup === 'function') {
          section.setup(section);
        }

        this.store.page.distance += section.distance || 0;
        this.sections.push(section);
      }
    }

    forEach (c) {
      return this.sections.forEach(c);
    }

    _options(opts, defaults, ifnotset) {
      if (ifnotset) {
        return typeof opts !== 'object' ? defaults: opts;
      }
      defaults = typeof defaults === 'object' ? defaults : {};
      opts = typeof opts === 'object' ? opts : {};
      return {
        ...defaults,
        ...opts
      };
    }

    /*
     * Math Helpers
     */

    static split(amt, from, to, limit) {
      from = isNaN(from) ? 0 : from;
      to = isNaN(to) ? 1 : to;
      let a = amt - from,
      multi = 1 / (to - from),
      val = a * multi;
      return limit !== false ? Math.min(Math.max(val, 0), 1) : val;
    }

    static rsplit(amt, from, to) {
      return 1 - this.split(amt, from, to);
    }

    static splitInOut(amt, from, peak, to) {
      from = isNaN(from) ? 0 : from;
      peak = isNaN(peak) ? 0.5 : peak;
      to = isNaN(to) ? 1 : to;
      let before = this.split(amt, from, peak),
      after = 1 - this.split(amt, peak, to);
      return before < 1 ? before : after;
    }

    static splitInOutWait(amt, from, sPeak, ePeak, to) {
      let before = this.split(amt, from, sPeak),
      after = 1 - this.split(amt, ePeak, to);
      return before < 1 ? before : (amt < ePeak ? 1 : after);
    }

    static resolvePoint(deg, length, start) {
      var radians = deg / 180 * Math.PI;
      var x = length * Math.cos(radians);
      var y = length * Math.sin(radians);

      return {
        x : x + (start?.x || 0),
        y: y + (start?.y || 0)
      };
    }

    static ease(amt, type) {
      switch (type) {
        case 'easeIn':
          amt = 1 - Math.cos((amt * Math.PI) / 2);
          break;
        case 'easeOut':
          amt = Math.sin((amt * Math.PI) / 2);
          break;
        case 'easeInQuint':
          amt = amt * amt * amt * amt * amt;
          break;
      }
      // Return linear
      return amt;
    }

    static tween(start, end, amt, ease, limit) {
      if (limit !== false) {
        if (amt < 0) {
          amt = 0;
        } else if (amt > 1) {
          amt = 1;
        }
      }
      amt = this.ease(amt, ease);
      return start + (amt * (end - start));
    }

  }

  // Define as global
  window.Stay = Stay;

})(jQuery);
