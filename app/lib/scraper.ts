/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import puppeteer, { Browser } from 'puppeteer'
import * as cheerio from 'cheerio'
import { Modelo } from './types'

const BASE_URL = 'https://fatalmodel.com'
const DELAY = 1000 // 1 segundo entre lotes
const LOTE_SIZE = 10 // Processar 5 modelos por vez

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Formata tempo em formato legível
 */
function formatarTempo(ms: number): string {
  const segundos = Math.floor(ms / 1000)
  const minutos = Math.floor(segundos / 60)
  const segsRestantes = segundos % 60

  if (minutos > 0) {
    return `${minutos}min ${segsRestantes}s`
  }
  return `${segundos}s`
}

/**
 * Busca modelos de uma página específica da listagem
 */
export async function buscarModelosPagina(
  browser: Browser,
  cidadeSlug: string,
  pagina: number
): Promise<Array<{ id: string; slug: string }>> {
  const url = `${BASE_URL}/project-seo-pages/ad-listing/acompanhantes-${cidadeSlug}/cards?page=${pagina}`

  console.log(`🔍 Buscando página ${pagina} de ${cidadeSlug}...`)

  const page = await browser.newPage()

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    await page.setViewport({ width: 1920, height: 1080 })

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
    })

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await sleep(2000)

    const html = await page.content()
    const $ = cheerio.load(html)

    const modelosSet = new Set<string>()
    const modelos: Array<{ id: string; slug: string }> = []

    $('a[href*="/acompanhante/"]').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        const match = href.match(/\/acompanhante\/(\d+)\/([^\/\?]+)/)
        if (match) {
          const id = match[1]
          const slug = match[2]
          const key = `${id}-${slug}`

          if (!modelosSet.has(key)) {
            modelosSet.add(key)
            modelos.push({ id, slug })
          }
        }
      }
    })

    console.log(`🎯 Encontradas ${modelos.length} modelos únicas`)

    await page.close()
    return modelos
  } catch (error: any) {
    console.error(`❌ Erro ao buscar página ${pagina}:`, error.message)
    await page.close()
    return []
  }
}

/**
 * Extrai telefone do perfil da modelo clicando no botão WhatsApp
 */
export async function extrairTelefone(
  browser: Browser,
  id: string,
  slug: string
): Promise<{ nome: string; telefone: string | null }> {
  const url = `${BASE_URL}/acompanhante/${id}/${slug}`

  const page = await browser.newPage()

  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    await page.setViewport({ width: 1920, height: 1080 })

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
    })

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await sleep(2000)

    const nome = await page.title()
    let telefone: string | null = null

    try {
      const clicouComSucesso = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'))
        const botao = buttons.find(
          (btn) =>
            btn.textContent?.toLowerCase().includes('whatsapp') ||
            btn.textContent?.toLowerCase().includes('chamar')
        )

        if (botao && botao instanceof HTMLElement) {
          botao.click()
          return true
        }
        return false
      })

      if (clicouComSucesso) {
        await sleep(3000)

        const modalTexto = await page.evaluate(() => {
          return document.body.textContent || ''
        })

        const patterns = [
          /(\d{2})\s*9?\s*\d{4}[-\s]?\d{4}/g,
          /(\d{10,11})/g,
          /wa\.me\/(?:55)?(\d{10,11})/g,
        ]

        for (const pattern of patterns) {
          const matches = modalTexto.match(pattern)
          if (matches && matches.length > 0) {
            telefone = matches[0].replace(/\D/g, '')
            if (telefone?.length >= 10) {
              break
            }
          }
        }

        if (!telefone) {
          const linkWa = await page.evaluate(() => {
            const links = Array.from(
              document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]')
            )
            return links.length > 0
              ? (links[0] as HTMLAnchorElement).href
              : null
          })

          if (linkWa) {
            const match = linkWa.match(/wa\.me\/(?:55)?(\d+)/)
            if (match) {
              telefone = match[1]
            }
          }
        }
      }
    } catch (e) {
      console.log(`  ⚠️ Erro ao extrair telefone de ${slug}`)
    }

    await page.close()
    return { nome: nome.split('|')[0].trim() || slug, telefone }
  } catch (error) {
    console.error(`❌ Erro ao acessar perfil ${slug}:`, error)
    await page.close()
    return { nome: slug, telefone: null }
  }
}

/**
 * Gera link do WhatsApp com mensagem
 */
export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const mensagemEncoded = encodeURIComponent(mensagem)
  return `https://wa.me/55${telefone}?text=${mensagemEncoded}`
}

