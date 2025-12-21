import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { supabase } from './supabase/client'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add auth interceptor
    this.client.interceptors.request.use(async (config) => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          return config
        }
        
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`
        } else {
          console.warn('No access token in session')
        }
      } catch (err) {
        console.error('Error in auth interceptor:', err)
      }
      
      return config
    })
  }

  // Auth endpoints
  async getMe() {
    const response = await this.client.get('/auth/me')
    return response.data
  }

  async updateProfile(data: { firstName: string; lastName: string; avatarUrl?: string }) {
    const response = await this.client.put('/auth/profile', data)
    return response.data
  }

  // Exam endpoints
  async createExam(data: any) {
    const response = await this.client.post('/exams', data)
    return response.data
  }

  async getExam(id: string) {
    const response = await this.client.get(`/exams/${id}`)
    return response.data
  }

  async getTeacherExams() {
    const response = await this.client.get('/exams/teacher')
    return response.data
  }

  async getStudentExams() {
    const response = await this.client.get('/exams/student/assigned')
    return response.data
  }

  async updateExam(id: string, data: any) {
    const response = await this.client.put(`/exams/${id}`, data)
    return response.data
  }

  async deleteExam(id: string) {
    const response = await this.client.delete(`/exams/${id}`)
    return response.data
  }

  async publishExam(id: string, isPublished: boolean) {
    const response = await this.client.post(`/exams/${id}/publish`, { isPublished })
    return response.data
  }

  async getStudents() {
    const response = await this.client.get('/exams/students')
    return response.data
  }

  async assignExam(id: string, studentIds: string[], dueDate?: string) {
    const response = await this.client.post(`/exams/${id}/assign`, { studentIds, dueDate })
    return response.data
  }

  // Section endpoints
  async getSection(sectionId: string) {
    const response = await this.client.get(`/exams/sections/${sectionId}`)
    return response.data
  }

  async createSection(examId: string, data: any) {
    const response = await this.client.post(`/exams/${examId}/sections`, data)
    return response.data
  }

  async updateSection(sectionId: string, data: any) {
    const response = await this.client.put(`/exams/sections/${sectionId}`, data)
    return response.data
  }

  async deleteSection(sectionId: string) {
    const response = await this.client.delete(`/exams/sections/${sectionId}`)
    return response.data
  }

  // Question endpoints
  async createQuestion(data: any) {
    const response = await this.client.post('/questions', data)
    return response.data
  }

  async uploadAudio(file: File, questionId?: string) {
    const formData = new FormData()
    formData.append('audioFile', file)
    if (questionId) formData.append('questionId', questionId)

    const response = await this.client.post('/questions/upload/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  async uploadNotation(file: File, questionId?: string) {
    const formData = new FormData()
    formData.append('notationFile', file)
    if (questionId) formData.append('questionId', questionId)

    const response = await this.client.post('/questions/upload/notation', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  async getQuestion(id: string) {
    const response = await this.client.get(`/questions/${id}`)
    return response.data
  }

  async updateQuestion(id: string, data: any) {
    const response = await this.client.put(`/questions/${id}`, data)
    return response.data
  }

  async deleteQuestion(id: string) {
    const response = await this.client.delete(`/questions/${id}`)
    return response.data
  }

  // Attempt endpoints
  async startAttempt(examId: string) {
    const response = await this.client.post('/attempts/start', { examId })
    return response.data
  }

  async getAttempt(id: string) {
    const response = await this.client.get(`/attempts/${id}`)
    return response.data
  }

  async getStudentAttempts() {
    const response = await this.client.get('/attempts/student')
    return response.data
  }

  async getExamAttempts(examId: string) {
    const response = await this.client.get(`/attempts/exam/${examId}`)
    return response.data
  }

  async submitAnswer(data: {
    attemptId: string
    questionId: string
    answer: any
    maxPoints: number
    file?: File
  }) {
    if (data.file) {
      const formData = new FormData()
      formData.append('attemptId', data.attemptId)
      formData.append('questionId', data.questionId)
      formData.append('answer', JSON.stringify(data.answer))
      formData.append('maxPoints', data.maxPoints.toString())
      formData.append('submissionFile', data.file)

      const response = await this.client.post('/attempts/answer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    }

    const response = await this.client.post('/attempts/answer', data)
    return response.data
  }

  async submitAttempt(id: string, timeSpentSeconds: number) {
    const response = await this.client.post(`/attempts/${id}/submit`, { timeSpentSeconds })
    return response.data
  }

  async gradeAnswer(answerId: string, pointsEarned: number, feedback?: string) {
    const response = await this.client.post(`/attempts/answer/${answerId}/grade`, {
      pointsEarned,
      feedback
    })
    return response.data
  }

  async getSubmissionUrl(path: string) {
    const response = await this.client.get('/attempts/submission-url', {
      params: { path }
    })
    return response.data
  }

  // Notation evaluation endpoints
  async evaluateTransposition(data: {
    questionId: string
    studentMusicXML: string
    referenceMusicXML?: string
    transpositionSemitones?: number
  }) {
    const response = await this.client.post('/notation/evaluate-transposition', data)
    return response.data
  }
}

export const api = new ApiClient()

