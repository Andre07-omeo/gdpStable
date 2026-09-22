const fs = require('fs');
const path = require('path');

const schemaContent = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum Sexe {
  M
  F
  Autre
}

enum ZoneNiveau {
  National
  Province
  Ville
  Zone
}

enum EtatPanneau {
  Actif
  EnMaintenance
  Desactive
}

enum Orientation {
  Nord
  Sud
  Est
  Ouest
  Indifferent
}

enum StatutReservation {
  Brouillon
  Valide
  Facture
  Modifie
  Annule
  Termine
}

enum StatutDiffusion {
  Avenir
  EnCours
  Terminee
  Suspendue
}

enum StatutFacture {
  EnAttente
  Payee
  Impayee
  Annulee
}

enum ModePaiement {
  CB
  Virement
  Cheque
  Especes
  Prelevement
}

model Profil {
  id_profil          Int      @id @default(autoincrement())
  code               String   @unique @db.VarChar(20)
  libelle            String   @db.VarChar(50)
  niveauHierarchique Int      @default(0)
  permissions        Json?
  created_at         DateTime @default(now())

  users User[]

  @@map("PROFIL")
}

model User {
  id_user             Int      @id @default(autoincrement())
  id_profil           Int
  id_manager          Int?     @map("id_manager")

  nom                 String   @db.VarChar(50)
  prenom              String   @db.VarChar(50)
  sexe                Sexe     @default(Autre)
  adresse             String   @db.VarChar(255)
  code_postal         String   @db.VarChar(10)
  ville               String   @db.VarChar(50)
  telephone           String   @db.VarChar(20)
  departement         String   @db.VarChar(50)
  fonction            String   @db.VarChar(50)

  zone_travail        String?  @db.VarChar(255)
  zone_niveau         ZoneNiveau @default(National)
  province            String?  @db.VarChar(50)
  ville_travail       String?  @db.VarChar(50)

  email               String   @unique @db.VarChar(100)
  mot_de_passe_hash   String   @db.VarChar(255)

  actif               Boolean  @default(true)
  derniere_connexion  DateTime?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  profil              Profil   @relation(fields: [id_profil], references: [id_profil])
  manager             User?    @relation("UserManager", fields: [id_manager], references: [id_user])

  managed_users       User[]   @relation("UserManager")
  reservations        Reservation[] @relation("CommercialReservations")
  reservations_chef   Reservation[] @relation("ReservationChef")
  diffusions          Diffusion[]
  factures            Facture[] @relation("FactureCaissier")
  factures_imprime    Facture[] @relation("FactureImprimeur")
  modifications       HistoriqueModification[]
  ligne_modifications LigneReservation[] @relation("LigneModificateur")

  @@map("USER")
}

model Client {
  id_client          Int      @id @default(autoincrement())
  raison_sociale     String   @db.VarChar(100)
  siret              String?  @unique @db.VarChar(14)
  adresse            String   @db.VarChar(255)
  code_postal        String   @db.VarChar(10)
  ville              String   @db.VarChar(50)
  province           String   @db.VarChar(50)
  telephone          String   @db.VarChar(20)
  email_facturation  String   @db.VarChar(100)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  reservations Reservation[]

  @@map("CLIENT")
}

model Panneau {
  id_panneau         Int      @id @default(autoincrement())
  nom                String   @db.VarChar(100)
  adresse            String   @db.VarChar(255)
  latitude           Decimal  @db.Decimal(10, 8)
  longitude          Decimal  @db.Decimal(11, 8)
  province           String   @db.VarChar(50)
  ville              String   @db.VarChar(50)
  commune            String?  @db.VarChar(50)
  etat               EtatPanneau @default(Actif)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  faces Face[]

  @@map("PANNEAU")
}

model TypeFace {
  id_type_face       Int      @id @default(autoincrement())
  libelle            String   @unique @db.VarChar(50)
  hauteur_cm         Int
  largeur_cm         Int
  est_scroller       Boolean  @default(false)
  created_at         DateTime @default(now())

  faces Face[]

  @@map("TYPE_FACE")
}

model Face {
  id_face            Int      @id @default(autoincrement())
  id_panneau         Int
  id_type_face       Int
  orientation        Orientation @default(Indifferent)
  est_active         Boolean  @default(true)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  panneau            Panneau  @relation(fields: [id_panneau], references: [id_panneau])
  typeFace           TypeFace @relation(fields: [id_type_face], references: [id_type_face])

  ligneReservations LigneReservation[]

  @@map("FACE")
}

