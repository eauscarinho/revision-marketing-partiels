const allQuestions = window.MARKETING_QUESTIONS;
const questions = allQuestions.filter((question) => question.type !== "open");
const revisionCards = window.REVISION_CARDS;

const els = {
  mode: document.querySelector("#mode"),
  theme: document.querySelector("#theme"),
  length: document.querySelector("#length"),
  lengthOutput: document.querySelector("#lengthOutput"),
  shuffle: document.querySelector("#shuffle"),
  startBtn: document.querySelector("#startBtn"),
  emptyState: document.querySelector("#emptyState"),
  questionCard: document.querySelector("#questionCard"),
  questionCounter: document.querySelector("#questionCounter"),
  questionTheme: document.querySelector("#questionTheme"),
  questionType: document.querySelector("#questionType"),
  progressBar: document.querySelector("#progressBar"),
  questionText: document.querySelector("#questionText"),
  answerInstruction: document.querySelector("#answerInstruction"),
  answerArea: document.querySelector("#answerArea"),
  hintBox: document.querySelector("#hintBox"),
  explanation: document.querySelector("#explanation"),
  hintBtn: document.querySelector("#hintBtn"),
  submitBtn: document.querySelector("#submitBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  score: document.querySelector("#score"),
  streak: document.querySelector("#streak"),
  accuracy: document.querySelector("#accuracy"),
  bestScore: document.querySelector("#bestScore"),
  rank: document.querySelector("#rank"),
  themeBars: document.querySelector("#themeBars"),
  revisionGrid: document.querySelector("#revisionGrid"),
  modeHelp: document.querySelector("#modeHelp"),
  progressOrb: document.querySelector("#progressOrb"),
  overallAccuracy: document.querySelector("#overallAccuracy"),
  trackingLevel: document.querySelector("#trackingLevel"),
  trackingHeadline: document.querySelector("#trackingHeadline"),
  trackingInsight: document.querySelector("#trackingInsight"),
  totalSessions: document.querySelector("#totalSessions"),
  totalAnswered: document.querySelector("#totalAnswered"),
  trackingBestScore: document.querySelector("#trackingBestScore"),
  priorityTheme: document.querySelector("#priorityTheme"),
  themeCoverage: document.querySelector("#themeCoverage"),
  trackingThemeList: document.querySelector("#trackingThemeList"),
  sessionCountLabel: document.querySelector("#sessionCountLabel"),
  sessionHistory: document.querySelector("#sessionHistory"),
  recommendations: document.querySelector("#recommendations"),
  resetProgressBtn: document.querySelector("#resetProgressBtn"),
};

const state = {
  deck: [],
  index: 0,
  score: 0,
  streak: 0,
  answered: 0,
  correct: 0,
  hintUsed: false,
  locked: false,
  selected: new Set(),
  themeStats: {},
  results: [],
  startedAt: 0,
  sessionMode: "complete",
  sessionTheme: "all",
  saved: false,
};

const bestKey = "marketing-revision-best-score";
const progressKey = "marketing-revision-progress-v1";
const themeNames = [...new Set(questions.map((question) => question.theme))];
let progressState = loadProgress();
els.bestScore.textContent = String(progressState.bestScore || localStorage.getItem(bestKey) || "0");
els.length.max = String(questions.length);

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(progressKey) || "{}");
    return {
      bestScore: Number(parsed.bestScore || 0),
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.slice(0, 50) : [],
    };
  } catch {
    return { bestScore: 0, sessions: [] };
  }
}

function saveProgress() {
  localStorage.setItem(progressKey, JSON.stringify(progressState));
  localStorage.setItem(bestKey, String(progressState.bestScore || 0));
}

