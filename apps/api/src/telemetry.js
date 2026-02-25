export function createTelemetryEvent(type, payload = {}) {
  return {
    type,
    at: Date.now(),
    payload
  };
}

export function buildTurnTelemetry({ repairMode, targetHits }) {
  return createTelemetryEvent('TurnEvaluated', {
    repairMode,
    targetHitCount: targetHits.length
  });
}
