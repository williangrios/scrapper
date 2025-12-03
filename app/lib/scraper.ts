import { chromium } from 'playwright'
import { Modelo } from './types'

export async function processarCidade(
  cidadeSlug: string,
  paginaInicial: number,
  paginaFinal: number,
  mensagem: string,
  onProgress?: (progresso: {
    pagina: number
    total: number
    modelo: Modelo
  }) => void
): Promise<Modelo[]> {
  console.log('🚀 Iniciando Playwright...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  const resultados: Modelo[] = []

  try {
    for (let pagina = paginaInicial; pagina <= paginaFinal; pagina++) {
      const url = `https://fatalmodel.com/acompanhantes-${cidadeSlug}?page=${pagina}`
      console.log(`\n🔍 Acessando página: ${url}`)

      await page.goto(url, { waitUntil: 'networkidle' })

      // Capturar links de modelos
      const links = await page.$$eval('a[href*="/acompanhante/"]', (elements) =>
        elements.map((el) => el.getAttribute('href'))
      )

      console.log(`📌 Links encontrados:`, links)

      if (!links || links.length === 0) {
        console.log('⚠️ Nenhum link encontrado. Pode ser fim da listagem.')
        continue
      }

      for (const link of links) {
        if (!link) continue

        const match = link.match(/\/acompanhante\/(\d+)\/([^\/\?]+)/)
        if (!match) continue

        const id = match[1]
        const slug = match[2]

        console.log(`➡️ Abrindo modelo: ${id} - ${slug}`)

        const perfilUrl = `https://fatalmodel.com/acompanhante/${id}/${slug}`
        await page.goto(perfilUrl, { waitUntil: 'networkidle' })

        // Extrair JSON do window.__NUXT__
        const nuxtData = await page.evaluate(() => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          return window.__NUXT__ || null
        })

        let telefone: string | null = null
        let nome: string = slug

        if (nuxtData && nuxtData.data) {
          for (const key in nuxtData.data) {
            const entry = nuxtData.data[key]
            if (entry?.data?.ad) {
              telefone = entry.data.ad.phone_number_whatsapp || null
              nome = entry.data.ad.title || slug
            }
          }
        }

        const modelo: Modelo = {
          id,
          slug,
          nome,
          telefone,
          linkWhatsapp: telefone
            ? `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`
            : '',
          pagina,
        }

        resultados.push(modelo)

        console.log(`📞 Telefone encontrado: ${telefone ? telefone : 'nenhum'}`)

        if (onProgress) {
          onProgress({
            pagina: resultados.length,
            total: links.length,
            modelo,
          })
        }
      }
    }
  } catch (e) {
    console.error('❌ ERRO NO SCRAPER:', e)
  } finally {
    console.log('🧹 Fechando navegador...')
    await browser.close()
  }

  console.log(`🏁 Finalizado. Total de modelos extraídos: ${resultados.length}`)

  return resultados
}

// import axios from 'axios'
// import * as cheerio from 'cheerio'
// import { Modelo } from './types'

// const BASE_URL = 'https://fatalmodel.com'
// const DELAY = 1000 // 1 segundo entre requests

// const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// /**
//  * Busca modelos de uma página específica da listagem
//  */
// export async function buscarModelosPagina(
//   cidadeSlug: string,
//   pagina: number
// ): Promise<Array<{ id: string; slug: string }>> {
//   const url = `${BASE_URL}/project-seo-pages/ad-listing/acompanhantes-${cidadeSlug}/cards`

//   console.log(`🔍 Buscando página ${pagina} de ${cidadeSlug}...`)

//   try {
//     const response = await axios.get(url, {
//       params: { page: pagina },
//       headers: {
//         'User-Agent':
//           'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//         Accept:
//           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//         'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
//         'Accept-Encoding': 'gzip, deflate, br',
//         Connection: 'keep-alive',
//         Referer: 'https://fatalmodel.com/',
//         'Sec-Fetch-Dest': 'document',
//         'Sec-Fetch-Mode': 'navigate',
//         'Sec-Fetch-Site': 'same-origin',
//         'Upgrade-Insecure-Requests': '1',
//       },
//     })

//     console.log(`✅ Status: ${response.status}`)

//     const html = response.data
//     const $ = cheerio.load(html)
//     const modelos: Array<{ id: string; slug: string }> = []

