// ============================================
// 1. INITIALISATION INDEXEDDB (avec idb)
// ============================================

// Initialiser la base de données
const dbPromise = idb.openDB('inspection-app-db', 1, {
  upgrade(db) {
    db.createObjectStore('photos', { keyPath: 'id' });
    db.createObjectStore('inspections', { keyPath: 'id' });
    db.createObjectStore('archives', { keyPath: 'id' });
  },
});

// Fonctions utilitaires pour IndexedDB
async function saveToDB(store, data) {
  const db = await dbPromise;
  await db.put(store, data);
}

async function getFromDB(store, id) {
  const db = await dbPromise;
  return await db.get(store, id);
}

async function deleteFromDB(store, id) {
  const db = await dbPromise;
  await db.delete(store, id);
}

async function getAllFromDB(store) {
  const db = await dbPromise;
  return await db.getAll(store);
}

// ============================================
// 2. ÉTAT CENTRALISÉ
// ============================================

const state = {
  reponses: [],
  points: [],
  index: 0,
  nomSousStation: "",
  remarquesGenerales: "",
  enModeNonConforme: false,
  inspectionId: null,
};

// ============================================
// 3. CHARGEMENT INITIAL
// ============================================

async function chargerInspectionEnCours() {
  const inspections = await getAllFromDB('inspections');
  if (inspections.length > 0) {
    const lastInspection = inspections[inspections.length - 1];
    state.inspectionId = lastInspection.id;
    state.reponses = lastInspection.reponses || [];
    state.index = lastInspection.index || 0;
    state.nomSousStation = lastInspection.nomSousStation || "";
    state.remarquesGenerales = lastInspection.remarquesGenerales || "";
  } else {
    state.inspectionId = `inspection_${Date.now()}`;
    state.reponses = [];
    state.index = 0;
    state.nomSousStation = "";
    state.remarquesGenerales = "";
    await saveToDB('inspections', {
      id: state.inspectionId,
      reponses: [],
      index: 0,
      nomSousStation: "",
      remarquesGenerales: "",
      dateCreation: new Date().toISOString(),
    });
  }
}

// Charger la checklist
async function chargerChecklist() {
  try {
    const response = await fetch("checklist.json");
    if (!response.ok) throw new Error("Fichier introuvable");
    const data = await response.json();
    if (!Array.isArray(data.points)) throw new Error("Format invalide : 'points' doit être un tableau");
    state.points = data.points;
    afficherPoint();
  } catch (err) {
    console.error(err);
    alert(`Erreur : ${err.message}`);
  }
}

// ============================================
// 4. FONCTIONS DE GESTION DES PHOTOS
// ============================================

// Redimensionner une image en Blob
async function resizeImageToBlob(file, maxWidth = 800, quality = 0.4) {
  const img = new Image();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Impossible de lire l'image"));
    img.src = dataUrl;
  });

  if (!img.width || !img.height) {
    throw new Error("Image invalide");
  }

  const ratio = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");

  ctx.drawImage(img, 0, 0, w, h);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

// Sauvegarder une photo dans IndexedDB
async function sauvegarderPhoto(photoId, blob) {
  await saveToDB('photos', {
    id: photoId,
    blob: blob,
    inspectionId: state.inspectionId,
    date: new Date().toISOString(),
  });
}

// Récupérer une photo depuis IndexedDB
async function recupererPhoto(photoId) {
  const photo = await getFromDB('photos', photoId);
  return photo?.blob;
}

// Supprimer une photo
async function supprimerPhoto(photoId) {
  await deleteFromDB('photos', photoId);
}

// ============================================
// 5. FONCTIONS PRINCIPALES
// ============================================

