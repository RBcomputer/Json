const { jsPDF } = window.jspdf;

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCNK4dll1q9bjTP26sW7yHr7guPYs8GihE",
  authDomain: "testalin-e7ce9.firebaseapp.com",
  projectId: "testalin-e7ce9",
  storageBucket: "testalin-e7ce9.appspot.com",
  messagingSenderId: "578209546522",
  appId: "1:578209546522:web:efbdd2e8869084a903eca3",
  measurementId: "G-LF86D59EZN",
};

// Inizializza Firebase
firebase.initializeApp(firebaseConfig);

// Riferimento al database, all'autenticazione e allo storage
const db = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();

// ID fisso per l'applicazione
const APP_ID = "app_gestione_interventi";

// Elementi DOM
const loginPage = document.getElementById("loginPage");
const loginForm = document.getElementById("loginForm");
const mainContent = document.querySelector(".main-content");
const sidebarElement = document.querySelector(".sidebar");
const btnNuovoCliente = document.getElementById("btnNuovoCliente");
const btnInterventi = document.getElementById("btnInterventi");
const btnInterventiInCorso = document.getElementById("btnInterventiInCorso");
const btnInterventiCompletati = document.getElementById(
  "btnInterventiCompletati"
);
const btnRubrica = document.getElementById("btnRubrica");
const btnCalendario = document.getElementById("btnCalendario");
const btnCestino = document.getElementById("btnCestino");
const btnNote = document.getElementById("btnNote");
const btnLogout = document.getElementById("btnLogout");
const nuovoClienteForm = document.getElementById("nuovoClienteForm");
const interventoForm = document.getElementById("interventoForm");
const listaClienti = document.getElementById("listaClienti");
const tabellaClienti = document
  .getElementById("tabellaClienti")
  .getElementsByTagName("tbody")[0];
const formAppuntamento = document.getElementById("formAppuntamento");
const modalCollaudo = document.getElementById("modalCollaudo");
const collaudoForm = document.getElementById("collaudoForm");
const modalFirmaCollaudo = document.getElementById("modalFirmaCollaudo");
const areaFirmaCollaudo = document.getElementById("areaFirmaCollaudo");
const confermaFirmaCollaudo = document.getElementById("confermaFirmaCollaudo");
const interventiCompletati = document.getElementById("interventiCompletati");
const tabellaInterventiCompletati = document
  .getElementById("tabellaInterventiCompletati")
  .getElementsByTagName("tbody")[0];
const interventiInCorso = document.getElementById("interventiInCorso");
const tabellaInterventiInCorso = document
  .getElementById("tabellaInterventiInCorso")
  .getElementsByTagName("tbody")[0];
const rubrica = document.getElementById("rubrica");
const tabellaRubrica = document
  .getElementById("tabellaRubrica")
  .getElementsByTagName("tbody")[0];
const cestino = document.getElementById("cestino");
const tabellaCestino = document
  .getElementById("tabellaCestino")
  .getElementsByTagName("tbody")[0];
const svuotaCestino = document.getElementById("svuotaCestino");
const modalModifica = document.getElementById("modalModifica");
const formModifica = document.getElementById("formModifica");
const listaNote = document.getElementById("listaNote");
const nuovaNota = document.getElementById("nuovaNota");
const modalNuovaNota = document.getElementById("modalNuovaNota");
const titoloNota = document.getElementById("titoloNota");
const contenutoNota = document.getElementById("contenutoNota");
const salvaNota = document.getElementById("salvaNota");
const annullaNota = document.getElementById("annullaNota");
const elencoNote = document.getElementById("elencoNote");

let clienteSelezionato = null;
let isDrawing = false;
let notaSelezionata = null;
let meseCorrente = new Date();

// Funzioni di utilità
function formatDataItaliana(data) {
  return data
    .toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, ".");
}

function formatOraItaliana(data) {
  return data.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function showSuccessToast(message) {
  showToast(message, "success");
}

function showErrorToast(message) {
  showToast(message, "error");
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `show ${type}`;
  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}

function changeActiveButton(button) {
  document
    .querySelectorAll(".nav-buttons button")
    .forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");
}

function nascondiElementiPrincipali() {
  document.body.classList.add("login-active");
  mainContent.classList.add("hidden");
  sidebarElement.classList.add("hidden");
}

function mostraElementiPrincipali() {
  document.body.classList.remove("login-active");
  mainContent.classList.remove("hidden");
  sidebarElement.classList.remove("hidden");
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      loginPage.style.display = "none";
      mostraElementiPrincipali();
      showSuccessToast("Accesso effettuato con successo!");
      // La sincronizzazione verrà gestita dall'onAuthStateChanged
    })
    .catch((error) => {
      showErrorToast("Credenziali non valide. Riprova.");
      console.error("Errore di login:", error);
    });
});

// Gestione del logout
btnLogout.addEventListener("click", () => {
  auth
    .signOut()
    .then(() => {
      nascondiElementiPrincipali();
      loginPage.style.display = "block";
      showSuccessToast("Logout effettuato con successo");
    })
    .catch((error) => {
      showErrorToast("Errore durante il logout: " + error);
    });
});

// Modifica del controllo dello stato di autenticazione
auth.onAuthStateChanged((user) => {
  if (user) {
    loginPage.style.display = "none";
    mostraElementiPrincipali();

    // Inizializza i dati e la sincronizzazione real-time
    caricaDati().then(() => {
      inizializzaSincronizzazioneRealTime();
    });
  } else {
    nascondiElementiPrincipali();
    loginPage.style.display = "block";
  }
});

// Funzione per aggiornare i contatori
function aggiornaContatori() {
  return db
    .ref(`${APP_ID}/interventi`)
    .once("value")
    .then((snapshot) => {
      const interventi = snapshot.val() || {};
      function contaArray(arr) {
        return Array.isArray(arr) ? arr.length : 0;
      }
      document.getElementById("interventiCounter").textContent = contaArray(
        interventi.daPianificare
      );
      document.getElementById("interventiInCorsoCounter").textContent =
        contaArray(interventi.inCorso);
      document.getElementById("interventiCompletatiCounter").textContent =
        contaArray(interventi.completati);
      document.getElementById("cestinoCounter").textContent = contaArray(
        interventi.cestino
      );

      console.log("Contatori aggiornati:", {
        daPianificare: contaArray(interventi.daPianificare),
        inCorso: contaArray(interventi.inCorso),
        completati: contaArray(interventi.completati),
        cestino: contaArray(interventi.cestino),
      });
    })
    .catch((error) => {
      console.error("Errore nell'aggiornamento dei contatori:", error);
    });
}

function aggiornaContenuto() {
  return caricaDati()
    .then(() => {
      aggiornaListaClientiDaPianificare();
      aggiornaInterventiInCorso();
      aggiornaInterventiCompletati();
      aggiornaRubrica();
      aggiornaListaNote();
      aggiornaCalendario();
      return aggiornaContatori();
    })
    .catch((error) => {
      showErrorToast("Errore nell'aggiornamento dei dati: " + error);
    });
}

function caricaDati() {
  return Promise.all([
    db.ref(`${APP_ID}/interventi`).once("value"),
    db.ref(`${APP_ID}/rubrica`).once("value"),
  ])
    .then(([interventiSnapshot, rubricaSnapshot]) => {
      console.log("Dati interventi:", interventiSnapshot.val());
      console.log("Dati rubrica:", rubricaSnapshot.val());

      const interventi = interventiSnapshot.val() || {};
      const contatti = rubricaSnapshot.val() || [];

      // Funzione helper per popolare le tabelle
      function popolaTabella(tabella, dati, tipo) {
        tabella.innerHTML = "";
        if (Array.isArray(dati)) {
          // Ordina gli interventi per data se necessario
          if (tipo === "inCorso" || tipo === "completati") {
            dati.sort((a, b) => {
              const dataA = new Date(
                a.appuntamento.split(" ")[0].split(".").reverse().join("-") +
                  "T" +
                  (a.appuntamento.split(" ")[1] || "00:00")
              );
              const dataB = new Date(
                b.appuntamento.split(" ")[0].split(".").reverse().join("-") +
                  "T" +
                  (b.appuntamento.split(" ")[1] || "00:00")
              );
              return dataB - dataA; // Ordine decrescente
            });
          }
          dati.forEach((item, index) => {
            if (tipo === "completati" && index >= 50) {
              // Limita a 50 interventi completati visualizzati
              return;
            }
            aggiungiRigaTabella(tabella, item, tipo);
          });
        } else {
          console.warn(`I dati per ${tipo} non sono un array:`, dati);
        }
      }

      // Popola le tabelle
      popolaTabella(tabellaClienti, interventi.daPianificare, "daPianificare");
      popolaTabella(tabellaInterventiInCorso, interventi.inCorso, "inCorso");
      popolaTabella(
        tabellaInterventiCompletati,
        interventi.completati,
        "completati"
      );
      popolaTabella(tabellaCestino, interventi.cestino, "cestino");

      // Popola la rubrica
      tabellaRubrica.innerHTML = "";
      if (Array.isArray(contatti)) {
        contatti.sort((a, b) => a.cliente.localeCompare(b.cliente));
        contatti.forEach((contatto) => aggiungiRigaRubrica(contatto));
      } else {
        console.warn("I dati della rubrica non sono un array:", contatti);
      }

      return aggiornaContatori();
    })
    .catch((error) => {
      console.error("Errore nel caricamento dei dati:", error);
      showErrorToast("Errore nel caricamento dei dati: " + error.message);
    });
}