//     // Extrair links de modelos
//     $('a[href*="/acompanhante/"]').each((_, element) => {
//       const href = $(element).attr('href')
//       if (href) {
//         const match = href.match(/\/acompanhante\/(\d+)\/([^\/\?]+)/)
//         if (match) {
//           modelos.push({
//             id: match[1],
//             slug: match[2],
//           })
//         }
//       }
//     })

//     console.log(`🎯 Total de modelos extraídas: ${modelos.length}`)
//     return modelos
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (error: any) {
//     console.error(`❌ Erro ao buscar página ${pagina}:`, error.message)
//     return []
//   }
// }

// /**
//  * Extrai telefone do perfil da modelo
//  */
// export async function extrairTelefone(
//   id: string,
//   slug: string
// ): Promise<{ nome: string; telefone: string | null }> {
//   const url = `${BASE_URL}/acompanhante/${id}/${slug}`

//   try {
//     const response = await axios.get(url, {
//       headers: {
//         'User-Agent':
//           'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//         Accept:
//           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//         'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
//         'Accept-Encoding': 'gzip, deflate, br',
//         Connection: 'keep-alive',
//         Referer: 'https://fatalmodel.com/',
//         'Sec-Fetch-Dest': 'document',
//         'Sec-Fetch-Mode': 'navigate',
//         'Sec-Fetch-Site': 'same-origin',
//         'Upgrade-Insecure-Requests': '1',
//       },
//     })

//     const html = response.data

//     // Extrair window.__NUXT__
//     const match = html.match(/window\.__NUXT__\s*=\s*({.+?});/s)
//     if (!match) {
//       return { nome: slug, telefone: null }
//     }

//     const nuxtData = JSON.parse(match[1])

//     // Navegar pelo JSON para encontrar telefone
//     let telefone: string | null = null
//     let nome: string = slug

//     // Procurar em todas as chaves do data
//     for (const key in nuxtData.data) {
//       if (
//         typeof nuxtData.data[key] === 'object' &&
//         nuxtData.data[key]?.data?.ad
//       ) {
//         const ad = nuxtData.data[key].data.ad
//         telefone = ad.phone_number_whatsapp || null
//         nome = ad.title || slug
//         break
//       }
//     }

//     return { nome, telefone }
//   } catch (error) {
//     console.error(`Erro ao extrair telefone de ${slug}:`, error)
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
//   onProgress?: (progresso: {
//     pagina: number
//     total: number
//     modelo: Modelo
//   }) => void
// ): Promise<Modelo[]> {
//   const resultados: Modelo[] = []

//   // Fase 1: Coletar IDs e slugs de todas as páginas
//   console.log('Fase 1: Coletando lista de modelos...')
//   const todasModelos: Array<{ id: string; slug: string; pagina: number }> = []

//   for (let pagina = paginaInicial; pagina <= paginaFinal; pagina++) {
//     console.log(`Buscando página ${pagina}...`)
//     const modelos = await buscarModelosPagina(cidadeSlug, pagina)

//     if (modelos.length === 0) {
//       console.log(`Página ${pagina} vazia ou fim da listagem.`)
//       break
//     }

//     todasModelos.push(...modelos.map((m) => ({ ...m, pagina })))
//     await sleep(DELAY)
//   }

//   console.log(`Total de modelos encontradas: ${todasModelos.length}`)

//   // Fase 2: Extrair telefones
//   console.log('Fase 2: Extraindo telefones...')

//   for (let i = 0; i < todasModelos.length; i++) {
//     const { id, slug, pagina } = todasModelos[i]

//     const { nome, telefone } = await extrairTelefone(id, slug)

//     const modelo: Modelo = {
//       id,
//       slug,
//       nome,
//       telefone,
//       linkWhatsapp: telefone ? gerarLinkWhatsApp(telefone, mensagem) : '',
//       pagina,
//     }

//     resultados.push(modelo)

//     if (onProgress) {
//       onProgress({
//         pagina: i + 1,
//         total: todasModelos.length,
//         modelo,
//       })
//     }

//     console.log(
//       `[${i + 1}/${todasModelos.length}] ${nome}: ${telefone || 'sem telefone'}`
//     )

//     await sleep(DELAY)
//   }

//   return resultados
// }
