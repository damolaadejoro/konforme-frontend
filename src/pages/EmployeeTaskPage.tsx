import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import TaskShell from '../components/task/TaskShell'
import PolicyAcknowledgmentFlow from '../components/task/PolicyAcknowledgmentFlow'
import QuizFlow from '../components/task/QuizFlow'
import TaskNotFound from '../components/task/TaskNotFound'
import { mockTasks } from '../data/mockTasks'

export default function EmployeeTaskPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const [currentStep, setCurrentStep] = useState(1)

  // Find the task
  const task = taskId ? mockTasks[taskId] : undefined

  // If task not found, show error page
  if (!task) {
    return <TaskNotFound />
  }

  // Determine total steps based on task type
  const totalSteps = task.type === 'acknowledge' ? 4 : 7

  // Handle completion
  const handleComplete = (_data: any) => {
    // TODO: POST task completion to backend and update controls hook
  }

  return (
    <TaskShell
      companyName={task.company}
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      {task.type === 'acknowledge' ? (
        <PolicyAcknowledgmentFlow
          task={task}
          onComplete={(name) => handleComplete({ name })}
          onStepChange={setCurrentStep}
        />
      ) : (
        <QuizFlow
          task={task}
          onComplete={(score) => handleComplete({ score })}
          onStepChange={setCurrentStep}
        />
      )}
    </TaskShell>
  )
}
