let reponses = [];
let points = [];
let index = 0;
let nomSousStation = "";
let remarquesGenerales = "";

// ✅ Multi-inspections : ID persistant
let inspectionId = localStorage.getItem("inspectionId");
if (!inspectionId) {
  inspectionId = "inspection_" + Date.now();
  localStorage.setItem("inspectionId", inspectionId);
}

document.addEventListener("DOMContentLoaded", () => {

  /* ==========================
     SOUS-STATION
     ========================== */
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

  /* ==========================
     REMARQUES GÉNÉRALES
     ========================== */
  const champRemarques = document.getElementById("remarquesGenerales");
  if (champRemarques) {
    const remarquesSauvegardees =
      localStorage.getItem(inspectionId + "_remarques");

    if (remarquesSauvegardees) {
      remarquesGenerales = remarquesSauvegardees;
      champRemarques.value = remarquesGenerales;
    }

    champRemarques.addEventListener("input", () => {
      remarquesGenerales = champRemarques.value.trim();
      localStorage.setItem(
        inspectionId + "_remarques",
        remarquesGenerales
      );
    });
  }

  /* ==========================
     CHARGEMENT CHECKLIST
     ========================== */
  fetch("checklist.json")
    .then(res => {
      if (!res.ok) throw new Error("Impossible de charger checklist.json");
      return res.json();
    })
    .then(data => {
      points = data.points || [];

      // ✅ Restaurer l’inspection en cours
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

  // Désactiver tous les boutons
  document.querySelectorAll("button").forEach(b => {
    b.disabled = true;
    b.style.display = "block"; // reset visibilité
  });

  const photoConforme = document.getElementById("photoConforme");
  if (photoConforme) photoConforme.value = "";

  const btnRetour = document.getElementById("btnRetour");
  if (btnRetour) btnRetour.disabled = (index === 0);

  // ✅ CAS NORMAL : inspection en cours
  if (index < points.length) {
    document.getElementById("categorie").textContent =
      points[index].categorie || "";

    document.getElementById("intitule").textContent =
      points[index].intitule || "";

    const prog = document.getElementById("progression");
    if (prog) prog.textContent = `Point ${index + 1} / ${points.length}`;

    const bar = document.getElementById("progressBar");
    if (bar) bar.value = ((index + 1) / points.length) * 100;

    document.getElementById("btnConforme").disabled = false;
    document.getElementById("btnNonConforme").disabled = false;
    document.getElementById("btnRetour").disabled = (index === 0);
  } 
  // ✅ CAS FIN : inspection terminée
  else {
    document.getElementById("categorie").textContent = "";
    document.getElementById("intitule").textContent =
      "Inspection terminée ✅";

    const prog = document.getElementById("progression");
    if (prog) prog.textContent = "Inspection terminée";

    const bar = document.getElementById("progressBar");
    if (bar) bar.value = 100;

    // Masquer boutons d’inspection
    document.getElementById("btnConforme").style.display = "none";
    document.getElementById("btnNonConforme").style.display = "none";
    document.getElementById("btnRetour").style.display = "none";

    // ✅ Actions autorisées
    document.getElementById("btnPdf").disabled = false;
    document.getElementById("btnNouvelleInspection").disabled = false;
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

  // Réinitialiser la photo conforme
  const photoConforme = document.getElementById("photoConforme");
  if (photoConforme) photoConforme.value = "";

  // Afficher le bloc NC
  document.getElementById("nonConformeBloc").style.display = "block";

  // ✅ ACTIVER le bouton Valider
  const btnValider = document.getElementById("btnValiderNonConforme");
  if (btnValider) btnValider.disabled = false;
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
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  /* =========================
     EN‑TÊTE
     ========================= */
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(
    "RAPPORT DE CONTRÔLE – SOUS‑STATION",
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 8;

  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(`Sous‑station : ${nomSousStation || "Non renseignée"}`, 15, y);
  y += 6;

  doc.text(`Date : ${new Date().toLocaleDateString()}`, 15, y);
  y += 8;

  /* =========================
     REMARQUES GÉNÉRALES
     ========================= */
  if (remarquesGenerales) {
    doc.setFont(undefined, "bold");
    doc.text("Remarques générales :", 15, y);
    y += 6;

    doc.setFont(undefined, "normal");
    const lignes = doc.splitTextToSize(remarquesGenerales, pageWidth - 30);
    doc.text(lignes, 15, y);
    y += lignes.length * 5 + 6;
  }

  /* =========================
     TABLEAU DES POINTS
     ========================= */
  const rows = [];

  for (const rep of reponses) {
    rows.push([
      rep.intitule || "",
      rep.statut,
      rep.photo ? "Oui" : "Non",
      rep.commentaire || ""
    ]);
  }

  doc.autoTable({
    startY: y,
    head: [[
      "Point vérifié",
      "Statut",
      "Photo",
      "Remarque"
    ]],
    body: rows,

    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: "top"
    },

    headStyles: {
      fillColor: [11, 60, 93], // bleu foncé
      textColor: 255,
      fontStyle: "bold"
    },

    columnStyles: {
      0: { cellWidth: 65 }, // Point vérifié
      1: { cellWidth: 25 }, // Statut
      2: { cellWidth: 20 }, // Photo
      3: { cellWidth: "auto" } // Remarque
    },

    didDrawPage: function (data) {
      // Pied de page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(9);
      doc.text(
        `Page ${data.pageNumber} / ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }
  });

  /* =========================
     PHOTOS EN ANNEXE
     ========================= */
  doc.addPage();
  y = 15;

  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text("Annexe – Photos", 15, y);
  y += 10;

  for (const rep of reponses) {
    if (!rep.photo) continue;

    if (y > 220) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(rep.intitule, 15, y);
    y += 6;

    try {
      doc.addImage(rep.photo, "JPEG", 15, y, 80, 60);
      y += 70;
    } catch {
      doc.text("Photo non affichable", 15, y);
      y += 10;
    }
  }

  doc.save("rapport_controle_sous_station.pdf");
}

