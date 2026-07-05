const WHATSAPP_NUMBER = '50768603623';
const DEFAULT_MESSAGE = 'Hola Atlante, quiero informacion sobre tours o charters en Panama.';

const TOURS = {
  sunset: {
    price: 850,
  },
  taboga: {
    price: 1450,
  },
  perlas: {
    price: 2800,
  },
};

function buildWhatsAppUrl(message = DEFAULT_MESSAGE) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function money(value) {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function wireWhatsAppLinks() {
  document.querySelectorAll('[data-whatsapp]').forEach((link) => {
    const message = link.dataset.whatsappMessage || DEFAULT_MESSAGE;
    link.setAttribute('href', buildWhatsAppUrl(message));
  });
}

function wireHeaderState() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  const update = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
}

function wireFilters() {
  const filters = document.querySelectorAll('[data-filter]');
  const cards = document.querySelectorAll('[data-category]');

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filters.forEach((item) => item.classList.toggle('is-active', item === button));

      cards.forEach((card) => {
        const categories = card.dataset.category || '';
        card.hidden = filter !== 'all' && !categories.includes(filter);
      });
    });
  });
}

function wireContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get('name') || '';
    const phone = data.get('phone') || '';
    const email = data.get('email') || '';
    const date = data.get('date') || '';
    const group = data.get('group') || '';
    const message = data.get('message') || '';

    const text = [
      'Hola Atlante, quiero informacion sobre tours o charters en Panama.',
      name ? `Nombre: ${name}` : '',
      phone ? `Telefono: ${phone}` : '',
      email ? `Email: ${email}` : '',
      date ? `Fecha: ${date}` : '',
      group ? `Grupo: ${group}` : '',
      message ? `Detalle: ${message}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    window.open(buildWhatsAppUrl(text), '_blank', 'noopener,noreferrer');
  });
}

function hydrateTourPrices() {
  document.querySelectorAll('[data-tour-price]').forEach((node) => {
    const tour = TOURS[node.dataset.tourPrice];
    if (tour) node.textContent = money(tour.price);
  });
}

hydrateTourPrices();
wireWhatsAppLinks();
wireHeaderState();
wireFilters();
wireContactForm();
