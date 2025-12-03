/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import puppeteer, { Browser } from 'puppeteer'
import * as cheerio from 'cheerio'
import { Modelo } from './types'

const BASE_URL = 'https://fatalmodel.com'
const DELAY = 2000 // 2 segundos entre requests

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
      // 🆕 CLICAR DIRETAMENTE USANDO page.evaluate (mais confiável)
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

        // Buscar telefone no conteúdo da página
        const modalTexto = await page.evaluate(() => {
          return document.body.textContent || ''
        })

        // Procurar padrões de telefone brasileiro
        const patterns = [
          /(\d{2})\s*9?\s*\d{4}[-\s]?\d{4}/g, // (31) 99999-9999
          /(\d{10,11})/g, // 31999999999
          /wa\.me\/(?:55)?(\d{10,11})/g, // wa.me/5531999999999
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

        // Procurar links wa.me
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
  signal?: AbortSignal // 🆕 Adicionar signal para cancelamento
): Promise<Modelo[]> {
  const resultados: Modelo[] = []

  console.log('🚀 Iniciando navegador Puppeteer...')
  // const browser = await puppeteer.launch({
  //   headless: true,
  //   args: [
  //     '--no-sandbox',
  //     '--disable-setuid-sandbox',
  //     '--disable-blink-features=AutomationControlled',
  //     '--disable-web-security',
  //     '--disable-features=IsolateOrigins,site-per-process',
  //   ],
  // })
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage', // 🆕 Reduz uso de /dev/shm
      '--disable-gpu', // 🆕 Desabilita GPU
      '--disable-software-rasterizer', // 🆕 Economia de memória
      '--disable-extensions', // 🆕 Sem extensões
      '--disable-background-networking', // 🆕 Reduz processos
      '--disable-default-apps', // 🆕 Reduz processos
      '--disable-sync', // 🆕 Reduz processos
      '--metrics-recording-only', // 🆕 Reduz overhead
      '--mute-audio', // 🆕 Sem áudio
      '--no-first-run', // 🆕 Reduz processos
      '--safebrowsing-disable-auto-update', // 🆕 Reduz requests
      '--disable-notifications', // 🆕 Sem notificações
    ],
  })

  try {
    // Fase 1: Coletar IDs e slugs de todas as páginas
    console.log('📋 Fase 1: Coletando lista de modelos...')
    const todasModelos: Array<{ id: string; slug: string; pagina: number }> = []

    for (let pagina = paginaInicial; pagina <= paginaFinal; pagina++) {
      // 🆕 Verificar se foi cancelado
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

    console.log(`✅ Total de ${todasModelos.length} modelos únicas encontradas`)

    // Fase 2: Extrair telefones
    console.log('📱 Fase 2: Extraindo telefones...')

    for (let i = 0; i < todasModelos.length; i++) {
      // 🆕 Verificar se foi cancelado
      if (signal?.aborted) {
        console.log('⚠️ Operação cancelada pelo usuário')
        throw new Error('AbortError')
      }

      const { id, slug, pagina } = todasModelos[i]

      const { nome, telefone } = await extrairTelefone(browser, id, slug)

      const modelo: Modelo = {
        id,
        slug,
        nome,
        telefone,
        linkWhatsapp: telefone ? gerarLinkWhatsApp(telefone, mensagem) : '',
        pagina,
      }

      resultados.push(modelo)

      const status = telefone ? `✅ ${telefone}` : '❌ sem telefone'
      console.log(`[${i + 1}/${todasModelos.length}] ${nome}: ${status}`)

      await sleep(DELAY)
    }

    return resultados
  } finally {
    console.log('🔒 Fechando navegador...')
    await browser.close()
  }
}
