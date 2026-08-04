import setupStore from './accounts-payable/stores/useSetupStore'
import useDmsSetupStore from './document-repository/stores/useDmsSetupStore'

/** Shared helpers for AP vs DMS setup entry and dashboard exit. */

export const openApSetupPreview = () => {
  useDmsSetupStore.getState().resetSetup()
  setupStore.setState({ isSetupOpen: false })
  setupStore.getState().setStep(0)
  setupStore.getState().setIsSetupStarted(true)
}

export const openDmsSetupPreview = () => {
  setupStore.setState({
    isSetupOpen: false,
    isSetupStarted: false,
    restrictNavigationUntilApSetup: false,
  })
  if (typeof window !== 'undefined') {
    localStorage.removeItem('restrictNavigationUntilApSetup')
  }
  useDmsSetupStore.getState().startSetup()
}

/** Leave AP/DMS setup wizards and show the normal Dashboard. */
export const exitSetupToDashboard = () => {
  useDmsSetupStore.getState().resetSetup()
  setupStore.setState({
    isSetupOpen: false,
    isSetupStarted: false,
  })
}
