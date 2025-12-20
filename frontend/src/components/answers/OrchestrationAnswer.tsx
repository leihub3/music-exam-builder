'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileMusic, X } from 'lucide-react'
import type { Question } from '@music-exam-builder/shared/types'

interface OrchestrationAnswerProps {
  question: Question
  value: any
  onChange: (value: any) => void
}

export function OrchestrationAnswer({ question, value, onChange }: OrchestrationAnswerProps) {
  const [file, setFile] = useState<File | null>(null)
  const orchestrationData = (question.typeData as any) || {}

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      onChange({ ...value, file: selectedFile, fileName: selectedFile.name })
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    onChange({ ...value, file: null, fileName: null })
  }

  return (
    <div className="space-y-6">
      {/* Display Piano Score */}
      {orchestrationData.pianoScorePath && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <h3 className="font-semibold mb-3">Piano Score:</h3>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Orchestrate for:</strong> {orchestrationData.targetEnsemble?.replace('_', ' ')}
          </p>
          
          {orchestrationData.ensembleInstruments && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Required Instruments:</p>
              <div className="flex flex-wrap gap-2">
                {orchestrationData.ensembleInstruments.map((inst: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {orchestrationData.pianoScorePath.endsWith('.pdf') ? (
            <div className="border rounded bg-white p-4">
              <embed
                src={orchestrationData.pianoScoreUrl || `/api/storage/notation/${orchestrationData.pianoScorePath}`}
                type="application/pdf"
                width="100%"
                height="500px"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-4 bg-white rounded border">
              <FileMusic className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium">Piano Score</p>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => window.open(orchestrationData.pianoScoreUrl, '_blank')}
                >
                  View Score
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grading Rubric */}
      {orchestrationData.rubric && orchestrationData.rubric.length > 0 && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="font-semibold mb-2">Grading Criteria:</h3>
          <ul className="space-y-1">
            {orchestrationData.rubric.map((item: any, i: number) => (
              <li key={i} className="text-sm">
                • {item.criteria} ({item.points} {item.points === 1 ? 'point' : 'points'})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Orchestration */}
      <div className="space-y-3">
        <h3 className="font-semibold">Your Orchestration:</h3>
        <p className="text-sm text-gray-600">
          Upload your orchestrated score (PDF or MusicXML)
        </p>

        {!file ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileMusic className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">Upload your orchestration</p>
            <input
              type="file"
              accept=".pdf,.xml,.musicxml,.mxl"
              onChange={handleFileChange}
              className="hidden"
              id="orchestration-upload"
            />
            <label htmlFor="orchestration-upload">
              <Button type="button" variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileMusic className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

