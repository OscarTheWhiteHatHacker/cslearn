'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Subject {
  id: string
  name: string
  slug: string
  description?: string
}

export default function SubjectSelector({
  subjects,
  activeSubjectId,
}: {
  subjects: Subject[]
  activeSubjectId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Subject:</span>
      {subjects.map((subj) => {
        const isActive = subj.id === activeSubjectId
        return (
          <button
            key={subj.id}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.set('subject', subj.id)
              router.push(`/teacher/topics?${params.toString()}`)
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent text-white shadow-sm'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {subj.name}
          </button>
        )
      })}
    </div>
  )
}
