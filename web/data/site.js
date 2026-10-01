// Todo el contenido de la web (textos, datos de contacto e imágenes).
// Para cambiar un texto o una foto, se cambia aquí y no en los componentes.

export const site = {
  // Información básica
  name: "Mi Mascota",
  webName: "www.mimascota.es",
  tagline: "Cuidamos de quienes más quieres",
  logo: "/imagenes/logo.png",
  
  // Contacto
  phone: "+34 602 14 74 88",
  email: "contacto@mimascota.com",
  address: "Calle María Auxiliadora 57, 50009 Zaragoza",
  hours: "Lunes a Viernes: 9:00 - 19:00, Sábado: 9:00 - 14:00",
  
  // Redes sociales
  social: {
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    twitter: "https://twitter.com/"
  },
  
  // Navegación
  nav: {
    home: "Inicio",
    services: "Servicios",
    about: "Nosotros",
    team: "Equipo",
    contact: "Contacto",
    cta: "Pedir cita"
  },
  
  // Hero
  hero: {
    eyebrow: "Veterinaria de confianza",
    title: "Cuidamos de quienes más quieres",
    description: "Atención veterinaria profesional con cariño y dedicación. Tu mascota merece el mejor cuidado.",
    image: "/imagenes/portada/perrogato.jpg",
    imageAlt: "Perro y gato",
    primaryCta: "Pedir cita",
    secondaryCta: "Conocer nuestros servicios",
    trustIndicators: [
      {
        icon: "clock",
        text: "Horario flexible"
      },
      {
        icon: "stethoscope",
        text: "Urgencias 24h"
      },
      {
        icon: "heart",
        text: "Atención cercana"
      }
    ]
  },
  
  // Servicios
  services: {
    title: "Cuidado integral para tu mascota",
    subtitle: "Ofrecemos una amplia gama de servicios veterinarios para mantener a tu compañero sano y feliz.",
    items: [
      {
        image: "/imagenes/servicios/estetoscopio.png",
        title: "Consultas veterinarias",
        description: "Chequeos completos y diagnósticos precisos para mantener a tu mascota sana."
      },
      {
        image: "/imagenes/servicios/jeringa.png",
        title: "Vacunación",
        description: "Planes de vacunación personalizados según las necesidades de cada animal."
      },
      {
        image: "/imagenes/servicios/escudo.png",
        title: "Medicina preventiva",
        description: "Programas de prevención para evitar enfermedades antes de que aparezcan."
      },
      {
        image: "/imagenes/servicios/diente.png",
        title: "Odontología",
        description: "Cuidado dental profesional para prevenir problemas bucodentales."
      },
      {
        image: "/imagenes/servicios/tijeras.png",
        title: "Cirugía",
        description: "Procedimientos quirúrgicos con tecnología avanzada y anestesia segura."
      },
      {
        image: "/imagenes/servicios/microscopio.png",
        title: "Diagnóstico",
        description: "Análisis clínicos y diagnóstico por imagen para tratamientos precisos."
      },
      {
        image: "/imagenes/servicios/perro.png",
        title: "Cuidados para perros",
        description: "Atención especializada para las necesidades específicas de tu perro."
      },
      {
        image: "/imagenes/servicios/gato.png",
        title: "Cuidados para gatos",
        description: "Cuidados adaptados al comportamiento y fisiología felina."
      }
    ]
  },
  
  // Sobre nosotros
  about: {
    title: "Sobre nosotros",
    subtitle: "Más de 10 años cuidando de nuestros pacientes",
    image: "/imagenes/portada/equipovete.png",
    imageAlt: "Equipo veterinario",
    description: "Somos un equipo de veterinarios apasionados por el bienestar animal. Nuestra clínica combina la experiencia profesional con un trato cercano y personalizado para cada mascota.",
    stats: [
      {
        number: "10",
        label: "Años de experiencia"
      },
      {
        number: "6500",
        label: "Pacientes atendidos"
      },
      {
        number: "5",
        label: "Veterinarios especialistas"
      }
    ]
  },
  
  // Especialidades
  specialties: {
    title: "Especialidades y cuidados",
    subtitle: "Atención personalizada en cada etapa de la vida",
    items: [
      {
        image: "/imagenes/especialidades/cachorro.png",
        title: "Cachorros",
        description: "Cuidados específicos para las primeras etapas de vida: vacunación, socialización y alimentación."
      },
      {
        image: "/imagenes/especialidades/adulto.png",
        title: "Adultos",
        description: "Mantenimiento y prevención para mantener a tu mascota en su mejor estado de salud."
      },
      {
        image: "/imagenes/especialidades/senior.png",
        title: "Senior",
        description: "Atención especializada para mascotas mayores: control de dolores y calidad de vida."
      },
      {
        image: "/imagenes/especialidades/exotico.png",
        title: "Animales exóticos",
        description: "Cuidados veterinarios para pájaros, reptiles y pequeños mamíferos."
      }
    ]
  },
  
  // Equipo
  team: {
    title: "Nuestro equipo",
    subtitle: "Conoce al equipo que cuidará de tu mascota con profesionalidad y cariño.",
    members: [
      {
        name: "Dr. Juan Pérez",
        specialty: "Veterinario General",
        description: "Veterinario con 15 años de experiencia en cuidados preventivos y tratamientos generales.",
        image: "/imagenes/equipo/persona1.png"
      },
      {
        name: "Dra. María García",
        specialty: "Especialista en Nutrición",
        description: "Especialista en nutrición canina y felina, con enfoque en dietas personalizadas.",
        image: "/imagenes/equipo/persona2.png"
      },
      {
        name: "Dr. Carlos López",
        specialty: "Especialista en Cirugía",
        description: "Especialista en cirugía veterinaria con enfoque en técnicas mínimamente invasivas.",
        image: "/imagenes/equipo/persona3.png"
      }
    ]
  },
  
  // Testimonios
  testimonials: {
    title: "Lo que dicen nuestros clientes",
    items: [
      {
        name: "Jeremy",
        text: "El equipo veterinario es increíble. Siempre se toman el tiempo para explicar cada tratamiento y realmente se preocupan por el bienestar de mi mascota. ¡100% recomendados!",
        pet: "Max"
      },
      {
        name: "Samuel",
        text: "Llevé a mi gato para una revisión de rutina y quedé encantado con la atención profesional y el trato cercano. Las instalaciones son impecables y el personal muy amable.",
        pet: "Luna"
      },
      {
        name: "Ana",
        text: "Gracias por salvar a mi perro cuando tuvo una emergencia. Respondieron rápidamente y le dieron la mejor atención. Estoy eternamente agradecida por su profesionalismo y dedicación.",
        pet: "Rocky"
      }
    ]
  },
  
  // Formulario de contacto
  contact: {
    title: "Contacto",
    subtitle: "Estamos aquí para ayudarte",
    form: {
      name: "Nombre completo",
      email: "Email",
      message: "Mensaje",
      submit: "Enviar mensaje",
      submitting: "Enviando...",
      success: "Mensaje enviado correctamente",
      error: "Error al enviar el mensaje",
      privacy: "Acepto la política de privacidad"
    }
  },
  
  // Footer
  footer: {
    description: "Clínica veterinaria comprometida con el bienestar de tus mascotas. Atención profesional con cariño.",
    quickLinks: "Enlaces rápidos",
    services: "Servicios",
    contact: "Contacto",
    rights: "Todos los derechos reservados"
  }
};
