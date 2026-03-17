import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_BASE = `${API_URL}/api/v1`

interface TaskInfo {
  task_id: string
  employee_name: string
  task_type: string
  control_name: string
  deadline: string
  status: string
  policy_content: string | null
}

export default function TaskComplete() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'completing' | 'done' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('No task token provided')
      return
    }

    fetch(`${API_BASE}/campaigns/tasks/complete/${encodeURIComponent(token)}`)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail || 'Task not found')
        }
        return res.json()
      })
      .then(data => {
        setTaskInfo(data)
        if (data.status === 'completed') {
          setStatus('done')
        } else {
          setStatus('ready')
        }
      })
      .catch(err => {
        setError(err.message)
        setStatus('error')
      })
  }, [token])

  async function handleComplete() {
    if (!token) return
    setStatus('completing')
    try {
      const res = await fetch(`${API_BASE}/campaigns/tasks/complete/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Failed to complete task')
      }
      setStatus('done')
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-sm p-8">
        <div className="text-2xl font-bold text-indigo-600 mb-6 text-center">Konforme</div>

        {status === 'loading' && (
          <p className="text-center text-gray-600">{t('common.loading', 'Loading...')}</p>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600">{error || 'This task could not be found.'}</p>
          </div>
        )}

        {status === 'ready' && taskInfo && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">
              {t('taskComplete.title', 'Compliance Task')}
            </h1>
            <p className="text-gray-600 text-center mb-6">
              {t('taskComplete.greeting', `Hi ${taskInfo.employee_name}, please review and complete this task.`)}
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('taskComplete.taskType', 'Task Type')}</span>
                <span className="font-medium text-gray-900 capitalize">{taskInfo.task_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('taskComplete.control', 'Control')}</span>
                <span className="font-medium text-gray-900">{taskInfo.control_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('taskComplete.deadline', 'Deadline')}</span>
                <span className="font-medium text-gray-900">{taskInfo.deadline}</span>
              </div>
            </div>

            {taskInfo.policy_content && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">{t('taskComplete.policyContent', 'Policy')}</h3>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{taskInfo.policy_content}</p>
              </div>
            )}

            <button
              onClick={handleComplete}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('taskComplete.completeButton', 'I acknowledge & complete this task')}
            </button>
          </>
        )}

        {status === 'completing' && (
          <p className="text-center text-gray-600">{t('common.loading', 'Loading...')}</p>
        )}

        {status === 'done' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {t('taskComplete.successTitle', 'Task Completed!')}
            </h1>
            <p className="text-gray-600">
              {t('taskComplete.successDesc', 'Thank you for completing this compliance task. You can close this page.')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
