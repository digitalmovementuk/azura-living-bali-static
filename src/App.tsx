import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  BedDouble,
  Check,
  Download,
  Droplets,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import { ButtonLink } from './components/ButtonLink';
import { AmbientVideo } from './components/AmbientVideo';
import { CountUp } from './components/CountUp';
import { Faq } from './components/Faq';
import { Header } from './components/Header';
import { ParallaxImage } from './components/ParallaxImage';
import { Reveal } from './components/Reveal';
import { RoiCalculator } from './components/RoiCalculator';
import { StickyContact } from './components/StickyContact';
import { StoryVideo } from './components/StoryVideo';
import {
  bookingUrl,
  brochureUrl,
  navItems,
  paymentSteps,
  villaFacts,
  wellnessFeatures,
  whatsappUrl,
} from './data';

const asset = (name: string) => `/assets/images/${name}`;
const wellnessIcons = [Waves, Droplets, BedDouble, Leaf];

const heroGroup = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.16 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

function App() {
  const heroVideo = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const video = heroVideo.current;
    if (!video) return;
    video.muted = true;
    const play = () => video.play().catch(() => undefined);
    play();
    document.addEventListener('visibilitychange', play);
    return () => document.removeEventListener('visibilitychange', play);
  }, []);

  return (
    <>
      <Header />
      <main id="main-content">
        <section id="top" className="hero" aria-labelledby="hero-title">
          <video
            ref={heroVideo}
            className="hero__video"
            data-testid="hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={asset('hero-poster.jpg')}
            aria-label="Architectural film of Azura Living Bali"
          >
            <source src="/assets/video/azura-hero-mobile.mp4" type="video/mp4" media="(max-width: 820px)" />
            <source src="/assets/video/azura-hero.mp4" type="video/mp4" />
          </video>
          <div className="hero__scrim" aria-hidden="true" />

          <div className="hero__content page-shell">
            <motion.div
              className="hero__copy"
              variants={heroGroup}
              initial={reduceMotion ? false : 'hidden'}
              animate="visible"
            >
              <motion.p className="eyebrow eyebrow--light" variants={heroItem}>Wellness living · Tabanan, Bali</motion.p>
              <motion.h1 id="hero-title" variants={heroItem}>
                Boutique Villas
                <span>by Azura</span>
              </motion.h1>
              <motion.p className="hero__lede" variants={heroItem}>
                Wellness living in Bali’s emerging eco-luxury hotspot Tabanan.
              </motion.p>
              <motion.div className="hero__actions" variants={heroItem}>
                <ButtonLink href={bookingUrl} variant="light" target="_blank" rel="noreferrer">
                  Book Discovery Call
                </ButtonLink>
                <a className="text-link text-link--light" href="#investment">
                  Calculate Your ROI <ArrowDown aria-hidden="true" size={16} />
                </a>
              </motion.div>
            </motion.div>

            <motion.div
              className="hero__proof"
              aria-label="Project highlights"
              variants={heroGroup}
              initial={reduceMotion ? false : 'hidden'}
              animate="visible"
            >
              <motion.div variants={heroItem}><span>Freehold ownership</span><strong>Up to 80 years*</strong></motion.div>
              <motion.div variants={heroItem}><span>Annual returns</span><strong>Up to 18%*</strong></motion.div>
              <motion.div variants={heroItem}><span>Property management</span><strong>Fully managed</strong></motion.div>
              <motion.div variants={heroItem}><span>Villa layout</span><strong>4 bedrooms</strong></motion.div>
            </motion.div>
          </div>
        </section>

        <section className="manifesto section section--paper">
          <div className="page-shell manifesto__grid">
            <Reveal>
              <p className="eyebrow">Why invest with Azura Living Bali?</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="display-heading">
                End-to-end service.<br />
                <span>Built for performance.</span>
              </h2>
              <p className="section-lede">
                From land sourcing to villa construction to full-service property management, with step-by-step investor guidance from inquiry to key handover.
              </p>
            </Reveal>
          </div>
        </section>

        <section id="residences" className="residences section section--bone" aria-labelledby="residences-title">
          <div className="page-shell">
            <Reveal className="section-intro section-intro--split">
              <div>
                <p className="eyebrow">01 · Explore design &amp; architecture</p>
                <h2 id="residences-title" className="display-heading">Interior Design. <span>Built for Well-being.</span></h2>
              </div>
              <p className="section-lede">
                Luxury modern architecture, high ceilings and a comfortable living ambience, with a seamless indoor-outdoor experience.
              </p>
            </Reveal>

            <div className="residence-gallery" tabIndex={0} aria-label="Swipe or scroll through Azura residence views">
              <Reveal className="media-card media-card--large" variant="clip">
                <img src={asset('living-room-hero-drive.jpg')} alt="Double-height Azura living room with warm wood and garden views" width="2400" height="1600" loading="lazy" decoding="async" />
                <span className="media-card__label">High Ceilings &amp; Comfort Living Ambience</span>
              </Reveal>
              <Reveal className="media-card media-card--small" delay={0.08} variant="clip">
                <img src={asset('master-bedroom-drive.jpg')} alt="Azura master bedroom with warm timber finishes and garden views" width="2000" height="1464" loading="lazy" decoding="async" />
                <span className="media-card__label">Four Master Bedrooms</span>
              </Reveal>
              <Reveal className="media-card media-card--small" delay={0.14} variant="clip">
                <img src={asset('outdoor-wellness-drive.jpg')} alt="Azura villa pool, sunken lounge, sauna and cold plunge" width="2200" height="1479" loading="lazy" decoding="async" />
                <span className="media-card__label">Seamless Indoor-Outdoor Experience</span>
              </Reveal>
            </div>

            <div className="facts-grid">
              {villaFacts.map((fact, index) => (
                <Reveal className="fact" key={fact.label} delay={Math.min(index * 0.04, 0.18)}>
                  <span>0{index + 1}</span>
                  <strong>{fact.value}{fact.suffix && <small>{fact.suffix}</small>}</strong>
                  <p>{fact.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="wellness" className="wellness section section--ink" aria-labelledby="wellness-title">
          <div className="page-shell">
            <Reveal className="section-intro section-intro--split section-intro--light">
              <div>
                <p className="eyebrow eyebrow--light">02 · Exclusive wellness villa design &amp; features</p>
                <h2 id="wellness-title" className="display-heading">Lush Garden &amp; <span>Wellness Area.</span></h2>
              </div>
              <p className="section-lede">
                Outdoor sauna, cold plunge, outdoor shower and a sunken lounge are built into the private villa setting.
              </p>
            </Reveal>

            <Reveal className="wellness-visual" variant="clip">
              <ParallaxImage src={asset('outdoor-wellness-drive.jpg')} alt="Private sauna, cold plunge, pool and sunken lounge in Azura's wellness garden" width="2200" height="1479" loading="lazy" decoding="async" strength={2.5} />
              <div className="wellness-visual__badge">
                <Sparkles aria-hidden="true" />
                <span>Private wellness garden</span>
              </div>
            </Reveal>

            <div className="wellness-grid" tabIndex={0} aria-label="Swipe or scroll through the private wellness features">
              {wellnessFeatures.map((feature, index) => {
                const Icon = wellnessIcons[index];
                return (
                  <Reveal className="wellness-card" key={feature.title} delay={index * 0.05}>
                    <div className="wellness-card__top">
                      <span>{feature.index}</span>
                      <span className="wellness-card__icon"><Icon aria-hidden="true" /></span>
                    </div>
                    <div className="wellness-card__body">
                      <h3>{feature.title}</h3>
                      <p>{feature.copy}</p>
                    </div>
                    <span className="wellness-card__accent" aria-hidden="true" />
                  </Reveal>
                );
              })}
            </div>

            <Reveal className="included-strip">
              <p>Every villa includes</p>
              <div className="included-strip__items">
                <span><Waves aria-hidden="true" /> 32 m² pool</span>
                <span><Droplets aria-hidden="true" /> Outdoor shower</span>
                <span><Leaf aria-hidden="true" /> Finished landscaping</span>
                <span><BedDouble aria-hidden="true" /> Fully furnished</span>
                <span><ShieldCheck aria-hidden="true" /> 24/7 security</span>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="siteplan section section--paper" aria-labelledby="siteplan-title">
          <div className="page-shell siteplan__grid">
            <Reveal className="siteplan__copy">
              <p className="eyebrow">11 Villa Types</p>
              <h2 id="siteplan-title" className="display-heading">Living space from 318m². <span>Land size from 400m².</span></h2>
              <p className="section-lede">
                Various villa types, all with Azura’s luxury modern architecture and built-in amenities.
              </p>
              <ul className="check-list">
                <li><Check aria-hidden="true" /> Large pool area</li>
                <li><Check aria-hidden="true" /> Finished landscaping</li>
                <li><Check aria-hidden="true" /> Security 24/7</li>
              </ul>
              <ButtonLink href={brochureUrl} variant="dark" target="_blank" rel="noreferrer">
                View Villa Types &amp; Prices
              </ButtonLink>
            </Reveal>
            <Reveal className="siteplan__media" delay={0.08} variant="clip">
              <ParallaxImage src={asset('siteplan.jpg')} alt="Aerial site plan of the Azura Living Bali development" width="1920" height="1080" loading="lazy" strength={2.5} />
              <div className="siteplan__stat" aria-label="11 villa types"><strong>11</strong><span>Villa Types</span></div>
              <span>Indicative development plan</span>
            </Reveal>
          </div>
        </section>

        <section id="investment" className="investment section section--ink" aria-labelledby="investment-title">
          <div className="page-shell">
            <Reveal className="section-intro section-intro--split section-intro--light">
              <div>
                <p className="eyebrow eyebrow--light">03 · Azura ROI Calculator</p>
                <h2 id="investment-title" className="display-heading">Calculate Your <span>Annual Returns.</span></h2>
              </div>
              <p className="section-lede">
                Prime Rice Terrace Location • High ROI Potential
              </p>
            </Reveal>
            <Reveal>
              <RoiCalculator />
            </Reveal>

            <Reveal className="investment-proof">
              <div><strong><CountUp end={18} suffix="%" /></strong><span>ROI up to 18% p.a.*</span></div>
              <div><strong><CountUp end={80} suffix=" yrs" /></strong><span>Extendable freehold ownership up to 80 years*</span></div>
              <div><strong><CountUp end={20} suffix="+" /></strong><span>Years of civil engineering experience</span></div>
            </Reveal>
            <p className="legal-note">*Project figures are taken from Azura’s current published materials. They are not a promise or guarantee. Availability, returns, title structure, handover, pricing and specifications require legal, financial and technical due diligence.</p>
          </div>
        </section>

        <section id="location" className="location section section--bone" aria-labelledby="location-title">
          <div className="page-shell">
            <Reveal className="section-intro section-intro--split">
              <div>
                <p className="eyebrow">04 · Tabanan, Bali</p>
                <h2 id="location-title" className="display-heading">Surrounded by <span>Paradise.</span></h2>
              </div>
              <p className="section-lede">
                Surrounded by secluded black sand beaches and unforgettable sunset views.
              </p>
            </Reveal>
          </div>

          <Reveal className="location-hero" variant="clip">
            <AmbientVideo
              src="/assets/video/ricefields-green-treeline.m4v"
              type="video/mp4"
              poster={asset('rice-terraces.jpg')}
              label="Rice fields and tropical landscape around Tabanan, Bali"
              testId="location-video"
            />
            <div className="location-hero__shade" aria-hidden="true" />
            <div className="location-hero__content page-shell">
              <p className="eyebrow eyebrow--light"><MapPin aria-hidden="true" /> Bali’s Magical West Coast</p>
              <blockquote>“Luxury for me is well-being, nature, and social connections. This is what Azura is about.”</blockquote>
              <cite>Ayham Muhrez · Founder, Azura Living Bali</cite>
            </div>
          </Reveal>

          <div className="page-shell location-cards" tabIndex={0} aria-label="Swipe or scroll through Tabanan location highlights">
            <Reveal className="location-card">
              <span>01</span><h3>Bali’s Magical West Coast</h3><p>Surrounded by secluded black sand beaches and unforgettable sunset views.</p>
            </Reveal>
            <Reveal className="location-card" delay={0.06}>
              <span>02</span><h3>Surf &amp; Sunset Lifestyle</h3><p>Enjoy peaceful surf sessions and golden horizons, untouched by mass tourism.</p>
            </Reveal>
            <Reveal className="location-card" delay={0.12}>
              <span>03</span><h3>Immersed in Nature</h3><p>Set among Bali’s most breathtaking rice terraces and tropical landscapes.</p>
            </Reveal>
          </div>
        </section>

        <section id="ownership" className="ownership section section--paper" aria-labelledby="ownership-title">
          <div className="page-shell">
            <Reveal className="section-intro section-intro--split">
              <div>
                <p className="eyebrow">05 · Payment Terms</p>
                <h2 id="ownership-title" className="display-heading">Step-by-step to <span>seamless villa ownership.</span></h2>
              </div>
              <p className="section-lede">
                Step-by-step investor guidance from your personal Azura advisor — from inquiry to key handover.
              </p>
            </Reveal>

            <div className="payment-journey">
              <div className="payment-journey__header">
                <div>
                  <span>Payment schedule</span>
                  <strong>From reservation to key handover</strong>
                </div>
                <span>6 clear stages</span>
              </div>
              <div className="payment-timeline">
                <motion.span
                  className="payment-progress"
                  aria-hidden="true"
                  initial={reduceMotion ? false : { scaleX: 0, scaleY: 0 }}
                  whileInView={reduceMotion ? undefined : { scaleX: 1, scaleY: 1 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
                />
                {paymentSteps.map((step, index) => {
                  const phase = index === 0 ? 'Reserve' : index === 1 ? 'Sign' : index === paymentSteps.length - 1 ? 'Handover' : 'Build';
                  const stateClass = index === 0 ? 'payment-step--start' : index === paymentSteps.length - 1 ? 'payment-step--finish' : 'payment-step--build';
                  return (
                    <Reveal className={`payment-step ${stateClass}`} key={step.title} delay={index * 0.045}>
                      <span className="payment-step__dot" aria-hidden="true" />
                      <div className="payment-step__top">
                        <span className="payment-step__index">0{index + 1}</span>
                        <span className="payment-step__phase">{phase}</span>
                      </div>
                      <strong>{step.amount}</strong>
                      <h3>{step.title}</h3>
                      {step.copy && <p>{step.copy}</p>}
                    </Reveal>
                  );
                })}
              </div>
            </div>

            <Reveal className="ownership-cta">
              <div>
                <p className="eyebrow">Step-by-step investor guidance</p>
                <h3>From inquiry to key handover.</h3>
                <p>Register here to talk to our investment advisor team.</p>
              </div>
              <ButtonLink href={bookingUrl} variant="dark" target="_blank" rel="noreferrer">
                Book Discovery Call
              </ButtonLink>
            </Reveal>
          </div>
        </section>

        <section className="founder section section--ink" aria-labelledby="founder-title">
          <div className="page-shell founder__grid">
            <Reveal className="founder__media" variant="clip">
              <StoryVideo />
            </Reveal>
            <Reveal className="founder__copy" delay={0.08}>
              <p className="eyebrow eyebrow--light">Vision</p>
              <h2 id="founder-title" className="display-heading">Built for performance. <span>Engineered for longevity &amp; durability.</span></h2>
              <p>
                Founded by Ayham Muhrez with 20+ years experience in civil engineering.
              </p>
              <ButtonLink href={bookingUrl} variant="light" target="_blank" rel="noreferrer">
                Book Discovery Call
              </ButtonLink>
            </Reveal>
          </div>
        </section>

        <section className="faq section section--bone" aria-labelledby="faq-title">
          <div className="page-shell faq__grid">
            <Reveal className="faq__intro">
              <p className="eyebrow">06 · Azura Living Bali</p>
              <h2 id="faq-title" className="display-heading">Frequently Asked <span>Questions.</span></h2>
              <p className="section-lede">Talk to our investment advisor team for full villa, ownership and investment details.</p>
              <ButtonLink href={whatsappUrl} variant="dark" target="_blank" rel="noreferrer">
                Ask on WhatsApp
              </ButtonLink>
            </Reveal>
            <Reveal delay={0.08}>
              <Faq />
            </Reveal>
          </div>
        </section>

        <section id="contact" className="final-cta" aria-labelledby="contact-title">
          <ParallaxImage src={asset('birds-eye-sunset-drive.jpg')} alt="Aerial sunset view of Azura among rice fields near Bali's west coast" width="2400" height="1104" loading="lazy" decoding="async" strength={2.5} />
          <div className="final-cta__shade" aria-hidden="true" />
          <Reveal className="final-cta__content page-shell">
            <p className="eyebrow eyebrow--light">Get Your Full Investment Brochure</p>
            <h2 id="contact-title">High-ROI Villas in Bali.</h2>
            <p>We will send you the Azura Boutique Living brochure with detailed layouts, investment insights and ROI data.</p>
            <div className="final-cta__actions">
              <ButtonLink href={bookingUrl} variant="light" target="_blank" rel="noreferrer">Book Discovery Call</ButtonLink>
              <ButtonLink href={brochureUrl} variant="ghost" target="_blank" rel="noreferrer">
                <Download aria-hidden="true" size={16} /> Download Brochure
              </ButtonLink>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell site-footer__top">
          <div className="site-footer__brand">
            <img src={asset('azura-mark.png')} alt="Azura boutique villas — your private paradise" width="1600" height="855" />
            <p>Wellness living in Bali’s emerging eco-luxury hotspot Tabanan.</p>
          </div>
          <nav aria-label="Footer navigation">
            <span>Explore</span>
            {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <div className="site-footer__contact">
            <span>Contact</span>
            <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp +62 812 4196 0867</a>
            <a href={bookingUrl} target="_blank" rel="noreferrer">Book a discovery call</a>
            <address>Villa #3, Jl. Veteran No. 90<br />Buduk, Mengwi, Bali 80351</address>
          </div>
        </div>
        <div className="page-shell site-footer__bottom">
          <span>© {new Date().getFullYear()} Ultimate Horizons Property</span>
          <a href="https://azuralivingbali.com/privacy-policy/" target="_blank" rel="noreferrer">Privacy policy</a>
          <span>Information subject to contract and due diligence.</span>
        </div>
      </footer>

      <StickyContact />
    </>
  );
}

export default App;
