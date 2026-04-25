let reponses = [];
let points = [];
let index = 0;
let nomSousStation = "";

// ✅ Multi-inspections : ID persistant
let inspectionId = localStorage.getItem("inspectionId");
if (!inspectionId) {
  inspectionId = "inspection_" + Date.now();
  localStorage.setItem("inspectionId", inspectionId);
}

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Gestion du champ "nomSousStation" (DOM prêt)
  const champNom = document.getElementById("nomSousStation");
  if (champNom) {
    const nomSauvegarde = localStorage.getItem(inspectionId + "_nom");
    if (nomSauvegarde) {
      nomSousStation = nomSauvegarde;
      champNom.value = nomSousStation;
    }

    champNom.addEventListener("input", () => {
      nomSousStation = champNom.value.trim();
      localStorage.setItem(inspectionId + "_nom", nomSousStation);
    });
  }

  // ✅ Charger la checklist
  fetch("checklist.json")
    .then(res => {
      if (!res.ok) throw new Error("Impossible de charger checklist.json");
      return res.json();
    })
    .then(data => {
      points = data.points || [];

      // ✅ Charger la sauvegarde de CETTE inspection
      const sauvegarde = localStorage.getItem(inspectionId);
      if (sauvegarde) {
        reponses = JSON.parse(sauvegarde);
        index = reponses.length;
      }

      afficherPoint();
    })
    .catch(err => {
      console.error(err);
      alert("Erreur : checklist.json introuvable ou invalide.");
    });
});

function afficherPoint() {
  const blocNC = document.getElementById("nonConformeBloc");
  if (blocNC) blocNC.style.display = "none";

  document.querySelectorAll("button").forEach(b => (b.disabled = true));

  const photoConforme = document.getElementById("photoConforme");
  if (photoConforme) photoConforme.value = "";

  const btnRetour = document.getElementById("btnRetour");
  if (btnRetour) btnRetour.disabled = (index === 0);

  if (index < points.length) {
    document.getElementById("categorie").textContent = points[index].categorie || "";
    document.getElementById("intitule").textContent = points[index].intitule || "";

    const prog = document.getElementById("progression");
    if (prog) prog.textContent = `Point ${index + 1} / ${points.length}`;

    const bar = document.getElementById("progressBar");
    if (bar) bar.value = ((index + 1) / points.length) * 100;

    document.getElementById("btnConforme").disabled = false;
    document.getElementById("btnNonConforme").disabled = false;
  } else {
    document.getElementById("categorie").textContent = "";
    document.getElementById("intitule").textContent = "Inspection terminée ✅";

    const prog = document.getElementById("progression");
    if (prog) prog.textContent = "Inspection terminée";

    const bar = document.getElementById("progressBar");
    if (bar) bar.value = 100;

    document.getElementById("btnPdf").disabled = false;
  }
}

function conforme() {
  if (index >= points.length) return;

  const fileInput = document.getElementById("photoConforme");

  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = function () {
      ajouterReponse("Conforme", "", reader.result);
      fileInput.value = "";
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    ajouterReponse("Conforme", "", "");
  }
}

function nonConforme() {
  if (index >= points.length) return;

  const photoConforme = document.getElementById("photoConforme");
  if (photoConforme) photoConforme.value = "";

  document.getElementById("nonConformeBloc").style.display = "block";
}

function validerNonConforme() {
  if (index >= points.length) return;

  const commentaire = document.getElementById("commentaire").value.trim();
  const fileInput = document.getElementById("photo");

  if (commentaire === "" || !fileInput || fileInput.files.length === 0) {
    alert("Commentaire et photo obligatoires");
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    ajouterReponse("Non conforme", commentaire, reader.result);

    document.getElementById("nonConformeBloc").style.display = "none";
    document.getElementById("commentaire").value = "";
    document.getElementById("photo").value = "";

    const photoConforme = document.getElementById("photoConforme");
    if (photoConforme) photoConforme.value = "";
  };
  reader.readAsDataURL(fileInput.files[0]);
}

function ajouterReponse(statut, commentaire, photo) {
  reponses.push({
    id: points[index].id,
    categorie: points[index].categorie,
    intitule: points[index].intitule,
    statut,
    commentaire: commentaire || "",
    photo: photo || ""
  });

  sauvegarder();
  index++;
  afficherPoint();
}

function retour() {
  if (index === 0) return;

  index--;
  reponses.pop();
  sauvegarder();
  afficherPoint();
}

function nouvelleInspection() {
  if (!confirm("Démarrer une nouvelle inspection ?")) return;

  // On crée une nouvelle inspection (on conserve les anciennes dans le storage)
  inspectionId = "inspection_" + Date.now();
  localStorage.setItem("inspectionId", inspectionId);

  reponses = [];
  index = 0;

  // ✅ Reset du nom de sous-station pour cette nouvelle inspection
  nomSousStation = "";
  const champNom = document.getElementById("nomSousStation");
  if (champNom) champNom.value = "";
  localStorage.removeItem(inspectionId + "_nom");

  sauvegarder();
  afficherPoint();
}

function sauvegarder() {
  localStorage.setItem(inspectionId, JSON.stringify(reponses));
}

async function genererPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 10;

  doc.setFontSize(16);
  doc.text("Rapport de contrôle – Sous-station", 10, y);
  y += 10;

  // ✅ Sous-station contrôlée
  doc.setFontSize(12);
  doc.text("Sous‑station : " + (nomSousStation || "Non renseignée"), 10, y);
  y += 8;

  doc.setFontSize(10);
  doc.text("Date : " + new Date().toLocaleDateString(), 10, y);
  y += 10;

  for (const rep of reponses) {
    if (y > 260) {
      doc.addPage();
      y = 10;
    }

    doc.setFontSize(11);
    doc.text(`${rep.categorie}`, 10, y);
    y += 5;

    doc.setFontSize(10);
    doc.text(`- ${rep.intitule}`, 10, y);
    y += 5;

    doc.text(`Statut : ${rep.statut}`, 10, y);
    y += 5;

    if (rep.commentaire) {
      doc.text(`Commentaire : ${rep.commentaire}`, 10, y);
      y += 5;
    }

    if (rep.photo) {
      try {
        doc.addImage(rep.photo, "JPEG", 10, y, 60, 45);
        y += 50;
      } catch (e) {
        doc.text("Photo non affichable", 10, y);
        y += 5;
      }
    }

    y += 5;
  }

  doc.save("rapport_sous_station.pdf");
}
