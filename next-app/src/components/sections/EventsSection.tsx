import { whatsappLinks } from '@/config/social';

export function EventsSection() {
  return (
    <>
      <div className="tw-acc-header" id="eventos">
        <span className="tw-acc-header__tag">O que você encontra no The Wine</span>
        <h2 className="tw-acc-header__title">Nossos Eventos <em>&amp;</em> Experiências</h2>
      </div>

      <section className="tw-acc" aria-label="Eventos e Experiências do The Wine">
        <ul className="tw-acc__row">
          <li className="tw-acc__panel tw-acc__panel--active">
            <div className="tw-acc__link">
              <img src="/assets/Gastronomia/prato-carne-grelhada-gnocchi.webp" width="700" height="900" alt="Prato gourmet do jantar harmonizado no The Wine" />
              <span className="tw-acc__cap">
                <svg className="tw-acc__cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2v20M4 2v6a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4V2M8 2v10" />
                </svg>
                <span className="tw-acc__cap-title">Jantar Harmonizado</span>
                <span className="tw-acc__cap-sub">Uma vez ao mês</span>
                <span className="tw-acc__extra">
                  <span className="tw-acc__desc">Menus exclusivos criados pelo chef, onde cada prato encontra seu vinho perfeito em uma experiência enogastronômica completa.</span>
                  <a className="tw-acc__btn" href={whatsappLinks.dinner} target="_blank" rel="noopener noreferrer">
                    Saiba mais
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </a>
                </span>
              </span>
            </div>
          </li>

          <li className="tw-acc__panel">
            <div className="tw-acc__link">
              <img src="/assets/Ambiente/mesa-reservada-adega.webp" width="700" height="900" alt="Mesa reservada para evento corporativo na adega do The Wine" />
              <span className="tw-acc__cap">
                <svg className="tw-acc__cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="7" r="3" />
                  <circle cx="15" cy="7" r="3" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h2" />
                  <path d="M15 15h2a4 4 0 0 1 4 4v2" />
                  <circle cx="12" cy="11" r="3" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
                <span className="tw-acc__cap-title">Evento Corporativo</span>
                <span className="tw-acc__cap-sub">Sob consulta</span>
                <span className="tw-acc__extra">
                  <span className="tw-acc__desc">Celebrações íntimas, encontros corporativos e ocasiões especiais com ambientação personalizada e serviço impecável.</span>
                  <a className="tw-acc__btn" href={whatsappLinks.corporate} target="_blank" rel="noopener noreferrer">
                    Saiba mais
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </a>
                </span>
              </span>
            </div>
          </li>

          <li className="tw-acc__panel">
            <div className="tw-acc__link">
              <img src="/assets/Experiencias/maquina-de-vinho.webp" width="700" height="900" alt="Degustação em máquina de vinhos no The Wine Experience" loading="lazy" decoding="async" />
              <span className="tw-acc__cap">
                <svg className="tw-acc__cap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 22h8M12 15v7M8 22h8M12 15a5 5 0 0 0 5-5V2H7v8a5 5 0 0 0 5 5z" />
                  <path d="M7 9h10" />
                </svg>
                <span className="tw-acc__cap-title">Máquinas de Vinho</span>
                <span className="tw-acc__cap-sub">Escolha sua taça</span>
                <span className="tw-acc__extra">
                  <span className="tw-acc__desc">
                    No The Wine Experience, você escolhe o rótulo, a origem e o estilo direto na nossa máquina de vinhos — uma forma prática e elegante de descobrir novos sabores, na medida da sua taça.<br /><br /><em>Qual seria a sua escolha hoje?</em>
                  </span>
                  <a className="tw-acc__btn" href={whatsappLinks.wineMachines} target="_blank" rel="noopener noreferrer">
                    Saiba mais
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </a>
                </span>
              </span>
            </div>
          </li>
        </ul>
      </section>
    </>
  );
}