/**
 * Processa múltiplas páginas de uma cidade
 */
export async function processarCidade(
  cidadeSlug: string,
  paginaInicial: number,
  paginaFinal: number,
  mensagem: string,
  signal?: AbortSignal
): Promise<Modelo[]> {
  const resultados: Modelo[] = []

  // 🆕 INÍCIO - Marcar tempo inicial
  const tempoInicio = Date.now()
  console.log(`⏰ Início: ${new Date(tempoInicio).toLocaleTimeString('pt-BR')}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  console.log('🚀 Iniciando navegador Puppeteer...')
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--disable-notifications',
    ],
  })

  try {
    // Fase 1: Coletar IDs e slugs de todas as páginas
    const tempoFase1Inicio = Date.now()
    console.log('📋 Fase 1: Coletando lista de modelos...')

    const todasModelos: Array<{ id: string; slug: string; pagina: number }> = []

    for (let pagina = paginaInicial; pagina <= paginaFinal; pagina++) {
      if (signal?.aborted) {
        console.log('⚠️ Operação cancelada pelo usuário')
        throw new Error('AbortError')
      }

      const modelos = await buscarModelosPagina(browser, cidadeSlug, pagina)

      if (modelos.length === 0) {
        console.log(`⚠️ Página ${pagina} vazia - fim da listagem`)
        break
      }

      todasModelos.push(...modelos.map((m) => ({ ...m, pagina })))
      await sleep(DELAY)
    }

    const tempoFase1 = Date.now() - tempoFase1Inicio
    console.log(`✅ Total de ${todasModelos.length} modelos únicas encontradas`)
    console.log(`⏱️ Fase 1 concluída em: ${formatarTempo(tempoFase1)}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Fase 2: Extrair telefones EM PARALELO
    const tempoFase2Inicio = Date.now()
    console.log(`📱 Fase 2: Extraindo telefones (${LOTE_SIZE} por vez)...`)

    for (let i = 0; i < todasModelos.length; i += LOTE_SIZE) {
      if (signal?.aborted) {
        console.log('⚠️ Operação cancelada pelo usuário')
        throw new Error('AbortError')
      }

      const loteInicio = Date.now()
      const lote = todasModelos.slice(i, i + LOTE_SIZE)

      // Processar lote em paralelo
      const resultadosLote = await Promise.all(
        lote.map(async ({ id, slug, pagina }) => {
          const { nome, telefone } = await extrairTelefone(browser, id, slug)

          return {
            id,
            slug,
            nome,
            telefone,
            linkWhatsapp: telefone ? gerarLinkWhatsApp(telefone, mensagem) : '',
            pagina,
          }
        })
      )

      const loteTempo = Date.now() - loteInicio
      resultados.push(...resultadosLote)

      // Exibir progresso
      resultadosLote.forEach((modelo, idx) => {
        const status = modelo.telefone
          ? `✅ ${modelo.telefone}`
          : '❌ sem telefone'
        console.log(
          `[${i + idx + 1}/${todasModelos.length}] ${modelo.nome}: ${status}`
        )
      })

      console.log(`   ⏱️ Lote processado em: ${formatarTempo(loteTempo)}`)

      // Delay entre lotes (não entre cada modelo)
      if (i + LOTE_SIZE < todasModelos.length) {
        await sleep(DELAY)
      }
    }

    const tempoFase2 = Date.now() - tempoFase2Inicio
    console.log(`⏱️ Fase 2 concluída em: ${formatarTempo(tempoFase2)}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return resultados
  } finally {
    console.log('🔒 Fechando navegador...')
    await browser.close()

    // 🆕 FIM - Calcular tempo total
    const tempoTotal = Date.now() - tempoInicio
    const tempoFim = Date.now()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`⏰ Fim: ${new Date(tempoFim).toLocaleTimeString('pt-BR')}`)
    console.log(`🎯 TEMPO TOTAL: ${formatarTempo(tempoTotal)}`)
    console.log(
      `📊 Média por modelo: ${Math.round(
        tempoTotal / resultados.length / 1000
      )}s`
    )
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }
}

// /* eslint-disable @typescript-eslint/no-require-imports */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// import puppeteer, { Browser } from 'puppeteer'
// import * as cheerio from 'cheerio'
// import { Modelo } from './types'

// const BASE_URL = 'https://fatalmodel.com'
// const DELAY = 2000 // 2 segundos entre requests

// const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// /**
//  * Busca modelos de uma página específica da listagem
//  */
// export async function buscarModelosPagina(
//   browser: Browser,
//   cidadeSlug: string,
//   pagina: number
// ): Promise<Array<{ id: string; slug: string }>> {
//   const url = `${BASE_URL}/project-seo-pages/ad-listing/acompanhantes-${cidadeSlug}/cards?page=${pagina}`

//   console.log(`🔍 Buscando página ${pagina} de ${cidadeSlug}...`)

//   const page = await browser.newPage()

//   try {
//     await page.setUserAgent(
//       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
//     )
//     await page.setViewport({ width: 1920, height: 1080 })

//     await page.evaluateOnNewDocument(() => {
//       Object.defineProperty(navigator, 'webdriver', { get: () => false })
//     })

//     await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
//     await sleep(2000)

//     const html = await page.content()
//     const $ = cheerio.load(html)

//     const modelosSet = new Set<string>()
//     const modelos: Array<{ id: string; slug: string }> = []

//     $('a[href*="/acompanhante/"]').each((_, element) => {
//       const href = $(element).attr('href')
//       if (href) {
//         const match = href.match(/\/acompanhante\/(\d+)\/([^\/\?]+)/)
//         if (match) {
//           const id = match[1]
//           const slug = match[2]
//           const key = `${id}-${slug}`

//           if (!modelosSet.has(key)) {
//             modelosSet.add(key)
//             modelos.push({ id, slug })
//           }
//         }
//       }
//     })

//     console.log(`🎯 Encontradas ${modelos.length} modelos únicas`)

//     await page.close()
//     return modelos
//   } catch (error: any) {
//     console.error(`❌ Erro ao buscar página ${pagina}:`, error.message)
//     await page.close()
//     return []
//   }
// }

// /**
//  * Extrai telefone do perfil da modelo clicando no botão WhatsApp
//  */
// export async function extrairTelefone(
//   browser: Browser,
//   id: string,
//   slug: string
// ): Promise<{ nome: string; telefone: string | null }> {
//   const url = `${BASE_URL}/acompanhante/${id}/${slug}`

//   const page = await browser.newPage()

//   try {
//     await page.setUserAgent(
//       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
//     )
//     await page.setViewport({ width: 1920, height: 1080 })

//     await page.evaluateOnNewDocument(() => {
//       Object.defineProperty(navigator, 'webdriver', { get: () => false })
//     })

//     await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
//     await sleep(2000)

//     const nome = await page.title()
//     let telefone: string | null = null

//     try {
//       // 🆕 CLICAR DIRETAMENTE USANDO page.evaluate (mais confiável)
//       const clicouComSucesso = await page.evaluate(() => {
//         const buttons = Array.from(document.querySelectorAll('button, a'))
//         const botao = buttons.find(
//           (btn) =>
//             btn.textContent?.toLowerCase().includes('whatsapp') ||
//             btn.textContent?.toLowerCase().includes('chamar')
//         )

//         if (botao && botao instanceof HTMLElement) {
//           botao.click()
//           return true
//         }
//         return false
//       })

//       if (clicouComSucesso) {
//         await sleep(3000)

//         // Buscar telefone no conteúdo da página
//         const modalTexto = await page.evaluate(() => {
//           return document.body.textContent || ''
//         })

//         // Procurar padrões de telefone brasileiro
//         const patterns = [
//           /(\d{2})\s*9?\s*\d{4}[-\s]?\d{4}/g, // (31) 99999-9999
//           /(\d{10,11})/g, // 31999999999
//           /wa\.me\/(?:55)?(\d{10,11})/g, // wa.me/5531999999999
//         ]

//         for (const pattern of patterns) {
//           const matches = modalTexto.match(pattern)
//           if (matches && matches.length > 0) {
//             telefone = matches[0].replace(/\D/g, '')
//             if (telefone?.length >= 10) {
//               break
//             }
//           }
//         }

//         // Procurar links wa.me
//         if (!telefone) {
//           const linkWa = await page.evaluate(() => {
//             const links = Array.from(
//               document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]')
//             )
//             return links.length > 0
//               ? (links[0] as HTMLAnchorElement).href
//               : null
//           })

//           if (linkWa) {
//             const match = linkWa.match(/wa\.me\/(?:55)?(\d+)/)
//             if (match) {
//               telefone = match[1]
//             }
//           }
//         }
//       }
//     } catch (e) {
//       console.log(`  ⚠️ Erro ao extrair telefone de ${slug}`)
//     }

//     await page.close()
//     return { nome: nome.split('|')[0].trim() || slug, telefone }
//   } catch (error) {
//     console.error(`❌ Erro ao acessar perfil ${slug}:`, error)
//     await page.close()
//     return { nome: slug, telefone: null }
//   }
// }

// /**
//  * Gera link do WhatsApp com mensagem
//  */
// export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
//   const mensagemEncoded = encodeURIComponent(mensagem)
//   return `https://wa.me/55${telefone}?text=${mensagemEncoded}`
// }

// /**
//  * Processa múltiplas páginas de uma cidade
//  */
// export async function processarCidade(
//   cidadeSlug: string,
//   paginaInicial: number,
//   paginaFinal: number,
//   mensagem: string,
//   signal?: AbortSignal // 🆕 Adicionar signal para cancelamento
// ): Promise<Modelo[]> {
//   const resultados: Modelo[] = []

//   console.log('🚀 Iniciando navegador Puppeteer...')
//   // const browser = await puppeteer.launch({
//   //   headless: true,
//   //   args: [
//   //     '--no-sandbox',
//   //     '--disable-setuid-sandbox',
//   //     '--disable-blink-features=AutomationControlled',
//   //     '--disable-web-security',
//   //     '--disable-features=IsolateOrigins,site-per-process',
//   //   ],
//   // })
//   const browser = await puppeteer.launch({
//     headless: true,
//     args: [
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-blink-features=AutomationControlled',
//       '--disable-web-security',
//       '--disable-features=IsolateOrigins,site-per-process',
//       '--disable-dev-shm-usage', // 🆕 Reduz uso de /dev/shm
//       '--disable-gpu', // 🆕 Desabilita GPU
//       '--disable-software-rasterizer', // 🆕 Economia de memória
//       '--disable-extensions', // 🆕 Sem extensões
//       '--disable-background-networking', // 🆕 Reduz processos
//       '--disable-default-apps', // 🆕 Reduz processos
//       '--disable-sync', // 🆕 Reduz processos
//       '--metrics-recording-only', // 🆕 Reduz overhead
//       '--mute-audio', // 🆕 Sem áudio
//       '--no-first-run', // 🆕 Reduz processos
//       '--safebrowsing-disable-auto-update', // 🆕 Reduz requests
//       '--disable-notifications', // 🆕 Sem notificações
//     ],
//   })

//   try {
//     // Fase 1: Coletar IDs e slugs de todas as páginas
//     console.log('📋 Fase 1: Coletando lista de modelos...')
//     const todasModelos: Array<{ id: string; slug: string; pagina: number }> = []

//     for (let pagina = paginaInicial; pagina <= paginaFinal; pagina++) {
//       // 🆕 Verificar se foi cancelado
//       if (signal?.aborted) {
//         console.log('⚠️ Operação cancelada pelo usuário')
//         throw new Error('AbortError')
//       }

//       const modelos = await buscarModelosPagina(browser, cidadeSlug, pagina)

//       if (modelos.length === 0) {
//         console.log(`⚠️ Página ${pagina} vazia - fim da listagem`)
//         break
//       }

//       todasModelos.push(...modelos.map((m) => ({ ...m, pagina })))
//       await sleep(DELAY)
//     }

//     console.log(`✅ Total de ${todasModelos.length} modelos únicas encontradas`)

//     // Fase 2: Extrair telefones
//     console.log('📱 Fase 2: Extraindo telefones...')

//     for (let i = 0; i < todasModelos.length; i++) {
//       // 🆕 Verificar se foi cancelado
//       if (signal?.aborted) {
//         console.log('⚠️ Operação cancelada pelo usuário')
//         throw new Error('AbortError')
//       }

//       const { id, slug, pagina } = todasModelos[i]

//       const { nome, telefone } = await extrairTelefone(browser, id, slug)

//       const modelo: Modelo = {
//         id,
//         slug,
//         nome,
//         telefone,
//         linkWhatsapp: telefone ? gerarLinkWhatsApp(telefone, mensagem) : '',
//         pagina,
//       }

//       resultados.push(modelo)

//       const status = telefone ? `✅ ${telefone}` : '❌ sem telefone'
//       console.log(`[${i + 1}/${todasModelos.length}] ${nome}: ${status}`)

//       await sleep(DELAY)
//     }

//     return resultados
//   } finally {
//     console.log('🔒 Fechando navegador...')
//     await browser.close()
//   }
// }