function salvaDati() {
  const interventi = {
    daPianificare: Array.from(tabellaClienti.rows).map((row) => ({
      cliente: row.cells[0].textContent,
      indirizzo: row.cells[1].textContent,
      titolo: row.cells[2].textContent,
      tipoIntervento: row.cells[3].textContent,
      priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
    })),
    inCorso: Array.from(tabellaInterventiInCorso.rows).map((row) => ({
      cliente: row.cells[0].textContent,
      indirizzo: row.cells[1].textContent,
      titolo: row.cells[2].textContent,
      tipoIntervento: row.cells[3].textContent,
      appuntamento: row.cells[4].textContent,
      priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
    })),
    completati: Array.from(tabellaInterventiCompletati.rows).map((row) => ({
      cliente: row.cells[0].textContent,
      indirizzo: row.cells[1].textContent,
      titolo: row.cells[2].textContent,
      tipoIntervento: row.cells[3].textContent,
      appuntamento: row.cells[4].textContent,
      priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
      collaudoUrl: row.dataset.collaudoUrl || "",
    })),
    cestino: Array.from(tabellaCestino.rows).map((row) => ({
      cliente: row.cells[0].textContent,
      indirizzo: row.cells[1].textContent,
      titolo: row.cells[2].textContent,
      tipoIntervento: row.cells[3].textContent,
      appuntamento: row.cells[4].textContent,
      priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
    })),
  };

  const contatti = Array.from(tabellaRubrica.rows).map((row) => ({
    cliente: row.cells[0].textContent,
    indirizzo: row.cells[1].textContent,
    titolo: row.cells[2].textContent,
    priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
  }));

  return Promise.all([
    db.ref(`${APP_ID}/interventi`).set(interventi),
    db.ref(`${APP_ID}/rubrica`).set(contatti),
  ]).then(() => {
    console.log("Dati salvati con successo");
    return aggiornaContatori();
  });
}

function inizializzaSincronizzazioneRealTime() {
  // Ascolta modifiche agli interventi
  db.ref(`${APP_ID}/interventi`).on("value", (snapshot) => {
    console.log("Aggiornamento in tempo reale degli interventi");
    const interventi = snapshot.val() || {};

    // Aggiorna le tabelle
    if (Array.isArray(interventi.daPianificare)) {
      tabellaClienti.innerHTML = "";
      interventi.daPianificare.forEach((intervento) =>
        aggiungiRigaTabella(tabellaClienti, intervento, "daPianificare")
      );
    }

    if (Array.isArray(interventi.inCorso)) {
      tabellaInterventiInCorso.innerHTML = "";
      interventi.inCorso.forEach((intervento) =>
        aggiungiRigaTabella(tabellaInterventiInCorso, intervento, "inCorso")
      );
    }

    if (Array.isArray(interventi.completati)) {
      tabellaInterventiCompletati.innerHTML = "";
      interventi.completati.forEach((intervento) =>
        aggiungiRigaTabella(
          tabellaInterventiCompletati,
          intervento,
          "completati"
        )
      );
    }

    if (Array.isArray(interventi.cestino)) {
      tabellaCestino.innerHTML = "";
      interventi.cestino.forEach((intervento) =>
        aggiungiRigaTabella(tabellaCestino, intervento, "cestino")
      );
    }

    // Aggiorna i contatori
    aggiornaContatori();

    // Aggiorna il calendario se è visibile
    if (document.getElementById("calendarioView").style.display !== "none") {
      aggiornaCalendario();
    }
  });

  // Ascolta modifiche alla rubrica
  db.ref(`${APP_ID}/rubrica`).on("value", (snapshot) => {
    console.log("Aggiornamento in tempo reale della rubrica");
    const contatti = snapshot.val() || [];

    tabellaRubrica.innerHTML = "";
    if (Array.isArray(contatti)) {
      contatti.sort((a, b) => a.cliente.localeCompare(b.cliente));
      contatti.forEach((contatto) => aggiungiRigaRubrica(contatto));
    }
  });

  // Ascolta modifiche alle note
  db.ref(`${APP_ID}/note`).on("value", (snapshot) => {
    console.log("Aggiornamento in tempo reale delle note");
    aggiornaListaNote();
  });
}

// Event listeners per i pulsanti della sidebar
btnNuovoCliente.addEventListener("click", () => {
  changeActiveButton(btnNuovoCliente);
  aggiornaContenuto().then(() => {
    nuovoClienteForm.style.display = "block";
    listaClienti.style.display = "none";
    interventiCompletati.style.display = "none";
    interventiInCorso.style.display = "none";
    rubrica.style.display = "none";
    cestino.style.display = "none";
    listaNote.style.display = "none";
    document.getElementById("calendarioView").style.display = "none";
  });
});

btnInterventi.addEventListener("click", () => {
  changeActiveButton(btnInterventi);
  aggiornaContenuto().then(() => {
    nuovoClienteForm.style.display = "none";
    listaClienti.style.display = "block";
    interventiCompletati.style.display = "none";
    interventiInCorso.style.display = "none";
    rubrica.style.display = "none";
    cestino.style.display = "none";
    listaNote.style.display = "none";
    document.getElementById("calendarioView").style.display = "none";
  });
});

btnInterventiInCorso.addEventListener("click", () => {
  changeActiveButton(btnInterventiInCorso);
  aggiornaContenuto().then(() => {
    nuovoClienteForm.style.display = "none";
    listaClienti.style.display = "none";
    interventiCompletati.style.display = "none";
    interventiInCorso.style.display = "block";
    rubrica.style.display = "none";
    cestino.style.display = "none";
    listaNote.style.display = "none";
    document.getElementById("calendarioView").style.display = "none";
  });
});

btnInterventiCompletati.addEventListener("click", () => {
  changeActiveButton(btnInterventiCompletati);
  aggiornaContenuto().then(() => {
    nuovoClienteForm.style.display = "none";
    listaClienti.style.display = "none";
    interventiCompletati.style.display = "block";
    interventiInCorso.style.display = "none";
    rubrica.style.display = "none";
    cestino.style.display = "none";
    listaNote.style.display = "none";
    document.getElementById("calendarioView").style.display = "none";
  });
});

btnRubrica.addEventListener("click", () => {
  changeActiveButton(btnRubrica);
  aggiornaContenuto().then(() => {
    nuovoClienteForm.style.display = "none";
    listaClienti.style.display = "none";
    interventiCompletati.style.display = "none";
    interventiInCorso.style.display = "none";
    rubrica.style.display = "block";
    cestino.style.display = "none";
    listaNote.style.display = "none";
    document.getElementById("calendarioView").style.display = "none";
  });
});

btnCalendario.addEventListener("click", () => {
  changeActiveButton(btnCalendario);
  aggiornaContenuto().then(() => {
    nuovoClienteForm.style.display = "none";
    listaClienti.style.display = "none";
    interventiCompletati.style.display = "none";
    interventiInCorso.style.display = "none";
    rubrica.style.display = "none";
    cestino.style.display = "none";
    listaNote.style.display = "none";
    document.getElementById("calendarioView").style.display = "block";
    mostraCalendario();
  });
});

btnCestino.addEventListener("click", () => {
  changeActiveButton(btnCestino);
  aggiornaContenuto().then(() => {
    nuovoClienteForm.style.display = "none";
    listaClienti.style.display = "none";
    interventiCompletati.style.display = "none";
    interventiInCorso.style.display = "none";
    rubrica.style.display = "none";
    cestino.style.display = "block";
    listaNote.style.display = "none";
    document.getElementById("calendarioView").style.display = "none";
  });
});

btnNote.addEventListener("click", () => {
  changeActiveButton(btnNote);
  aggiornaContenuto().then(() => {
    nuovoClienteForm.style.display = "none";
    listaClienti.style.display = "none";
    interventiCompletati.style.display = "none";
    interventiInCorso.style.display = "none";
    rubrica.style.display = "none";
    cestino.style.display = "none";
    listaNote.style.display = "block";
    document.getElementById("calendarioView").style.display = "none";
    aggiornaListaNote();
  });
});

function aggiungiRigaTabella(tabella, intervento, tipo) {
  const newRow = tabella.insertRow();

  // Applica il colore di sfondo se presente
  if (intervento.backgroundColor) {
    newRow.style.backgroundColor = intervento.backgroundColor;
  }

  if (tipo === "completati") {
    newRow.innerHTML = `
            <td data-label="Cliente">${intervento.cliente}</td>
            <td data-label="Indirizzo">${intervento.indirizzo || "N/D"}</td>
            <td data-label="Titolo">${intervento.titolo || "N/D"}</td>
            <td data-label="Tipo Intervento">${
              intervento.tipoIntervento || "N/D"
            }</td>
            <td data-label="Appuntamento">${
              intervento.appuntamento || "N/D"
            }</td>
            <td data-label="Azioni">
                <div class="azioni-intervento">
                    <button onclick="visualizzaCollaudo(this)" class="btn-pdf"><i class="fas fa-file-pdf"></i></button>
                    <button onclick="eliminaInterventoCompletato(this)" class="btn-elimina"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>
        `;
  } else {
    newRow.innerHTML = `
            <td data-label="Cliente">${intervento.cliente}</td>
            <td data-label="Indirizzo">${intervento.indirizzo}</td>
            <td data-label="Titolo">${intervento.titolo}</td>
            <td data-label="Tipo Intervento">${intervento.tipoIntervento}</td>
            ${
              tipo !== "daPianificare"
                ? `<td data-label="Appuntamento">${
                    intervento.appuntamento || ""
                  }</td>`
                : ""
            }
            <td data-label="Azioni">
                <div class="azioni-intervento">
                    ${
                      tipo === "daPianificare"
                        ? '<button onclick="apriModalModifica(this)" class="btn-modifica"><i class="fas fa-pencil-alt"></i></button>'
                        : ""
                    }
                    ${
                      tipo === "daPianificare"
                        ? '<button onclick="pianificaAppuntamento(this)" class="btn-pianifica"><i class="fas fa-calendar-plus"></i></button>'
                        : ""
                    }
                    ${
                      tipo === "inCorso"
                        ? '<button onclick="apriModalCollaudo(this)" class="btn-collaudo">Collaudo</button>'
                        : ""
                    }
                    ${
                      tipo === "daPianificare" || tipo === "inCorso"
                        ? '<button onclick="eliminaIntervento(this)" class="btn-elimina"><i class="fas fa-trash-alt"></i></button>'
                        : ""
                    }
                    ${
                      tipo === "cestino"
                        ? '<button onclick="ripristinaIntervento(this)" class="btn-ripristina">Ripristina</button>'
                        : ""
                    }
                    ${
                      tipo === "cestino"
                        ? '<button onclick="eliminaDefinitivamente(this)" class="btn-elimina"><i class="fas fa-trash"></i></button>'
                        : ""
                    }
                </div>
            </td>
        `;
  }

  // Aggiungi l'URL del collaudo come attributo data alla riga
  if (intervento.collaudoUrl) {
    newRow.dataset.collaudoUrl = intervento.collaudoUrl;
  }

  // Aggiungi l'indicatore di priorità se presente
  if (intervento.priorita) {
    const prioritaIndicator = document.createElement("div");
    prioritaIndicator.style.width = "10px";
    prioritaIndicator.style.height = "10px";
    prioritaIndicator.style.borderRadius = "50%";
    prioritaIndicator.style.backgroundColor = intervento.priorita;
    prioritaIndicator.style.display = "inline-block";
    prioritaIndicator.style.marginRight = "5px";
    newRow.cells[0].insertBefore(prioritaIndicator, newRow.cells[0].firstChild);
  }
}

