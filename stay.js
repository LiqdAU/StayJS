(function($) {

  class Stay {
    sections = [];

    sectionClass = 'stay-section';
    activeClass = 'active-screen';
    cloneClass = 'clone-screen';
    distance = 0;

    options = {};
    wrap = null;
    index = -1;
    current = false;
    prevIndex = -1;
    previous = false;

    #isAbsolute = false;

    #isReady = null;
    #isDebug = false;
    #debugInfo = null;
    #windowClone = null;
    #currentInfo = {};

    #onScroll = (e) => this.scroll(e);
    #hashChange = (e) => this.hashChange(e);

    constructor(opts) {
      this.wrap = $(opts.wrap || $('main'));
      this.reset(opts);

      // Events
      $(this.scrollWrap).on('scroll', this.#onScroll);
      window.addEventListener("hashchange", this.#hashChange, false);
    }

    dispose() {
      $(this.scrollWrap).off('scroll', this.#onScroll);

      this.debug(false);
      this.removeAll();
    }

    hashChange() {
      if (!window.location.hash) {
        return;
      }

      const hash = window.location.hash.substring(1),
      section = this.get(hash);

      if (section) {
        this.scrollTo(section);
      }
    }

    reset(opts) {
      opts = {...this.options, ...opts};
      this.sections = [];
      this.scrollWrap = $(opts.scrollWrap || document.documentElement);

      // Defaults
      opts.debug = opts.debug === true;
      opts.allowScroll = opts.allowScroll === false;
      opts.absolute = opts.absolute !== false;
      opts.isReady = typeof opts.isReady !== 'function' ? () => true : opts.isReady;

      // Remove window clones
      $('.window-clone').remove();
      this.#windowClone = null;

      this.#isReady = opts.isReady;

      // Add classes to wrap/scrollwrap
      this.wrap.addClass('stay-wrap');
      this.scrollWrap.addClass('stay-scroll-wrap')

      this.setScroll(!opts.allowScroll);
      this.setAbsolute(opts.absolute);

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
      this.#isDebug = toggle !== false;

      if (!this.#isDebug) {
        this.#debugInfo = false;
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

      this.#debugInfo = el;
      this.scroll();
    }

    updateDebug(vars) {
      if (this.#debugInfo) {
        Object.entries(vars).forEach((i) => {
          this.#debugInfo.find(`[data-debug="${i[0]}"] span`).text(i[1]);
        });
      }
    }

    toggleDebug(show) {
      if (typeof show === 'undefined') {
        show = this.#debugInfo.css('display') === 'none';
      }
      this.#debugInfo.css('display', show ? 'block' : 'none');
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

    now() {
      return this.#currentInfo;
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
      let newDist = 0, ready = this.#isReady();
      this.forEach(section => {
        section.top = newDist;
        newDist += section.distance;

        if (typeof section.setup === 'function') {
          section.setup(section);
        }
      });
      this.distance = newDist;

      if (ready && this.current && typeof this.current.before === 'function') {
        this.current.before(this.current);
      }

      // Trigger scroll
      this.scroll();
      setTimeout(() => this.scroll(), 500);
    }

    setAbsolute(absolute) {
      absolute = !!absolute;
      this.#isAbsolute = absolute;
      $(this.wrap).toggleClass('stay-abs', absolute);

      if (absolute) {
        let y = this.scrollWrap[0].scrollTop;
        $('.' + this.sectionClass).css('transform', 'translate3d(0, ' + y + 'px, 0)');
      } else {
        $('.' + this.sectionClass).css('transform', 'none');
      }
    }

    setActive(name) {
      let active = typeof name === 'string' ? this.sections.find(s => s.name === name) : name;

      if (active) {
        $(`.${this.activeClass}`).removeClass(this.activeClass);
        $(active.element).addClass(this.activeClass);
      }
    }

    setScroll (toggle) {
       $(this.scrollWrap).css('overflow', toggle ? 'auto' : 'hidden');
    }

    scrollToTop(args) {
      return this.scrollToY(0, args)
    }

    scrollToY(index, args) {
      args = args || {};
      args.type = 'Y';
      this.scrollTo(index, args);
    }

    scrollTo (to, args) {
      // Allow shorthand duration
      let duration = typeof args === 'number' ? args : args.duration || 500;

      args = typeof args == 'object' ? args : {};
      args.duration = duration;
      args.ease = args.ease || 'swing';
      args.smooth = args.smooth !== false;
      args.type = args.type || 'index';

      if (typeof to === 'string') {
        to = isNaN(to) ? this.get(to) : parseInt(to);
      }

      // If index is passed, change destination to the section object
      if (typeof to === 'number' && args.type == 'index') {
        to = this.get(to);
      }

      // If destination is an object, assume it's a section and apply modifiers
      if (typeof to === 'object') {
        let section = to;
        to = to.top || 0;

        // Scroll to section %
        if (args.percent) {
          to += ((section.distance / 100) * args.percent) + 1;
        } else if (args.top) {
          to += args.top;
        }
      }


      let isAbs = this.#isAbsolute,
      afterScroll = () => {
        // Set absolute back to true
        if (isAbs) {
          this.setAbsolute(true);
        }

        this.refresh();

        if (typeof args.complete === 'function') {
          args.complete();
        }
      };


      if (isAbs) {
        this.setAbsolute(false)
      }

      if (args.smooth) {
        $(this.scrollWrap).stop()
        .animate({
          scrollTop: to
        }, args.duration, args.ease, afterScroll);
      } else {
        $(this.scrollWrap)[0].scrollTo(0, to);
        afterScroll();
      }
    }

    scroll(e) {
      const y = this.scrollWrap[0].scrollTop,
      ready = this.#isReady();

      let doneCurrent = false;

      this.prevIndex = this.index;
      this.previous = this.current;

      for (let i = this.sections.length - 1; i >= 0; i--) {
        let s = this.sections[i];

        // Current fix for scrolling through "fixed" elements
        // TODO - there is probably a better way to do this - while maintaining position: fixed instead of absolute
        if (this.#isAbsolute) {
          $(s.element).css('transform', 'translate3d(0, ' + y + 'px, 0)');
        }

        if (!doneCurrent && s.top <= y) {
          this.current = s;
          this.index = i;

          if (this.prevIndex !== this.index) {
            let forward = this.prevIndex < this.index;

            if (ready && this.previous) {
              this.previous.cleanup(forward);
            }
            if (ready && typeof s.before === 'function') {
              s.before(s, forward);
            }
            this.setActive(s);
          }

          let sy = y - s.top, a = (sy / s.distance);
          if (ready && typeof s.onScroll === 'function') {
            s.onScroll(a, s, sy, y);
          }

          this.#currentInfo = {
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

    #addClone (distance, $el, className) {
      let $clone = $('<section>&nbsp;</section>');
      $clone.height(distance);
      $clone.addClass(this.cloneClass);
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

    add (section) {
      if (Array.isArray(section)) {
        section.forEach((s) => this.add(s));
        return;
      }

      if (!this.sections.length) {
        $(document.body).addClass('stay-js');
      }

      if (!this.#windowClone) {
        this.#windowClone = this.#addClone('100vh', false, 'window-clone');
        this.wrap.prepend(this.#windowClone);
      }

      // Show and update debug info if turned on
      if (this.#isDebug) {
        this.toggleDebug(true);
        this.scroll();
      }

      let $el = $(section.selector).first();

      if ($el.length) {
        $el.addClass(this.sectionClass);

        let $clone = this.#addClone(section.distance, $el);

        if (section.css) {
          $el.css(section.css);
        }

        if (section.zindex) {
          $el.css('z-index', section.zindex);
        }

        section.top = this.distance;
        section.element = $el[0];
        section.clone = $clone;

        if (typeof section.cleanup !== 'function') {
          section.cleanup = () => {};
        }

        if (typeof section.setup === 'function') {
          section.setup(section);
        }

        this.distance += section.distance || 0;
        this.sections.push(section);
      }
    }

    forEach (c) {
      return this.sections.forEach(c);
    }

    /*
     * Math Helpers
     */

    static split(amt, from, to, limit) {
      let a = amt - from,
      multi = 1 / (to - from),
      val = a * multi;
      return limit !== false ? Math.min(Math.max(val, 0), 1) : val;
    }

    static rsplit(amt, from, to) {
      return 1 - this.split(amt, from, to);
    }

    static splitInOut(amt, from, peak, to) {
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
