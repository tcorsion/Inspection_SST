let reponses = [];
let points = [];
let index = 0;

fetch("checklist.json")
  .then(res => res.json())
  .then(data => {
    points = data.points;

    const sauvegarde = localStorage.getItem("inspection");
    if (sauvegarde) {
      reponses = JSON.parse(sauvegarde);
      index = reponses.length;
    }

    afficherPoint();
  });

function afficherPoint() {
  document.getElementById("nonConformeBloc").style.display = "none";

  // Désactive tout d’abord
  document.querySelectorAll("button").forEach(b => b.disabled = true);

  document.getElementById("photoConforme").value = "";

  if (index < points.length) {
    document.getElementById("categorie").textContent =
      points[index].categorie;

    document.getElementById("intitule").textContent =
      points[index].intitule;

    // ✅ RÉACTIVATION des boutons principaux
    document.getElementById("btnConforme").disabled = false;
    document.getElementById("btnNonConforme").disabled = false;

  } else {
    document.getElementById("categorie").textContent = "";
    document.getElementById("intitule").textContent =
      "Inspection terminée ✅";

    // ✅ Activer le bouton PDF
    document.getElementById("btnPdf").disabled = false;
  }
}

function conforme() {
  const fileInput = document.getElementById("photoConforme");

  if (index >= points.length) return;

  if (fileInput.files.length > 0) {
    const reader = new FileReader();

    reader.onload = function () {
      reponses.push({
        id: points[index].id,
        categorie: points[index].categorie,
        intitule: points[index].intitule,
        statut: "Conforme",
        commentaire: "",
        photo: reader.result
      });

      sauvegarder();
      fileInput.value = "";
      index++;
      afficherPoint();
    };

    reader.readAsDataURL(fileInput.files[0]);
  } else {
    // Conforme sans photo
    reponses.push({
      id: points[index].id,
      categorie: points[index].categorie,
      intitule: points[index].intitule,
      statut: "Conforme",
      commentaire: "",
      photo: ""
    });

    sauvegarder();
    index++;
    afficherPoint();
  }
}

// ✅ NOUVELLE FONCTION
function validerNonConforme() {
  const commentaire = document.getElementById("commentaire").value.trim();
  const fileInput = document.getElementById("photo");

  if (index >= points.length) return;

  if (commentaire === "" || fileInput.files.length === 0) {
    alert("Commentaire et photo obligatoires");
    return;
  }

  const reader = new FileReader();

  reader.onload = function () {
    reponses.push({
      id: points[index].id,
      categorie: points[index].categorie,
      intitule: points[index].intitule,
      statut: "Non conforme",
      commentaire: commentaire,
      photo: reader.result
    });

    sauvegarder();

    document.getElementById("nonConformeBloc").style.display = "none";
    document.getElementById("commentaire").value = "";
    document.getElementById("photo").value = "";
    document.getElementById("photoConforme").value = "";
    index++;
    afficherPoint();
  };

  reader.readAsDataURL(fileInput.files[0]);
  
}

function nonConforme() {
  if (index >= points.length) return;
  document.getElementById("photoConforme").value = "";
  document.getElementById("nonConformeBloc").style.display = "block";
}

function sauvegarder() {
  localStorage.setItem("inspection", JSON.stringify(reponses));
}

async function genererPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;

  doc.setFontSize(16);
  doc.text("Rapport de contrôle – Sous-station", 10, y);
  y += 10;

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