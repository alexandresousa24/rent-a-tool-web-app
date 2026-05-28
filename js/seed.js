/* =============================================================
   seed.js — dados de demonstração
   ----------------------------------------------------------------
   Para que a aplicação seja navegável "out of the box", semeamos
   o catálogo com algumas ferramentas e um proprietário. O seed
   só corre se ainda não houver dados.
   ============================================================= */

const Seed = (() => {

  /** Ilustrações SVG inline — evitam dependências externas. */
  const SVG = {
    drill: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1B7A7E"/><stop offset="1" stop-color="#0E2A2E"/>
      </linearGradient></defs>
      <rect width="320" height="200" fill="url(#g1)"/>
      <g transform="translate(60,55)">
        <rect x="0" y="20" width="120" height="50" rx="8" fill="#D2691E"/>
        <rect x="100" y="32" width="60" height="26" fill="#A04E14"/>
        <rect x="155" y="38" width="80" height="14" fill="#bbb" stroke="#333" stroke-width="1.2"/>
        <rect x="30" y="70" width="40" height="60" rx="6" fill="#A04E14"/>
        <circle cx="50" cy="135" r="14" fill="#222"/>
      </g>
    </svg>`,
    saw: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#D2691E"/><stop offset="1" stop-color="#7c3e10"/>
      </linearGradient></defs>
      <rect width="320" height="200" fill="url(#g2)"/>
      <g transform="translate(45,55)">
        <rect x="0" y="20" width="100" height="60" rx="10" fill="#0E2A2E"/>
        <rect x="90" y="35" width="120" height="30" fill="#d9d4cc"/>
        <polygon points="210,35 230,50 210,65" fill="#0E2A2E"/>
        <rect x="20" y="80" width="50" height="50" rx="8" fill="#0E2A2E"/>
        <line x1="100" y1="50" x2="200" y2="50" stroke="#1B7A7E" stroke-width="2" stroke-dasharray="6 3"/>
      </g>
    </svg>`,
    mower: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3B8F5E"/><stop offset="1" stop-color="#1f5a3a"/>
      </linearGradient></defs>
      <rect width="320" height="200" fill="url(#g3)"/>
      <g transform="translate(50,55)">
        <rect x="0" y="50" width="140" height="50" rx="10" fill="#D2691E"/>
        <rect x="40" y="20" width="60" height="40" fill="#0E2A2E"/>
        <line x1="140" y1="40" x2="200" y2="0" stroke="#0E2A2E" stroke-width="6" stroke-linecap="round"/>
        <circle cx="20" cy="110" r="14" fill="#1A1A1A"/>
        <circle cx="120" cy="110" r="14" fill="#1A1A1A"/>
      </g>
    </svg>`,
    ladder: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#103438"/><stop offset="1" stop-color="#0E2A2E"/>
      </linearGradient></defs>
      <rect width="320" height="200" fill="url(#g4)"/>
      <g transform="translate(110,30)">
        <line x1="0" y1="0" x2="40" y2="150" stroke="#D2691E" stroke-width="6" stroke-linecap="round"/>
        <line x1="80" y1="0" x2="40" y2="150" stroke="#D2691E" stroke-width="6" stroke-linecap="round"/>
        <line x1="15" y1="30" x2="65" y2="30" stroke="#D2691E" stroke-width="4"/>
        <line x1="20" y1="60" x2="60" y2="60" stroke="#D2691E" stroke-width="4"/>
        <line x1="25" y1="90" x2="55" y2="90" stroke="#D2691E" stroke-width="4"/>
        <line x1="30" y1="120" x2="50" y2="120" stroke="#D2691E" stroke-width="4"/>
      </g>
    </svg>`,
    sander: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g5" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1B7A7E"/><stop offset="1" stop-color="#0E2A2E"/>
      </linearGradient></defs>
      <rect width="320" height="200" fill="url(#g5)"/>
      <g transform="translate(70,55)">
        <ellipse cx="90" cy="90" rx="80" ry="20" fill="#D2691E"/>
        <rect x="40" y="40" width="100" height="50" rx="8" fill="#0E2A2E"/>
        <rect x="60" y="20" width="60" height="30" rx="6" fill="#A04E14"/>
        <circle cx="160" cy="60" r="6" fill="#1B7A7E"/>
      </g>
    </svg>`,
    pressureWasher: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g6" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2563a8"/><stop offset="1" stop-color="#0E2A2E"/>
      </linearGradient></defs>
      <rect width="320" height="200" fill="url(#g6)"/>
      <g transform="translate(60,40)">
        <rect x="0" y="40" width="110" height="80" rx="10" fill="#D2691E"/>
        <rect x="20" y="55" width="70" height="20" fill="#FBF6EE"/>
        <circle cx="30" cy="100" r="10" fill="#0E2A2E"/>
        <circle cx="90" cy="100" r="10" fill="#0E2A2E"/>
        <path d="M110,60 Q160,40 200,80" stroke="#1B7A7E" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g>
    </svg>`,
    leafBlower: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g7" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7a5510"/><stop offset="1" stop-color="#0E2A2E"/>
      </linearGradient></defs>
      <rect width="320" height="200" fill="url(#g7)"/>
      <g transform="translate(40,50)">
        <rect x="0" y="20" width="90" height="50" rx="10" fill="#D2691E"/>
        <rect x="90" y="35" width="80" height="20" fill="#A04E14"/>
        <circle cx="170" cy="45" r="14" fill="#FBF6EE" opacity=".25"/>
        <circle cx="200" cy="40" r="10" fill="#FBF6EE" opacity=".18"/>
        <circle cx="225" cy="50" r="8" fill="#FBF6EE" opacity=".12"/>
        <rect x="30" y="70" width="30" height="30" rx="4" fill="#0E2A2E"/>
      </g>
    </svg>`,
    multitool: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g8" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#A04E14"/><stop offset="1" stop-color="#0E2A2E"/>
      </linearGradient></defs>
      <rect width="320" height="200" fill="url(#g8)"/>
      <g transform="translate(80,60)">
        <rect x="0" y="20" width="100" height="40" rx="8" fill="#0E2A2E"/>
        <polygon points="100,30 140,40 100,50" fill="#d9d4cc"/>
        <rect x="20" y="60" width="40" height="50" rx="6" fill="#D2691E"/>
      </g>
    </svg>`
  };

  /** Lista de ferramentas a semear. */
  const TOOLS = [
    {
      id: "tl_drill_01",
      title: "Berbequim sem fios Bosch 18V",
      category: "eletricas",
      description: "Berbequim profissional, com 2 baterias, carregador, mala de transporte e jogo de brocas. Ideal para furos em alvenaria, madeira e metal. Excelente estado, com manutenção recente.",
      pricePerDay: 12,
      deposit: 80,
      city: "Lisboa",
      neighborhood: "Alvalade",
      conservation: "COMO_NOVO",
      ownerId: "usr_afonso_costa",
      image: SVG.drill,
      blockedDates: []
    },
    {
      id: "tl_saw_01",
      title: "Serra circular Makita 1400W",
      category: "eletricas",
      description: "Serra circular potente, com disco novo. Inclui guia paralela e chave de aperto. Cortes precisos em madeira até 65 mm.",
      pricePerDay: 15,
      deposit: 120,
      city: "Lisboa",
      neighborhood: "Areeiro",
      conservation: "BOM",
      ownerId: "usr_martim_sarm",
      image: SVG.saw,
      blockedDates: []
    },
    {
      id: "tl_mower_01",
      title: "Corta-relvas elétrico 1600W",
      category: "jardim",
      description: "Corta-relvas elétrico com 5 alturas de corte e cesto de 45 L. Adequado para jardins até 600 m². Em bom estado, limpo após cada uso.",
      pricePerDay: 18,
      deposit: 150,
      city: "Porto",
      neighborhood: "Foz",
      conservation: "BOM",
      ownerId: "usr_antonio_v",
      image: SVG.mower,
      blockedDates: []
    },
    {
      id: "tl_ladder_01",
      title: "Escadote de alumínio 6 degraus",
      category: "acessorios",
      description: "Escadote duplo em alumínio, estável e leve. Adequado para trabalhos de pintura, manutenção doméstica e poda baixa.",
      pricePerDay: 6,
      deposit: 40,
      city: "Lisboa",
      neighborhood: "Telheiras",
      conservation: "BOM",
      ownerId: "usr_filipe_lopes",
      image: SVG.ladder,
      blockedDates: []
    },
    {
      id: "tl_sander_01",
      title: "Lixadora orbital Makita",
      category: "eletricas",
      description: "Lixadora orbital com aspiração integrada, ideal para acabamentos em madeira. Inclui kit de lixas variadas.",
      pricePerDay: 10,
      deposit: 60,
      city: "Lisboa",
      neighborhood: "Benfica",
      conservation: "COMO_NOVO",
      ownerId: "usr_afonso_lamas",
      image: SVG.sander,
      blockedDates: []
    },
    {
      id: "tl_washer_01",
      title: "Máquina de alta pressão Kärcher K5",
      category: "limpeza",
      description: "Máquina de lavar à pressão com 145 bar. Inclui lança turbo, mangueira de 8m e detergente. Ideal para fachadas, viaturas e mobiliário de exterior.",
      pricePerDay: 22,
      deposit: 200,
      city: "Porto",
      neighborhood: "Boavista",
      conservation: "COMO_NOVO",
      ownerId: "usr_yuran_c",
      image: SVG.pressureWasher,
      blockedDates: []
    },
    {
      id: "tl_blower_01",
      title: "Soprador de folhas a gasolina",
      category: "jardim",
      description: "Soprador profissional, motor 2 tempos. Indicado para limpeza rápida de jardins ou terraços grandes.",
      pricePerDay: 14,
      deposit: 100,
      city: "Porto",
      neighborhood: "Matosinhos",
      conservation: "BOM",
      ownerId: "usr_bohdan_b",
      image: SVG.leafBlower,
      blockedDates: []
    },
    {
      id: "tl_multi_01",
      title: "Ferramenta multifunções oscilante",
      category: "eletricas",
      description: "Ideal para cortes em locais apertados, lixar pequenas superfícies, raspar tintas e cortar canos plásticos. Diversos acessórios incluídos.",
      pricePerDay: 11,
      deposit: 70,
      city: "Lisboa",
      neighborhood: "Lumiar",
      conservation: "BOM",
      ownerId: "usr_sofia_marques",
      image: SVG.multitool,
      blockedDates: []
    }
  ];

  /** Proprietários fictícios, já com KYC validado, para o catálogo estar pronto. */
  const daysAgo = (d) => new Date(Date.now() - 1000 * 60 * 60 * 24 * d).toISOString();
  const OWNERS = [
    { id: "usr_afonso_costa",  name: "Afonso Costa",    email: "afonso.costa@exemplo.pt",    phone: "9XX XXX 101", kycStatus: "VALIDADO", trustedBadge: true, rating: 4.8, ratingCount: 24, city: "Lisboa", createdAt: daysAgo(120) },
    { id: "usr_martim_sarm",   name: "Martim Sarmento", email: "martim.sarmento@exemplo.pt", phone: "9XX XXX 102", kycStatus: "VALIDADO", trustedBadge: true, rating: 4.6, ratingCount: 17, city: "Lisboa", createdAt: daysAgo(95) },
    { id: "usr_antonio_v",     name: "António Vieira",   email: "antonio.vieira@exemplo.pt",  phone: "9XX XXX 103", kycStatus: "VALIDADO", trustedBadge: true, rating: 4.9, ratingCount: 31, city: "Porto",  createdAt: daysAgo(140) },
    { id: "usr_filipe_lopes",  name: "Filipe Lopes",    email: "filipe.lopes@exemplo.pt",    phone: "9XX XXX 104", kycStatus: "VALIDADO", trustedBadge: true, rating: 4.5, ratingCount: 12, city: "Lisboa", createdAt: daysAgo(60) },
    { id: "usr_yuran_c",       name: "Yuran Carrelo",   email: "yuran.carrelo@exemplo.pt",   phone: "9XX XXX 105", kycStatus: "VALIDADO", trustedBadge: true, rating: 4.7, ratingCount: 20, city: "Porto",  createdAt: daysAgo(110) },
    { id: "usr_bohdan_b",      name: "Bohdan Bazhaluk", email: "bohdan.bazhaluk@exemplo.pt", phone: "9XX XXX 106", kycStatus: "VALIDADO", trustedBadge: true, rating: 5.0, ratingCount: 9,  city: "Porto",  createdAt: daysAgo(45) },
    { id: "usr_afonso_lamas",  name: "Afonso Lamas",    email: "afonso.lamas@exemplo.pt",    phone: "9XX XXX 107", kycStatus: "VALIDADO", trustedBadge: true, rating: 4.4, ratingCount: 15, city: "Lisboa", createdAt: daysAgo(80) },
    { id: "usr_sofia_marques", name: "Sofia Marques",   email: "sofia.marques@exemplo.pt",   phone: "9XX XXX 108", kycStatus: "VALIDADO", trustedBadge: true, rating: 4.8, ratingCount: 22, city: "Lisboa", createdAt: daysAgo(100) }
  ];

  /** Categorias para o filtro. */
  const CATEGORIES = [
    { id: "todas",      label: "Todas as categorias" },
    { id: "eletricas",  label: "Elétricas" },
    { id: "jardim",     label: "Jardim" },
    { id: "limpeza",    label: "Limpeza" },
    { id: "acessorios", label: "Acessórios" }
  ];

  /** Cidades onde a Rent-a-Tool opera (alinhado com o documento de visão). */
  const CITIES = ["Todas", "Lisboa", "Porto"];

  /**
   * Aplica o seed se ainda não houver dados.
   * Devolve `true` se semeou agora, `false` se já existiam dados.
   */
  function applyIfEmpty() {
    const users = Storage.read("users", null);
    if (users !== null) return false;     // já há dados — não tocar
    seedNow();
    return true;
  }

  /** Reaplica o seed, apagando primeiro tudo o que existe. */
  function resetAndSeed() {
    Storage.clearAll();
    seedNow();
  }

  function seedNow() {
    Storage.write("users", OWNERS.slice());
    Storage.write("tools", TOOLS);
    Storage.write("rentals", []);
    Storage.write("messages", []);         // threads de mensagens
    Storage.write("reviews", []);
    Storage.write("reports", []);
    Storage.write("session", null);        // sem utilizador logado
    Storage.write("categories", CATEGORIES);
    Storage.write("cities", CITIES);
  }

  return { applyIfEmpty, resetAndSeed, CATEGORIES, CITIES };
})();
