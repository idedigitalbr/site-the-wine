import { ArrowRight, Utensils, Users, Wine } from 'lucide-react';

export function EventsSection() {
  return (
    <>
      <div className="tw-acc-header" id="eventos">
        <h2 className="tw-acc-header__title">Eventos <em>&amp;</em> Experiências</h2>
      </div>

      <section className="tw-acc" aria-label="Eventos e Experiências do The Wine">
        <ul className="tw-acc__row">
          <li className="tw-acc__panel tw-acc__panel--active">
            <div className="tw-acc__link">
              <img src="/assets/Gastronomia/prato-carne-grelhada-gnocchi.webp" width="700" height="900" alt="Prato gourmet do jantar harmonizado no The Wine" />
              <span className="tw-acc__cap">
                <Utensils className="tw-acc__cap-icon" aria-hidden="true" strokeWidth={1.5} />
                <span className="tw-acc__cap-title">Jantar Harmonizado</span>
                <span className="tw-acc__cap-sub">Uma vez ao mês</span>
                <span className="tw-acc__extra">
                  <span className="tw-acc__desc">Menus exclusivos criados pelo chef, onde cada prato encontra seu vinho perfeito em uma experiência enogastronômica completa.</span>
                  <a className="tw-acc__btn" href="/reservas">
                    Fazer reserva
                    <ArrowRight aria-hidden="true" strokeWidth={2} />
                  </a>
                </span>
              </span>
            </div>
          </li>

          <li className="tw-acc__panel">
            <div className="tw-acc__link">
              <img src="/assets/Ambiente/mesa-reservada-adega.webp" width="700" height="900" alt="Mesa reservada para evento corporativo na adega do The Wine" />
              <span className="tw-acc__cap">
                <Users className="tw-acc__cap-icon" aria-hidden="true" strokeWidth={1.5} />
                <span className="tw-acc__cap-title">Evento Corporativo</span>
                <span className="tw-acc__cap-sub">Sob consulta</span>
                <span className="tw-acc__extra">
                  <span className="tw-acc__desc">Celebrações íntimas, encontros corporativos e ocasiões especiais com ambientação personalizada e serviço impecável.</span>
                  <a className="tw-acc__btn" href="/reservas">
                    Fazer reserva
                    <ArrowRight aria-hidden="true" strokeWidth={2} />
                  </a>
                </span>
              </span>
            </div>
          </li>

          <li className="tw-acc__panel">
            <div className="tw-acc__link">
              <img src="/assets/Experiencias/maquina-de-vinho.webp" width="700" height="900" alt="Degustação em máquina de vinhos no The Wine Experience" loading="lazy" decoding="async" />
              <span className="tw-acc__cap">
                <Wine className="tw-acc__cap-icon" aria-hidden="true" strokeWidth={1.5} />
                <span className="tw-acc__cap-title">Máquinas de Vinho</span>
                <span className="tw-acc__cap-sub">Escolha sua taça</span>
                <span className="tw-acc__extra">
                  <span className="tw-acc__desc">
                    No The Wine Experience, você escolhe o rótulo, a origem e o estilo direto na nossa máquina de vinhos — uma forma prática e elegante de descobrir novos sabores, na medida da sua taça.
                  </span>
                </span>
              </span>
            </div>
          </li>
        </ul>
      </section>
    </>
  );
}
