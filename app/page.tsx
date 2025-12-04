/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { ScraperResponse } from './lib/types'

export default function Home() {
  const [cidade, setCidade] = useState('')
  const [paginaInicial, setPaginaInicial] = useState(1)
  const [paginaFinal, setPaginaFinal] = useState(1)
  const [mensagem, setMensagem] = useState(`Oi..`)

  const [loading, setLoading] = useState(false)
  const [resultados, setResultados] = useState<ScraperResponse | null>(null)
  const [erro, setErro] = useState('')
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setResultados(null)

    // Criar novo AbortController
    const controller = new AbortController()
    setAbortController(controller)

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
        signal: controller.signal, // 🆕 Adicionar signal
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao processar')
      }

      const data: ScraperResponse = await response.json()
      setResultados(data)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setErro('Operação cancelada')
      } else {
        setErro(error.message)
      }
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }

  const exportarCSV = () => {
    if (!resultados) return

    const csv = [
      ['#', 'Nome', 'Telefone', 'Link WhatsApp', 'Página', 'Perfil FatalModel'],
      ...resultados.modelos.map((m, i) => [
        i + 1,
        m.nome,
        m.telefone || 'N/A',
        m.linkWhatsapp,
        m.pagina,
        `https://fatalmodel.com/acompanhante/${m.id}/${m.slug}`,
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

  const handleCancelar = () => {
    if (abortController) {
      abortController.abort()
      setLoading(false)
      setErro('Operação cancelada pelo usuário')
    }
  }

  const copiarTodosTelefones = () => {
    if (!resultados) return

    const telefones = resultados.modelos
      .filter((m) => m.telefone)
      .map((m) => m.telefone)
      .join('\n')

    navigator.clipboard.writeText(telefones)
    alert('Telefones copiados para área de transferência!')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Scraper
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
              placeholder="cidade-uf"
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
            {loading ? 'Processando...' : 'Buscar'}
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
            <p className="font-semibold">⏳ Processando...</p>
            <p className="text-sm mb-3">
              Isso pode levar alguns minutos. Aguarde...
            </p>
            <button
              onClick={handleCancelar}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium"
            >
              ❌ Cancelar
            </button>
          </div>
        )}

        {/* Resultados */}
        {resultados && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  ✅ {resultados.totalModelos} modelos encontradas
                </h2>
                <p className="text-sm text-gray-600">
                  Cidade: {resultados.cidade} | Páginas processadas:{' '}
                  {resultados.paginasProcessadas}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportarCSV}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
                >
                  📥 Exportar CSV
                </button>
                <button
                  onClick={copiarTodosLinks}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm font-medium"
                >
                  🔗 Copiar Links
                </button>
                <button
                  onClick={copiarTodosTelefones}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-sm font-medium"
                >
                  📱 Copiar Telefones
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-3 text-left font-semibold">#</th>
                    <th className="px-3 py-3 text-left font-semibold">Nome</th>
                    <th className="px-3 py-3 text-left font-semibold">
                      Telefone
                    </th>
                    <th className="px-3 py-3 text-left font-semibold">Pág.</th>
                    <th className="px-3 py-3 text-center font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.modelos.map((modelo, index) => (
                    <tr
                      key={modelo.id}
                      className="border-b hover:bg-gray-50 transition"
                    >
                      <td className="px-3 py-3 text-gray-600">{index + 1}</td>
                      <td className="px-3 py-3">
                        <a
                          href={`https://fatalmodel.com/acompanhante/${modelo.id}/${modelo.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {modelo.nome}
                        </a>
                      </td>
                      <td className="px-3 py-3 font-mono text-sm">
                        {modelo.telefone ? (
                          <span className="text-gray-800">
                            {modelo.telefone}
                          </span>
                        ) : (
                          <span className="text-red-500 font-semibold">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {modelo.pagina}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {modelo.linkWhatsapp ? (
                          <a
                            href={modelo.linkWhatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium transition shadow-sm hover:shadow-md"
                          >
                            💬 WhatsApp
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            Sem telefone
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Estatísticas */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {resultados.totalModelos}
                </p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {resultados.modelos.filter((m) => m.telefone).length}
                </p>
                <p className="text-sm text-gray-600">Com Telefone</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {resultados.modelos.filter((m) => !m.telefone).length}
                </p>
                <p className="text-sm text-gray-600">Sem Telefone</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {resultados.paginasProcessadas}
                </p>
                <p className="text-sm text-gray-600">Páginas</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
