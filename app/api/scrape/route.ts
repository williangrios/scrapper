/* eslint-disable @typescript-eslint/no-explicit-any */
import { processarCidade } from '@/app/lib/scraper'
import { ScraperRequest, ScraperResponse } from '@/app/lib/types'
import { NextRequest, NextResponse } from 'next/server'

// Timeout de 10 minutos
const TIMEOUT_MS = 10 * 60 * 1000

export async function POST(request: NextRequest) {
  // Criar AbortController para timeout
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS)

  try {
    const body: ScraperRequest = await request.json()

    // Validações
    if (!body.cidade) {
      clearTimeout(timeoutId)
      return NextResponse.json(
        { error: 'Cidade é obrigatória' },
        { status: 400 }
      )
    }

    if (body.paginaFinal - body.paginaInicial > 19) {
      clearTimeout(timeoutId)
      return NextResponse.json(
        { error: 'Máximo de 20 páginas por vez' },
        { status: 400 }
      )
    }

    if (body.paginaInicial < 1 || body.paginaFinal < 1) {
      clearTimeout(timeoutId)
      return NextResponse.json(
        { error: 'Páginas devem ser maiores que 0' },
        { status: 400 }
      )
    }

    console.log('🚀 Iniciando scraping:', body)

    // Processar cidade com verificação de abort
    const modelos = await processarCidade(
      body.cidade,
      body.paginaInicial,
      body.paginaFinal,
      body.mensagem,
      abortController.signal
    )

    clearTimeout(timeoutId)

    const response: ScraperResponse = {
      cidade: body.cidade,
      paginasProcessadas: body.paginaFinal - body.paginaInicial + 1,
      totalModelos: modelos.length,
      modelos,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      console.log('⚠️ Requisição cancelada ou timeout atingido')
      return NextResponse.json(
        { error: 'Requisição cancelada ou tempo limite excedido' },
        { status: 408 }
      )
    }

    console.error('❌ Erro no scraping:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}
