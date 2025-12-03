import { processarCidade } from '@/app/lib/scraper'
import { ScraperRequest, ScraperResponse } from '@/app/lib/types'
import { NextRequest, NextResponse } from 'next/server'

// Impede o Next.js de matar a rota antes do scraper terminar
export const maxDuration = 300 // 5 minutos

export async function POST(request: NextRequest) {
  try {
    const body: ScraperRequest = await request.json()

    if (!body.cidade) {
      return NextResponse.json(
        { error: 'Cidade é obrigatória' },
        { status: 400 }
      )
    }

    if (body.paginaFinal - body.paginaInicial > 19) {
      return NextResponse.json(
        { error: 'Máximo de 20 páginas por vez' },
        { status: 400 }
      )
    }

    if (body.paginaInicial < 1 || body.paginaFinal < 1) {
      return NextResponse.json(
        { error: 'Páginas devem ser maiores que 0' },
        { status: 400 }
      )
    }

    console.log('🚀 Iniciando scraping PLAYWRIGHT:', body)

    const modelos = await processarCidade(
      body.cidade,
      body.paginaInicial,
      body.paginaFinal,
      body.mensagem
    )

    const response: ScraperResponse = {
      cidade: body.cidade,
      paginasProcessadas: body.paginaFinal - body.paginaInicial + 1,
      totalModelos: modelos.length,
      modelos,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ ERRO no scraping:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

// import { processarCidade } from '@/app/lib/scraper'
// import { ScraperRequest, ScraperResponse } from '@/app/lib/types'
// import { NextRequest, NextResponse } from 'next/server'

// export async function POST(request: NextRequest) {
//   try {
//     const body: ScraperRequest = await request.json()

//     // Validações
//     if (!body.cidade) {
//       return NextResponse.json(
//         { error: 'Cidade é obrigatória' },
//         { status: 400 }
//       )
//     }

//     if (body.paginaFinal - body.paginaInicial > 19) {
//       return NextResponse.json(
//         { error: 'Máximo de 20 páginas por vez' },
//         { status: 400 }
//       )
//     }

//     if (body.paginaInicial < 1 || body.paginaFinal < 1) {
//       return NextResponse.json(
//         { error: 'Páginas devem ser maiores que 0' },
//         { status: 400 }
//       )
//     }

//     console.log('Iniciando scraping:', body)

//     // Processar cidade
//     const modelos = await processarCidade(
//       body.cidade,
//       body.paginaInicial,
//       body.paginaFinal,
//       body.mensagem
//     )

//     const response: ScraperResponse = {
//       cidade: body.cidade,
//       paginasProcessadas: body.paginaFinal - body.paginaInicial + 1,
//       totalModelos: modelos.length,
//       modelos,
//     }

//     return NextResponse.json(response)
//   } catch (error) {
//     console.error('Erro no scraping:', error)
//     return NextResponse.json(
//       { error: 'Erro ao processar requisição' },
//       { status: 500 }
//     )
//   }
// }
