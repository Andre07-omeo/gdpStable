// src/app/dashboard/commercial/services/reportPdfService.ts

import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

// ============================================
// TYPES
// ============================================
interface FaceData {
  id_face?: string | number;
  orientation?: string;
  type_face?: string;
  status?: string;
  a_probleme?: number;
  raison_probleme?: string;
  dimension_m2?: string;
  client_nom?: string | null;
  commercial_nom?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
}

interface PanneauData {
  idPan?: string;
  nom?: string;
  adresse?: string;
  ville?: string;
  commune?: string;
  province?: string;
  etatPanneau?: string;
  etat?: string;
  date_probleme?: string | null;
  raison_probleme?: string | null;
  faces?: FaceData[];
}

interface PanneauFiltersState {
  search: string;
  situation:
    | 'tous'
    | 'totalement_occupe'
    | 'partiellement_occupe'
    | 'totalement_reserve'
    | 'partiellement_reserve'
    | 'totalement_libre'
    | 'partiellement_libre'
    | 'totalement_en_panne'
    | 'partiellement_en_panne';
  faceSituation: string;
  echeanceActive: boolean;
  echeanceDebut: string;
  echeanceFin: string;
}

interface ReportOptions {
  panneaux: PanneauData[];
  stats?: any;
  filters?: PanneauFiltersState;
  user?: any;
}

// ============================================
// ✅ HELPER : NETTOYER UNE CHAÎNE (accents → ASCII)
// ============================================
function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    // Accents français → ASCII
    .replace(/[éèêë]/g, 'e')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[àâä]/g, 'a')
    .replace(/[ÀÂÄ]/g, 'A')
    .replace(/[îï]/g, 'i')
    .replace(/[ÎÏ]/g, 'I')
    .replace(/[ôö]/g, 'o')
    .replace(/[ÔÖ]/g, 'O')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ÙÛÜ]/g, 'U')
    .replace(/[ç]/g, 'c')
    .replace(/[Ç]/g, 'C')
    .replace(/[ÿ]/g, 'y')
    .replace(/[Ÿ]/g, 'Y')
    .replace(/[œ]/g, 'oe')
    .replace(/[Œ]/g, 'OE')
    .replace(/[æ]/g, 'ae')
    .replace(/[Æ]/g, 'AE')
    // Symboles spéciaux
    .replace(/«/g, '"')
    .replace(/»/g, '"')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[•]/g, '-')
    .replace(/[…]/g, '...')
    .replace(/[→]/g, '->')
    .replace(/[€]/g, 'EUR')
    .replace(/[°]/g, 'deg');
}

// ============================================
// HELPERS : DÉTECTION DE PANNES
// ============================================
function isFaceEnPanne(face: FaceData): boolean {
  return face.a_probleme === 1 || face.status === 'Problème';
}

function isPanneauEnPanne(panneau: PanneauData): boolean {
  return (
    panneau.etatPanneau === 'En panne' ||
    panneau.etat === 'EnPan' ||
    (!!panneau.date_probleme && !!panneau.raison_probleme)
  );
}

// ============================================
// ✅ HELPER : NOM UTILISATEUR DEPUIS LOCALSTORAGE
// ============================================
function getUserInfoFromStorage(user?: any): {
  fullName: string;
  email: string;
  role: string;
} {
  let fullName = 'Utilisateur';
  let email = '';
  let role = '';

  if (typeof window !== 'undefined') {
    try {
      const storedName =
        localStorage.getItem('user_nom_complet') ||
        localStorage.getItem('userName') ||
        localStorage.getItem('user_name');

      const storedEmail =
        localStorage.getItem('user_email') ||
        localStorage.getItem('userEmail');

      const storedRole =
        localStorage.getItem('user_profil') ||
        localStorage.getItem('userRole');

      if (storedName) fullName = storedName;
      if (storedEmail) email = storedEmail;
      if (storedRole) role = storedRole;
    } catch (error) {
      console.warn('Erreur lecture localStorage:', error);
    }
  }

  if (fullName === 'Utilisateur' && user) {
    const userName = `${user.prenom || ''} ${user.nom || ''}`.trim();
    if (userName) fullName = userName;
    if (!email) email = user.email || '';
    if (!role) role = user.profil || '';
  }

  return { fullName, email, role };
}