// Sauvegarder l'inspection en cours
async function sauvegarder() {
  try {
    await saveToDB('inspections', {
      id: state.inspectionId,
      reponses: state.reponses,
      index: state.index,
      nomSousStation: state.nomSousStation,
      remarquesGenerales: state.remarquesGenerales,
      dateModification: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Erreur lors de la sauvegarde :", e);
    alert("Erreur lors de la sauvegarde de l'inspection.");
  }
}

// Afficher un point de contrôle
function afficherPoint() {
  document.getElementById("zoneObservation").classList.remove("obligatoire");
  document.getElementById("commentaire").value = "";
  document.getElementById("btnValiderNonConforme").disabled = true;

  document.getElementById("btnConforme").style.display = "inline-block";
  document.getElementById("btnNonConforme").style.display = "inline-block";
  document.getElementById("btnRetour").style.display = "inline-block";
  document.getElementById("btnValiderNonConforme").style.display = "inline-block";

  state.enModeNonConforme = false;
  document.getElementById("btnConforme").disabled = false;
  document.getElementById("btnNonConforme").disabled = false;

  if (state.index < state.points.length) {
    document.getElementById("categorie").textContent = state.points[state.index].categorie || "";
    document.getElementById("intitule").textContent = state.points[state.index].intitule || "";

    document.getElementById("progression").textContent = `Point ${state.index + 1} / ${state.points.length}`;
    document.getElementById("progressBar").value = ((state.index + 1) / state.points.length) * 100;

    document.getElementById("btnConforme").disabled = false;
    document.getElementById("btnNonConforme").disabled = false;
    document.getElementById("btnRetour").disabled = (state.index === 0);
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

// Bloquer/débloquer les actions
function bloquerActions(bloque) {
  document.getElementById("btnConforme").disabled = bloque;
  document.getElementById("btnNonConforme").disabled = bloque;
  document.getElementById("btnValiderNonConforme").disabled = bloque;
}

// Mode "Non conforme"
function nonConforme() {
  if (state.index >= state.points.length) return;

  state.enModeNonConforme = true;
  document.getElementById("zoneObservation").classList.add("obligatoire");
  document.getElementById("btnValiderNonConforme").disabled = false;
  document.getElementById("btnConforme").disabled = true;
  document.getElementById("btnNonConforme").disabled = true;
}

// Valider un point "Non conforme"
async function validerNonConforme() {
  if (state.index >= state.points.length) return;
  if (!state.enModeNonConforme) return;

  bloquerActions(true);

  try {
    const commentaireEl = document.getElementById("commentaire");
    const photoEl = document.getElementById("photo");

    const commentaire = (commentaireEl.value || "").trim();
    if (!commentaire) {
      alert("⚠️ Commentaire obligatoire pour un point NON CONFORME.");
      return;
    }

    let photoId = null;
    if (photoEl && photoEl.files && photoEl.files.length > 0) {
      const blob = await resizeImageToBlob(photoEl.files[0]);
      photoId = `photo_${Date.now()}`;
      await sauvegarderPhoto(photoId, blob);
    }

    state.reponses.push({
      id: state.points[state.index].id,
      categorie: state.points[state.index].categorie,
      intitule: state.points[state.index].intitule,
      statut: "Non conforme",
      commentaire: commentaire,
      photo: photoId,
    });

    state.index++;
    await sauvegarder();
    afficherPoint();

    state.enModeNonConforme = false;
    commentaireEl.value = "";
    if (photoEl) photoEl.value = "";
    document.getElementById("zoneObservation").classList.remove("obligatoire");

  } catch (err) {
    console.error("Erreur traitement photo Non conforme", err);
    alert(err.message || "Erreur lors du traitement de la photo");
  } finally {
    bloquerActions(false);
    if (state.index < state.points.length) {
      document.getElementById("btnConforme").disabled = false;
      document.getElementById("btnNonConforme").disabled = false;
      document.getElementById("btnValiderNonConforme").disabled = true;
    }
  }
}

// Valider un point "Conforme"
async function conforme() {
  if (state.index >= state.points.length) return;

  bloquerActions(true);

  try {
    const commentaireEl = document.getElementById("commentaire");
    const photoEl = document.getElementById("photo");

    const commentaire = (commentaireEl.value || "").trim();
    let photoId = null;

    if (photoEl && photoEl.files && photoEl.files.length > 0) {
      const blob = await resizeImageToBlob(photoEl.files[0]);
      photoId = `photo_${Date.now()}`;
      await sauvegarderPhoto(photoId, blob);
    }

    state.reponses.push({
      id: state.points[state.index].id,
      categorie: state.points[state.index].categorie,
      intitule: state.points[state.index].intitule,
      statut: "Conforme",
      commentaire: commentaire,
      photo: photoId,
    });

    state.index++;
    await sauvegarder();
    afficherPoint();

    commentaireEl.value = "";
    if (photoEl) photoEl.value = "";

  } catch (err) {
    console.error("Erreur traitement photo Conforme", err);
    alert(err.message || "Erreur lors du traitement de la photo");
  } finally {
    bloquerActions(false);
  }
}

// Retour en arrière
async function retour() {
  if (state.index === 0) return;

  const lastReponse = state.reponses.pop();
  if (lastReponse.photo) {
    await supprimerPhoto(lastReponse.photo);
  }

  state.index--;
  await sauvegarder();
  afficherPoint();
}

// Nouvelle inspection
async function nouvelleInspection() {
  if (!confirm("Démarrer une nouvelle inspection ?")) return;

  await deleteFromDB('inspections', state.inspectionId);

  const photos = await getAllFromDB('photos');
  const photosToDelete = photos.filter(p => p.inspectionId === state.inspectionId);
  for (const photo of photosToDelete) {
    await supprimerPhoto(photo.id);
  }

  state.inspectionId = `inspection_${Date.now()}`;
  state.reponses = [];
  state.index = 0;
  state.nomSousStation = "";
  state.remarquesGenerales = "";

  await saveToDB('inspections', {
    id: state.inspectionId,
    reponses: [],
    index: 0,
    nomSousStation: "",
    remarquesGenerales: "",
    dateCreation: new Date().toISOString(),
  });

  document.getElementById("nomSousStation").value = "";
  afficherPoint();
}

// ============================================
// 6. GÉNÉRATION DU PDF
// ============================================

async function genererPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Helpers
  function imageFormatFromBlob(blob) {
    return blob.type.split('/')[1].toUpperCase();
  }

  function fitContain(imgW, imgH, maxW, maxH) {
    const ratio = Math.min(maxW / imgW, maxH / imgH);
    return { w: imgW * ratio, h: imgH * ratio };
  }

  // En-tête
  let y = 15;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("RAPPORT DE CONTRÔLE – SOUS-STATION", pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(11);
  doc.setFont(undefined, "normal");
  doc.text(`Sous-station : ${state.nomSousStation || "Non renseignée"}`, 15, y);
  y += 6;

  doc.text(`Date : ${new Date().toLocaleDateString()}`, 15, y);
  y += 8;

  if (state.remarquesGenerales) {
    doc.setFont(undefined, "bold");
    doc.text("Remarques générales :", 15, y);
    y += 6;

    doc.setFont(undefined, "normal");
    const lignes = doc.splitTextToSize(state.remarquesGenerales, pageWidth - 30);
    doc.text(lignes, 15, y);
    y += lignes.length * 5 + 6;
  }

  // Récupérer toutes les photos pour cette inspection
  const allPhotos = await getAllFromDB('photos');
  const inspectionPhotos = allPhotos.filter(p => p.inspectionId === state.inspectionId);

  // Créer un mapping photoId -> DataURL (au lieu de Blob)
  const photoMap = {};
  for (const photo of inspectionPhotos) {
    // Convertir le Blob en DataURL
    const dataUrl = await blobToDataURL(photo.blob);
    photoMap[photo.id] = dataUrl;
  }

  const body = state.reponses.map(r => ({
    point: r.intitule || "",
    statut: r.statut || "",
    photo: r.photo ? photoMap[r.photo] : null, // DataURL au lieu de Blob
    remarque: r.commentaire || ""
  }));

  const MIN_PHOTO_ROW_H = 24;

  // Générer le tableau
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
      photo: { cellWidth: 30 },
      remarque: { cellWidth: "auto" }
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.dataKey === "photo") {
        data.cell.text = "";
        data.cell.styles.minCellHeight = data.cell.raw ? MIN_PHOTO_ROW_H : 10;
      }
    },
    didDrawCell: function (data) {
      if (data.section === "body" && data.column.dataKey === "photo") {
        const dataUrl = data.cell.raw; // DataURL au lieu de Blob
        if (!dataUrl) {
          doc.setFontSize(9);
          doc.text("—", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
          return;
        }

        const fmt = dataUrl.startsWith("data:image/webp") ? "WEBP" :
                    dataUrl.startsWith("data:image/png") ? "PNG" :
                    dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "JPEG";

        const padX = data.cell.padding("horizontal");
        const padY = data.cell.padding("vertical");
        const innerX = data.cell.x + padX;
        const innerY = data.cell.y + padY;
        const innerW = data.cell.width - padX * 2;
        const innerH = data.cell.height - padY * 2;

        let imgW = 100, imgH = 100;
        try {
          const props = doc.getImageProperties(dataUrl);
          imgW = props.width;
          imgH = props.height;
        } catch (e) {
          console.error("Erreur lors de la lecture de l'image :", e);
        }

        const fitted = fitContain(imgW, imgH, innerW, innerH);
        const xImg = innerX + (innerW - fitted.w) / 2;
        const yImg = innerY + (innerH - fitted.h) / 2;

        try {
          doc.addImage(dataUrl, fmt, xImg, yImg, fitted.w, fitted.h);
        } catch (e) {
          console.error("Erreur lors de l'ajout de l'image au PDF :", e);
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

  // Sauvegarder le PDF
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Créer une archive
  const dateStr = new Date().toISOString().slice(0, 10);
  const archive = {
    id: `${state.nomSousStation}_${dateStr}_${state.inspectionId}`,
    sousStation: state.nomSousStation,
    date: dateStr,
    inspectionId: state.inspectionId,
    pdf: {
      name: `rapport_${dateStr}.pdf`,
      blob: pdfBlob,
    },
    photos: inspectionPhotos.map((p, i) => ({
      name: `photo_${String(i+1).padStart(3, "0")}.jpg`,
      blob: p.blob,
    })),
  };

  // Sauvegarder l'archive dans IndexedDB
  await saveToDB('archives', archive);

  // Supprimer l'inspection en cours
  await deleteFromDB('inspections', state.inspectionId);

  // Télécharger le PDF
  const a = document.createElement("a");
  a.href = pdfUrl;
  a.download = `rapport_${state.nomSousStation}_${dateStr}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Nettoyer l'URL
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 30000);

  // Réinitialiser l'état
  state.reponses = [];
  state.index = 0;
  state.nomSousStation = "";
  state.remarquesGenerales = "";
  document.getElementById("nomSousStation").value = "";
  afficherPoint();
}

// Fonction pour convertir un Blob en DataURL
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================
// 7. GESTION DES ARCHIVES
// ============================================

// Afficher les archives
async function afficherArchives() {
  const container = document.getElementById("vueArchives");
  container.innerHTML = "<h2>🗂 Archives</h2>";

  const archives = await getAllFromDB('archives');
  if (!archives.length) {
    container.innerHTML += "<p>Aucune archive.</p>";
    return;
  }

  // Groupement par sous-station
  const groupes = {};
  archives.forEach(a => {
    if (!groupes[a.sousStation]) groupes[a.sousStation] = [];
    groupes[a.sousStation].push(a);
  });

  for (const station in groupes) {
    const bloc = document.createElement("div");
    bloc.style.marginBottom = "14px";

    bloc.innerHTML = `<h3>📁 ${station}</h3>`;

    groupes[station].forEach(a => {
      bloc.innerHTML += `
        <div style="
          display:flex;
          align-items:center;
          gap:14px;
          padding:6px 4px;
          border-bottom:1px solid #ddd;
          font-size:15px;">

          <span style="flex:1;">📄 ${a.date}</span>

          <span title="Ouvrir le rapport"
                data-action="open-pdf"
                data-id="${a.id}"
                style="cursor:pointer;">👁️</span>

          <span title="Télécharger le rapport"
                data-action="dl-pdf"
                data-id="${a.id}"
                style="cursor:pointer;">⬇️</span>

          <span title="Télécharger toutes les photos"
                data-action="dl-photos"
                data-id="${a.id}"
                style="cursor:pointer;">📦</span>

          <span title="Supprimer le rapport"
                data-action="delete-report"
                data-id="${a.id}"
                style="cursor:pointer;">🗑️</span>
        </div>
      `;
    });

    container.appendChild(bloc);
  }

  container.onclick = async (e) => {
    const el = e.target;
    const action = el.dataset.action;
    if (!action) return;

    const id = el.dataset.id;
    const archive = await getFromDB('archives', id);
    if (!archive) return alert("Archive introuvable.");

    if (action === "open-pdf") {
      const pdfUrl = URL.createObjectURL(archive.pdf.blob);
      window.open(pdfUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 30000);
    }

    if (action === "dl-pdf") {
      const pdfUrl = URL.createObjectURL(archive.pdf.blob);
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = archive.pdf.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 30000);
    }

    if (action === "dl-photos") {
      await telechargerPhotosArchive(archive);
    }

    if (action === "delete-report") {
      if (confirm("Supprimer ce rapport ?")) {
        await deleteFromDB('archives', id);
        afficherArchives();
      }
    }
  };
}

// Télécharger les photos d'une archive
async function telechargerPhotosArchive(archive) {
  if (!archive.photos?.length) {
    alert("Aucune photo dans ce rapport.");
    return;
  }

  const zip = new JSZip();
  const folder = zip.folder(archive.sousStation + "_" + archive.date);

  for (const photo of archive.photos) {
    folder.file(photo.name, photo.blob);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `photos_${archive.sousStation}_${archive.date}.zip`;
  a.click();

  URL.revokeObjectURL(url);
}

// ============================================
// 8. FONCTIONS UTILITAIRES (UI)
// ============================================

// Afficher une vue (contrôle ou archives)
function afficherVue(vue) {
  document.getElementById("vueControle").style.display = (vue === "controle") ? "block" : "none";
  document.getElementById("vueArchives").style.display = (vue === "archives") ? "block" : "none";

  if (vue === "archives") {
    afficherArchives();
  }
}

// ============================================
// 9. INITIALISATION AU DÉMARRAGE
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  // Charger l'inspection en cours
  await chargerInspectionEnCours();

  // Charger la checklist
  await chargerChecklist();

  // Initialiser le menu
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

  // Gestion du nom de la sous-station
  const champNom = document.getElementById("nomSousStation");
  champNom.value = state.nomSousStation;
  champNom.addEventListener("input", async () => {
    state.nomSousStation = champNom.value.trim();
    await sauvegarder();
  });

  // Gestion des remarques générales
  const champRemarques = document.getElementById("remarquesGenerales");
  if (champRemarques) {
    champRemarques.value = state.remarquesGenerales;
    champRemarques.addEventListener("input", async () => {
      state.remarquesGenerales = champRemarques.value.trim();
      await sauvegarder();
    });
  }

  // Boutons
  document.getElementById("btnPdf").onclick = genererPDF;
  document.getElementById("btnNouvelleInspection").onclick = nouvelleInspection;
  document.getElementById("btnConforme").onclick = conforme;
  document.getElementById("btnNonConforme").onclick = nonConforme;
  document.getElementById("btnValiderNonConforme").onclick = validerNonConforme;
  document.getElementById("btnRetour").onclick = retour;
});

// ============================================
// 10. FONCTION DE MIGRATION (optionnelle)
// ============================================

// Migration des anciennes données depuis localStorage vers IndexedDB
async function migrerAnciennesDonnees() {
  // Récupérer les anciennes inspections
  const oldInspections = Object.keys(localStorage)
    .filter(key => key.startsWith("inspection_"))
    .map(id => {
      return {
        id,
        reponses: JSON.parse(localStorage.getItem(id) || "[]"),
        nom: localStorage.getItem(`${id}_nom`) || "",
        remarques: localStorage.getItem(`${id}_remarques`) || "",
      };
    });

  // Récupérer les anciennes archives
  const oldArchives = JSON.parse(localStorage.getItem("archives") || "[]");

  // Sauvegarder dans IndexedDB
  for (const inspection of oldInspections) {
    await saveToDB('inspections', {
      id: inspection.id,
      reponses: inspection.reponses,
      index: inspection.reponses.length,
      nomSousStation: inspection.nom,
      remarquesGenerales: inspection.remarques,
      dateCreation: new Date().toISOString(),
    });
  }

  for (const archive of oldArchives) {
    // Convertir les DataURL en Blob pour les photos
    const photos = archive.photos.files.map(f => ({
      name: f.name,
      blob: dataUrlToBlob(f.dataUrl),
    }));

    await saveToDB('archives', {
      id: archive.id,
      sousStation: archive.sousStation,
      date: archive.date,
      pdf: {
        name: archive.pdf.name,
        blob: dataUrlToBlob(archive.pdf.dataUrl),
      },
      photos: photos,
    });
  }

  // Nettoyer localStorage
  localStorage.clear();
  alert("Migration terminée ! Les anciennes données ont été transférées vers IndexedDB.");
}

// Fonction utilitaire pour convertir DataURL en Blob
function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "application/octet-stream";
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}