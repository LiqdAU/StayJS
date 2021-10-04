(function($) {

  /*
  .locked
    position: fixed;
    pointer-events: none;
    inset: 0;
   */

  class Stay {
    sections = [];

    activeClass = 'active-screen';
    cloneClass = 'clone-screen';
    distance = 0;

    index = -1;
    current = false;
    prevIndex = -1;
    previous = false;

    #isReady = null;

    #isDebug = false;
    #debugInfo = null;

    constructor(opts) {
      this.wrap = $(opts.wrap || $('main'));
      this.scrollWrap = $(opts.scrollWrap || document.documentElement);

      this.wrap.addClass('stay-wrap');
      this.wrap.prepend(this.addClone('100vh', false, 'window-clone'));

      if (Array.isArray(opts.sections)) {
        this.add(opts.sections);
      }

      if (opts.allowScroll === false) {
        this.setScroll(false);
      }

      if (typeof opts.isReady === 'function') {
        this.isReady = opts.isReady;
      } else {
        this.isReady = () => true;
      }

      if (opts.debug) {
        this.debug();
      }

      // Events
      $(this.scrollWrap).on('scroll', (e) => this.scroll(e));
    }

    debug() {
      this.isDebug = true;

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
        'opacity': '0.75'
      })

      if (!this.sections.length) {
        el.css('display', 'none');
      }

      $(document.body).append(el);

      this.debugInfo = el;
      this.scroll();
    }

    updateDebug(vars) {
      Object.entries(vars).forEach((i) => {
        this.debugInfo.find(`[data-debug="${i[0]}"] span`).text(i[1]);
      });
    }

    toggleDebug(show) {
      if (typeof show === 'undefined') {
        show = this.debugInfo.css('display') === 'none';
      }
      this.debugInfo.css('display', show ? 'block' : 'none');
    }

    get(name) {
      if (!Array.isArray(this.sections)) {
        return false;
      }
      return this.sections.find(s => s.name === name);
    }

    update (sections) {
      Object.entries(sections).forEach((i) => {
        const [ name, changes ] = i,
        section = this.get(name);

        if (changes.distance) {
          section.distance = changes.distance;
          section.clone.height(section.distance);
        }
      });

      this.refresh();
    }

    refresh() {
      // Update section distance
      let newDist = 0, ready = this.isReady();
      Object.values(this.sections).forEach(section => {
        section.top = newDist;
        newDist += section.distance;
      });
      this.distance = newDist;

      if (ready && this.current && typeof this.current.before === 'function') {
        this.current.before(this.current);
      }

      // Trigger scroll
      this.scroll();
      setTimeout(() => this.scroll(), 500);
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

    scroll (e) {
      const y = this.scrollWrap[0].scrollTop,
      ready = this.isReady();

      this.prevIndex = this.index;
      this.previous = this.current;

      for (let i = this.sections.length - 1; i >= 0; i--) {
        let s = this.sections[i];
        if (s.top <= y) {
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

          this.updateDebug({
            s: s.name,
            sy,
            y,
            a: Math.floor(a * 100)
          });

          break;
        }
      }
    }

    addClone (distance, $el, className) {
      let $clone = $('<section>&nbsp;</section>');
      $clone.height(distance);
      $clone.addClass(this.cloneClass);
      $clone.addClass(className);

      if ($el) {
        $el.after($clone);
      }

      return $clone;
    }

    add (section) {
      if (Array.isArray(section)) {
        section.forEach((s) => this.add(s));
        return;
      }

      // Show and update debug info if turned on
      if (this.isDebug) {
        this.toggleDebug(true);
        this.scroll();
      }

      let $el = $(section.selector).first();

      if ($el.length) {
        $el.addClass('locked');

        let $clone = this.addClone(section.distance, $el);

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

    /*
     * Math Helpers
     */

    static split(amt, from, to) {
      let a = amt - from,
      multi = 1 / (to - from);
      return Math.max(a * multi, 0);
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
