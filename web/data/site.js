// Todo el contenido de la web (textos, datos de contacto e imágenes).
// Para cambiar un texto o una foto, se cambia aquí y no en los componentes.

const address = {
  street: "Calle María Auxiliadora 57",
  postalCode: "50009",
  city: "Zaragoza",
  region: "Aragón",
  country: "ES"
};

const fullAddress = `${address.street}, ${address.postalCode} ${address.city}`;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

export const site = {
  // Información básica
  name: "Mi Mascota",
  legalName: "Clínica Veterinaria Mi Mascota",
  url: "https://www.mimascota.es", // PLACEHOLDER: dominio real cuando se publique
  webName: "www.mimascota.es",
  tagline: "Clínica veterinaria en Zaragoza",
  description:
    "Clínica veterinaria en Zaragoza: consultas, vacunación, cirugía, odontología y diagnóstico para perros, gatos y animales exóticos. Pide cita por teléfono o desde la web.",
  logo: "/imagenes/logo.png",

  // Contacto
  phone: "+34 602 14 74 88",
  phoneHref: "tel:+34602147488",
  email: "contacto@mimascota.es",
  address: { ...address, full: fullAddress },
  mapsUrl,
  mapsEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`,

  // Horario: se usa en la portada, en contacto, en el footer y en los datos para Google (JSON-LD)
  hours: [
    { label: "Lunes a viernes", opens: "09:00", closes: "19:00", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
    { label: "Sábados", opens: "09:00", closes: "14:00", days: ["Saturday"] },
    { label: "Domingos y festivos", closed: true }
  ],
  hoursShort: "Lun–Vie 9:00–19:00 · Sáb 9:00–14:00",
  closedLabel: "Cerrado",

  // Redes sociales (PLACEHOLDER: poner los perfiles reales)
  social: [
    { id: "instagram", label: "Instagram", href: "https://www.instagram.com/" },
    { id: "facebook", label: "Facebook", href: "https://www.facebook.com/" },
    { id: "x", label: "X (Twitter)", href: "https://x.com/" }
  ],

  // Navegación
  nav: {
    items: [
      { id: "services", label: "Servicios" },
      { id: "about", label: "Nosotros" },
      { id: "specialties", label: "Especialidades" },
      { id: "team", label: "Equipo" },
      { id: "faq", label: "Dudas" },
      { id: "contact", label: "Contacto" }
    ],
    cta: "Pedir cita",
    skipLink: "Saltar al contenido",
    homeLabel: "Mi Mascota, ir al inicio",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    ariaLabel: "Navegación principal"
  },

  // Portada
  hero: {
    eyebrow: "Clínica veterinaria en Zaragoza",
    titleStart: "Cuidamos de quienes",
    titleEmphasis: "más quieres",
    description:
      "Consultas, vacunación, cirugía y diagnóstico para perros, gatos y animales exóticos. Antes de empezar cualquier tratamiento, te explicamos qué vamos a hacer y por qué.",
    image: "/imagenes/portada/perrogato.jpg",
    imageAlt: "Un pastor alemán y un gato atigrado tumbados juntos en un sofá",
    badgeNumber: "+10",
    badgeText: "años cuidando de mascotas en Zaragoza",
    primaryCta: "Pedir cita",
    secondaryCta: "Ver servicios",
    facts: [
      { icon: "clock", label: "Horario", value: "Lun–Vie 9–19 h · Sáb 9–14 h" },
      { icon: "phone", label: "Cita previa", value: "602 14 74 88", href: "tel:+34602147488" },
      { icon: "map-pin", label: "Dónde estamos", value: "C/ María Auxiliadora 57", href: mapsUrl, external: true }
    ]
  },

  // Servicios (icon = nombre del icono de lucide-react, ver components/ui/Icon.jsx)
  services: {
    eyebrow: "Servicios",
    title: "Todo lo que necesita, en una misma clínica",
    intro:
      "Desde la primera vacuna hasta una cirugía programada. Si no sabes qué servicio necesitas, llámanos y te orientamos.",
    cta: "Consultar disponibilidad",
    items: [
      {
        icon: "stethoscope",
        title: "Consulta general",
        description: "Revisión completa, diagnóstico y seguimiento de cualquier problema de salud."
      },
      {
        icon: "syringe",
        title: "Vacunación",
        description: "Calendario de vacunas adaptado a la edad, la especie y el estilo de vida de cada animal."
      },
      {
        icon: "shield-check",
        title: "Medicina preventiva",
        description: "Desparasitación, chequeos periódicos y planes para detectar problemas a tiempo."
      },
      {
        icon: "toothbrush",
        title: "Odontología",
        description: "Limpiezas, extracciones y revisión bucal para evitar dolor e infecciones."
      },
      {
        icon: "scissors",
        title: "Cirugía",
        description: "Intervenciones programadas con anestesia monitorizada y control postoperatorio."
      },
      {
        icon: "microscope",
        title: "Diagnóstico",
        description: "Análisis clínicos y diagnóstico por imagen para tratar con datos, no con suposiciones."
      },
      {
        icon: "dog",
        title: "Perros",
        description: "Atención adaptada a la raza, el tamaño y la actividad de tu perro."
      },
      {
        icon: "cat",
        title: "Gatos",
        description: "Consultas tranquilas y manejo pensado para reducir el estrés felino."
      }
    ]
  },

  // Franja de servicios que se desplaza (marquesina)
  marquee: [
    "Consulta general",
    "Vacunación",
    "Cirugía",
    "Odontología",
    "Diagnóstico",
    "Perros",
    "Gatos",
    "Exóticos",
    "Medicina preventiva"
  ],

  // Cómo pedir cita (3 pasos)
  process: {
    eyebrow: "Así de fácil",
    title: "Pedir cita en tres pasos",
    intro: "Sin esperas ni complicaciones. Tu mascota estará atendida en poco tiempo.",
    steps: [
      {
        icon: "phone",
        title: "Cuéntanos qué pasa",
        tag: "2 minutos",
        description: "Llámanos o rellena el formulario. Con dos líneas nos basta para orientarte."
      },
      {
        icon: "calendar",
        title: "Confirmamos la cita",
        tag: "El mismo día",
        description: "Te llamamos para fijar el día y la hora que mejor te vengan."
      },
      {
        icon: "heart",
        title: "Venís a la clínica",
        tag: "Sin prisas",
        description: "Revisamos a tu mascota con calma y te explicamos todo antes de empezar."
      }
    ]
  },

  // Preguntas frecuentes
  faq: {
    eyebrow: "Dudas",
    title: "Preguntas frecuentes",
    intro: "Lo que más nos preguntan antes de la primera visita.",
    sideTitle: "¿No encuentras tu duda?",
    sideText: "Llámanos o escríbenos y te respondemos sin compromiso.",
    categories: ["Todas", "Citas", "Salud", "Pagos"],
    items: [
      {
        category: "Citas",
        question: "¿Necesito cita previa?",
        answer:
          "Sí, trabajamos con cita para no hacer esperar a nadie. Si es una urgencia, llámanos al teléfono de la clínica y te decimos cómo actuar."
      },
      {
        category: "Citas",
        question: "¿Qué hago si mi mascota tiene una urgencia?",
        answer:
          "Llámanos de inmediato. Te indicamos qué hacer mientras llegáis y preparamos al equipo para atenderla en cuanto entre por la puerta."
      },
      {
        category: "Salud",
        question: "¿A qué edad debo vacunar a mi cachorro?",
        answer:
          "La primera vacuna suele ponerse hacia las 6-8 semanas de vida. En la consulta preparamos un calendario adaptado a tu cachorro."
      },
      {
        category: "Salud",
        question: "¿Atendéis animales exóticos?",
        answer:
          "Sí, atendemos aves, reptiles y pequeños mamíferos. Avísanos de la especie al pedir cita para preparar la consulta."
      },
      {
        category: "Citas",
        question: "¿Cuánto dura una consulta?",
        answer:
          "Una consulta general dura unos 30 minutos. Preferimos tomarnos el tiempo necesario para explicarte el diagnóstico con claridad."
      },
      {
        category: "Pagos",
        question: "¿Cómo puedo pagar?",
        answer: "Aceptamos efectivo y tarjeta. Si el tratamiento es largo, te damos un presupuesto antes de empezar."
      }
    ]
  },

  // Sobre nosotros
  about: {
    eyebrow: "Nosotros",
    title: "Más de 10 años cuidando de nuestros pacientes",
    image: "/imagenes/portada/equipovete.png",
    imageAlt: "El equipo veterinario de Mi Mascota agachado junto a tres perros en la clínica",
    imageCaption: "Parte del equipo de la clínica.",
    paragraphs: [
      "Somos un equipo de veterinarios que disfruta de su trabajo. Combinamos la experiencia clínica con un trato personal: conocemos a cada paciente por su nombre y a su familia también.",
      "Preferimos dedicar unos minutos más a explicar un diagnóstico que a repetir una visita. Así decides con toda la información."
    ],
    cta: "Conoce al equipo",
    values: [
      { icon: "heart", title: "Trato cercano", text: "Conocemos a cada paciente por su nombre y a su familia también." },
      { icon: "message", title: "Te lo explicamos todo", text: "Dedicamos unos minutos más a aclarar cada diagnóstico y tratamiento." },
      { icon: "shield-check", title: "Medicina con criterio", text: "Pruebas y tratamientos solo cuando de verdad aportan algo." }
    ],
    stats: [
      { value: 10, suffix: "+", label: "años de experiencia" },
      { value: 6500, suffix: "", label: "pacientes atendidos" },
      { value: 5, suffix: "", label: "veterinarios especialistas" }
    ]
  },

  // Especialidades por etapa de vida
  specialties: {
    eyebrow: "Especialidades",
    title: "Un cuidado distinto para cada etapa",
    intro: "Un cachorro y un perro de doce años no necesitan lo mismo. Adaptamos revisiones, pruebas y tratamientos a cada momento de su vida.",
    items: [
      {
        stage: "Primer año",
        title: "Cachorros",
        description: "Vacunación, desparasitación, socialización y pautas de alimentación desde el primer día."
      },
      {
        stage: "Edad adulta",
        title: "Adultos",
        description: "Revisiones anuales y prevención para mantenerlo en su mejor estado de salud."
      },
      {
        stage: "Edad avanzada",
        title: "Senior",
        description: "Control del dolor, analíticas periódicas y ajustes para cuidar su calidad de vida."
      },
      {
        stage: "Otras especies",
        title: "Exóticos",
        description: "Atención para aves, reptiles y pequeños mamíferos, con su manejo específico."
      }
    ]
  },

  // Equipo
  team: {
    eyebrow: "Equipo",
    title: "Quién atenderá a tu mascota",
    intro: "Veterinarios con formación específica en cada área, que trabajan juntos en los casos que lo necesitan.",
    members: [
      {
        name: "Dr. Juan Pérez",
        specialty: "Veterinario general",
        description: "15 años de experiencia en medicina preventiva y tratamientos generales.",
        image: "/imagenes/equipo/persona1.png",
        tags: ["Vacunación", "Medicina preventiva", "Revisiones anuales"],
        years: 15
      },
      {
        name: "Dra. María García",
        specialty: "Nutrición",
        description: "Especialista en nutrición canina y felina. Diseña dietas personalizadas.",
        image: "/imagenes/equipo/persona2.png",
        tags: ["Dietas a medida", "Control de peso", "Alergias alimentarias"],
        years: 9
      },
      {
        name: "Dr. Carlos López",
        specialty: "Cirugía",
        description: "Cirujano veterinario centrado en técnicas mínimamente invasivas.",
        image: "/imagenes/equipo/persona3.png",
        tags: ["Cirugía mínimamente invasiva", "Anestesia monitorizada", "Postoperatorio"],
        years: 12
      }
    ]
  },

  // Opiniones (la primera se muestra destacada)
  testimonials: {
    eyebrow: "Opiniones",
    title: "Lo que cuentan quienes ya nos conocen",
    items: [
      {
        name: "Ana",
        pet: "Rocky",
        species: "perro",
        text: "Gracias por salvar a mi perro cuando tuvo una emergencia. Respondieron rápidamente y le dieron la mejor atención. Estoy eternamente agradecida por su profesionalismo y dedicación."
      },
      {
        name: "Jeremy",
        pet: "Max",
        text: "El equipo veterinario es increíble. Siempre se toman el tiempo para explicar cada tratamiento y realmente se preocupan por el bienestar de mi mascota. ¡100% recomendados!"
      },
      {
        name: "Samuel",
        pet: "Luna",
        species: "gato",
        text: "Llevé a mi gato para una revisión de rutina y quedé encantado con la atención profesional y el trato cercano. Las instalaciones son impecables y el personal muy amable."
      }
    ]
  },

  // Contacto y formulario
  contact: {
    eyebrow: "Contacto",
    title: "Pide cita o escríbenos",
    intro: "Rellena el formulario y te contactamos para confirmar el día y la hora. Si tu consulta es urgente, mejor llámanos.",
    labels: {
      phone: "Teléfono",
      email: "Email",
      address: "Dirección",
      hours: "Horario",
      directions: "Cómo llegar",
      mapTitle: "Mapa de la ubicación de la clínica"
    },
    form: {
      title: "Solicitud de cita",
      requiredNote: "Todos los campos son obligatorios.",
      name: "Nombre y apellidos",
      email: "Email",
      phone: "Teléfono",
      petType: "Especie",
      petTypePlaceholder: "Perro, gato, conejo…",
      petName: "Nombre de tu mascota",
      message: "¿En qué podemos ayudarte?",
      messagePlaceholder: "Cuéntanos el motivo de la visita y qué días te vienen mejor.",
      privacy: "He leído y acepto la",
      privacyLink: "política de privacidad",
      submit: "Enviar solicitud",
      submitting: "Enviando…",
      success: "Mensaje enviado. Te llamaremos lo antes posible para confirmar la cita.",
      error: "No hemos podido enviar el mensaje. Inténtalo de nuevo o llámanos por teléfono.",
      errors: {
        nameRequired: "Escribe tu nombre",
        nameShort: "El nombre debe tener al menos 2 caracteres",
        emailRequired: "Escribe tu email",
        emailInvalid: "Revisa el formato del email (ejemplo: nombre@correo.com)",
        phoneRequired: "Escribe un teléfono de contacto",
        phoneInvalid: "El teléfono debe tener al menos 9 cifras",
        petTypeRequired: "Indica qué animal es",
        petNameRequired: "Escribe el nombre de tu mascota",
        messageRequired: "Cuéntanos brevemente el motivo",
        messageShort: "El mensaje debe tener al menos 5 caracteres",
        privacyRequired: "Debes aceptar la política de privacidad"
      }
    }
  },

  // Footer
  footer: {
    description: "Clínica veterinaria en Zaragoza para perros, gatos y animales exóticos.",
    navTitle: "La clínica",
    servicesTitle: "Servicios",
    contactTitle: "Contacto",
    socialTitle: "Síguenos",
    rights: "Todos los derechos reservados",
    // PLACEHOLDER: crear las páginas legales
    legal: [
      { label: "Aviso legal", href: "#" },
      { label: "Privacidad", href: "#" },
      { label: "Cookies", href: "#" }
    ]
  }
};
