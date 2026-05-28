/* =============================================================
   app.js — bootstrap e views
   ----------------------------------------------------------------
   Define todas as renderizações de views e regista-as no Router.
   ============================================================= */

const App = (() => {

  // ============================================================
  // BARRA SUPERIOR — caixa do utilizador
  // ============================================================
  function renderUserbox() {
    const box = document.getElementById("userbox");
    const me = Auth.current();
    if (!me) {
      box.innerHTML = `
        <a href="#/login" class="btn btn--ghost btn--sm">Entrar</a>
        <a href="#/registo" class="btn btn--primary btn--sm">Criar conta</a>
      `;
      return;
    }
    const badge = me.trustedBadge
      ? `<span class="userbox__badge userbox__badge--trusted" title="Trusted Badge — KYC validado">✓ Trusted</span>`
      : `<span class="userbox__badge" title="A aguardar validação KYC">KYC pendente</span>`;
    box.innerHTML = `
      <div class="userbox__menu" data-userbox-menu>
        <button class="flex" style="background:none;border:0;padding:0;cursor:pointer" data-userbox-toggle>
          <span class="userbox__avatar" aria-hidden="true">${UI.esc(UI.initials(me.name))}</span>
          <div style="text-align:left">
            <div class="userbox__name">${UI.esc(me.name.split(" ")[0])}</div>
            <div>${badge}</div>
          </div>
        </button>
        <div class="userbox__menu-list" hidden>
          <button data-userbox-action="logout">Terminar sessão</button>
        </div>
      </div>
    `;
  }

  // Menu drop-down do utilizador
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-userbox-toggle]");
    const menu = document.querySelector("[data-userbox-menu] .userbox__menu-list");
    if (toggle) {
      if (menu) menu.hidden = !menu.hidden;
      e.stopPropagation();
      return;
    }
    if (menu && !e.target.closest("[data-userbox-menu]")) menu.hidden = true;

    const action = e.target.closest("[data-userbox-action]")?.dataset.userboxAction;
    if (action === "logout") Auth.logout();
  });

  // Badge de mensagens não vistas (simplificação: número total de threads ativas)
  function refreshMsgBadge() {
    const b = document.getElementById("msgBadge");
    const me = Auth.current();
    if (!b || !me) { if (b) b.hidden = true; return; }
    const threads = Messages.ofCurrent();
    if (threads.length === 0) { b.hidden = true; return; }
    b.hidden = false;
    b.textContent = threads.length;
  }

  // ============================================================
  // VIEW: HOME (pesquisa do catálogo) — UC-03
  // ============================================================
  function renderHome(view, _) {
    const filters = currentFilters();
    const cats = Storage.read("categories", []) || [];
    const cities = Storage.read("cities", []) || [];

    view.innerHTML = `
      <section class="hero">
        <div class="container hero__inner">
          <p class="section-eyebrow" style="color:var(--c-accent-hot)">Aluguer de Confiança · P2P</p>
          <h1>Alugue a ferramenta certa, <em>do seu vizinho</em>, em poucos minutos.</h1>
          <p class="hero__lead">Procure no catálogo georreferenciado de bricolage e jardim, reserve com caução cativada e levante a ferramenta perto de casa. Lisboa e Porto.</p>

          <form class="search" id="searchForm" autocomplete="off">
            <label class="field">
              <span class="field__label">Pesquisar</span>
              <input type="text" name="q" class="input" placeholder="berbequim, escadote, corta-relvas..." value="${UI.esc(filters.q || "")}" />
            </label>
            <label class="field">
              <span class="field__label">Categoria</span>
              <select name="category" class="select">
                ${cats.map(c => `<option value="${c.id}" ${filters.category === c.id ? "selected" : ""}>${UI.esc(c.label)}</option>`).join("")}
              </select>
            </label>
            <label class="field">
              <span class="field__label">Cidade</span>
              <select name="city" class="select">
                ${cities.map(c => `<option value="${c}" ${filters.city === c ? "selected" : ""}>${UI.esc(c)}</option>`).join("")}
              </select>
            </label>
            <label class="field">
              <span class="field__label">Preço máx./dia (€)</span>
              <input type="number" name="priceMax" class="input" min="0" step="1" placeholder="qualquer" value="${UI.esc(filters.priceMax || "")}" />
            </label>
            <button type="submit" class="btn btn--primary search__submit">Pesquisar</button>
          </form>
        </div>
      </section>

      <section class="container">
        <div class="catalog-head">
          <div>
            <p class="section-eyebrow">Catálogo</p>
            <h2 class="mt-0">Ferramentas disponíveis</h2>
          </div>
          <div class="flex">
            <label class="catalog-sort">
              Ordenar por
              <select id="sortSelect" class="select" style="padding:6px 10px">
                <option value="recent"     ${filters.sort === "recent" ? "selected" : ""}>Mais recentes</option>
                <option value="price-asc"  ${filters.sort === "price-asc" ? "selected" : ""}>Preço (ascendente)</option>
                <option value="price-desc" ${filters.sort === "price-desc" ? "selected" : ""}>Preço (descendente)</option>
                <option value="rating"     ${filters.sort === "rating" ? "selected" : ""}>Avaliação do proprietário</option>
              </select>
            </label>
          </div>
        </div>
        <div id="catalogResults"></div>
      </section>
    `;

    renderCatalogResults();

    // Submissão da pesquisa
    UI.$("#searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const f = Object.fromEntries(fd.entries());
      saveFilters({ ...f, sort: filters.sort });
      renderCatalogResults();
    });

    // Ordenação
    UI.$("#sortSelect").addEventListener("change", (e) => {
      const f = currentFilters();
      saveFilters({ ...f, sort: e.target.value });
      renderCatalogResults();
    });
  }

  function currentFilters() {
    return Storage.read("homeFilters", { q: "", category: "todas", city: "Todas", priceMax: "", sort: "recent" });
  }
  function saveFilters(f) { Storage.write("homeFilters", f); }

  function renderCatalogResults() {
    const f = currentFilters();
    const list = Catalog.search(f);
    const host = UI.$("#catalogResults");
    if (!list.length) {
      host.innerHTML = `
        <div class="empty">
          <h3>Nenhuma ferramenta encontrada</h3>
          <p>Tente relaxar os filtros (alargar a categoria, aumentar o preço ou outra cidade).</p>
        </div>`;
      return;
    }
    const users = Storage.read("users", []);
    host.innerHTML = `
      <p class="results-count text-small text-muted">${list.length} resultado${list.length === 1 ? "" : "s"}</p>
      <div class="grid-cards mt-3">
        ${list.map(t => toolCard(t, users.find(u => u.id === t.ownerId))).join("")}
      </div>
    `;
  }

  function toolCard(t, owner) {
    const ratingStr = owner && owner.ratingCount > 0
      ? `${UI.starsHTML(owner.rating)} <small>(${owner.ratingCount})</small>`
      : `<small class="text-muted">Sem avaliações ainda</small>`;
    return `
      <a class="card card--hover tool-card" href="#/ferramenta/${UI.esc(t.id)}" style="text-decoration:none;color:inherit">
        <div class="tool-card__media">
          ${t.image}
          <span class="tool-card__price">${UI.money(t.pricePerDay)} <small>/ dia</small></span>
        </div>
        <div class="card__body">
          <h3 class="tool-card__title">${UI.esc(t.title)}</h3>
          <p class="tool-card__meta">
            <span>${UI.esc(t.city)}, ${UI.esc(t.neighborhood)}</span>
            <span class="dot"></span>
            <span>${categoryLabel(t.category)}</span>
          </p>
          <div class="tool-card__owner">
            <span class="avatar">${UI.esc(UI.initials(owner ? owner.name : "?"))}</span>
            <div>
              <div class="text-small" style="font-weight:600">${UI.esc(owner ? owner.name : "—")}</div>
              <div class="text-small">${ratingStr}</div>
            </div>
            ${owner && owner.trustedBadge ? `<span class="badge badge--good" style="margin-left:auto">✓ Trusted</span>` : ""}
          </div>
        </div>
      </a>
    `;
  }

  function categoryLabel(id) {
    const c = (Storage.read("categories", []) || []).find(x => x.id === id);
    return c ? c.label : id;
  }

  // ============================================================
  // VIEW: DETALHE DA FERRAMENTA (+ reserva UC-05 + contactar UC-04)
  // ============================================================
  function renderToolDetail(view, id) {
    const t = Catalog.byId(id);
    if (!t) {
      view.innerHTML = `<section class="container"><h1>Ferramenta não encontrada</h1><a href="#/" class="btn btn--ghost">Voltar</a></section>`;
      return;
    }
    const users = Storage.read("users", []);
    const owner = users.find(u => u.id === t.ownerId);
    const me = Auth.current();
    const isMine = me && me.id === t.ownerId;

    view.innerHTML = `
      <section class="container">
        <a href="#/" class="btn-link">← Voltar à pesquisa</a>
        <div class="detail mt-3">
          <div>
            <div class="detail__media">${t.image}</div>
            <p class="section-eyebrow mt-3">${categoryLabel(t.category)} · ${conservationLabel(t.conservation)}</p>
            <h1 class="detail__title">${UI.esc(t.title)}</h1>
            <p class="detail__meta">
              <span>📍 ${UI.esc(t.city)}, ${UI.esc(t.neighborhood)}</span>
              <span>·</span>
              <span>Caução: ${UI.money(t.deposit)}</span>
            </p>
            <p class="detail__desc">${UI.esc(t.description)}</p>

            <h3 class="mt-4">Proprietário</h3>
            <div class="detail__owner-card">
              <span class="avatar">${UI.esc(UI.initials(owner ? owner.name : "?"))}</span>
              <div>
                <div style="font-weight:600">${UI.esc(owner ? owner.name : "—")}</div>
                <div class="text-small text-muted">
                  ${owner && owner.ratingCount > 0
                    ? `${UI.starsHTML(owner.rating)} ${owner.rating.toFixed(1)} · ${owner.ratingCount} avaliação(ões)`
                    : "Sem avaliações ainda"}
                </div>
              </div>
              ${owner && owner.trustedBadge ? `<span class="badge badge--good" style="margin-left:auto">✓ Trusted</span>` : ""}
            </div>

            ${!isMine ? `
              <button class="btn btn--ghost mt-3" id="btnContactOwner">💬 Contactar o proprietário</button>
            ` : ""}
          </div>

          <aside class="detail__sidebar">
            ${isMine ? `
              <p class="text-muted">Este é um anúncio seu.</p>
              <p class="text-small text-muted">Não pode reservar uma ferramenta sua. Em iterações futuras, poderá editar este anúncio.</p>
            ` : `
              <p class="section-eyebrow">Solicitar reserva</p>
              <div class="price-block">
                <span class="price-block__amount">${UI.money(t.pricePerDay)}</span>
                <span class="price-block__unit">/ dia</span>
              </div>
              <form id="reserveForm">
                <div class="grid-2">
                  <label class="field">
                    <span class="field__label">Data de início</span>
                    <input type="date" name="startDate" class="input" min="${UI.todayISO()}" value="${UI.todayISO(1)}" required />
                  </label>
                  <label class="field">
                    <span class="field__label">Data de fim</span>
                    <input type="date" name="endDate" class="input" min="${UI.todayISO()}" value="${UI.todayISO(2)}" required />
                  </label>
                </div>
                <label class="field">
                  <span class="field__label">Método de pagamento</span>
                  <select name="paymentMethod" class="select">
                    <option value="card">Cartão de débito/crédito</option>
                    <option value="mbway">MB WAY</option>
                  </select>
                </label>

                <div id="reserveSummary"></div>

                <button type="submit" class="btn btn--primary btn--block mt-3">Reservar agora</button>
                <p class="text-small text-muted text-center mt-2">
                  A caução é cativada e libertada após o check-out. <br/>
                  <em>BR-02: Cativação Prévia · BR-03: Fiel Depositária</em>
                </p>
              </form>
            `}
          </aside>
        </div>
      </section>
    `;

    if (!isMine) {
      // Botão de contacto
      const contactBtn = UI.$("#btnContactOwner");
      if (contactBtn) {
        contactBtn.addEventListener("click", () => {
          if (!Auth.isLogged()) {
            UI.toast("Inicie sessão para contactar o proprietário.", "warn");
            Router.go("/login");
            return;
          }
          const t2 = Messages.ensureThread({ toolId: t.id, ownerId: t.ownerId });
          if (t2) Router.go("/mensagens/" + t2.id);
        });
      }

      // Form de reserva — recalcula resumo em tempo real e submete
      const form = UI.$("#reserveForm");
      const summary = UI.$("#reserveSummary");

      function updateSummary() {
        const fd = new FormData(form);
        const start = fd.get("startDate");
        const end = fd.get("endDate");
        if (!start || !end || end < start) { summary.innerHTML = ""; return; }
        const days = UI.daysBetween(start, end);
        const rentalCost = days * t.pricePerDay;
        const serviceFee = +(rentalCost * 0.07).toFixed(2);
        const total = rentalCost + serviceFee + t.deposit;
        summary.innerHTML = `
          <div class="mt-3 text-small">
            <div class="summary-row"><span>${days} dia${days > 1 ? "s" : ""} × ${UI.money(t.pricePerDay)}</span><strong>${UI.money(rentalCost)}</strong></div>
            <div class="summary-row"><span>Taxa de serviço (7%)</span><strong>${UI.money(serviceFee)}</strong></div>
            <div class="summary-row"><span>Caução (cativada)</span><strong>${UI.money(t.deposit)}</strong></div>
            <div class="summary-row summary-row--total"><span>Total cativado</span><strong>${UI.money(total)}</strong></div>
          </div>
        `;
      }
      form.addEventListener("input", updateSummary);
      updateSummary();

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!Auth.isLogged()) {
          UI.toast("Inicie sessão para reservar.", "warn");
          Router.go("/login");
          return;
        }
        const fd = new FormData(form);
        const result = Catalog.requestReservation({
          toolId: t.id,
          startDate: fd.get("startDate"),
          endDate: fd.get("endDate"),
          paymentMethod: fd.get("paymentMethod")
        });
        if (!result.ok) {
          UI.toast(result.error, "bad");
          return;
        }
        UI.toast("Reserva confirmada! Aceda a Meus alugueres para gerir.", "good");
        Router.go("/aluguer/" + result.rental.id);
      });
    }
  }

  function conservationLabel(c) {
    return { "COMO_NOVO": "Como novo", "BOM": "Bom estado", "ACEITAVEL": "Aceitável" }[c] || c;
  }

  // ============================================================
  // VIEW: REGISTO (UC-01)
  // ============================================================
  function renderRegister(view) {
    const cities = (Storage.read("cities", []) || []).filter(c => c !== "Todas");

    view.innerHTML = `
      <section class="container" style="max-width:560px">
        <p class="section-eyebrow">UC-01 · Criar conta no site</p>
        <h1>Bem-vindo à Rent-a-Tool</h1>
        <p class="text-muted">Para alugar ou anunciar ferramentas, precisamos de validar a sua identidade (KYC). É rápido — em duas formas, à sua escolha.</p>

        <form id="registerForm" class="card mt-3" style="padding:24px" autocomplete="off">
          <div class="grid-2">
            <label class="field">
              <span class="field__label">Nome completo</span>
              <input type="text" name="name" class="input" required />
            </label>
            <label class="field">
              <span class="field__label">Cidade</span>
              <select name="city" class="select">
                <option value="">—</option>
                ${cities.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </label>
          </div>

          <div class="grid-2">
            <label class="field">
              <span class="field__label">Email</span>
              <input type="email" name="email" class="input" required />
            </label>
            <label class="field">
              <span class="field__label">Telefone</span>
              <input type="tel" name="phone" class="input" placeholder="9XX XXX XXX" required />
            </label>
          </div>

          <label class="field">
            <span class="field__label">Data de nascimento</span>
            <input type="date" name="birthDate" class="input" max="${UI.todayISO(-365*16)}" required />
            <span class="field__hint">Deve ter pelo menos 16 anos (BR-01).</span>
          </label>

          <h4 class="mt-4">Verificação de identidade (KYC)</h4>
          <p class="text-small text-muted">A Chave Móvel Digital é a opção mais rápida — valida instantaneamente. O upload de documento fica pendente para análise pelo BackOffice.</p>

          <label class="field" style="flex-direction:row;align-items:center;gap:10px;padding:12px;border:1px solid var(--c-line);border-radius:8px">
            <input type="radio" name="kycMethod" value="cmd" checked />
            <span>
              <strong>Chave Móvel Digital</strong><br/>
              <small class="text-muted">Validação imediata · atribui Trusted Badge</small>
            </span>
          </label>
          <label class="field" style="flex-direction:row;align-items:center;gap:10px;padding:12px;border:1px solid var(--c-line);border-radius:8px">
            <input type="radio" name="kycMethod" value="doc" />
            <span>
              <strong>Upload de documento de identificação</strong><br/>
              <small class="text-muted">Análise manual · pode demorar até 24h</small>
            </span>
          </label>

          <button type="submit" class="btn btn--primary btn--block mt-3">Criar conta</button>
          <p class="text-small text-center text-muted mt-2">
            Já tem conta? <a href="#/login">Entrar</a>
          </p>
        </form>
      </section>
    `;

    UI.$("#registerForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const result = Auth.register({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        birthDate: fd.get("birthDate"),
        kycMethod: fd.get("kycMethod"),
        city: fd.get("city")
      });
      if (!result.ok) {
        const msgs = Object.values(result.errors).join(" / ");
        UI.toast(msgs, "bad", 5000);
        return;
      }
      if (result.user.trustedBadge) {
        UI.toast(`Conta criada — bem-vindo(a), ${result.user.name.split(" ")[0]}! Trusted Badge atribuído.`, "good", 5000);
      } else {
        UI.toast(`Conta criada. KYC pendente — não poderá reservar até à validação.`, "warn", 5000);
      }
      App.refresh();
      Router.go("/");
    });
  }

  // ============================================================
  // VIEW: LOGIN (sem palavra-passe, demo)
  // ============================================================
  function renderLogin(view) {
    const users = Storage.read("users", []) || [];
    view.innerHTML = `
      <section class="container" style="max-width:480px">
        <p class="section-eyebrow">Iniciar sessão</p>
        <h1>Entrar</h1>
        <p class="text-muted">Esta iteração simplifica o login — basta indicar o email da conta. (Em produção, usaríamos password + SSO Google.)</p>

        <form id="loginForm" class="card mt-3" style="padding:24px">
          <label class="field">
            <span class="field__label">Email</span>
            <input type="email" name="email" class="input" required />
          </label>
          <button type="submit" class="btn btn--primary btn--block">Entrar</button>
          <p class="text-small text-center text-muted mt-2">
            Não tem conta? <a href="#/registo">Criar conta</a>
          </p>
        </form>

        ${users.length > 0 ? `
          <div class="mt-4">
            <p class="section-eyebrow">Contas existentes (demo)</p>
            <p class="text-small text-muted">Clique para entrar com uma conta de demonstração:</p>
            <div class="flex flex--wrap mt-2">
              ${users.map(u => `
                <button class="btn btn--ghost btn--sm" data-quick-login="${UI.esc(u.id)}">
                  ${UI.esc(u.name)} <small style="opacity:.7">· ${UI.esc(u.email)}</small>
                </button>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </section>
    `;

    UI.$("#loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = new FormData(e.target).get("email");
      const r = Auth.loginByEmail(email);
      if (!r.ok) { UI.toast(r.error, "bad"); return; }
      UI.toast(`Bem-vindo(a), ${r.user.name.split(" ")[0]}!`, "good");
      App.refresh();
      Router.go("/");
    });

    UI.$$("[data-quick-login]").forEach(btn => {
      btn.addEventListener("click", () => {
        Auth.loginAs(btn.dataset.quickLogin);
        UI.toast("Sessão iniciada.", "good");
        Router.go("/");
      });
    });
  }

  // ============================================================
  // VIEW: MEUS ALUGUERES (UC-07)
  // ============================================================
  function renderMyRentals(view) {
    if (!Auth.isLogged()) {
      view.innerHTML = `<section class="container"><h1>Inicie sessão</h1>
        <p class="text-muted">Para ver os seus alugueres, precisa de iniciar sessão.</p>
        <a href="#/login" class="btn btn--primary">Entrar</a></section>`;
      return;
    }

    const groups = Rentals.groupForUser();
    const order = [
      ["ATIVOS",     "Ativos",      groups.ATIVOS],
      ["PROXIMOS",   "Próximos",    groups.PROXIMOS],
      ["HISTORICO",  "Histórico",   groups.HISTORICO],
      ["EM_DISPUTA", "Em disputa",  groups.EM_DISPUTA]
    ];

    view.innerHTML = `
      <section class="container">
        <p class="section-eyebrow">UC-07 · Rastrear estado do aluguer</p>
        <h1>Meus alugueres</h1>
        <p class="text-muted">Acompanhe os alugueres em que é parte — como arrendatário ou como proprietário.</p>

        <div class="tabs" id="rentalTabs">
          ${order.map(([key, label, items], i) => `
            <button class="tabs__btn ${i === 0 ? "is-active" : ""}" data-tab="${key}">
              ${label}<span class="tabs__count">${items.length}</span>
            </button>
          `).join("")}
        </div>

        ${order.map(([key, label, items], i) => `
          <div class="tab-content" data-tab-content="${key}" ${i === 0 ? "" : "hidden"}>
            ${items.length === 0 ? `
              <div class="empty">
                <h3>Sem alugueres ${label.toLowerCase()}</h3>
                <p>${
                  key === "ATIVOS"     ? "Nenhum aluguer em curso neste momento." :
                  key === "PROXIMOS"   ? "Sem reservas próximas. Pesquise no catálogo para começar." :
                  key === "HISTORICO"  ? "Ainda não tem alugueres concluídos." :
                                         "Sem disputas em aberto — tudo bem!"
                }</p>
                ${key === "PROXIMOS" ? `<a href="#/" class="btn btn--primary mt-3">Pesquisar ferramentas</a>` : ""}
              </div>
            ` : items.map(r => rentalRowCard(r)).join("")}
          </div>
        `).join("")}
      </section>
    `;

    // Tabs
    UI.$$("#rentalTabs .tabs__btn").forEach(btn => {
      btn.addEventListener("click", () => {
        UI.$$("#rentalTabs .tabs__btn").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        UI.$$(".tab-content").forEach(c => c.hidden = c.dataset.tabContent !== btn.dataset.tab);
      });
    });
  }

  function rentalRowCard(r) {
    const tool = Catalog.byId(r.toolId);
    const role = Rentals.roleOf(r);
    return `
      <div class="rental-card" onclick="location.hash='#/aluguer/${UI.esc(r.id)}'">
        <div class="rental-card__thumb">${tool ? tool.image : ""}</div>
        <div>
          <h3 class="rental-card__title">${UI.esc(r.toolTitle)}</h3>
          <p class="rental-card__sub">
            ${UI.dateShort(r.startDate)} → ${UI.dateShort(r.endDate)} · ${UI.money(r.rentalCost)} · ${role === "owner" ? "Como proprietário" : "Como arrendatário"}
          </p>
        </div>
        <span class="badge ${Rentals.stateBadgeClass(r.state)}">${Rentals.stateLabel(r.state)}</span>
      </div>
    `;
  }

  // ============================================================
  // VIEW: DETALHE DO ALUGUER — hub para UC-06, UC-08, UC-09, UC-10
  // ============================================================
  function renderRentalDetail(view, id) {
    if (!Auth.isLogged()) { Router.go("/login"); return; }
    const r = Rentals.byId(id);
    if (!r) {
      view.innerHTML = `<section class="container"><h1>Aluguer não encontrado</h1><a href="#/meus-alugueres" class="btn btn--ghost">Voltar</a></section>`;
      return;
    }
    const role = Rentals.roleOf(r);
    if (!role) {
      // E1 do UC-07: acesso não autorizado
      view.innerHTML = `<section class="container"><h1>Aluguer não encontrado</h1>
        <p class="text-muted">Não tem acesso a este aluguer.</p>
        <a href="#/meus-alugueres" class="btn btn--ghost">Voltar</a></section>`;
      return;
    }

    const tool = Catalog.byId(r.toolId);
    const users = Storage.read("users", []);
    const counterpart = users.find(u => u.id === (role === "renter" ? r.ownerId : r.renterId));

    view.innerHTML = `
      <section class="container">
        <a href="#/meus-alugueres" class="btn-link">← Voltar a "Meus alugueres"</a>

        <div class="flex--between mt-3" style="flex-wrap:wrap">
          <div>
            <p class="section-eyebrow">Aluguer ${UI.esc(r.id)}</p>
            <h1 class="mt-0">${UI.esc(r.toolTitle)}</h1>
            <p class="text-muted">
              ${UI.dateShort(r.startDate)} → ${UI.dateShort(r.endDate)}
              · ${r.days} dia${r.days > 1 ? "s" : ""}
              · ${role === "owner" ? "Como proprietário" : "Como arrendatário"}
            </p>
          </div>
          <span class="badge ${Rentals.stateBadgeClass(r.state)}" style="font-size:.95rem;padding:6px 14px">${Rentals.stateLabel(r.state)}</span>
        </div>

        <div class="grid-2 mt-3" style="align-items:start;gap:24px">
          <div>
            ${tool ? `<div class="detail__media" style="aspect-ratio:16/10">${tool.image}</div>` : ""}

            <h3 class="mt-3">Contraparte</h3>
            <div class="detail__owner-card">
              <span class="avatar">${UI.esc(UI.initials(counterpart ? counterpart.name : "?"))}</span>
              <div>
                <div style="font-weight:600">${UI.esc(counterpart ? counterpart.name : "—")}</div>
                <div class="text-small text-muted">
                  ${role === "renter" ? "Proprietário" : "Arrendatário"}
                  ${counterpart && counterpart.trustedBadge ? " · ✓ Trusted" : ""}
                </div>
              </div>
              <button class="btn btn--ghost btn--sm" style="margin-left:auto" id="btnOpenChat">💬 Mensagens</button>
            </div>

            <h3 class="mt-4">Resumo financeiro</h3>
            <div class="card" style="padding:18px">
              <div class="summary-row"><span>Aluguer (${r.days} dia${r.days>1?"s":""})</span><strong>${UI.money(r.rentalCost)}</strong></div>
              <div class="summary-row"><span>Taxa de serviço</span><strong>${UI.money(r.serviceFee)}</strong></div>
              <div class="summary-row"><span>Caução cativada</span><strong>${UI.money(r.deposit)}</strong></div>
              <div class="summary-row summary-row--total"><span>Total ${r.paymentState === "RELEASED" ? "liquidado" : "cativado"}</span><strong>${UI.money(r.totalCaptured)}</strong></div>
              <p class="text-small text-muted mt-2">Pagamento: ${r.paymentMethod === "card" ? "Cartão" : "MB WAY"} · Estado: <strong>${r.paymentState}</strong></p>
            </div>

            ${rentalActions(r, role)}
          </div>

          <div>
            <h3 class="mt-0">Histórico</h3>
            <ul class="timeline">
              ${r.timeline.map((ev, i) => `
                <li class="${i === r.timeline.length - 1 ? "is-current" : "is-done"}">
                  ${UI.esc(ev.label)}
                  <span class="timeline__time">${UI.dateTime(ev.at)}</span>
                </li>
              `).join("")}
            </ul>

            ${renderReviews(r)}
          </div>
        </div>
      </section>
    `;

    bindRentalActions(r);

    UI.$("#btnOpenChat")?.addEventListener("click", () => {
      const other = role === "renter" ? r.ownerId : r.renterId;
      const t = Messages.ensureThread({ toolId: r.toolId, ownerId: other });
      if (t) Router.go("/mensagens/" + t.id);
    });
  }

  function rentalActions(r, role) {
    const actions = [];

    // UC-06: Check-in com código de pairing — quando CONFIRMADO/PENDENTE
    if (r.state === "CONFIRMADO" || r.state === "PENDENTE") {
      const stage = Rentals.checkinStage(r);
      if (role === "owner") {
        if (stage === "AWAIT_OWNER" || stage === "EXPIRED") {
          const label = stage === "EXPIRED" ? "🔄 Gerar novo código" : "🔑 Gerar código de levantamento";
          actions.push(`<button class="btn btn--primary" data-action="checkin-owner">${label}</button>`);
        } else if (stage === "AWAIT_RENTER") {
          actions.push(`<button class="btn btn--ghost" data-action="checkin-show-code">📲 Ver código gerado</button>`);
        }
      }
      if (role === "renter") {
        if (stage === "AWAIT_OWNER") {
          actions.push(`<span class="badge badge--warn">A aguardar que o proprietário gere o código de levantamento</span>`);
        } else if (stage === "AWAIT_RENTER") {
          actions.push(`<button class="btn btn--primary" data-action="checkin-renter">🔓 Inserir código de levantamento</button>`);
        } else if (stage === "EXPIRED") {
          actions.push(`<span class="badge badge--bad">O código expirou — a aguardar novo código do proprietário</span>`);
        }
      }
    }

    // UC-08: Check-out — apenas proprietário, com aluguer ATIVO
    if (r.state === "ATIVO" && role === "owner") {
      actions.push(`<button class="btn btn--primary" data-action="checkout">📤 Confirmar devolução</button>`);
    }

    // UC-09: Avaliar — ambos, com aluguer FINALIZADO, ainda não avaliou
    if (r.state === "FINALIZADO") {
      const mine = role === "owner" ? r.reviewByOwner : r.reviewByRenter;
      if (!mine) actions.push(`<button class="btn btn--primary" data-action="review">⭐ Avaliar experiência</button>`);
    }

    // UC-10: Reportar — sempre disponível (exceto se já cancelado)
    if (r.state !== "CANCELADO") {
      actions.push(`<button class="btn btn--ghost" data-action="report">⚠ Reportar problema</button>`);
    }

    if (!actions.length) return "";
    return `<div class="action-bar">${actions.join("")}</div>`;
  }

  function bindRentalActions(rental) {
    UI.$$("[data-action]").forEach(btn => {
      const action = btn.dataset.action;
      btn.addEventListener("click", () => {
        if (action === "checkin-owner") openCheckinOwnerModal(rental);
        else if (action === "checkin-renter") openCheckinRenterModal(rental);
        else if (action === "checkin-show-code") openShowCodeModal(rental);
        else if (action === "checkout") openCheckoutModal(rental);
        else if (action === "review") openReviewModal(rental);
        else if (action === "report") openReportModal(rental);
      });
    });
  }

  // --- US6.1 — Proprietário: regista evidências e gera o código ---
  function openCheckinOwnerModal(r) {
    UI.openModal({
      title: "Gerar código de levantamento (UC-06)",
      body: `
        <p class="text-small text-muted">No encontro físico, registe o estado da ferramenta. É obrigatório carregar pelo menos ${Rentals.MIN_CHECKIN_PHOTOS} fotografias de evidência (Regra 1). Em seguida é gerado um código de uso único, válido durante ${Rentals.PAIRING_TTL_MIN} minutos, que o arrendatário deverá inserir no dispositivo dele.</p>
        <div class="card" style="padding:14px;background:var(--c-surface-2);margin-bottom:14px">
          <p class="text-small mt-0" style="margin-bottom:8px"><strong>📷 Fotografias de evidência</strong></p>
          <div id="photoSlots" class="flex flex--wrap" style="gap:8px">
            ${[1,2,3].map(i => `<button type="button" class="btn btn--ghost btn--sm photo-slot" data-i="${i}">+ Foto ${i}</button>`).join("")}
          </div>
          <p class="text-small text-muted" style="margin:8px 0 0">Fotos registadas: <strong id="photoCount">0</strong> / ${Rentals.MIN_CHECKIN_PHOTOS} (simulação)</p>
        </div>
        <label class="field">
          <span class="field__label">Notas (opcional)</span>
          <textarea name="notes" class="textarea" placeholder="Ex.: ferramenta em bom estado, sem riscos visíveis."></textarea>
        </label>
      `,
      foot: `
        <button class="btn btn--ghost" data-close-modal>Cancelar</button>
        <button class="btn btn--primary" id="genCode" disabled>Gerar código</button>
      `
    });

    let photos = 0;
    const countEl = UI.$("#photoCount");
    const genBtn = UI.$("#genCode");
    UI.$$(".photo-slot").forEach(slot => {
      slot.addEventListener("click", () => {
        if (slot.dataset.done) return;
        slot.dataset.done = "1";
        slot.textContent = "✓ Foto " + slot.dataset.i;
        slot.classList.add("btn--primary");
        slot.classList.remove("btn--ghost");
        photos++;
        countEl.textContent = photos;
        if (photos >= Rentals.MIN_CHECKIN_PHOTOS) genBtn.disabled = false;
      });
    });

    genBtn.addEventListener("click", () => {
      const notes = UI.$("textarea[name='notes']").value;
      const res = Rentals.generatePairing({ rentalId: r.id, photos, notes });
      if (!res.ok) { UI.toast(res.error, "bad"); return; }
      UI.closeModal();
      openShowCodeModal(Rentals.byId(r.id));
      UI.toast("Código gerado. Partilhe-o presencialmente com o arrendatário.", "good");
    });
  }

  // --- US6.1 — Proprietário: rever o código já gerado ---
  function openShowCodeModal(r) {
    const ck = r.checkin || {};
    const expMs = ck.codeExpiresAt ? new Date(ck.codeExpiresAt).getTime() : 0;
    UI.openModal({
      title: "Código de levantamento",
      body: `
        <p class="text-small text-muted">Mostre este código ao arrendatário. Ele deve inseri-lo no dispositivo dele para concluir o check-in. O código é de uso único.</p>
        <div class="text-center" style="padding:18px 0">
          <div style="font-family:var(--f-display);font-size:2.8rem;font-weight:800;letter-spacing:.3em;color:var(--c-accent-deep)">${UI.esc(ck.code || "------")}</div>
          <p class="text-small" id="ttlLine" style="color:var(--c-muted);margin-top:8px"></p>
        </div>
      `,
      foot: `<button class="btn btn--primary" data-close-modal>Fechar</button>`
    });
    const ttlLine = UI.$("#ttlLine");
    function tick() {
      const left = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
      if (left <= 0) { ttlLine.textContent = "⚠ Código expirado. Gere um novo."; ttlLine.style.color = "var(--c-bad)"; return; }
      const m = String(Math.floor(left / 60)).padStart(2, "0");
      const s = String(left % 60).padStart(2, "0");
      ttlLine.textContent = `Válido por mais ${m}:${s}`;
      setTimeout(tick, 1000);
    }
    tick();
  }

  // --- US6.1 — Arrendatário: insere o código recebido ---
  function openCheckinRenterModal(r) {
    UI.openModal({
      title: "Inserir código de levantamento (UC-06)",
      body: `
        <p class="text-small text-muted">Insira o código de 6 dígitos que o proprietário lhe forneceu no momento da entrega. Ao validar, o aluguer fica ativo (sincronização bilateral — Regra 4).</p>
        <label class="field">
          <span class="field__label">Código de levantamento</span>
          <input name="code" class="input" inputmode="numeric" maxlength="6" placeholder="000000" style="font-size:1.4rem;letter-spacing:.4em;text-align:center" />
        </label>
      `,
      foot: `
        <button class="btn btn--ghost" data-close-modal>Cancelar</button>
        <button class="btn btn--primary" id="validateCode">Validar e ativar</button>
      `
    });
    const input = UI.$("input[name='code']");
    input.focus();
    UI.$("#validateCode").addEventListener("click", () => {
      const code = input.value;
      if (!/^\d{6}$/.test(code.trim())) { UI.toast("O código tem 6 dígitos.", "warn"); return; }
      const res = Rentals.validatePairing({ rentalId: r.id, code });
      if (!res.ok) { UI.toast(res.error, "bad"); return; }
      UI.closeModal();
      UI.toast("Check-in concluído — aluguer ativo!", "good");
      Router.resolve();
    });
  }

  function openCheckoutModal(r) {
    UI.openModal({
      title: "Confirmar devolução (UC-08)",
      body: `
        <p class="text-small text-muted">Após a inspeção física, registe a prova fotográfica e o resultado. É obrigatório submeter pelo menos ${Rentals.MIN_CHECKOUT_PHOTOS} fotografias.</p>
        <div class="card" style="padding:14px;background:var(--c-surface-2);margin-bottom:14px">
          <p class="text-small mt-0" style="margin-bottom:8px"><strong>📷 Fotografias de prova</strong></p>
          <div class="flex flex--wrap" style="gap:8px">
            ${[1,2,3].map(i => `<button type="button" class="btn btn--ghost btn--sm photo-slot" data-i="${i}">+ Foto ${i}</button>`).join("")}
          </div>
          <p class="text-small text-muted" style="margin:8px 0 0">Fotos registadas: <strong id="coPhotoCount">0</strong> / ${Rentals.MIN_CHECKOUT_PHOTOS} (simulação)</p>
        </div>
        <label class="field" style="flex-direction:row;align-items:flex-start;gap:10px;padding:10px;border:1px solid var(--c-line);border-radius:8px">
          <input type="radio" name="result" value="ok" checked />
          <span>
            <strong>Sem ocorrências</strong><br/>
            <small class="text-muted">Liberta a caução ao arrendatário e paga o aluguer ao proprietário (BR-03).</small>
          </span>
        </label>
        <label class="field" style="flex-direction:row;align-items:flex-start;gap:10px;padding:10px;border:1px solid var(--c-line);border-radius:8px">
          <input type="radio" name="result" value="issues" />
          <span>
            <strong>Com ocorrências</strong><br/>
            <small class="text-muted">Abre disputa para mediação pelo administrador e congela pagamentos.</small>
          </span>
        </label>
        <label class="field">
          <span class="field__label">Notas</span>
          <textarea name="notes" class="textarea" placeholder="Descreva o estado da ferramenta (obrigatório se houver ocorrências)."></textarea>
        </label>
      `,
      foot: `
        <button class="btn btn--ghost" data-close-modal>Cancelar</button>
        <button class="btn btn--primary" id="confirmCheckout" disabled>Confirmar devolução</button>
      `
    });

    let photos = 0;
    const countEl = UI.$("#coPhotoCount");
    const confirmBtn = UI.$("#confirmCheckout");
    UI.$$(".photo-slot").forEach(slot => {
      slot.addEventListener("click", () => {
        if (slot.dataset.done) return;
        slot.dataset.done = "1";
        slot.textContent = "✓ Foto " + slot.dataset.i;
        slot.classList.add("btn--primary");
        slot.classList.remove("btn--ghost");
        photos++;
        countEl.textContent = photos;
        if (photos >= Rentals.MIN_CHECKOUT_PHOTOS) confirmBtn.disabled = false;
      });
    });

    confirmBtn.addEventListener("click", () => {
      const hasIssues = UI.$("input[name='result']:checked").value === "issues";
      const notes = UI.$("textarea[name='notes']").value;
      if (hasIssues && notes.trim().length < 5) { UI.toast("Descreva as ocorrências antes de submeter.", "warn"); return; }
      const res = Rentals.checkOut({ rentalId: r.id, hasIssues, notes, photos });
      if (!res.ok) { UI.toast(res.error, "bad"); return; }
      UI.closeModal();
      UI.toast(hasIssues ? "Devolução com ocorrências — aluguer em disputa." : "Devolução confirmada. Pagamento libertado!", hasIssues ? "warn" : "good");
      Router.resolve();
    });
  }

  function openReviewModal(r) {
    UI.openModal({
      title: "Avaliar experiência (UC-09)",
      body: `
        <p class="text-small text-muted">A sua avaliação só fica visível quando a contraparte também avaliar (ou após 14 dias). Política BR-06.</p>
        <div class="field">
          <span class="field__label">Classificação</span>
          <div id="starsPick" style="font-size:2rem;letter-spacing:6px;cursor:pointer;color:var(--c-line)" role="radiogroup" aria-label="Classificação">
            ${[1,2,3,4,5].map(i => `<span data-star="${i}" role="radio" aria-label="${i} estrelas" tabindex="0">★</span>`).join("")}
          </div>
          <input type="hidden" name="stars" id="starsValue" value="0" />
        </div>
        <label class="field">
          <span class="field__label">Comentário (opcional, ≤ 500 caracteres)</span>
          <textarea name="comment" class="textarea" maxlength="500" placeholder="Como correu a experiência?"></textarea>
        </label>
      `,
      foot: `
        <button class="btn btn--ghost" data-close-modal>Cancelar</button>
        <button class="btn btn--primary" id="submitReview">Submeter</button>
      `
    });

    let chosen = 0;
    const stars = UI.$$("#starsPick [data-star]");
    function paint(n) {
      stars.forEach(s => {
        s.style.color = parseInt(s.dataset.star) <= n ? "var(--c-accent)" : "var(--c-line)";
      });
    }
    stars.forEach(s => {
      s.addEventListener("mouseenter", () => paint(parseInt(s.dataset.star)));
      s.addEventListener("mouseleave", () => paint(chosen));
      s.addEventListener("click", () => { chosen = parseInt(s.dataset.star); UI.$("#starsValue").value = chosen; paint(chosen); });
    });

    UI.$("#submitReview").addEventListener("click", () => {
      const stars = parseInt(UI.$("#starsValue").value) || 0;
      if (stars < 1) { UI.toast("Indique uma classificação de 1 a 5 estrelas.", "warn"); return; }
      const comment = UI.$("textarea[name='comment']").value;
      const res = Rentals.review({ rentalId: r.id, stars, comment });
      UI.closeModal();
      if (!res.ok) { UI.toast(res.error, "bad"); return; }
      UI.toast("Avaliação submetida. Obrigado pelo feedback!", "good");
      Router.resolve();
    });
  }

  function openReportModal(r) {
    const tool = Catalog.byId(r.toolId);
    const value = tool ? (tool.marketValue || tool.deposit || 0) : 0;
    UI.openModal({
      title: "Reportar problema (UC-10)",
      body: `
        <label class="field">
          <span class="field__label">Tipo de incidente</span>
          <select name="type" class="select">
            <option value="DANO">Dano na ferramenta</option>
            <option value="ATRASO">Atraso na devolução</option>
            <option value="FURTO">Furto / desaparecimento</option>
            <option value="OUTRO">Outro</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Descrição</span>
          <textarea name="notes" class="textarea" placeholder="Descreva o sucedido com o máximo de detalhe possível." required></textarea>
        </label>

        <div id="furtoBlock" class="card" style="display:none;padding:12px;background:var(--c-surface-2);margin-bottom:12px">
          <p class="text-small mt-0" style="margin-bottom:8px"><strong>📄 Queixa policial (obrigatória para furto)</strong></p>
          <button type="button" class="btn btn--ghost btn--sm" id="policeUpload">+ Anexar queixa policial</button>
          <span id="policeOk" class="badge badge--good" style="display:none;margin-left:8px">✓ Documento anexado</span>
        </div>

        <p id="insuranceNote" class="text-small" style="display:none;color:var(--c-accent-deep)"></p>
        <p class="text-small text-muted">O administrador será notificado para mediação. Enquanto o ticket estiver em análise, o aluguer fica em estado "Em disputa".</p>
      `,
      foot: `
        <button class="btn btn--ghost" data-close-modal>Cancelar</button>
        <button class="btn btn--danger" id="submitReport">Reportar</button>
      `
    });

    const typeSel = UI.$("select[name='type']");
    const furtoBlock = UI.$("#furtoBlock");
    const insuranceNote = UI.$("#insuranceNote");
    let policeAttached = false;

    UI.$("#policeUpload").addEventListener("click", () => {
      policeAttached = true;
      UI.$("#policeOk").style.display = "inline-flex";
      UI.$("#policeUpload").disabled = true;
    });

    function refreshType() {
      const t = typeSel.value;
      furtoBlock.style.display = (t === "FURTO") ? "block" : "none";
      if (t === "DANO" && value >= Rentals.INSURANCE_THRESHOLD) {
        insuranceNote.style.display = "block";
        insuranceNote.textContent = `ℹ Valor de mercado ${UI.money(value)} ≥ ${Rentals.INSURANCE_THRESHOLD}€: a seguradora será acionada e os pagamentos congelados (BR-07).`;
      } else if (t === "FURTO") {
        insuranceNote.style.display = "block";
        insuranceNote.textContent = "ℹ Furto aciona automaticamente a seguradora e congela os pagamentos (BR-07).";
      } else {
        insuranceNote.style.display = "none";
      }
    }
    typeSel.addEventListener("change", refreshType);
    refreshType();

    UI.$("#submitReport").addEventListener("click", () => {
      const type = typeSel.value;
      const notes = UI.$("textarea[name='notes']").value;
      if (notes.trim().length < 10) { UI.toast("Descreva o incidente com mais detalhe.", "warn"); return; }
      if (type === "FURTO" && !policeAttached) { UI.toast("Anexe a queixa policial para reportar um furto.", "warn"); return; }
      const res = Rentals.report({ rentalId: r.id, type, notes, policeReportAttached: policeAttached, marketValue: value });
      UI.closeModal();
      if (!res.ok) { UI.toast(res.error, "bad"); return; }
      if (res.insuranceTriggered) UI.toast("Sinistro reportado — seguradora notificada e pagamentos congelados.", "warn");
      else UI.toast("Problema reportado. O administrador foi notificado.", "info");
      Router.resolve();
    });
  }

  function renderReviews(r) {
    if (!r.reviewByOwner && !r.reviewByRenter) {
      if (r.state === "FINALIZADO") {
        return `<h3 class="mt-4">Avaliações</h3>
                <p class="text-muted text-small">Ainda sem avaliações submetidas.</p>`;
      }
      return "";
    }
    const reviews = [];
    if (r.reviewByOwner && !r.reviewByOwner.hidden) reviews.push({ ...r.reviewByOwner, who: "Proprietário" });
    if (r.reviewByRenter && !r.reviewByRenter.hidden) reviews.push({ ...r.reviewByRenter, who: "Arrendatário" });

    if (!reviews.length) {
      // Avaliação(ões) ainda oculta(s) pela regra double-blind — mostrar prazo.
      const base = r.finalizedAt || (r.checkout && r.checkout.at);
      let daysLeftMsg = "";
      if (base) {
        const ageDays = (Date.now() - new Date(base).getTime()) / 86400000;
        const left = Math.max(0, Math.ceil(Rentals.REVIEW_BLIND_DAYS - ageDays));
        daysLeftMsg = left > 0
          ? ` Será publicada automaticamente em ${left} dia(s), ou assim que a contraparte avaliar.`
          : " O prazo expirou — atualize a página para publicar.";
      }
      return `<h3 class="mt-4">Avaliações</h3>
              <div class="card" style="padding:14px;background:var(--c-surface-2)">
                <p class="text-small mt-0" style="margin-bottom:0">🔒 <strong>Avaliação oculta (double-blind, BR-06).</strong>${daysLeftMsg}</p>
              </div>`;
    }

    // Indica se ainda falta uma das partes (a outra ficou oculta)
    const pendingOther =
      (r.reviewByOwner && r.reviewByOwner.hidden) || (r.reviewByRenter && r.reviewByRenter.hidden);

    return `
      <h3 class="mt-4">Avaliações</h3>
      ${reviews.map(rv => `
        <div class="card" style="padding:14px;margin-bottom:10px">
          <div class="flex--between">
            <strong>${rv.who}</strong>
            ${UI.starsHTML(rv.stars)}
          </div>
          ${rv.comment ? `<p class="text-small mt-2" style="margin-bottom:0">${UI.esc(rv.comment)}</p>` : ""}
          <small class="text-muted">${UI.dateTime(rv.at)}</small>
        </div>
      `).join("")}
      ${pendingOther ? `<p class="text-muted text-small">A avaliação da outra parte continua oculta até esta ser publicada (BR-06).</p>` : ""}
    `;
  }

  // ============================================================
  // VIEW: MENSAGENS (UC-04)
  // ============================================================
  function renderMessages(view, threadId) {
    if (!Auth.isLogged()) { Router.go("/login"); return; }

    const threads = Messages.ofCurrent();
    const activeId = threadId || (threads[0] && threads[0].id);
    const active = activeId ? Messages.byId(activeId) : null;

    view.innerHTML = `
      <section class="container">
        <p class="section-eyebrow">UC-04 · Contactar o proprietário</p>
        <h1>Mensagens</h1>
        ${threads.length === 0 ? `
          <div class="empty">
            <h3>Sem conversas</h3>
            <p>Para iniciar uma conversa, abra a ficha de uma ferramenta e clique em "Contactar o proprietário".</p>
            <a href="#/" class="btn btn--primary mt-3">Pesquisar ferramentas</a>
          </div>
        ` : `
          <div class="chat">
            <div class="chat__threads">
              ${threads.map(t => threadItem(t, activeId)).join("")}
            </div>
            <div class="chat__panel">
              ${active ? threadView(active) : `<div class="empty" style="padding:80px 20px"><p>Selecione uma conversa.</p></div>`}
            </div>
          </div>
        `}
      </section>
    `;

    // Mudar de thread
    UI.$$(".chat__thread").forEach(btn => {
      btn.addEventListener("click", () => Router.go("/mensagens/" + btn.dataset.threadId));
    });

    if (active) {
      const form = UI.$("#chatForm");
      const messages = UI.$("#chatMessages");
      if (messages) messages.scrollTop = messages.scrollHeight;

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = UI.$("input[name='text']", form).value;
        const res = Messages.send({ threadId: active.id, text });
        if (!res.ok) { UI.toast(res.error, "bad"); return; }
        if (res.warning) UI.toast(res.warning, "warn", 5000);
        UI.$("input[name='text']", form).value = "";
        Router.resolve();
      });
    }
  }

  function threadItem(t, activeId) {
    const counterpart = Messages.counterpart(t);
    const tool = Catalog.byId(t.toolId);
    const last = t.messages[t.messages.length - 1];
    return `
      <button class="chat__thread ${t.id === activeId ? "is-active" : ""}" data-thread-id="${UI.esc(t.id)}">
        <span class="avatar">${UI.esc(UI.initials(counterpart ? counterpart.name : "?"))}</span>
        <div>
          <div class="chat__thread-name">${UI.esc(counterpart ? counterpart.name : "—")}</div>
          <div class="chat__thread-last">${last ? UI.esc(last.text.slice(0, 40)) : `(sobre ${UI.esc(tool ? tool.title : "ferramenta")})`}</div>
        </div>
      </button>
    `;
  }

  function threadView(t) {
    const counterpart = Messages.counterpart(t);
    const tool = Catalog.byId(t.toolId);
    const me = Auth.current();
    return `
      <div class="chat__head">
        <span class="avatar">${UI.esc(UI.initials(counterpart ? counterpart.name : "?"))}</span>
        <div>
          <div style="font-weight:600">${UI.esc(counterpart ? counterpart.name : "—")}</div>
          ${tool ? `<div class="text-small text-muted">sobre <a href="#/ferramenta/${UI.esc(tool.id)}">${UI.esc(tool.title)}</a></div>` : ""}
        </div>
      </div>
      <div class="chat__messages" id="chatMessages">
        <div class="bubble bubble--warn">⚠ Aviso BR-08: a partilha de contactos externos (telefone, email, links) é automaticamente removida para sua proteção.</div>
        ${t.messages.length === 0 ? `<p class="text-muted text-center text-small">Inicie a conversa abaixo.</p>` : ""}
        ${t.messages.map(m => `
          <div class="bubble ${m.from === me.id ? "bubble--mine" : ""}">
            ${UI.esc(m.text)}
            <span class="bubble__time">${UI.timeAgo(m.at)}</span>
          </div>
        `).join("")}
      </div>
      <form class="chat__input" id="chatForm" autocomplete="off">
        <input type="text" name="text" class="input" placeholder="Escreva uma mensagem..." required />
        <button type="submit" class="btn btn--primary">Enviar</button>
      </form>
    `;
  }

  // ============================================================
  // BOOTSTRAP
  // ============================================================
  function init() {
    // Aplica seed se for o primeiro arranque
    const seeded = Seed.applyIfEmpty();
    if (seeded) {
      console.info("[Rent-a-Tool] Catálogo de demonstração carregado.");
    }

    // Aplica a regra double-blind dos 14 dias a avaliações cujo prazo
    // tenha expirado desde a última visita (BR-06).
    Rentals.settleAllReviews();

    // Regista rotas
    Router.on(/^\/$/,                        (view)       => renderHome(view));
    Router.on(/^\/ferramenta\/(.+)$/,        (view, id)   => renderToolDetail(view, id));
    Router.on(/^\/registo$/,                 (view)       => renderRegister(view));
    Router.on(/^\/login$/,                   (view)       => renderLogin(view));
    Router.on(/^\/meus-alugueres$/,          (view)       => renderMyRentals(view));
    Router.on(/^\/aluguer\/(.+)$/,           (view, id)   => renderRentalDetail(view, id));
    Router.on(/^\/mensagens$/,               (view)       => renderMessages(view));
    Router.on(/^\/mensagens\/(.+)$/,         (view, tid)  => renderMessages(view, tid));

    refresh();
    Router.resolve();
  }

  /** Re-renderiza a barra superior e a rota corrente. */
  function refresh() {
    renderUserbox();
    refreshMsgBadge();
  }

  return { init, refresh };
})();

// Arrancar quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", App.init);
} else {
  App.init();
}