// Funzione per aggiungere una riga alla rubrica
function aggiungiRigaRubrica(contatto) {
  const newRow = tabellaRubrica.insertRow();
  newRow.innerHTML = `
        <td data-label="Cliente">${contatto.cliente}</td>
        <td data-label="Indirizzo">${contatto.indirizzo}</td>
        <td data-label="Titolo">${contatto.titolo}</td>
        <td data-label="Azioni">
          <div class="azioni-intervento">
            <button onclick="apriModalModifica(this)" class="btn-modifica"><i class="fas fa-pencil-alt"></i></button>
            <button onclick="pianificaInterventoRubrica(this)" class="btn-pianifica"><i class="fas fa-calendar-plus"></i></button>
            <button onclick="eliminaContattoRubrica(this)" class="btn-elimina"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      `;
  // Aggiungi l'indicatore di priorità se presente
  if (contatto.priorita) {
    const prioritaIndicator = document.createElement("div");
    prioritaIndicator.style.width = "10px";
    prioritaIndicator.style.height = "10px";
    prioritaIndicator.style.borderRadius = "50%";
    prioritaIndicator.style.backgroundColor = contatto.priorita;
    prioritaIndicator.style.display = "inline-block";
    prioritaIndicator.style.marginRight = "5px";
    newRow.cells[0].insertBefore(prioritaIndicator, newRow.cells[0].firstChild);
  }
}

// Event listener per il form di nuovo intervento
interventoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const clienteValue = document.getElementById("cliente").value.trim();
  if (!clienteValue) {
    showErrorToast("Il campo Cliente è obbligatorio");
    return;
  }
  const nuovoCliente = {
    cliente: clienteValue,
    indirizzo: document.getElementById("indirizzo").value.trim() || "N/D",
    titolo: document.getElementById("titolo").value.trim() || "N/D",
    tipoIntervento:
      document.getElementById("tipoIntervento").value.trim() || "N/D",
    priorita: document.getElementById("priorita").value,
  };

  aggiungiRigaTabella(tabellaClienti, nuovoCliente, "daPianificare");
  aggiungiRigaRubrica(nuovoCliente);

  interventoForm.reset();
  salvaDati()
    .then(() =>
      showSuccessToast("Nuovo intervento aggiunto e salvato con successo!")
    )
    .catch((error) =>
      showErrorToast("Errore nel salvataggio del nuovo intervento: " + error)
    );
});

function pianificaAppuntamento(button) {
  // Seleziona la riga dell'intervento
  clienteSelezionato = button.closest("tr");

  // Salva il colore di sfondo e la priorità
  const backgroundColor = clienteSelezionato.style.backgroundColor;
  const prioritaIndicator = clienteSelezionato.cells[0].querySelector("div");
  const prioritaColor = prioritaIndicator
    ? prioritaIndicator.style.backgroundColor
    : "";

  // Prepara i dati dell'intervento con i colori
  window.interventoDaPianificare = {
    cliente: clienteSelezionato.cells[0].textContent,
    indirizzo: clienteSelezionato.cells[1].textContent,
    titolo: clienteSelezionato.cells[2].textContent,
    tipoIntervento: clienteSelezionato.cells[3].textContent,
    backgroundColor: clienteSelezionato.style.backgroundColor, // Aggiungi questa riga
    priorita: prioritaColor,
  };

  const modalAppuntamento = document.getElementById("modalAppuntamento");

  // Prepara il form per l'appuntamento
  const dataInput = document.getElementById("dataAppuntamento");
  const oraInput = document.getElementById("oraAppuntamento");

  // Imposta la data odierna come default
  const oggi = new Date();
  const anno = oggi.getFullYear();
  const mese = String(oggi.getMonth() + 1).padStart(2, "0");
  const giorno = String(oggi.getDate()).padStart(2, "0");

  // Formatta la data per l'input
  dataInput.min = `${anno}-${mese}-${giorno}`; // Impedisce la selezione di date passate
  dataInput.value = `${anno}-${mese}-${giorno}`;

  // Imposta l'ora corrente come default
  const ore = String(oggi.getHours()).padStart(2, "0");
  const minuti = String(oggi.getMinutes()).padStart(2, "0");
  oraInput.value = `${ore}:${minuti}`;

  // Popola eventuali altri campi del form se necessario
  const clienteInfo = document.getElementById("clienteInfo");
  if (clienteInfo) {
    clienteInfo.textContent = `Cliente: ${clienteSelezionato.cells[0].textContent}`;
  }

  // Mostra il modal
  modalAppuntamento.style.display = "block";
}

// Modifica anche l'event listener del form
formAppuntamento.addEventListener("submit", (e) => {
  e.preventDefault();
  const dataInput = document.getElementById("dataAppuntamento").value;
  const oraInput = document.getElementById("oraAppuntamento").value;

  const [anno, mese, giorno] = dataInput.split("-");
  const data = new Date(anno, mese - 1, giorno);
  const dataFormattata = formatDataItaliana(data);
  const oraFormattata = oraInput ? oraInput.substring(0, 5) : "N/D";

  const appuntamento = `${dataFormattata} ${oraFormattata}`;

  // Usa i dati salvati dell'intervento
  const interventoInCorso = {
    ...window.interventoDaPianificare,
    appuntamento: appuntamento,
  };

  // Aggiungi alla tabella interventi in corso
  aggiungiRigaTabella(tabellaInterventiInCorso, interventoInCorso, "inCorso");

  // Rimuovi dalla tabella originale
  clienteSelezionato.remove();

  // Chiudi il modal e resetta il form
  document.getElementById("modalAppuntamento").style.display = "none";
  formAppuntamento.reset();

  // Pulisci i dati temporanei
  delete window.interventoDaPianificare;

  // Salva i dati aggiornati
  salvaDati()
    .then(() => {
      showSuccessToast("Appuntamento pianificato e salvato con successo!");
      aggiornaCalendario();
    })
    .catch((error) => {
      showErrorToast("Errore nel salvataggio dell'appuntamento: " + error);
    });
});

// Funzioni per la gestione del collaudo
function apriModalCollaudo(button) {
  clienteSelezionato = button.closest("tr");
  modalCollaudo.style.display = "block";
  caratteriRimanenti.textContent = "Caratteri rimanenti: 250";
  caratteriRimanenti.style.color = "#666";

  // Salva il colore di sfondo per l'intervento completato
  window.interventoInCorsoColor = clienteSelezionato.style.backgroundColor;

  // Imposta la data corrente e l'indirizzo
  document.getElementById("dataCollaudo").valueAsDate = new Date();
  document.getElementById("indirizzoCliente").value =
    clienteSelezionato.cells[1].textContent;

  // Resetta tutti gli altri campi
  document.getElementById("capCittaProvinciaCliente").value = "";
  document.getElementById("nomeRappresentante").value = "";
  document.getElementById("ruoloSelezionato").value = "";
  document.getElementById("dettagliCondomino").value = "";
  document.getElementById("oggettoIntervento").value = "";

  // Resetta la selezione dei pulsanti ruolo
  document.querySelectorAll(".role-button").forEach((button) => {
    button.classList.remove("selected");
  });

  // Nascondi il campo dettagli condomino
  document.getElementById("condominioInternoDetails").style.display = "none";

  // Reset del form completo
  document.getElementById("collaudoForm").reset();

  // Reimposta la data e l'indirizzo dopo il reset del form
  document.getElementById("dataCollaudo").valueAsDate = new Date();
  document.getElementById("indirizzoCliente").value =
    clienteSelezionato.cells[1].textContent;
}

oggettoIntervento.addEventListener("input", function () {
  // Rimuovi eventuali newline dal testo
  this.value = this.value.replace(/\n/g, " ");

  const rimanenti = 250 - this.value.length;
  caratteriRimanenti.textContent = `Caratteri rimanenti: ${rimanenti}`;

  if (rimanenti < 50) {
    caratteriRimanenti.style.color = "#e74c3c";
  } else {
    caratteriRimanenti.style.color = "#666";
  }
});

// Aggiungi questo event listener per prevenire il tasto Invio
oggettoIntervento.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    return false;
  }
});

collaudoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  generaDocumentoCollaudo();
});

document
  .getElementById("chiudiCollaudo")
  .addEventListener("click", function () {
    document.getElementById("modalCollaudo").style.display = "none";

    // Reset di tutti i campi alla chiusura
    document.getElementById("capCittaProvinciaCliente").value = "";
    document.getElementById("nomeRappresentante").value = "";
    document.getElementById("ruoloSelezionato").value = "";
    document.getElementById("dettagliCondomino").value = "";
    document.getElementById("oggettoIntervento").value = "";

    // Resetta la selezione dei pulsanti ruolo
    document.querySelectorAll(".role-button").forEach((button) => {
      button.classList.remove("selected");
    });

    // Nascondi il campo dettagli condomino
    document.getElementById("condominioInternoDetails").style.display = "none";

    // Reset del form
    document.getElementById("collaudoForm").reset();
  });

