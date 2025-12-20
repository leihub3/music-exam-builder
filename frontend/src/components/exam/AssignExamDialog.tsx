'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { X, Check } from 'lucide-react'

interface AssignExamDialogProps {
  examId: string
  examTitle: string
  open: boolean
  onClose: () => void
  onAssigned: () => void
}

export function AssignExamDialog({
  examId,
  examTitle,
  open,
  onClose,
  onAssigned
}: AssignExamDialogProps) {
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState('')
  const [loadingStudents, setLoadingStudents] = useState(true)

  useEffect(() => {
    if (open) {
      loadStudents()
    }
  }, [open])

  const loadStudents = async () => {
    try {
      setLoadingStudents(true)
      const response = await api.getStudents()
      setStudents(response.data || [])
    } catch (err: any) {
      console.error('Error loading students:', err)
      alert('Failed to load students')
    } finally {
      setLoadingStudents(false)
    }
  }

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleAssign = async () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student')
      return
    }

    setLoading(true)
    try {
      await api.assignExam(
        examId,
        Array.from(selectedStudents),
        dueDate || undefined
      )
      alert(`Exam assigned to ${selectedStudents.size} student(s) successfully!`)
      onAssigned()
      onClose()
      // Reset form
      setSelectedStudents(new Set())
      setDueDate('')
    } catch (err: any) {
      console.error('Error assigning exam:', err)
      alert(err.response?.data?.error || 'Failed to assign exam')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Assign Exam: {examTitle}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Due Date */}
          <div className="mb-6">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Students List */}
          <div>
            <Label className="mb-3 block">Select Students</Label>
            {loadingStudents ? (
              <p className="text-gray-600">Loading students...</p>
            ) : students.length === 0 ? (
              <p className="text-gray-600">No students found</p>
            ) : (
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {students.map((student) => {
                  const isSelected = selectedStudents.has(student.id)
                  return (
                    <div
                      key={student.id}
                      className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {selectedStudents.size > 0 && (
              <p className="mt-3 text-sm text-gray-600">
                {selectedStudents.size} student(s) selected
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 p-6 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || selectedStudents.size === 0}
          >
            {loading ? 'Assigning...' : `Assign to ${selectedStudents.size} Student(s)`}
          </Button>
        </div>
      </div>
    </div>
  )
}