function shuffleArray(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatType(type) {
  return {
    mcq: "QCM",
    multi: "Choix multiples",
    boolean: "Vrai / Faux",
  }[type];
}

function buildDeck() {
  const selectedTheme = els.theme.value;
  let pool = filteredPool();

  if (els.mode.value === "challenging") {
    pool = pool.filter((q) => q.type === "multi");
  }

  if (els.mode.value === "flash") {
    els.length.value = 10;
    els.lengthOutput.textContent = "10";
  }

  if (els.shuffle.checked) {
    pool = shuffleArray(pool);
  }

  if (els.mode.value === "complete") {
    return pool;
  }

  return pool.slice(0, Number(els.length.value));
}

function filteredPool() {
  const selectedTheme = els.theme.value;
  return selectedTheme === "all" ? [...questions] : questions.filter((q) => q.theme === selectedTheme);
}

function availablePoolForMode() {
  let pool = filteredPool();
  if (els.mode.value === "challenging") {
    pool = pool.filter((q) => q.type === "multi");
  }
  return pool;
}

function updateModeControls() {
  const available = availablePoolForMode().length;
  els.length.max = String(Math.max(5, available));

  if (els.mode.value === "complete") {
    els.length.disabled = true;
    els.lengthOutput.textContent = String(available);
    els.modeHelp.textContent = "Toutes les questions disponibles seront posees.";
    return;
  }

  if (els.mode.value === "flash") {
    els.length.disabled = true;
    els.lengthOutput.textContent = "10";
    els.modeHelp.textContent = "Session courte de 10 questions.";
    return;
  }

  els.length.disabled = false;
  if (Number(els.length.value) > available) {
    els.length.value = String(available);
  }
  els.lengthOutput.textContent = els.length.value;
  els.modeHelp.textContent = els.mode.value === "challenging"
    ? `${available} questions a plusieurs reponses disponibles pour cette selection.`
    : `${available} questions disponibles pour cette selection.`;
}

function startGame(modeOverride) {
  if (modeOverride) {
    els.mode.value = modeOverride;
    updateModeControls();
  }

  state.deck = buildDeck();
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  state.answered = 0;
  state.correct = 0;
  state.results = [];
  state.startedAt = Date.now();
  state.sessionMode = els.mode.value;
  state.sessionTheme = els.theme.value;
  state.saved = false;
  state.themeStats = {};
  themeNames.forEach((theme) => {
    state.themeStats[theme] = { correct: 0, total: 0 };
  });

  els.emptyState.classList.add("hidden");
  els.questionCard.classList.remove("hidden");
  updateScoreboard();
  renderQuestion();
  document.querySelector("#play").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderQuestion() {
  const question = state.deck[state.index];
  state.hintUsed = false;
  state.locked = false;
  state.selected = new Set();

  els.questionCounter.textContent = `Question ${state.index + 1}/${state.deck.length}`;
  els.questionTheme.textContent = question.theme;
  els.questionType.textContent = formatType(question.type);
  els.progressBar.style.width = `${(state.index / state.deck.length) * 100}%`;
  els.questionText.textContent = question.question;
  els.answerInstruction.textContent = instructionFor(question.type);
  els.hintBox.classList.add("hidden");
  els.hintBox.textContent = "";
  els.explanation.classList.add("hidden");
  els.explanation.textContent = "";
  els.submitBtn.classList.remove("hidden");
  els.submitBtn.textContent = "Valider";
  els.submitBtn.disabled = true;
  els.nextBtn.classList.add("hidden");
  els.hintBtn.disabled = false;
  els.answerArea.innerHTML = "";

  if (question.type === "boolean") {
    renderChoices({ ...question, choices: ["Vrai", "Faux"] });
    return;
  }

  if (question.type === "mcq" || question.type === "multi") {
    renderChoices(question);
    return;
  }
}

function instructionFor(type) {
  if (type === "multi") return "Plusieurs reponses peuvent etre correctes.";
  if (type === "boolean") return "Selectionne vrai ou faux.";
  return "Une seule reponse est correcte.";
}

function renderChoices(question) {
  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.textContent = choice;
    button.addEventListener("click", () => {
      if (state.locked) return;
      if (currentQuestion().type === "multi") {
        if (state.selected.has(index)) {
          state.selected.delete(index);
          button.classList.remove("selected");
        } else {
          state.selected.add(index);
          button.classList.add("selected");
        }
      } else {
        state.selected = new Set([index]);
        [...els.answerArea.children].forEach((child) => child.classList.remove("selected"));
        button.classList.add("selected");
      }
      updateSubmitState();
    });
    els.answerArea.append(button);
  });
}

