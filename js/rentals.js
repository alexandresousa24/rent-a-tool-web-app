/* =============================================================
   rentals.js — UC-06, UC-07, UC-08, UC-09, UC-10
   ============================================================= */

const Rentals = (() => {

  /** Lê todos os alugueres em que o utilizador atual é parte. */
  function ofCurrent() {
    const me = Auth.current();
    if (!me) return [];
    const all = Storage.read("rentals", []);
    return all.filter(r => r.renterId === me.id || r.ownerId === me.id);
  }

  function byId(id) {
    return (Storage.read("rentals", []) || []).find(r => r.id === id) || null;
  }

  function persist(rental) {
    const all = Storage.read("rentals", []);
    const idx = all.findIndex(r => r.id === rental.id);
    if (idx >= 0) all[idx] = rental;
    else all.push(rental);
    Storage.write("rentals", all);
  }

  /** Agrupa pelos buckets do UC-07: ATIVOS / PRÓXIMOS / HISTÓRICO / EM_DISPUTA. */
  function groupForUser() {
    const rs = ofCurrent();
    return {
      ATIVOS:     rs.filter(r => r.state === "ATIVO"),
      PROXIMOS:   rs.filter(r => r.state === "CONFIRMADO" || r.state === "PENDENTE"),
      HISTORICO:  rs.filter(r => r.state === "FINALIZADO" || r.state === "CANCELADO"),
      EM_DISPUTA: rs.filter(r => r.state === "EM_DISPUTA")
    };
  }

  /** Retorna o papel do utilizador atual neste aluguer ("renter" / "owner" / null). */
  function roleOf(rental) {
    const me = Auth.current();
    if (!me || !rental) return null;
    if (rental.renterId === me.id) return "renter";
    if (rental.ownerId === me.id) return "owner";
    return null;
  }

  /** Texto humano para um estado. */
  function stateLabel(state) {
    return {
      "CONFIRMADO":  "Confirmado",
      "PENDENTE":    "Pendente",
      "ATIVO":       "Em curso",
      "FINALIZADO":  "Finalizado",
      "EM_DISPUTA":  "Em disputa",
      "CANCELADO":   "Cancelado"
    }[state] || state;
  }

  /** Classe do badge consoante o estado. */
  function stateBadgeClass(state) {
    return {
      "CONFIRMADO":  "badge--accent",
      "PENDENTE":    "badge--warn",
      "ATIVO":       "badge--good",
      "FINALIZADO":  "badge--info",
      "EM_DISPUTA":  "badge--bad",
      "CANCELADO":   "badge--bad"
    }[state] || "";
  }

  // ------------------------------------------------------------
  // UC-06 — Check-in (US6.1) — com Código de Pairing
  // ------------------------------------------------------------
  // Fluxo fiel ao backlog:
  //   Regra 1: o PROPRIETÁRIO carrega ≥ 3 fotografias de evidência
  //            e GERA um Código de Pairing de uso único.
  //   Regra 2: o código tem validade de 15 minutos.
  //   Regra 3: o ARRENDATÁRIO insere o código no seu dispositivo.
  //   Regra 4: o estado só transita para ATIVO após a sincronização
  //            bilateral (proprietário gera + arrendatário valida).
  //   Regra 5 (BR-05, janela de 2h): documentada; nesta demo não
  //            bloqueamos por hora agendada por não termos agendamento
  //            de hora, apenas datas.

  const PAIRING_TTL_MIN = 15;          // validade do código (minutos)
  const MIN_CHECKIN_PHOTOS = 3;        // Regra 1 — evidência fotográfica

  /** Gera um código de pairing de 6 dígitos. */
  function genPairingCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  /**
   * Passo do PROPRIETÁRIO: regista evidências (≥3 fotos) e gera o
   * código de pairing de uso único, válido por 15 minutos.
   */
  function generatePairing({ rentalId, photos, notes }) {
    const r = byId(rentalId);
    if (!r) return { ok: false, error: "Aluguer não encontrado." };
    if (r.state !== "CONFIRMADO" && r.state !== "PENDENTE") {
      return { ok: false, error: "Este aluguer não está em estado de check-in." };
    }
    if (roleOf(r) !== "owner") {
      return { ok: false, error: "Apenas o proprietário gera o código de levantamento." };
    }
    const nPhotos = Number(photos) || 0;
    if (nPhotos < MIN_CHECKIN_PHOTOS) {
      return { ok: false, error: `É obrigatório registar pelo menos ${MIN_CHECKIN_PHOTOS} fotografias (Regra 1).` };
    }

    const now = Date.now();
    const code = genPairingCode();
    r.checkin = {
      ownerConfirmed: true,
      renterConfirmed: false,
      photos: nPhotos,
      notes: notes || "",
      code,
      codeIssuedAt: new Date(now).toISOString(),
      codeExpiresAt: new Date(now + PAIRING_TTL_MIN * 60000).toISOString(),
      at: null
    };
    r.timeline.push({ state: r.state, at: new Date(now).toISOString(),
      label: `Proprietário registou evidências e gerou o código de levantamento (válido ${PAIRING_TTL_MIN} min)` });

    persist(r);
    return { ok: true, rental: r, code, expiresAt: r.checkin.codeExpiresAt };
  }

  /**
   * Passo do ARRENDATÁRIO: insere o código recebido. Se for válido e
   * estiver dentro da janela de 15 min, sincroniza e o aluguer fica ATIVO.
   */
  function validatePairing({ rentalId, code }) {
    const r = byId(rentalId);
    if (!r) return { ok: false, error: "Aluguer não encontrado." };
    if (roleOf(r) !== "renter") {
      return { ok: false, error: "Apenas o arrendatário valida o código." };
    }
    if (!r.checkin || !r.checkin.code) {
      return { ok: false, error: "O proprietário ainda não gerou o código de levantamento." };
    }
    if (r.checkin.renterConfirmed) {
      return { ok: false, error: "Este levantamento já foi validado." };
    }
    // Validade de 15 minutos (Regra 2)
    if (Date.now() > new Date(r.checkin.codeExpiresAt).getTime()) {
      return { ok: false, error: "O código expirou. Peça ao proprietário para gerar um novo." };
    }
    // Código de uso único (Regra 3)
    if (String(code).trim() !== r.checkin.code) {
      return { ok: false, error: "Código incorreto. Verifique os 6 dígitos." };
    }

    // Sincronização bilateral concluída (Regra 4)
    r.checkin.renterConfirmed = true;
    r.checkin.at = new Date().toISOString();
    r.state = "ATIVO";
    r.timeline.push({ state: "ATIVO", at: r.checkin.at,
      label: "Arrendatário validou o código — check-in bilateral concluído, aluguer ativo" });

    persist(r);
    return { ok: true, rental: r };
  }

  /** Estado legível do check-in para a UI. */
  function checkinStage(r) {
    const ck = r.checkin;
    if (!ck || !ck.code) return "AWAIT_OWNER";        // proprietário ainda não gerou
    if (!ck.renterConfirmed) {
      const expired = Date.now() > new Date(ck.codeExpiresAt).getTime();
      return expired ? "EXPIRED" : "AWAIT_RENTER";    // aguarda validação do arrendatário
    }
    return "DONE";
  }

  // ------------------------------------------------------------
  // UC-08 — Check-out (devolução)
  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // UC-08 — Check-out / Devolução (US8.1)
  // ------------------------------------------------------------
  // O proprietário confirma a devolução após inspeção física.
  //   - Deve submeter ≥ 3 fotografias de prova (evidência).
  //   - "Sem ocorrências": aluguer → FINALIZADO; liberta o pagamento
  //     ao proprietário e a caução ao arrendatário (BR-03).
  //   - "Com ocorrências": abre sinistro (UC-10) e passa a EM_DISPUTA.
  const MIN_CHECKOUT_PHOTOS = 3;

  function checkOut({ rentalId, hasIssues, notes, photos }) {
    const r = byId(rentalId);
    if (!r) return { ok: false, error: "Aluguer não encontrado." };
    if (r.state !== "ATIVO") return { ok: false, error: "O aluguer não está ATIVO." };
    if (roleOf(r) !== "owner") {
      return { ok: false, error: "Apenas o proprietário pode confirmar a devolução." };
    }
    const nPhotos = Number(photos) || 0;
    if (nPhotos < MIN_CHECKOUT_PHOTOS) {
      return { ok: false, error: `É obrigatório submeter pelo menos ${MIN_CHECKOUT_PHOTOS} fotografias de prova.` };
    }

    r.checkout = {
      at: new Date().toISOString(),
      hasIssues: !!hasIssues,
      notes: notes || "",
      photos: nPhotos
    };

    if (hasIssues) {
      r.state = "EM_DISPUTA";
      r.paymentState = "FROZEN";
      r.timeline.push({ state: "EM_DISPUTA", at: r.checkout.at,
        label: "Devolução com ocorrências — sinistro aberto, pagamentos congelados" });
      const reports = Storage.read("reports", []);
      reports.push({
        id: Storage.uid("rep"),
        rentalId: r.id,
        type: "DANO",
        notes: notes || "",
        reporterId: Auth.current()?.id,
        createdAt: r.checkout.at,
        state: "PENDENTE_ANALISE"
      });
      Storage.write("reports", reports);
    } else {
      r.state = "FINALIZADO";
      r.paymentState = "RELEASED";
      r.finalizedAt = r.checkout.at;        // marca o início da janela de 14 dias (BR-06)
      r.timeline.push({ state: "FINALIZADO", at: r.checkout.at,
        label: "Devolução sem ocorrências — pagamento libertado ao proprietário e caução ao arrendatário (BR-03)" });
    }

    persist(r);
    return { ok: true, rental: r };
  }

  // ------------------------------------------------------------
  // UC-09 — Avaliar experiência (US9.1) — Double-Blind + 14 dias
  // ------------------------------------------------------------
  // Regra (BR-06): a avaliação de cada parte permanece OCULTA para a
  // contraparte até que:
  //   (a) ambas as partes tenham avaliado, OU
  //   (b) tenham decorrido 14 dias desde a finalização do aluguer.
  // Só nesse momento as avaliações são publicadas e a média de cada
  // utilizador avaliado é recalculada (uma única vez por avaliação).
  const REVIEW_BLIND_DAYS = 14;

  function review({ rentalId, stars, comment }) {
    const r = byId(rentalId);
    if (!r) return { ok: false, error: "Aluguer não encontrado." };
    if (r.state !== "FINALIZADO") return { ok: false, error: "Só é possível avaliar alugueres finalizados." };
    if (!stars || stars < 1 || stars > 5) return { ok: false, error: "Indique uma classificação entre 1 e 5." };

    const role = roleOf(r);
    if (!role) return { ok: false, error: "Acesso não autorizado." };

    const at = new Date().toISOString();
    if (role === "renter") {
      if (r.reviewByRenter) return { ok: false, error: "Já submeteu uma avaliação para este aluguer." };
      r.reviewByRenter = { stars, comment: (comment || "").slice(0, 500), at, hidden: true, published: false };
    } else {
      if (r.reviewByOwner) return { ok: false, error: "Já submeteu uma avaliação para este aluguer." };
      r.reviewByOwner = { stars, comment: (comment || "").slice(0, 500), at, hidden: true, published: false };
    }

    r.timeline.push({ state: r.state, at,
      label: `Avaliação submetida pelo ${role === "owner" ? "proprietário" : "arrendatário"} (oculta até ambos avaliarem ou ${REVIEW_BLIND_DAYS} dias)` });

    // Tenta publicar já (caso ambos tenham agora avaliado).
    settleReviews(r);
    persist(r);
    return { ok: true, rental: r };
  }

  /**
   * Aplica a regra double-blind a um aluguer: publica as avaliações
   * existentes se ambos avaliaram OU se passaram 14 dias da finalização.
   * Atualiza a média do avaliado uma única vez por avaliação (published).
   * Devolve true se houve alguma alteração.
   */
  function settleReviews(r) {
    if (r.state !== "FINALIZADO") return false;
    const bothReviewed = !!(r.reviewByRenter && r.reviewByOwner);
    const base = r.finalizedAt || (r.checkout && r.checkout.at);
    let deadlinePassed = false;
    if (base) {
      const ageDays = (Date.now() - new Date(base).getTime()) / 86400000;
      deadlinePassed = ageDays >= REVIEW_BLIND_DAYS;
    }
    if (!bothReviewed && !deadlinePassed) return false;

    let changed = false;
    // Avaliação do arrendatário (sobre o proprietário)
    if (r.reviewByRenter && !r.reviewByRenter.published) {
      r.reviewByRenter.hidden = false;
      r.reviewByRenter.published = true;
      updateUserRating(r.ownerId, r.reviewByRenter.stars);
      changed = true;
    }
    // Avaliação do proprietário (sobre o arrendatário)
    if (r.reviewByOwner && !r.reviewByOwner.published) {
      r.reviewByOwner.hidden = false;
      r.reviewByOwner.published = true;
      updateUserRating(r.renterId, r.reviewByOwner.stars);
      changed = true;
    }
    return changed;
  }

  /**
   * Varre todos os alugueres e liquida avaliações cujo prazo expirou.
   * Deve ser chamada no arranque da app (ver app.js) para garantir que
   * a regra dos 14 dias é aplicada mesmo sem nova avaliação.
   */
  function settleAllReviews() {
    const all = Storage.read("rentals", []);
    let anyChange = false;
    all.forEach(r => {
      const before = JSON.stringify([r.reviewByRenter, r.reviewByOwner]);
      if (settleReviews(r)) {
        const idx = all.findIndex(x => x.id === r.id);
        if (idx >= 0) all[idx] = r;
        anyChange = anyChange || (before !== JSON.stringify([r.reviewByRenter, r.reviewByOwner]));
      }
    });
    if (anyChange) Storage.write("rentals", all);
    return anyChange;
  }

  function updateUserRating(userId, newStars) {
    const users = Storage.read("users", []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return;
    const u = users[idx];
    const oldCount = u.ratingCount || 0;
    const oldRating = u.rating || 0;
    const newCount = oldCount + 1;
    const newRating = +((oldRating * oldCount + newStars) / newCount).toFixed(2);
    u.ratingCount = newCount;
    u.rating = newRating;
    users[idx] = u;
    Storage.write("users", users);
  }

  // ------------------------------------------------------------
  // UC-10 — Reportar problema (US10.1)
  // ------------------------------------------------------------
  // Regras do backlog:
  //   - DANO: se o valor de mercado da ferramenta ≥ 50€, aciona o
  //           seguro (BR-07) e congela os pagamentos; aluguer → EM_DISPUTA.
  //   - FURTO: exige o upload obrigatório da queixa policial; sem o
  //           documento, a submissão é impedida.
  const INSURANCE_THRESHOLD = 50;     // valor de mercado mínimo p/ seguro (€)

  function report({ rentalId, type, notes, policeReportAttached, marketValue }) {
    const r = byId(rentalId);
    if (!r) return { ok: false, error: "Aluguer não encontrado." };
    const me = Auth.current();
    if (!me || roleOf(r) === null) return { ok: false, error: "Acesso não autorizado." };

    type = type || "OUTRO";          // DANO | ATRASO | FURTO | OUTRO

    // FURTO exige queixa policial (Cenário 2)
    if (type === "FURTO" && !policeReportAttached) {
      return { ok: false, error: "Para reportar um furto é obrigatório anexar a queixa policial." };
    }

    // DANO com valor ≥ 50€ aciona seguradora (Cenário 1)
    const tool = (Storage.read("tools", []) || []).find(t => t.id === r.toolId);
    const value = (typeof marketValue === "number") ? marketValue : (tool ? (tool.marketValue || tool.deposit || 0) : 0);
    const insuranceTriggered = (type === "DANO" && value >= INSURANCE_THRESHOLD) || type === "FURTO";

    const reports = Storage.read("reports", []);
    const rep = {
      id: Storage.uid("rep"),
      rentalId: r.id,
      type,
      notes: (notes || "").slice(0, 800),
      reporterId: me.id,
      policeReportAttached: !!policeReportAttached,
      marketValue: value,
      insuranceTriggered,
      createdAt: new Date().toISOString(),
      state: "PENDENTE_ANALISE"
    };
    reports.push(rep);
    Storage.write("reports", reports);

    r.reports = r.reports || [];
    r.reports.push(rep.id);

    // Congela pagamentos e move para disputa nos casos relevantes
    const movesToDispute = insuranceTriggered || r.state === "ATIVO" || r.state === "CONFIRMADO";
    if (movesToDispute) {
      r.state = "EM_DISPUTA";
      if (insuranceTriggered) r.paymentState = "FROZEN";
      const extra = insuranceTriggered ? " — seguradora notificada e pagamentos congelados (BR-07)" : "";
      r.timeline.push({ state: "EM_DISPUTA", at: rep.createdAt,
        label: `Sinistro reportado (${rep.type})${extra}` });
    } else {
      r.timeline.push({ state: r.state, at: rep.createdAt,
        label: `Problema reportado (${rep.type})` });
    }
    persist(r);
    return { ok: true, report: rep, insuranceTriggered };
  }

  return {
    ofCurrent, byId, groupForUser, roleOf, stateLabel, stateBadgeClass,
    generatePairing, validatePairing, checkinStage,
    checkOut, review, report,
    settleReviews, settleAllReviews,
    PAIRING_TTL_MIN, MIN_CHECKIN_PHOTOS, MIN_CHECKOUT_PHOTOS,
    INSURANCE_THRESHOLD, REVIEW_BLIND_DAYS
  };
})();
