import { useState } from 'react';
import { Plus } from 'lucide-react';
import { faqs } from '../data';

export function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq-list">
      {faqs.map((item, index) => {
        const isOpen = index === openIndex;
        return (
          <article className={`faq-item ${isOpen ? 'is-open' : ''}`} key={item.question}>
            <h3>
              <button
                id={`faq-button-${index}`}
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${index}`}
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                <span>{item.question}</span>
                <Plus aria-hidden="true" />
              </button>
            </h3>
            <div
              id={`faq-panel-${index}`}
              className="faq-answer"
              role="region"
              aria-labelledby={`faq-button-${index}`}
              aria-hidden={!isOpen}
            >
              <div className="faq-answer__inner">
                <p>{item.answer}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