function updateSubmitState() {
  if (state.locked) return;
  const count = state.selected.size;
  els.submitBtn.disabled = count === 0;
  if (currentQuestion()?.type === "multi" && count > 0) {
    els.submitBtn.textContent = `Valider (${count})`;
    return;
  }
  els.submitBtn.textContent = "Valider";
}

function currentQuestion() {
  return state.deck[state.index];
}

function useHint() {
  if (state.hintUsed || state.locked) return;
  state.hintUsed = true;
  state.score = Math.max(0, state.score - 2);
  els.hintBox.textContent = currentQuestion().hint;
  els.hintBox.classList.remove("hidden");
  els.hintBtn.disabled = true;
  updateScoreboard();
}

function submitAnswer() {
  if (state.locked) return;
  const question = currentQuestion();
  let result = false;

  if (question.type === "multi") {
    result = sameSet(state.selected, new Set(question.answers));
  } else if (question.type === "boolean") {
    result = state.selected.size > 0 && (state.selected.has(0) === question.answer);
  } else {
    result = state.selected.has(question.answer);
  }

  if (!state.selected.size) {
    els.hintBox.textContent = "Selectionne au moins une reponse avant de valider.";
    els.hintBox.classList.remove("hidden");
    return;
  }

  revealAnswer(result);
}

function sameSet(a, b) {
  return a.size === b.size && [...a].every((value) => b.has(value));
}

function revealAnswer(isCorrect) {
  const question = currentQuestion();
  state.locked = true;
  state.answered += 1;
  state.themeStats[question.theme].total += 1;
  state.results.push({
    correct: isCorrect,
    question,
    selected: [...state.selected],
  });

  if (isCorrect) {
    state.correct += 1;
    state.streak += 1;
    state.themeStats[question.theme].correct += 1;
    state.score += 10 + Math.min(state.streak * 2, 10);
    if (state.hintUsed) state.score = Math.max(0, state.score - 3);
  } else {
    state.streak = 0;
    state.score = Math.max(0, state.score - 1);
  }

  markChoices(question, isCorrect);
  els.explanation.textContent = `${isCorrect ? "Bonne reponse." : "Reponse incorrecte."} ${question.explanation}`;
  els.explanation.classList.remove("hidden");
  els.submitBtn.classList.add("hidden");
  els.submitBtn.disabled = false;
  els.nextBtn.classList.remove("hidden");
  els.hintBtn.disabled = true;
  els.progressBar.style.width = `${((state.index + 1) / state.deck.length) * 100}%`;
  updateScoreboard();
}

function markChoices(question) {
  const correctIndexes = question.type === "multi"
    ? new Set(question.answers)
    : new Set([question.type === "boolean" ? (question.answer ? 0 : 1) : question.answer]);

  [...els.answerArea.children].forEach((button, index) => {
    if (correctIndexes.has(index)) button.classList.add("correct");
    if (state.selected.has(index) && !correctIndexes.has(index)) button.classList.add("wrong");
  });
}

function nextQuestion() {
  if (state.index < state.deck.length - 1) {
    state.index += 1;
    renderQuestion();
    return;
  }
  finishGame();
}

