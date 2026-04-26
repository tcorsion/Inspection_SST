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
  document.getElementById("vueControle").style.display =
    vue === "controle" ? "block" : "none";

  document.getElementById("vueArchives").style.display =
    vue === "archives" ? "block" : "none";

  if (vue === "archives" && typeof afficherArchives === "function") {
    afficherArchives();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // MENU (UN SEUL endroit)
  // ==========================
  const menu = document.getElementById("menuLateral");
  const overlay = document.getElementById("overlay");
  const btnMenu = document.getElementById("btnMenu");

  if (btnMenu) btnMenu.onclick = () => {
    menu.classList.add("open");
    overlay.classList.add("show");
  };

  if (overlay) overlay.onclick = () => {
    menu.classList.remove("open");
    overlay.classList.remove("show");
  };

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
  // CHARGEMENT CHECKLIST
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
  // ✅ Désactiver uniquement les boutons de la vue contrôle (sans toucher au menu)
  document.querySelectorAll("#vueControle button").forEach(b => {
    // On ne touche pas au bouton menu s’il est dans vueControle (au cas où)
    if (b.id === "btnMenu") return;
    b.disabled = true;
    b.style.display = "block";
  });

  // Toujours forcer le bouton menu actif si présent
  const btnMenu = document.getElementById("btnMenu");
  if (btnMenu) btnMenu.disabled = false;

  // Reset état non conforme
  const zoneObs = document.getElementById("zoneObservation");
  if (zoneObs) zoneObs.classList.remove("obligatoire");

  const btnValiderNC = document.getElementById("btnValiderNonConforme");
  if (btnValiderNC) btnValiderNC.disabled = true;

  const commentaireEl = document.getElementById("commentaire");
  const photoEl = document.getElementById("photo");
  if (commentaireEl) commentaireEl.value = "";
  if (photoEl) photoEl.value = "";

  const btnRetour = document.getElementById("btnRetour");
  if (btnRetour) btnRetour.disabled = (index === 0);

  if (index < points.length) {
    document.getElementById("categorie").textContent = points[index].categorie || "";
    document.getElementById("intitule").textContent = points[index].intitule || "";

    const prog = document.getElementById("progression");
    if (prog) prog.textContent = `Point ${index + 1} / ${points.length}`;

    const bar = document.getElementById("progressBar");
    if (bar) bar.value = ((index + 1) / points.length) * 100;

    // ✅ Boutons actifs pendant l’inspection
    document.getElementById("btnConforme").disabled = false;
    document.getElementById("btnNonConforme").disabled = false;
    document.getElementById("btnRetour").disabled = (index === 0);
  } else {
    document.getElementById("categorie").textContent = "";
    document.getElementById("intitule").textContent = "Inspection terminée ✅";

    const prog = document.getElementById("progression");
    if (prog) prog.textContent = "Inspection terminée";

    const bar = document.getElementById("progressBar");
    if (bar) bar.value = 100;

    // Masquer boutons décision/retour
    document.getElementById("btnConforme").style.display = "none";
    document.getElementById("btnNonConforme").style.display = "none";
    document.getElementById("btnRetour").style.display = "none";
    document.getElementById("btnValiderNonConforme").style.display = "none";

    // ✅ Actions autorisées à la fin
    document.getElementById("btnPdf").disabled = false;
    document.getElementById("btnNouvelleInspection").disabled = false;
  }
}

function nonConforme() {
  if (index >= points.length) return;

  document.getElementById("zoneObservation").classList.add("obligatoire");
  document.getElementById("btnValiderNonConforme").disabled = false;
}

async function conforme() {
  if (index >= points.length) return;

  const photoEl = document.getElementById("photo");
  let dataUrl = "";

  if (photoEl && photoEl.files && photoEl.files.length > 0) {
    dataUrl = await fileToDataUrlWithHeicSupport(photoEl.files[0]);
  }

  ajouterReponse("Conforme", "", dataUrl);

  document.getElementById("zoneObservation").classList.remove("obligatoire");
  document.getElementById("commentaire").value = "";
  if (photoEl) photoEl.value = "";
  document.getElementById("btnValiderNonConforme").disabled = true;
}

async function validerNonConforme() {
  if (index >= points.length) return;

  const commentaireEl = document.getElementById("commentaire");
  const photoEl = document.getElementById("photo");

  const commentaire = (commentaireEl.value || "").trim();
  if (!commentaire) return alert("Commentaire obligatoire");
  if (!photoEl.files || photoEl.files.length === 0) return alert("Photo obligatoire");

  const dataUrl = await fileToDataUrlWithHeicSupport(photoEl.files[0]);
  ajouterReponse("Non conforme", commentaire, dataUrl);

  document.getElementById("zoneObservation").classList.remove("obligatoire");
  commentaireEl.value = "";
  photoEl.value = "";
  document.getElementById("btnValiderNonConforme").disabled = true;
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

async function fileToDataUrlWithHeicSupport(file) {
  const isHeic =
    (file.type && file.type.toLowerCase().includes("heic")) ||
    (file.name && file.name.toLowerCase().endsWith(".heic")) ||
    (file.type && file.type.toLowerCase().includes("heif")) ||
    (file.name && file.name.toLowerCase().endsWith(".heif"));

  let blobToRead = file;

  if (isHeic && window.heic2any) {
    blobToRead = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85
    });
  }

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blobToRead);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("menuLateral");
  const overlay = document.getElementById("overlay");
  const btnMenu = document.getElementById("btnMenu");

  if (btnMenu) btnMenu.onclick = () => {
    menu.classList.add("open");
    overlay.classList.add("show");
  };

  if (overlay) overlay.onclick = () => {
    menu.classList.remove("open");
    overlay.classList.remove("show");
  };

  document.querySelectorAll("#menuLateral li").forEach(li => {
    li.onclick = () => {
      afficherVue(li.dataset.view);
      menu.classList.remove("open");
      overlay.classList.remove("show");
    };
  });
});

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
