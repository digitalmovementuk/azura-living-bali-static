import { useEffect, useState } from 'react';
import { bookingUrl } from '../data';
import { ButtonLink } from './ButtonLink';

export function StickyContact() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const finalCta = document.querySelector<HTMLElement>('#contact');
      const investment = document.querySelector<HTMLElement>('#investment');
      const protectedSections = document.querySelectorAll<HTMLElement>('#residences, #wellness, #location, #ownership, .founder, .faq');
      const nearFinal = finalCta ? finalCta.getBoundingClientRect().top < window.innerHeight * 0.88 : false;
      const investmentRect = investment?.getBoundingClientRect();
      const investmentInView = investmentRect
        ? investmentRect.top < window.innerHeight * 0.86 && investmentRect.bottom > window.innerHeight * 0.14
        : false;
      const protectedContentInView = Array.from(protectedSections).some((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.86 && rect.bottom > window.innerHeight * 0.14;
      });
      document.body.classList.toggle('investment-is-visible', investmentInView);
      document.body.classList.toggle('final-cta-is-visible', nearFinal);
      document.body.classList.toggle('protected-content-is-visible', protectedContentInView);
      setVisible(window.scrollY > window.innerHeight * 0.85 && !nearFinal && !investmentInView && !protectedContentInView);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      document.body.classList.remove('investment-is-visible');
      document.body.classList.remove('final-cta-is-visible');
      document.body.classList.remove('protected-content-is-visible');
      window.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <aside className={`sticky-contact ${visible ? 'is-visible' : ''}`} aria-label="Quick contact">
      <div>
        <span>Azura Living Bali</span>
        <strong>Boutique Villas by Azura</strong>
      </div>
      <ButtonLink href={bookingUrl} variant="gold" target="_blank" rel="noreferrer">
        Book Discovery Call
      </ButtonLink>
    </aside>
  );
}
