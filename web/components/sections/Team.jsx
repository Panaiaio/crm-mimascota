'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, CalendarHeart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PawField } from '@/components/ui/PawField';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/data/site';
import { ease } from '@/lib/motion';
import styles from './Team.module.css';

const { team } = site;

export const Team = () => {
  const [[active, dir], setState] = useState([0, 1]);
  const member = team.members[active];

  const select = (index) => setState(([current]) => [index, index >= current ? 1 : -1]);

  return (
    <section id="team" className={`section ${styles.team}`} aria-labelledby="team-title">
      <PawField variant="a" />
      <Container>
        <SectionHeading id="team-title" eyebrow={team.eyebrow} title={team.title} intro={team.intro} />

        <div className={styles.layout}>
          {/* Selector */}
          <div className={styles.picker} role="tablist" aria-label={team.title} aria-orientation="vertical">
            {team.members.map((m, index) => {
              const isActive = index === active;
              return (
                <button
                  key={m.name}
                  type="button"
                  role="tab"
                  id={`member-tab-${index}`}
                  aria-selected={isActive}
                  aria-controls="member-panel"
                  tabIndex={isActive ? 0 : -1}
                  className={`${styles.pick} ${isActive ? styles.pickActive : ''}`}
                  onClick={() => select(index)}
                  onKeyDown={(event) => {
                    const last = team.members.length - 1;
                    let next = null;
                    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
                    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
                    if (next !== null) {
                      event.preventDefault();
                      select(next);
                      document.getElementById(`member-tab-${next}`)?.focus();
                    }
                  }}
                >
                  <span className={styles.avatar}>
                    <Image src={m.image} alt="" fill sizes="72px" className={styles.avatarImg} />
                  </span>
                  <span className={styles.pickText}>
                    <span className={styles.pickName}>{m.name}</span>
                    <span className={styles.pickRole}>{m.specialty}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ficha */}
          <div id="member-panel" role="tabpanel" aria-labelledby={`member-tab-${active}`} className={styles.stage}>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.article
                key={member.name}
                className={styles.card}
                custom={dir}
                variants={{
                  enter: (d) => ({ opacity: 0, x: d * 50 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d) => ({ opacity: 0, x: d * -50 })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease }}
              >
                <div className={styles.photoSide}>
                  <span className={styles.halo} aria-hidden="true" />
                  <div className={styles.photo}>
                    <Image
                      src={member.image}
                      alt={`Retrato de ${member.name}`}
                      fill
                      sizes="(min-width: 900px) 340px, 80vw"
                      className={styles.photoImg}
                    />
                  </div>
                  <span className={styles.yearsBadge}>
                    <Award size={18} strokeWidth={2.25} aria-hidden="true" />
                    <span>
                      <strong>{member.years}</strong> años
                    </span>
                  </span>
                </div>

                <div className={styles.info}>
                  <p className={styles.role}>{member.specialty}</p>
                  <h3 className={styles.name}>{member.name}</h3>
                  <p className={styles.bio}>{member.description}</p>

                  <ul className={styles.tags} aria-label="Áreas de trabajo">
                    {member.tags.map((tag, i) => (
                      <motion.li
                        key={tag}
                        className={styles.tag}
                        initial={{ opacity: 0, y: 12, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
                      >
                        {tag}
                      </motion.li>
                    ))}
                  </ul>

                  <Button href="#contact" arrow className={styles.cta}>
                    <CalendarHeart size={18} strokeWidth={2.25} aria-hidden="true" style={{ display: 'inline-block', marginRight: 8, verticalAlign: '-3px' }} />
                    Pedir cita con {member.name.split(' ')[0]} {member.name.split(' ')[1]}
                  </Button>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
};