// ============================================
// ✅ HELPER : DÉCRIRE LES FILTRES ACTIFS
// ============================================
function getFilterDescriptions(filters?: PanneauFiltersState): string[] {
  const descriptions: string[] = [];

  if (!filters) return descriptions;

  if (filters.search && filters.search.trim() !== '') {
    descriptions.push(`Recherche: "${filters.search}"`);
  }

  const situationLabels: Record<string, string> = {
    totalement_occupe: '[BLEU] Totalement OCCUPE',
    partiellement_occupe: '[BLEU] Partiellement OCCUPE',
    totalement_reserve: '[JAUNE] Totalement RESERVE',
    partiellement_reserve: '[JAUNE] Partiellement RESERVE',
    totalement_libre: '[VERT] Totalement LIBRE',
    partiellement_libre: '[VERT] Partiellement LIBRE',
    totalement_en_panne: '[ROUGE] Totalement EN PANNE',
    partiellement_en_panne: '[ROUGE] Partiellement EN PANNE',
  };

  if (filters.situation && filters.situation !== 'tous') {
    descriptions.push(
      situationLabels[filters.situation] || filters.situation
    );
  }

  if (filters.echeanceActive) {
    const hasDebut = filters.echeanceDebut !== '';
    const hasFin = filters.echeanceFin !== '';

    if (hasDebut && hasFin) {
      descriptions.push(
        `Periode: du ${formatDateFR(filters.echeanceDebut)} au ${formatDateFR(
          filters.echeanceFin
        )}`
      );
    } else if (hasDebut) {
      descriptions.push(
        `Periode: a partir du ${formatDateFR(filters.echeanceDebut)}`
      );
    } else if (hasFin) {
      descriptions.push(
        `Periode: jusqu'au ${formatDateFR(filters.echeanceFin)}`
      );
    }
  }

  return descriptions;
}

