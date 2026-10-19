import Image from 'next/image';
import { Award, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Counter } from '@/components/ui/Counter';
import { Icon } from '@/components/ui/Icon';
import { PawField } from '@/components/ui/PawField';
import { Reveal } from '@/components/ui/Reveal';
import { site } from '@/data/site';
import { slideLeft, slideRight } from '@/lib/motion';
import styles from './About.module.css';

const { about } = site;

export const About = () => (
  <section id="about" className={`section ${styles.about}`} aria-labelledby="about-title">
    <PawField variant="c" />
    <Container>
      <div className={styles.grid}>
        <Reveal as="figure" className={styles.media} variants={slideLeft}>
          <span className={styles.crew}>
            <span className={styles.avatars} aria-hidden="true">
              {site.team.members.map((member) => (
                <span key={member.name} className={styles.avatar}>
                  <Image src={member.image} alt="" fill sizes="52px" className={styles.avatarImg} />
                </span>
              ))}
            </span>
            <span className={styles.crewText}>
              <strong>Un equipo que te conoce</strong>
              <span>{about.stats[2].value} veterinarios especialistas</span>
            </span>
          </span>
          <span className={styles.ring} aria-hidden="true" />
          <span className={styles.blob} aria-hidden="true" />
          <div className={styles.frame}>
            <Image
              src={about.image}
              alt={about.imageAlt}
              width={298}
              height={180}
              sizes="(min-width: 960px) 480px, 100vw"
              className={styles.image}
            />
          </div>
          <span className={`${styles.float} ${styles.floatTop}`}>
            <span className={styles.floatIcon}>
              <Award size={18} strokeWidth={2.25} aria-hidden="true" />
            </span>
            {site.hero.badgeNumber} años de experiencia
          </span>
          <span className={`${styles.float} ${styles.floatBottom}`}>
            <span className={`${styles.floatIcon} ${styles.floatIconAlt}`}>
              <Sparkles size={18} strokeWidth={2.25} aria-hidden="true" />
            </span>
            Trato personal
          </span>
          <figcaption className={styles.caption}>{about.imageCaption}</figcaption>
        </Reveal>

        <Reveal className={styles.text} variants={slideRight}>
          <p className="eyebrow">{about.eyebrow}</p>
          <h2 id="about-title" className={styles.title}>
            {about.title}
          </h2>
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}

          <Button href="#team" variant="green" size="md" arrow className={styles.cta}>
            {about.cta}
          </Button>
        </Reveal>
      </div>

      <ul className={styles.values}>
        {about.values.map((value) => (
          <li key={value.title} className={styles.value}>
            <span className={styles.valueIcon}>
              <Icon name={value.icon} size={26} strokeWidth={1.9} />
            </span>
            <span className={styles.valueBody}>
              <strong className={styles.valueTitle}>{value.title}</strong>
              <span className={styles.valueText}>{value.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <dl className={styles.stats}>
        {about.stats.map((stat, index) => (
          <Reveal key={stat.label} className={styles.stat} delay={index * 0.1}>
            <dt className={styles.statLabel}>{stat.label}</dt>
            <dd className={styles.statValue}>
              <Counter value={stat.value} suffix={stat.suffix} />
            </dd>
          </Reveal>
        ))}
      </dl>
    </Container>
  </section>
);
