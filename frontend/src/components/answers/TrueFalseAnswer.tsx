'use client'

interface TrueFalseAnswerProps {
  value: any
  onChange: (value: any) => void
}

export function TrueFalseAnswer({ value, onChange }: TrueFalseAnswerProps) {
  return (
    <div className="space-y-3">
      <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
        value?.value === true ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}>
        <input
          type="radio"
          name="answer"
          checked={value?.value === true}
          onChange={() => onChange({ value: true })}
          className="w-5 h-5"
        />
        <span className="text-lg font-medium">True</span>
      </label>
      
      <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
        value?.value === false ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}>
        <input
          type="radio"
          name="answer"
          checked={value?.value === false}
          onChange={() => onChange({ value: false })}
          className="w-5 h-5"
        />
        <span className="text-lg font-medium">False</span>
      </label>
    </div>
  )
}

