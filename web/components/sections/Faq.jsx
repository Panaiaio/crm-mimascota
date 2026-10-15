'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { CalendarCheck, CircleHelp, HeartPulse, Phone, Plus, Wallet, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PawField } from '@/components/ui/PawField';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/data/site';
import { ease } from '@/lib/motion';
import styles from './Faq.module.css';

const { faq } = site;

const categoryIcons = {
  Todas: Sparkles,
  Citas: CalendarCheck,
  Salud: HeartPulse,
  Pagos: Wallet
};

export const Faq = () => {
  const [category, setCategory] = useState('Todas');
  const [open, setOpen] = useState(faq.items[0].question);

  const visible = useMemo(
    () => faq.items.filter((item) => category === 'Todas' || item.category === category),
    [category]
  );

  return (
    <section id="faq" className={`section ${styles.faq}`} aria-labelledby="faq-title">
      <PawField variant="c" />
      <Container>
        <div className={styles.grid}>
          <div className={styles.left}>
            <SectionHeading id="faq-title" eyebrow={faq.eyebrow} title={faq.title} intro={faq.intro} layout="stack" />

            <Reveal className={styles.help} delay={0.1}>
              <span className={styles.helpBubble} aria-hidden="true">
                <CircleHelp size={34} strokeWidth={1.75} />
                <i className={styles.q1}>?</i>
                <i className={styles.q2}>?</i>
              </span>
              <h3 className={styles.helpTitle}>{faq.sideTitle}</h3>
              <p className={styles.helpText}>{faq.sideText}</p>
              <Button href={site.phoneHref} size="md">
                <Phone size={18} strokeWidth={2.5} aria-hidden="true" style={{ display: 'inline-block', marginRight: 8, verticalAlign: '-3px' }} />
                {site.phone}
              </Button>
            </Reveal>
          </div>

          <div className={styles.right}>
            <LayoutGroup>
              <div className={styles.chips} role="group" aria-label="Filtrar preguntas por tema">
                {faq.categories.map((name) => {
                  const Icon = categoryIcons[name];
                  const isActive = category === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setCategory(name)}
                    >
                      <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
                      {name}
                    </button>
                  );
                })}
              </div>

              <motion.ul className={styles.list} layout>
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((item, index) => {
                    const isOpen = open === item.question;
                    const id = `faq-${faq.items.indexOf(item)}`;
                    return (
                      <motion.li
                        key={item.question}
                        layout
                        className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ duration: 0.35, ease }}
                      >
                        <h3 className={styles.heading}>
                          <button
                            type="button"
                            className={styles.question}
                            aria-expanded={isOpen}
                            aria-controls={`${id}-panel`}
                            id={`${id}-button`}
                            onClick={() => setOpen(isOpen ? '' : item.question)}
                          >
                            <span className={styles.num} aria-hidden="true">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className={styles.qText}>{item.question}</span>
                            <span className={styles.tagMini}>{item.category}</span>
                            <span className={styles.plus} aria-hidden="true">
                              <Plus size={20} strokeWidth={3} />
                            </span>
                          </button>
                        </h3>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              id={`${id}-panel`}
                              role="region"
                              aria-labelledby={`${id}-button`}
                              className={styles.answerWrap}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.35, ease }}
                            >
                              <p className={styles.answer}>{item.answer}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            </LayoutGroup>
          </div>
        </div>
      </Container>
    </section>
  );
};
