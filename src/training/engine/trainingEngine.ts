// ============================================
// TRAINING — Engine commun
// ============================================

import {
    TrainingSessionConfig,
    TrainingSessionState,
    TrainingTarget,
  } from "./trainingTypes";
  import {
    createTrainingSession,
    registerThrow,
    endTrainingSession,
  } from "./trainingSession";
  
  export class TrainingEngine {
    config: TrainingSessionConfig;
    state: TrainingSessionState;
  
    constructor(config: TrainingSessionConfig) {
      this.config = config;
      this.state = createTrainingSession(config);
    }
  
    throw(target: TrainingTarget | null, hit: boolean, score: number) {
      if (this.isFinished()) return;
      registerThrow(this.state, target, hit, score);
  
      if (this.config.maxDarts &&
          this.state.darts.length >= this.config.maxDarts) {
        this.finish(true);
      }
    }
  
    finish(success: boolean) {
      if (this.state.success !== null) return;
      endTrainingSession(this.state, success);
    }
  
    isFinished() {
      return this.state.success !== null;
    }
  }
  