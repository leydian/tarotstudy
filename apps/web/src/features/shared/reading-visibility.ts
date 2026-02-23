export function shouldShowPromptBank(hasReading: boolean) {
  return !hasReading;
}

export function shouldShowExportActions(hasReading: boolean) {
  return hasReading;
}
