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

  // Nettoyage
  document.getElementById("zoneObservation").classList.remove("obligatoire");
  document.getElementById("commentaire").value = "";
  document.getElementById("photo").value = "";
  document.getElementById("btnValiderNonConforme").disabled = true;

  ajouterReponse("Conforme", "", "");
}

function nonConforme() {
  if (index >= points.length) return;

  // Rendre champs obligatoires visuellement
  document.getElementById("zoneObservation").classList.add("obligatoire");

  // Activer le bouton Valider
  document.getElementById("btnValiderNonConforme").disabled = false;
}

function validerNonConforme() {
  const commentaire = document.getElementById("commentaire").value.trim();
  const fileInput = document.getElementById("photo");

  if (commentaire === "" || fileInput.files.length === 0) {
    alert("Commentaire et photo obligatoires");
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    ajouterReponse("Non conforme", commentaire, reader.result);

    document.getElementById("zoneObservation").classList.remove("obligatoire");
    document.getElementById("commentaire").value = "";
    document.getElementById("photo").value = "";
    document.getElementById("btnValiderNonConforme").disabled = true;
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
  const pageHeight = doc.internal.pageSize.getHeight();

  // ---------- Helpers ----------
  function imageFormatFromDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);/i);
    if (!m) return null;
    const ext = m[1].toLowerCase();
    if (ext === "png") return "PNG";
    if (ext === "jpg" || ext === "jpeg") return "JPEG";
    if (ext === "webp") return "WEBP";
    return null;
  }

  // “contain” : tient dans maxW/maxH sans déformer
  function fitContain(imgW, imgH, maxW, maxH) {
    const ratio = Math.min(maxW / imgW, maxH / imgH);
    return { w: imgW * ratio, h: imgH * ratio };
  }

  // ---------- EN-TÊTE ----------
  let y = 15;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("RAPPORT DE CONTRÔLE – SOUS-STATION", pageWidth / 2, y, { align: "center" }); // centrage fiable [3](https://www.npmjs.com/package/jspdf-autotable?activeTab=versions)
  y += 8;

  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(`Sous‑station : ${nomSousStation || "Non renseignée"}`, 15, y);
  y += 6;

  doc.text(`Date : ${new Date().toLocaleDateString()}`, 15, y);
  y += 8;

  if (typeof remarquesGenerales !== "undefined" && remarquesGenerales) {
    doc.setFont(undefined, "bold");
    doc.text("Remarques générales :", 15, y);
    y += 6;

    doc.setFont(undefined, "normal");
    const lignes = doc.splitTextToSize(remarquesGenerales, pageWidth - 30);
    doc.text(lignes, 15, y);
    y += lignes.length * 5 + 6;
  }

  // ---------- DONNÉES TABLEAU ----------
  const body = reponses.map(r => ({
    point: r.intitule || "",
    statut: r.statut || "",
    photo: r.photo || "",      // DataURL ou ""
    remarque: r.commentaire || ""
  }));

  // Réglages vignette
  const THUMB_PAD = 1.2;      // marge interne
  const MIN_PHOTO_ROW_H = 22; // hauteur mini de ligne si photo (mm)

  // ---------- TABLEAU ----------
  doc.autoTable({
    startY: y,
    head: [[ "Point vérifié", "Statut", "Photo", "Remarque" ]],
    body,
    columns: [
      { header: "Point vérifié", dataKey: "point" },
      { header: "Statut", dataKey: "statut" },
      { header: "Photo", dataKey: "photo" },
      { header: "Remarque", dataKey: "remarque" }
    ], // structure recommandée pour styler/repérer les colonnes [5](https://deepwiki.com/simonbengtsson/jsPDF-AutoTable/2.4-themes-and-styling)

    styles: {
      fontSize: 9,
      cellPadding: 2,
      valign: "top",
      overflow: "linebreak"
    },

    headStyles: {
      fillColor: [11, 60, 93],
      textColor: 255,
      fontStyle: "bold"
    },

    columnStyles: {
      point:    { cellWidth: 75 },
      statut:   { cellWidth: 22 },
      photo:    { cellWidth: 30 },     // un peu plus large = meilleur rendu
      remarque: { cellWidth: "auto" }
    },

    didParseCell: function (data) {
      if (data.section === "body" && data.column.dataKey === "photo") {
        // ✅ Empêche AutoTable d'imprimer la DataURL en texte
        data.cell.text = "";

        const imgData = data.cell.raw;
        data.cell.styles.minCellHeight = imgData ? MIN_PHOTO_ROW_H : 10;
      }
    },

    // 2) Dessiner la photo dans la cellule (adaptation automatique)
    didDrawCell: function (data) {
      if (data.section === "body" && data.column.dataKey === "photo") {
        const imgData = data.cell.raw;

        // Pas de photo
        if (!imgData) {
          doc.setFontSize(9);
          doc.text("—", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
          return;
        }

        // Format image (évite “invisible” si PNG et on force JPEG) [2](https://www.xjavascript.com/blog/is-there-any-way-to-center-text-with-jspdf/)[4](https://stackoverflow.com/questions/35063330/how-to-align-text-in-center-using-jspdf)
        const fmt = imageFormatFromDataUrl(imgData) || "JPEG";

        // Dimensions image si possible
        let imgW = 100, imgH = 100;
        try {
          const props = doc.getImageProperties(imgData);
          imgW = props.width;
          imgH = props.height;
        } catch (e) {
          // fallback
        }

        // Zone dispo dans cellule
        const maxW = data.cell.width - THUMB_PAD * 2;
        const maxH = data.cell.height - THUMB_PAD * 2;

        // “contain” : tient dans la cellule sans déformer
        const fitted = fitContain(imgW, imgH, maxW, maxH);

        // Centrer dans la cellule
        const xImg = data.cell.x + (data.cell.width - fitted.w) / 2;
        const yImg = data.cell.y + (data.cell.height - fitted.h) / 2;

        try {
          doc.addImage(imgData, fmt, xImg, yImg, fitted.w, fitted.h); // insertion image [2](https://www.xjavascript.com/blog/is-there-any-way-to-center-text-with-jspdf/)
        } catch (e) {
          doc.setFontSize(8);
          doc.text("Image\nillisible", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
        }
      }
    }, // didDrawCell = bon hook pour dessiner dans la cellule [1](https://onedrive.live.com/?id=423b5603-b30c-20d0-80ae-cd3000000000&cid=aed0b30c423b5603&web=1)

    // Pagination (simple)
    didDrawPage: function (data) {
      doc.setFontSize(9);
      doc.text(`Page ${data.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }
  });

  doc.save("rapport_controle_sous_station.pdf");
}

