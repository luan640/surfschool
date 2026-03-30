import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Waves } from 'lucide-react'

import heroImage from '@/img_lp/pexels-phoenix-main-269814337-13265591.jpg'
import surferTallImage from '@/img_lp/pexels-kampus-6299932.jpg'
import paddleImage from '@/img_lp/pexels-kampus-6299959.jpg'
import boardImage from '@/img_lp/pexels-thom-gonzalez-3126166-9321377.jpg'
import lifestyleImage from '@/img_lp/pexels-dgnrflrs-28379217.jpg'
import beachImage from '@/img_lp/pexels-alohaphotostudio-18879747.jpg'

const topNav = ['Recursos', 'Como funciona', 'Planos', 'FAQ']

const benefitCards = [
  {
    title: 'PÁGINA DA ESCOLA',
    description: 'Cada escola ganha um link prÓprio para divulgar aulas, instrutores e horÁrios.',
    image: boardImage,
    imageAlt: 'Surfista em uma onda, representando a pagina publica da escola',
  },
  {
    title: 'RESERVA RÁPIDA',
    description: 'O aluno escolhe o serviço, data e instrutor em poucos passos, sem troca manual de mensagens.',
    image: paddleImage,
    imageAlt: 'Aluno no mar com prancha, representando a experiencia de reserva',
  },
  {
    title: 'PAGAMENTO INTEGRADO',
    description: 'PIX e cartão no mesmo fluxo para confirmar aulas e reduzir atrito na venda.',
    image: lifestyleImage,
    imageAlt: 'Pessoa com prancha na praia, representando a confirmacao da aula',
  },
]

const faqItems = [
  'Como o aluno encontra a pagina da escola?',
  'A plataforma aceita pix e cartao?',
  'Consigo vender aula avulsa e pacote?',
  'O aluno pode entrar para ver historico e proximas aulas?',
]

