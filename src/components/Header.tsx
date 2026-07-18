import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight } from 'lucide-react';
import { motion, useScroll } from 'framer-motion';
import { bookingUrl, navItems, whatsappUrl } from '../data';
import { ButtonLink } from './ButtonLink';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > window.innerHeight - 96);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((section): section is HTMLElement => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(`#${visible.target.id}`);
      },
      { rootMargin: '-28% 0px -58% 0px', threshold: [0, 0.15, 0.35] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-is-open', menuOpen);
    const inertTargets = document.querySelectorAll<HTMLElement>('#main-content, .site-footer, .sticky-contact');
    inertTargets.forEach((target) => {
      target.inert = menuOpen;
    });
    if (menuOpen) toggleRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key !== 'Tab' || !menuOpen) return;

      const menu = document.querySelector<HTMLElement>('#site-menu');
      const focusable = menu
        ? Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((item) => item.tabIndex !== -1)
        : [];
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === toggleRef.current) {
        event.preventDefault();
        last.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        toggleRef.current?.focus();
      } else if (!event.shiftKey && document.activeElement === toggleRef.current) {
        event.preventDefault();
        first.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('menu-is-open');
      inertTargets.forEach((target) => {
        target.inert = false;
      });
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''} ${menuOpen ? 'site-header--open' : ''}`}>
        <a className="brand" href="#top" aria-label="Azura Living Bali home" onClick={closeMenu}>
          <img src="/assets/images/azura-wordmark.png" alt="Azura" width="2022" height="445" />
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className={activeSection === item.href ? 'is-active' : ''} aria-current={activeSection === item.href ? 'location' : undefined}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <ButtonLink variant="dark" href={bookingUrl} target="_blank" rel="noreferrer">
            Book Discovery Call
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      <motion.div className="scroll-progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />

      <aside id="site-menu" className={`site-menu ${menuOpen ? 'site-menu--open' : ''}`} aria-label="Expanded site menu" aria-hidden={!menuOpen}>
        <div className="site-menu__media" aria-hidden="true" />
        <div className="site-menu__shade" aria-hidden="true" />
        <div className="site-menu__inner">
          <p className="eyebrow eyebrow--light">Tabanan · Bali</p>
          <nav aria-label="Expanded navigation">
            {navItems.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className={activeSection === item.href ? 'is-active' : ''}
                aria-current={activeSection === item.href ? 'location' : undefined}
                onClick={closeMenu}
                tabIndex={menuOpen ? 0 : -1}
              >
                <span>0{index + 1}</span>
                {item.label}
                <ArrowDownRight aria-hidden="true" />
              </a>
            ))}
          </nav>
          <div className="site-menu__footer">
            <div>
              <span>Talk to the Azura team</span>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" tabIndex={menuOpen ? 0 : -1}>
                WhatsApp +62 812 4196 0867
              </a>
            </div>
            <ButtonLink className="site-menu__contact-button" href={bookingUrl} variant="gold" target="_blank" rel="noreferrer" tabIndex={menuOpen ? 0 : -1}>
              Book Discovery Call
            </ButtonLink>
          </div>
        </div>
      </aside>
    </>
  );
}
