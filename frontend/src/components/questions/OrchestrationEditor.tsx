'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileMusic, X, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { ENSEMBLE_TEMPLATES, type EnsembleType } from '@music-exam-builder/shared/types'

interface OrchestrationEditorProps {
  value: any
  onChange: (value: any) => void
}

export function OrchestrationEditor({ value, onChange }: OrchestrationEditorProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const response = await api.uploadNotation(file)
      onChange({
        ...value,
        pianoScorePath: response.data.path,
        pianoScoreUrl: response.data.url
      })
    } catch (err) {
      console.error('Error uploading score:', err)
      alert('Failed to upload piano score')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = () => {
    onChange({
      ...value,
      pianoScorePath: undefined,
      pianoScoreUrl: undefined
    })
  }

  const handleEnsembleChange = (ensemble: string) => {
    const instruments = ENSEMBLE_TEMPLATES[ensemble as EnsembleType] || []
    onChange({
      ...value,
      targetEnsemble: ensemble,
      ensembleInstruments: instruments
    })
  }

  const handleAddRubricItem = () => {
    const rubric = value?.rubric || []
    onChange({
      ...value,
      rubric: [...rubric, { criteria: '', points: 1 }]
    })
  }

  const handleUpdateRubricItem = (index: number, field: string, val: any) => {
    const rubric = [...(value?.rubric || [])]
    rubric[index] = { ...rubric[index], [field]: val }
    onChange({ ...value, rubric })
  }

  const handleRemoveRubricItem = (index: number) => {
    const rubric = value?.rubric.filter((_: any, i: number) => i !== index)
    onChange({ ...value, rubric })
  }

  return (
    <div className="space-y-4">
      {/* Piano Score Upload */}
      <div className="space-y-2">
        <Label>Piano Score *</Label>
        {!value?.pianoScorePath ? (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <FileMusic className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">Upload piano score to orchestrate</p>
            <input
              type="file"
              accept=".pdf,.xml,.musicxml,.mxl"
              onChange={handleFileUpload}
              className="hidden"
              id="piano-score-upload"
              disabled={uploading}
            />
            <label htmlFor="piano-score-upload">
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Choose File'}
                </span>
              </Button>
            </label>
            <p className="text-xs text-gray-500 mt-2">PDF, MusicXML (max 10MB)</p>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileMusic className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium">Piano score uploaded</p>
                  <p className="text-sm text-gray-600">{value.pianoScorePath}</p>
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

      {/* Target Ensemble */}
      <div className="space-y-2">
        <Label htmlFor="targetEnsemble">Target Ensemble *</Label>
        <select
          id="targetEnsemble"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value?.targetEnsemble || ''}
          onChange={(e) => handleEnsembleChange(e.target.value)}
          required
        >
          <option value="">Select ensemble...</option>
          {Object.keys(ENSEMBLE_TEMPLATES).map((ensemble) => (
            <option key={ensemble} value={ensemble}>
              {ensemble.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Show Selected Instruments */}
      {value?.ensembleInstruments && value.ensembleInstruments.length > 0 && (
        <div className="space-y-2">
          <Label>Required Instruments</Label>
          <div className="flex flex-wrap gap-2">
            {value.ensembleInstruments.map((inst: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {inst}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grading Rubric */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Grading Rubric</Label>
          <Button type="button" size="sm" variant="outline" onClick={handleAddRubricItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Criteria
          </Button>
        </div>

        {(!value?.rubric || value.rubric.length === 0) && (
          <p className="text-sm text-gray-600">
            Add grading criteria to help with scoring student submissions
          </p>
        )}

        <div className="space-y-3">
          {value?.rubric?.map((item: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <Input
                placeholder="Criteria (e.g., Correct instrumentation)"
                value={item.criteria}
                onChange={(e) => handleUpdateRubricItem(index, 'criteria', e.target.value)}
              />
              <Input
                type="number"
                placeholder="Points"
                className="w-24"
                value={item.points}
                onChange={(e) => handleUpdateRubricItem(index, 'points', parseInt(e.target.value))}
                min="1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleRemoveRubricItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