function generaDocumentoCollaudo() {
  const data = document.getElementById("dataCollaudo").value;
  const indirizzo = document.getElementById("indirizzoCliente").value;
  const capCittaProvincia = document.getElementById(
    "capCittaProvinciaCliente"
  ).value;
  const nomeRappresentante =
    document.getElementById("nomeRappresentante").value;
  const ruoloSelezionato = document.getElementById("ruoloSelezionato").value;
  const dettagliCondomino = document.getElementById("dettagliCondomino").value;
  const oggettoIntervento = document.getElementById("oggettoIntervento").value;
  const caratteriRimanenti = document.getElementById("caratteriRimanenti");

  let ruoloText = ruoloSelezionato;
  if (ruoloSelezionato === "CONDOMINE INTERNO" && dettagliCondomino) {
    ruoloText += ` - ${dettagliCondomino}`;
  }

  modalCollaudo.style.display = "none";
  modalFirmaCollaudo.style.display = "block";

  // Inizializza l'area di firma
  const ctxCollaudo = areaFirmaCollaudo.getContext("2d");
  areaFirmaCollaudo.width = areaFirmaCollaudo.offsetWidth;
  areaFirmaCollaudo.height = areaFirmaCollaudo.offsetHeight;
  ctxCollaudo.fillStyle = "white";
  ctxCollaudo.fillRect(0, 0, areaFirmaCollaudo.width, areaFirmaCollaudo.height);
  ctxCollaudo.strokeStyle = "black";
  ctxCollaudo.lineWidth = 2;
  ctxCollaudo.lineCap = "round";

  let isDrawing = false;

  areaFirmaCollaudo.addEventListener("mousedown", startDrawing);
  areaFirmaCollaudo.addEventListener("mousemove", draw);
  areaFirmaCollaudo.addEventListener("mouseup", stopDrawing);
  areaFirmaCollaudo.addEventListener("mouseout", stopDrawing);

  // Aggiungi supporto per eventi touch
  areaFirmaCollaudo.addEventListener("touchstart", handleTouchStart);
  areaFirmaCollaudo.addEventListener("touchmove", handleTouchMove);
  areaFirmaCollaudo.addEventListener("touchend", handleTouchEnd);

  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
  }

  function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    draw({ clientX: touch.clientX, clientY: touch.clientY });
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    stopDrawing();
  }

  function startDrawing(e) {
    isDrawing = true;
    draw(e);
  }

  function draw(e) {
    if (!isDrawing) return;
    const rect = areaFirmaCollaudo.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxCollaudo.lineTo(x, y);
    ctxCollaudo.stroke();
    ctxCollaudo.beginPath();
    ctxCollaudo.moveTo(x, y);
  }

  function stopDrawing() {
    isDrawing = false;
    ctxCollaudo.beginPath();
  }

  // Salva i dati per essere usati quando si genera il PDF
  window.datiCollaudo = {
    cliente: clienteSelezionato.cells[0].textContent,
    data,
    indirizzo,
    capCittaProvincia,
    nomeRappresentante,
    ruoloText,
    oggettoIntervento,
  };
}

confermaFirmaCollaudo.addEventListener("click", function () {
  console.log("Funzione confermaFirmaCollaudo chiamata");

  const areaFirmaCollaudo = document.getElementById("areaFirmaCollaudo");
  const ctx = areaFirmaCollaudo.getContext("2d");

  // Controlla se l'area di firma è vuota
  const isFirmaVuota = ctx
    .getImageData(0, 0, areaFirmaCollaudo.width, areaFirmaCollaudo.height)
    .data.every((channel) => channel === 0 || channel === 255);

  if (isFirmaVuota) {
    showErrorToast("Per favore, firma prima di continuare.");
    return;
  }

  const LOGO1_URL = "https://i.imgur.com/9lxevm7.png";
  const LOGO2_URL = "https://i.imgur.com/Oih79Ss.jpg";
  const FIRMA_ALIN_URL = "https://i.imgur.com/4aL0pnx.jpg";

  const firmaImage = areaFirmaCollaudo.toDataURL("image/png");

  const pdf = new jsPDF();
  const dati = window.datiCollaudo;

  function addWrappedText(text, x, y, maxWidth, lineHeight, style = {}) {
    pdf.setFont(style.font || "helvetica", style.fontStyle || "normal");
    pdf.setFontSize(style.fontSize || 12);
    if (style.color) pdf.setTextColor(style.color);
    const lines = pdf.splitTextToSize(text, maxWidth);
    for (let i = 0; i < lines.length; i++) {
      pdf.text(lines[i], x, y + i * lineHeight);
    }
    return lines.length * lineHeight;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.error(`Errore nel caricamento dell'immagine: ${url}`, e);
        reject(new Error(`Impossibile caricare l'immagine: ${url}`));
      };
      img.src = url;
    });
  }

  Promise.all([
    loadImage(LOGO1_URL).catch(() => null),
    loadImage(LOGO2_URL).catch(() => null),
    loadImage(FIRMA_ALIN_URL).catch(() => null),
  ])
    .then(([logo1, logo2, firmaAlin]) => {
      // Aggiungi i loghi
      if (logo1) pdf.addImage(logo1, "PNG", 5, 10, 50, 40); // Spostato a destra di 10 unità
      if (logo2) pdf.addImage(logo2, "JPEG", 150, 10, 50, 40);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(0); // Cambiato a nero
      pdf.text("ATTESTAZIONE DI COLLAUDO", 105, 40, null, null, "center");

      pdf.setTextColor(0);
      pdf.setFontSize(12);
      let y = 60;

      function formatDataItaliana(dataString) {
        const data = new Date(dataString);
        const giorno = data.getDate().toString().padStart(2, "0");
        const mese = (data.getMonth() + 1).toString().padStart(2, "0");
        const anno = data.getFullYear();
        return `${giorno}.${mese}.${anno}`;
      }

      y += addWrappedText("Cliente: " + dati.cliente, 10, y, 190, 7, {
        font: "helvetica",
        fontStyle: "bold",
      });
      y += addWrappedText(
        "Data: " + formatDataItaliana(dati.data),
        10,
        y,
        190,
        7,
        { font: "helvetica", fontStyle: "italic" }
      );
      y += addWrappedText("Indirizzo: " + dati.indirizzo, 10, y, 190, 7);
      y += addWrappedText(
        "CAP|Città|Provincia: " + dati.capCittaProvincia,
        10,
        y,
        190,
        7
      );

      y += 10;
      y += addWrappedText(
        "DETTAGLI COMMITTENTE / RAPPRESENTANTE / INCARICATO:",
        10,
        y,
        190,
        7,
        { font: "helvetica", fontStyle: "bold", fontSize: 14 }
      );
      y += addWrappedText("Nome: " + dati.nomeRappresentante, 10, y, 190, 7);
      y += addWrappedText("Ruolo: " + dati.ruoloText, 10, y, 190, 7, {
        font: "helvetica",
        fontStyle: "italic",
      });

      y += 10;
      y += addWrappedText("OGGETTO DELL'INTERVENTO:", 10, y, 190, 7, {
        font: "helvetica",
        fontStyle: "bold",
        fontSize: 14,
      });
      y += addWrappedText(dati.oggettoIntervento, 10, y, 190, 7);

      y += 10;
      y += addWrappedText("DICHIARAZIONE DI COLLAUDO:", 10, y, 190, 7, {
        font: "helvetica",
        fontStyle: "bold",
        fontSize: 14,
      });
      y += addWrappedText(
        "Il sottoscritto, le cui generalità sono sopra indicate, unitamente al tecnico responsabile della ditta Alin System, attesta che in data odierna è stato eseguito il collaudo finale degli interventi elettrici descritti.",
        10,
        y,
        190,
        7
      );

      y += 10;
      y += addWrappedText(
        "Si certifica che il collaudo ha dato esito positivo, dimostrando che i lavori sono stati eseguiti conformemente alle specifiche concordate e soddisfano pienamente le necessità richieste.",
        10,
        y,
        190,
        7,
        { font: "helvetica", fontStyle: "italic" }
      );

      y += 10;
      y += addWrappedText(
        "Il sottoscritto dichiara di accettare il completamento e l'esecuzione dei lavori eseguiti da Alin System e conferma che, a seguito di questo collaudo, non vi sono ulteriori pretese o reclami nei confronti della ditta. Si precisa, inoltre, che tutto il materiale fornito è coperto da una garanzia di 2 anni. Oltre a quanto specificato, non vi sono altre pretese o reclami.",
        10,
        y,
        190,
        7
      );

      // Aggiungi le firme
      let firmaY = pdf.internal.pageSize.height - 40;

      pdf.text("Firma del Committente/Rappresentante/Condomino:", 10, firmaY);
      pdf.addImage(firmaImage, "PNG", 10, firmaY + 5, 50, 25);

      pdf.text("Firma del Tecnico AlinSystem:", 135, firmaY);
      if (firmaAlin) pdf.addImage(firmaAlin, "JPEG", 135, firmaY + 5, 50, 25);

      const pdfBlob = pdf.output("blob");
      const fileName = `collaudo_${dati.cliente}_${formatDataItaliana(
        new Date()
      )}.pdf`;
      const fileRef = storage.ref().child(fileName);

      fileRef
        .put(pdfBlob)
        .then((snapshot) => {
          console.log("Documento di collaudo caricato su Firebase Storage");
          return snapshot.ref.getDownloadURL();
        })
        .then((downloadURL) => {
          console.log("URL di download ottenuto:", downloadURL);
          // Sposta l'intervento nella tabella degli interventi completati
          const interventoCompletato = {
            cliente: dati.cliente,
            indirizzo: dati.indirizzo, // Usa l'indirizzo dal form di collaudo
            titolo: clienteSelezionato.cells[2].textContent,
            tipoIntervento: dati.oggettoIntervento, // Usa l'oggetto intervento dal form di collaudo
            appuntamento: clienteSelezionato.cells[4].textContent,
            priorita:
              clienteSelezionato.cells[0].querySelector("div")?.style
                .backgroundColor || "",
            collaudoUrl: downloadURL,
            backgroundColor: window.interventoInCorsoColor, // Aggiungi questa riga
            // Aggiungi altri campi dal form di collaudo se necessario
            capCittaProvincia: dati.capCittaProvincia,
            nomeRappresentante: dati.nomeRappresentante,
            ruolo: dati.ruoloText,
          };

          // Aggiungi un console.log per debug
          console.log("Dati intervento completato:", interventoCompletato);
          aggiungiRigaTabella(
            tabellaInterventiCompletati,
            interventoCompletato,
            "completati"
          );
          clienteSelezionato.remove();

          return salvaDati();
        })
        .then(() => {
          showSuccessToast(
            "Intervento completato e documento di collaudo salvato con successo!"
          );
          modalFirmaCollaudo.style.display = "none";
        })
        .catch((error) => {
          console.error("Errore durante il processo:", error);
          showErrorToast("Errore: " + error.message);
        });
    })
    .catch((error) => {
      console.error("Errore nel caricamento delle immagini:", error);
      showErrorToast(
        "Errore nel caricamento delle immagini. Il PDF potrebbe non includere tutte le immagini."
      );
      // Continua comunque a generare il PDF senza le immagini
    });
});

