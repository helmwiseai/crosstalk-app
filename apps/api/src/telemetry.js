export function createTelemetryEvent(type, payload = {}) {
  return {
    type,
    at: Date.now(),
    payload
  };
}

export function buildTurnTelemetry({ repairMode, targetHits, providerUsed, intentAligned, repairAttempt }) {
  return createTelemetryEvent('TurnEvaluated', {
    repairMode,
    targetHitCount: targetHits.length,
    providerUsed,
    intentAligned,
    repairAttempt
  });
}

export function buildIntentTelemetry({ intentType, aligned }) {
  return createTelemetryEvent('IntentEvaluated', { intentType, aligned });
}
