interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.querySelector<HTMLInputElement>('input[name="message"]')
    const content = input?.value?.trim()
    if (content) {
      onSend(content)
      input!.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit} data-chat-input>
      <input name="message" type="text" placeholder="메시지 입력" disabled={disabled} />
      <button type="submit" disabled={disabled}>
        전송
      </button>
    </form>
  )
}
