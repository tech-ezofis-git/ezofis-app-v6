import { useEffect } from 'react'
import useSettingsTopbarStore, {
  type SettingsTopbarAction,
} from '../stores/useSettingsTopbarStore'

export default function useSettingsTopbarAction(
  action: SettingsTopbarAction | null,
) {
  const setAction = useSettingsTopbarStore((state) => state.setAction)
  const clearAction = useSettingsTopbarStore((state) => state.clearAction)

  useEffect(() => {
    const token = setAction(action)
    return () => clearAction(token)
  }, [action, clearAction, setAction])
}
