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


    constructor(opts) {
      this.wrap = $(opts.wrap || $('main'));
      this.scrollWrap = $(opts.scrollWrap || document.documentElement);

      $(this.wrap).prepend(this.addClone('100vh', false, 'window-clone'));

      if (Array.isArray(opts.sections)) {
        opts.sections.forEach((s) => this.addSection(s));
      }

      if (opts.allowScroll === false) {
        this.setScroll(false);
      }

      // Events
      $(this.scrollWrap).on('scroll', (e) => this.scroll(e));
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
      let newDist = 0;
      Object.values(this.sections).forEach(section => {
        section.top = newDist;
        newDist += section.distance;
      });
      this.distance = newDist;

      if (this.current && typeof this.current.before === 'function') {
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
      const y = this.scrollWrap[0].scrollTop;

      this.prevIndex = this.index;
      this.previous = this.current;

      for (let i = this.sections.length - 1; i >= 0; i--) {
        let s = this.sections[i];
        if (s.top <= y) {
          this.current = s;
          this.index = i;

          if (this.prevIndex !== this.index) {
            let forward = this.prevIndex < this.index;

            if (this.previous) {
              this.previous.cleanup(forward);
            }
            if (typeof s.before === 'function') {
              s.before(s, forward);
            }
            this.setActive(s);
          }

          if (typeof s.onScroll === 'function') {
            let sy = y - s.top, a = (sy / s.distance);
            s.onScroll(sy, s, y, a);
          }
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

    addSection (section) {
      let $el = $(section.selector).first();

      if ($el.length) {
        $el.addClass('locked');

        let $clone = this.addClone(section.distance, $el);

        if (section.zindex) {
          $el.css('z-index', section.zindex);
        }

        section.top = this.distance;
        section.element = $el[0];
        section.clone = $clone;

        if (typeof section.cleanup !== 'function') {
          section.cleanup = () => {};
        }

        this.distance += section.distance || 0;
        this.sections.push(section);
      }
    }

  }

  // Define as global
  window.Stay = Stay;

})(jQuery);
