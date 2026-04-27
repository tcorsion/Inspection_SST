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

function afficherVue(vue) {
  document.getElementById("vueControle").style.display = (vue === "controle") ? "block" : "none";
  document.getElementById("vueArchives").style.display = (vue === "archives") ? "block" : "none";

  if (vue === "archives" && typeof afficherArchives === "function") {
    afficherArchives();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // MENU (UN SEUL ENDROIT)
  // ==========================
  const menu = document.getElementById("menuLateral");
  const overlay = document.getElementById("overlay");
  const btnMenu = document.getElementById("btnMenu");

  btnMenu.onclick = () => { menu.classList.add("open"); overlay.classList.add("show"); };
  overlay.onclick = () => { menu.classList.remove("open"); overlay.classList.remove("show"); };

  document.querySelectorAll("#menuLateral li").forEach(li => {
    li.onclick = () => {
      afficherVue(li.dataset.view);
      menu.classList.remove("open");
      overlay.classList.remove("show");
    };
  });

  // ==========================
  // SOUS-STATION
  // ==========================
  const champNom = document.getElementById("nomSousStation");
  const nomSauvegarde = localStorage.getItem(inspectionId + "_nom");
  if (nomSauvegarde) {
    nomSousStation = nomSauvegarde;
    champNom.value = nomSousStation;
  }
  champNom.addEventListener("input", () => {
    nomSousStation = champNom.value.trim();
    localStorage.setItem(inspectionId + "_nom", nomSousStation);
  });

  // ==========================
  // REMARQUES (si champ présent)
  // ==========================
  const champRemarques = document.getElementById("remarquesGenerales");
  if (champRemarques) {
    const rem = localStorage.getItem(inspectionId + "_remarques");
    if (rem) {
      remarquesGenerales = rem;
      champRemarques.value = remarquesGenerales;
    }
    champRemarques.addEventListener("input", () => {
      remarquesGenerales = champRemarques.value.trim();
      localStorage.setItem(inspectionId + "_remarques", remarquesGenerales);
    });
  }

  // ==========================
  // CHARGEMENT CHECKLIST (UNE SEULE FOIS)
  // ==========================
  fetch("checklist.json")
    .then(res => {
      if (!res.ok) throw new Error("Impossible de charger checklist.json");
      return res.json();
    })
    .then(data => {
      points = data.points || [];

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
  // Reset visuel
  document.getElementById("zoneObservation").classList.remove("obligatoire");
  document.getElementById("commentaire").value = "";
  document.getElementById("btnValiderNonConforme").disabled = true;

  if (index < points.length) {
    document.getElementById("categorie").textContent = points[index].categorie || "";
    document.getElementById("intitule").textContent = points[index].intitule || "";

    document.getElementById("progression").textContent = `Point ${index + 1} / ${points.length}`;
    document.getElementById("progressBar").value = ((index + 1) / points.length) * 100;

    document.getElementById("btnConforme").disabled = false;
    document.getElementById("btnNonConforme").disabled = false;
    document.getElementById("btnRetour").disabled = (index === 0);
  } else {
    document.getElementById("categorie").textContent = "";
    document.getElementById("intitule").textContent = "Inspection terminée ✅";
    document.getElementById("progression").textContent = "Inspection terminée";
    document.getElementById("progressBar").value = 100;

    document.getElementById("btnConforme").style.display = "none";
    document.getElementById("btnNonConforme").style.display = "none";
    document.getElementById("btnRetour").style.display = "none";
    document.getElementById("btnValiderNonConforme").style.display = "none";

    document.getElementById("btnPdf").disabled = false;
    document.getElementById("btnNouvelleInspection").disabled = false;
  }
}

function bloquerActions(bloque) {
  document.getElementById("btnConforme").disabled = bloque;
  document.getElementById("btnNonConforme").disabled = bloque;
  document.getElementById("btnValiderNonConforme").disabled = bloque;
}

function nonConforme() {
  if (index >= points.length) return;
  document.getElementById("zoneObservation").classList.add("obligatoire");
  document.getElementById("btnValiderNonConforme").disabled = false;
}

async function conforme() {
  if (index >= points.length) return;

  bloquerActions(true);

  try {
    const commentaireEl = document.getElementById("commentaire");
    const photoEl = document.getElementById("photo");

    const commentaire = (commentaireEl.value || "").trim();
    let dataUrl = "";

    if (photoEl && photoEl.files && photoEl.files.length > 0) {
      // ✅ On prend directement la version JPEG réduite
      dataUrl = await resizeImageToDataURL(photoEl.files[0]);

      if (!dataUrl.startsWith("data:image/jpeg")) {
        throw new Error("Format photo non supporté");
      }
    }

    ajouterReponse("Conforme", commentaire, dataUrl);

    commentaireEl.value = "";
    if (photoEl) photoEl.value = "";

  } catch (err) {
    console.error("Erreur traitement photo Conforme", err);
    alert(err.message || "Erreur lors du traitement de la photo");
  } finally {
    bloquerActions(false);
  }
}

async function conforme() {
  if (index >= points.length) return;

  bloquerActions(true);

  try {
    const commentaireEl = document.getElementById("commentaire");
    const photoEl = document.getElementById("photo");

    const commentaire = (commentaireEl.value || "").trim();
    let dataUrl = "";

    if (photoEl && photoEl.files && photoEl.files.length > 0) {
      // ✅ On prend directement la version JPEG réduite
      dataUrl = await resizeImageToDataURL(photoEl.files[0]);

      if (!dataUrl.startsWith("data:image/jpeg")) {
        throw new Error("Format photo non supporté");
      }
    }

    ajouterReponse("Conforme", commentaire, dataUrl);

    commentaireEl.value = "";
    if (photoEl) photoEl.value = "";

  } catch (err) {
    console.error("Erreur traitement photo Conforme", err);
    alert(err.message || "Erreur lors du traitement de la photo");
  } finally {
    bloquerActions(false);
  }
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
  console.log("✅ Index après ajout =", index);
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

  inspectionId = "inspection_" + Date.now();
  localStorage.setItem("inspectionId", inspectionId);

  reponses = [];
  index = 0;

  nomSousStation = "";
  document.getElementById("nomSousStation").value = "";
  localStorage.removeItem(inspectionId + "_nom");

  sauvegarder();
  afficherPoint();
}

function sauvegarder() {
  try {
    localStorage.setItem(inspectionId, JSON.stringify(reponses));
  } catch (e) {
    // QuotaExceededError (Edge/Chrome)
    alert("Stockage plein (trop de photos). Génère le PDF puis démarre une nouvelle inspection.");
    console.error(e);
  }
}

async function resizeImageToDataURL(file, maxWidth = 1024) {
  const img = document.createElement("img");
  const dataUrl = await fileToDataUrlWithHeicSupport(file);

  return new Promise(resolve => {
    img.onload = () => {
      const ratio = maxWidth / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = img.height * ratio;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/jpeg", 0.5));
    };
    img.src = dataUrl;
  });
}

// Redimensionne + compresse en JPEG (utile pour éviter les fichiers énormes)
// - maxWidth : largeur maxi (1024 recommandé)
// - quality : qualité JPEG (0.55 à 0.7 selon besoin)
async function resizeImageToDataURL(file, maxWidth = 1024, quality = 0.55) {
  const img = new Image();

  // Lire le fichier en DataURL
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Charger l'image
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Impossible de lire l'image"));
    img.src = dataUrl;
  });

  // Sécurité dimensions
  if (!img.width || !img.height) {
    throw new Error("Image invalide");
  }

  // Calcul des dimensions finales
  const ratio = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  // Canvas
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas non supporté");
  }

  // ✅ APPEL CORRECT : 5 arguments
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
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

  function fitContain(imgW, imgH, maxW, maxH) {
    const ratio = Math.min(maxW / imgW, maxH / imgH);
    return { w: imgW * ratio, h: imgH * ratio };
  }

  // ---------- EN-TÊTE ----------
  let y = 15;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("RAPPORT DE CONTRÔLE – SOUS-STATION", pageWidth / 2, y, { align: "center" });
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

  // Hauteur mini si photo présente
  const MIN_PHOTO_ROW_H = 24;

  // ---------- TABLEAU ----------
  doc.autoTable({
    startY: y,
    head: [["Point vérifié", "Statut", "Photo", "Remarque"]],
    body,
    columns: [
      { header: "Point vérifié", dataKey: "point" },
      { header: "Statut", dataKey: "statut" },
      { header: "Photo", dataKey: "photo" },
      { header: "Remarque", dataKey: "remarque" }
    ],

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
      point: { cellWidth: 75 },
      statut: { cellWidth: 22 },
      photo: { cellWidth: 30 },     // largeur colonne photo
      remarque: { cellWidth: "auto" }
    },

    didParseCell: function (data) {
      if (data.section === "body" && data.column.dataKey === "photo") {
        // ✅ Empêche AutoTable d'imprimer la DataURL (base64) en texte
        data.cell.text = "";

        const imgData = data.cell.raw;
        data.cell.styles.minCellHeight = imgData ? MIN_PHOTO_ROW_H : 10;
      }
    },

    didDrawCell: function (data) {
      if (data.section === "body" && data.column.dataKey === "photo") {
        const imgData = data.cell.raw;

        if (!imgData) {
          doc.setFontSize(9);
          doc.text("—", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
          return;
        }

        const fmt = imageFormatFromDataUrl(imgData) || "JPEG";

        // ✅ Rectangle intérieur (cellule - padding) → évite la superposition sur Remarque
        const padX = data.cell.padding("horizontal");
        const padY = data.cell.padding("vertical");

        const innerX = data.cell.x + padX;
        const innerY = data.cell.y + padY;
        const innerW = data.cell.width - padX * 2;
        const innerH = data.cell.height - padY * 2;

        // Dimensions image
        let imgW = 100, imgH = 100;
        try {
          const props = doc.getImageProperties(imgData);
          imgW = props.width;
          imgH = props.height;
        } catch (e) {}

        // Contain (sans déborder)
        const fitted = fitContain(imgW, imgH, innerW, innerH);

        // Centre dans la cellule
        const xImg = innerX + (innerW - fitted.w) / 2;
        const yImg = innerY + (innerH - fitted.h) / 2;

        try {
          doc.addImage(imgData, fmt, xImg, yImg, fitted.w, fitted.h);
        } catch (e) {
          doc.setFontSize(8);
          doc.text("Image\nillisible", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
        }
      }
    },

    didDrawPage: function (data) {
      doc.setFontSize(9);
      doc.text(`Page ${data.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }
  });

    doc.save("rapport_controle_sous_station.pdf");

    const dateStr = new Date().toISOString().slice(0, 10);

  const archive = {
    id: `${nomSousStation}_${dateStr}`,
    sousStation: nomSousStation,
    date: dateStr,

    pdf: {
      name: `rapport_${dateStr}.pdf`,
      dataUrl: doc.output("datauristring")
    },

    photos: {
      folder: dateStr,
      files: reponses
        .filter(r => r.photo)
        .map((r, i) => ({
          name: `photo_${String(i+1).padStart(3,"0")}.jpg`,
          dataUrl: r.photo
        }))
    }
  };

  sauvegarderArchive(archive);

}

const overlay = document.getElementById("overlay");

document.getElementById("btnMenu").onclick = () => {
  menu.classList.add("open");
  overlay.classList.add("show");
};

overlay.onclick = () => {
  menu.classList.remove("open");
  overlay.classList.remove("show");
};

menu.querySelectorAll("li").forEach(item => {
  item.onclick = () => {
    afficherVue(item.dataset.view);
    menu.classList.remove("open");
    overlay.classList.remove("show");
  };
});

function sauvegarderArchive(archive) {
  const archives = JSON.parse(localStorage.getItem("archives") || "[]");
  archives.push(archive);
  localStorage.setItem("archives", JSON.stringify(archives));
}

function afficherArchives() {
  const container = document.getElementById("vueArchives");
  container.innerHTML = "<h2>Archives</h2>";

  const archives = JSON.parse(localStorage.getItem("archives") || "[]");

  const groupes = {};
  archives.forEach(a => {
    if (!groupes[a.sousStation]) groupes[a.sousStation] = [];
    groupes[a.sousStation].push(a);
  });

  for (const station in groupes) {
    const div = document.createElement("div");
    div.innerHTML = `<h3>📁 ${station}</h3>`;

    groupes[station].forEach(a => {
      div.innerHTML += `
        <div>
          📄 <a href="${a.pdf.dataUrl}" target="_blank">${a.pdf.name}</a>
          <div style="margin-left:20px;">
            📁 ${a.photos.folder}
            ${a.photos.files.map(p =>
              `<div>📷 <a href="${p.dataUrl}" target="_blank">${p.name}</a></div>`
            ).join("")}
          </div>
        </div>
      `;
    });

    container.appendChild(div);
  }
}