function visualizzaCollaudo(button) {
  const elemento = button.closest("tr");
  const collaudoUrl = elemento.dataset.collaudoUrl;

  if (collaudoUrl) {
    window.open(collaudoUrl, "_blank");
  } else {
    showErrorToast(
      "URL del documento di collaudo non trovato per questo intervento."
    );
  }
}

// Funzione per eliminare un intervento
function eliminaIntervento(button) {
  if (confirm("Sei sicuro di voler spostare questo intervento nel cestino?")) {
    const elemento = button.closest("tr");
    const intervento = {
      cliente: elemento.cells[0].textContent,
      indirizzo: elemento.cells[1].textContent,
      titolo: elemento.cells[2].textContent,
      tipoIntervento: elemento.cells[3].textContent,
      appuntamento: elemento.cells[4] ? elemento.cells[4].textContent : "",
      priorita:
        elemento.cells[0].querySelector("div")?.style.backgroundColor || "",
    };

    aggiungiRigaTabella(tabellaCestino, intervento, "cestino");

    elemento.remove();
    salvaDati()
      .then(() => showSuccessToast("Intervento spostato nel cestino"))
      .catch((error) =>
        showErrorToast(
          "Errore nello spostamento dell'intervento nel cestino: " + error
        )
      );
  }
}

function ripristinaIntervento(button) {
  const elemento = button.closest("tr");
  const item = {
    cliente: elemento.cells[0].textContent,
    indirizzo: elemento.cells[1].textContent,
    titolo: elemento.cells[2].textContent,
    tipoIntervento: elemento.cells[3].textContent,
    priorita:
      elemento.cells[0].querySelector("div")?.style.backgroundColor || "",
  };

  if (item.tipoIntervento === "Contatto Rubrica") {
    // Se è un contatto della rubrica, ripristinalo nella rubrica
    aggiungiRigaRubrica(item);
  } else {
    // Se è un intervento, ripristinalo in "Pianifica"
    aggiungiRigaTabella(tabellaClienti, item, "daPianificare");
  }

  elemento.remove();
  salvaDati()
    .then(() =>
      showSuccessToast(
        item.tipoIntervento === "Contatto Rubrica"
          ? "Contatto ripristinato nella rubrica"
          : "Intervento ripristinato e da pianificare"
      )
    )
    .catch((error) => showErrorToast("Errore nel ripristino: " + error));
}

function eliminaDefinitivamente(button) {
  if (
    confirm("Sei sicuro di voler eliminare definitivamente questo intervento?")
  ) {
    const elemento = button.closest("tr");
    elemento.remove();
    salvaDati()
      .then(() => showSuccessToast("Intervento eliminato definitivamente"))
      .catch((error) =>
        showErrorToast(
          "Errore nell'eliminazione definitiva dell'intervento: " + error
        )
      );
  }
}

svuotaCestino.addEventListener("click", () => {
  if (
    confirm(
      "Sei sicuro di voler svuotare il cestino? Questa azione è irreversibile."
    )
  ) {
    tabellaCestino.innerHTML = "";
    salvaDati()
      .then(() => showSuccessToast("Cestino svuotato"))
      .catch((error) =>
        showErrorToast("Errore nello svuotamento del cestino: " + error)
      );
  }
});

// Funzioni per la rubrica
function pianificaInterventoRubrica(button) {
  const elemento = button.closest("tr");
  const nuovoIntervento = {
    cliente: elemento.cells[0].textContent,
    indirizzo: elemento.cells[1].textContent,
    titolo: elemento.cells[2].textContent,
    tipoIntervento: "",
    priorita:
      elemento.cells[0].querySelector("div")?.style.backgroundColor || "",
  };

  aggiungiRigaTabella(tabellaClienti, nuovoIntervento, "daPianificare");

  salvaDati()
    .then(() =>
      showSuccessToast("Intervento aggiunto alla lista da pianificare")
    )
    .catch((error) =>
      showErrorToast(
        "Errore nell'aggiunta dell'intervento da pianificare: " + error
      )
    );
}

function eliminaContattoRubrica(button) {
  if (confirm("Sei sicuro di voler eliminare questo contatto dalla rubrica?")) {
    const elemento = button.closest("tr");
    const contatto = {
      cliente: elemento.cells[0].textContent,
      indirizzo: elemento.cells[1].textContent,
      titolo: elemento.cells[2].textContent,
      tipoIntervento: "Contatto Rubrica",
      priorita:
        elemento.cells[0].querySelector("div")?.style.backgroundColor || "",
    };
    aggiungiRigaTabella(tabellaCestino, contatto, "cestino");

    elemento.remove();
    salvaDati()
      .then(() =>
        showSuccessToast(
          "Contatto eliminato dalla rubrica e spostato nel cestino"
        )
      )
      .catch((error) =>
        showErrorToast(
          "Errore nell'eliminazione del contatto dalla rubrica: " + error
        )
      );
  }
}

// Funzioni per il calendario
function mostraCalendario() {
  document.getElementById("calendarioView").style.display = "block";
  aggiornaCalendario();
}

function aggiornaCalendario() {
  const calendario = document.getElementById("calendario");
  calendario.innerHTML = "";

  const primoGiornoMese = new Date(
    meseCorrente.getFullYear(),
    meseCorrente.getMonth(),
    1
  );
  const ultimoGiornoMese = new Date(
    meseCorrente.getFullYear(),
    meseCorrente.getMonth() + 1,
    0
  );

  // Aggiorna l'intestazione del mese e anno
  document.getElementById("meseAnno").textContent = meseCorrente.toLocaleString(
    "it-IT",
    { month: "long", year: "numeric" }
  );

  // Crea i giorni della settimana
  const giorniSettimana = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  giorniSettimana.forEach((giorno) => {
    const giornoElement = document.createElement("div");
    giornoElement.className = "calendario-giorno-settimana";
    giornoElement.textContent = giorno;
    calendario.appendChild(giornoElement);
  });

  // Aggiungi i giorni vuoti all'inizio del mese
  for (let i = 0; i < primoGiornoMese.getDay(); i++) {
    const giornoVuoto = document.createElement("div");
    giornoVuoto.className = "calendario-giorno vuoto";
    calendario.appendChild(giornoVuoto);
  }

  // Recupera gli interventi in corso
  const interventiInCorso = Array.from(tabellaInterventiInCorso.rows).map(
    (row) => ({
      cliente: row.cells[0].textContent,
      titolo: row.cells[2].textContent,
      appuntamento: row.cells[4].textContent,
    })
  );

  // Aggiungi i giorni del mese
  for (let giorno = 1; giorno <= ultimoGiornoMese.getDate(); giorno++) {
    const giornoElement = document.createElement("div");
    giornoElement.className = "calendario-giorno";
    giornoElement.textContent = giorno;

    const dataGiorno = new Date(
      meseCorrente.getFullYear(),
      meseCorrente.getMonth(),
      giorno
    );
    const interventiGiorno = interventiInCorso.filter((intervento) => {
      const dataIntervento = new Date(
        intervento.appuntamento.split(" ")[0].split(".").reverse().join("-")
      );
      return dataIntervento.toDateString() === dataGiorno.toDateString();
    });

    if (interventiGiorno.length > 0) {
      giornoElement.classList.add("con-eventi");
    }

    if (dataGiorno.toDateString() === new Date().toDateString()) {
      giornoElement.classList.add("oggi");
    }

    giornoElement.addEventListener("click", () => {
      document
        .querySelectorAll(".calendario-giorno")
        .forEach((el) => el.classList.remove("selezionato"));
      giornoElement.classList.add("selezionato");
      mostraEventiGiorno(dataGiorno, interventiGiorno);
    });

    calendario.appendChild(giornoElement);
  }
}

function mostraEventiGiorno(data, eventi) {
  const dataSelezionata = document.getElementById("dataSelezionata");
  const listaEventiGiorno = document.getElementById("listaEventiGiorno");

  dataSelezionata.textContent = formatDataItaliana(data);
  listaEventiGiorno.innerHTML = "";

  if (eventi.length === 0) {
    const noEventi = document.createElement("li");
    noEventi.textContent = "Nessun evento per questa data";
    listaEventiGiorno.appendChild(noEventi);
  } else {
    eventi.sort((a, b) => {
      const oraA = a.appuntamento.split(" ")[1];
      const oraB = b.appuntamento.split(" ")[1];
      return oraA.localeCompare(oraB);
    });

    eventi.forEach((evento) => {
      const eventoElement = document.createElement("li");
      eventoElement.textContent = `${evento.appuntamento.split(" ")[1]} - ${
        evento.cliente
      }: ${evento.titolo}`;
      listaEventiGiorno.appendChild(eventoElement);
    });
  }
}

document.getElementById("prevMonth").addEventListener("click", () => {
  meseCorrente.setMonth(meseCorrente.getMonth() - 1);
  aggiornaCalendario();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  meseCorrente.setMonth(meseCorrente.getMonth() + 1);
  aggiornaCalendario();
});

