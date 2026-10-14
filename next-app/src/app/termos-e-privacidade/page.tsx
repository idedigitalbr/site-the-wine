import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Cookie,
  FileText,
  Home,
  MessageCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { LegalBackToTop, PrintDocumentButton } from '@/components/legal/LegalControls';

export const metadata: Metadata = {
  title: 'Termos & Privacidade | The Wine Experience',
  description:
    'Consulte a Política de Privacidade e os Termos de Uso oficiais do The Wine Experience. Transparência, proteção de dados (LGPD) e segurança em Belém/PA.',
  alternates: {
    canonical: 'https://thewineexperience.com.br/termos-e-privacidade',
  },
};

export default function TermosEPrivacidadePage() {
  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      <link rel="stylesheet" href="/assets/css/legal.css" />
      <Header />

      <main className="legal-page">
        {/* Hero Legal */}
        <header className="legal-hero">
          <div className="legal-container">
            {/* Breadcrumbs */}
            <nav className="legal-breadcrumbs" aria-label="Trilha de navegação">
              <Link href="/">
                <Home aria-hidden="true" />
                <span>Início</span>
              </Link>
              <span className="separator" aria-hidden="true">/</span>
              <span className="current" aria-current="page">Termos & Privacidade</span>
            </nav>

            {/* Badge Oficial */}
            <div>
              <div className="legal-hero-badge">
                <ShieldCheck aria-hidden="true" />
                <span>Documento Oficial & Diretrizes</span>
              </div>
            </div>

            <h1 className="legal-hero-title">
              Política de Privacidade <span>&</span> Termos de Uso
            </h1>
            <p className="legal-hero-desc">
              The Wine Experience — Transparência, segurança e respeito aos seus dados pessoais e direitos em toda a nossa plataforma de experiências enogastronômicas e reservas.
            </p>

            {/* Meta Bar */}
            <div className="legal-meta-bar">
              <div className="legal-meta-item">
                <Calendar aria-hidden="true" />
                <span>Efetiva a partir de <strong>Setembro de 2026</strong></span>
              </div>
              <div className="legal-meta-item">
                <Clock aria-hidden="true" />
                <span>Tempo de leitura: <strong>~5 min</strong></span>
              </div>
              <PrintDocumentButton />
            </div>
          </div>
        </header>

        {/* Conteúdo Central */}
        <div className="legal-content-wrapper">
          <div className="legal-container">
            <article className="legal-document-card">

              {/* ==============================================================
                   SEÇÃO 1: POLÍTICA DE PRIVACIDADE (LGPD)
                   ============================================================== */}
              <section id="privacidade" className="legal-section" aria-labelledby="heading-privacidade">
                <div className="legal-block-header">
                  <div className="legal-block-icon">
                    <ShieldCheck aria-hidden="true" />
                  </div>
                  <div className="legal-block-info">
                    <h2 id="heading-privacidade">Política de Privacidade</h2>
                    <p>Diretrizes de coleta, tratamento e proteção de dados (LGPD — Lei nº 13.709/2018)</p>
                  </div>
                </div>

                {/* 1. Introdução */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">1</span>
                    Compromisso com a sua Privacidade
                  </h3>
                  <p className="legal-text">
                    A sua privacidade é um pilar essencial para o <strong>The Wine Experience</strong>. É nossa política respeitar e proteger a privacidade em relação a qualquer dado pessoal que possamos coletar através do nosso site oficial e canais integrados de agendamento de reservas e atendimento enogastronômico.
                  </p>
                  <p className="legal-text">
                    Operamos em total conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong>, adotando princípios de transparência, segurança, finalidade e minimização no tratamento dos seus dados.
                  </p>
                </div>

                {/* 2. Coleta e Finalidade */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">2</span>
                    Coleta com Consentimento e Finalidade Específica
                  </h3>
                  <p className="legal-text">
                    Solicitamos dados pessoais exclusivamente quando estritamente necessários para viabilizar os serviços de hospitalidade do restaurante. A coleta ocorre com o seu conhecimento e consentimento, com finalidades claras:
                  </p>
                  <div className="legal-commit-list">
                    <div className="legal-commit-item">
                      <span className="legal-commit-letter">A</span>
                      <div className="legal-commit-desc">
                        <strong>Gestão de Reservas:</strong> Coleta de nome completo, número de WhatsApp/telefone e e-mail para confirmação de mesa, envio de lembretes e localização no salão ou mezanino.
                      </div>
                    </div>
                    <div className="legal-commit-item">
                      <span className="legal-commit-letter">B</span>
                      <div className="legal-commit-desc">
                        <strong>Personalização da Experiência:</strong> Registro de restrições alimentares informadas, ocasiões comemorativas e preferências de rótulos para oferecer um atendimento enogastronômico refinado.
                      </div>
                    </div>
                    <div className="legal-commit-item">
                      <span className="legal-commit-letter">C</span>
                      <div className="legal-commit-desc">
                        <strong>Comunicação e Atendimento:</strong> Esclarecimento de dúvidas via WhatsApp sobre nossa carta de vinhos, eventos fechados e harmonizações autorais.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Retenção e Segurança */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">3</span>
                    Retenção e Segurança das Informações
                  </h3>
                  <p className="legal-text">
                    Mantemos as informações coletadas apenas pelo tempo necessário para a execução dos serviços solicitados ou para atendimento de obrigações legais e regulatórias.
                  </p>
                  <p className="legal-text">
                    Quando armazenamos dados, protegemos por meio de padrões técnicos e organizacionais comercialmente reconhecidos, utilizando protocolos criptografados (HTTPS/TLS) e controle de acesso restrito a fim de evitar perdas, vazamentos, acessos não autorizados ou alterações indevidas.
                  </p>
                </div>

                {/* 4. Não Compartilhamento */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">4</span>
                    Não Compartilhamento com Terceiros
                  </h3>
                  <p className="legal-text">
                    O <strong>The Wine Experience</strong> não comercializa, não aluga e não compartilha dados de identificação pessoal com terceiros para fins de marketing direto de terceiros.
                  </p>
                  <p className="legal-text">
                    O tráfego de dados restringe-se a fornecedores de tecnologia essenciais para a operação da nossa plataforma (como servidores seguros de hospedagem e gateways de mensageria oficial para confirmação de reservas) ou mediante determinação de autoridade judicial competente.
                  </p>
                </div>

                {/* 5. Direitos do Titular */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">5</span>
                    Seus Direitos como Titular de Dados (LGPD)
                  </h3>
                  <p className="legal-text">
                    Como titular dos dados, você pode exercer os seguintes direitos a qualquer momento, mediante solicitação aos nossos canais oficiais:
                  </p>
                  <ul className="legal-restriction-list">
                    <li className="legal-restriction-item">
                      <CheckCircle2 aria-hidden="true" />
                      <span>Confirmação da existência de tratamento e acesso aos dados pessoais armazenados;</span>
                    </li>
                    <li className="legal-restriction-item">
                      <CheckCircle2 aria-hidden="true" />
                      <span>Correção de dados incompletos, inexatos ou desatualizados;</span>
                    </li>
                    <li className="legal-restriction-item">
                      <CheckCircle2 aria-hidden="true" />
                      <span>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</span>
                    </li>
                    <li className="legal-restriction-item">
                      <CheckCircle2 aria-hidden="true" />
                      <span>Revogação do consentimento concedido previamente para comunicações promocionais.</span>
                    </li>
                  </ul>
                </div>

                {/* 6. Cookies */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">6</span>
                    Cookies e Tecnologias de Navegação
                  </h3>
                  <div className="legal-callout-box">
                    <div className="legal-callout-title">
                      <Cookie aria-hidden="true" />
                      <span>Utilização de Cookies Técnicos Essenciais</span>
                    </div>
                    <p>
                      Nosso site utiliza cookies técnicos para garantir o funcionamento correto da navegação, carregamento fluido dos elementos visuais e preservação de estados de reserva durante o processo de agendamento online.
                    </p>
                    <p>
                      Não utilizamos cookies invasivos de rastreamento entre domínios. Você pode configurar seu navegador para bloquear cookies a qualquer momento, ciente de que alguns recursos de navegação podem ser impactados.
                    </p>
                  </div>
                </div>

                {/* 7. Compromisso do Usuário */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">7</span>
                    Compromisso e Uso Responsável da Plataforma
                  </h3>
                  <p className="legal-text">
                    O usuário se compromete a fazer uso ético e legítimo das funcionalidades do site do <strong>The Wine Experience</strong>:
                  </p>
                  <ul className="legal-restriction-list">
                    <li className="legal-restriction-item">
                      <XCircle aria-hidden="true" />
                      <span>Não realizar reservas falsas, fraudulentas ou duplicadas propositalmente com intenção de bloquear mesas;</span>
                    </li>
                    <li className="legal-restriction-item">
                      <XCircle aria-hidden="true" />
                      <span>Não tentar burlar a segurança dos servidores, banco de dados ou sistemas de reserva do restaurante;</span>
                    </li>
                    <li className="legal-restriction-item">
                      <XCircle aria-hidden="true" />
                      <span>Não disseminar conteúdos maliciosos, bots ou códigos que possam sobrecarregar a infraestrutura digital.</span>
                    </li>
                  </ul>
                </div>

                {/* 8. Mais Informações e Contato */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">8</span>
                    Canal de Contato sobre Privacidade
                  </h3>
                  <p className="legal-text">
                    Se você tiver quaisquer dúvidas sobre nossas práticas de privacidade ou desejar exercer seus direitos como titular de dados, entre em contato através do nosso WhatsApp oficial <strong>(91) 98404-0710</strong> ou presencialmente em nosso espaço.
                  </p>

                  <div className="legal-effective-badge">
                    <div className="legal-effective-text">
                      <CheckCircle2 aria-hidden="true" />
                      <span>Esta política é efetiva e vigente a partir de:</span>
                    </div>
                    <div className="legal-effective-date">
                      Setembro de 2026
                    </div>
                  </div>
                </div>
              </section>

              {/* Divisor Estilizado Dourado */}
              <div className="legal-section-divider" />

              {/* ==============================================================
                   SEÇÃO 2: TERMOS E CONDIÇÕES DE USO
                   ============================================================== */}
              <section id="termos" className="legal-section" aria-labelledby="heading-termos">
                <div className="legal-block-header">
                  <div className="legal-block-icon">
                    <FileText aria-hidden="true" />
                  </div>
                  <div className="legal-block-info">
                    <h2 id="heading-termos">Termos e Condições de Uso</h2>
                    <p>Condições gerais de navegação, política de reservas e direitos autorais</p>
                  </div>
                </div>

                {/* 1. Aceitação */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">1</span>
                    Aceitação dos Termos
                  </h3>
                  <p className="legal-text">
                    Ao acessar e navegar pelo site do <strong>The Wine Experience</strong>, você concorda em cumprir integralmente estes Termos e Condições de Uso, bem como todas as leis e regulamentos aplicáveis. Caso não concorde com qualquer disposição aqui estabelecida, solicitamos que não continue a utilização do site ou dos serviços digitais de reservas.
                  </p>
                </div>

                {/* 2. Reservas e Cancelamento */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">2</span>
                    Política de Reservas e Cancelamentos
                  </h3>
                  <p className="legal-text">
                    As reservas realizadas através do site oficial ou via WhatsApp estão sujeitas à capacidade física de atendimento e confirmação da recepção do The Wine Experience:
                  </p>
                  <ul className="legal-restriction-list">
                    <li className="legal-restriction-item">
                      <CheckCircle2 aria-hidden="true" />
                      <span><strong>Pontualidade:</strong> A tolerância de espera para comparecimento é de 15 minutos a partir do horário reservado. Após esse período, a mesa poderá ser liberada para clientes em espera;</span>
                    </li>
                    <li className="legal-restriction-item">
                      <CheckCircle2 aria-hidden="true" />
                      <span><strong>Cancelamentos e Alterações:</strong> Solicitamos que cancelamentos ou alterações no número de convidados sejam comunicados com antecedência mínima de 2 horas através do link na página Minha Reserva ou diretamente pelo WhatsApp;</span>
                    </li>
                    <li className="legal-restriction-item">
                      <CheckCircle2 aria-hidden="true" />
                      <span><strong>Eventos e Datas Comemorativas:</strong> Políticas específicas de reserva podem ser aplicadas para eventos fechados, datas especiais ou menus harmonizados sazonais.</span>
                    </li>
                  </ul>
                </div>

                {/* 3. Propriedade Intelectual */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">3</span>
                    Propriedade Intelectual e Licença de Uso
                  </h3>
                  <p className="legal-text">
                    Todo o conteúdo contido neste site — incluindo textos, imagens autorais dos pratos e ambiente, fotografias da adega, logomarca do The Wine Experience, elementos de design e códigos-fonte — é de propriedade exclusiva do <strong>The Wine Experience</strong> e protegido pela legislação de direitos autorais e propriedade industrial brasileira.
                  </p>
                  <p className="legal-text">
                    É concedida permissão para visualização transitória de caráter pessoal e não comercial. É estritamente proibido:
                  </p>
                  <ul className="legal-restriction-list">
                    <li className="legal-restriction-item">
                      <XCircle aria-hidden="true" />
                      <span>Copiar, reproduzir ou redistribuir imagens e textos sem autorização prévia por escrito;</span>
                    </li>
                    <li className="legal-restriction-item">
                      <XCircle aria-hidden="true" />
                      <span>Utilizar materiais ou logotipos da marca para fins comerciais próprios ou de terceiros;</span>
                    </li>
                    <li className="legal-restriction-item">
                      <XCircle aria-hidden="true" />
                      <span>Realizar engenharia reversa ou descompilação de qualquer recurso tecnológico do site.</span>
                    </li>
                  </ul>
                </div>

                {/* 4. Sazonalidade e Cardápio */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">4</span>
                    Sazonalidade da Carta de Vinhos e Gastronomia
                  </h3>
                  <p className="legal-text">
                    Prezamos pelo frescor dos ingredientes e pela exclusividade de safras da nossa carta de vinhos. Por essa razão, determinados pratos, rótulos e safras especiais podem sofrer variações temporárias de disponibilidade em relação ao cardápio digital.
                  </p>
                  <p className="legal-text">
                    O The Wine Experience reserva-se o direito de atualizar preços, safras e itens do cardápio a qualquer momento para refletir as criações gastronômicas mais recentes do chef e novidades da adega.
                  </p>
                </div>

                {/* 5. Links Externos */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">5</span>
                    Links para Plataformas e Redes Externas
                  </h3>
                  <p className="legal-text">
                    Nosso site pode incluir links para plataformas externas de terceiros, como o Google Maps (para rotas de localização), redes sociais (Instagram, Facebook, TikTok, YouTube) e WhatsApp. Não nos responsabilizamos pelo conteúdo, práticas ou políticas de privacidade desses serviços independentes.
                  </p>
                </div>

                {/* 6. Foro e Lei Aplicável */}
                <div className="legal-clause">
                  <h3 className="legal-clause-title">
                    <span className="legal-clause-badge">6</span>
                    Legislação Aplicável e Foro
                  </h3>
                  <p className="legal-text">
                    Estes termos são regidos pelas leis vigentes na República Federativa do Brasil. Para dirimir qualquer controvérsia ou litígio decorrente do uso deste site ou das reservas efetuadas, fica eleito o <strong>Foro da Comarca de Belém, Estado do Pará</strong>, com expressa renúncia a qualquer outro, por mais privilegiado que seja.
                  </p>
                </div>
              </section>

              {/* Card de Suporte e Reservas */}
              <div className="legal-support-card">
                <div className="legal-support-text">
                  <h3>Dúvidas sobre nossa política ou precisa de ajuda com sua reserva?</h3>
                  <p>Nossa equipe de sommeliers e recepção está à sua disposição no mezanino do +B Supermercados em Belém.</p>
                </div>
                <div className="legal-support-actions">
                  <a
                    href="/whatsapp-reservas"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-legal-action btn-legal-primary"
                  >
                    <MessageCircle aria-hidden="true" />
                    <span>Falar no WhatsApp</span>
                  </a>
                  <Link href="/" className="btn-legal-action btn-legal-outline">
                    <ArrowLeft aria-hidden="true" />
                    <span>Voltar ao Início</span>
                  </Link>
                </div>
              </div>

            </article>
          </div>
        </div>
      </main>

      <LegalBackToTop />
      <Footer />
      <SiteBehaviorController />
    </>
  );
}
