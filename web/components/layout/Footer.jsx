import { FaFacebookF, FaInstagram, FaXTwitter } from 'react-icons/fa6';
import { Container } from '@/components/ui/Container';
import { Logo } from '@/components/ui/Logo';
import { site } from '@/data/site';
import styles from './Footer.module.css';

const socialIcons = {
  instagram: FaInstagram,
  facebook: FaFacebookF,
  x: FaXTwitter
};

export const Footer = () => {
  const year = new Date().getFullYear();
  const { footer } = site;

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.top}>
          <div className={styles.brand}>
            <a href="#hero" aria-label={site.nav.homeLabel} className={styles.logoLink}>
              <Logo tone="light" size={36} />
            </a>
            <p className={styles.description}>{footer.description}</p>
            <ul className={styles.social} aria-label={footer.socialTitle}>
              {site.social.map((profile) => {
                const SocialIcon = socialIcons[profile.id];
                return (
                  <li key={profile.id}>
                    <a
                      href={profile.href}
                      className={styles.socialLink}
                      aria-label={profile.label}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SocialIcon aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <nav className={styles.column} aria-labelledby="footer-nav-title">
            <h2 id="footer-nav-title" className={styles.heading}>
              {footer.navTitle}
            </h2>
            <ul className={styles.list}>
              {site.nav.items.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className={styles.link}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.column}>
            <h2 className={styles.heading}>{footer.servicesTitle}</h2>
            <ul className={styles.list}>
              {site.services.items.slice(0, 6).map((service) => (
                <li key={service.title}>
                  <a href="#services" className={styles.link}>
                    {service.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h2 className={styles.heading}>{footer.contactTitle}</h2>
            <address className={styles.list}>
              <a href={site.phoneHref} className={styles.link}>
                {site.phone}
              </a>
              <a href={`mailto:${site.email}`} className={styles.link}>
                {site.email}
              </a>
              <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {site.address.street}
                <br />
                {site.address.postalCode} {site.address.city}
              </a>
            </address>
            <p className={styles.hours}>{site.hoursShort}</p>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>
            © {year} {site.legalName}. {footer.rights}.
          </p>
          <ul className={styles.legal}>
            {footer.legal.map((item) => (
              <li key={item.label}>
                <a href={item.href} className={styles.link}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
};