// Funzioni per aggiornare le liste
function aggiornaListaClientiDaPianificare() {
  // I dati sono già caricati in caricaDati()
}

function aggiornaInterventiInCorso() {
  // I dati sono già caricati in caricaDati()
}

function aggiornaInterventiCompletati() {
  // I dati sono già caricati in caricaDati()
}

function aggiornaRubrica() {
  // I dati sono già caricati in caricaDati()
}

// Funzioni per la gestione delle note
function aggiornaListaNote() {
  db.ref(`${APP_ID}/note`).once("value", (snapshot) => {
    const note = snapshot.val() || [];
    elencoNote.innerHTML = "";
    note.forEach((nota, index) => {
      const notaElement = document.createElement("div");
      notaElement.className = "nota";
      notaElement.innerHTML = `
            <h3>${nota.titolo}</h3>
            <p>${nota.contenuto.substring(0, 100)}${
        nota.contenuto.length > 100 ? "..." : ""
      }</p>
            <small>Creata il: ${new Date(nota.data).toLocaleString()}</small>
            <div class="azioni-nota">
              <button onclick="modificaNota(${index})" class="btn-modifica">Modifica</button>
              <button onclick="eliminaNota(${index})" class="btn-elimina">Elimina</button>
            </div>
          `;
      elencoNote.appendChild(notaElement);
    });
  });
}

document.getElementById("nuovaNota").addEventListener("click", () => {
  modalNuovaNota.style.display = "block";
  titoloNota.value = "";
  contenutoNota.value = "";
  notaSelezionata = null;
});

salvaNota.addEventListener("click", () => {
  const titolo = titoloNota.value;
  const contenuto = contenutoNota.value;
  if (titolo && contenuto) {
    db.ref(`${APP_ID}/note`).once("value", (snapshot) => {
      let note = snapshot.val() || [];
      if (notaSelezionata !== null) {
        // Modifica nota esistente
        note[notaSelezionata] = {
          titolo,
          contenuto,
          data: new Date().toISOString(),
        };
      } else {
        // Aggiungi nuova nota
        note.push({ titolo, contenuto, data: new Date().toISOString() });
      }
      db.ref(`${APP_ID}/note`)
        .set(note)
        .then(() => {
          modalNuovaNota.style.display = "none";
          aggiornaListaNote();
          showSuccessToast("Nota salvata con successo");
        })
        .catch((error) => {
          showErrorToast(
            "Si è verificato un errore durante il salvataggio della nota: " +
              error
          );
        });
    });
  } else {
    showErrorToast(
      "Per favore, inserisci sia il titolo che il contenuto della nota"
    );
  }
});

annullaNota.addEventListener("click", () => {
  modalNuovaNota.style.display = "none";
});

function modificaNota(index) {
  db.ref(`${APP_ID}/note/${index}`).once("value", (snapshot) => {
    const nota = snapshot.val();
    titoloNota.value = nota.titolo;
    contenutoNota.value = nota.contenuto;
    notaSelezionata = index;
    modalNuovaNota.style.display = "block";
  });
}

function eliminaNota(index) {
  if (confirm("Sei sicuro di voler eliminare questa nota?")) {
    db.ref(`${APP_ID}/note/${index}`)
      .remove()
      .then(() => {
        aggiornaListaNote();
        showSuccessToast("Nota eliminata");
      })
      .catch((error) => {
        showErrorToast("Errore durante l'eliminazione della nota: " + error);
      });
  }
}

// Funzioni per la modifica degli interventi e dei contatti
function apriModalModifica(button) {
  const elemento = button.closest("tr");
  clienteSelezionato = elemento;

  document.getElementById("modCliente").value = elemento.cells[0].textContent;
  document.getElementById("modIndirizzo").value = elemento.cells[1].textContent;
  document.getElementById("modTitolo").value = elemento.cells[2].textContent;

  const tipoInterventoField = document.getElementById("modTipoIntervento");
  const tipoInterventoLabel = document.querySelector(
    'label[for="modTipoIntervento"]'
  );

  if (elemento.cells[3]) {
    tipoInterventoField.value = elemento.cells[3].textContent;
    tipoInterventoField.style.display = "block";
    tipoInterventoLabel.style.display = "block";
  } else {
    tipoInterventoField.style.display = "none";
    tipoInterventoLabel.style.display = "none";
  }

  const prioritaField = document.getElementById("modPriorita");
  const prioritaIndicator = elemento.cells[0].querySelector("div");
  if (prioritaIndicator) {
    prioritaField.value = prioritaIndicator.style.backgroundColor;
  } else {
    prioritaField.value = "";
  }

  modalModifica.style.display = "block";
}

formModifica.addEventListener("submit", (e) => {
  e.preventDefault();
  clienteSelezionato.cells[0].textContent =
    document.getElementById("modCliente").value;
  clienteSelezionato.cells[1].textContent =
    document.getElementById("modIndirizzo").value;
  clienteSelezionato.cells[2].textContent =
    document.getElementById("modTitolo").value;

  if (clienteSelezionato.cells[3]) {
    clienteSelezionato.cells[3].textContent =
      document.getElementById("modTipoIntervento").value;
  }

  // Aggiorna la priorità
  const nuovaPriorita = document.getElementById("modPriorita").value;
  let prioritaIndicator = clienteSelezionato.cells[0].querySelector("div");
  if (nuovaPriorita) {
    if (!prioritaIndicator) {
      prioritaIndicator = document.createElement("div");
      prioritaIndicator.style.width = "10px";
      prioritaIndicator.style.height = "10px";
      prioritaIndicator.style.borderRadius = "50%";
      prioritaIndicator.style.display = "inline-block";
      prioritaIndicator.style.marginRight = "5px";
      clienteSelezionato.cells[0].insertBefore(
        prioritaIndicator,
        clienteSelezionato.cells[0].firstChild
      );
    }
    prioritaIndicator.style.backgroundColor = nuovaPriorita;
  } else if (prioritaIndicator) {
    prioritaIndicator.remove();
  }

  modalModifica.style.display = "none";
  salvaDati()
    .then(() => showSuccessToast("Modifiche salvate con successo"))
    .catch((error) =>
      showErrorToast("Errore nel salvataggio delle modifiche: " + error)
    );
});

document.getElementById("annullaModifiche").addEventListener("click", () => {
  modalModifica.style.display = "none";
});

// Gestione della ricerca nella rubrica
document.getElementById("searchRubrica").addEventListener("input", function () {
  const searchTerm = this.value.toLowerCase();
  Array.from(tabellaRubrica.rows).forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? "" : "none";
  });
});

// Gestione della ricerca nelle note
document.getElementById("searchNote").addEventListener("input", function () {
  const searchTerm = this.value.toLowerCase();
  Array.from(elencoNote.children).forEach((nota) => {
    const text = nota.textContent.toLowerCase();
    nota.style.display = text.includes(searchTerm) ? "" : "none";
  });
});

// Inizializzazione dell'applicazione
document.addEventListener("DOMContentLoaded", () => {
  nascondiElementiPrincipali();
  // Altre inizializzazioni se necessarie
});

// Chiusura delle modali cliccando al di fuori
window.onclick = function (event) {
  if (event.target.className === "modal") {
    event.target.style.display = "none";
  }
};

// Gestione dei pulsanti ruolo nel form di collaudo
const roleButtons = document.querySelectorAll(".role-button");
const ruoloSelezionato = document.getElementById("ruoloSelezionato");
const condominioInternoDetails = document.getElementById(
  "condominioInternoDetails"
);

roleButtons.forEach((button) => {
  button.addEventListener("click", function () {
    roleButtons.forEach((btn) => btn.classList.remove("selected"));
    this.classList.add("selected");
    ruoloSelezionato.value = this.dataset.role;

    if (this.dataset.role === "CONDOMINE INTERNO") {
      condominioInternoDetails.style.display = "block";
    } else {
      condominioInternoDetails.style.display = "none";
    }
  });
});

// Gestione del menu hamburger per dispositivi mobili
document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");

  menuToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    sidebar.classList.toggle("open");
  });

  sidebar.addEventListener("click", function (e) {
    if (e.target.tagName === "BUTTON") {
      sidebar.classList.remove("open");
    }
  });

  document.addEventListener("click", function (e) {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
      sidebar.classList.remove("open");
    }
  });

  sidebar.addEventListener("click", function (e) {
    e.stopPropagation();
  });
});
// Funzioni di ricerca
document
  .getElementById("searchPianifica")
  .addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase();
    Array.from(tabellaClienti.rows).forEach((row) => {
      const text = Array.from(row.cells)
        .slice(0, 4)
        .map((cell) => cell.textContent)
        .join(" ")
        .toLowerCase();
      row.style.display = text.includes(searchTerm) ? "" : "none";
    });
  });

document.getElementById("searchInCorso").addEventListener("input", function () {
  const searchTerm = this.value.toLowerCase();
  Array.from(tabellaInterventiInCorso.rows).forEach((row) => {
    const text = Array.from(row.cells)
      .slice(0, 5)
      .map((cell) => cell.textContent)
      .join(" ")
      .toLowerCase();
    row.style.display = text.includes(searchTerm) ? "" : "none";
  });
});

document
  .getElementById("searchCompletati")
  .addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase();
    Array.from(tabellaInterventiCompletati.rows).forEach((row) => {
      const text = Array.from(row.cells)
        .slice(0, 5)
        .map((cell) => cell.textContent)
        .join(" ")
        .toLowerCase();
      row.style.display = text.includes(searchTerm) ? "" : "none";
    });
  });

// Funzione per salvare le preferenze di ordinamento
function salvaPreferenzeOrdinamento(tipo, valore) {
  return db
    .ref(`${APP_ID}/preferenzeOrdinamento/${tipo}`)
    .set(valore)
    .then(() => {
      console.log(`Preferenza ordinamento salvata per ${tipo}: ${valore}`);
    })
    .catch((error) => {
      console.error(
        `Errore nel salvare la preferenza ordinamento per ${tipo}:`,
        error
      );
    });
}