model Reservation {
  id_reservation       Int      @id @default(autoincrement())
  id_client            Int
  id_commercial        Int
  id_chef_validation   Int?

  numero_commande      String   @unique @db.VarChar(50)
  date_creation        DateTime @default(now())
  date_debut_campagne  DateTime
  date_fin_campagne    DateTime
  statut               StatutReservation @default(Brouillon)
  est_verrouille       Boolean  @default(false)
  date_verrouillage    DateTime?
  notes                String?  @db.Text
  created_at           DateTime @default(now())
  updated_at           DateTime @updatedAt

  client               Client   @relation(fields: [id_client], references: [id_client])
  commercial           User     @relation("CommercialReservations", fields: [id_commercial], references: [id_user])
  chefValidation       User?    @relation("ReservationChef", fields: [id_chef_validation], references: [id_user])

  ligneReservations LigneReservation[]
  factures         Facture[]
  historiques      HistoriqueModification[]

  @@map("RESERVATION")
}

model LigneReservation {
  id_ligne           Int      @id @default(autoincrement())
  id_reservation     Int
  id_face            Int
  date_debut         DateTime
  date_fin           DateTime
  prix_vente_net     Decimal  @db.Decimal(10, 2)
  statut_diffusion   StatutDiffusion @default(Avenir)

  version            Int      @default(1)
  modifie_par        Int?
  date_modification  DateTime?
  raison_modification String? @db.Text

  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  reservation        Reservation @relation(fields: [id_reservation], references: [id_reservation], onDelete: Cascade)
  face               Face        @relation(fields: [id_face], references: [id_face])
  modificateur       User?       @relation("LigneModificateur", fields: [modifie_par], references: [id_user])

  diffusions Diffusion[]

  @@unique([id_face, date_debut, date_fin])
  @@map("LIGNE_RESERVATION")
}

model Diffusion {
  id_diffusion         Int      @id @default(autoincrement())
  id_ligne_reservation Int
  id_superviseur       Int
  date_prise_vue       DateTime @default(now())
  chemin_image         String   @db.VarChar(255)
  remarque             String?  @db.Text
  created_at           DateTime @default(now())

  ligneReservation LigneReservation @relation(fields: [id_ligne_reservation], references: [id_ligne], onDelete: Cascade)
  superviseur      User             @relation(fields: [id_superviseur], references: [id_user])

  @@map("DIFFUSION")
}

model Facture {
  id_facture               Int      @id @default(autoincrement())
  id_reservation           Int
  id_caissier              Int
  numero_facture           String   @unique @db.VarChar(50)
  date_emission            DateTime
  date_echeance            DateTime
  montant_ht               Decimal  @db.Decimal(10, 2)
  taux_tva                 Decimal  @db.Decimal(5, 2) @default(20.00)
  montant_ttc              Decimal  @db.Decimal(10, 2)
  statut                   StatutFacture @default(EnAttente)

  version_facture          Int      @default(1)
  est_reimprime            Boolean  @default(false)
  date_derniere_impression DateTime?
  imprime_par              Int?

  created_at               DateTime @default(now())
  updated_at               DateTime @updatedAt

  reservation              Reservation @relation(fields: [id_reservation], references: [id_reservation])
  caissier                 User        @relation("FactureCaissier", fields: [id_caissier], references: [id_user])
  imprimeur                User?       @relation("FactureImprimeur", fields: [imprime_par], references: [id_user])

  paiements Paiement[]

  @@map("FACTURE")
}

model Paiement {
  id_paiement        Int      @id @default(autoincrement())
  id_facture         Int
  date_paiement      DateTime @default(now())
  montant            Decimal  @db.Decimal(10, 2)
  mode               ModePaiement
  reference_bancaire String?  @db.VarChar(100)
  created_at         DateTime @default(now())

  facture Facture @relation(fields: [id_facture], references: [id_facture])

  @@map("PAIEMENT")
}

model HistoriqueModification {
  id_historique     Int      @id @default(autoincrement())
  id_reservation    Int
  id_utilisateur    Int
  id_ligne          Int?
  champ_modifie     String   @db.VarChar(50)
  ancienne_valeur   String?  @db.Text
  nouvelle_valeur   String?  @db.Text
  raison            String?  @db.Text
  date_modification DateTime @default(now())

  reservation Reservation @relation(fields: [id_reservation], references: [id_reservation], onDelete: Cascade)
  utilisateur  User       @relation(fields: [id_utilisateur], references: [id_user])

  @@map("HISTORIQUE_MODIFICATION")
}
`;

fs.writeFileSync(
  path.join(__dirname, '..', 'prisma', 'schema.prisma'),
  schemaContent.trim(),
  'utf8'
);

console.log('✅ Fichier schema.prisma créé avec succès !');