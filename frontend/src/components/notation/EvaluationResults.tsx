'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'
import type { EvaluationResult } from '@/lib/notation/evaluator'

interface EvaluationResultsProps {
  result: EvaluationResult
  onClose?: () => void
}

export function EvaluationResults({ result, onClose }: EvaluationResultsProps) {
  const getErrorTypeLabel = (errorType?: string) => {
    switch (errorType) {
      case 'pitch':
        return 'Altura incorrecta'
      case 'duration':
        return 'Duración incorrecta'
      case 'tie':
        return 'Ligadura de unión incorrecta'
      case 'slur':
        return 'Ligadura de expresión incorrecta'
      case 'articulation':
        return 'Articulación incorrecta'
      case 'missing':
        return 'Nota faltante'
      case 'extra':
        return 'Nota extra'
      default:
        return 'Error'
    }
  }

  const getErrorTypeColor = (errorType?: string) => {
    switch (errorType) {
      case 'pitch':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'duration':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'tie':
        return 'text-pink-600 bg-pink-50 border-pink-200'
      case 'slur':
        return 'text-indigo-600 bg-indigo-50 border-indigo-200'
      case 'articulation':
        return 'text-cyan-600 bg-cyan-50 border-cyan-200'
      case 'missing':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'extra':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getArticulationLabel = (articulation?: string | null) => {
    if (!articulation) return null
    const labels: Record<string, string> = {
      'staccato': 'Staccato',
      'staccatissimo': 'Staccatissimo',
      'accent': 'Acento',
      'marcato': 'Marcato',
      'tenuto': 'Tenuto'
    }
    return labels[articulation] || articulation
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Resultados de Evaluación</span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{result.percentage}%</div>
            <div className="text-sm text-green-700">Puntuación</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{result.correctNotes}</div>
            <div className="text-sm text-blue-700">Correctas</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">{result.incorrectNotes}</div>
            <div className="text-sm text-red-700">Incorrectas</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{result.totalNotes}</div>
            <div className="text-sm text-gray-700">Total</div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Desglose Detallado</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Correctas: {result.correctNotes}</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>Incorrectas: {result.incorrectNotes}</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span>Faltantes: {result.missingNotes}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-purple-600" />
              <span>Extras: {result.extraNotes}</span>
            </div>
          </div>
        </div>

        {/* Detailed Notes List */}
        {result.details && result.details.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Detalles por Nota</h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {result.details.map((detail, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    detail.isCorrect
                      ? 'bg-green-50 border-green-200'
                      : getErrorTypeColor(detail.errorType)
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {detail.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">
                          Posición: {detail.position.toFixed(2)} beats
                        </span>
                        {detail.errorType && (
                          <span className="text-xs px-2 py-1 rounded bg-white">
                            {getErrorTypeLabel(detail.errorType)}
                          </span>
                        )}
                      </div>
                      
                      {detail.expected && (
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Esperado:</span>{' '}
                          {detail.expected.step}
                          {detail.expected.alter !== undefined && detail.expected.alter !== 0 && (
                            <span>{detail.expected.alter > 0 ? '♯' : '♭'}</span>
                          )}
                          {detail.expected.octave} - {detail.expected.type}
                          {detail.expectedMIDI && (
                            <span className="text-xs text-gray-500 ml-2">
                              (MIDI: {detail.expectedMIDI})
                            </span>
                          )}
                          {(detail.expected.tieStart || detail.expected.tieEnd || detail.expected.slurStart || detail.expected.slurEnd || detail.expected.articulation) && (
                            <div className="text-xs text-gray-600 mt-1">
                              {detail.expected.tieStart || detail.expected.tieEnd || detail.expected.slurStart || detail.expected.slurEnd ? (
                                <>
                                  Ligaduras:{' '}
                                  {detail.expected.tieStart && <span className="text-pink-600">Tie inicio</span>}
                                  {detail.expected.tieEnd && <span className="text-pink-600">Tie fin</span>}
                                  {detail.expected.slurStart && <span className="text-indigo-600">Slur inicio</span>}
                                  {detail.expected.slurEnd && <span className="text-indigo-600">Slur fin</span>}
                                  {detail.expected.articulation && <br />}
                                </>
                              ) : null}
                              {detail.expected.articulation && (
                                <span className="text-cyan-600">Articulación: {getArticulationLabel(detail.expected.articulation)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {detail.actual && (
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Obtenido:</span>{' '}
                          {detail.actual.step}
                          {detail.actual.alter !== undefined && detail.actual.alter !== 0 && (
                            <span>{detail.actual.alter > 0 ? '♯' : '♭'}</span>
                          )}
                          {detail.actual.octave} - {detail.actual.type}
                          {detail.actualMIDI && (
                            <span className="text-xs text-gray-500 ml-2">
                              (MIDI: {detail.actualMIDI})
                            </span>
                          )}
                          {(detail.actual.tieStart || detail.actual.tieEnd || detail.actual.slurStart || detail.actual.slurEnd || detail.actual.articulation) && (
                            <div className="text-xs text-gray-600 mt-1">
                              {detail.actual.tieStart || detail.actual.tieEnd || detail.actual.slurStart || detail.actual.slurEnd ? (
                                <>
                                  Ligaduras:{' '}
                                  {detail.actual.tieStart && <span className="text-pink-600">Tie inicio</span>}
                                  {detail.actual.tieEnd && <span className="text-pink-600">Tie fin</span>}
                                  {detail.actual.slurStart && <span className="text-indigo-600">Slur inicio</span>}
                                  {detail.actual.slurEnd && <span className="text-indigo-600">Slur fin</span>}
                                  {detail.actual.articulation && <br />}
                                </>
                              ) : null}
                              {detail.actual.articulation && (
                                <span className="text-cyan-600">Articulación: {getArticulationLabel(detail.actual.articulation)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!detail.actual && detail.errorType === 'missing' && (
                        <div className="text-sm text-yellow-700 italic">
                          Nota faltante
                        </div>
                      )}
                      
                      {!detail.expected && detail.errorType === 'extra' && (
                        <div className="text-sm text-purple-700 italic">
                          Nota extra no esperada
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}