// Funzione per caricare le preferenze di ordinamento
async function caricaPreferenzeOrdinamento() {
  try {
    const snapshot = await db
      .ref(`${APP_ID}/preferenzeOrdinamento`)
      .once("value");
    const preferenze = snapshot.val() || {};
    console.log("Preferenze caricate:", preferenze);

    // Pianifica
    if (preferenze.pianifica) {
      const sortPianifica = document.getElementById("sortPianifica");
      if (sortPianifica) {
        sortPianifica.value = preferenze.pianifica;
        ordinaTabella(tabellaClienti, preferenze.pianifica, "pianifica");
      }
    }

    // In Corso
    if (preferenze.inCorso) {
      const sortInCorso = document.getElementById("sortInCorso");
      if (sortInCorso) {
        sortInCorso.value = preferenze.inCorso;
        ordinaTabella(tabellaInterventiInCorso, preferenze.inCorso, "inCorso");
      }
    }

    // Completati
    if (preferenze.completati) {
      const sortCompletati = document.getElementById("sortCompletati");
      if (sortCompletati) {
        sortCompletati.value = preferenze.completati;
        ordinaTabella(
          tabellaInterventiCompletati,
          preferenze.completati,
          "completati"
        );
      }
    }
  } catch (error) {
    console.error(
      "Errore nel caricamento delle preferenze ordinamento:",
      error
    );
  }
}

// Modifica la funzione caricaDati per gestire correttamente il caricamento delle preferenze
function caricaDati() {
  return Promise.all([
    db.ref(`${APP_ID}/interventi`).once("value"),
    db.ref(`${APP_ID}/rubrica`).once("value"),
  ])
    .then(([interventiSnapshot, rubricaSnapshot]) => {
      console.log("Dati interventi:", interventiSnapshot.val());
      console.log("Dati rubrica:", rubricaSnapshot.val());

      const interventi = interventiSnapshot.val() || {};
      const contatti = rubricaSnapshot.val() || [];

      // Funzione helper per popolare le tabelle
      function popolaTabella(tabella, dati, tipo) {
        tabella.innerHTML = "";
        if (Array.isArray(dati)) {
          if (tipo === "inCorso" || tipo === "completati") {
            dati.sort((a, b) => {
              const dataA = new Date(
                a.appuntamento.split(" ")[0].split(".").reverse().join("-") +
                  "T" +
                  (a.appuntamento.split(" ")[1] || "00:00")
              );
              const dataB = new Date(
                b.appuntamento.split(" ")[0].split(".").reverse().join("-") +
                  "T" +
                  (b.appuntamento.split(" ")[1] || "00:00")
              );
              return dataB - dataA;
            });
          }
          dati.forEach((item, index) => {
            if (tipo === "completati" && index >= 50) {
              return;
            }
            aggiungiRigaTabella(tabella, item, tipo);
          });
        } else {
          console.warn(`I dati per ${tipo} non sono un array:`, dati);
        }
      }

      // Popola le tabelle
      popolaTabella(tabellaClienti, interventi.daPianificare, "daPianificare");
      popolaTabella(tabellaInterventiInCorso, interventi.inCorso, "inCorso");
      popolaTabella(
        tabellaInterventiCompletati,
        interventi.completati,
        "completati"
      );
      popolaTabella(tabellaCestino, interventi.cestino, "cestino");

      // Popola la rubrica
      tabellaRubrica.innerHTML = "";
      if (Array.isArray(contatti)) {
        contatti.sort((a, b) => a.cliente.localeCompare(b.cliente));
        contatti.forEach((contatto) => aggiungiRigaRubrica(contatto));
      } else {
        console.warn("I dati della rubrica non sono un array:", contatti);
      }

      // Carica le preferenze di ordinamento dopo aver popolato le tabelle
      return caricaPreferenzeOrdinamento().then(() => {
        return aggiornaContatori();
      });
    })
    .catch((error) => {
      console.error("Errore nel caricamento dei dati:", error);
      showErrorToast("Errore nel caricamento dei dati: " + error.message);
    });
}

