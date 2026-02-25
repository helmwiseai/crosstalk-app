export class SessionRepository {
  // Interface-style class for future DB adapters.
  startSession(_input) {
    throw new Error('Not implemented');
  }

  getSession(_sessionId) {
    throw new Error('Not implemented');
  }

  saveSession(_session) {
    throw new Error('Not implemented');
  }

  endSession(_sessionId) {
    throw new Error('Not implemented');
  }
}
