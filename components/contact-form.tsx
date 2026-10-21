'use client'

import type React from 'react'
import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitContactMessage } from '@/app/actions/contact'

type FormState = {
  name: string
  email: string
  subject: string
  message: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

/* 快選只是幫忙填 subject 欄位，資料結構不變 */
const presets = ['流程自動化', '影像生成', '客製系統', '還不確定']

const initialState: FormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {}

  if (!values.name.trim()) {
    errors.name = '請留下你的稱呼。'
  }

  if (!values.email.trim()) {
    errors.email = '請留下 email，我才能回覆你。'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = '這個 email 格式看起來不對，再確認一下。'
  }

  if (!values.subject.trim()) {
    errors.subject = '選一個需求類型，或自己寫一句。'
  }

  if (!values.message.trim()) {
    errors.message = '說一下你現在的狀況吧。'
  } else if (values.message.trim().length < 10) {
    errors.message = '再多寫一點，至少 10 個字。'
  }

  return errors
}

export function ContactForm() {
  const [values, setValues] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const nextErrors = validate(values)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    const result = await submitContactMessage(values)
    setSubmitting(false)

    if (!result.success) {
      toast.error('訊息沒有送出', {
        description: result.error ?? '請稍等一下再試一次。',
      })
      return
    }

    toast.success('已送出', {
      description: '我會在一個工作天內回信給你。',
    })
    setValues(initialState)
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">怎麼稱呼你</Label>
          <Input
            id="name"
            name="name"
            placeholder="王小明"
            value={values.name}
            onChange={handleChange}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-destructive">
              {errors.name}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            value={values.email}
            onChange={handleChange}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subject">需求類型</Label>
        <div className="mb-1 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setValues((prev) => ({ ...prev, subject: preset }))
                setErrors((prev) => ({ ...prev, subject: undefined }))
              }}
              aria-pressed={values.subject === preset}
              className={`border px-3 py-1.5 font-mono text-[11px] tracking-tight transition-colors ${
                values.subject === preset
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-line hover:text-foreground'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <Input
          id="subject"
          name="subject"
          placeholder="例如：想把每天的報表自動產出"
          value={values.subject}
          onChange={handleChange}
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
        />
        {errors.subject && (
          <p id="subject-error" className="text-sm text-destructive">
            {errors.subject}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">現在是怎麼做的？</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="誰在做、多久做一次、每次花多少時間、卡在哪裡。寫得越具體，我第一次回覆就能給你越明確的判斷。"
          rows={5}
          value={values.message}
          onChange={handleChange}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className="resize-none"
        />
        {errors.message && (
          <p id="message-error" className="text-sm text-destructive">
            {errors.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={submitting} className="mt-1 gap-2">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            傳送中…
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden="true" />
            送出訊息
          </>
        )}
      </Button>
    </form>
  )
}
