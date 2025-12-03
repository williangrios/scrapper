export interface ScraperRequest {
  cidade: string
  paginaInicial: number
  paginaFinal: number
  mensagem: string
}

export interface Modelo {
  id: string
  slug: string
  nome: string
  telefone: string | null
  linkWhatsapp: string
  pagina: number
}

export interface ScraperResponse {
  cidade: string
  paginasProcessadas: number
  totalModelos: number
  modelos: Modelo[]
}