// ============================================
// ✅ HELPER : FORMAT DATE FR (sans accents)
// ============================================
function formatDateFR(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    // Mois sans accents
    const months = [
      'janv.', 'fevr.', 'mars', 'avr.', 'mai', 'juin',
      'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.',
    ];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

// ============================================
// ✅ CHARGER UNE IMAGE EN BASE64
// ============================================
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ============================================
// ✅ GÉNÉRATION DU PDF
// ============================================
export async function generateReportPDF(
  options: ReportOptions
): Promise<void> {
  const { panneaux, stats, user, filters } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ============================================
  // DATE ET HEURE (sans accents)
  // ============================================
  const now = new Date();
  const months = [
    'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
  ];
  const dateStr = `${String(now.getDate()).padStart(2, '0')} ${
    months[now.getMonth()]
  } ${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const fullDate = `${dateStr} a ${timeStr}`;

  // ============================================
  // UTILISATEUR
  // ============================================
  const userInfo = getUserInfoFromStorage(user);
  const userName = sanitizeText(userInfo.fullName);
  const userEmail = sanitizeText(userInfo.email);
  const userRole = sanitizeText(userInfo.role);

  // ============================================
  // FILTRES ACTIFS
  // ============================================
  const filterDescriptions = getFilterDescriptions(filters);
  const hasActiveFilters = filterDescriptions.length > 0;

  const reportTitle = hasActiveFilters
    ? 'RAPPORT FILTRE DES PANNEAUX'
    : 'RAPPORT DES PANNEAUX PUBLICITAIRES';

  // ============================================
  // 1. EN-TÊTE
  // ============================================
  const headerHeight = hasActiveFilters ? 34 : 26;

  doc.setFillColor(0, 61, 115);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  doc.setFillColor(251, 191, 36);
  doc.rect(0, headerHeight - 1.5, pageWidth, 1.5, 'F');

  // Logo
  try {
    const logoBase64 = await loadImageAsBase64('/icons/icon-192x192.png');
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 8, 4, 18, 18);
    }
  } catch (error) {
    console.warn('Logo non trouve');
  }

  // Titre
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, 32, 11);

  // Sous-titre
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(191, 219, 254);
  doc.text(`Imprime le ${fullDate}`, 32, 17);

  // Ligne des filtres
  if (hasActiveFilters) {
    doc.setFillColor(251, 191, 36);
    doc.roundedRect(32, 20, pageWidth - 90, 9, 1.5, 1.5, 'F');

    doc.setTextColor(0, 61, 115);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Filtres: ${filterDescriptions.join('  |  ')}`,
      34,
      25.5,
      { maxWidth: pageWidth - 100 }
    );
  }

  // Utilisateur
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(userName, pageWidth - 10, 10, { align: 'right' });

  if (userEmail) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(191, 219, 254);
    doc.text(userEmail, pageWidth - 10, 15, { align: 'right' });
  }

  if (userRole) {
    doc.setFontSize(7);
    doc.setTextColor(251, 191, 36);
    doc.text(userRole, pageWidth - 10, 20, { align: 'right' });
  }

  // ============================================
  // 2. RÉSUMÉ
  // ============================================
  let yPosition = headerHeight + 5;

  let totalPanneauxEnPanne = 0;
  let totalFacesEnPanne = 0;
  let filteredFaces = 0;
  let filteredLibres = 0;
  let filteredOccupees = 0;
  let filteredReservees = 0;

  panneaux.forEach((p) => {
    if (isPanneauEnPanne(p)) totalPanneauxEnPanne++;

    const faces = p.faces || [];
    filteredFaces += faces.length;

    faces.forEach((f) => {
      if (isFaceEnPanne(f)) {
        totalFacesEnPanne++;
        return;
      }

      const status = (f.status || 'Libre').toLowerCase();
      if (status.includes('occup')) filteredOccupees++;
      else if (status.includes('reserv')) filteredReservees++;
      else if (status.includes('attente')) filteredReservees++;
      else filteredLibres++;
    });
  });

  doc.setTextColor(0, 61, 115);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(
    hasActiveFilters
      ? `RESUME DES PANNEAUX FILTRES (${panneaux.length})`
      : 'RESUME GENERAL',
    14,
    yPosition
  );
  yPosition += 5;

  const cardWidth = (pageWidth - 28 - 5 * 4) / 6;
  const cardHeight = 14;

  const cards = [
    { label: 'Panneaux', value: panneaux.length, color: [59, 130, 246] },
    { label: 'Faces', value: filteredFaces, color: [99, 102, 241] },
    { label: 'Libres', value: filteredLibres, color: [16, 185, 129] },
    { label: 'Occupees', value: filteredOccupees, color: [59, 130, 246] },
    { label: 'Reservees', value: filteredReservees, color: [245, 158, 11] },
    { label: 'Futures', value: 0, color: [139, 92, 246] },
  ];

  cards.forEach((card, i) => {
    const x = 14 + i * (cardWidth + 4);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, yPosition, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.rect(x, yPosition, cardWidth, 1, 'F');

    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String(card.value), x + cardWidth / 2, yPosition + 7.5, {
      align: 'center',
    });

    doc.setTextColor(107, 114, 128);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(card.label, x + cardWidth / 2, yPosition + 12, {
      align: 'center',
    });
  });

  yPosition += cardHeight + 4;

  // Bandeau pannes
  if (totalPanneauxEnPanne > 0 || totalFacesEnPanne > 0) {
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, yPosition, pageWidth - 28, 8, 2, 2, 'FD');

    doc.setTextColor(185, 28, 28);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `[!] ${totalPanneauxEnPanne} panneau(x) en panne | ${totalFacesEnPanne} face(s) en panne`,
      18,
      yPosition + 5
    );

    yPosition += 10;
  }

  yPosition += 2;

  // ============================================
  // 3. TABLEAU PRINCIPAL
  // ============================================
  doc.setTextColor(0, 61, 115);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(
    hasActiveFilters
      ? 'DETAIL DES PANNEAUX FILTRES'
      : 'DETAIL DES PANNEAUX ET FACES',
    14,
    yPosition
  );
  yPosition += 4;

  const tableBody: RowInput[] = [];

  panneaux.forEach((panneau, pIdx) => {
    const faces = panneau.faces || [];
    const panneauEnPanne = isPanneauEnPanne(panneau);

    const bgColor: [number, number, number] = panneauEnPanne
      ? [254, 226, 226]
      : [230, 240, 250];
    const textColor: [number, number, number] = panneauEnPanne
      ? [185, 28, 28]
      : [30, 58, 95];

    tableBody.push([
      {
        content: `${pIdx + 1}`,
        styles: {
          fontStyle: 'bold',
          halign: 'center',
          fillColor: bgColor,
          textColor,
          fontSize: 9,
        },
      },
      {
        content: `${panneauEnPanne ? '[!] ' : ''}${sanitizeText(
          panneau.nom || 'Sans nom'
        )}${panneau.idPan ? `\nID: ${sanitizeText(panneau.idPan)}` : ''}`,
        styles: {
          fontStyle: 'bold',
          fillColor: bgColor,
          textColor,
          fontSize: 8.5,
        },
      },
      {
        content: sanitizeText(panneau.adresse || '-'),
        styles: { fillColor: bgColor, textColor, fontSize: 8 },
      },
      {
        content:
          `${sanitizeText(panneau.commune || '')}\n${sanitizeText(
            panneau.ville || ''
          )}`.trim() || '-',
        styles: { fillColor: bgColor, textColor, fontSize: 8 },
      },
      {
        content: panneauEnPanne
          ? '[!] EN PANNE'
          : sanitizeText(panneau.etatPanneau || 'Actif').toUpperCase(),
        styles: {
          fontStyle: 'bold',
          halign: 'center',
          fillColor: bgColor,
          textColor: panneauEnPanne ? [220, 38, 38] : [16, 185, 129],
          fontSize: 8,
        },
      },
      {
        content: `${faces.length} face(s)`,
        styles: {
          fontStyle: 'bold',
          halign: 'center',
          fillColor: bgColor,
          textColor,
          fontSize: 8,
        },
      },
    ]);

    // Raison panneau en panne
    if (panneauEnPanne && panneau.raison_probleme) {
      tableBody.push([
        { content: '', styles: { fillColor: [254, 226, 226] } },
        {
          content: `      [!] Raison: ${sanitizeText(panneau.raison_probleme)}`,
          styles: {
            textColor: [185, 28, 28],
            fontSize: 7,
            fontStyle: 'italic',
            fillColor: [254, 226, 226],
          },
        },
        { content: '', styles: { fillColor: [254, 226, 226] } },
        { content: '', styles: { fillColor: [254, 226, 226] } },
        { content: '', styles: { fillColor: [254, 226, 226] } },
        { content: '', styles: { fillColor: [254, 226, 226] } },
      ]);
    }

    // Faces
    faces.forEach((face, fIdx) => {
      const faceEnPanne = isFaceEnPanne(face);
      const client = sanitizeText(face.client_nom || '-');
      const commercial = sanitizeText(face.commercial_nom || '-');
      const dates =
        face.date_debut && face.date_fin
          ? `${formatDateShort(face.date_debut)} - ${formatDateShort(
              face.date_fin
            )}`
          : '-';

      const faceBg: [number, number, number] = faceEnPanne
        ? [254, 226, 226]
        : [255, 255, 255];
      const faceText: [number, number, number] = faceEnPanne
        ? [185, 28, 28]
        : [75, 85, 99];

      tableBody.push([
        { content: '', styles: { fillColor: faceBg } },
        {
          content: `${faceEnPanne ? '[!]' : '   --'} Face ${fIdx + 1} (${sanitizeText(
            face.orientation || 'N/A'
          )})`,
          styles: {
            textColor: faceText,
            fontStyle: faceEnPanne ? 'bold' : 'italic',
            fillColor: faceBg,
            fontSize: 7.5,
          },
        },
        {
          content: sanitizeText(face.type_face || 'Standard'),
          styles: { textColor: faceText, fillColor: faceBg, fontSize: 7.5 },
        },
        {
          content: sanitizeText(face.dimension_m2 || 'N/A'),
          styles: {
            textColor: faceText,
            halign: 'center',
            fillColor: faceBg,
            fontSize: 7.5,
          },
        },
        {
          content: faceEnPanne
            ? '[!] PROBLEME'
            : sanitizeText(face.status || 'Libre').toUpperCase(),
          styles: {
            textColor: getStatusColor(face.status, faceEnPanne),
            fontStyle: 'bold',
            halign: 'center',
            fillColor: faceBg,
            fontSize: 7.5,
          },
        },
        {
          content: `${client}\n${commercial}`,
          styles: { textColor: faceText, fontSize: 6.5, fillColor: faceBg },
        },
      ]);

      // Raison face en panne
      if (faceEnPanne && face.raison_probleme) {
        tableBody.push([
          { content: '', styles: { fillColor: [254, 226, 226] } },
          {
            content: `      [!] Raison: ${sanitizeText(face.raison_probleme)}`,
            styles: {
              textColor: [185, 28, 28],
              fontSize: 6.5,
              fontStyle: 'italic',
              fillColor: [254, 226, 226],
            },
          },
          { content: '', styles: { fillColor: [254, 226, 226] } },
          { content: '', styles: { fillColor: [254, 226, 226] } },
          { content: '', styles: { fillColor: [254, 226, 226] } },
          { content: '', styles: { fillColor: [254, 226, 226] } },
        ]);
      }

      // Dates
      if (dates !== '-') {
        tableBody.push([
          { content: '', styles: { fillColor: [250, 250, 250] } },
          {
            content: `      Dates: ${dates}`,
            styles: {
              textColor: [120, 120, 120],
              fontSize: 6.5,
              fontStyle: 'italic',
              fillColor: [250, 250, 250],
            },
          },
          { content: '', styles: { fillColor: [250, 250, 250] } },
          { content: '', styles: { fillColor: [250, 250, 250] } },
          { content: '', styles: { fillColor: [250, 250, 250] } },
          { content: '', styles: { fillColor: [250, 250, 250] } },
        ]);
      }
    });

    if (pIdx < panneaux.length - 1) {
      const sepStyle = {
        fillColor: [255, 255, 255] as [number, number, number],
        cellPadding: 1,
      };
      tableBody.push([
        { content: '', styles: sepStyle },
        { content: '', styles: sepStyle },
        { content: '', styles: sepStyle },
        { content: '', styles: sepStyle },
        { content: '', styles: sepStyle },
        { content: '', styles: sepStyle },
      ]);
    }
  });

  if (tableBody.length === 0) {
    tableBody.push([
      {
        content: hasActiveFilters
          ? 'Aucun panneau ne correspond aux filtres selectionnes'
          : 'Aucun panneau a afficher',
        colSpan: 6,
        styles: {
          halign: 'center',
          fontStyle: 'italic',
          fontSize: 10,
          textColor: [120, 120, 120],
        },
      },
    ]);
  }

  // ============================================
  // 4. GÉNÉRER LE TABLEAU
  // ============================================
  autoTable(doc, {
    startY: yPosition,
    head: [
      [
        { content: 'N', styles: { halign: 'center' } },
        { content: 'PANNEAU / FACE' },
        { content: 'ADRESSE / TYPE' },
        { content: 'LOCALISATION / DIM.' },
        { content: 'STATUT' },
        { content: 'FACE(S) / CLIENT-COMMERCIAL' },
      ],
    ],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0.15,
      textColor: [40, 40, 40],
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [0, 61, 115],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
      minCellHeight: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 55 },
      3: { cellWidth: 40 },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 48 },
    },
        margin: { left: 10, right: 10, top: 30 },
    didDrawPage: () => {
      // jspdf-autotable ajoute getNumberOfPages() et getCurrentPageInfo()
      // mais les types ne les exposent pas → cast en any
      const pageCount = (doc as any).getNumberOfPages();
      const currentPage = (doc as any).getCurrentPageInfo().pageNumber;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 61, 115);
      doc.text('GDP - Gestion Digitale Panneaux', 14, pageHeight - 6);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Page ${currentPage} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );

      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `${fullDate} - ${userName}`,
        pageWidth - 14,
        pageHeight - 6,
        { align: 'right' }
      );
    },
  });

  // ============================================
  // 5. SAUVEGARDER
  // ============================================
  const fileNameDate = now.toISOString().split('T')[0];
  const filterSuffix = hasActiveFilters ? '-filtre' : '';
  const fileName = `rapport-panneaux${filterSuffix}-${fileNameDate}-${String(
    now.getHours()
  ).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}.pdf`;

  doc.save(fileName);

  console.log('PDF sauvegarde:', fileName);
}

// ============================================
// HELPERS
// ============================================
function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getStatusColor(
  status?: string,
  enPanne: boolean = false
): [number, number, number] {
  if (enPanne) return [220, 38, 38];
  const s = (status || '').toLowerCase();
  if (s.includes('libre')) return [16, 185, 129];
  if (s.includes('occup')) return [59, 130, 246];
  if (s.includes('reserv')) return [245, 158, 11];
  if (s.includes('attente')) return [217, 119, 6];
  if (s.includes('probleme')) return [239, 68, 68];
  return [107, 114, 128];
}