// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
export const dynamic = 'force-dynamic';

// Dossier de stockage des images
const IMAGES_DIR = path.join(process.cwd(), 'public/images/panneaux');

// S'assurer que le dossier existe
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const ligneId = formData.get('ligneId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `reservation_${ligneId}_${timestamp}.${extension}`;
    const filepath = path.join(IMAGES_DIR, filename);

    // Lire le fichier et le sauvegarder
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Retourner l'URL relative
    const imageUrl = `/images/panneaux/${filename}`;
    
    return NextResponse.json({ 
      success: true, 
      imageUrl 
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
}