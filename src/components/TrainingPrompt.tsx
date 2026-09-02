import { useEffect, useRef, useState } from 'react'

export function TrainingPrompt({ choiceCount, sharingEnabled, onHelp }: { choiceCount: number; sharingEnabled: boolean; onHelp: () => void }) {
  const [dismissed, setDismissed] = useState(false)
  const eligible = choiceCount >= 150 && !sharingEnabled
  const shown = useRef(eligible)
  const [visible, setVisible] = useState(eligible)
  useEffect(() => {
    if (!shown.current && eligible) { shown.current = true; setVisible(true) }
    if (!eligible) setVisible(false)
  }, [eligible])
  if (!visible || !eligible || dismissed) return null

  return <aside className="training-prompt" aria-label="Помочь проекту">
    <div><strong>Уже 150 выборов :)</strong><p>Если хочешь, можешь помочь модели стать лучше и анонимно поделиться своими выборами.</p></div>
    <div className="training-prompt-actions"><button type="button" onClick={() => { onHelp(); setDismissed(true) }}>Помочь</button><button type="button" className="quiet" onClick={() => setDismissed(true)}>Не сейчас</button></div>
  </aside>
}
