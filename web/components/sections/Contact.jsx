'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { site } from '@/data/site';
import { fadeUp, slideInLeft, slideInRight } from '@/lib/motion';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import styles from './Contact.module.css';

// Dirección del CRM que guarda los mensajes (ver .env.example)
const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || 'http://localhost:3001';

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    petType: '',
    petName: '',
    message: '',
    privacy: false
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [submitError, setSubmitError] = useState('');
  const [mapLocation, setMapLocation] = useState(site.address);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setMapLocation(`${coords.latitude},${coords.longitude}`);
    });
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (formData.phone.replace(/\D/g, '').length < 9) {
      newErrors.phone = 'Teléfono inválido';
    }
    
    if (!formData.petType.trim()) {
      newErrors.petType = 'Indica qué animal es';
    }
    
    if (!formData.petName.trim()) {
      newErrors.petName = 'El nombre de tu mascota es obligatorio';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'El mensaje es obligatorio';
    } else if (formData.message.trim().length < 5) {
      newErrors.message = 'El mensaje debe tener al menos 5 caracteres';
    }
    
    if (!formData.privacy) {
      newErrors.privacy = 'Debes aceptar la política de privacidad';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitError('');
    
    try {
      // Campo trampa anti-spam: los humanos no lo ven, los bots lo rellenan
      const website = e.currentTarget.elements.website?.value || '';

      const response = await fetch(`${CRM_URL}/api/contacto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Si elige "Otro", se envía lo que haya escrito (papagayo, conejo…)
        body: JSON.stringify({
          ...formData,
          petType: formData.petType.trim(),
          website,
        }),
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          email: '',
          phone: '',
          petType: '',
          petName: '',
          message: '',
          privacy: false
        });
        
        // Reset success message after 5 seconds
        setTimeout(() => setSubmitStatus(null), 5000);
      } else {
        setSubmitStatus('error');
        setSubmitError(data.mensaje || '');
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <section id="contact" className={styles.contact}>
      <Container>
        <SectionHeading
          title={site.contact.title}
          description={site.contact.subtitle}
        />
        
        <div className={styles.content}>
          {/* Información de contacto */}
          <motion.div
            className={styles.info}
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <MapPin />
              </div>
              <div className={styles.infoContent}>
                <h3>Dirección</h3>
                <p>{site.address}</p>
              </div>
            </div>
            
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <Phone />
              </div>
              <div className={styles.infoContent}>
                <h3>Teléfono</h3>
                <a href={`tel:${site.phone}`}>{site.phone}</a>
              </div>
            </div>
            
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <Mail />
              </div>
              <div className={styles.infoContent}>
                <h3>Email</h3>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </div>
            </div>
            
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <Clock />
              </div>
              <div className={styles.infoContent}>
                <h3>Horario</h3>
                <p>{site.hours}</p>
              </div>
            </div>
            
            <div className={styles.cta}>
            </div>
            <br></br>
            <div className={styles.mapPlaceholder}>
              <iframe
                className={styles.map}
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapLocation)}&output=embed`}
                title={`Ubicación de ${site.name}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>
          
          {/* Formulario */}
          <motion.div
            className={styles.formContainer}
            variants={slideInRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              {/* Anti-spam: NO QUITAR. Oculto para las personas, debe ir vacío */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />
              <div className={styles.formGroup}>
                <label htmlFor="name">{site.contact.form.name} *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? styles.error : ''}
                  aria-invalid={errors.name ? 'true' : 'false'}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <span id="name-error" className={styles.errorMessage} role="alert">
                    {errors.name}
                  </span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="email">{site.contact.form.email} *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? styles.error : ''}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <span id="email-error" className={styles.errorMessage} role="alert">
                    {errors.email}
                  </span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="phone">Teléfono *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={errors.phone ? styles.error : ''}
                  aria-invalid={errors.phone ? 'true' : 'false'}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                />
                {errors.phone && (
                  <span id="phone-error" className={styles.errorMessage} role="alert">
                    {errors.phone}
                  </span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="petType">Tipo de mascota *</label>
                <input
                  type="text"
                  id="petType"
                  name="petType"
                  value={formData.petType}
                  onChange={handleChange}
                  maxLength={40}
                  placeholder="Perro, gato, suricato…"
                  className={errors.petType ? styles.error : ''}
                  aria-invalid={errors.petType ? 'true' : 'false'}
                  aria-describedby={errors.petType ? 'petType-error' : undefined}
                />
                {errors.petType && (
                  <span id="petType-error" className={styles.errorMessage} role="alert">
                    {errors.petType}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="petName">Nombre de tu mascota *</label>
                <input
                  type="text"
                  id="petName"
                  name="petName"
                  value={formData.petName}
                  onChange={handleChange}
                  maxLength={80}
                  className={errors.petName ? styles.error : ''}
                  aria-invalid={errors.petName ? 'true' : 'false'}
                  aria-describedby={errors.petName ? 'petName-error' : undefined}
                />
                {errors.petName && (
                  <span id="petName-error" className={styles.errorMessage} role="alert">
                    {errors.petName}
                  </span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="message">{site.contact.form.message} *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className={errors.message ? styles.error : ''}
                  aria-invalid={errors.message ? 'true' : 'false'}
                  aria-describedby={errors.message ? 'message-error' : undefined}
                />
                {errors.message && (
                  <span id="message-error" className={styles.errorMessage} role="alert">
                    {errors.message}
                  </span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="privacy"
                    checked={formData.privacy}
                    onChange={handleChange}
                    className={styles.checkbox}
                    aria-invalid={errors.privacy ? 'true' : 'false'}
                  />
                  <span>{site.contact.form.privacy} *</span>
                </label>
                {errors.privacy && (
                  <span className={styles.errorMessage} role="alert">
                    {errors.privacy}
                  </span>
                )}
              </div>
              
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className={styles.submitButton}
              >
                {isSubmitting ? site.contact.form.submitting : site.contact.form.submit}
              </Button>
              
              {submitStatus === 'success' && (
                <motion.div
                  className={styles.successMessage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                >
                  {site.contact.form.success}
                </motion.div>
              )}
              
              {submitStatus === 'error' && (
                <motion.div
                  className={styles.errorMessage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                >
                  {submitError || site.contact.form.error}
                </motion.div>
              )}
            </form>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};
