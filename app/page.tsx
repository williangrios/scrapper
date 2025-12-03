'use client'

import { useState } from 'react'
import { ScraperResponse } from './lib/types'

export default function Home() {
  const [cidade, setCidade] = useState('')
  const [paginaInicial, setPaginaInicial] = useState(1)
  const [paginaFinal, setPaginaFinal] = useState(20)
  const [mensagem, setMensagem] = useState(
    `Olá! Vi seu perfil no FatalModel.

Tenho uma proposta de parceria para você trabalhar em nossa plataforma de lives.

Você teria interesse em conhecer mais?`
  )

  const [loading, setLoading] = useState(false)
  const [resultados, setResultados] = useState<ScraperResponse | null>(null)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setResultados(null)

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cidade,
          paginaInicial,
          paginaFinal,
          mensagem,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao processar')
      }

      const data: ScraperResponse = await response.json()
      setResultados(data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setErro(error.message)
    } finally {
      setLoading(false)
    }
  }

  const exportarCSV = () => {
    if (!resultados) return

    const csv = [
      ['#', 'Nome', 'Telefone', 'Link WhatsApp', 'Página'],
      ...resultados.modelos.map((m, i) => [
        i + 1,
        m.nome,
        m.telefone || 'N/A',
        m.linkWhatsapp,
        m.pagina,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fatalmodel-${resultados.cidade}.csv`
    a.click()
  }

  const copiarTodosLinks = () => {
    if (!resultados) return

    const links = resultados.modelos
      .filter((m) => m.linkWhatsapp)
      .map((m) => m.linkWhatsapp)
      .join('\n')

    navigator.clipboard.writeText(links)
    alert('Links copiados para área de transferência!')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          FatalModel Scraper
        </h1>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-md p-6 mb-8"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidade (slug):
            </label>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="belo-horizonte-mg"
              className="w-full text-black px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Exemplo: belo-horizonte-mg, sao-paulo-sp, arcos-mg
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Página Inicial:
              </label>
              <input
                type="number"
                value={paginaInicial}
                onChange={(e) => setPaginaInicial(Number(e.target.value))}
                min="1"
                className="w-full text-black px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Página Final:
              </label>
              <input
                type="number"
                value={paginaFinal}
                onChange={(e) => setPaginaFinal(Number(e.target.value))}
                min="1"
                className="w-full text-black px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Máximo de 20 páginas por vez
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mensagem WhatsApp:
            </label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={5}
              className="w-full text-black px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {mensagem.length} caracteres
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Processando...' : 'Buscar Modelos'}
          </button>
        </form>

        {/* Erro */}
        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
            {erro}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-8">
            <p className="font-semibold">Processando...</p>
            <p className="text-sm">Isso pode levar alguns minutos...</p>
          </div>
        )}

        {/* Resultados */}
        {resultados && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                ✅ {resultados.totalModelos} modelos encontradas
              </h2>
              <div className="space-x-2">
                <button
                  onClick={exportarCSV}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={copiarTodosLinks}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  Copiar Links
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Nome</th>
                    <th className="px-4 py-2 text-left">Telefone</th>
                    <th className="px-4 py-2 text-left">Página</th>
                    <th className="px-4 py-2 text-left">WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.modelos.map((modelo, index) => (
                    <tr key={modelo.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2">{modelo.nome}</td>
                      <td className="px-4 py-2">
                        {modelo.telefone || (
                          <span className="text-red-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{modelo.pagina}</td>
                      <td className="px-4 py-2">
                        {modelo.linkWhatsapp ? (
                          <a
                            href={modelo.linkWhatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 inline-block"
                          >
                            📱 Abrir
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
