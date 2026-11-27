import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { Mail, Phone, MapPin, MessageSquare, Send, CheckCircle2, Globe, Clock } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
  };

  return (
    <section id="contacto" className="py-20 bg-[#0E0E0E] relative border-t border-[#C9A86A]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#18150f] border border-[#C9A86A]/40 mb-4">
            <Mail className="w-4 h-4 text-[#C9A86A]" />
            <span className="text-xs font-semibold text-[#E7C888] tracking-widest uppercase">
              {t('contact.badge')}
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-serif-luxury tracking-wide mb-4">
            {t('contact.title')}
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg">
            {t('contact.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
          {/* Left Column: Direct Info & Headquarters */}
          <div className="lg:col-span-5 rounded-3xl bg-[#141414] border border-[#C9A86A]/30 p-8 space-y-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white font-serif-luxury mb-4">
                {t('contact.hq')}
              </h3>

              <div className="space-y-4 text-xs text-neutral-300">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0D0D0D] border border-neutral-800">
                  <MapPin className="w-5 h-5 text-[#C9A86A] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm mb-0.5">Sede Oficial</strong>
                    <span className="text-neutral-200">Cancún, Quintana Roo, México</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0D0D0D] border border-neutral-800">
                  <Phone className="w-5 h-5 text-[#C9A86A] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm mb-0.5">Línea Telefónica & WhatsApp</strong>
                    <a href="tel:+529984996316" className="font-mono text-[#FFE885] hover:underline block font-bold">
                      +52 9984996316
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0D0D0D] border border-neutral-800">
                  <Mail className="w-5 h-5 text-[#C9A86A] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm mb-0.5">Correo Electrónico Oficial</strong>
                    <a href="mailto:inbr.oficial@gmail.com" className="font-mono text-[#FFE885] hover:underline block">
                      inbr.oficial@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0D0D0D] border border-neutral-800">
                  <Clock className="w-5 h-5 text-[#C9A86A] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm mb-0.5">Horario de Validación</strong>
                    <span>Lunes a Viernes 08:00 - 19:00 CST • Guardias de Ring Sáb/Dom</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800">
              <a
                href="https://wa.me/529984996316?text=Hola,%20me%20comunico%20desde%20la%20plataforma%20oficial%20INBR."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition-all shadow-lg"
              >
                <MessageSquare className="w-4 h-4 fill-black" />
                <span>WhatsApp Oficial (+52 9984996316)</span>
              </a>
            </div>
          </div>

          {/* Right Column: Contact Message Form */}
          <div className="lg:col-span-7 rounded-3xl bg-[#141414] border border-[#C9A86A]/30 p-8 shadow-2xl">
            {!isSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      {t('contact.name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0D0D0D] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C9A86A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      {t('contact.yourEmail')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0D0D0D] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C9A86A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    {t('contact.subject')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Homologación de pedigrí / Consulta de microchip / Inscripción a show"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0D0D0D] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C9A86A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    {t('contact.message')} *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0D0D0D] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C9A86A]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('contact.send')}</span>
                </button>
              </form>
            ) : (
              <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/60 text-center space-y-4 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-xl font-bold text-white font-serif-luxury">
                  {t('contact.success')}
                </h4>
                <p className="text-xs text-neutral-300 max-w-sm mx-auto">
                  Hemos canalizado tu mensaje al departamento de registro correspondiente. Recibirás respuesta vía WhatsApp o correo electrónico.
                </p>
                <button
                  onClick={() => setIsSent(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 bg-neutral-800 hover:text-white"
                >
                  Enviar Otro Mensaje
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
