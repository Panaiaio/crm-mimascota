'use client';

import { Container } from '@/components/ui/Container';
import { Logo } from '@/components/ui/Logo';
import { site } from '@/data/site';
import { FaFacebookF, FaInstagram, FaTwitter } from 'react-icons/fa';
import styles from './Footer.module.css';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.content}>
          {/* Logo y descripción */}
          <div className={styles.brand}>
            <Logo className={styles.logo} />
            <p className={styles.description}>{site.footer.description}</p>
          </div>
          
          {/* Enlaces rápidos */}
          <div className={styles.links}>
            <h3 className={styles.heading}>{site.footer.quickLinks}</h3>
            <ul className={styles.linkList}>
              <li>
                <a href="#hero">{site.nav.home}</a>
              </li>
              <li>
                <a href="#services">{site.nav.services}</a>
              </li>
              <li>
                <a href="#about">{site.nav.about}</a>
              </li>
              <li>
                <a href="#team">{site.nav.team}</a>
              </li>
              <li>
                <a href="#contact">{site.nav.contact}</a>
              </li>
            </ul>
          </div>
          
          {/* Servicios */}
          <div className={styles.links}>
            <h3 className={styles.heading}>{site.footer.services}</h3>
            <ul className={styles.linkList}>
              {site.services.items.slice(0, 4).map((service, index) => (
                <li key={index}>
                  <a href="#services">{service.title}</a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Contacto */}
          <div className={styles.contact}>
            <h3 className={styles.heading}>{site.footer.contact}</h3>
            <ul className={styles.contactList}>
              <li>
                <address>{site.address}</address>
              </li>
              <li>
                <a href={`tel:${site.phone}`}>{site.phone}</a>
              </li>
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
            </ul>
            
            {/* Redes sociales */}
            <div className={styles.social}>
              <a 
                href={site.social.facebook} 
                className={styles.socialLink}
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaFacebookF />
              </a>
              <a 
                href={site.social.instagram} 
                className={styles.socialLink}
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaInstagram />
              </a>
              <a 
                href={site.social.twitter} 
                className={styles.socialLink}
                aria-label="Twitter"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaTwitter />
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {currentYear} {site.name}. {site.footer.rights}.
          </p>
        </div>
      </Container>
    </footer>
  );
};