// Funzione generica per ordinare le righe di una tabella
function ordinaTabella(tabella, criterio, tipo) {
  const rows = Array.from(tabella.rows);

  rows.sort((a, b) => {
    if (criterio === "alfabetico") {
      return a.cells[0].textContent
        .toLowerCase()
        .localeCompare(b.cells[0].textContent.toLowerCase());
    } else if (criterio === "priorita") {
      const prioritaA =
        a.cells[0].querySelector("div")?.style.backgroundColor || "";
      const prioritaB =
        b.cells[0].querySelector("div")?.style.backgroundColor || "";

      // Definisci l'ordine corretto delle priorità
      const prioritaOrdine = {
        "rgb(255, 0, 0)": 4, // Rosso (più alta priorità)
        "rgb(255, 165, 0)": 3, // Arancione
        "rgb(144, 238, 144)": 2, // Verde
        "": 1, // Nessuna priorità
      };

      return (
        (prioritaOrdine[prioritaB] || 0) - (prioritaOrdine[prioritaA] || 0)
      );
    } else if (criterio === "dataCresc" || criterio === "dataDesc") {
      const dataIndexA = tipo === "completati" ? 4 : 4;
      const dataA = a.cells[dataIndexA]?.textContent || "";
      const dataB = b.cells[dataIndexA]?.textContent || "";

      const [dayA, monthA, yearA] = dataA.split(" ")[0].split(".");
      const [dayB, monthB, yearB] = dataB.split(" ")[0].split(".");

      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);

      return criterio === "dataCresc" ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  while (tabella.rows.length > 0) {
    tabella.deleteRow(0);
  }

  rows.forEach((row) => tabella.appendChild(row));
}
// Event listeners per i selettori di ordinamento
document
  .getElementById("sortPianifica")
  .addEventListener("change", function () {
    ordinaTabella(tabellaClienti, this.value, "pianifica");
    salvaPreferenzeOrdinamento("pianifica", this.value);
  });

document.getElementById("sortInCorso").addEventListener("change", function () {
  ordinaTabella(tabellaInterventiInCorso, this.value, "inCorso");
  salvaPreferenzeOrdinamento("inCorso", this.value);
});

document
  .getElementById("sortCompletati")
  .addEventListener("change", function () {
    ordinaTabella(tabellaInterventiCompletati, this.value, "completati");
    salvaPreferenzeOrdinamento("completati", this.value);
  });

// Funzione per eliminare un intervento completato
function eliminaInterventoCompletato(button) {
  if (confirm("Sei sicuro di voler eliminare questo intervento completato?")) {
    const elemento = button.closest("tr");

    // Se c'è un URL del PDF nel Firebase Storage, eliminalo
    const collaudoUrl = elemento.dataset.collaudoUrl;
    if (collaudoUrl) {
      // Crea un riferimento al file usando l'URL
      const fileRef = storage.refFromURL(collaudoUrl);

      // Elimina il file
      fileRef
        .delete()
        .then(() => {
          console.log("File PDF eliminato con successo da Storage");
        })
        .catch((error) => {
          console.error("Errore nell'eliminazione del file PDF:", error);
        });
    }

    // Rimuovi la riga dalla tabella
    elemento.remove();

    // Salva i dati aggiornati
    salvaDati()
      .then(() => {
        showSuccessToast("Intervento completato eliminato con successo");
      })
      .catch((error) => {
        showErrorToast(
          "Errore nell'eliminazione dell'intervento completato: " + error
        );
      });
  }
}
// Funzione per aggiornare una riga della tabella
function aggiungiRigaTabella(tabella, intervento, tipo) {
  const newRow = tabella.insertRow();

  // Aggiungi la classe per il colore di sfondo
  newRow.className = "row-colored";
  if (intervento.backgroundColor) {
    newRow.style.backgroundColor = intervento.backgroundColor;
  }

  if (tipo === "completati") {
    newRow.innerHTML = `
            <td data-label="Cliente">${intervento.cliente}</td>
            <td data-label="Indirizzo">${intervento.indirizzo || "N/D"}</td>
            <td data-label="Titolo">${intervento.titolo || "N/D"}</td>
            <td data-label="Tipo Intervento">${
              intervento.tipoIntervento || "N/D"
            }</td>
            <td data-label="Appuntamento">${
              intervento.appuntamento || "N/D"
            }</td>
            <td data-label="Azioni">
                <div class="azioni-intervento">
                    <button onclick="visualizzaCollaudo(this)" class="btn-pdf"><i class="fas fa-file-pdf"></i></button>
                    <button onclick="eliminaInterventoCompletato(this)" class="btn-elimina"><i class="fas fa-trash-alt"></i></button>
                    <div class="color-selector">
                        <span class="color-dot color-yellow" onclick="cambiaColoreRiga(this, '#FFE082')"></span>
                        <span class="color-dot color-blue" onclick="cambiaColoreRiga(this, '#90CAF9')"></span>
                        <span class="color-dot color-magenta" onclick="cambiaColoreRiga(this, '#F8BBD0')"></span>
                        <span class="color-dot color-mint" onclick="cambiaColoreRiga(this, '#B2DFDB')"></span>
                        <span class="color-dot color-peach" onclick="cambiaColoreRiga(this, '#FFCCBC')"></span>
                        <span class="color-dot color-lavender" onclick="cambiaColoreRiga(this, '#E1BEE7')"></span>
                    </div>
                </div>
            </td>
        `;
  } else {
    newRow.innerHTML = `
            <td data-label="Cliente">${intervento.cliente}</td>
            <td data-label="Indirizzo">${intervento.indirizzo}</td>
            <td data-label="Titolo">${intervento.titolo}</td>
            <td data-label="Tipo Intervento">${intervento.tipoIntervento}</td>
            ${
              tipo !== "daPianificare"
                ? `<td data-label="Appuntamento">${
                    intervento.appuntamento || ""
                  }</td>`
                : ""
            }
            <td data-label="Azioni">
                <div class="azioni-intervento">
                    ${
                      tipo === "daPianificare"
                        ? '<button onclick="apriModalModifica(this)" class="btn-modifica"><i class="fas fa-pencil-alt"></i></button>'
                        : ""
                    }
                    ${
                      tipo === "daPianificare"
                        ? '<button onclick="pianificaAppuntamento(this)" class="btn-pianifica"><i class="fas fa-calendar-plus"></i></button>'
                        : ""
                    }
                    ${
                      tipo === "inCorso"
                        ? '<button onclick="apriModalCollaudo(this)" class="btn-collaudo">Collaudo</button>'
                        : ""
                    }
                    ${
                      tipo === "daPianificare" || tipo === "inCorso"
                        ? '<button onclick="eliminaIntervento(this)" class="btn-elimina"><i class="fas fa-trash-alt"></i></button>'
                        : ""
                    }
                    ${
                      tipo === "cestino"
                        ? '<button onclick="ripristinaIntervento(this)" class="btn-ripristina">Ripristina</button>'
                        : ""
                    }
                    ${
                      tipo === "cestino"
                        ? '<button onclick="eliminaDefinitivamente(this)" class="btn-elimina"><i class="fas fa-trash"></i></button>'
                        : ""
                    }
                    <div class="color-selector">
                        <span class="color-dot color-yellow" onclick="cambiaColoreRiga(this, '#FFE082')"></span>
                        <span class="color-dot color-blue" onclick="cambiaColoreRiga(this, '#90CAF9')"></span>
                        <span class="color-dot color-magenta" onclick="cambiaColoreRiga(this, '#F8BBD0')"></span>
                        <span class="color-dot color-mint" onclick="cambiaColoreRiga(this, '#B2DFDB')"></span>
                        <span class="color-dot color-peach" onclick="cambiaColoreRiga(this, '#FFCCBC')"></span>
                        <span class="color-dot color-lavender" onclick="cambiaColoreRiga(this, '#E1BEE7')"></span>
                    </div>
                </div>
            </td>
        `;
  }

  // Aggiungi l'URL del collaudo come attributo data alla riga
  if (intervento.collaudoUrl) {
    newRow.dataset.collaudoUrl = intervento.collaudoUrl;
  }

  // Aggiungi l'indicatore di priorità se presente
  if (intervento.priorita) {
    const prioritaIndicator = document.createElement("div");
    prioritaIndicator.style.width = "10px";
    prioritaIndicator.style.height = "10px";
    prioritaIndicator.style.borderRadius = "50%";
    prioritaIndicator.style.backgroundColor = intervento.priorita;
    prioritaIndicator.style.display = "inline-block";
    prioritaIndicator.style.marginRight = "5px";
    newRow.cells[0].insertBefore(prioritaIndicator, newRow.cells[0].firstChild);
  }
}

// Funzione per cambiare il colore della riga
function cambiaColoreRiga(element, colore) {
  const riga = element.closest("tr");
  riga.style.backgroundColor = colore;

  // Salva il nuovo stato
  salvaDati()
    .then(() => {
      showSuccessToast("Colore aggiornato con successo!");
    })
    .catch((error) => {
      showErrorToast("Errore nel salvataggio del colore: " + error);
    });
}

// Funzione per aggiungere una riga alla rubrica
function aggiungiRigaRubrica(contatto) {
  const newRow = tabellaRubrica.insertRow();
  newRow.className = "row-colored";
  if (contatto.backgroundColor) {
    newRow.style.backgroundColor = contatto.backgroundColor;
  }

  newRow.innerHTML = `
        <td data-label="Cliente">${contatto.cliente}</td>
        <td data-label="Indirizzo">${contatto.indirizzo}</td>
        <td data-label="Titolo">${contatto.titolo}</td>
        <td data-label="Azioni">
            <div class="azioni-intervento">
                <button onclick="apriModalModifica(this)" class="btn-modifica"><i class="fas fa-pencil-alt"></i></button>
                <button onclick="pianificaInterventoRubrica(this)" class="btn-pianifica"><i class="fas fa-calendar-plus"></i></button>
                <button onclick="eliminaContattoRubrica(this)" class="btn-elimina"><i class="fas fa-trash-alt"></i></button>
                <div class="color-selector">
                    <span class="color-dot color-yellow" onclick="cambiaColoreRiga(this, '#FFE082')"></span>
                    <span class="color-dot color-blue" onclick="cambiaColoreRiga(this, '#90CAF9')"></span>
                    <span class="color-dot color-magenta" onclick="cambiaColoreRiga(this, '#F8BBD0')"></span>
                    <span class="color-dot color-mint" onclick="cambiaColoreRiga(this, '#B2DFDB')"></span>
                    <span class="color-dot color-peach" onclick="cambiaColoreRiga(this, '#FFCCBC')"></span>
                    <span class="color-dot color-lavender" onclick="cambiaColoreRiga(this, '#E1BEE7')"></span>
                </div>
            </div>
        </td>
    `;

  // Aggiungi l'indicatore di priorità se presente
  if (contatto.priorita) {
    const prioritaIndicator = document.createElement("div");
    prioritaIndicator.style.width = "10px";
    prioritaIndicator.style.height = "10px";
    prioritaIndicator.style.borderRadius = "50%";
    prioritaIndicator.style.backgroundColor = contatto.priorita;
    prioritaIndicator.style.display = "inline-block";
    prioritaIndicator.style.marginRight = "5px";
    newRow.cells[0].insertBefore(prioritaIndicator, newRow.cells[0].firstChild);
  }
}

// Modifica la funzione salvaDati per includere i colori
function salvaDati() {
  const interventi = {
    daPianificare: Array.from(tabellaClienti.rows).map((row) => ({
      cliente: row.cells[0].textContent,
      indirizzo: row.cells[1].textContent,
      titolo: row.cells[2].textContent,
      tipoIntervento: row.cells[3].textContent,
      priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
      backgroundColor: row.style.backgroundColor || "", // Aggiungi il colore di sfondo
    })),
    inCorso: Array.from(tabellaInterventiInCorso.rows).map((row) => ({
      cliente: row.cells[0].textContent,
      indirizzo: row.cells[1].textContent,
      titolo: row.cells[2].textContent,
      tipoIntervento: row.cells[3].textContent,
      appuntamento: row.cells[4].textContent,
      priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
      backgroundColor: row.style.backgroundColor || "", // Aggiungi il colore di sfondo
    })),
    completati: Array.from(tabellaInterventiCompletati.rows).map((row) => ({
      cliente: row.cells[0].textContent,
      indirizzo: row.cells[1].textContent,
      titolo: row.cells[2].textContent,
      tipoIntervento: row.cells[3].textContent,
      appuntamento: row.cells[4].textContent,
      priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
      collaudoUrl: row.dataset.collaudoUrl || "",
      backgroundColor: row.style.backgroundColor || "",
    })),
    cestino: Array.from(tabellaCestino.rows).map((row) => ({
      cliente: row.cells[0].textContent,
      indirizzo: row.cells[1].textContent,
      titolo: row.cells[2].textContent,
      tipoIntervento: row.cells[3].textContent,
      appuntamento: row.cells[4].textContent,
      priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
      backgroundColor: row.style.backgroundColor || "",
    })),
  };

  const contatti = Array.from(tabellaRubrica.rows).map((row) => ({
    cliente: row.cells[0].textContent,
    indirizzo: row.cells[1].textContent,
    titolo: row.cells[2].textContent,
    priorita: row.cells[0].querySelector("div")?.style.backgroundColor || "",
    backgroundColor: row.style.backgroundColor || "",
  }));

  return Promise.all([
    db.ref(`${APP_ID}/interventi`).set(interventi),
    db.ref(`${APP_ID}/rubrica`).set(contatti),
  ]).then(() => {
    console.log("Dati salvati con successo");
    return aggiornaContatori();
  });
}

// Modifica la funzione aggiornaListaNote per includere i colori
function aggiornaListaNote() {
  db.ref(`${APP_ID}/note`).once("value", (snapshot) => {
    const note = snapshot.val() || [];
    elencoNote.innerHTML = "";
    note.forEach((nota, index) => {
      const notaElement = document.createElement("div");
      notaElement.className = "nota row-colored";
      if (nota.backgroundColor) {
        notaElement.style.backgroundColor = nota.backgroundColor;
      }
      notaElement.innerHTML = `
                <h3>${nota.titolo}</h3>
                <p>${nota.contenuto.substring(0, 100)}${
        nota.contenuto.length > 100 ? "..." : ""
      }</p>
                <small>Creata il: ${new Date(
                  nota.data
                ).toLocaleString()}</small>
                <div class="azioni-nota">
                    <button onclick="modificaNota(${index})" class="btn-modifica">Modifica</button>
                    <button onclick="eliminaNota(${index})" class="btn-elimina">Elimina</button>
                    <div class="color-selector">
                        <span class="color-dot color-yellow" onclick="cambiaColoreNota(this, '#FFE082', ${index})"></span>
                        <span class="color-dot color-blue" onclick="cambiaColoreNota(this, '#90CAF9', ${index})"></span>
                        <span class="color-dot color-magenta" onclick="cambiaColoreNota(this, '#F8BBD0', ${index})"></span>
                        <span class="color-dot color-mint" onclick="cambiaColoreNota(this, '#B2DFDB', ${index})"></span>
                        <span class="color-dot color-peach" onclick="cambiaColoreNota(this, '#FFCCBC', ${index})"></span>
                        <span class="color-dot color-lavender" onclick="cambiaColoreNota(this, '#E1BEE7', ${index})"></span>
                    </div>
                </div>
            `;
      elencoNote.appendChild(notaElement);
    });
  });
}

// Funzione per cambiare il colore di una nota
function cambiaColoreNota(element, colore, index) {
  const nota = element.closest(".nota");
  nota.style.backgroundColor = colore;

  // Aggiorna il colore nel database
  db.ref(`${APP_ID}/note/${index}/backgroundColor`)
    .set(colore)
    .then(() => {
      showSuccessToast("Colore della nota aggiornato!");
    })
    .catch((error) => {
      showErrorToast("Errore nell'aggiornamento del colore: " + error);
    });
}
