'use client';

import React from 'react';
import { HelpCircle, MessageSquare, Mail, Phone, Globe, BookOpen, Zap } from 'lucide-react';

export function AdminSupport() {
  const faqs = [
    { question: "Comment ajouter un panneau ?", answer: "Allez dans Panneaux > Nouveau panneau" },
    { question: "Comment créer un utilisateur ?", answer: "Allez dans Utilisateurs > Nouvel utilisateur" },
    { question: "Comment gérer les réservations ?", answer: "Allez dans Réservations pour voir toutes les demandes" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-blue-100">
          <HelpCircle size={24} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Centre d'aide</h2>
          <p className="text-sm text-gray-500">Support et assistance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600" />
            FAQ
          </h3>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-gray-100 pb-3 last:border-0">
                <p className="font-medium text-gray-800 text-sm">{faq.question}</p>
                <p className="text-sm text-gray-500 mt-1">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-emerald-600" />
            Contact
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <Mail size={16} className="text-blue-600" />
              <span className="text-sm text-gray-700">support@panneaux.cd</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <Phone size={16} className="text-blue-600" />
              <span className="text-sm text-gray-700">+243 815 023 699</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <Globe size={16} className="text-blue-600" />
              <span className="text-sm text-gray-700">docs.panneaux.cd</span>
            </div>
          </div>
          <button className="w-full mt-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-bold hover:shadow-lg transition">
            Contacter le support
          </button>
        </div>
      </div>
    </div>
  );
}
