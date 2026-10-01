'use client';

import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import { Link2, Mail } from 'lucide-react';
import styles from './TeamCard.module.css';

export const TeamCard = ({ member, delay = 0 }) => {
  return (
    <motion.div
      className={styles.card}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
      whileHover={{ y: -8 }}
    >
      <div className={styles.imageContainer}>
        {member.image ? (
          <img 
            src={member.image} 
            alt={member.name}
            className={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.placeholderSvg}
            >
              <circle cx="50" cy="40" r="20" fill="#8FA98B" fillOpacity="0.3"/>
              <ellipse cx="50" cy="85" rx="30" ry="20" fill="#8FA98B" fillOpacity="0.3"/>
            </svg>
          </div>
        )}
        
        <div className={styles.socialLinks}>
          <a href="#" className={styles.socialLink} aria-label="LinkedIn">
            <Link2 size={18} />
          </a>
          <a href="#" className={styles.socialLink} aria-label="Email">
            <Mail size={18} />
          </a>
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.name}>{member.name}</h3>
        <p className={styles.specialty}>{member.specialty}</p>
        <p className={styles.description}>{member.description}</p>
      </div>
    </motion.div>
  );
};