export default function HomePage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f2f4f7] text-slate-950">
      <main className="pb-10 sm:pb-14">
        <section className="overflow-hidden bg-[#051725] shadow-[0_30px_80px_rgba(5,23,37,0.22)]">
          <div className="relative min-h-[640px] overflow-hidden px-5 py-5 sm:px-8 sm:py-7">
            <Image
              src={heroImage}
              alt="Surfista em uma onda grande no mar"
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,23,37,0.92)_0%,rgba(5,23,37,0.58)_42%,rgba(5,23,37,0.12)_100%)]" />
            <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(5,23,37,0.72),transparent)]" />

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b2436] text-white ring-1 ring-white/12">
                    <Waves size={18} />
                  </div>
                  <span className="font-condensed text-3xl font-bold uppercase tracking-[0.08em] text-white">
                    vamosurfar
                  </span>
                </div>

                <div className="hidden items-center gap-6 lg:flex">
                  {topNav.map((item) => (
                    <a
                      key={item}
                      href={
                        item === 'Como funciona'
                          ? '#como-funciona'
                          : item === 'Planos'
                            ? '#planos'
                            : item === 'FAQ'
                              ? '#faq'
                              : '#recursos'
                      }
                      className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white"
                    >
                      {item}
                    </a>
                  ))}
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-2 border border-[#b6f000] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#b6f000] hover:text-[#051725]"
                  >
                    Join
                  </Link>
                </div>
              </div>

              <div className="flex flex-1 items-center py-10 sm:py-14">
                <div className="max-w-[520px]">
                  <h1 className="mt-3 font-condensed text-5xl font-bold uppercase leading-[0.84] tracking-[0.02em] text-white sm:text-6xl lg:text-[5.75rem]">
                    <span className="text-[#c7ff3c]">GESTÃO</span>
                    <br />
                    DA SUA ESCOLA
                  </h1>
                  <p className="mt-4 max-w-[430px] text-base leading-relaxed text-white/80 sm:text-lg">
                    Uma plataforma para organizar agenda, pagamentos, alunos e operacao da sua escola de surf.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="/auth/register"
                      className="inline-flex items-center justify-center gap-2 border border-[#b6f000] px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#b6f000] hover:text-[#051725]"
                    >
                      Juntar-se
                      <ChevronRight size={15} />
                    </Link>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center border border-white/28 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
                    >
                      Sou escola
                    </Link>
                    <Link
                      href="/aluno"
                      className="inline-flex items-center justify-center border border-white/28 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
                    >
                      Sou aluno
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="recursos"
          className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#061b2a] px-4 py-8 text-white shadow-[0_24px_70px_rgba(6,27,42,0.16)] sm:px-6 lg:px-10"
        >
          <div className="mx-auto max-w-[1400px]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="mt-3 font-condensed text-4xl font-bold uppercase leading-[0.88] tracking-[0.04em] sm:text-5xl">
                  TUDO O QUE SUA
                  <br />
                  ESCOLA PRECISA
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {benefitCards.map((item) => (
                <article
                  key={item.title}
                  className="overflow-hidden border border-white/14 bg-white/[0.04]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-white/12">
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7ff3c]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/74">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-white px-4 py-8 shadow-[0_26px_70px_rgba(15,23,42,0.08)] sm:px-6 lg:px-10">
          <div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <h2 className="mt-4 font-condensed text-4xl font-bold uppercase leading-[0.88] tracking-[0.04em] text-slate-950 sm:text-5xl">
                SURF TRIPS
              </h2>
              <p className="mt-5 max-w-[440px] text-base leading-relaxed text-slate-600">
                Organize viagens da escola com pagina pública, vagas, datas, pagamento e acompanhamento das inscrições no mesmo painel.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="border-l-4 border-[#0d1b2a] pl-3">
                  <p className="font-condensed text-3xl font-bold uppercase tracking-[0.05em] text-slate-950">PUBLICA</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Pagina da trip</p>
                </div>
                <div className="border-l-4 border-[#0d1b2a] pl-3">
                  <p className="font-condensed text-3xl font-bold uppercase tracking-[0.05em] text-slate-950">ONLINE</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Inscricao</p>
                </div>
                <div className="border-l-4 border-[#0d1b2a] pl-3">
                  <p className="font-condensed text-3xl font-bold uppercase tracking-[0.05em] text-slate-950">TOTAL</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Controle</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[paddleImage, lifestyleImage, beachImage].map((image, index) => (
                  <div key={index} className="relative aspect-[1.15/1] overflow-hidden border border-slate-200">
                    <Image src={image} alt={`Galeria da plataforma ${index + 1}`} fill className="object-cover" sizes="180px" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="relative aspect-[16/9] overflow-hidden border border-slate-200 bg-slate-100">
                <Image src={surferTallImage} alt="Surfista em pe na prancha" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 42vw" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(5,23,37,0.52))]" />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border border-slate-200 bg-[#f7f9fb] p-5">
                  <h3 className="font-condensed text-2xl font-bold uppercase tracking-[0.05em] text-slate-950">
                    PARA QUE SERVE?
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    Para escolas que promovem surf trips e querem centralizar divulgacao, inscricoes e status dos participantes.
                  </p>
                </div>
                <div id="como-funciona" className="border border-slate-200 bg-[#f7f9fb] p-5">
                  <h3 className="font-condensed text-2xl font-bold uppercase tracking-[0.05em] text-slate-950">
                    FLUXO
                  </h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <p>01. Escola publica a surf trip.</p>
                    <p>02. Aluno se inscreve e paga.</p>
                    <p>03. Painel acompanha vagas e inscritos.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="planos" className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-white px-4 py-8 shadow-[0_26px_70px_rgba(15,23,42,0.08)] sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <h2 className="text-center font-condensed text-4xl font-bold uppercase tracking-[0.04em] text-slate-950 sm:text-5xl">
              ESCOLHA SEU PLANO
            </h2>

            <div className="mt-6 flex justify-center">
              <article className="w-full max-w-[760px] border border-[#d7f86d] bg-[#061b2a] p-6 text-center text-white shadow-[0_14px_40px_rgba(15,23,42,0.05)] sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c7ff3c]">Plano da plataforma</p>
                <h3 className="mt-4 font-condensed text-5xl font-bold uppercase tracking-[0.05em] sm:text-6xl">99,90/mês</h3>
                <p className="mx-auto mt-4 max-w-[420px] text-sm leading-relaxed text-white/72 sm:text-base">
                  Um plano para centralizar agenda, pagamentos, trips e operação da sua escola.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 border border-[#d7f86d] bg-[#d7f86d] px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#061b2a]"
                  >
                    Começar agora
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
          <section id="faq" className="rounded-[2rem] bg-[#061b2a] px-5 py-6 text-white shadow-[0_26px_70px_rgba(6,27,42,0.16)] sm:px-6 sm:py-8">
            <h2 className="font-condensed text-4xl font-bold uppercase tracking-[0.04em]">FAQ</h2>
            <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {faqItems.map((item) => (
                <div key={item} className="flex items-center justify-between gap-4 py-5">
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-white/88">{item}</p>
                  <span className="text-[#c7ff3c]">+</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="px-4 pb-8 sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#061b2a] text-white">
              <Waves size={18} />
            </div>
            <div>
              <p className="font-condensed text-2xl font-bold uppercase tracking-[0.08em] text-slate-950">vamosurfar</p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Plataforma para escolas de surf
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/aluno" className="transition-colors hover:text-slate-950">
                Sou aluno
              </Link>
              <Link href="/auth/login" className="transition-colors hover:text-slate-950">
                Ja tenho escola cadastrada
              </Link>
              <Link href="/auth/register" className="transition-colors hover:text-slate-950">
                Cadastrar escola
              </Link>
            </div>
            <p>{currentYear} vamosurfar. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
