import { useEffect } from 'react'
import useSettingsTopbarStore, {
  type SettingsTopbarAction,
} from '../stores/useSettingsTopbarStore'

export default function useSettingsTopbarAction(
  action: SettingsTopbarAction | null,
) {
  const setAction = useSettingsTopbarStore((state) => state.setAction)

  useEffect(() => {
    setAction(action)
    return () => setAction(null)
  }, [action, setAction])
}
