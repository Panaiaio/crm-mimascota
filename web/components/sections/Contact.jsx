'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, CircleAlert, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PawField } from '@/components/ui/PawField';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/data/site';
import { fadeUp } from '@/lib/motion';
import styles from './Contact.module.css';

// Dirección del CRM que guarda los mensajes (ver .env.example)
const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || 'http://localhost:3001';

const { contact } = site;
const { form, labels } = contact;
const messages = form.errors;

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  petType: '',
  petName: '',
  message: '',
  privacy: false
};

const validate = (data) => {
  const errors = {};
  const name = data.name.trim();
  const message = data.message.trim();

  if (!name) errors.name = messages.nameRequired;
  else if (name.length < 2) errors.name = messages.nameShort;

  if (!data.email.trim()) errors.email = messages.emailRequired;
  else if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) errors.email = messages.emailInvalid;

  if (!data.phone.trim()) errors.phone = messages.phoneRequired;
  else if (data.phone.replace(/\D/g, '').length < 9) errors.phone = messages.phoneInvalid;

  if (!data.petType.trim()) errors.petType = messages.petTypeRequired;
  if (!data.petName.trim()) errors.petName = messages.petNameRequired;

  if (!message) errors.message = messages.messageRequired;
  else if (message.length < 5) errors.message = messages.messageShort;

  if (!data.privacy) errors.privacy = messages.privacyRequired;

  return errors;
};

const infoItems = [
  { icon: 'phone', label: labels.phone, value: site.phone, href: site.phoneHref },
  { icon: 'mail', label: labels.email, value: site.email, href: `mailto:${site.email}` },
  { icon: 'map-pin', label: labels.address, value: site.address.full, href: site.mapsUrl, external: true }
];

export const Contact = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [serverMessage, setServerMessage] = useState('');

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const newErrors = validate(formData);
    setErrors(newErrors);

    const firstInvalid = Object.keys(newErrors)[0];
    if (firstInvalid) {
      formElement.elements[firstInvalid]?.focus();
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    setServerMessage('');

    try {
      // Campo trampa anti-spam: las personas no lo ven, los bots lo rellenan
      const website = formElement.elements.website?.value || '';
      const response = await fetch(`${CRM_URL}/api/contacto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, petType: formData.petType.trim(), website })
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus('success');
        setFormData(emptyForm);
      } else {
        setStatus('error');
        setServerMessage(data.mensaje || '');
      }
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldProps = (id) => ({
    id,
    value: formData[id],
    onChange: handleChange,
    error: errors[id]
  });

  return (
    <section id="contact" className={`section ${styles.contact}`} aria-labelledby="contact-title">
      <PawField variant="d" />
      <Container>
        <SectionHeading id="contact-title" eyebrow={contact.eyebrow} title={contact.title} intro={contact.intro} />

        <div className={styles.grid}>
          <Reveal className={styles.info}>
            <ul className={styles.infoList}>
              {infoItems.map((item) => (
                <li key={item.label} className={styles.infoItem}>
                  <Icon name={item.icon} size={20} className={styles.infoIcon} />
                  <div>
                    <p className={styles.infoLabel}>{item.label}</p>
                    <a
                      href={item.href}
                      className={`${styles.infoValue} hit-44`}
                      {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
                    >
                      {item.value}
                    </a>
                  </div>
                </li>
              ))}
              <li className={styles.infoItem}>
                <Icon name="clock" size={20} className={styles.infoIcon} />
                <div className={styles.hoursBlock}>
                  <p className={styles.infoLabel}>{labels.hours}</p>
                  <dl className={styles.hours}>
                    {site.hours.map((slot) => (
                      <div key={slot.label} className={styles.hoursRow}>
                        <dt>{slot.label}</dt>
                        <dd>{slot.closed ? site.closedLabel : `${slot.opens} – ${slot.closes}`}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </li>
            </ul>

            <div className={styles.map}>
              <iframe
                src={site.mapsEmbedUrl}
                title={labels.mapTitle}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.directions}>
              {labels.directions}
              <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </a>
          </Reveal>

          <Reveal className={styles.panel} delay={0.08}>
            <form onSubmit={handleSubmit} className={styles.form} noValidate aria-describedby="form-note">
              <div className={styles.formHead}>
                <h3 className={styles.formTitle}>{form.title}</h3>
                <p id="form-note" className={styles.formNote}>
                  {form.requiredNote}
                </p>
              </div>

              {/* Anti-spam: NO QUITAR. Oculto para las personas, debe ir vacío */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.honeypot} />

              <Field label={form.name} autoComplete="name" className={styles.full} {...fieldProps('name')} />
              <Field label={form.email} type="email" autoComplete="email" inputMode="email" {...fieldProps('email')} />
              <Field label={form.phone} type="tel" autoComplete="tel" inputMode="tel" {...fieldProps('phone')} />
              <Field label={form.petType} placeholder={form.petTypePlaceholder} maxLength={40} {...fieldProps('petType')} />
              <Field label={form.petName} maxLength={80} {...fieldProps('petName')} />
              <Field
                label={form.message}
                placeholder={form.messagePlaceholder}
                multiline
                rows={5}
                className={styles.full}
                {...fieldProps('message')}
              />

              <div className={`${styles.full} ${styles.consent}`}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="privacy"
                    checked={formData.privacy}
                    onChange={handleChange}
                    className={styles.checkbox}
                    aria-invalid={errors.privacy ? 'true' : undefined}
                    aria-describedby={errors.privacy ? 'privacy-error' : undefined}
                    required
                  />
                  <span>
                    {form.privacy}{' '}
                    <a href={site.footer.legal[1].href} className={styles.inlineLink}>
                      {form.privacyLink}
                    </a>
                  </span>
                </label>
                {errors.privacy && (
                  <p id="privacy-error" className={styles.fieldError}>
                    <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
                    {errors.privacy}
                  </p>
                )}
              </div>

              <div className={`${styles.full} ${styles.submitRow}`}>
                <Button type="submit" size="lg" disabled={isSubmitting} className={styles.submit}>
                  {isSubmitting ? form.submitting : form.submit}
                </Button>
              </div>

              <div className={styles.full} aria-live="polite">
                <AnimatePresence>
                  {status && (
                    <motion.p
                      key={status}
                      className={`${styles.status} ${status === 'success' ? styles.success : styles.failure}`}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                    >
                      {status === 'success' ? (
                        <CircleCheck size={18} strokeWidth={1.75} aria-hidden="true" />
                      ) : (
                        <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" />
                      )}
                      {status === 'success' ? form.success : serverMessage || form.error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </Reveal>
        </div>
      </Container>
    </section>
  );
};
