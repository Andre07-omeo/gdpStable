// data/locations.ts
export const locationsData = {
  pays: [
    { id: 1, code: 'CD', nom: 'République Démocratique du Congo' },
    { id: 2, code: 'CG', nom: 'Congo-Brazzaville' }
  ],
  provinces: {
    1: [ // RDC
      { id: 1, code: 'KN', nom: 'Kinshasa', pays_id: 1 },
      { id: 2, code: 'LUA', nom: 'Lualaba', pays_id: 1 },
      { id: 3, code: 'HKT', nom: 'Haut-Katanga', pays_id: 1 }
    ],
    2: [ // Congo-Brazzaville
      { id: 26, code: 'BZV', nom: 'Brazzaville', pays_id: 2 },
      { id: 27, code: 'PNO', nom: 'Pointe-Noire', pays_id: 2 }
    ]
  },
  villes: {
    1: [ // Kinshasa
      { id: 15, code: 'KIN', nom: 'Kinshasa', province_id: 1 }
    ],
    2: [ // Lualaba
      { id: 16, code: 'KOL', nom: 'Kolwezi', province_id: 2 },
      { id: 17, code: 'LUB', nom: 'Lubumbashi', province_id: 2 }
    ],
    3: [ // Haut-Katanga
      { id: 18, code: 'HKL', nom: 'Lubumbashi', province_id: 3 },
      { id: 19, code: 'KAS', nom: 'Kasumbalesa', province_id: 3 }
    ]
  },
  communes: {
    15: [ // Kinshasa ville
      { id: 34, code: 'GOM', nom: 'Gombe', ville_id: 15 },
      { id: 35, code: 'LIM', nom: 'Limete', ville_id: 15 },
      { id: 36, code: 'NGA', nom: 'Ngaba', ville_id: 15 },
      { id: 37, code: 'KAL', nom: 'Kalamu', ville_id: 15 },
      { id: 38, code: 'BAR', nom: 'Barumbu', ville_id: 15 },
      { id: 39, code: 'KIS', nom: 'Kisenso', ville_id: 15 },
      { id: 40, code: 'MAK', nom: 'Makala', ville_id: 15 },
      { id: 41, code: 'MAS', nom: 'Masina', ville_id: 15 },
      { id: 42, code: 'MAT', nom: 'Matete', ville_id: 15 },
      { id: 43, code: 'MON', nom: 'Mont Ngafula', ville_id: 15 },
      { id: 44, code: 'NDJ', nom: 'Ndjili', ville_id: 15 },
      { id: 45, code: 'NGI', nom: 'Ngiri-Ngiri', ville_id: 15 },
      { id: 46, code: 'NSE', nom: 'Nsele', ville_id: 15 },
      { id: 47, code: 'SEB', nom: 'Selembao', ville_id: 15 },
      { id: 48, code: 'BAN', nom: 'Bandalungwa', ville_id: 15 },
      { id: 49, code: 'KIN', nom: 'Kinshasa', ville_id: 15 },
      { id: 51, code: 'MAL', nom: 'Maluku', ville_id: 15 }
    ]
  }
};