function finishGame() {
  persistCompletedSession();
  renderTrackingDashboard();
  updateScoreboard();

  els.questionCard.classList.add("hidden");
  els.emptyState.classList.remove("hidden");
  els.emptyState.innerHTML = `
    <div class="stamp">${state.correct}/${state.answered}</div>
    <h2>${finalTitle()}</h2>
    <p>Score final: <strong>${state.score}</strong>. Precision: <strong>${accuracy()}%</strong>. ${finalComment()}</p>
    ${renderResultsSummary()}
    <button class="primary" id="restartInline">Rejouer</button>
    <button class="secondary" id="reviewCardsInline">Revoir les fiches</button>
  `;
  document.querySelector("#restartInline").addEventListener("click", () => startGame());
  document.querySelector("#reviewCardsInline").addEventListener("click", () => {
    document.querySelector("#training").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function persistCompletedSession() {
  if (state.saved || !state.answered) return;
  state.saved = true;

  const session = {
    id: Date.now(),
    date: new Date().toISOString(),
    mode: state.sessionMode,
    theme: state.sessionTheme,
    score: state.score,
    correct: state.correct,
    answered: state.answered,
    accuracy: accuracy(),
    durationSec: Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)),
    themeStats: structuredCloneThemeStats(state.themeStats),
    missed: state.results
      .filter((item) => !item.correct)
      .slice(0, 10)
      .map((item) => ({
        theme: item.question.theme,
        question: item.question.question,
      })),
  };

  progressState.sessions = [session, ...progressState.sessions].slice(0, 50);
  progressState.bestScore = Math.max(Number(progressState.bestScore || 0), state.score);
  saveProgress();
  els.bestScore.textContent = String(progressState.bestScore || 0);
}

function structuredCloneThemeStats(themeStats) {
  return Object.fromEntries(
    themeNames.map((theme) => [
      theme,
      {
        correct: Number(themeStats[theme]?.correct || 0),
        total: Number(themeStats[theme]?.total || 0),
      },
    ])
  );
}

function renderResultsSummary() {
  const missed = state.results.filter((item) => !item.correct);
  if (!missed.length) {
    return `<div class="result-summary"><strong>Aucune erreur sur cette session.</strong></div>`;
  }

  return `
    <div class="result-summary">
      <strong>Questions a revoir (${missed.length})</strong>
      <ul>
        ${missed.slice(0, 6).map((item) => `<li>${item.question.theme} - ${item.question.question}</li>`).join("")}
      </ul>
      ${missed.length > 6 ? `<small>Seules les 6 premieres erreurs sont affichees ici.</small>` : ""}
    </div>
  `;
}

function finalTitle() {
  const ratio = state.correct / Math.max(state.answered, 1);
  if (ratio >= 0.9) return "Tres bonne maitrise du cours.";
  if (ratio >= 0.7) return "Bonne maitrise generale.";
  if (ratio >= 0.5) return "Maitrise partielle a consolider.";
  return "Revision approfondie recommandee.";
}

function finalComment() {
  const ratio = state.correct / Math.max(state.answered, 1);
  if (ratio >= 0.9) return "Les notions principales sont acquises.";
  if (ratio >= 0.7) return "Travaille encore les themes les moins maitrises.";
  if (ratio >= 0.5) return "Reprends les fiches puis relance une session par theme.";
  return "Commence par les fiches de synthese puis utilise le mode entrainement par theme.";
}

function accuracy() {
  return Math.round((state.correct / Math.max(state.answered, 1)) * 100);
}

function updateScoreboard() {
  els.score.textContent = String(state.score);
  els.streak.textContent = String(state.streak);
  els.accuracy.textContent = `${accuracy()}%`;
  els.bestScore.textContent = String(progressState.bestScore || localStorage.getItem(bestKey) || "0");
  els.rank.textContent = `Niveau: ${rankName()}`;
  renderThemeBars();
}

function rankName() {
  if (state.score >= 900) return "excellent";
  if (state.score >= 650) return "avance";
  if (state.score >= 400) return "intermediaire";
  if (state.score >= 150) return "en progression";
  return "a evaluer";
}

function renderThemeBars() {
  els.themeBars.innerHTML = "";
  Object.entries(state.themeStats).forEach(([theme, stat]) => {
    const percent = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
    const wrapper = document.createElement("div");
    wrapper.className = "theme-bar";
    wrapper.innerHTML = `
      <label><span>${theme}</span><span>${percent}%</span></label>
      <div class="track"><div class="fill" style="width:${percent}%"></div></div>
    `;
    els.themeBars.append(wrapper);
  });
}

function progressSummary() {
  const summary = {
    sessions: progressState.sessions.length,
    answered: 0,
    correct: 0,
    bestScore: Number(progressState.bestScore || 0),
    themeStats: Object.fromEntries(themeNames.map((theme) => [theme, { correct: 0, total: 0 }])),
  };

  progressState.sessions.forEach((session) => {
    summary.answered += Number(session.answered || 0);
    summary.correct += Number(session.correct || 0);
    themeNames.forEach((theme) => {
      summary.themeStats[theme].correct += Number(session.themeStats?.[theme]?.correct || 0);
      summary.themeStats[theme].total += Number(session.themeStats?.[theme]?.total || 0);
    });
  });

  summary.accuracy = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
  return summary;
}

function renderTrackingDashboard() {
  const summary = progressSummary();
  const themeRows = themeNames.map((theme) => {
    const stat = summary.themeStats[theme];
    const percent = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
    return { theme, stat, percent };
  });
  const testedThemes = themeRows.filter((row) => row.stat.total > 0);
  const priority = testedThemes.length
    ? [...testedThemes].sort((a, b) => a.percent - b.percent || b.stat.total - a.stat.total)[0]
    : null;
  const strongest = testedThemes.length
    ? [...testedThemes].sort((a, b) => b.percent - a.percent || b.stat.total - a.stat.total)[0]
    : null;

  els.overallAccuracy.textContent = `${summary.accuracy}%`;
  els.progressOrb.style.setProperty("--progress", `${summary.accuracy * 3.6}deg`);
  els.trackingLevel.textContent = `Niveau: ${globalLevel(summary.accuracy, summary.answered)}`;
  els.trackingHeadline.textContent = summary.sessions
    ? `${summary.correct} bonnes reponses sur ${summary.answered} questions traitees.`
    : "Aucune session terminee pour le moment.";
  els.trackingInsight.textContent = summary.sessions
    ? trackingInsight(summary, priority, strongest)
    : "Termine un quiz pour debloquer les statistiques globales, les themes forts et les priorites de revision.";

  els.totalSessions.textContent = String(summary.sessions);
  els.totalAnswered.textContent = String(summary.answered);
  els.trackingBestScore.textContent = String(summary.bestScore);
  els.priorityTheme.textContent = priority ? priority.theme : "-";
  els.themeCoverage.textContent = `${testedThemes.length}/${themeNames.length} themes`;
  els.sessionCountLabel.textContent = `${summary.sessions} session${summary.sessions > 1 ? "s" : ""}`;

  renderTrackingThemes(themeRows);
  renderSessionHistory();
  renderRecommendations(summary, priority, strongest);
}

function globalLevel(accuracyValue, answered) {
  if (!answered) return "a evaluer";
  if (accuracyValue >= 90) return "excellent";
  if (accuracyValue >= 75) return "avance";
  if (accuracyValue >= 60) return "intermediaire";
  return "a consolider";
}

function trackingInsight(summary, priority, strongest) {
  if (!priority) return "Les sessions sont enregistrees, mais aucun theme n'a encore assez de donnees.";
  const strongText = strongest ? ` Theme le plus solide: ${strongest.theme} (${strongest.percent}%).` : "";
  return `Priorite actuelle: ${priority.theme} (${priority.percent}%).${strongText}`;
}

function renderTrackingThemes(themeRows) {
  els.trackingThemeList.innerHTML = themeRows.map((row) => `
    <div class="tracking-theme-row">
      <div class="tracking-theme-top">
        <strong>${row.theme}</strong>
        <span>${row.stat.total ? `${row.percent}%` : "Non teste"}</span>
      </div>
      <div class="tracking-progress"><span style="width:${row.percent}%"></span></div>
      <small>${row.stat.correct}/${row.stat.total} bonnes reponses</small>
    </div>
  `).join("");
}

function renderSessionHistory() {
  if (!progressState.sessions.length) {
    els.sessionHistory.innerHTML = `<div class="empty-tracking">Aucune session terminee.</div>`;
    return;
  }

  els.sessionHistory.innerHTML = progressState.sessions.slice(0, 6).map((session) => `
    <div class="session-row">
      <div>
        <strong>${modeLabel(session.mode)}</strong>
        <small>${formatSessionDate(session.date)} - ${themeLabel(session.theme)} - ${formatDuration(session.durationSec)}</small>
      </div>
      <span>${session.accuracy}%</span>
    </div>
  `).join("");
}

function renderRecommendations(summary, priority, strongest) {
  if (!summary.sessions) {
    els.recommendations.innerHTML = `
      <ul>
        <li>Commence par une session courte pour initialiser le suivi.</li>
        <li>Fais ensuite un quiz par theme pour obtenir des statistiques comparables.</li>
        <li>Utilise le mode cours complet quand tous les chapitres ont ete relus.</li>
      </ul>
    `;
    return;
  }

  const recommendations = [];
  if (priority) {
    recommendations.push(`Relancer un entrainement sur le theme ${priority.theme}, actuellement a ${priority.percent}%.`);
  }
  if (summary.accuracy < 70) {
    recommendations.push("Revoir les fiches detaillees avant de relancer un cours complet.");
  } else {
    recommendations.push("Alterner sessions courtes et cours complet pour stabiliser la memorisation.");
  }
  if (strongest && strongest.percent >= 80) {
    recommendations.push(`Capitaliser sur le theme ${strongest.theme}, deja solide, avec quelques questions de rappel.`);
  }
  recommendations.push("Terminer au moins une session par theme pour obtenir un diagnostic complet.");

  els.recommendations.innerHTML = `<ul>${recommendations.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function modeLabel(mode) {
  return {
    complete: "Cours complet",
    training: "Entrainement",
    challenging: "Choix multiples",
    flash: "Session courte",
  }[mode] || "Session";
}

function themeLabel(theme) {
  return theme === "all" ? "Tout le cours" : theme;
}

function formatSessionDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds) {
  const safeSeconds = Number(seconds || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  if (!minutes) return `${rest}s`;
  return `${minutes}min ${String(rest).padStart(2, "0")}s`;
}

function renderRevisionCards() {
  els.revisionGrid.innerHTML = "";
  revisionCards.forEach((card) => {
    const article = document.createElement("article");
    article.className = "revision-card";
    const sections = card.sections
      ? card.sections.map((section) => `
          <section class="revision-section">
            <h4>${section.title}</h4>
            <ul>${section.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
          </section>
        `).join("")
      : `<ul>${card.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>`;

    article.innerHTML = `
      <details ${card.open ? "open" : ""}>
        <summary>
          <span>${card.title}</span>
          <small>${card.subtitle || ""}</small>
        </summary>
        <div class="revision-content">${sections}</div>
      </details>
    `;
    els.revisionGrid.append(article);
  });
}

els.length.addEventListener("input", () => {
  els.lengthOutput.textContent = els.length.value;
});

els.mode.addEventListener("change", updateModeControls);
els.theme.addEventListener("change", updateModeControls);

els.startBtn.addEventListener("click", () => startGame());
els.hintBtn.addEventListener("click", useHint);
els.submitBtn.addEventListener("click", submitAnswer);
els.nextBtn.addEventListener("click", nextQuestion);
els.resetProgressBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Reinitialiser tout le suivi de progression ?");
  if (!confirmed) return;
  progressState = { bestScore: 0, sessions: [] };
  saveProgress();
  renderTrackingDashboard();
  updateScoreboard();
});

document.querySelectorAll("[data-start]").forEach((button) => {
  button.addEventListener("click", () => startGame(button.dataset.start));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !els.questionCard.classList.contains("hidden")) {
    if (!els.submitBtn.classList.contains("hidden") && !els.submitBtn.disabled) submitAnswer();
    if (!els.nextBtn.classList.contains("hidden")) nextQuestion();
  }
});

renderRevisionCards();
updateModeControls();
renderTrackingDashboard();
updateScoreboard();
